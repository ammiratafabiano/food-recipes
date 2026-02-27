import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpContext } from '@angular/common/http';
import { firstValueFrom, Observable, of } from 'rxjs';
import { PlannedRecipe, Planning } from '../models/planning.model';
import { Recipe } from '../models/recipe.model';
import { AuthService } from './auth.service';
import { Ingredient } from '../models/ingredient.model';
import { Step } from '../models/step.model';
import { UserData, UserStats } from '../models/user-data.model';
import { Group } from '../models/group.model';
import { WeekDay } from '../models/weekDay.enum';
import { Meal } from '../models/meal.model';
import { createPlanning } from '../utils/model-factories';
import { environment } from '../../environments/environment';
import { SocketService, PlanningChangeEvent } from './socket.service';
import { map } from 'rxjs/operators';
import { SKIP_LOADING } from '../interceptors/loading.interceptor';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  private readonly http = inject(HttpClient);
  private readonly authService = inject(AuthService);
  private readonly socketService = inject(SocketService);
  private readonly api = environment.apiUrl;

  // ── Users ──────────────────────────────────────────

  async getUsers(): Promise<UserData[] | undefined> {
    try {
      return await firstValueFrom(this.http.get<UserData[]>(`${this.api}/users`));
    } catch {
      return undefined;
    }
  }

  async getUser(user_id: string): Promise<UserData | undefined> {
    try {
      return await firstValueFrom(this.http.get<UserData>(`${this.api}/users/${user_id}`));
    } catch {
      return undefined;
    }
  }

  async deleteUser(): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.api}/auth/me`));
    this.disconnectRealtime();
    this.authService.resetUser();
  }

  async getUserStats(): Promise<UserStats | undefined> {
    const user = this.authService.getCurrentUser();
    if (!user) return undefined;
    try {
      return await firstValueFrom(this.http.get<UserStats>(`${this.api}/users/${user.id}/stats`));
    } catch {
      return undefined;
    }
  }

  async addFollower(user_id: string) {
    return firstValueFrom(this.http.post(`${this.api}/users/${user_id}/follow`, {}));
  }

  async deleteFollower(user_id: string) {
    return firstValueFrom(this.http.delete(`${this.api}/users/${user_id}/follow`));
  }

  // ── Recipes ────────────────────────────────────────

  async saveRecipe(recipe_id: string) {
    return firstValueFrom(this.http.post(`${this.api}/recipes/${recipe_id}/save`, {}));
  }

  async unsaveRecipe(recipe_id: string) {
    return firstValueFrom(this.http.delete(`${this.api}/recipes/${recipe_id}/save`));
  }

  async addRecipe(recipe: Recipe) {
    await this.uploadStepImages('', recipe.steps);
    return firstValueFrom(this.http.post<{ data: Recipe }>(`${this.api}/recipes`, recipe));
  }

  async getRecipe(recipe_id: string): Promise<Recipe | undefined> {
    try {
      return await firstValueFrom(this.http.get<Recipe>(`${this.api}/recipes/${recipe_id}`));
    } catch {
      return undefined;
    }
  }

  async editRecipe(recipe: Recipe, stepsOfImagesToDelete: Step[]) {
    await this.uploadStepImages('', recipe.steps);
    await firstValueFrom(this.http.put(`${this.api}/recipes/${recipe.id}`, recipe));
    await this.deleteStepImages(stepsOfImagesToDelete);
  }

  async deleteRecipe(recipe: Recipe) {
    await firstValueFrom(this.http.delete(`${this.api}/recipes/${recipe.id}`));
    await this.deleteStepImages(recipe.steps);
  }

  async getRecipeList(user_id?: string): Promise<Recipe[] | undefined> {
    try {
      const params: Record<string, string> = {};
      if (user_id) {
        params['userId'] = user_id;
      }
      return await firstValueFrom(this.http.get<Recipe[]>(`${this.api}/recipes`, { params }));
    } catch {
      return undefined;
    }
  }

  async getSavedRecipeList(user_id?: string): Promise<Recipe[] | undefined> {
    try {
      return await firstValueFrom(this.http.get<Recipe[]>(`${this.api}/recipes/saved`));
    } catch {
      return undefined;
    }
  }

  // ── Foods ──────────────────────────────────────────

  async getFoodList(): Promise<Ingredient[] | undefined> {
    try {
      return await firstValueFrom(this.http.get<Ingredient[]>(`${this.api}/foods`));
    } catch {
      return undefined;
    }
  }

  async addCustomFood(name: string) {
    return firstValueFrom(this.http.post<Ingredient>(`${this.api}/foods`, { name }));
  }

  // ── Planning ───────────────────────────────────────

  async getPlanning(
    week: string,
    group: Group | undefined,
    skipLoading = false,
  ): Promise<Planning | undefined> {
    try {
      const params: Record<string, string> = {};
      if (group) {
        params['groupId'] = group.id;
      }
      const context = skipLoading ? new HttpContext().set(SKIP_LOADING, true) : undefined;
      const data = await firstValueFrom(
        this.http.get<{ startDate: string; recipes: PlannedRecipe[] }>(
          `${this.api}/planning/${week}`,
          { params, context },
        ),
      );
      return createPlanning({
        startDate: data.startDate,
        recipes: data.recipes.map((r) => ({ ...r, kind: 'recipe' as const })),
      });
    } catch {
      return undefined;
    }
  }

  async addToPlanning(
    recipe: Recipe,
    week: string,
    day?: WeekDay,
    meal?: Meal,
    group?: Group,
  ): Promise<PlannedRecipe | undefined> {
    try {
      const servings = this.computeGroupServings(recipe, group);
      const body = {
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        week,
        day,
        meal,
        servings,
      };
      const planned = await firstValueFrom(
        this.http.post<PlannedRecipe>(`${this.api}/planning`, body),
      );
      return { ...planned, recipe, kind: 'recipe' };
    } catch {
      return undefined;
    }
  }

  /**
   * Calculates the right serving count for a group.
   * Target = number of group members. If that number isn't
   * reachable via minServings + N * splitServings, pick the
   * next valid value that is >= target.
   */
  private computeGroupServings(recipe: Recipe, group?: Group): number {
    const groupSize = group?.users?.length ?? 1;
    const minServings = recipe.minServings || 1;
    const splitServings = recipe.splitServings || 1;

    if (groupSize <= minServings) return minServings;

    // Find the smallest valid value >= groupSize
    // Valid values: minServings, minServings + splitServings, minServings + 2*splitServings, ...
    const stepsNeeded = Math.ceil((groupSize - minServings) / splitServings);
    return minServings + stepsNeeded * splitServings;
  }

  async deletePlanning(planning_id: string) {
    const context = new HttpContext().set(SKIP_LOADING, true);
    return firstValueFrom(this.http.delete(`${this.api}/planning/${planning_id}`, { context }));
  }

  async editPlanning(planned_recipe: PlannedRecipe) {
    const context = new HttpContext().set(SKIP_LOADING, true);
    return firstValueFrom(
      this.http.put(
        `${this.api}/planning/${planned_recipe.id}`,
        {
          day: planned_recipe.day,
          meal: planned_recipe.meal,
          servings: planned_recipe.servings,
          assignedTo: planned_recipe.assignedTo,
        },
        { context },
      ),
    );
  }

  // ── Shopping List ──────────────────────────────────

  async getShoppingList(week: string, groupId?: string): Promise<Ingredient[] | undefined> {
    try {
      const params: Record<string, string> = {};
      if (groupId) params['groupId'] = groupId;
      return await firstValueFrom(
        this.http.get<Ingredient[]>(`${this.api}/planning/${week}/shopping-list`, { params }),
      );
    } catch {
      return undefined;
    }
  }

  // ── Groups ─────────────────────────────────────────

  async retrieveGroup(skipLoading = false): Promise<Group | undefined> {
    try {
      const context = skipLoading ? new HttpContext().set(SKIP_LOADING, true) : undefined;
      const group = await firstValueFrom(
        this.http.get<Group | null>(`${this.api}/groups/mine`, context ? { context } : undefined),
      );
      return group ?? undefined;
    } catch {
      return undefined;
    }
  }

  async createGroup(): Promise<Group | undefined> {
    try {
      return await firstValueFrom(this.http.post<Group>(`${this.api}/groups`, {}));
    } catch {
      return undefined;
    }
  }

  async joinGroup(group_id: string): Promise<Group | undefined> {
    try {
      return await firstValueFrom(this.http.post<Group>(`${this.api}/groups/${group_id}/join`, {}));
    } catch {
      return undefined;
    }
  }

  async leaveGroup(group_id: string): Promise<Group | undefined> {
    try {
      return await firstValueFrom(
        this.http.post<Group>(`${this.api}/groups/${group_id}/leave`, {}),
      );
    } catch {
      return undefined;
    }
  }

  // ── Realtime (Socket.IO) ────────────────────────────

  /**
   * Ensure the WebSocket is connected for the given group.
   * Safe to call multiple times – only one socket will exist.
   */
  connectRealtime(group: Group) {
    this.socketService.ensureConnected(group.id);
  }

  /** Disconnect the WebSocket (e.g. on page destroy) */
  disconnectRealtime() {
    this.socketService.disconnect();
  }

  /** Observable of planning changes coming from group members */
  get planningChanges$(): Observable<PlannedRecipe | undefined> {
    return this.socketService.planningChanges.pipe(
      map((event: PlanningChangeEvent) => {
        if (!event.payload) return undefined;
        const payload = event.payload as {
          id: string;
          user_id: string;
          recipe_id: string;
          recipe_name?: string;
          week: string;
          day: string;
          meal: string;
        };
        return {
          kind: 'recipe' as const,
          id: payload.id,
          user_id: payload.user_id,
          recipe_id: payload.recipe_id,
          recipe_name: payload.recipe_name || '',
          recipe: undefined as unknown as Recipe,
          week: payload.week,
          day: payload.day,
          meal: payload.meal,
        } as PlannedRecipe;
      }),
    );
  }

  /** Observable that fires when the shopping list should be refreshed */
  get shoppingListInvalidate$(): Observable<string> {
    return this.socketService.shoppingListInvalidate.pipe(map((event) => event.week));
  }

  // ── Image helpers (stubs) ──────────────────────────

  private async uploadStepImages(user_id: string, steps: Step[]) {
    // TODO: implement image upload when backend supports it
  }

  private async deleteStepImages(steps: Step[]) {
    // TODO: implement image deletion when backend supports it
  }

  private getRandomFileName() {
    const timestamp = new Date().toISOString().replace(/[-:.]/g, '');
    const random = ('' + Math.random()).substring(2, 8);
    return timestamp + random;
  }

  private dataURLtoFile(dataurl: string, filename: string) {
    const arr = dataurl.split(',');
    const match = arr[0].match(/:(.*?);/);
    const mime = match ? match[1] : undefined;
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }
}
