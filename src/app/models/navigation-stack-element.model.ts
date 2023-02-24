import { NavigationData } from "./navigation-data.model";

export class NavigationStackElement {
    from!: string;
    to!: string;
    data?: NavigationData;
}