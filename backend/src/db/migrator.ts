import { Database } from 'sqlite';

interface Migration {
  name: string;
  run: (db: Database) => Promise<void>;
}

const migrations: Migration[] = [
  {
    name: '001_nutritional_columns_on_foods',
    run: async (db) => {
      for (const col of ['kcal', 'protein', 'fat', 'carbs', 'fiber', 'portion_value']) {
        try {
          await db.exec(`ALTER TABLE foods ADD COLUMN ${col} REAL`);
        } catch {
          // column already exists
        }
      }
    },
  },
  {
    name: '002_name_it_on_foods',
    run: async (db) => {
      try {
        await db.run('ALTER TABLE foods ADD COLUMN name_it TEXT');
      } catch {
        // column already exists
      }
    },
  },
  {
    name: '003_recipe_servings_columns',
    run: async (db) => {
      try {
        await db.run('ALTER TABLE recipes ADD COLUMN min_servings INTEGER DEFAULT 1');
      } catch {
        // column already exists
      }
      try {
        await db.run('ALTER TABLE recipes ADD COLUMN split_servings INTEGER DEFAULT 1');
      } catch {
        // column already exists
      }
    },
  },
  {
    name: '004_planning_servings_and_assigned_to',
    run: async (db) => {
      try {
        await db.run('ALTER TABLE planning ADD COLUMN servings INTEGER DEFAULT 1');
      } catch {
        // column already exists
      }
      try {
        await db.run(
          'ALTER TABLE planning ADD COLUMN assigned_to TEXT REFERENCES users(id) ON DELETE SET NULL',
        );
      } catch {
        // column already exists
      }
    },
  },
  {
    name: '005_ingredient_brand',
    run: async (db) => {
      try {
        await db.run("ALTER TABLE recipe_ingredients ADD COLUMN brand TEXT DEFAULT ''");
      } catch {
        // column already exists
      }
    },
  },
  {
    name: '006_recipe_wip_and_notes',
    run: async (db) => {
      try {
        await db.run('ALTER TABLE recipes ADD COLUMN wip INTEGER DEFAULT 0');
      } catch {
        // column already exists
      }
      try {
        await db.run("ALTER TABLE recipes ADD COLUMN notes TEXT DEFAULT ''");
      } catch {
        // column already exists
      }
    },
  },
  {
    name: '007_user_nutrition_profile_fields',
    run: async (db) => {
      for (const col of [
        'weight REAL',
        'height REAL',
        'age INTEGER',
        'sex TEXT',
        'activity_level TEXT',
      ]) {
        try {
          await db.run(`ALTER TABLE users ADD COLUMN ${col}`);
        } catch {
          // column already exists
        }
      }
    },
  },
  {
    name: '008_planning_exclude_and_sort_order',
    run: async (db) => {
      try {
        await db.run('ALTER TABLE planning ADD COLUMN exclude_from_shopping INTEGER DEFAULT 0');
      } catch {
        // column already exists
      }
      try {
        await db.run('ALTER TABLE planning ADD COLUMN sort_order INTEGER DEFAULT 0');
      } catch {
        // column already exists
      }
    },
  },
  {
    name: '009_user_features_toggles',
    run: async (db) => {
      try {
        await db.run('ALTER TABLE users ADD COLUMN planning_enabled INTEGER DEFAULT 0');
      } catch {
        // column already exists
      }
      try {
        await db.run('ALTER TABLE users ADD COLUMN social_enabled INTEGER DEFAULT 0');
      } catch {
        // column already exists
      }
    },
  },
  {
    name: '010_recipe_usage_and_dismissed_tables',
    run: async (db) => {
      await db.exec(`
        CREATE TABLE IF NOT EXISTS dismissed_suggestions (
          user_id       TEXT NOT NULL,
          recipe_id     TEXT NOT NULL,
          dismissed_at  TEXT DEFAULT (datetime('now')),
          PRIMARY KEY(user_id, recipe_id),
          FOREIGN KEY(user_id)   REFERENCES users(id)   ON DELETE CASCADE,
          FOREIGN KEY(recipe_id) REFERENCES recipes(id)  ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS recipe_usage (
          user_id   TEXT NOT NULL,
          recipe_id TEXT NOT NULL,
          count     INTEGER NOT NULL DEFAULT 0,
          PRIMARY KEY(user_id, recipe_id),
          FOREIGN KEY(user_id)   REFERENCES users(id)    ON DELETE CASCADE,
          FOREIGN KEY(recipe_id) REFERENCES recipes(id)  ON DELETE CASCADE
        );
      `);
    },
  },
  {
    name: '011_database_indexes_optimization',
    run: async (db) => {
      await db.exec(`
        CREATE INDEX IF NOT EXISTS idx_recipes_user_id ON recipes(user_id);
        CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);
        CREATE INDEX IF NOT EXISTS idx_recipe_steps_recipe_id ON recipe_steps(recipe_id);
        CREATE INDEX IF NOT EXISTS idx_recipe_tags_recipe_id ON recipe_tags(recipe_id);
        CREATE INDEX IF NOT EXISTS idx_saved_recipes_user_id ON saved_recipes(user_id);
        CREATE INDEX IF NOT EXISTS idx_planning_week ON planning(week);
        CREATE INDEX IF NOT EXISTS idx_planning_user_id ON planning(user_id);
        CREATE INDEX IF NOT EXISTS idx_planning_week_user ON planning(week, user_id);
        CREATE INDEX IF NOT EXISTS idx_followers_follower_id ON followers(follower_id);
        CREATE INDEX IF NOT EXISTS idx_followers_followed_id ON followers(followed_id);
        CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
        CREATE INDEX IF NOT EXISTS idx_recipe_usage_user_id ON recipe_usage(user_id);
        CREATE INDEX IF NOT EXISTS idx_recipe_usage_recipe ON recipe_usage(recipe_id);
      `);
    },
  },
  {
    name: '012_default_enable_features',
    run: async (db) => {
      await db.run(
        'UPDATE users SET planning_enabled = 1 WHERE planning_enabled IS NULL OR planning_enabled = 0',
      );
      await db.run(
        'UPDATE users SET social_enabled = 1 WHERE social_enabled IS NULL OR social_enabled = 0',
      );
    },
  },
];

export async function runMigrations(db: Database): Promise<void> {
  // Ensure migrations tracking table exists
  await db.exec(`
    CREATE TABLE IF NOT EXISTS migrations (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT UNIQUE NOT NULL,
      executed_at  TEXT DEFAULT (datetime('now'))
    );
  `);

  const executedRows = await db.all<{ name: string }[]>('SELECT name FROM migrations');
  const executedNames = new Set(executedRows.map((r) => r.name));

  for (const migration of migrations) {
    if (!executedNames.has(migration.name)) {
      try {
        await migration.run(db);
        await db.run('INSERT INTO migrations (name) VALUES (?)', migration.name);
      } catch (err) {
        console.error(`Migration ${migration.name} failed:`, err);
        throw err;
      }
    }
  }
}
