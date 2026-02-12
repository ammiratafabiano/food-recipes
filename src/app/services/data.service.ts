import { inject, Injectable } from '@angular/core';
import { PlannedRecipe, Planning } from '../models/planning.model';
import { Recipe } from '../models/recipe.model';
import { AuthService } from './auth.service';
import { Ingredient } from '../models/ingredient.model';
import { RecipeType } from '../models/recipe-type.enum';
import { Meal } from '../models/meal.model';
import { WeekDay } from '../models/weekDay.enum';
import { Step } from '../models/step.model';
import { Observable, of } from 'rxjs';
import { UserData, UserStats } from '../models/user-data.model';
import { Group } from '../models/group.model';
import { v4 as uuidv4 } from 'uuid';
import { Difficulty } from '../models/difficulty.enum';
import { WeightUnit, TimeUnit } from '../models/unit.enum';
import { createPlanning } from '../utils/model-factories';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private readonly authService = inject(AuthService);

  private recipes: Recipe[] = [];
  private foods: Ingredient[] = [];
  private planned: PlannedRecipe[] = [];
  private savedRecipes: Recipe[] = [];
  private groups: Group[] = [];
  private mockUsers: UserData[] = [];
  private mockFollowers: { [userId: string]: string[] } = {};

  constructor() {
    this.initializeMockData();
  }

  private getActiveUser(): UserData | undefined {
    return this.authService.getCurrentUser() || this.mockUsers[0];
  }

  private initializeMockData() {
    // Mock foods
    this.foods = [
      { id: '1', name: 'Tomato', quantity: { unit: WeightUnit.Kilo } },
      { id: '2', name: 'Onion', quantity: { unit: WeightUnit.Kilo } },
      { id: '3', name: 'Garlic', quantity: { unit: WeightUnit.Gram } },
      { id: '4', name: 'Pasta', quantity: { unit: WeightUnit.Gram } },
      { id: '5', name: 'Eggs', quantity: { unit: WeightUnit.Gram } },
      { id: '6', name: 'Cheese', quantity: { unit: WeightUnit.Gram } },
      { id: '7', name: 'Bacon', quantity: { unit: WeightUnit.Gram } },
      { id: '8', name: 'Flour', quantity: { unit: WeightUnit.Kilo } },
      { id: '9', name: 'Milk', quantity: { unit: WeightUnit.Liter } },
      { id: '10', name: 'Butter', quantity: { unit: WeightUnit.Gram } },
      { id: '11', name: 'Sugar', quantity: { unit: WeightUnit.Kilo } },
      { id: '12', name: 'Chicken', quantity: { unit: WeightUnit.Kilo } },
      { id: '13', name: 'Rice', quantity: { unit: WeightUnit.Kilo } },
      { id: '14', name: 'Potato', quantity: { unit: WeightUnit.Kilo } },
      { id: '15', name: 'Carrot', quantity: { unit: WeightUnit.Kilo } },
    ];

    // Mock users
    this.mockUsers = [
      {
        id: 'user1',
        name: 'Chef Mario',
        email: 'mario@chef.com',
        avatar_url: 'https://example.com/mario.jpg',
      },
      {
        id: 'user2',
        name: 'Chef Luigi',
        email: 'luigi@chef.com',
        avatar_url: 'https://example.com/luigi.jpg',
      },
      {
        id: 'user3',
        name: 'Home Cook Anna',
        email: 'anna@home.com',
        avatar_url: '',
      },
      {
        id: 'user4',
        name: 'Chef Sophia',
        email: 'sophia@chef.com',
        avatar_url: 'https://example.com/sophia.jpg',
      },
    ];

    // Mock recipes
    this.recipes = [
      {
        id: 'rec1',
        userId: 'user1',
        userName: 'Chef Mario',
        name: 'Pasta Carbonara',
        description: 'Classic Italian pasta with eggs, cheese, and bacon',
        cuisine: 'Italian',
        type: RecipeType.FirstCourse,
        time: { value: 30, unit: TimeUnit.Minute },
        difficulty: Difficulty.Medium,
        ingredients: [
          {
            id: '4',
            name: 'Pasta',
            quantity: { value: 400, unit: WeightUnit.Gram },
          },
          {
            id: '5',
            name: 'Eggs',
            quantity: { value: 4, unit: WeightUnit.Gram },
          },
          {
            id: '6',
            name: 'Cheese',
            quantity: { value: 100, unit: WeightUnit.Gram },
          },
          {
            id: '7',
            name: 'Bacon',
            quantity: { value: 150, unit: WeightUnit.Gram },
          },
        ],
        steps: [
          { text: 'Boil pasta in salted water until al dente' },
          { text: 'Cook bacon until crispy' },
          { text: 'Mix eggs and cheese' },
          { text: 'Combine everything off heat' },
        ],
        tags: ['pasta', 'italian', 'classic'],
        servings: 4,
        isAdded: false,
      },
      {
        id: 'rec2',
        userId: 'user2',
        userName: 'Chef Luigi',
        name: 'Chicken Risotto',
        description: 'Creamy risotto with chicken and vegetables',
        cuisine: 'Italian',
        type: RecipeType.FirstCourse,
        time: { value: 45, unit: TimeUnit.Minute },
        difficulty: Difficulty.Medium,
        ingredients: [
          {
            id: '13',
            name: 'Rice',
            quantity: { value: 300, unit: WeightUnit.Gram },
          },
          {
            id: '12',
            name: 'Chicken',
            quantity: { value: 500, unit: WeightUnit.Gram },
          },
          {
            id: '2',
            name: 'Onion',
            quantity: { value: 1, unit: WeightUnit.Kilo },
          },
          {
            id: '15',
            name: 'Carrot',
            quantity: { value: 2, unit: WeightUnit.Kilo },
          },
          {
            id: '9',
            name: 'Milk',
            quantity: { value: 1, unit: WeightUnit.Liter },
          },
        ],
        steps: [
          { text: 'Sauté onion and carrot' },
          { text: 'Add rice and toast' },
          { text: 'Add broth gradually' },
          { text: 'Stir in chicken and finish with milk' },
        ],
        tags: ['risotto', 'chicken', 'creamy'],
        servings: 4,
        isAdded: false,
      },
      {
        id: 'rec3',
        userId: 'user3',
        userName: 'Home Cook Anna',
        name: 'Simple Pancakes',
        description: 'Easy breakfast pancakes',
        cuisine: 'American',
        type: RecipeType.YeastProducts,
        time: { value: 20, unit: TimeUnit.Minute },
        difficulty: Difficulty.Easy,
        ingredients: [
          {
            id: '8',
            name: 'Flour',
            quantity: { value: 200, unit: WeightUnit.Gram },
          },
          {
            id: '9',
            name: 'Milk',
            quantity: { value: 300, unit: WeightUnit.Milliliter },
          },
          {
            id: '5',
            name: 'Eggs',
            quantity: { value: 2, unit: WeightUnit.Gram },
          },
          {
            id: '11',
            name: 'Sugar',
            quantity: { value: 50, unit: WeightUnit.Gram },
          },
        ],
        steps: [
          { text: 'Mix dry ingredients' },
          { text: 'Add wet ingredients' },
          { text: 'Cook on griddle' },
        ],
        tags: ['breakfast', 'easy', 'pancakes'],
        servings: 4,
        isAdded: false,
      },
      {
        id: 'rec4',
        userId: 'user4',
        userName: 'Chef Sophia',
        name: 'Roast Chicken',
        description: 'Juicy roasted chicken with potatoes',
        cuisine: 'American',
        type: RecipeType.SecondCourse,
        time: { value: 90, unit: TimeUnit.Minute },
        difficulty: Difficulty.Medium,
        ingredients: [
          {
            id: '12',
            name: 'Chicken',
            quantity: { value: 1.5, unit: WeightUnit.Kilo },
          },
          {
            id: '14',
            name: 'Potato',
            quantity: { value: 1, unit: WeightUnit.Kilo },
          },
          {
            id: '15',
            name: 'Carrot',
            quantity: { value: 0.5, unit: WeightUnit.Kilo },
          },
          {
            id: '10',
            name: 'Butter',
            quantity: { value: 50, unit: WeightUnit.Gram },
          },
        ],
        steps: [
          { text: 'Season chicken' },
          { text: 'Chop vegetables' },
          { text: 'Roast together' },
        ],
        tags: ['chicken', 'roast', 'comfort'],
        servings: 4,
        isAdded: false,
      },
      {
        id: 'rec5',
        userId: 'user1',
        userName: 'Chef Mario',
        name: 'Tomato Salad',
        description: 'Fresh tomato salad',
        cuisine: 'Mediterranean',
        type: RecipeType.Side,
        time: { value: 10, unit: TimeUnit.Minute },
        difficulty: Difficulty.Easy,
        ingredients: [
          {
            id: '1',
            name: 'Tomato',
            quantity: { value: 500, unit: WeightUnit.Gram },
          },
          {
            id: '2',
            name: 'Onion',
            quantity: { value: 100, unit: WeightUnit.Gram },
          },
          {
            id: '3',
            name: 'Garlic',
            quantity: { value: 2, unit: WeightUnit.Gram },
          },
        ],
        steps: [
          { text: 'Chop tomatoes and onion' },
          { text: 'Add garlic' },
          { text: 'Dress with oil' },
        ],
        tags: ['salad', 'fresh', 'easy'],
        servings: 2,
        isAdded: false,
      },
    ];

    // Mock saved recipes
    this.savedRecipes = [this.recipes[0], this.recipes[2]];

    // Mock followers
    this.mockFollowers = {
      user1: ['user2'],
    };

    // Mock planning
    this.planned = [
      {
        kind: 'recipe',
        id: 'plan1',
        recipe: this.recipes[0],
        recipe_name: 'Pasta Carbonara',
        recipe_id: this.recipes[0].id,
        week: '2024-01-01',
        day: WeekDay.Monday,
        meal: Meal.Lunch,
        user_id: 'user1',
      } as PlannedRecipe,
      {
        kind: 'recipe',
        id: 'plan2',
        recipe: this.recipes[3],
        recipe_name: 'Roast Chicken',
        recipe_id: this.recipes[3].id,
        week: '2024-01-01',
        day: WeekDay.Wednesday,
        meal: Meal.Dinner,
        user_id: 'user1',
      } as PlannedRecipe,
    ];
  }

  async getUsers() {
    const user = this.getActiveUser();
    if (!user) return;
    return Promise.resolve(this.mockUsers.filter((u) => u.id !== user.id));
  }

  async getUser(user_id: string): Promise<UserData | undefined> {
    const current = this.getActiveUser();
    if (!current) return;
    const u = this.mockUsers.find((u) => u.id === user_id);
    if (u) {
      u.isFollowed = this.mockFollowers[user_id]?.includes(current.id) || false;
      return Promise.resolve(u);
    }
    return Promise.resolve(undefined);
  }

  async deleteUser() {
    // Mock: no-op
    return Promise.resolve();
  }

  async getUserStats(): Promise<UserStats | undefined> {
    const user = this.getActiveUser();
    if (!user) return;
    return Promise.resolve({
      saved: this.savedRecipes.length,
      followers: this.mockFollowers[user.id]?.length || 0,
      followed: Object.values(this.mockFollowers).reduce(
        (acc, f) => acc + (f.includes(user.id) ? 1 : 0),
        0,
      ),
    });
  }

  async addFollower(user_id: string) {
    const user = this.getActiveUser();
    if (!user) return;
    if (!this.mockFollowers[user_id]) this.mockFollowers[user_id] = [];
    if (!this.mockFollowers[user_id].includes(user.id)) {
      this.mockFollowers[user_id].push(user.id);
    }
    return Promise.resolve({});
  }

  async deleteFollower(user_id: string) {
    const user = this.getActiveUser();
    if (!user) return;
    if (this.mockFollowers[user_id]) {
      this.mockFollowers[user_id] = this.mockFollowers[user_id].filter(
        (id) => id !== user.id,
      );
    }
    return Promise.resolve({});
  }

  async saveRecipe(recipe_id: string) {
    const user = this.getActiveUser();
    if (!user) return;
    const recipe = this.recipes.find((r) => r.id === recipe_id);
    if (recipe && !this.savedRecipes.find((r) => r.id === recipe_id)) {
      this.savedRecipes.push({ ...recipe, userId: recipe.userId });
    }
    return Promise.resolve({});
  }

  async unsaveRecipe(recipe_id: string) {
    const user = this.getActiveUser();
    if (!user) return;
    this.savedRecipes = this.savedRecipes.filter((r) => r.id !== recipe_id);
    return Promise.resolve({});
  }

  async addRecipe(recipe: Recipe) {
    const user = this.getActiveUser();
    if (!user) return;
    await this.uploadStepImages(user.id, recipe.steps);
    const newRecipe: Recipe = {
      ...recipe,
      id: recipe.id || uuidv4(),
      userId: user.id,
      userName: user.name,
    };
    this.recipes.push(newRecipe);
    return Promise.resolve({ data: newRecipe });
  }

  async getRecipe(recipe_id: string): Promise<Recipe | undefined> {
    const recipe = this.recipes.find((r) => r.id === recipe_id);
    if (!recipe) return Promise.resolve(undefined);
    const saved = this.savedRecipes.some((r) => r.id === recipe_id);
    return Promise.resolve({ ...recipe, isAdded: saved });
  }

  async editRecipe(recipe: Recipe, stepsOfImagesToDelete: Step[]) {
    const user = this.getActiveUser();
    if (!user) return;
    await this.uploadStepImages(user.id, recipe.steps);
    const index = this.recipes.findIndex((r) => r.id === recipe.id);
    if (index !== -1) {
      this.recipes[index] = recipe;
    }
    await this.deleteStepImages(stepsOfImagesToDelete);
    return Promise.resolve();
  }

  private async uploadStepImages(user_id: string, steps: Step[]) {
    // Mock: no-op
    return Promise.resolve();
  }

  async deleteRecipe(recipe: Recipe) {
    const index = this.recipes.findIndex((r) => r.id === recipe.id);
    if (index !== -1) {
      this.recipes.splice(index, 1);
    }
    await this.deleteStepImages(recipe.steps);
    return Promise.resolve();
  }

  private async deleteStepImages(steps: Step[]) {
    // Mock: no-op
    return Promise.resolve();
  }

  async getRecipeList(user_id?: string): Promise<Recipe[] | undefined> {
    const user = this.getActiveUser();
    if (!user) return;
    const owner = user_id || user.id;
    const list = this.recipes
      .filter((r) => r.userId === owner)
      .map((r) => ({ ...r, type: r.type || RecipeType.Other }));
    return Promise.resolve(list);
  }

  async getSavedRecipeList(user_id?: string): Promise<Recipe[] | undefined> {
    const user = this.getActiveUser();
    if (!user) return;
    // For mocks, return saved recipes for current user
    return Promise.resolve(this.savedRecipes);
  }

  async getFoodList(): Promise<Ingredient[] | undefined> {
    return Promise.resolve(this.foods);
  }

  async getPlanning(
    week: string,
    group: Group | undefined,
  ): Promise<Planning | undefined> {
    const user = this.getActiveUser();
    if (!user) return;
    const users = group ? group.users : [user.id];
    const recipes = this.planned.filter(
      (p) => p.week === week && p.user_id && users.includes(p.user_id),
    );
    const planning = createPlanning({ startDate: week, recipes });
    return Promise.resolve(planning);
  }

  async addToPlanning(
    recipe: Recipe,
    week: string,
    day?: WeekDay,
    meal?: Meal,
  ): Promise<PlannedRecipe | undefined> {
    const user = this.getActiveUser();
    if (!user) return;
    const group = await this.retrieveGroup();
    if (!group) return;
    const planned: PlannedRecipe = {
      kind: 'recipe',
      id: uuidv4(),
      recipe_id: recipe.id || uuidv4(),
      recipe_name: recipe.name,
      week,
      day,
      meal,
      user_id: user.id,
      recipe: recipe,
    } as PlannedRecipe;
    this.planned.push(planned);
    return Promise.resolve(planned);
  }

  async deletePlanning(planning_id: string) {
    this.planned = this.planned.filter((p) => p.id !== planning_id);
    return Promise.resolve({});
  }

  async editPlanning(planned_recipe: PlannedRecipe) {
    this.planned = this.planned.map((p) =>
      p.id === planned_recipe.id
        ? { ...p, day: planned_recipe.day, meal: planned_recipe.meal }
        : p,
    );
    return Promise.resolve({});
  }

  async getShoppingList(week: string): Promise<Ingredient[] | undefined> {
    const user = this.getActiveUser();
    if (!user) return;
    const plannedRecipes = this.planned.filter(
      (p) => p.week === week && p.user_id === user.id,
    );
    const ingredientMap: { [key: string]: Ingredient } = {};
    plannedRecipes.forEach((p) => {
      const recipe = this.recipes.find((r) => r.id === p.recipe?.id);
      if (recipe) {
        recipe.ingredients.forEach((ing) => {
          if (ingredientMap[ing.id]) {
            ingredientMap[ing.id].quantity.value! += ing.quantity.value || 0;
          } else {
            ingredientMap[ing.id] = { ...ing };
          }
        });
      }
    });
    return Promise.resolve(Object.values(ingredientMap));
  }

  async retrieveGroup(): Promise<Group | undefined> {
    const user = this.getActiveUser();
    if (!user) return;
    const found = this.groups.find((g) => g.users.includes(user.id));
    return Promise.resolve(found);
  }

  async createGroup(): Promise<Group | undefined> {
    const user = this.getActiveUser();
    if (!user) return;
    const group: Group = { id: uuidv4(), users: [user.id] };
    this.groups.push(group);
    return Promise.resolve(group);
  }

  async joinGroup(group_id: string): Promise<Group | undefined> {
    const user = this.getActiveUser();
    if (!user) return;
    const group = this.groups.find((g) => g.id === group_id);
    if (group && !group.users.includes(user.id)) {
      group.users.push(user.id);
    }
    return Promise.resolve(group);
  }

  async leaveGroup(group_id: string): Promise<Group | undefined> {
    const user = this.getActiveUser();
    if (!user) return;
    const group = this.groups.find((g) => g.id === group_id);
    if (group) {
      group.users = group.users.filter((u) => u !== user.id);
    }
    return Promise.resolve(group);
  }

  private getRandomFileName() {
    var timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    var random = ('' + Math.random()).substring(2, 8);
    var random_number = timestamp + random;
    return random_number;
  }

  private dataURLtoFile(dataurl: string, filename: string) {
    var arr = dataurl.split(',');
    const math = arr[0].match(/:(.*?);/);
    var mime = math ? math[1] : undefined;
    var bstr = atob(arr[1]);
    var n = bstr.length;
    var u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  async addCustomFood(name: string) {
    const food: Ingredient = {
      id: uuidv4(),
      name,
      quantity: { unit: WeightUnit.Gram },
    };
    this.foods.push(food);
    return Promise.resolve(food);
  }

  subscribeToPlannings(group: Group): Observable<PlannedRecipe | undefined> {
    // Mock: no real-time, return empty observable
    return of(undefined);
  }

  unsubscribeToPlanning() {
    // Mock: no-op
  }
}
