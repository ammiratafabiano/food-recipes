import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { NavController } from '@ionic/angular';
import { Recipe } from 'src/app/models/recipe.model';
import { DataService } from 'src/app/services/data.service';

@Component({
  selector: 'app-recipe',
  templateUrl: './recipe.page.html',
  styleUrls: ['./recipe.page.scss'],
})
export class RecipePage implements OnInit {

  recipe?: Recipe;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly navCtrl: NavController,
    private readonly dataService: DataService
  ) { }

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params && params['recipe']) {
        this.recipe = JSON.parse(params['recipe']);
      }
    });
  }

  async onAddToPlanningClicked() {
    if (this.recipe) {
      //await this.dataService.addToPlanning(this.recipe); //TODO
      //this.navCtrl.navigateRoot('tabs/tab3', {queryParams: { recipe: JSON.stringify(this.recipe) } }); //TODO
    }
  }

}
