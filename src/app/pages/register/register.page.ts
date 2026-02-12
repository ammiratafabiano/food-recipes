import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Validators, FormBuilder } from '@angular/forms';
import { LoadingService } from 'src/app/services/loading.service';
import { AlertService } from 'src/app/services/alert.service';
import { AuthService } from 'src/app/services/auth.service';
import { NavigationService } from 'src/app/services/navigation.service';
import { AuthResponse } from 'src/app/services/auth.service';
import { UserData } from 'src/app/models/user-data.model';

@Component({
  selector: 'app-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RegisterPage {
  private readonly fb = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly loadingService = inject(LoadingService);
  private readonly alertService = inject(AlertService);
  private readonly navigationService = inject(NavigationService);

  credentials = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
  });

  constructor() {}

  get email() {
    return this.credentials.controls.email;
  }

  get password() {
    return this.credentials.controls.password;
  }

  async onSubmitClicked() {
    await this.loadingService.withLoader(async () => {
      const data = await this.authService.signUp(
        this.credentials.getRawValue(),
      );
      if (data.error) {
        this.alertService.presentAlertPopup(
          'COMMON.GENERIC_ALERT.ERROR_HEADER',
          data.error.message,
        );
      } else {
        this.alertService.presentInfoPopup(
          'REGISTER_PAGE.SUBMIT_POPUP_SUCCESS_HEADER',
        );
      }
    });
  }
}
