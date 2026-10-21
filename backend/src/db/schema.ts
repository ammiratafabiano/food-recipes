import { Database } from 'sqlite';

export async function createBaseSchema(db: Database): Promise<void> {
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
      name_it       TEXT,
      default_unit  TEXT DEFAULT 'GRAM',
      created_by    TEXT,
      kcal          REAL,
      protein       REAL,
      fat           REAL,
      carbs         REAL,
      fiber         REAL,
      portion_value REAL,
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
}
