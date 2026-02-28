import { ChangeDetectionStrategy, Component, inject, OnDestroy, signal } from '@angular/core';
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonLabel,
  IonList,
  IonRefresher,
  IonRefresherContent,
  IonTitle,
  IonToolbar,
} from '@ionic/angular/standalone';
import { ActionSheetController } from '@ionic/angular';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LoadingService } from 'src/app/services/loading.service';
import { AlertService } from 'src/app/services/alert.service';
import dayjs from 'dayjs';
import { Ingredient } from 'src/app/models/ingredient.model';
import { DataService } from 'src/app/services/data.service';
import { Group } from 'src/app/models/group.model';
import { trackById } from 'src/app/utils/track-by';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-shopping-list',
  templateUrl: 'shopping-list.page.html',
  styleUrls: ['shopping-list.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    TranslateModule,
    IonHeader,
    IonToolbar,
    IonTitle,
    IonContent,
    IonLabel,
    IonList,
    IonItem,
    IonRefresher,
    IonRefresherContent,
    IonButtons,
    IonButton,
    IonIcon,
  ],
})
export class ShoppingListPage implements OnDestroy {
  private readonly dataService = inject(DataService);
  private readonly loadingService = inject(LoadingService);
  private readonly actionSheetCtrl = inject(ActionSheetController);
  private readonly translateService = inject(TranslateService);
  private readonly alertService = inject(AlertService);

  readonly shoppingList = signal<Ingredient[] | undefined>(undefined);

  readonly trackByIngredient = trackById;

  private group: Group | undefined;
  private invalidateSub: Subscription | null = null;

  constructor() {}

  ionViewDidEnter() {
    this.getData();
  }

  ngOnDestroy() {
    this.invalidateSub?.unsubscribe();
  }

  private async getData() {
    await this.loadingService.withLoader(async () => {
      this.group = await this.dataService.retrieveGroup();
      await this.getShoppingList();

      // Subscribe to real-time only if the user belongs to a group
      // The socket is already managed by SocketService (singleton);
      // we just listen — no new connection is created here.
      if (this.group) {
        this.dataService.connectRealtime(this.group);
        this.invalidateSub?.unsubscribe();
        this.invalidateSub = this.dataService.shoppingListInvalidate$.subscribe(() => {
          this.getShoppingList();
        });
      }
    });
  }

  async getShoppingList(startDate?: string) {
    if (!startDate) startDate = dayjs().startOf('week').format('YYYY-MM-DD');
    const response = await this.dataService.getShoppingList(startDate, this.group?.id);
    this.shoppingList.set(response && response.length > 0 ? response : []);
  }

  async handleRefresh(event: Event) {
    await this.getShoppingList();
    const target = event.target as HTMLIonRefresherElement | null;
    target?.complete();
  }

  /**
   * Builds a text representation of the shopping list.
   */
  private buildShoppingListText(): string {
    const list = this.shoppingList();
    if (!list || list.length === 0) return '';

    return list
      .map((item) => {
        const qty = item.quantity?.value
          ? `${item.quantity.value}${item.quantity.unit ? this.translateService.instant('COMMON.WEIGHT_UNITS.' + item.quantity.unit) : ''}`
          : '';
        return qty ? `${item.name} - ${qty}` : item.name;
      })
      .join('\n');
  }

