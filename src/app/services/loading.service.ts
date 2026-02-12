import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private activeRequests = 0;
  readonly isLoading = signal(false);

  withLoader<T>(task: () => Promise<T>): Promise<T> {
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

  start() {
    this.activeRequests++;
    if (this.activeRequests === 1) {
      this.isLoading.set(true);
    }
  }

  stop() {
    if (this.activeRequests === 0) return;
    this.activeRequests--;
    if (this.activeRequests === 0) {
      this.isLoading.set(false);
    }
  }
}
