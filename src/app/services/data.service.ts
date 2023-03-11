import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PlannedRecipe, Planning } from '../models/planning.model';
import { Recipe } from '../models/recipe.model';
import { environment } from '../../environments/environment'
import { AuthService } from './auth.service';
import { Ingredient } from '../models/ingredient.model';
import { RecipeType } from '../models/recipe-type.enum';
import { Meal } from '../models/meal.model';
import { WeekDay } from '../models/weekDay.enum';

const USERS_TABLE = 'users'
const RECIPES_TABLE = 'recipes'
const INGREDIENTS_TABLE = 'ingredients'
const FOODS_TABLE = 'foods'
const PLANNINGS_TABLE = 'plannings'

const NAMED_INGREDIENTS_VIEW = 'named_ingredients'
const SHOPPING_LIST_VIEW = 'shopping_list'

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private supabase: SupabaseClient

  recipes: Recipe[] = [];
  planning: Planning[] = [];

  constructor(private authService: AuthService) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
  }

  async deleteUser() {
    const user_id = this.authService.getCurrentUserId();
    return this.supabase
      .from(USERS_TABLE)
      .delete()
      .eq('id', user_id)
  }

  async addRecipe(recipe: Recipe) {
    const user_id = this.authService.getCurrentUserId();
    const element = {
      user_id: user_id,
      name: recipe.name,
      description: recipe.description,
      cuisine: recipe.cuisine,
      type: recipe.type,
      difficulty: recipe.difficulty,
      time_quantity: recipe.time.value,
      time_unit: recipe.time.unit,
      steps: recipe.steps,
      tags: recipe.tags
    }
    return this.supabase
      .from(RECIPES_TABLE)
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
            .from(INGREDIENTS_TABLE)
            .insert(ingredients);
        } else {
          return
        }
      });
  }

  async getRecipe(recipe_id: number): Promise<Recipe | undefined> {
    return this.supabase
      .from(RECIPES_TABLE)
      .select()
      .eq('id', recipe_id)
      .then(x => {
        const recipeResult = x?.data && x?.data[0];
        if (recipeResult) {
          return this.supabase.from(NAMED_INGREDIENTS_VIEW)
            .select('food_id, food_name, quantity_value, quantity_unit')
            .match({ recipe_id: recipe_id })
            .then((ingredientsResult) => {
              let recipe = new Recipe();
              recipe.id = recipeResult.id;
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
              return recipe;
            });
        } else {
          return
        }
      })
  }

  async editRecipe(recipe: Recipe) {
    const user_id = this.authService.getCurrentUserId();
    const element = {
      user_id: user_id,
      name: recipe.name,
      description: recipe.description,
      cuisine: recipe.cuisine,
      type: recipe.type,
      difficulty: recipe.difficulty,
      time_quantity: recipe.time.value,
      time_unit: recipe.time.unit,
      steps: recipe.steps,
      tags: recipe.tags
    }
    return this.supabase
      .from(RECIPES_TABLE)
      .update(element).match({ id: recipe.id }).then(() => {
        return this.supabase
          .from(INGREDIENTS_TABLE)
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
              .from(INGREDIENTS_TABLE)
              .insert(ingredients);
          });
      });
  }

  async deleteRecipe(recipe_id: string) {
    return this.supabase
      .from(RECIPES_TABLE)
      .delete()
      .eq('id', recipe_id)
  }

  async getRecipeList(): Promise<Recipe[] | undefined> {
    return this.supabase
      .from(RECIPES_TABLE)
      .select('id, name, type')
      .match({ user_id: this.authService.getCurrentUserId() })
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

  async getFoodList(): Promise<Ingredient[] | undefined> {
    return this.supabase
      .from(FOODS_TABLE)
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

  async getPlanning(week: string): Promise<Planning | undefined> {
    return this.supabase
    .from(PLANNINGS_TABLE)
    .select('id, recipe_id, recipe_name, week, day, meal')
    .eq('week', week)
    .match({ user_id: this.authService.getCurrentUserId() })
    .then((result) => {
      let planning = new Planning();
      planning.startDate = week;
      planning.recipes = result.data?.map(x => {
        let plannedRecipe = new PlannedRecipe();
        plannedRecipe.id = x.id;
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

  async addToPlanning(recipe: Recipe, week: string, day?: WeekDay, meal?: Meal) {
    const user_id = this.authService.getCurrentUserId();
    const element = {
      user_id: user_id,
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      week: week,
      day: day,
      meal: meal
    }
    return this.supabase
        .from(PLANNINGS_TABLE)
        .insert(element);
  }

  async deletePlanning(planning_id: string) {
    return this.supabase
      .from(PLANNINGS_TABLE)
      .delete()
      .eq('id', planning_id)
  }

  async editPlanning(planned_recipe: PlannedRecipe) {
    const element = {
      day: planned_recipe.day || null,
      meal: planned_recipe.meal || null
    }
    return this.supabase
      .from(PLANNINGS_TABLE)
      .update(element).match({ id: planned_recipe.id });
  }

  async getShoppingList(week: string): Promise<Ingredient[] | undefined> {
    return this.supabase
    .from(SHOPPING_LIST_VIEW)
    .select('food_id, food_name, food_unit, food_total_quantity')
    .gte('planning_week', week)
    .match({ user_id: this.authService.getCurrentUserId() })
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
}
