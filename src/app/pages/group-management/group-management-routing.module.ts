import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { GroupManagementPage } from './group-management.page';

const routes: Routes = [
  {
    path: '',
    component: GroupManagementPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class GroupManagementPageRoutingModule {}
