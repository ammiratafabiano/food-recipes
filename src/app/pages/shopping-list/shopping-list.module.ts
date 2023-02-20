import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ShoppingList } from './shopping-list.page';

import { ShoppingListRoutingModule } from './shopping-list-routing.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    ShoppingListRoutingModule,
    TranslateModule
  ],
  declarations: [ShoppingList]
})
export class ShoppingListModule {}
