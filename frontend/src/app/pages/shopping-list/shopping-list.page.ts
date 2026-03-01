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
          this.getShoppingList();
        });
      }
    });
  }

  async getShoppingList(startDate?: string) {
    if (!startDate) startDate = dayjs().startOf('week').format('YYYY-MM-DD');
    const response = await this.dataService.getShoppingList(startDate, this.group?.id);
    this.shoppingList.set(response && response.length > 0 ? response : []);
  }

  async handleRefresh(event: Event) {
    await this.getShoppingList();
    const target = event.target as HTMLIonRefresherElement | null;
    target?.complete();
  }

  /**
   * Esporta la lista della spesa per essere processata da un Apple Shortcut.
   * Genera un array JSON e lo copia negli appunti e/o lo condivide.
   */
  async onExportClicked() {
    const list = this.shoppingList();
    if (!list || list.length === 0) return;

    // Crea un oggetto strutturato facile da parsare per uno Shortcut
    const exportData = list.map((item) => ({
      name: item.name,
      quantity: item.quantity?.value || null,
      unit: item.quantity?.unit
        ? this.translateService.instant('COMMON.WEIGHT_UNITS.' + item.quantity.unit)
        : null,
      rawUnit: item.quantity?.unit || null,
    }));

    const textPayload = JSON.stringify(exportData, null, 2);

    // 1. Copia negli appunti (così lo shortcut può usare "Ottieni Appunti")
    try {
      await navigator.clipboard.writeText(textPayload);
    } catch {
      // Fallback per browser vecchi
      const textarea = document.createElement('textarea');
      textarea.value = textPayload;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }

    // 2. Prova a usare il Web Share API per aprire il Share Sheet (iOS)
    // dal quale l'utente può scegliere il proprio Shortcut.
    const title = this.translateService.instant('SHOPPING_LIST_PAGE.TITLE');
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: textPayload });
      } catch (err) {
        // Ignora eventuali errori di share (es. utente chiude il menu)
        this.alertService.presentInfoPopup(this.translateService.instant('COMMON.CLIPBOARD'));
      }
    } else {
      // Solo notifica se non c'è il web share
      this.alertService.presentInfoPopup(this.translateService.instant('COMMON.CLIPBOARD'));
    }
  }
}
