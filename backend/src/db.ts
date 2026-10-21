import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';
import fs from 'fs';
import { createBaseSchema } from './db/schema';
import { runMigrations } from './db/migrator';

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

  // Baseline schema creation
  await createBaseSchema(db);

  // Run tracked migrations
  await runMigrations(db);

  dbInstance = db;
  return db;
}

/** Seed default foods from seeds/foods.json if table is empty or update nutritional data */
export async function seedFoods(): Promise<void> {
  const db = await getDB();
  const seedFilePath = path.join(__dirname, 'db', 'seeds', 'foods.json');

  if (!fs.existsSync(seedFilePath)) {
    console.warn('Seeds file foods.json not found at', seedFilePath);
    return;
  }

  const raw = fs.readFileSync(seedFilePath, 'utf8');
  const defaultFoods: Array<{
    id: string;
    name: string;
    name_it: string;
    unit: string;
    kcal: number;
    protein: number;
    fat: number;
    carbs: number;
    fiber: number;
  }> = JSON.parse(raw);

  const stmt = await db.prepare(
    `INSERT INTO foods (id, name, name_it, default_unit, kcal, protein, fat, carbs, fiber)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET
       name_it=excluded.name_it,
       kcal=excluded.kcal,
       protein=excluded.protein,
       fat=excluded.fat,
       carbs=excluded.carbs,
       fiber=excluded.fiber`,
  );

  for (const f of defaultFoods) {
    await stmt.run(f.id, f.name, f.name_it, f.unit, f.kcal, f.protein, f.fat, f.carbs, f.fiber);
  }
  await stmt.finalize();
}
