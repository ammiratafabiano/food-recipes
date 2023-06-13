import { Injectable } from '@angular/core';
import { createClient, RealtimeChannel, SupabaseClient, User } from '@supabase/supabase-js';
import { PlannedRecipe, Planning } from '../models/planning.model';
import { Recipe } from '../models/recipe.model';
import { environment } from '../../environments/environment'
import { AuthService } from './auth.service';
import { Ingredient } from '../models/ingredient.model';
import { RecipeType } from '../models/recipe-type.enum';
import { Meal } from '../models/meal.model';
import { WeekDay } from '../models/weekDay.enum';
import { Step } from '../models/step.model';
import { Observable, of, Subject } from 'rxjs';
import { UserData, UserStats } from '../models/user-data.model';
import { Group } from '../models/group.model';
import {v4 as uuidv4} from 'uuid';

const USERS = 'users'
const USER_STATS = 'user_stats'
const RECIPES = 'recipes'
const SAVED_RECIPES = 'saved_recipes'
const INGREDIENTS = 'ingredients'
const FOODS = 'foods'
const PLANNINGS = 'plannings'
const FOLLOWERS = 'followers'
const SAVED = 'saved'
const NAMED_INGREDIENTS = 'named_ingredients'
const SHOPPING_LIST = 'shopping_list'
const GROUPS = 'groups'

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private supabase: SupabaseClient
  private realtimeChannel?: RealtimeChannel;

  recipes: Recipe[] = [];
  planning: Planning[] = [];

  constructor(
    private authService: AuthService
  ) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  async getUsers() {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.supabase
      .from(USERS)
      .select('id, email, nickname, full_name, avatar_url')
      .neq('id', user.id)
      .then(result => {
        return result.data?.map(userResult=> {
          let user = new UserData();
          user.id = userResult.id;
          user.email = userResult.email;
          user.name = userResult.nickname || userResult.full_name;
          user.avatar_url = userResult.avatar_url;
          return user;
        });
      });
  }

  async getUser(user_id: string): Promise<UserData | undefined> {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.supabase
      .from(USERS)
      .select('id, email, nickname, full_name, avatar_url')
      .eq('id', user_id)
      .then(x => {
        const userResult = x?.data && x?.data[0];
        if (userResult) {
          return this.supabase
            .from(FOLLOWERS)
            .select()
            .match({'followed': user_id, 'follower': user.id})
            .then(x => {
              const followerResult = x?.data && x?.data[0];
              let user = new UserData();
              user.id = userResult.id;
              user.email = userResult.email;
              user.name = userResult.nickname || userResult.full_name;
              user.avatar_url = userResult.avatar_url;
              user.isFollowed = !!followerResult;
              return user;
            })
        } else {
          return;
        }
      })
  }

  async deleteUser() {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.supabase
      .from(USERS)
      .delete()
      .eq('id', user?.id)
  }

  async getUserStats(): Promise<UserStats | undefined>{
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.supabase
      .from(USER_STATS)
      .select('saved, followers, followed')
      .eq('id', user.id)
      .then(x => {
        const statsResult = x?.data && x?.data[0];
        if (statsResult) {
          return {
            saved: statsResult.saved,
            followers: statsResult.followers,
            followed: statsResult.followed
          }
        } else {
          return
        }
      });
  }

  async addFollower(user_id: string) {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    const element = {
      follower: user.id,
      followed: user_id
    }
    return this.supabase
      .from(FOLLOWERS)
      .insert(element)
  }

  async deleteFollower(user_id: string) {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.supabase
      .from(FOLLOWERS)
      .delete()
      .match({'followed': user_id, 'follower': user.id})
  }

  async saveRecipe(recipe_id: string) {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    const element = {
      recipe_id,
      user_id: user.id
    }
    return this.supabase
      .from(SAVED)
      .insert(element)
  }

  async unsaveRecipe(recipe_id: string) {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.supabase
      .from(SAVED)
      .delete()
      .match({'recipe_id': recipe_id, 'user_id': user.id})
  }

  async addRecipe(recipe: Recipe) {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    await this.uploadStepImages(user.id, recipe.steps);
    const element = {
      user_id: user.id,
      user_name: user.name,
      name: recipe.name,
      description: recipe.description,
      cuisine: recipe.cuisine,
      type: recipe.type,
      difficulty: recipe.difficulty,
      time_quantity: recipe.time.value,
      time_unit: recipe.time.unit,
      steps: recipe.steps,
      tags: recipe.tags,
      variant_id: recipe.variantId,
      variant_name: recipe.variantName
    }
    return this.supabase
      .from(RECIPES)
      .insert(element).select('*').then((returning) => {
        if (returning.data && returning.data.length == 1 && returning.data[0].id) {
          const ingredients = recipe.ingredients.map(x => {
            return {
              food_id: x.id,
              recipe_id: returning.data[0].id,
              quantity_value: x.quantity.value,
              quantity_unit: x.quantity.unit
            }
          });
          return this.supabase
            .from(INGREDIENTS)
            .insert(ingredients);
        } else {
          return
        }
      });
  }

  async getRecipe(recipe_id: string): Promise<Recipe | undefined> {
    return this.supabase
      .from(RECIPES)
      .select()
      .eq('id', recipe_id)
      .then(x => {
        const recipeResult = x?.data && x?.data[0];
        if (recipeResult) {
          return this.supabase.from(NAMED_INGREDIENTS)
            .select('food_id, food_name, quantity_value, quantity_unit')
            .match({ recipe_id: recipe_id })
            .then((ingredientsResult) => {
              return this.supabase
              .from(SAVED)
              .select()
              .match({'recipe_id': recipe_id})
              .then(x => {
                const savedResult = x?.data && x?.data[0];
                let recipe = new Recipe();
                recipe.id = recipeResult.id;
                recipe.userId = recipeResult.user_id;
                recipe.userName = recipeResult.user_name;
                recipe.name = recipeResult.name;
                recipe.description = recipeResult.description;
                recipe.cuisine = recipeResult.cuisine;
                recipe.type = recipeResult.type || RecipeType.Other;
                recipe.difficulty = recipeResult.difficulty;
                recipe.time.value = recipeResult.time_quantity;
                recipe.time.unit = recipeResult.time_unit;
                recipe.ingredients = ingredientsResult.data?.map(y => {
                  let ingredient = new Ingredient();
                  ingredient.id = y.food_id;
                  ingredient.name = y.food_name;
                  ingredient.quantity.value = y.quantity_value;
                  ingredient.quantity.unit = y.quantity_unit;
                  return ingredient;
                }) || [];
                recipe.steps = recipeResult.steps;
                recipe.tags = recipeResult.tags;
                recipe.servings = recipeResult.servings;
                recipe.variantId = recipeResult.variant_id;
                recipe.variantName = recipeResult.variant_name
                recipe.isAdded = !!savedResult;
                return recipe;
            });
          });
        } else {
          return
        }
      })
  }

  async editRecipe(recipe: Recipe, stepsOfImagesToDelete: Step[]) {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    await this.uploadStepImages(user.id, recipe.steps);
    const element = {
      user_id: user.id,
      user_name: user.name,
      name: recipe.name,
      description: recipe.description,
      cuisine: recipe.cuisine,
      type: recipe.type,
      difficulty: recipe.difficulty,
      time_quantity: recipe.time.value,
      time_unit: recipe.time.unit,
      steps: recipe.steps,
      tags: recipe.tags,
      servings: recipe.servings,
      variant: recipe.variantId
    }
    return this.supabase
      .from(RECIPES)
      .update(element).match({ id: recipe.id }).then(() => {
        return this.supabase
          .from(INGREDIENTS)
          .delete()
          .eq('recipe_id', recipe.id).then(() => {
            const ingredients = recipe.ingredients.map(x => {
              return {
                food_id: x.id,
                recipe_id: recipe.id,
                quantity_value: x.quantity.value,
                quantity_unit: x.quantity.unit
              }
            });
            return this.supabase
              .from(INGREDIENTS)
              .insert(ingredients).then(() => {
                return this.deleteStepImages(stepsOfImagesToDelete);
              });
          });
      });
  }

  private async uploadStepImages(user_id: string, steps: Step[]) {
    for (let current of steps) {
      if (current.imageUrl && current.imageToUpload) {
        const fileName = this.getRandomFileName();
        await this.supabase
          .storage
          .from('steps')
          .upload(user_id + "/" + fileName, this.dataURLtoFile(current.imageUrl, fileName), {
            cacheControl: '3600',
            upsert: true
          }).then((returning) => {
            current.imageToUpload = false;
            current.imageUrl = environment.supabaseUrl + environment.imagesPathUrl + "/" + returning.data?.path;
          });
      }
    }
  }

  async deleteRecipe(recipe: Recipe) {
    return this.supabase
      .from(RECIPES)
      .delete()
      .eq('id', recipe.id).then(() => {
        return this.deleteStepImages(recipe.steps);
      })
  }

  private async deleteStepImages(steps: Step[]) {
    if (steps.length == 0) return;
    const filesToRemove: string[] = [];
        steps.forEach(x => {
          const file = x.imageUrl?.split("steps/")[1];
          file && filesToRemove.push(file);
        })
        return this.supabase
          .storage
          .from('steps')
          .remove(filesToRemove);
  }

  async getRecipeList(user_id?: string): Promise<Recipe[] | undefined> {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.supabase
      .from(RECIPES)
      .select('id, name, type')
      .match({ user_id: user_id || user.id })
      .then((result) => {
        return result.data?.map(x => {
          let recipe = new Recipe();
          recipe.id = x.id;
          recipe.name = x.name;
          recipe.type = x.type || RecipeType.Other;
          return recipe;
        })
      })    
  }

  async getSavedRecipeList(user_id?: string): Promise<Recipe[] | undefined> {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.supabase
      .from(SAVED_RECIPES)
      .select('id, user_id, name, type')
      .match({ saved_by: user_id || user.id })
      .then((result) => {
        return result.data?.map(x => {
          let recipe = new Recipe();
          recipe.userId = x.user_id;
          recipe.id = x.id;
          recipe.name = x.name;
          recipe.type = x.type || RecipeType.Other;
          return recipe;
        })
      })    
  }

  async getFoodList(): Promise<Ingredient[] | undefined> {
    return this.supabase
      .from(FOODS)
      .select('id, name, unit')
      .then((result) => {
        return result.data?.map(x => {
          let ingredient = new Ingredient();
          ingredient.id = x.id;
          ingredient.name = x.name;
          ingredient.quantity.unit = x.unit;
          return ingredient;
        });
      })
  }

  async getPlanning(week: string, group: Group | undefined): Promise<Planning | undefined> {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.supabase
    .from(PLANNINGS)
    .select('id, recipe_id, recipe_name, week, day, meal')
    .eq('week', week)
    .in('user_id', group ? group.users : [user.id])
    .then((result) => {
      let planning = new Planning();
      planning.startDate = week;
      planning.recipes = result.data?.map(x => {
        let plannedRecipe = new PlannedRecipe();
        plannedRecipe.id = x.id;
        plannedRecipe.week= x.week;
        plannedRecipe.day = x.day;
        plannedRecipe.meal = x.meal;
        let recipe = new Recipe();
        recipe.id = x.recipe_id;
        recipe.name = x.recipe_name;
        plannedRecipe.recipe = recipe;
        return plannedRecipe;
      }) || [];
      return planning;
    })  
  }

  async addToPlanning(recipe: Recipe, week: string, day?: WeekDay, meal?: Meal): Promise<any> {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.retrieveGroup().then((group) => {
      if (group) {
        const element = {
          user_id: user.id,
          recipe_id: recipe.id,
          recipe_name: recipe.name,
          week: week,
          day: day,
          meal: meal
        }
        return this.supabase
          .from(PLANNINGS)
          .insert(element);
      } else {
        return undefined;
      }
    })
  }

  async deletePlanning(planning_id: string) {
    return this.supabase
      .from(PLANNINGS)
      .delete()
      .eq('id', planning_id)
  }

  async editPlanning(planned_recipe: PlannedRecipe) {
    const element = {
      day: planned_recipe.day || null,
      meal: planned_recipe.meal || null
    }
    return this.supabase
      .from(PLANNINGS)
      .update(element).match({ id: planned_recipe.id });
  }

  async getShoppingList(week: string): Promise<Ingredient[] | undefined> {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.supabase
    .from(SHOPPING_LIST)
    .select('food_id, food_name, food_unit, food_total_quantity')
    .gte('planning_week', week)
    .match({ user_id: user.id })
    .then((result) => {
      return result.data?.map(x => {
        let ingredient = new Ingredient();
        ingredient.id = x.food_id;
        ingredient.name = x.food_name;
        ingredient.quantity.value = x.food_total_quantity;
        ingredient.quantity.unit = x.food_unit;
        return ingredient;
      });
    })  
  }

  async retrieveGroup(): Promise<Group | undefined> {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.supabase
      .from(GROUPS)
      .select('group_id')
      .match({ user_id: user.id })
      .then(x => {
        const groupResult = x?.data && x?.data[0];
        if (groupResult) {
          return this.supabase
            .from(GROUPS)
            .select('user_id')
            .match({ group_id: groupResult.group_id })
            .then(x => {
              let group = new Group();
              group.id = groupResult?.group_id;
              group.users = x.data?.map(x => x.user_id) || []
              return group;
            })
        } else {
          return
        }
      })  
  }

  async createGroup(): Promise<Group | undefined> {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    const element = {
      user_id: user.id,
      group_id: uuidv4()
    }
    return this.supabase
      .from(GROUPS)
      .insert(element)
      .then(() => {
        return this.retrieveGroup();
      });
  }

  async joinGroup(group_id: string): Promise<Group | undefined> {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    const element = {
      user_id: user.id,
      group_id: group_id
    }
    return this.supabase
      .from(GROUPS)
      .insert(element)
      .then(() => {
        return this.retrieveGroup();
      });
  }

  async leaveGroup(group_id: string): Promise<Group | undefined> {
    const user = this.authService.getCurrentUser();
    if (!user) return;
    return this.supabase
      .from(GROUPS)
      .delete()
      .match({'user_id': user.id, 'group_id': group_id})
      .then(() => {
        return this.retrieveGroup();
      })
  }

  private getRandomFileName() {
    var timestamp = new Date().toISOString().replace(/[-:.]/g,"");  
    var random = ("" + Math.random()).substring(2, 8); 
    var random_number = timestamp+random;  
    return random_number;
  }

  private dataURLtoFile(dataurl: string, filename: string) {
    var arr = dataurl.split(',');
    const math = arr[0].match(/:(.*?);/);
    var mime =  math ? math[1] : undefined;
    var bstr = atob(arr[1]);
    var n = bstr.length;
    var u8arr = new Uint8Array(n);
    while(n--){
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
  }

  async addCustomFood(name: string) {
    const element = {
      name,
      custom: true
    }
    return this.supabase
        .from(FOODS)
        .insert(element).select('*').then((returning) => {
          if (returning.data && returning.data.length == 1 && returning.data[0].id) {
            let food: Ingredient = {
              id: returning.data[0].id,
              name: returning.data[0].name,
              quantity: {unit: returning.data[0].unit}
            }
            return food;
          } else {
            return undefined;
          }
        });
  }

  subscribeToPlannings(group: Group): Observable<PlannedRecipe | undefined> {
    const user = this.authService.getCurrentUser();
    if (!user) return of();
    const changes = new Subject<PlannedRecipe>()
    this.realtimeChannel = this.supabase
      .channel('public:plannings')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'plannings' },
        async (payload) => {
          const user_id = (payload.new as PlannedRecipe).user_id;
          if (payload.new && user_id && group?.users.includes(user_id)) {
            changes.next(payload.new as PlannedRecipe);
          } else if (payload.old && (payload.old as PlannedRecipe).id) {
            changes.next(payload.old as PlannedRecipe);
          }
        }
      )
      .subscribe()
    return changes.asObservable();
  }

  unsubscribeToPlanning() {
    if (this.realtimeChannel) {
      this.supabase.removeChannel(this.realtimeChannel)
    }
  }
}
