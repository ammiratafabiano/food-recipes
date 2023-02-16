import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { IngredientSelectionPageRoutingModule } from './ingredient-selection-routing.module';

import { IngredientSelectionPage } from './ingredient-selection.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    IngredientSelectionPageRoutingModule,
    TranslateModule
  ],
  declarations: [IngredientSelectionPage]
})
export class IngredientSelectionPageModule {}
