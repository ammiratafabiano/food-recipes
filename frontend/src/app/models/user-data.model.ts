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

export interface UserProfile {
  id: string;
  name: string;
  weight?: number;
  height?: number;
  age?: number;
  sex?: 'male' | 'female';
  activity_level?: 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
  planning_enabled?: boolean;
  social_enabled?: boolean;
}
