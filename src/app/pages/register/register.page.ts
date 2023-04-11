import { Component } from '@angular/core'
import { Validators, FormBuilder } from '@angular/forms'
import { LoadingController } from '@ionic/angular'
import { AlertService } from 'src/app/services/alert.service'
import { AuthService } from 'src/app/services/auth.service'
import { NavigationService } from 'src/app/services/navigation.service'

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
})
export class RegisterPage {
  credentials = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  })

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private loadingController: LoadingController,
    private readonly alertService: AlertService,
    private readonly navigationService: NavigationService
  ) {}

  get email() {
    return this.credentials.controls.email
  }

  get password() {
    return this.credentials.controls.password
  }

  async onSubmitClicked() {
    const loading = await this.loadingController.create()
    await loading.present()

    this.authService.signUp(this.credentials.getRawValue()).then(async (data) => {
      await loading.dismiss()

      if (data.error) {
        this.alertService.presentAlertPopup(
          "COMMON.GENERIC_ALERT.ERROR_HEADER",
          data.error.message
        );
      } else {
        this.alertService.presentInfoPopup(
          "REGISTER_PAGE.SUBMIT_POPUP_SUCCESS_HEADER"
        );
      }
    })
  }
}
