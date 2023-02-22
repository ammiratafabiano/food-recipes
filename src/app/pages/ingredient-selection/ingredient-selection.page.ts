import { Component, Input, OnInit } from '@angular/core';
import { ModalController } from '@ionic/angular';
import { Food } from 'src/app/models/food.model';

@Component({
  selector: 'app-ingredient-selection',
  templateUrl: './ingredient-selection.page.html',
  styleUrls: ['./ingredient-selection.page.scss'],
})
export class IngredientSelectionPage implements OnInit {

  @Input() foodList: Food[] = [];

  constructor(private readonly modalController: ModalController) { }

  ngOnInit() {
  }

  onFoodClicked(food: Food) {
    this.modalController.dismiss(food);
  }

  onCloseClicked() {
    this.modalController.dismiss();
  }

}
