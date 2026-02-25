export type NavigationQueryParams = Record<string, string | number | boolean | null | undefined>;

export interface NavigationData {
  params?: unknown;
  queryParams?: NavigationQueryParams;
  animationDirection?: 'back' | 'forward';
  presentCallback?: () => void;
  dismissCallback?(params?: unknown): void | Promise<void>;
}
