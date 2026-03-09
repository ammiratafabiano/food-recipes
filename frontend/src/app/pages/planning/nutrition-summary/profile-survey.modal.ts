import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ModalController } from '@ionic/angular';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonList,
  IonSelect,
  IonSelectOption,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { DataService } from 'src/app/services/data.service';
import { UserProfile } from 'src/app/models/user-data.model';
import { RecommendedDaily } from 'src/app/models/nutrition-summary.model';

@Component({
  selector: 'app-profile-survey-modal',
  template: `
    <ion-header>
      <ion-toolbar>
        <ion-title>{{ 'PROFILE_SURVEY.TITLE' | translate }}</ion-title>
        <ion-buttons slot="end">
          <ion-button (click)="dismiss()">
            <ion-icon slot="icon-only" name="close"></ion-icon>
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content class="ion-padding">
      <p class="description">{{ 'PROFILE_SURVEY.DESCRIPTION' | translate }}</p>

      <ion-list>
        <ion-item>
          <ion-input
            label="{{ 'PROFILE_SURVEY.WEIGHT' | translate }}"
            labelPlacement="floating"
            type="number"
            [value]="weight()"
            (ionInput)="weight.set($any($event).detail.value)"
            placeholder="70"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input
            label="{{ 'PROFILE_SURVEY.HEIGHT' | translate }}"
            labelPlacement="floating"
            type="number"
            [value]="height()"
            (ionInput)="height.set($any($event).detail.value)"
            placeholder="175"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-input
            label="{{ 'PROFILE_SURVEY.AGE' | translate }}"
            labelPlacement="floating"
            type="number"
            [value]="age()"
            (ionInput)="age.set($any($event).detail.value)"
            placeholder="30"
          ></ion-input>
        </ion-item>
        <ion-item>
          <ion-select
            label="{{ 'PROFILE_SURVEY.SEX' | translate }}"
            labelPlacement="floating"
            [value]="sex()"
            (ionChange)="sex.set($any($event).detail.value)"
          >
            <ion-select-option value="male">{{
              'PROFILE_SURVEY.MALE' | translate
            }}</ion-select-option>
            <ion-select-option value="female">{{
              'PROFILE_SURVEY.FEMALE' | translate
            }}</ion-select-option>
          </ion-select>
        </ion-item>
        <ion-item>
          <ion-select
            label="{{ 'PROFILE_SURVEY.ACTIVITY_LEVEL' | translate }}"
            labelPlacement="floating"
            [value]="activityLevel()"
            (ionChange)="activityLevel.set($any($event).detail.value)"
          >
            <ion-select-option value="sedentary">{{
              'PROFILE_SURVEY.SEDENTARY' | translate
            }}</ion-select-option>
            <ion-select-option value="light">{{
              'PROFILE_SURVEY.LIGHT' | translate
            }}</ion-select-option>
            <ion-select-option value="moderate">{{
              'PROFILE_SURVEY.MODERATE' | translate
            }}</ion-select-option>
            <ion-select-option value="active">{{
              'PROFILE_SURVEY.ACTIVE' | translate
            }}</ion-select-option>
            <ion-select-option value="very_active">{{
              'PROFILE_SURVEY.VERY_ACTIVE' | translate
            }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      @if (calculated(); as c) {
        <div class="result-card">
          <ion-label class="result-title">{{ 'PROFILE_SURVEY.YOUR_NEEDS' | translate }}</ion-label>
          <div class="result-row">
            <span>kcal</span>
            <strong>{{ c.kcal }}</strong>
          </div>
          <div class="result-row">
            <span>{{ 'NUTRITION_SUMMARY.PROTEIN' | translate }}</span>
            <strong>{{ c.protein }}g</strong>
          </div>
          <div class="result-row">
            <span>{{ 'NUTRITION_SUMMARY.FAT' | translate }}</span>
            <strong>{{ c.fat }}g</strong>
          </div>
          <div class="result-row">
            <span>{{ 'NUTRITION_SUMMARY.CARBS' | translate }}</span>
            <strong>{{ c.carbs }}g</strong>
          </div>
          <div class="result-row">
            <span>{{ 'NUTRITION_SUMMARY.FIBER' | translate }}</span>
            <strong>{{ c.fiber }}g</strong>
          </div>
        </div>
      }

      <ion-button expand="block" [disabled]="!isValid()" (click)="onSave()">
        {{ 'PROFILE_SURVEY.SAVE' | translate }}
      </ion-button>
    </ion-content>
  `,
  styles: [
    `
      .description {
        color: var(--ion-color-medium);
        font-size: 0.9em;
        margin-bottom: 16px;
      }
      .result-card {
        background: rgba(var(--ion-color-primary-rgb), 0.06);
        border: 1px solid rgba(var(--ion-color-primary-rgb), 0.12);
        border-radius: 12px;
        padding: 16px;
        margin: 20px 0;
      }
      .result-title {
        display: block;
        font-weight: 700;
        margin-bottom: 10px;
      }
      .result-row {
        display: flex;
        justify-content: space-between;
        padding: 4px 0;
        font-size: 0.9em;
        span {
          color: var(--ion-color-medium);
        }
      }
      ion-button[expand='block'] {
        margin-top: 16px;
      }
    `,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    FormsModule,
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonButtons,
    IonButton,
    IonIcon,
    IonList,
    IonItem,
    IonInput,
    IonLabel,
    IonSelect,
    IonSelectOption,
  ],
})
export class ProfileSurveyComponent implements OnInit {
  private readonly dataService = inject(DataService);
  private readonly modalCtrl = inject(ModalController);

