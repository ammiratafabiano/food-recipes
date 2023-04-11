import { Recipe } from "./recipe.model";

export class UserData {
    id!: string;
    name!: string;
    email!: string;
    avatar_url?: string;
    followed?: boolean;
    recipes?: Recipe[];
}