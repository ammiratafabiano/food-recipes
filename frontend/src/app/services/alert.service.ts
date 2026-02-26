import { inject, Injectable } from '@angular/core';
import { AlertButton, AlertController, AlertInput } from '@ionic/angular';
import { TranslateService } from '@ngx-translate/core';

@Injectable({
  providedIn: 'root',
})
export class AlertService {
  private readonly alertController = inject(AlertController);
  private readonly translateService = inject(TranslateService);

  constructor() {}

  async presentInfoPopup(message: string) {
    let buttons: AlertButton[] = [
      {
        role: 'cancel',
        text: this.translateService.instant('COMMON.GENERIC_ALERT.OK_BUTTON'),
      },
    ];
    return this.presentGenericPopup(
      'COMMON.GENERIC_ALERT.INFO_HEADER',
      message,
      undefined,
      buttons,
    );
  }

  async presentAlertPopup(
    header: string,
    message: string,
    onConfirmClicked?: () => void | Promise<void>,
    confirmButton = 'COMMON.GENERIC_ALERT.OK_BUTTON',
  ) {
    let buttons: AlertButton[] = [
      {
        text: this.translateService.instant(confirmButton),
        handler: () => onConfirmClicked && onConfirmClicked(),
      },
    ];
    return this.presentGenericPopup(header, message, undefined, buttons);
  }

  async presentConfirmPopup(
    message: string,
    onConfirmClicked?: () => void | Promise<void>,
    confirmButton = 'COMMON.GENERIC_ALERT.OK_BUTTON',
  ) {
    let buttons: AlertButton[] = [
      {
        text: this.translateService.instant(confirmButton),
        handler: () => onConfirmClicked && onConfirmClicked(),
      },
      {
        role: 'cancel',
        text: this.translateService.instant('COMMON.GENERIC_ALERT.CANCEL_BUTTON'),
      },
    ];
    return this.presentGenericPopup(undefined, message, undefined, buttons);
  }

  async presentPromptPopup(
    header: string,
    message: string,
    inputs: AlertInput[],
    okButtonText = 'COMMON.GENERIC_ALERT.OK_BUTTON',
    onConfirmClicked: (result: Record<string, string>) => void | Promise<void>,
  ) {
    let buttons: AlertButton[] = [
      {
        text: this.translateService.instant(okButtonText),
        handler: (result) => onConfirmClicked(result),
      },
      {
        role: 'cancel',
        text: this.translateService.instant('COMMON.GENERIC_ALERT.CANCEL_BUTTON'),
      },
    ];
    return this.presentGenericPopup(header, message, inputs, buttons);
  }

  private async presentGenericPopup(
    header = 'COMMON.GENERIC_ALERT.WARNING_HEADER',
    message = 'COMMON.GENERIC_ALERT.MESSAGE',
    inputs: AlertInput[] = [],
    buttons?: AlertButton[],
  ): Promise<void> {
    return this.alertController
      .create({
        header: this.translateService.instant(header),
        message: this.translateService.instant(message),
        inputs,
        buttons,
      })
      .then((alert) => alert.present());
  }
}
