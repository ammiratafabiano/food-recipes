import { inject, Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { LoggingService } from './logging.service';
import { NavigationData } from '../models/navigation-data.model';
import { NavigationStackElement } from '../models/navigation-stack-element.model';
import { createNavigationData, createNavigationStackElement } from '../utils/model-factories';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private readonly router = inject(Router);
  private readonly logService = inject(LoggingService);
  private readonly navController = inject(NavController);

  private stack: NavigationStackElement[] = [];

  public get currentUrl(): string {
    let url = this.router.parseUrl(this.router.url).toString();
    url = url.split('?')[0];
    return url;
  }

  constructor() {}

  /**
   * @description Push a new component onto the current navigation stack. Pass additional information along as an object.
   * This additional information is accessible through NavParams.
   * @param path The relative url page.
   * @param navigationData The navigation data (optional)
   * @returns void
   */
  push(path: string, navigationData?: NavigationData): Promise<void> {
    this.logService.Info('NavigationService', 'push', 'page=' + JSON.stringify(path));
    const from = this.currentUrl.split('/');
    let to = [...from];
    const pathParts = path.split('/');
    for (const part of pathParts) {
      if (part === '..') {
        to.pop();
      } else if (part !== '.' && part !== '') {
        to.push(part);
      }
    }
    if (navigationData) {
      let navigationStackElement = createNavigationStackElement({
        to: to.join('/'),
        from: from.join('/'),
        data: navigationData,
      });
      this.stack.push(navigationStackElement);
    }
    return this.navController
      .navigateForward(to, { queryParams: navigationData?.queryParams })
      .then((success) => {
        if (success) {
          navigationData?.presentCallback && navigationData.presentCallback();
        }
        this.logService.Info(
          'NavigationService',
          'stack',
          'values=' + JSON.stringify(this.stack.map((x) => x.to)),
        );
      });
  }

  /**
   * @description Call to navigate back from a current component.
   * @param params The params from previous page (optional)
   * @returns void
   */
  pop(params?: unknown): Promise<void> {
    this.logService.Info('NavigationService', 'pop', '');
    const from = this.currentUrl.split('/');
    const to = from.slice(0, from.length - 1);
    const toRemoveIndex = this.stack.findIndex((x) => x.from == to.join('/'));
    let navigationData: NavigationData | undefined;
    if (toRemoveIndex > -1) {
      const removedList = this.stack.splice(toRemoveIndex);
      navigationData = removedList && removedList[0] ? removedList[0].data : undefined;
    }
    return this.navController.navigateBack(to).then(() => {
      navigationData?.dismissCallback && navigationData.dismissCallback(params);
      this.logService.Info(
        'NavigationService',
        'stack',
        'values=' + JSON.stringify(this.stack.map((x) => x.to)),
      );
    });
  }

  /**
   * @description Set the root for the current navigation stack.
   * @param path The page url.
   * @param navigationData The navigation data (optional)
   * @returns void
   */
  setRoot(path: string | string[], navigationData?: NavigationData): Promise<void> {
    this.logService.Info('NavigationService', 'setRoot', 'page=' + JSON.stringify(path));
    const from = this.currentUrl.split('/');
    const to = Array.isArray(path) ? path : [path];
    const options = {
      replaceUrl: true,
      queryParams: navigationData?.queryParams,
    };
    if (navigationData) {
      let navigationStackElement = createNavigationStackElement({
        to: to.join('/'),
        from: from.join('/'),
        data: navigationData,
      });
      this.stack = [navigationStackElement];
    } else {
      this.stack = [];
    }
    const successCallback = (success: boolean) => {
      if (success) {
        navigationData?.presentCallback && navigationData.presentCallback();
      }
      this.logService.Info(
        'NavigationService',
        'stack',
        'values=' + JSON.stringify(this.stack.map((x) => x.to)),
      );
    };
    if (navigationData?.animationDirection == 'forward') {
      return this.navController.navigateForward(to, options).then(successCallback);
    } else if (navigationData?.animationDirection == 'back') {
      return this.navController.navigateBack(to, options).then(successCallback);
    } else {
      return this.navController.navigateRoot(to, options).then(successCallback);
    }
  }

  /**
   * @description Gets the params passed by the caller page.
   * @returns T
   */
  getParams<T>(): T | undefined {
    const currentPage = this.getCurrentPage();
    this.logService.Info('NavigationService', 'getParams', '');
    return currentPage?.data?.params as T;
  }

  /**
   * @description Call to navigate to the previous page from a current component.
   * @param params The params from previous page (optional)
   * @returns void
   */
  goToPreviousPage(params?: unknown) {
    this.logService.Info('NavigationService', 'goToPreviousPage', '');
    if (this.stack.length > 0) {
      const lastStackElement = this.stack.pop();
      if (!lastStackElement) return;

      const toPath = lastStackElement.from;
      const navigationData = this.stack.find((x) => x.to === toPath)?.data;

      if (navigationData && params) {
        navigationData.params = params;
        navigationData.animationDirection = 'back';
      }

      this.navController
        .navigateBack(toPath, {
          replaceUrl: true,
          queryParams: navigationData?.queryParams,
        })
        .then(() => {
          lastStackElement.data?.dismissCallback?.(params);
          this.logService.Info(
            'NavigationService',
            'stack',
            'values=' + JSON.stringify(this.stack.map((x) => x.to)),
          );
        });
    } else {
      this.navController.navigateBack(['/']);
    }
  }

  /**
   * @description Gets the current page navigation data.
   * @returns NavigationData
   */
  private getCurrentPage(): NavigationStackElement {
    return this.stack[this.stack.length - 1];
  }
}
