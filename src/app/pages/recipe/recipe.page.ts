import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AlertController, LoadingController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
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
    private readonly sessionService: SessionService
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
    this.dataService.getRecipe(id).then(
      response => {
        if (response) {
          this.recipe = response;
        } else {
          this.showRecipeError();
        }
      },
      error => {
        this.showRecipeError();
      }
    ).finally(async () => {
      await loading.dismiss();
    });
  }

  async onAddToPlanningClicked() {
    if (this.recipe) {
      //await this.dataService.addToPlanning(this.recipe); //TODO
      //this.navCtrl.navigateRoot('tabs/tab3', {queryParams: { recipe: JSON.stringify(this.recipe) } }); //TODO
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

}
