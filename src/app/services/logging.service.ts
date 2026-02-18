import { Injectable } from '@angular/core';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class LoggingService {
  private get enabled(): boolean {
    return !environment.production;
  }

  Fatal(loggingClass: string, loggingMethod: string, message: string) {
    if (this.enabled)
      console.error(`[FATAL] ${loggingClass}.${loggingMethod}: ${message}`);
  }

  Error(loggingClass: string, loggingMethod: string, message: string) {
    if (this.enabled)
      console.error(`[ERROR] ${loggingClass}.${loggingMethod}: ${message}`);
  }

  Warning(loggingClass: string, loggingMethod: string, message: string) {
    if (this.enabled)
      console.warn(`[WARN] ${loggingClass}.${loggingMethod}: ${message}`);
  }

  Log(loggingClass: string, loggingMethod: string, message: string) {
    if (this.enabled)
      console.log(`[LOG] ${loggingClass}.${loggingMethod}: ${message}`);
  }

  Info(loggingClass: string, loggingMethod: string, message: string) {
    if (this.enabled)
      console.info(`[INFO] ${loggingClass}.${loggingMethod}: ${message}`);
  }

  Debug(loggingClass: string, loggingMethod: string, message: string) {
    if (this.enabled)
      console.debug(`[DEBUG] ${loggingClass}.${loggingMethod}: ${message}`);
  }

  Trace(loggingClass: string, loggingMethod: string, message: string) {
    if (this.enabled)
      console.trace(`[TRACE] ${loggingClass}.${loggingMethod}: ${message}`);
  }
}
