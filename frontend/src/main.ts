import { bootstrapApplication } from '@angular/platform-browser';
import {
  PreloadAllModules,
  RouteReuseStrategy,
  provideRouter,
  withComponentInputBinding,
  withPreloading,
} from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideServiceWorker } from '@angular/service-worker';
import { importProvidersFrom, isDevMode, provideZonelessChangeDetection } from '@angular/core';
import { IonicRouteStrategy, provideIonicAngular } from '@ionic/angular/standalone';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';

import { addIcons } from 'ionicons';
import {
  add,
  addCircle,
  basket,
  bookmark,
  bookmarkOutline,
  calendar,
  chevronBackOutline,
  chevronForwardOutline,
  close,
  cog,
  create,
  earthOutline,
  homeOutline,
  keyOutline,
  library,
  logoFacebook,
  logoGoogle,
  nutrition,
  options,
  personOutline,
  pizza,
  podium,
  shareSocialOutline,
  timer,
} from 'ionicons/icons';

import { AppComponent } from './app/app.component';
import { routes } from './app/app.routes';
import { loadingInterceptor } from './app/interceptors/loading.interceptor';
import { authInterceptor } from './app/interceptors/auth.interceptor';
import { languageInterceptor } from './app/interceptors/language.interceptor';

addIcons({
  add,
  addCircle,
  basket,
  bookmark,
  bookmarkOutline,
  calendar,
  chevronBackOutline,
  chevronForwardOutline,
  close,
  cog,
  create,
  earthOutline,
  homeOutline,
  keyOutline,
  library,
  logoFacebook,
  logoGoogle,
  nutrition,
  options,
  personOutline,
  pizza,
  podium,
  shareSocialOutline,
  timer,
});

export function createTranslateLoader(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

bootstrapApplication(AppComponent, {
  providers: [
    provideZonelessChangeDetection(),
    provideIonicAngular(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    provideRouter(routes, withPreloading(PreloadAllModules), withComponentInputBinding()),
    provideHttpClient(withInterceptors([authInterceptor, languageInterceptor, loadingInterceptor])),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: createTranslateLoader,
          deps: [HttpClient],
        },
      }),
    ),
    provideServiceWorker('ngsw-worker.js', {
      enabled: !isDevMode(),
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
}).catch((err) => console.error(err));
