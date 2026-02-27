import { Injectable, inject } from '@angular/core';
import { LoadingController } from '@ionic/angular/standalone';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly loadingCtrl = inject(LoadingController);
  private activeRequests = 0;
  private loadingElement: HTMLIonLoadingElement | null = null;
  private isCreating = false;

  async withLoader<T>(task: () => Promise<T>): Promise<T> {
    await this.start();
    let result: Promise<T>;
    try {
      result = task();
    } catch (error) {
      await this.stop();
      return Promise.reject(error);
    }
    return result.finally(() => this.stop());
  }

  async start() {
    this.activeRequests++;
    if (this.activeRequests === 1 && !this.isCreating) {
      this.isCreating = true;
      this.loadingElement = await this.loadingCtrl.create({
        spinner: 'crescent',
      });
      await this.loadingElement.present();
      this.isCreating = false;

      // Se nel frattempo le richieste sono scese a 0, chiudiamo subito
      if (this.activeRequests <= 0) {
        await this.loadingElement.dismiss();
        this.loadingElement = null;
      }
    }
  }

  async stop() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
    if (this.activeRequests === 0 && this.loadingElement && !this.isCreating) {
      await this.loadingElement.dismiss();
      this.loadingElement = null;
    }
  }
}