  readonly weight = signal<number | null>(null);
  readonly height = signal<number | null>(null);
  readonly age = signal<number | null>(null);
  readonly sex = signal<'male' | 'female' | null>(null);
  readonly activityLevel = signal<string | null>(null);
  readonly calculated = signal<RecommendedDaily | null>(null);

  async ngOnInit() {
    const profile = await this.dataService.getUserProfile();
    if (profile) {
      if (profile.weight) this.weight.set(profile.weight);
      if (profile.height) this.height.set(profile.height);
      if (profile.age) this.age.set(profile.age);
      if (profile.sex) this.sex.set(profile.sex);
      if (profile.activity_level) this.activityLevel.set(profile.activity_level);
      this.recalculate();
    }
  }

  isValid(): boolean {
    return !!(this.weight() && this.height() && this.age() && this.sex() && this.activityLevel());
  }

  private recalculate() {
    const w = Number(this.weight());
    const h = Number(this.height());
    const a = Number(this.age());
    const s = this.sex();
    const al = this.activityLevel();
    if (!w || !h || !a || !s || !al) {
      this.calculated.set(null);
      return;
    }

    // Mifflin-St Jeor equation
    let bmr: number;
    if (s === 'male') {
      bmr = 10 * w + 6.25 * h - 5 * a + 5;
    } else {
      bmr = 10 * w + 6.25 * h - 5 * a - 161;
    }

    const activityMultipliers: Record<string, number> = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };

    const tdee = Math.round(bmr * (activityMultipliers[al] || 1.2));

    // Macro split: 30% protein, 25% fat, 45% carbs
    const protein = Math.round((tdee * 0.3) / 4);
    const fat = Math.round((tdee * 0.25) / 9);
    const carbs = Math.round((tdee * 0.45) / 4);
    const fiber = 25;

    this.calculated.set({ kcal: tdee, protein, fat, carbs, fiber });
  }

  async onSave() {
    this.recalculate();
    const calc = this.calculated();

    await this.dataService.updateUserProfile({
      weight: Number(this.weight()) || undefined,
      height: Number(this.height()) || undefined,
      age: Number(this.age()) || undefined,
      sex: this.sex() || undefined,
      activity_level: this.activityLevel() as UserProfile['activity_level'],
    });

    this.modalCtrl.dismiss(calc);
  }

  dismiss() {
    this.modalCtrl.dismiss(null);
  }
}
