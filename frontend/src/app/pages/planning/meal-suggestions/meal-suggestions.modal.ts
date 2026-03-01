import { ChangeDetectionStrategy, Component, inject, Input, OnInit, signal } from '@angular/core';
import { ModalController } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataService } from 'src/app/services/data.service';
import { Group } from 'src/app/models/group.model';

export interface MealSuggestion {
  recipe_id: string;
  recipe_name: string;
  recipe_type: string;
  frequency: number;
  last_used_week: string;
  meals_used: string[];
}

@Component({
  selector: 'app-meal-suggestions-modal',
  templateUrl: 'meal-suggestions.modal.html',
  styleUrls: ['meal-suggestions.modal.scss'],
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
    IonItem,
    IonLabel,
    IonList,
  ],
})
export class MealSuggestionsComponent implements OnInit {
  private readonly dataService = inject(DataService);
  private readonly modalCtrl = inject(ModalController);
  private readonly translateService = inject(TranslateService);

  @Input() week!: string;
  @Input() group?: Group;

  readonly suggestions = signal<MealSuggestion[]>([]);
  readonly loading = signal<boolean>(true);

  async ngOnInit() {
    const groupId = this.group?.id;
    const data = await this.dataService.getPlanningSuggestions(this.week, groupId);
    this.suggestions.set(data);
    this.loading.set(false);
  }

  getMealsLabel(meals: string[]): string {
    if (!meals || meals.length === 0) return '';
    return meals.map((m) => this.translateService.instant('COMMON.MEAL_TYPE.' + m)).join(', ');
  }

  onAddClicked(suggestion: MealSuggestion) {
    this.modalCtrl.dismiss(suggestion, 'add');
  }

  onClose() {
    this.modalCtrl.dismiss(null, 'cancel');
  }
}
