import express from "express";
import { initDB } from "../db";
import { v4 as uuidv4 } from "uuid";
import { authenticateToken } from "../auth.middleware";

export const recipesRouter = express.Router();
recipesRouter.use(authenticateToken);

recipesRouter.get("/", async (req, res) => {
  const db = await initDB();
  const recipes = await db.all("SELECT * FROM recipes");
  res.json(recipes);
});

recipesRouter.post("/", async (req, res) => {
  const user = (req as any).user;
  const { name, description, cuisine, difficulty, time_value, time_unit } =
    req.body;
  const db = await initDB();
  const id = uuidv4();
  await db.run(
    `INSERT INTO recipes (id, user_id, name, description, cuisine, difficulty, time_value, time_unit)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    id,
    user.id,
    name,
    description,
    cuisine,
    difficulty,
    time_value,
    time_unit,
  );
  res.json({ id });
});

recipesRouter.get("/:id", async (req, res) => {
  const db = await initDB();
  const recipe = await db.get(
    "SELECT * FROM recipes WHERE id = ?",
    req.params.id,
  );
  res.json(recipe);
});

recipesRouter.delete("/:id", async (req, res) => {
  const db = await initDB();
  await db.run("DELETE FROM recipes WHERE id = ?", req.params.id);
  res.json({ success: true });
});
