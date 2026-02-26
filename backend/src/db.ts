import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';

sqlite3.verbose();

let dbInstance: Database | null = null;

export async function getDB(): Promise<Database> {
  if (dbInstance) return dbInstance;

  const dataDir = path.resolve(__dirname, '..', 'data');
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  const db = await open({
    filename: path.join(dataDir, 'database.sqlite'),
    driver: sqlite3.Database,
  });

  await db.exec('PRAGMA journal_mode = WAL');
  await db.exec('PRAGMA foreign_keys = ON');

  await db.exec(`
    -- ── Users ───────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS users (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      email         TEXT UNIQUE NOT NULL,
      password      TEXT,               -- NULL for OAuth-only users
      avatar_url    TEXT DEFAULT '',
      google_id     TEXT UNIQUE,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    -- ── Recipes ─────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS recipes (
      id            TEXT PRIMARY KEY,
      user_id       TEXT NOT NULL,
      name          TEXT NOT NULL,
      description   TEXT DEFAULT '',
      cuisine       TEXT DEFAULT '',
      type          TEXT DEFAULT 'OTHER',
      difficulty    TEXT DEFAULT 'EASY',
      time_value    REAL,
      time_unit     TEXT DEFAULT 'MINUTE',
      servings      INTEGER DEFAULT 4,
      created_at    TEXT DEFAULT (datetime('now')),
      FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ── Recipe ingredients ──────────────────────────────
    CREATE TABLE IF NOT EXISTS recipe_ingredients (
      id            TEXT PRIMARY KEY,
      recipe_id     TEXT NOT NULL,
      food_id       TEXT,
      name          TEXT NOT NULL,
      quantity_value REAL,
      quantity_unit  TEXT,
      sort_order    INTEGER DEFAULT 0,
      FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    -- ── Recipe steps ────────────────────────────────────
    CREATE TABLE IF NOT EXISTS recipe_steps (
      id            TEXT PRIMARY KEY,
      recipe_id     TEXT NOT NULL,
      text          TEXT NOT NULL,
      image_url     TEXT DEFAULT '',
      sort_order    INTEGER DEFAULT 0,
      FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    -- ── Recipe tags ─────────────────────────────────────
    CREATE TABLE IF NOT EXISTS recipe_tags (
      recipe_id     TEXT NOT NULL,
      tag           TEXT NOT NULL,
      PRIMARY KEY(recipe_id, tag),
      FOREIGN KEY(recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
    );

    -- ── Saved recipes (bookmarks) ──────────────────────
    CREATE TABLE IF NOT EXISTS saved_recipes (
      user_id       TEXT NOT NULL,
      recipe_id     TEXT NOT NULL,
      created_at    TEXT DEFAULT (datetime('now')),
      PRIMARY KEY(user_id, recipe_id),
      FOREIGN KEY(user_id)   REFERENCES users(id)   ON DELETE CASCADE,
      FOREIGN KEY(recipe_id) REFERENCES recipes(id)  ON DELETE CASCADE
    );

    -- ── Foods (master ingredient list) ──────────────────
    CREATE TABLE IF NOT EXISTS foods (
      id            TEXT PRIMARY KEY,
      name          TEXT NOT NULL,
      default_unit  TEXT DEFAULT 'GRAM',
      created_by    TEXT,
      kcal          REAL,
      protein       REAL,
      fat           REAL,
      carbs         REAL,
      fiber         REAL,
      FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE SET NULL
    );

    -- ── Planning ────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS planning (
      id            TEXT PRIMARY KEY,
      recipe_id     TEXT NOT NULL,
      recipe_name   TEXT NOT NULL DEFAULT '',
      week          TEXT NOT NULL,
      day           TEXT,
      meal          TEXT,
      user_id       TEXT NOT NULL,
      FOREIGN KEY(recipe_id) REFERENCES recipes(id)  ON DELETE CASCADE,
      FOREIGN KEY(user_id)   REFERENCES users(id)    ON DELETE CASCADE
    );

    -- ── Followers ───────────────────────────────────────
    CREATE TABLE IF NOT EXISTS followers (
      follower_id   TEXT NOT NULL,
      followed_id   TEXT NOT NULL,
      created_at    TEXT DEFAULT (datetime('now')),
      PRIMARY KEY(follower_id, followed_id),
      FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY(followed_id) REFERENCES users(id) ON DELETE CASCADE
    );

    -- ── Groups ──────────────────────────────────────────
    CREATE TABLE IF NOT EXISTS groups_table (
      id            TEXT PRIMARY KEY,
      created_at    TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id      TEXT NOT NULL,
      user_id       TEXT NOT NULL,
      PRIMARY KEY(group_id, user_id),
      FOREIGN KEY(group_id) REFERENCES groups_table(id) ON DELETE CASCADE,
      FOREIGN KEY(user_id)  REFERENCES users(id)        ON DELETE CASCADE
    );
  `);

  // ── Migrations: add nutritional columns if they don't exist yet ──
  for (const col of ['kcal', 'protein', 'fat', 'carbs', 'fiber']) {
    try {
      await db.exec(`ALTER TABLE foods ADD COLUMN ${col} REAL`);
    } catch {
      // column already exists – ignore
    }
  }

  dbInstance = db;
  return db;
}

