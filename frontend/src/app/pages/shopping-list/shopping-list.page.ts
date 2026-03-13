import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { DecimalPipe } from '@angular/common';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LoadingService } from 'src/app/services/loading.service';
import { AlertService } from 'src/app/services/alert.service';
import dayjs from 'dayjs';
import { Ingredient } from 'src/app/models/ingredient.model';
import { DataService } from 'src/app/services/data.service';
import { Group } from 'src/app/models/group.model';
import { trackById } from 'src/app/utils/track-by';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-shopping-list',
  templateUrl: 'shopping-list.page.html',
  styleUrls: ['shopping-list.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    DecimalPipe,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonLabel,
    IonList,
    IonItem,
    IonRefresher,
    IonRefresherContent,
    IonButtons,
    IonButton,
    IonIcon,
  ],
})
export class ShoppingListPage implements OnDestroy {
  private readonly dataService = inject(DataService);
  private readonly loadingService = inject(LoadingService);
  private readonly translateService = inject(TranslateService);
  private readonly alertService = inject(AlertService);

  readonly shoppingList = signal<Ingredient[] | undefined>(undefined);

  readonly trackByIngredient = trackById;

  private group: Group | undefined;
  private invalidateSub: Subscription | null = null;

  constructor() {}

  ionViewDidEnter() {
    this.getData();
  }

  ngOnDestroy() {
    this.invalidateSub?.unsubscribe();
  }

  private async getData() {
    await this.loadingService.withLoader(async () => {
      this.group = await this.dataService.retrieveGroup();
      await this.getShoppingList();

      // Subscribe to real-time only if the user belongs to a group
      // The socket is already managed by SocketService (singleton);
      // we just listen — no new connection is created here.
      if (this.group) {
        this.dataService.connectRealtime(this.group);
        this.invalidateSub?.unsubscribe();
        this.invalidateSub = this.dataService.shoppingListInvalidate$.subscribe(() => {
          this.getShoppingList(undefined, true);
        });
      }
    });
  }

  async getShoppingList(startDate?: string, skipLoading = false) {
    if (!startDate) startDate = dayjs().startOf('week').format('YYYY-MM-DD');
    const response = await this.dataService.getShoppingList(startDate, this.group?.id, skipLoading);
    this.shoppingList.set(response && response.length > 0 ? response : []);
  }

  async handleRefresh(event: Event) {
    await this.getShoppingList();
    const target = event.target as HTMLIonRefresherElement | null;
    target?.complete();
  }

  /**
   * Esporta la lista della spesa in formato CSV generico.
   * Copia negli appunti e condivide come file CSV.
   */
  async onExportClicked() {
    const list = this.shoppingList();
    if (!list || list.length === 0) return;

    const header = this.translateService.instant('SHOPPING_LIST_PAGE.CSV_HEADER');
    const rows = list.map((item) => {
      const name = item.name.replace(/"/g, '""');
      const qty = item.quantity?.value ? Math.round(item.quantity.value * 10) / 10 : '';
      const unit = item.quantity?.unit
        ? this.translateService.instant('COMMON.WEIGHT_UNITS.' + item.quantity.unit)
        : '';
      return `"${name}",${qty},"${unit}"`;
    });
    const csvPayload = `${header}\n${rows.join('\n')}`;

    // 1. Copia negli appunti
    try {
      await navigator.clipboard.writeText(csvPayload);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = csvPayload;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    // 2. Condividi come file CSV se supportato, altrimenti come testo
    const title = this.translateService.instant('SHOPPING_LIST_PAGE.TITLE');
    if (typeof navigator.share === 'function') {
      try {
        const blob = new Blob([csvPayload], { type: 'text/csv' });
        const file = new File([blob], 'shopping-list.csv', { type: 'text/csv' });
        await navigator.share({ title, files: [file] });
      } catch {
        this.alertService.presentInfoPopup(this.translateService.instant('COMMON.CLIPBOARD'));
      }
    } else {
      this.alertService.presentInfoPopup(this.translateService.instant('COMMON.CLIPBOARD'));
    }
  }
}
