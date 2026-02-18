import express from "express";
import { initDB } from "../db";
import { authenticateToken } from "../auth.middleware";

export const usersRouter = express.Router();
usersRouter.use(authenticateToken);

usersRouter.get("/", async (req, res) => {
  const user = (req as any).user;
  const db = await initDB();
  const users = await db.all(
    "SELECT id, name, email, avatar_url FROM users WHERE id != ?",
    user.id,
  );
  res.json(users);
});

usersRouter.get("/:id", async (req, res) => {
  const db = await initDB();
  const user = await db.get(
    "SELECT id, name, email, avatar_url FROM users WHERE id = ?",
    req.params.id,
  );
  res.json(user);
});

usersRouter.post("/:id/follow", async (req, res) => {
  const me = (req as any).user;
  const followed = req.params.id;
  const db = await initDB();
  await db.run(
    "INSERT INTO followers (follower_id, followed_id) VALUES (?, ?)",
    me.id,
    followed,
  );
  res.json({ success: true });
});

usersRouter.delete("/:id/follow", async (req, res) => {
  const me = (req as any).user;
  const followed = req.params.id;
  const db = await initDB();
  await db.run(
    "DELETE FROM followers WHERE follower_id = ? AND followed_id = ?",
    me.id,
    followed,
  );
  res.json({ success: true });
});