  /**
   * Shows an action sheet with export options for the shopping list.
   */
  async onExportClicked() {
    const list = this.shoppingList();
    if (!list || list.length === 0) return;

    const buttons: any[] = [];

    // Share via native share sheet (iOS/Android - includes Reminders, AirDrop, etc.)
    if (typeof navigator.share === 'function') {
      buttons.push({
        text: this.translateService.instant('SHOPPING_LIST_PAGE.SHARE'),
        icon: 'share-outline',
        handler: () => this.shareList(),
      });
    }

    // Copy as text (can be pasted into Reminders manually)
    buttons.push({
      text: this.translateService.instant('SHOPPING_LIST_PAGE.COPY_LIST'),
      icon: 'copy-outline',
      handler: () => this.copyListToClipboard(),
    });

    // Export to Apple Reminders (iOS only - via URL scheme)
    buttons.push({
      text: this.translateService.instant('SHOPPING_LIST_PAGE.EXPORT_REMINDERS'),
      icon: 'checkbox-outline',
      handler: () => this.exportToAppleReminders(),
    });

    buttons.push({
      text: this.translateService.instant('COMMON.GENERIC_ALERT.CANCEL_BUTTON'),
      role: 'cancel',
    });

    const actionSheet = await this.actionSheetCtrl.create({
      header: this.translateService.instant('SHOPPING_LIST_PAGE.EXPORT_TITLE'),
      buttons,
    });
    await actionSheet.present();
  }

  /**
   * Uses the Web Share API to share the shopping list.
   * On iOS, this opens the native share sheet which includes
   * Reminders, Notes, Messages, etc.
   */
  private async shareList() {
    const text = this.buildShoppingListText();
    const title = this.translateService.instant('SHOPPING_LIST_PAGE.TITLE');
    try {
      await navigator.share({ title, text });
    } catch {
      // User cancelled or share failed — no action needed
    }
  }

  /**
   * Copies the shopping list to clipboard as formatted text.
   */
  private async copyListToClipboard() {
    const text = this.buildShoppingListText();
    try {
      await navigator.clipboard.writeText(text);
      this.alertService.presentInfoPopup(this.translateService.instant('COMMON.CLIPBOARD'));
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      this.alertService.presentInfoPopup(this.translateService.instant('COMMON.CLIPBOARD'));
    }
  }

  /**
   * Exports the shopping list to Apple Reminders.
   *
   * Strategy: Creates a Shortcuts-compatible URL that, when opened on iOS/macOS,
   * will trigger the Apple Shortcuts app to add items to a Reminders list.
   *
   * We use the `shortcuts://run-shortcut` URL scheme. The user needs to have
   * a Shortcut called "Add Shopping List" that accepts text input.
   *
   * As an alternative simpler approach, we format the list and open the
   * Reminders app with the share sheet, or copy items individually.
   *
   * The most reliable cross-platform approach is to generate a text payload
   * and use the share sheet, which is already handled by shareList().
   * This method provides a direct Reminders-focused experience.
   */
  private async exportToAppleReminders() {
    const list = this.shoppingList();
    if (!list || list.length === 0) return;

    // Build the list items as newline-separated text
    const items = list.map((item) => {
      const qty = item.quantity?.value
        ? ` (${item.quantity.value}${item.quantity.unit ? this.translateService.instant('COMMON.WEIGHT_UNITS.' + item.quantity.unit) : ''})`
        : '';
      return `${item.name}${qty}`;
    });

    const listText = items.join('\n');

    // Try to use the Shortcuts URL scheme to run a shortcut
    // The shortcut should be named "Aggiungi Lista Spesa" or "Add Shopping List"
    const shortcutName = this.translateService.instant(
      'SHOPPING_LIST_PAGE.REMINDERS_SHORTCUT_NAME',
    );
    const encodedInput = encodeURIComponent(listText);
    const encodedName = encodeURIComponent(shortcutName);
    const shortcutsUrl = `shortcuts://run-shortcut?name=${encodedName}&input=text&text=${encodedInput}`;

    // Try to open the Shortcuts URL
    // If it fails (not on iOS/macOS, or shortcut doesn't exist), fall back to share
    try {
      const opened = window.open(shortcutsUrl, '_blank');
      if (!opened) {
        // If window.open failed (blocked popup), try location redirect
        // but first share as fallback
        await this.shareList();
      }
    } catch {
      // Fallback: show info about the Shortcuts setup
      this.alertService.presentInfoPopup(
        this.translateService.instant('SHOPPING_LIST_PAGE.REMINDERS_SETUP_INFO'),
      );
    }
  }
}
