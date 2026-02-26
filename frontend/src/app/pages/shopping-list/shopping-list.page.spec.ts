import { ComponentFixture, TestBed } from '@angular/core/testing';
import { IonicModule } from '@ionic/angular';
import { ShoppingList } from './shopping-list.page';

describe('ShoppingList', () => {
  let component: ShoppingList;
  let fixture: ComponentFixture<ShoppingList>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ShoppingList],
      imports: [IonicModule.forRoot()],
    }).compileComponents();

    fixture = TestBed.createComponent(ShoppingList);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
