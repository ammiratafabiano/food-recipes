import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ActionSheetController, AlertController, LoadingController, NavController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import * as moment from 'moment';
import { Recipe } from 'src/app/models/recipe.model';
import { DataService } from 'src/app/services/data.service';
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
    private readonly alertController: AlertController,
    private readonly translateService: TranslateService,
    private readonly sessionService: SessionService,
    private readonly navCtrl: NavController,
    private readonly actionSheetCtrl: ActionSheetController
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params && params['id']) {
        const recipe_id = params['id'];
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
    if (!this.recipe) this.navCtrl.navigateRoot('not-found');
  }

  async onAddToPlanningClicked() {
    // TODO check valid recipe
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
      this.navCtrl.navigateRoot('tabs/planning', {
        queryParams: {
          week: result?.data?.action
        }
      });
    }
  }

  private async showRecipeError() {
    const title = this.translateService.instant("RECIPE_PAGE.ERROR_TITLE");
    const description = this.translateService.instant("RECIPE_PAGE.ERROR_DESCRIPTION");
    return this.showAlert(title, description);
  }

  private async showAlert(title: string, msg: string) {
    const alert = await this.alertController.create({
      header: title,
      message: msg,
      buttons: ['OK']
    })
    await alert.present()
  }

  async onDeleteClicked() {
    const alert = await this.alertController.create({
      header: "Attenzione",
      message: "Vuoi davvero cancellare la ricetta?",
      buttons: [
        {
          text: "Cancel"
        },
        {
          text: "Ok",
          handler: () => {
            this.recipe && this.dataService.deleteRecipe(this.recipe.id);
          }
        }
      ],
    })
    await alert.present()
  }

}
