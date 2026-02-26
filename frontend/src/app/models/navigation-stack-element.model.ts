import { NavigationData } from './navigation-data.model';

export interface NavigationStackElement {
  from: string;
  to: string;
  data?: NavigationData;
}
