import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Difficulty } from '../models/difficulty.enum';
import { PlannedRecipe, Planning } from '../models/planning.model';
import { RecipeTypeEnum } from '../models/recipe-type.enum';
import { Recipe } from '../models/recipe.model';
import { Unit } from '../models/unit.enum';
import { WeekDay } from '../models/weekDay.enum';
import { environment } from '../../environments/environment'
import { AuthService } from './auth.service';

const RECIPES_DB = 'recipes'

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private supabase: SupabaseClient

  recipes: Recipe[] = [];
  planning: Planning[] = [];

  constructor(private authService: AuthService) {
    this.supabase = createClient(environment.supabaseUrl, environment.supabaseKey);
    //this.getRecipes(); // TODO REMOVE
    //this.getPlanning(); // TODO REMOVE
  }

  async addRecipe(recipe: Recipe) {
    const newRecipe = {
      text: recipe.name,
      user_id: this.authService.getCurrentUserId(),
    }

    return this.supabase.from(RECIPES_DB).insert(newRecipe)
  }

  async getRecipes(): Promise<Recipe[] | undefined> {
    return this.supabase
      .from(RECIPES_DB)
      .select(`created_at, name, id`)
      .match({ user_id: this.authService.getCurrentUserId() })
      .then((result) => {
        return result.data?.map(x => new Recipe());
      })
  }

  /*
  getRecipes(): Recipe[] {
    let recipes = [
      {
        name: "Red Velvet",
        type: RecipeTypeEnum.Dessert,
        time: {
          value: 180,
          unit: Unit.Minute
        },
        difficulty: Difficulty.Medium,
        ingredients: [
          {
            name: "Farina 00",
            quantity: {
              value: 300,
              unit: Unit.Gram
            }
          },
          {
            name: "Latte",
            quantity: {
              value: 100,
              unit: Unit.Gram
            }
          }
        ],
        steps: [
          {
            text: "Fare il laticello.",
            imageUrl: "https://ionicframework.com/docs/img/demos/card-media.png"
          },
          {
            text: "Mescolare gli ingredienti."
          },
          {
            text: "Infornare a 170° per 20min."
          }
        ]
      },
      {
        name: "Canestrelli",
        type: RecipeTypeEnum.Dessert,
        ingredients: [],
        steps: []
      },
      {
        name: "Cinnamon Roll",
        type: RecipeTypeEnum.Dessert,
        ingredients: [],
        steps: []
      },
      {
        name: "Pistacchiosa",
        type: RecipeTypeEnum.FirstCourse,
        ingredients: [],
        steps: []
      },
      {
        name: "Pollo al curry",
        type: RecipeTypeEnum.SecondCourse,
        ingredients: [],
        steps: []
      },
      {
        name: "Rosticceria",
        type: RecipeTypeEnum.YeastProducts,
        ingredients: [],
        steps: []
      },
      {
        name: "Grissini sfiziosi",
        type: RecipeTypeEnum.Appetizer,
        ingredients: [],
        steps: []
      }
    ]
    recipes.sort((a, b) => a.name.localeCompare(b.name));
    this.recipes = recipes;
    return this.recipes;
  }

  getPlanning(): Planning[] {
    let planning = [
      {
        startDate: "2023-02-06",
        recipes: [
          {
            day: WeekDay.Monday
          },
          {
            day: WeekDay.Tuesday
          },
          {
            day: WeekDay.Wednesday
          },
          {
            day: WeekDay.Thursday
          },
          {
            day: WeekDay.Friday
          },
          {
            day: WeekDay.Saturday
          },
          {
            day: WeekDay.Sunday
          }
        ]
      }
    ]
    this.planning = planning;
    return this.planning;
  }

  async addToPlanning(recipe: Recipe): Promise<boolean> {
    let planned = new PlannedRecipe();
    planned.recipe = recipe;
    let currentPlanning = this.planning[0]; // TODO
    this.planning.find(x => x.startDate == currentPlanning.startDate)?.recipes.unshift(planned);
    return true;
  }*/

}
