import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { ItemSelectionPageRoutingModule } from './item-selection-routing.module';

import { ItemSelectionPage } from './item-selection.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    ItemSelectionPageRoutingModule,
    TranslateModule
  ],
  declarations: [ItemSelectionPage]
})
export class ItemSelectionPageModule {}
