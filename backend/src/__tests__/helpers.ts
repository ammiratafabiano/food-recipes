/**
 * Test helper – provides a fresh in-memory SQLite database for each test suite,
 * a ready-to-use supertest agent, and JWT helpers.
 */
import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

// ── In-memory DB ──────────────────────────────────────

let db: Database;

/** Open an in-memory database and create all tables */
export async function setupTestDB(): Promise<Database> {
  db = await open({ filename: ':memory:', driver: sqlite3.Database });
  await db.exec('PRAGMA foreign_keys = ON');
  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT, avatar_url TEXT DEFAULT '', google_id TEXT UNIQUE,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
      description TEXT DEFAULT '', cuisine TEXT DEFAULT '', type TEXT DEFAULT 'OTHER',
      difficulty TEXT DEFAULT 'EASY', time_value REAL, time_unit TEXT DEFAULT 'MINUTE',
      servings INTEGER DEFAULT 4, created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, food_id TEXT, name TEXT NOT NULL,
      quantity_value REAL, quantity_unit TEXT, sort_order INTEGER DEFAULT 0,
      FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS recipe_steps (
      id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, text TEXT NOT NULL,
      image_url TEXT DEFAULT '', sort_order INTEGER DEFAULT 0,
      FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS recipe_tags (
      recipe_id TEXT NOT NULL, tag TEXT NOT NULL, PRIMARY KEY(recipe_id, tag),
      FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS saved_recipes (
      user_id TEXT NOT NULL, recipe_id TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY(user_id, recipe_id),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS foods (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, default_unit TEXT DEFAULT 'GRAM',
      created_by TEXT, FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
    );
    CREATE TABLE IF NOT EXISTS planning (
      id TEXT PRIMARY KEY, recipe_id TEXT NOT NULL, recipe_name TEXT NOT NULL DEFAULT '',
      week TEXT NOT NULL, day TEXT, meal TEXT, user_id TEXT NOT NULL,
      FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS followers (
      follower_id TEXT NOT NULL, followed_id TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY(follower_id, followed_id),
      FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(followed_id) REFERENCES users(id) ON DELETE CASCADE
    );
    CREATE TABLE IF NOT EXISTS groups_table (
      id TEXT PRIMARY KEY, created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT NOT NULL, user_id TEXT NOT NULL,
      PRIMARY KEY(group_id, user_id),
      FOREIGN KEY(group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );
  `);
  return db;
}

export function getTestDB(): Database {
  return db;
}

export async function closeTestDB() {
  if (db) await db.close();
}

// ── JWT helpers (symmetric for tests) ─────────────────

const TEST_SECRET = 'test-secret-key-do-not-use-in-prod';

export interface TestUser {
  id: string;
  name: string;
  email: string;
}

export function createTestToken(user: TestUser): string {
  return jwt.sign({ id: user.id, name: user.name, email: user.email }, TEST_SECRET, {
    expiresIn: '1h',
  });
}

export function verifyTestToken(token: string): TestUser {
  return jwt.verify(token, TEST_SECRET) as TestUser;
}

// ── Seed helpers ──────────────────────────────────────

const uuid = () => crypto.randomUUID();

export async function seedUser(overrides: Partial<TestUser> = {}): Promise<TestUser> {
  const user: TestUser = {
    id: overrides.id || uuid(),
    name: overrides.name || 'Test User',
    email: overrides.email || `test-${uuid()}@example.com`,
  };
  await db.run(
    'INSERT INTO users (id, name, email) VALUES (?, ?, ?)',
    user.id,
    user.name,
    user.email,
  );
  return user;
}

export async function seedRecipe(userId: string, name = 'Test Recipe') {
  const id = uuid();
  await db.run('INSERT INTO recipes (id, user_id, name) VALUES (?, ?, ?)', id, userId, name);
  return { id, name };
}

export async function seedRecipeIngredient(
  recipeId: string,
  name: string,
  value: number,
  unit: string,
) {
  const id = uuid();
  await db.run(
    'INSERT INTO recipe_ingredients (id, recipe_id, name, quantity_value, quantity_unit) VALUES (?, ?, ?, ?, ?)',
    id,
    recipeId,
    name,
    value,
    unit,
  );
  return id;
}

export async function seedGroup(userIds: string[]): Promise<string> {
  const groupId = uuid();
  await db.run('INSERT INTO groups_table (id) VALUES (?)', groupId);
  for (const uid of userIds) {
    await db.run('INSERT INTO group_members (group_id, user_id) VALUES (?, ?)', groupId, uid);
  }
  return groupId;
}

export async function seedPlanning(
  userId: string,
  recipeId: string,
  week: string,
  day?: string,
  meal?: string,
) {
  const id = uuid();
  await db.run(
    'INSERT INTO planning (id, recipe_id, recipe_name, week, day, meal, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
    id,
    recipeId,
    'Test Recipe',
    week,
    day || null,
    meal || null,
    userId,
  );
  return id;
}
