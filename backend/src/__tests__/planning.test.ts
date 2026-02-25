import request from 'supertest';
import {
  setupTestDB,
  closeTestDB,
  seedUser,
  seedRecipe,
  seedRecipeIngredient,
  seedPlanning,
  seedGroup,
  createTestToken,
  TestUser,
} from './helpers';
import { buildTestApp } from './test-app';
import type { Express } from 'express';

let app: Express;
let user1: TestUser;
let token1: string;

beforeAll(async () => {
  const db = await setupTestDB();
  app = buildTestApp(db);
});

beforeEach(async () => {
  const db = (await import('./helpers')).getTestDB();
  await db.run('DELETE FROM planning');
  await db.run('DELETE FROM recipe_ingredients');
  await db.run('DELETE FROM recipes');
  await db.run('DELETE FROM group_members');
  await db.run('DELETE FROM groups_table');
  await db.run('DELETE FROM users');

  user1 = await seedUser({ name: 'Alice' });
  token1 = createTestToken(user1);
});

afterAll(async () => {
  await closeTestDB();
});

// ── Auth ─────────────────────────────────────────────

describe('Planning - Authentication', () => {
  it('should return 401 without a token', async () => {
    const res = await request(app).get('/planning/2026-01-05');
    expect(res.status).toBe(401);
  });

  it('should return 403 with an invalid token', async () => {
    const res = await request(app)
      .get('/planning/2026-01-05')
      .set('Authorization', 'Bearer invalid');
    expect(res.status).toBe(403);
  });
});

// ── GET /planning/:week ─────────────────────────────

describe('GET /planning/:week', () => {
  it('should return empty list for a week with no plans', async () => {
    const res = await request(app)
      .get('/planning/2026-03-02')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.startDate).toBe('2026-03-02');
    expect(res.body.recipes).toEqual([]);
  });

  it('should return planned recipes for the given week', async () => {
    const recipe = await seedRecipe(user1.id, 'Pasta');
    await seedPlanning(user1.id, recipe.id, '2026-03-02', 'MON', 'LUNCH');

    const res = await request(app)
      .get('/planning/2026-03-02')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.recipes).toHaveLength(1);
    expect(res.body.recipes[0].recipe_id).toBe(recipe.id);
    expect(res.body.recipes[0].day).toBe('MON');
    expect(res.body.recipes[0].meal).toBe('LUNCH');
  });

  it('should not return plans from another week', async () => {
    const recipe = await seedRecipe(user1.id, 'Soup');
    await seedPlanning(user1.id, recipe.id, '2026-03-09');

    const res = await request(app)
      .get('/planning/2026-03-02')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.recipes).toHaveLength(0);
  });

  it('should not return plans from another user (no group)', async () => {
    const user2 = await seedUser({ name: 'Bob' });
    const recipe = await seedRecipe(user2.id, 'Pizza');
    await seedPlanning(user2.id, recipe.id, '2026-03-02');

    const res = await request(app)
      .get('/planning/2026-03-02')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.recipes).toHaveLength(0);
  });

  it('should return plans from group members when groupId is provided', async () => {
    const user2 = await seedUser({ name: 'Bob' });
    const groupId = await seedGroup([user1.id, user2.id]);

    const recipe1 = await seedRecipe(user1.id, 'Pasta');
    const recipe2 = await seedRecipe(user2.id, 'Salad');
    await seedPlanning(user1.id, recipe1.id, '2026-03-02', 'MON');
    await seedPlanning(user2.id, recipe2.id, '2026-03-02', 'TUE');

    const res = await request(app)
      .get('/planning/2026-03-02')
      .query({ groupId })
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.recipes).toHaveLength(2);
    const recipeIds = res.body.recipes.map((r: any) => r.recipe_id);
    expect(recipeIds).toContain(recipe1.id);
    expect(recipeIds).toContain(recipe2.id);
  });

  it('should return multiple plans in the same day', async () => {
    const recipe1 = await seedRecipe(user1.id, 'Breakfast');
    const recipe2 = await seedRecipe(user1.id, 'Lunch');
    await seedPlanning(user1.id, recipe1.id, '2026-03-02', 'MON', 'BREAKFAST');
    await seedPlanning(user1.id, recipe2.id, '2026-03-02', 'MON', 'LUNCH');

    const res = await request(app)
      .get('/planning/2026-03-02')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.body.recipes).toHaveLength(2);
  });
});

