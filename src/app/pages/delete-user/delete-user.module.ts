import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { DeleteUserPageRoutingModule } from './delete-user-routing.module';

import { DeleteUserPage } from './delete-user.page';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    DeleteUserPageRoutingModule,
    TranslateModule
  ],
  declarations: [DeleteUserPage]
})
export class DeleteUserPageModule {}
