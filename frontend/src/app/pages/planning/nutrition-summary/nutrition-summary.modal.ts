import { ChangeDetectionStrategy, Component, inject, Input, OnInit, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ModalController } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DayNutrition, NutritionSummary } from 'src/app/models/nutrition-summary.model';
import { DataService } from 'src/app/services/data.service';
import { AuthService } from 'src/app/services/auth.service';
import { Group } from 'src/app/models/group.model';
import { UserData } from 'src/app/models/user-data.model';
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
    IonSegment,
    IonSegmentButton,
  ],
})
export class NutritionSummaryModal implements OnInit {
  private readonly dataService = inject(DataService);
  private readonly authService = inject(AuthService);
  private readonly modalCtrl = inject(ModalController);
  private readonly translateService = inject(TranslateService);

  @Input() week!: string;
  @Input() group?: Group;
  @Input() groupUsers?: UserData[];

  readonly summary = signal<NutritionSummary | undefined>(undefined);
  readonly loading = signal<boolean>(true);
  readonly selectedFilter = signal<string>('all');

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
    await this.loadSummary();
  }

  async loadSummary() {
    this.loading.set(true);
    const filter = this.selectedFilter();
    const assignedTo = filter === 'all' ? undefined : filter;
    const summary = await this.dataService.getNutritionSummary(
      this.week,
      this.group?.id,
      assignedTo,
    );
    this.summary.set(summary);
    this.loading.set(false);
  }

  async onFilterChanged(event: CustomEvent) {
    this.selectedFilter.set(event.detail.value);
    await this.loadSummary();
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

  getCurrentUserName(): string {
    const user = this.authService.getCurrentUser();
    return user?.name || '';
  }

  getCurrentUserId(): string {
    const user = this.authService.getCurrentUser();
    return user?.id || '';
  }

  dismiss() {
    this.modalCtrl.dismiss();
  }
}
