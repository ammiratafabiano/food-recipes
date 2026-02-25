import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import {
  IonContent,
  IonHeader,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { LoadingService } from 'src/app/services/loading.service';
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
  ],
})
export class ShoppingListPage implements OnDestroy {
  private readonly dataService = inject(DataService);
  private readonly loadingService = inject(LoadingService);

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

  async handleRefresh(event: any) {
    await this.getShoppingList();
    const target = event.target as HTMLIonRefresherElement | null;
    target?.complete();
  }
}
