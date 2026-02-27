import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { Observable } from 'rxjs';

export const languageInterceptor = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const translateService = inject(TranslateService);
  const lang = translateService.currentLang || translateService.defaultLang || 'en';

  const langReq = req.clone({
    setHeaders: {
      'Accept-Language': lang,
    },
  });

  return next(langReq);
};
