import { inject, Injectable, signal } from '@angular/core';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
} from '@angular/router';
import { NavController } from '@ionic/angular';
import { LoggingService } from './logging.service';
import { NavigationData } from '../models/navigation-data.model';
import { NavigationStackElement } from '../models/navigation-stack-element.model';
import { createNavigationStackElement } from '../utils/model-factories';

@Injectable({
  providedIn: 'root',
})
export class NavigationService {
  private readonly router = inject(Router);
  private readonly logService = inject(LoggingService);
  private readonly navController = inject(NavController);

  private stack: NavigationStackElement[] = [];

  readonly swipeBackEnabled = signal<boolean>(true);
  private transitionTimer: ReturnType<typeof setTimeout> | null = null;

  public get currentUrl(): string {
    let url = this.router.parseUrl(this.router.url).toString();
    url = url.split('?')[0];
    return url;
  }

  /** Returns true when there is at least one entry in the navigation stack. */
  get hasStack(): boolean {
    return this.stack.length > 0;
  }

  constructor() {
    this.router.events.subscribe((event) => {
      if (event instanceof NavigationStart) {
        // Guard swipe-back gesture during navigation transition
        this.setSwipeBackActive(false);
        this.swipeBackEnabled.set(false);
        if (this.transitionTimer) clearTimeout(this.transitionTimer);

        // Keep stack in sync if user navigated back via browser/gesture (popstate)
        if (event.navigationTrigger === 'popstate' && this.stack.length > 0) {
          const top = this.stack[this.stack.length - 1];
          if (top && this.currentUrl === top.to) {
            this.stack.pop();
          }
        }
      } else if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      ) {
        // Re-enable swipe-back safely after page transition completes
        if (this.transitionTimer) clearTimeout(this.transitionTimer);
        this.transitionTimer = setTimeout(() => {
          this.setSwipeBackActive(true);
          this.swipeBackEnabled.set(true);
        }, 320);
      }
    });
  }

  private setSwipeBackActive(enabled: boolean) {
    const outlet = document.querySelector('ion-router-outlet') as any;
    if (outlet?.swipeHandler) {
      if (!outlet._origCanStart) {
        outlet._origCanStart = outlet.swipeHandler.canStart;
      }
      outlet.swipeHandler.canStart = () => enabled && outlet._origCanStart();
    }
  }

  /**
   * @description Push a new component onto the current navigation stack.
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
      const navigationStackElement = createNavigationStackElement({
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
   */
  pop(params?: unknown): Promise<void> {
    this.logService.Info('NavigationService', 'pop', '');
    const from = this.currentUrl.split('/');
    let toSegments = from.slice(0, from.length - 1);
    let navigationData: NavigationData | undefined;

    const toRemoveIndex = this.stack.findIndex((x) => x.to === this.currentUrl.split('?')[0]);
    if (toRemoveIndex > -1) {
      const removedList = this.stack.splice(toRemoveIndex);
      navigationData = removedList && removedList[0] ? removedList[0].data : undefined;
      const targetRoute = removedList[0].from;
      toSegments = targetRoute ? targetRoute.split('/') : toSegments;
    }

    return this.navController
      .navigateBack(['/', ...toSegments.filter((s) => s !== '')])
      .then(() => {
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
      const navigationStackElement = createNavigationStackElement({
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

    if (navigationData?.animationDirection === 'forward') {
      return this.navController.navigateForward(to, options).then(successCallback);
    } else if (navigationData?.animationDirection === 'back') {
      return this.navController.navigateBack(to, options).then(successCallback);
    } else {
      return this.navController.navigateRoot(to, options).then(successCallback);
    }
  }

  /**
   * @description Gets the params passed by the caller page.
   */
  getParams<T>(): T | undefined {
    const currentPage = this.getCurrentPage();
    this.logService.Info('NavigationService', 'getParams', '');
    return currentPage?.data?.params as T;
  }

  /**
   * @description Call to navigate to the previous page from a current component.
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

      const toSegments = toPath.split('/').filter((s) => s !== '');
      this.navController
        .navigateBack(['/', ...toSegments], {
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
   */
  private getCurrentPage(): NavigationStackElement {
    return this.stack[this.stack.length - 1];
  }

  /**
   * @description Clears the navigation stack. Call when switching tabs.
   */
  clearStack() {
    this.stack = [];
  }
}
