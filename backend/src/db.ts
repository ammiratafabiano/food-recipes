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

  dbInstance = db;
  return db;
}

/** Seed some default foods if table is empty */
export async function seedFoods() {
  const db = await getDB();
  const count = await db.get('SELECT COUNT(*) as c FROM foods');
  if (count && count.c > 0) return;

  const defaultFoods = [
    { id: 'f1', name: 'Tomato', unit: 'KILO' },
    { id: 'f2', name: 'Onion', unit: 'KILO' },
    { id: 'f3', name: 'Garlic', unit: 'GRAM' },
    { id: 'f4', name: 'Pasta', unit: 'GRAM' },
    { id: 'f5', name: 'Eggs', unit: 'GRAM' },
    { id: 'f6', name: 'Cheese', unit: 'GRAM' },
    { id: 'f7', name: 'Bacon', unit: 'GRAM' },
    { id: 'f8', name: 'Flour', unit: 'KILO' },
    { id: 'f9', name: 'Milk', unit: 'LITER' },
    { id: 'f10', name: 'Butter', unit: 'GRAM' },
    { id: 'f11', name: 'Sugar', unit: 'KILO' },
    { id: 'f12', name: 'Chicken', unit: 'KILO' },
    { id: 'f13', name: 'Rice', unit: 'KILO' },
    { id: 'f14', name: 'Potato', unit: 'KILO' },
    { id: 'f15', name: 'Carrot', unit: 'KILO' },
  ];

  const stmt = await db.prepare(
    'INSERT OR IGNORE INTO foods (id, name, default_unit) VALUES (?, ?, ?)',
  );
  for (const f of defaultFoods) {
    await stmt.run(f.id, f.name, f.unit);
  }
  await stmt.finalize();
}
