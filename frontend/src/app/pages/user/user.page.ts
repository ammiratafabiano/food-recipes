import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import {
  IonAvatar,
  IonButton,
  IonButtons,
  IonCard,
  IonCardHeader,
  IonCardSubtitle,
  IonCardTitle,
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
import { LoadingService } from 'src/app/services/loading.service';
import { RecipeListNavigationPath } from 'src/app/models/navigation-path.enum';
import { Recipe } from 'src/app/models/recipe.model';
import { UserData } from 'src/app/models/user-data.model';
import { AlertService } from 'src/app/services/alert.service';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { environment } from 'src/environments/environment';
import { trackById } from 'src/app/utils/track-by';
import { shareOrCopy } from 'src/app/utils/clipboard';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
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
    IonLabel,
    IonItem,
    IonList,
    IonCard,
    IonCardHeader,
    IonCardTitle,
    IonCardSubtitle,
    IonAvatar,
  ],
})
export class UserPage implements OnInit {
  private readonly dataService = inject(DataService);
  private readonly loadingService = inject(LoadingService);
  private readonly navigationService = inject(NavigationService);
  private readonly authService = inject(AuthService);
  private readonly alertService = inject(AlertService);
  private readonly translateService = inject(TranslateService);

  private readonly route = inject(ActivatedRoute);

  readonly user = signal<UserData | undefined>(undefined);
  readonly isUserLogged = computed(() => !!this.authService.currentUser());

  readonly trackByRecipe = trackById;

  ngOnInit() {
    const userId = this.route.snapshot.queryParamMap.get('id');
    if (userId) {
      this.getData(userId);
    } else {
      this.navigationService.pop();
    }
  }

  private async getData(id: string) {
    await this.loadingService.withLoader(async () => {
      const userData = await this.dataService.getUser(id);
      if (userData) {
        userData.recipes = (await this.dataService.getRecipeList(userData.id)) || [];
      }
      this.user.set(userData);
    });
  }

  async onBackClicked() {
    this.navigationService.goToPreviousPage();
  }

  async onShareClicked() {
    const user = this.user();
    if (!user) return;
    const link = environment.siteUrl + '?user=' + user.id;
    const result = await shareOrCopy(link, user.name);
    if (result === 'copied') {
      const text = this.translateService.instant('COMMON.CLIPBOARD');
      this.alertService.presentInfoPopup(text);
    }
  }

  async onFollowClicked() {
    const user = this.user();
    if (!user) return;
    await this.loadingService.withLoader(async () => {
      const result = await this.dataService.addFollower(user.id);
      if (result) {
        this.user.set({ ...user, isFollowed: true });
      }
    });
  }

  async onUnfollowClicked() {
    const user = this.user();
    if (!user) return;
    await this.loadingService.withLoader(async () => {
      const result = await this.dataService.deleteFollower(user.id);
      if (result) {
        this.user.set({ ...user, isFollowed: false });
      }
    });
  }

  async onRecipeClicked(recipe: Recipe) {
    const user = this.user();
    if (!user) return;
    return this.navigationService.push(RecipeListNavigationPath.Recipe, {
      queryParams: {
        id: recipe.id,
      },
      dismissCallback: (params?: unknown) => {
        const typedParams = params as { needToRefresh?: boolean } | undefined;
        if (typedParams?.needToRefresh && user) {
          return this.getData(user.id);
        }
        return Promise.resolve();
      },
    });
  }
}
