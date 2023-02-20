import { IonicModule } from '@ionic/angular';
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { PlanningPage } from './planning.page';

import { PlanningPageRoutingModule } from './planning-routing.module';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    IonicModule,
    CommonModule,
    FormsModule,
    PlanningPageRoutingModule,
    TranslateModule
  ],
  declarations: [PlanningPage]
})
export class PlanningPageModule {}
