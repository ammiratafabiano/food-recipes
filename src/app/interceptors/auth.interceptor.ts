import { HttpEvent, HttpHandlerFn, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, switchMap, take } from 'rxjs/operators';
import { SessionService } from '../services/session.service';
import { AuthService } from '../services/auth.service';
import { environment } from '../../environments/environment';
import { HttpClient } from '@angular/common/http';

let isRefreshing = false;
const refreshTokenSubject = new BehaviorSubject<string | null>(null);

export const authInterceptor = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
): Observable<HttpEvent<unknown>> => {
  const sessionService = inject(SessionService);
  const authService = inject(AuthService);
  const http = inject(HttpClient);
  const token = sessionService.token();

  let authReq = req;
  if (token) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 || error.status === 403) {
        // Don't try to refresh if the request was already a refresh request
        if (req.url.includes('/auth/refresh')) {
          authService.resetUser();
          return throwError(() => error);
        }

        if (!isRefreshing) {
          isRefreshing = true;
          refreshTokenSubject.next(null);

          const refreshToken = sessionService.refreshToken();
          if (refreshToken) {
            return http
              .post<{
                token: string;
                refreshToken: string;
              }>(`${environment.apiUrl}/auth/refresh`, { refreshToken })
              .pipe(
                switchMap((res) => {
                  isRefreshing = false;
                  sessionService.setToken(res.token);
                  sessionService.setRefreshToken(res.refreshToken);
                  refreshTokenSubject.next(res.token);

                  return next(
                    req.clone({
                      setHeaders: {
                        Authorization: `Bearer ${res.token}`,
                      },
                    }),
                  );
                }),
                catchError((err) => {
                  isRefreshing = false;
                  authService.resetUser();
                  return throwError(() => err);
                }),
              );
          } else {
            isRefreshing = false;
            authService.resetUser();
            return throwError(() => error);
          }
        } else {
          return refreshTokenSubject.pipe(
            filter((token) => token !== null),
            take(1),
            switchMap((token) => {
              return next(
                req.clone({
                  setHeaders: {
                    Authorization: `Bearer ${token}`,
                  },
                }),
              );
            }),
          );
        }
      }
      return throwError(() => error);
    }),
  );
};
