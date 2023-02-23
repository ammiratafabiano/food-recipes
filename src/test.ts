import 'zone.js/testing';
import { getTestBed, TestBed } from '@angular/core/testing';
import {
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting
} from '@angular/platform-browser-dynamic/testing';
import { TranslateModule } from '@ngx-translate/core'; // Importa il modulo TranslateModule qui

// First, initialize the Angular testing environment.
getTestBed().initTestEnvironment(
  BrowserDynamicTestingModule,
  platformBrowserDynamicTesting(),
);

// Aggiungi il modulo TranslateModule qui
TestBed.configureTestingModule({
  imports: [
    TranslateModule.forRoot(),
    // Altri moduli di cui hai bisogno per il test
    // ...
  ]
});