/** Seed some default foods if table is empty */
export async function seedFoods() {
  const db = await getDB();

  // Nutritional values are per 100 g of product
  const defaultFoods = [
    {
      id: 'f1',
      name: 'Tomato',
      unit: 'KILO',
      kcal: 18,
      protein: 0.9,
      fat: 0.2,
      carbs: 3.5,
      fiber: 1.2,
    },
    {
      id: 'f2',
      name: 'Onion',
      unit: 'KILO',
      kcal: 40,
      protein: 1.1,
      fat: 0.1,
      carbs: 9.3,
      fiber: 1.7,
    },
    {
      id: 'f3',
      name: 'Garlic',
      unit: 'GRAM',
      kcal: 149,
      protein: 6.4,
      fat: 0.5,
      carbs: 33.1,
      fiber: 2.1,
    },
    {
      id: 'f4',
      name: 'Pasta',
      unit: 'GRAM',
      kcal: 158,
      protein: 5.8,
      fat: 0.9,
      carbs: 30.9,
      fiber: 2.5,
    },
    {
      id: 'f5',
      name: 'Eggs',
      unit: 'PIECE',
      kcal: 155,
      protein: 12.6,
      fat: 10.6,
      carbs: 1.1,
      fiber: 0.0,
    },
    {
      id: 'f6',
      name: 'Cheese',
      unit: 'GRAM',
      kcal: 402,
      protein: 25.0,
      fat: 33.1,
      carbs: 1.3,
      fiber: 0.0,
    },
    {
      id: 'f7',
      name: 'Bacon',
      unit: 'GRAM',
      kcal: 541,
      protein: 37.0,
      fat: 42.0,
      carbs: 1.4,
      fiber: 0.0,
    },
    {
      id: 'f8',
      name: 'Flour',
      unit: 'KILO',
      kcal: 364,
      protein: 10.3,
      fat: 1.0,
      carbs: 76.3,
      fiber: 2.7,
    },
    {
      id: 'f9',
      name: 'Milk',
      unit: 'LITER',
      kcal: 61,
      protein: 3.2,
      fat: 3.3,
      carbs: 4.8,
      fiber: 0.0,
    },
    {
      id: 'f10',
      name: 'Butter',
      unit: 'GRAM',
      kcal: 717,
      protein: 0.9,
      fat: 81.1,
      carbs: 0.1,
      fiber: 0.0,
    },
    {
      id: 'f11',
      name: 'Sugar',
      unit: 'KILO',
      kcal: 387,
      protein: 0.0,
      fat: 0.0,
      carbs: 100.0,
      fiber: 0.0,
    },
    {
      id: 'f12',
      name: 'Chicken',
      unit: 'KILO',
      kcal: 165,
      protein: 31.0,
      fat: 3.6,
      carbs: 0.0,
      fiber: 0.0,
    },
    {
      id: 'f13',
      name: 'Rice',
      unit: 'KILO',
      kcal: 130,
      protein: 2.7,
      fat: 0.3,
      carbs: 28.2,
      fiber: 0.4,
    },
    {
      id: 'f14',
      name: 'Potato',
      unit: 'KILO',
      kcal: 77,
      protein: 2.0,
      fat: 0.1,
      carbs: 17.5,
      fiber: 2.2,
    },
    {
      id: 'f15',
      name: 'Carrot',
      unit: 'KILO',
      kcal: 41,
      protein: 0.9,
      fat: 0.2,
      carbs: 9.6,
      fiber: 2.8,
    },
    {
      id: 'f16',
      name: 'Olive oil',
      unit: 'MILLILITER',
      kcal: 884,
      protein: 0.0,
      fat: 100.0,
      carbs: 0.0,
      fiber: 0.0,
    },
    {
      id: 'f17',
      name: 'Salt',
      unit: 'GRAM',
      kcal: 0,
      protein: 0.0,
      fat: 0.0,
      carbs: 0.0,
      fiber: 0.0,
    },
    {
      id: 'f18',
      name: 'Black pepper',
      unit: 'GRAM',
      kcal: 251,
      protein: 10.4,
      fat: 3.3,
      carbs: 63.7,
      fiber: 26.5,
    },
    {
      id: 'f19',
      name: 'Lemon',
      unit: 'PIECE',
      kcal: 29,
      protein: 1.1,
      fat: 0.3,
      carbs: 9.3,
      fiber: 2.8,
    },
    {
      id: 'f20',
      name: 'Apple',
      unit: 'PIECE',
      kcal: 52,
      protein: 0.3,
      fat: 0.2,
      carbs: 13.8,
      fiber: 2.4,
    },
    {
      id: 'f21',
      name: 'Banana',
      unit: 'PIECE',
      kcal: 89,
      protein: 1.1,
      fat: 0.3,
      carbs: 22.8,
      fiber: 2.6,
    },
    {
      id: 'f22',
      name: 'Beef',
      unit: 'KILO',
      kcal: 250,
      protein: 26.1,
      fat: 17.0,
      carbs: 0.0,
      fiber: 0.0,
    },
    {
      id: 'f23',
      name: 'Pork',
      unit: 'KILO',
      kcal: 242,
      protein: 27.0,
      fat: 14.0,
      carbs: 0.0,
      fiber: 0.0,
    },
    {
      id: 'f24',
      name: 'Salmon',
      unit: 'GRAM',
      kcal: 208,
      protein: 20.4,
      fat: 13.4,
      carbs: 0.0,
      fiber: 0.0,
    },
    {
      id: 'f25',
      name: 'Spinach',
      unit: 'GRAM',
      kcal: 23,
      protein: 2.9,
      fat: 0.4,
      carbs: 3.6,
      fiber: 2.2,
    },
    {
      id: 'f26',
      name: 'Broccoli',
      unit: 'GRAM',
      kcal: 34,
      protein: 2.8,
      fat: 0.4,
      carbs: 6.6,
      fiber: 2.6,
    },
    {
      id: 'f27',
      name: 'Bread',
      unit: 'GRAM',
      kcal: 265,
      protein: 9.0,
      fat: 3.2,
      carbs: 49.0,
      fiber: 2.7,
    },
    {
      id: 'f28',
      name: 'Mozzarella',
      unit: 'GRAM',
      kcal: 280,
      protein: 18.0,
      fat: 22.0,
      carbs: 2.2,
      fiber: 0.0,
    },
    {
      id: 'f29',
      name: 'Parmigiano',
      unit: 'GRAM',
      kcal: 392,
      protein: 32.3,
      fat: 25.8,
      carbs: 3.2,
      fiber: 0.0,
    },
    {
      id: 'f30',
      name: 'Cream',
      unit: 'MILLILITER',
      kcal: 340,
      protein: 2.1,
      fat: 35.0,
      carbs: 3.7,
      fiber: 0.0,
    },
    {
      id: 'f31',
      name: 'Yogurt',
      unit: 'GRAM',
      kcal: 61,
      protein: 3.5,
      fat: 3.3,
      carbs: 4.7,
      fiber: 0.0,
    },
    {
      id: 'f32',
      name: 'Lentils',
      unit: 'GRAM',
      kcal: 116,
      protein: 9.0,
      fat: 0.4,
      carbs: 20.1,
      fiber: 7.9,
    },
    {
      id: 'f33',
      name: 'Chickpeas',
      unit: 'GRAM',
      kcal: 164,
      protein: 8.9,
      fat: 2.6,
      carbs: 27.4,
      fiber: 7.6,
    },
    {
      id: 'f34',
      name: 'Eggplant',
      unit: 'KILO',
      kcal: 25,
      protein: 1.0,
      fat: 0.2,
      carbs: 5.9,
      fiber: 3.0,
    },
    {
      id: 'f35',
      name: 'Zucchini',
      unit: 'KILO',
      kcal: 17,
      protein: 1.2,
      fat: 0.3,
      carbs: 3.1,
      fiber: 1.0,
    },
    {
      id: 'f36',
      name: 'Bell pepper',
      unit: 'PIECE',
      kcal: 31,
      protein: 1.0,
      fat: 0.3,
      carbs: 6.0,
      fiber: 2.1,
    },
    {
      id: 'f37',
      name: 'Mushroom',
      unit: 'GRAM',
      kcal: 22,
      protein: 3.1,
      fat: 0.3,
      carbs: 3.3,
      fiber: 1.0,
    },
    {
      id: 'f38',
      name: 'Celery',
      unit: 'GRAM',
      kcal: 16,
      protein: 0.7,
      fat: 0.2,
      carbs: 3.0,
      fiber: 1.6,
    },
    {
      id: 'f39',
      name: 'Orange',
      unit: 'PIECE',
      kcal: 47,
      protein: 0.9,
      fat: 0.1,
      carbs: 11.8,
      fiber: 2.4,
    },
    {
      id: 'f40',
      name: 'Strawberry',
      unit: 'GRAM',
      kcal: 32,
      protein: 0.7,
      fat: 0.3,
      carbs: 7.7,
      fiber: 2.0,
    },
    {
      id: 'f41',
      name: 'Honey',
      unit: 'GRAM',
      kcal: 304,
      protein: 0.3,
      fat: 0.0,
      carbs: 82.4,
      fiber: 0.2,
    },
    {
      id: 'f42',
      name: 'Dark chocolate',
      unit: 'GRAM',
      kcal: 546,
      protein: 5.0,
      fat: 31.0,
      carbs: 60.0,
      fiber: 7.0,
    },
    {
      id: 'f43',
      name: 'Oats',
      unit: 'GRAM',
      kcal: 389,
      protein: 16.9,
      fat: 6.9,
      carbs: 66.3,
      fiber: 10.6,
    },
    {
      id: 'f44',
      name: 'Almond',
      unit: 'GRAM',
      kcal: 579,
      protein: 21.2,
      fat: 49.9,
      carbs: 21.6,
      fiber: 12.5,
    },
    {
      id: 'f45',
      name: 'Tuna',
      unit: 'GRAM',
      kcal: 116,
      protein: 25.5,
      fat: 1.0,
      carbs: 0.0,
      fiber: 0.0,
    },
  ];

  const stmt = await db.prepare(
    'INSERT INTO foods (id, name, default_unit, kcal, protein, fat, carbs, fiber) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO UPDATE SET kcal=excluded.kcal, protein=excluded.protein, fat=excluded.fat, carbs=excluded.carbs, fiber=excluded.fiber',
  );
  for (const f of defaultFoods) {
    await stmt.run(f.id, f.name, f.unit, f.kcal, f.protein, f.fat, f.carbs, f.fiber);
  }
  await stmt.finalize();
}
