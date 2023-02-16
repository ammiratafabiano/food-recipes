import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Planning } from '../models/planning.model';
import { Recipe } from '../models/recipe.model';
import { environment } from '../../environments/environment'
import { AuthService } from './auth.service';
import { Ingredient } from '../models/ingredient.model';
import { Food } from '../models/food.model';
import { RecipeType } from '../models/recipe-type.enum';
import { Meal } from '../models/meal.model';
import { WeekDay } from '../models/weekDay.enum';

const RECIPES_TABLE = 'recipes'
const INGREDIENTS_TABLE = 'ingredients'
const FOODS_TABLE = 'foods'
const PLANNINGS_TABLE = 'plannings'

const NAMED_INGREDIENTS_VIEW = 'named_ingredients'

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

  async addRecipe(recipe: Recipe) {
    const ingredients = recipe.ingredients.map(x => {
      return {
        food_id: x.id,
        quantity_value: x.quantity.value,
        quantity_unit: x.quantity.unit
      }
    });
    return this.supabase.from(INGREDIENTS_TABLE).insert(ingredients).select('*').then((returning) => {
      const user_id = this.authService.getCurrentUserId();
      const ingredients_ids = returning.data?.map(x => x.id);
      if (ingredients_ids) {
        return this.supabase
        .from(RECIPES_TABLE)
        .insert([
          {
            user_id: user_id,
            name: recipe.name,
            description: recipe.description,
            type: recipe.type,
            difficulty: recipe.difficulty,
            ingredients: ingredients_ids,
            steps: recipe.steps,
            tags: recipe.tags
          }
        ]).then((response) => {
          console.log(response);
        })
      } else {
        return
      }
    });
  }

  async getRecipe(id: number): Promise<Recipe | undefined> {
    return this.supabase
      .from(RECIPES_TABLE)
      .select()
      .match({ user_id: this.authService.getCurrentUserId(), id: id })
      .then(x => {
        const recipeResult = x?.data && x?.data[0];
        return this.supabase.from(NAMED_INGREDIENTS_VIEW)
            .select(`ingredient_id, food_name, quantity_value, quantity_unit`)
            .match({ ingredient_id: recipeResult.ingredients })
            .then((ingredientsResult) => {
              let recipe = new Recipe();
              recipe.id = recipeResult.id;
              recipe.name = recipeResult.name;
              recipe.description = recipeResult.description;
              recipe.type = recipeResult.type || RecipeType.Other;
              recipe.difficulty = recipeResult.difficulty;
              recipe.ingredients = ingredientsResult.data?.map(y => {
                let ingredient = new Ingredient();
                ingredient.id = y.ingredient_id;
                ingredient.name = y.food_name;
                ingredient.quantity.value = y.quantity_value;
                ingredient.quantity.unit = y.quantity_unit;
                return ingredient;
              }) || [];
              recipe.steps = recipeResult.steps;
              recipe.tags = recipeResult.tags;
              return recipe;
            });
      })
  }

  async getRecipeList(): Promise<Recipe[] | undefined> {
    return this.supabase
      .from(RECIPES_TABLE)
      .select(`id, name, type`)
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

  async getFoodList(): Promise<Food[] | undefined> {
    return this.supabase
      .from(FOODS_TABLE)
      .select(`name, id`)
      .then((result) => {
        return result.data?.map(x => {
          let ingredient = new Ingredient();
          ingredient.id = x.id;
          ingredient.name = x.name;
          return ingredient;
        });
      })
  }

  async getPlanning(week: string): Promise<Planning | undefined> {
    return this.supabase
    .from(PLANNINGS_TABLE)
    .select(`recipe_id, recipe_name, week, day, meal`)
    .match({ user_id: this.authService.getCurrentUserId(), week: week })
    .then((result) => {
      return new Planning();
    })  
  }

  async addToPlanning(recipe: Recipe, week: string, day?: WeekDay, meal?: Meal) {
    const element = {
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
}