// ── POST /planning ──────────────────────────────────

describe('POST /planning', () => {
  it('should add a recipe to planning', async () => {
    const recipe = await seedRecipe(user1.id, 'Soup');

    const res = await request(app).post('/planning').set('Authorization', `Bearer ${token1}`).send({
      recipe_id: recipe.id,
      recipe_name: 'Soup',
      week: '2026-03-02',
      day: 'WED',
      meal: 'DINNER',
    });

    expect(res.status).toBe(200);
    expect(res.body.id).toBeDefined();
    expect(res.body.recipe_id).toBe(recipe.id);
    expect(res.body.day).toBe('WED');
    expect(res.body.meal).toBe('DINNER');
    expect(res.body.user_id).toBe(user1.id);
  });

  it('should add a recipe without day/meal', async () => {
    const recipe = await seedRecipe(user1.id, 'Snack');

    const res = await request(app)
      .post('/planning')
      .set('Authorization', `Bearer ${token1}`)
      .send({ recipe_id: recipe.id, week: '2026-03-02' });

    expect(res.status).toBe(200);
    expect(res.body.day).toBeFalsy();
    expect(res.body.meal).toBeFalsy();
  });

  it('should persist the new planned recipe', async () => {
    const recipe = await seedRecipe(user1.id, 'Rice');

    await request(app)
      .post('/planning')
      .set('Authorization', `Bearer ${token1}`)
      .send({ recipe_id: recipe.id, recipe_name: 'Rice', week: '2026-03-02', day: 'FRI' });

    const res = await request(app)
      .get('/planning/2026-03-02')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.body.recipes).toHaveLength(1);
    expect(res.body.recipes[0].recipe_name).toBe('Rice');
  });

  it('should handle recipe_name fallback to empty string', async () => {
    const recipe = await seedRecipe(user1.id, 'Eggs');

    const res = await request(app)
      .post('/planning')
      .set('Authorization', `Bearer ${token1}`)
      .send({ recipe_id: recipe.id, week: '2026-03-02' });

    // recipe_name defaults to the recipe table lookup name
    expect(res.status).toBe(200);
  });
});

// ── PUT /planning/:id ───────────────────────────────

