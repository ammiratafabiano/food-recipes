import express from "express";
import { initDB } from "../db";
import { v4 as uuidv4 } from "uuid";
import { authenticateToken } from "../auth.middleware";

export const groupsRouter = express.Router();
groupsRouter.use(authenticateToken);

groupsRouter.post("/", async (req, res) => {
  const user = (req as any).user;
  const db = await initDB();
  const id = uuidv4();
  await db.run("INSERT INTO groups (id) VALUES (?)", id);
  await db.run(
    "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
    id,
    user.id,
  );
  res.json({ id });
});

groupsRouter.get("/", async (req, res) => {
  const db = await initDB();
  const groups = await db.all("SELECT * FROM groups");
  res.json(groups);
});

groupsRouter.post("/:id/join", async (req, res) => {
  const user = (req as any).user;
  const db = await initDB();
  await db.run(
    "INSERT INTO group_members (group_id, user_id) VALUES (?, ?)",
    req.params.id,
    user.id,
  );
  res.json({ success: true });
});

groupsRouter.post("/:id/leave", async (req, res) => {
  const user = (req as any).user;
  const db = await initDB();
  await db.run(
    "DELETE FROM group_members WHERE group_id = ? AND user_id = ?",
    req.params.id,
    user.id,
  );
  res.json({ success: true });
});
