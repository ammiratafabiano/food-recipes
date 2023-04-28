import { Recipe } from "./recipe.model";

export class UserData {
    id!: string;
    name!: string;
    email!: string;
    avatar_url?: string;
    isFollowed?: boolean;
    recipes?: Recipe[];
    stats?: UserStats;
}

export class UserStats {
    saved?: number;
    followers?: number;
    followed?: number;
}