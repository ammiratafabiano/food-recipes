import { Component, Input, OnInit } from '@angular/core';
import { Food } from 'src/app/models/food.model';
import { NavigationService } from 'src/app/services/navigation.service';

@Component({
  selector: 'app-ingredient-selection',
  templateUrl: './ingredient-selection.page.html',
  styleUrls: ['./ingredient-selection.page.scss'],
})
export class IngredientSelectionPage implements OnInit {

  @Input() foodList: Food[] = [];

  constructor(private readonly navigationService: NavigationService) { }

  ngOnInit() {
  }

  onFoodClicked(food: Food) {
    this.navigationService.pop(food);
  }

  onCloseClicked() {
    this.navigationService.pop();
  }

}