describe('PUT /planning/:id', () => {
  it('should update day and meal', async () => {
    const recipe = await seedRecipe(user1.id, 'Stew');
    const planId = await seedPlanning(user1.id, recipe.id, '2026-03-02', 'MON', 'LUNCH');

    const res = await request(app)
      .put(`/planning/${planId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ day: 'TUE', meal: 'DINNER' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify the change
    const check = await request(app)
      .get('/planning/2026-03-02')
      .set('Authorization', `Bearer ${token1}`);

    const updated = check.body.recipes.find((r: any) => r.id === planId);
    expect(updated.day).toBe('TUE');
    expect(updated.meal).toBe('DINNER');
  });

  it('should allow clearing day and meal', async () => {
    const recipe = await seedRecipe(user1.id, 'Pudding');
    const planId = await seedPlanning(user1.id, recipe.id, '2026-03-02', 'FRI', 'DINNER');

    await request(app)
      .put(`/planning/${planId}`)
      .set('Authorization', `Bearer ${token1}`)
      .send({ day: null, meal: null });

    const check = await request(app)
      .get('/planning/2026-03-02')
      .set('Authorization', `Bearer ${token1}`);

    const updated = check.body.recipes.find((r: any) => r.id === planId);
    expect(updated.day).toBeNull();
    expect(updated.meal).toBeNull();
  });
});

// ── DELETE /planning/:id ────────────────────────────

describe('DELETE /planning/:id', () => {
  it('should delete a planned recipe', async () => {
    const recipe = await seedRecipe(user1.id, 'Burrito');
    const planId = await seedPlanning(user1.id, recipe.id, '2026-03-02');

    const res = await request(app)
      .delete(`/planning/${planId}`)
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const check = await request(app)
      .get('/planning/2026-03-02')
      .set('Authorization', `Bearer ${token1}`);

    expect(check.body.recipes).toHaveLength(0);
  });

  it('should succeed even if id does not exist', async () => {
    const res = await request(app)
      .delete('/planning/nonexistent-id')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
  });
});

// ── GET /planning/:week/shopping-list ───────────────

describe('GET /planning/:week/shopping-list', () => {
  it('should return empty list when no plans exist', async () => {
    const res = await request(app)
      .get('/planning/2026-03-02/shopping-list')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('should aggregate ingredients from planned recipes', async () => {
    const recipe = await seedRecipe(user1.id, 'Pasta');
    await seedRecipeIngredient(recipe.id, 'Tomato', 200, 'GRAM');
    await seedRecipeIngredient(recipe.id, 'Pasta', 500, 'GRAM');
    await seedPlanning(user1.id, recipe.id, '2026-03-02', 'MON', 'LUNCH');

    const res = await request(app)
      .get('/planning/2026-03-02/shopping-list')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    const names = res.body.map((i: any) => i.name);
    expect(names).toContain('Tomato');
    expect(names).toContain('Pasta');
  });

  it('should sum quantities of same ingredient from multiple recipes', async () => {
    const recipe1 = await seedRecipe(user1.id, 'Pasta al pomodoro');
    const recipe2 = await seedRecipe(user1.id, 'Bruschetta');
    await seedRecipeIngredient(recipe1.id, 'Tomato', 200, 'GRAM');
    await seedRecipeIngredient(recipe2.id, 'Tomato', 150, 'GRAM');
    await seedPlanning(user1.id, recipe1.id, '2026-03-02', 'MON');
    await seedPlanning(user1.id, recipe2.id, '2026-03-02', 'TUE');

    const res = await request(app)
      .get('/planning/2026-03-02/shopping-list')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    const tomato = res.body.find((i: any) => i.name === 'Tomato');
    expect(tomato).toBeDefined();
    expect(tomato.quantity.value).toBe(350);
  });

  it("should include group members' ingredients when groupId is provided", async () => {
    const user2 = await seedUser({ name: 'Bob' });
    const groupId = await seedGroup([user1.id, user2.id]);

    const recipe1 = await seedRecipe(user1.id, 'Frittata');
    const recipe2 = await seedRecipe(user2.id, 'Omelette');
    await seedRecipeIngredient(recipe1.id, 'Eggs', 4, 'GRAM');
    await seedRecipeIngredient(recipe2.id, 'Eggs', 3, 'GRAM');
    await seedPlanning(user1.id, recipe1.id, '2026-03-02', 'MON');
    await seedPlanning(user2.id, recipe2.id, '2026-03-02', 'TUE');

    const res = await request(app)
      .get('/planning/2026-03-02/shopping-list')
      .query({ groupId })
      .set('Authorization', `Bearer ${token1}`);

    expect(res.status).toBe(200);
    const eggs = res.body.find((i: any) => i.name === 'Eggs');
    expect(eggs).toBeDefined();
    expect(eggs.quantity.value).toBe(7);
  });

  it("should not include other users' ingredients without a group", async () => {
    const user2 = await seedUser({ name: 'Bob' });
    const recipe2 = await seedRecipe(user2.id, 'Omelette');
    await seedRecipeIngredient(recipe2.id, 'Eggs', 3, 'GRAM');
    await seedPlanning(user2.id, recipe2.id, '2026-03-02');

    const res = await request(app)
      .get('/planning/2026-03-02/shopping-list')
      .set('Authorization', `Bearer ${token1}`);

    expect(res.body).toHaveLength(0);
  });
});
