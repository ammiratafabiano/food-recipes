import { inject, Injectable } from '@angular/core';
import { NGXLogger } from 'ngx-logger';

@Injectable({
  providedIn: 'root',
})
export class LoggingService {
  private readonly logger = inject(NGXLogger);

  constructor() {}

  Fatal(loggingClass: string, loggingMethod: string, message: string) {
    this.logger.fatal(loggingClass, loggingMethod, message);
  }

  Error(loggingClass: string, loggingMethod: string, message: string) {
    this.logger.error(loggingClass, loggingMethod, message);
  }

  Warning(loggingClass: string, loggingMethod: string, message: string) {
    this.logger.warn(loggingClass, loggingMethod, message);
  }

  Log(loggingClass: string, loggingMethod: string, message: string) {
    this.logger.log(loggingClass, loggingMethod, message);
  }

  Info(loggingClass: string, loggingMethod: string, message: string) {
    this.logger.info(loggingClass, loggingMethod, message);
  }

  Debug(loggingClass: string, loggingMethod: string, message: string) {
    this.logger.debug(loggingClass, loggingMethod, message);
  }

  Trace(loggingClass: string, loggingMethod: string, message: string) {
    this.logger.trace(loggingClass, loggingMethod, message);
  }
}
