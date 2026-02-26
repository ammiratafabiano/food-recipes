import { computed, Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private readonly activeRequests = signal(0);
  readonly isLoading = computed(() => this.activeRequests() > 0);

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
    this.activeRequests.update((n) => n + 1);
  }

  stop() {
    this.activeRequests.update((n) => Math.max(0, n - 1));
  }
}
