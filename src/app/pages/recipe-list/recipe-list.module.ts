import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RecipeListPage } from './recipe-list.page';

import { RecipeListPageRoutingModule } from './recipe-list-routing.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    RecipeListPageRoutingModule,
    TranslateModule
  ],
  declarations: [RecipeListPage]
})
export class RecipeListPageModule {}
