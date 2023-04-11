import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoadingController } from '@ionic/angular';
import { take } from 'rxjs';
import { HomeNavigationPath, NavigationPath, RecipeListNavigationPath } from 'src/app/models/navigation-path.enum';
import { Recipe } from 'src/app/models/recipe.model';
import { UserData } from 'src/app/models/user-data.model';
import { AuthService } from 'src/app/services/auth.service';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-user',
  templateUrl: './user.page.html',
  styleUrls: ['./user.page.scss'],
})
export class UserPage implements OnInit {
  
  user?: UserData;

  isUserLogged = false;

  constructor(
    private readonly dataService: DataService,
    private readonly loadingController: LoadingController,
    private readonly navigationService: NavigationService,
    private readonly route: ActivatedRoute,
    private readonly authService: AuthService
  ) { }

  ngOnInit() {
    this.route.queryParams.pipe(take(1)).subscribe(params => {
      if (!this.user && params && params["id"]) {
        const user_id = params["id"];
        this.getData(user_id);
      } else {
        this.navigationService.pop();
      }
    });
    this.isUserLogged = !!this.authService.getCurrentUser();
  }

  private async getData(id: string) {
    const loading = await this.loadingController.create()
    await loading.present()
    this.user = await this.dataService.getUser(id);
    if (this.user) {
      this.user.recipes = await this.dataService.getRecipeList(this.user.id) || [];
    }
    await loading.dismiss();
  }
  
  async onBackClicked() {
    return this.navigationService.setRoot(NavigationPath.Home);
  }

  async onFollowClicked() {
    if (this.user) {
      const loading = await this.loadingController.create()
      await loading.present()
      const result = await this.dataService.addFollower(this.user.id);
      if (result) {
        this.user.followed = true;
      }
      await loading.dismiss();
    }
  }

  async onUnfollowClicked() {
    if (!this.user) return;
    const loading = await this.loadingController.create()
    await loading.present()
    const result = await this.dataService.deleteFollower(this.user.id);
    if (result) {
      this.user.followed = false;
    }
    await loading.dismiss();
  }

  async onRecipeClicked(recipe: Recipe) {
    if (!this.user) return;
    return this.navigationService.push(RecipeListNavigationPath.Recipe, {
      queryParams: {
        id: recipe.id
      }
    });
  }

  async onAddClicked(recipe: Recipe) {

  }
}
