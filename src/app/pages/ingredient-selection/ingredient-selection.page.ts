import { Component, Input, OnInit } from '@angular/core';
import { Food } from 'src/app/models/food.model';
import { NavigationPath } from 'src/app/models/navigation-path.enum';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-ingredient-selection',
  templateUrl: './ingredient-selection.page.html',
  styleUrls: ['./ingredient-selection.page.scss'],
})
export class IngredientSelectionPage implements OnInit {

  foodList: Food[] = [];

  constructor(private readonly navigationService: NavigationService) { }

  ngOnInit() {
    this.foodList = this.navigationService.getParams<{foodList:Food[]}>()?.foodList;
  }

  async onFoodClicked(food: Food) {
    return this.navigationService.pop(food);
  }

  async onBackClicked() {
    return this.navigationService.pop();
  }
}
