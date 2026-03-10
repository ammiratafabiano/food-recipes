import { Injectable, inject } from '@angular/core';
import { LoadingController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly loadingCtrl = inject(LoadingController);
  private activeRequests = 0;
  private loadingElement: HTMLIonLoadingElement | null = null;

  /**
   * Promise chain that serializes all create/dismiss operations
   * so that they never overlap and cause stale references.
   */
  private opChain: Promise<void> = Promise.resolve();

  async withLoader<T>(task: () => Promise<T>): Promise<T> {
    this.start();
    let result: Promise<T>;
    try {
      result = task();
    } catch (error) {
      this.stop();
      return Promise.reject(error);
    }
    return result.finally(() => this.stop());
  }

  start(): void {
    this.activeRequests++;
    if (this.activeRequests === 1) {
      this.opChain = this.opChain.then(() => this.showIfNeeded());
    }
  }

  stop(): void {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0) {
      this.opChain = this.opChain.then(() => this.hideIfNeeded());
    }
  }

  private async showIfNeeded(): Promise<void> {
    // Double-check: another stop() may have fired before this runs
    if (this.activeRequests <= 0 || this.loadingElement) return;
    try {
      const el = await this.loadingCtrl.create({ spinner: 'crescent' });
      // Re-check after async gap
      if (this.activeRequests <= 0) {
        el.dismiss().catch(() => {});
        return;
      }
      this.loadingElement = el;
      await el.present();
      requestAnimationFrame(() => this.setThemeColorForLoader(true));
    } catch {
      // Ionic loading creation failed — nothing to do
    }
  }

  private async hideIfNeeded(): Promise<void> {
    // Double-check: another start() may have fired before this runs
    if (this.activeRequests > 0) return;
    const el = this.loadingElement;
    if (!el) return;
    this.loadingElement = null;
    this.setThemeColorForLoader(false);
    try {
      await el.dismiss();
    } catch {
      // Already dismissed or not attached — ignore
    }
  }

  /**
   * Updates the meta theme-color tag to match the loader backdrop on iOS.
   * When the Ionic loading overlay is visible, the backdrop darkens the page
   * but the status bar / notch area still shows the original theme color.
   * This syncs the theme-color to the darkened value while the loader is active.
   */
  private setThemeColorForLoader(loaderVisible: boolean): void {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
    if (!meta) return;

    if (loaderVisible) {
      if (!meta.dataset['originalContent']) {
        meta.dataset['originalContent'] = meta.content;
      }
      // Ionic loading backdrop is black at ~32% opacity.
      // Blend: original * (1 - 0.32) ≈ original * 0.68
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      meta.content = isDark ? '#090909' : '#a8a8a8';
    } else {
      if (meta.dataset['originalContent']) {
        meta.content = meta.dataset['originalContent'];
        delete meta.dataset['originalContent'];
      }
    }
  }
}
