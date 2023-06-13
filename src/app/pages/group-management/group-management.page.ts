import { Component, OnInit } from '@angular/core';
import { LoadingController } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';
import { Subject } from 'rxjs';
import { Group } from 'src/app/models/group.model';
import { AlertService } from 'src/app/services/alert.service';
import { DataService } from 'src/app/services/data.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-group-management',
  templateUrl: './group-management.page.html',
  styleUrls: ['./group-management.page.scss'],
})
export class GroupManagementPage{

  newGroupId?: string;
  group?: Group;

  dataLoaded = new Subject<boolean>();

  constructor(
    private readonly dataService: DataService,
    private readonly loadingController: LoadingController,
    private readonly navigationService: NavigationService,
    private readonly translateService: TranslateService,
    private readonly alertService: AlertService
  ) { }

  ionViewDidEnter() {
    this.dataLoaded.next(false);
    this.getGroup();
  }

  private async getGroup() {
    const loading = await this.loadingController.create();
    await loading.present();
    this.group = await this.dataService.retrieveGroup();
    await loading.dismiss();
    this.dataLoaded.next(true);
  }

  async onBackClicked() {
    return this.navigationService.pop();
  }

  async onCreateGroupClicked() {
    const loading = await this.loadingController.create();
    await loading.present();
    this.group = await this.dataService.createGroup();
    await loading.dismiss();
  }

  async onJoinGroupClicked() {
    if (!this.newGroupId) return;
    const loading = await this.loadingController.create();
    await loading.present();
    this.group = await this.dataService.joinGroup(this.newGroupId);
    await loading.dismiss();
  }

  async onLeaveGroupClicked() {
    if (!this.group?.id) return;
    const loading = await this.loadingController.create();
    await loading.present();
    this.group = await this.dataService.leaveGroup(this.group.id);
    await loading.dismiss();
  }

  async onShareClicked() {
    if (!this.group) return;
    const link = environment.siteUrl + '?group=' + this.group.id;
    navigator.clipboard.writeText(link);
    const text = this.translateService.instant("COMMON.CLIPBOARD");
    this.alertService.presentInfoPopup(text);
  }
}
