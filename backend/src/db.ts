import sqlite3 from "sqlite3";
import { open } from "sqlite";

sqlite3.verbose();

export async function initDB() {
  const db = await open({
    filename: "./data/database.sqlite",
    driver: sqlite3.Database,
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT,
      email TEXT UNIQUE,
      password TEXT,
      avatar_url TEXT
    );

    CREATE TABLE IF NOT EXISTS recipes (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      name TEXT,
      description TEXT,
      cuisine TEXT,
      difficulty TEXT,
      time_value INTEGER,
      time_unit TEXT,
      FOREIGN KEY(user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS planning (
      id TEXT PRIMARY KEY,
      recipe_id TEXT,
      week TEXT,
      day TEXT,
      meal TEXT,
      user_id TEXT,
      FOREIGN KEY(recipe_id) REFERENCES recipes(id)
    );

    CREATE TABLE IF NOT EXISTS followers (
      follower_id TEXT,
      followed_id TEXT
    );

    CREATE TABLE IF NOT EXISTS groups (
      id TEXT PRIMARY KEY
    );

    CREATE TABLE IF NOT EXISTS group_members (
      group_id TEXT,
      user_id TEXT
    );
  `);

  return db;
}
