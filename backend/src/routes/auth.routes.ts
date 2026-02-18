import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { initDB } from "../db";
import { v4 as uuidv4 } from "uuid";
import { SECRET } from "../auth.middleware";

export const authRouter = express.Router();

authRouter.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const db = await initDB();
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await db.run(
      "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)",
      id,
      name,
      email,
      hashed,
    );
    res.json({ success: true });
  } catch {
    res.status(400).json({ error: "Email già registrata" });
  }
});

authRouter.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  const db = await initDB();
  const user = await db.get("SELECT * FROM users WHERE email = ?", email);
  if (!user) return res.status(400).json({ error: "Utente non trovato" });

  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(400).json({ error: "Password errata" });

  const token = jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    SECRET,
    { expiresIn: "1d" },
  );
  res.json({ token, user });
});
