import {
  ChangeDetectionStrategy,
  Component,
  inject,
  signal,
} from '@angular/core';
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
import { trackById } from 'src/app/utils/track-by';

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
export class ShoppingListPage {
  private readonly dataService = inject(DataService);
  private readonly loadingService = inject(LoadingService);

  readonly shoppingList = signal<Ingredient[] | undefined>(undefined);

  readonly trackByIngredient = trackById;

  constructor() {}

  ionViewDidEnter() {
    this.getData();
  }

  private async getData() {
    await this.loadingService.withLoader(async () => {
      await this.getShoppingList();
    });
  }

  async getShoppingList(startDate?: string) {
    if (!startDate) startDate = dayjs().startOf('week').format('YYYY-MM-DD');
    const response = await this.dataService.getShoppingList(startDate);
    this.shoppingList.set(response && response.length > 0 ? response : []);
  }

  async handleRefresh(event: any) {
    await this.getShoppingList();
    const target = event.target as HTMLIonRefresherElement | null;
    target?.complete();
  }
}
