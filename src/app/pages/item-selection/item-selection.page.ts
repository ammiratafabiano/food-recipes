import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  signal,
} from '@angular/core';
import type { OnInit } from '@angular/core';
import { SearchbarCustomEvent } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonSearchbar,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule } from '@ngx-translate/core';
import { Item } from 'src/app/models/item.model';
import { NavigationService } from 'src/app/services/navigation.service';
import { trackByValue } from 'src/app/utils/track-by';

@Component({
  selector: 'app-item-selection',
  templateUrl: './item-selection.page.html',
  styleUrls: ['./item-selection.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonSearchbar,
    IonList,
    IonItem,
  ],
})
export class ItemSelectionPage implements OnInit {
  private readonly navigationService = inject(NavigationService);

  readonly items = signal<Item[]>([]);
  readonly title = signal<string | undefined>(undefined);
  readonly searchQuery = signal<string>('');

  readonly filteredItems = computed(() => {
    const items = this.items();
    const query = this.searchQuery().toLowerCase().trim();
    if (!query) {
      return [...items];
    }
    return items.filter((item) => {
      return item.text.toLowerCase().includes(query);
    });
  });

  readonly customElement = computed(() => {
    const query = this.searchQuery();
    return query ? this.getCustomItem(query) : '';
  });

  readonly trackByItem = trackByValue;

  constructor() {}

  ngOnInit() {
    const params = this.navigationService.getParams<{
      title?: string;
      items: Item[];
      selectedItems?: string[];
    }>();
    if (!params?.items) {
      this.navigationService.pop();
      return;
    }
    this.items.set(params.items);
    this.title.set(params.title);
  }

  onBackClicked() {
    return this.navigationService.pop();
  }

  onItemClicked(item: Item) {
    return this.navigationService.pop(item);
  }

  onCustomItemClicked() {
    const custom: Item = {
      text: this.customElement(),
      value: '',
      custom: true,
    };

    return this.navigationService.pop(custom);
  }

  searchbarInput(ev: SearchbarCustomEvent) {
    this.searchQuery.set(ev.detail?.value || '');
  }

  private getCustomItem(search: string) {
    const words = search.split(/\s+/);
    return words
      .reduce((a, b) => a + ' ' + b.charAt(0).toUpperCase() + b.slice(1), '')
      .trim();
  }
}
