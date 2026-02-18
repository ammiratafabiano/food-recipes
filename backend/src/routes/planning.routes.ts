import express from "express";
import { initDB } from "../db";
import { v4 as uuidv4 } from "uuid";
import { authenticateToken } from "../auth.middleware";

export const planningRouter = express.Router();
planningRouter.use(authenticateToken);

planningRouter.get("/:week", async (req, res) => {
  const user = (req as any).user;
  const db = await initDB();
  const result = await db.all(
    "SELECT * FROM planning WHERE user_id = ? AND week = ?",
    user.id,
    req.params.week,
  );
  res.json(result);
});

planningRouter.post("/", async (req, res) => {
  const user = (req as any).user;
  const { recipe_id, week, day, meal } = req.body;
  const db = await initDB();
  const id = uuidv4();
  await db.run(
    "INSERT INTO planning (id, recipe_id, week, day, meal, user_id) VALUES (?, ?, ?, ?, ?, ?)",
    id,
    recipe_id,
    week,
    day,
    meal,
    user.id,
  );
  res.json({ id });
});

planningRouter.delete("/:id", async (req, res) => {
  const db = await initDB();
  await db.run("DELETE FROM planning WHERE id = ?", req.params.id);
  res.json({ success: true });
});
