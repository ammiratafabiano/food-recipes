import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { DeleteUserPage } from './delete-user.page';
import { AuthService } from 'src/app/services/auth.service';
import { NavController } from '@ionic/angular';
import { DataService } from 'src/app/services/data.service';
import { AlertController } from '@ionic/angular';
import { SessionService } from 'src/app/services/session.service';

describe('DeleteUserPage', () => {
  let component: DeleteUserPage;
  let fixture: ComponentFixture<DeleteUserPage>;
  let authServiceSpy: jasmine.SpyObj<AuthService>;
  let navCtrlSpy: jasmine.SpyObj<NavController>;
  let dataServiceSpy: jasmine.SpyObj<DataService>;
  let alertControllerSpy: jasmine.SpyObj<AlertController>;
  let sessionServiceSpy: jasmine.SpyObj<SessionService>;

  beforeEach(waitForAsync(() => {
    authServiceSpy = jasmine.createSpyObj('AuthService', ['resetUser']);
    navCtrlSpy = jasmine.createSpyObj('NavController', ['navigateBack']);
    dataServiceSpy = jasmine.createSpyObj('DataService', ['deleteUser']);
    alertControllerSpy = jasmine.createSpyObj('AlertController', ['create']);
    sessionServiceSpy = jasmine.createSpyObj('SessionService', ['loginRedirect']);

    TestBed.configureTestingModule({
      declarations: [ DeleteUserPage ],
      imports: [IonicModule.forRoot()],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: NavController, useValue: navCtrlSpy },
        { provide: DataService, useValue: dataServiceSpy },
        { provide: AlertController, useValue: alertControllerSpy },
        { provide: SessionService, useValue: sessionServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DeleteUserPage);
    component = fixture.componentInstance;
  }));

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reset login redirect on ionViewDidEnter', () => {
    component.ionViewDidEnter();
    expect(component.sessionService.loginRedirect).toBeUndefined();
  });

  it('should delete user on confirmation and navigate back to login page', async () => {
    const deleteReturn = {
      error: null,
      data: null,
      count: 0,
      status: 0,
      statusText: ""
    }
    const deleteSpy = dataServiceSpy.deleteUser.and.returnValue(Promise.resolve(deleteReturn));
    const resetUserSpy = authServiceSpy.resetUser.and.returnValue();
    const navigateBackSpy = navCtrlSpy.navigateBack.and.returnValue(Promise.resolve(true));
    const alertReturn = new HTMLIonAlertElement();
    //alertReturn.role = 'ok';
    const alertSpy = alertControllerSpy.create.and.returnValue(Promise.resolve(alertReturn));

    await component.onDeleteClicked();

    expect(deleteSpy).toHaveBeenCalled();
    expect(resetUserSpy).toHaveBeenCalled();
    expect(navigateBackSpy).toHaveBeenCalledWith('/login');
    expect(alertSpy).toHaveBeenCalledWith({
      header: 'Attenzione',
      message: 'Vuoi davvero cancellare il tuo account?',
      buttons: [
        {
          text: 'Cancel'
        },
        {
          text: 'Ok',
          role: 'ok'
        }
      ],
    });
  });
});
