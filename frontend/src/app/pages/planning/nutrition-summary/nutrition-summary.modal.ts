import { ChangeDetectionStrategy, Component, inject, Input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ModalController } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonListHeader,
  IonNote,
  IonProgressBar,
  IonSpinner,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  DayNutrition,
  NutritionSummary,
  DEFAULT_RECOMMENDED_DAILY,
  RecommendedDaily,
} from 'src/app/models/nutrition-summary.model';
import { DataService } from 'src/app/services/data.service';
import { AuthService } from 'src/app/services/auth.service';
import { Group } from 'src/app/models/group.model';
import { WeekDay } from 'src/app/models/weekDay.enum';

@Component({
  selector: 'app-nutrition-summary-modal',
  templateUrl: 'nutrition-summary.modal.html',
  styleUrls: ['nutrition-summary.modal.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    DatePipe,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonLabel,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonCardContent,
    IonProgressBar,
    IonSpinner,
    IonItem,
    IonNote,
    IonListHeader,
  ],
})
export class NutritionSummaryComponent implements OnInit {
  private readonly dataService = inject(DataService);
  private readonly authService = inject(AuthService);
  private readonly modalCtrl = inject(ModalController);
  private readonly translateService = inject(TranslateService);

  @Input() week!: string;
  @Input() group?: Group;

  readonly summary = signal<NutritionSummary | undefined>(undefined);
  readonly loading = signal<boolean>(true);
  readonly recommended = signal<RecommendedDaily>(DEFAULT_RECOMMENDED_DAILY);

  readonly weekDays: WeekDay[] = [
    WeekDay.Monday,
    WeekDay.Tuesday,
    WeekDay.Wednesday,
    WeekDay.Thursday,
    WeekDay.Friday,
    WeekDay.Saturday,
    WeekDay.Sunday,
  ];

  async ngOnInit() {
    await this.loadProfile();
    await this.loadSummary();
  }

  private async loadProfile() {
    const profile = await this.dataService.getUserProfile();
    if (
      profile?.weight &&
      profile?.height &&
      profile?.age &&
      profile?.sex &&
      profile?.activity_level
    ) {
      const rec = this.calculateRecommended({
        weight: profile.weight,
        height: profile.height,
        age: profile.age,
        sex: profile.sex,
        activity_level: profile.activity_level,
      });
      this.recommended.set(rec);
    }
  }

  private calculateRecommended(profile: {
    weight: number;
    height: number;
    age: number;
    sex: string;
    activity_level: string;
  }): RecommendedDaily {
    let bmr: number;
    if (profile.sex === 'male') {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age + 5;
    } else {
      bmr = 10 * profile.weight + 6.25 * profile.height - 5 * profile.age - 161;
    }
    const multipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const tdee = Math.round(bmr * (multipliers[profile.activity_level] || 1.2));
    return {
      kcal: tdee,
      protein: Math.round((tdee * 0.3) / 4),
      fat: Math.round((tdee * 0.25) / 9),
      carbs: Math.round((tdee * 0.45) / 4),
      fiber: 25,
    };
  }

  async loadSummary() {
    this.loading.set(true);
    const currentUserId = this.getCurrentUserId();
    const summary = await this.dataService.getNutritionSummary(
      this.week,
      this.group?.id,
      currentUserId || undefined,
    );
    this.summary.set(summary);
    this.loading.set(false);
  }

  getDayNutrition(day: string): DayNutrition | null {
    const s = this.summary();
    if (!s || !s.days[day]) return null;
    return s.days[day];
  }

  hasAnyDayData(): boolean {
    const s = this.summary();
    if (!s) return false;
    return Object.keys(s.days).length > 0;
  }

  /** Returns percentage (0-100+) of a macro vs recommended daily value */
  getPercent(value: number, macro: keyof RecommendedDaily): number {
    const rec = this.recommended()[macro];
    if (!rec) return 0;
    return Math.round((value / rec) * 100);
  }

  /** Returns capped percentage for progress bar width (max 100) */
  getBarWidth(value: number, macro: keyof RecommendedDaily): number {
    return Math.min(100, this.getPercent(value, macro));
  }

  /** Returns the number of planned days */
  getPlannedDayCount(): number {
    const s = this.summary();
    if (!s) return 0;
    return Object.keys(s.days).length;
  }

  /** Returns daily average for the week */
  getDailyAverage(macro: keyof DayNutrition): number {
    const s = this.summary();
    if (!s) return 0;
    const dayCount = this.getPlannedDayCount();
    if (dayCount === 0) return 0;
    return Math.round((s.weekTotal[macro] / dayCount) * 10) / 10;
  }

  getCurrentUserId(): string {
    const user = this.authService.getCurrentUser();
    return user?.id || '';
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
