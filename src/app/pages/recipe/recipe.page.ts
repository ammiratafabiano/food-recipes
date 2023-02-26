import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionSheetController, LoadingController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { HomeNavigationPath, NavigationPath } from 'src/app/models/navigation-path.enum';
import { Recipe } from 'src/app/models/recipe.model';
import { AlertService } from 'src/app/services/alert.service';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { SessionService } from 'src/app/services/session.service';

@Component({
  selector: 'app-recipe',
  templateUrl: './recipe.page.html',
  styleUrls: ['./recipe.page.scss'],
})
export class RecipePage implements OnInit {

  recipe?: Recipe;

  isUserLogged = false;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly dataService: DataService,
    private readonly loadingController: LoadingController,
    private readonly alertService: AlertService,
    private readonly translateService: TranslateService,
    private readonly sessionService: SessionService,
    private readonly actionSheetCtrl: ActionSheetController,
    private readonly navigationService: NavigationService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params && params["id"]) {
        const recipe_id = params["id"];
        this.getRecipe(recipe_id);
      }
    });
    this.isUserLogged = !!this.sessionService.userData;
  }

  private async getRecipe(id: number) {
    const loading = await this.loadingController.create()
    await loading.present()
    this.recipe = await this.dataService.getRecipe(id);
    await loading.dismiss();
    if (!this.recipe) this.navigationService.setRoot(NavigationPath.NotFound);
  }

  async onBackClicked() {
    return this.navigationService.pop();
  }

  async onAddToPlanningClicked() {
    if (!this.recipe) return;
  
    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translateService.instant("RECIPE_PAGE.ADD_TO_PLANNING_CHOICE"),
      buttons: [
        {
          text: this.translateService.instant("RECIPE_PAGE.ADD_TO_PLANNING_THIS_WEEK"),
          data: {
            action: moment().startOf('week').format("YYYY-MM-DD"),
          }
        },
        {
          text: this.translateService.instant("RECIPE_PAGE.ADD_TO_PLANNING_NEXT_WEEK"),
          data: {
            action: moment().startOf('week').add(1,'week').format("YYYY-MM-DD"),
          }
        },
        {
          text: this.translateService.instant("RECIPE_PAGE.ADD_TO_PLANNING_CANCEL"),
          role: 'cancel'
        },
      ],
    });

    await actionSheet.present();
    const result = await actionSheet.onDidDismiss();
    if (result?.data?.action) {
      await this.dataService.addToPlanning(this.recipe, result.data.action);
      this.navigationService.setRoot([NavigationPath.Home, HomeNavigationPath.Planning], {
        queryParams: {
          week: result?.data?.action
        }
      });
    }
  }

  async onDeleteClicked() {
    return this.alertService.presentConfirmPopup(
      "RECIPE_PAGE.DELETE_POPUP_CONFIRM_MESSAGE",
      () => {
        this.recipe && this.dataService.deleteRecipe(this.recipe.id);
        this.navigationService.pop({ needToRefresh: true });
      }
    );
  }

}
