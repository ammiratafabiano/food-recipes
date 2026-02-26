import { Recipe } from './recipe.model';

export interface UserData {
  id: string;
  name: string;
  email: string;
  avatar_url?: string;
  isFollowed?: boolean;
  recipes?: Recipe[];
  stats?: UserStats;
}

export interface UserStats {
  saved?: number;
  followers?: number;
  followed?: number;
}
