#!/usr/bin/env python3
"""Write all backend source files."""
import os

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "src")

files = {}

# ── auth.middleware.ts ───────────────────────────────
files["src/auth.middleware.ts"] = r'''import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

export const JWT_SECRET = process.env.JWT_SECRET || "change-me-to-a-random-string";

export interface JwtPayload {
  id: string;
  name: string;
  email: string;
}

export function authenticateToken(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.headers["authorization"];
  const token = authHeader?.split(" ")[1];
  if (!token) {
    res.status(401).json({ error: "Missing token" });
    return;
  }

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      res.status(403).json({ error: "Invalid or expired token" });
      return;
    }
    (req as any).user = decoded as JwtPayload;
    next();
  });
}

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}
'''

# ── app.ts ───────────────────────────────────────────
files["src/app.ts"] = r'''import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { getDB, seedFoods } from "./db";
import { authRouter } from "./routes/auth.routes";
import { recipesRouter } from "./routes/recipes.routes";
import { planningRouter } from "./routes/planning.routes";
import { usersRouter } from "./routes/users.routes";
import { groupsRouter } from "./routes/groups.routes";
import { foodsRouter } from "./routes/foods.routes";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:8100",
    credentials: true,
  })
);
app.use(bodyParser.json({ limit: "10mb" }));

app.use("/auth", authRouter);
app.use("/recipes", recipesRouter);
app.use("/planning", planningRouter);
app.use("/users", usersRouter);
app.use("/groups", groupsRouter);
app.use("/foods", foodsRouter);

app.get("/", (_, res) => res.send("Food Recipes API running"));

async function start() {
  await getDB();
  await seedFoods();
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch(console.error);
'''

# ── routes/auth.routes.ts ────────────────────────────
files["src/routes/auth.routes.ts"] = r'''import express from "express";
import bcrypt from "bcryptjs";
import { OAuth2Client } from "google-auth-library";
import { getDB } from "../db";
import { v4 as uuidv4 } from "uuid";
import { signToken, authenticateToken, JwtPayload } from "../auth.middleware";
import dotenv from "dotenv";

dotenv.config();

export const authRouter = express.Router();

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

authRouter.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email and password are required" });
    return;
  }
  try {
    const db = await getDB();
    const existing = await db.get("SELECT id FROM users WHERE email = ?", email);
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    const hashed = await bcrypt.hash(password, 10);
    const id = uuidv4();
    await db.run(
      "INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)",
      id, name, email, hashed
    );
    const token = signToken({ id, name, email });
    res.json({ token, user: { id, name, email, avatar_url: "" } });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

authRouter.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "email and password are required" });
    return;
  }
  try {
    const db = await getDB();
    const user = await db.get("SELECT * FROM users WHERE email = ?", email);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    if (!user.password) {
      res.status(400).json({ error: "This account uses Google login." });
      return;
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      res.status(401).json({ error: "Wrong password" });
      return;
    }
    const token = signToken({ id: user.id, name: user.name, email: user.email });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url || "" },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

authRouter.post("/google", async (req, res) => {
  const { idToken } = req.body;
  if (!idToken) {
    res.status(400).json({ error: "idToken is required" });
    return;
  }
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      res.status(400).json({ error: "Invalid Google token" });
      return;
    }

    const { sub: googleId, email, name, picture } = payload;
    const db = await getDB();

    let user = await db.get(
      "SELECT * FROM users WHERE google_id = ? OR email = ?",
      googleId, email
    );

    if (!user) {
      const id = uuidv4();
      await db.run(
        "INSERT INTO users (id, name, email, avatar_url, google_id) VALUES (?, ?, ?, ?, ?)",
        id, name || email!.split("@")[0], email, picture || "", googleId
      );
      user = { id, name: name || email!.split("@")[0], email, avatar_url: picture || "" };
    } else if (!user.google_id) {
      await db.run("UPDATE users SET google_id = ?, avatar_url = COALESCE(NULLIF(avatar_url, ''), ?) WHERE id = ?",
        googleId, picture || "", user.id
      );
      user.avatar_url = user.avatar_url || picture || "";
    }

    const token = signToken({ id: user.id, name: user.name, email: user.email });
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url || "" },
    });
  } catch (err: any) {
    console.error("Google auth error:", err);
    res.status(401).json({ error: "Google authentication failed: " + (err.message || "") });
  }
});

authRouter.get("/me", authenticateToken, async (req, res) => {
  try {
    const { id } = (req as any).user as JwtPayload;
    const db = await getDB();
    const user = await db.get(
      "SELECT id, name, email, avatar_url FROM users WHERE id = ?", id
    );
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

authRouter.delete("/me", authenticateToken, async (req, res) => {
  try {
    const { id } = (req as any).user as JwtPayload;
    const db = await getDB();
    await db.run("DELETE FROM users WHERE id = ?", id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Internal error" });
  }
});

authRouter.post("/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    res.status(400).json({ error: "email is required" });
    return;
  }
  res.json({ success: true, message: "If the email exists, a reset link was sent." });
});
'''

# ── routes/recipes.routes.ts ────────────────────────
files["src/routes/recipes.routes.ts"] = r'''import express from "express";
import { getDB } from "../db";
import { v4 as uuidv4 } from "uuid";
import { authenticateToken, JwtPayload } from "../auth.middleware";

export const recipesRouter = express.Router();
recipesRouter.use(authenticateToken);

async function buildRecipe(recipeRow: any, userId?: string) {
  const db = await getDB();
  const ingredients = await db.all(
    "SELECT * FROM recipe_ingredients WHERE recipe_id = ? ORDER BY sort_order",
    recipeRow.id
  );
  const steps = await db.all(
    "SELECT * FROM recipe_steps WHERE recipe_id = ? ORDER BY sort_order",
    recipeRow.id
  );
  const tagRows = await db.all(
    "SELECT tag FROM recipe_tags WHERE recipe_id = ?",
    recipeRow.id
  );
  const user = await db.get("SELECT name FROM users WHERE id = ?", recipeRow.user_id);

  let isAdded = false;
  if (userId) {
    const saved = await db.get(
      "SELECT 1 FROM saved_recipes WHERE user_id = ? AND recipe_id = ?",
      userId, recipeRow.id
    );
    isAdded = !!saved;
  }

  return {
    id: recipeRow.id,
    userId: recipeRow.user_id,
    userName: user?.name || "",
    name: recipeRow.name,
    description: recipeRow.description || "",
    cuisine: recipeRow.cuisine || "",
    type: recipeRow.type || "OTHER",
    time: { value: recipeRow.time_value, unit: recipeRow.time_unit || "MINUTE" },
    difficulty: recipeRow.difficulty || "EASY",
    ingredients: ingredients.map((i: any) => ({
      id: i.food_id || i.id,
      name: i.name,
      quantity: { value: i.quantity_value, unit: i.quantity_unit },
    })),
    steps: steps.map((s: any) => ({ text: s.text, imageUrl: s.image_url || "" })),
    tags: tagRows.map((t: any) => t.tag),
    servings: recipeRow.servings || 4,
    isAdded,
  };
}

async function saveRecipeDetails(recipeId: string, ingredients: any[], steps: any[], tags: string[]) {
  const db = await getDB();
  await db.run("DELETE FROM recipe_ingredients WHERE recipe_id = ?", recipeId);
  await db.run("DELETE FROM recipe_steps WHERE recipe_id = ?", recipeId);
  await db.run("DELETE FROM recipe_tags WHERE recipe_id = ?", recipeId);

  for (let i = 0; i < (ingredients || []).length; i++) {
    const ing = ingredients[i];
    await db.run(
      `INSERT INTO recipe_ingredients (id, recipe_id, food_id, name, quantity_value, quantity_unit, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      uuidv4(), recipeId, ing.id || null, ing.name,
      ing.quantity?.value ?? null, ing.quantity?.unit ?? null, i
    );
  }

  for (let i = 0; i < (steps || []).length; i++) {
    const step = steps[i];
    await db.run(
      `INSERT INTO recipe_steps (id, recipe_id, text, image_url, sort_order) VALUES (?, ?, ?, ?, ?)`,
      uuidv4(), recipeId, step.text, step.imageUrl || "", i
    );
  }

  for (const tag of (tags || [])) {
    await db.run("INSERT OR IGNORE INTO recipe_tags (recipe_id, tag) VALUES (?, ?)", recipeId, tag);
  }
}

recipesRouter.get("/", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const userId = (req.query.userId as string) || me.id;
    const db = await getDB();
    const rows = await db.all("SELECT * FROM recipes WHERE user_id = ? ORDER BY created_at DESC", userId);
    const recipes = await Promise.all(rows.map((r: any) => buildRecipe(r, me.id)));
    res.json(recipes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

recipesRouter.get("/saved", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    const rows = await db.all(
      `SELECT r.* FROM recipes r JOIN saved_recipes sr ON sr.recipe_id = r.id WHERE sr.user_id = ? ORDER BY sr.created_at DESC`,
      me.id
    );
    const recipes = await Promise.all(rows.map((r: any) => buildRecipe(r, me.id)));
    res.json(recipes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

recipesRouter.get("/discover", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    const rows = await db.all("SELECT * FROM recipes ORDER BY created_at DESC LIMIT 50");
    const recipes = await Promise.all(rows.map((r: any) => buildRecipe(r, me.id)));
    res.json(recipes);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

recipesRouter.get("/:id", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    const row = await db.get("SELECT * FROM recipes WHERE id = ?", req.params.id);
    if (!row) { res.status(404).json({ error: "Recipe not found" }); return; }
    const recipe = await buildRecipe(row, me.id);
    res.json(recipe);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

recipesRouter.post("/", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const { name, description, cuisine, type, difficulty, time, ingredients, steps, tags, servings } = req.body;
    const db = await getDB();
    const id = uuidv4();
    await db.run(
      `INSERT INTO recipes (id, user_id, name, description, cuisine, type, difficulty, time_value, time_unit, servings)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      id, me.id, name, description || "", cuisine || "", type || "OTHER",
      difficulty || "EASY", time?.value ?? null, time?.unit ?? "MINUTE", servings || 4
    );
    await saveRecipeDetails(id, ingredients, steps, tags);
    const recipe = await buildRecipe(await db.get("SELECT * FROM recipes WHERE id = ?", id), me.id);
    res.json({ data: recipe });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

recipesRouter.put("/:id", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const { name, description, cuisine, type, difficulty, time, ingredients, steps, tags, servings } = req.body;
    const db = await getDB();
    const existing = await db.get("SELECT * FROM recipes WHERE id = ? AND user_id = ?", req.params.id, me.id);
    if (!existing) { res.status(404).json({ error: "Recipe not found or not owned" }); return; }
    await db.run(
      `UPDATE recipes SET name=?, description=?, cuisine=?, type=?, difficulty=?, time_value=?, time_unit=?, servings=? WHERE id = ?`,
      name, description || "", cuisine || "", type || "OTHER",
      difficulty || "EASY", time?.value ?? null, time?.unit ?? "MINUTE", servings || 4, req.params.id
    );
    await saveRecipeDetails(req.params.id, ingredients, steps, tags);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

recipesRouter.delete("/:id", async (req, res) => {
  try {
    const db = await getDB();
    await db.run("DELETE FROM recipes WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

recipesRouter.post("/:id/save", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    await db.run("INSERT OR IGNORE INTO saved_recipes (user_id, recipe_id) VALUES (?, ?)", me.id, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

recipesRouter.delete("/:id/save", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    await db.run("DELETE FROM saved_recipes WHERE user_id = ? AND recipe_id = ?", me.id, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
'''

# ── routes/users.routes.ts ──────────────────────────
files["src/routes/users.routes.ts"] = r'''import express from "express";
import { getDB } from "../db";
import { authenticateToken, JwtPayload } from "../auth.middleware";

export const usersRouter = express.Router();
usersRouter.use(authenticateToken);

usersRouter.get("/", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    const users = await db.all(
      "SELECT id, name, email, avatar_url FROM users WHERE id != ?", me.id
    );
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

usersRouter.get("/:id", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    const user = await db.get(
      "SELECT id, name, email, avatar_url FROM users WHERE id = ?", req.params.id
    );
    if (!user) { res.status(404).json({ error: "User not found" }); return; }
    const followed = await db.get(
      "SELECT 1 FROM followers WHERE follower_id = ? AND followed_id = ?", me.id, req.params.id
    );
    user.isFollowed = !!followed;
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

usersRouter.get("/:id/stats", async (req, res) => {
  try {
    const db = await getDB();
    const userId = req.params.id;
    const saved = await db.get("SELECT COUNT(*) as c FROM saved_recipes WHERE user_id = ?", userId);
    const followers = await db.get("SELECT COUNT(*) as c FROM followers WHERE followed_id = ?", userId);
    const followed = await db.get("SELECT COUNT(*) as c FROM followers WHERE follower_id = ?", userId);
    res.json({
      saved: saved?.c || 0,
      followers: followers?.c || 0,
      followed: followed?.c || 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

usersRouter.post("/:id/follow", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    await db.run("INSERT OR IGNORE INTO followers (follower_id, followed_id) VALUES (?, ?)", me.id, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

usersRouter.delete("/:id/follow", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    await db.run("DELETE FROM followers WHERE follower_id = ? AND followed_id = ?", me.id, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
'''

# ── routes/planning.routes.ts ────────────────────────
files["src/routes/planning.routes.ts"] = r'''import express from "express";
import { getDB } from "../db";
import { v4 as uuidv4 } from "uuid";
import { authenticateToken, JwtPayload } from "../auth.middleware";

export const planningRouter = express.Router();
planningRouter.use(authenticateToken);

planningRouter.get("/:week", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const groupId = req.query.groupId as string | undefined;
    const db = await getDB();

    let userIds = [me.id];
    if (groupId) {
      const members = await db.all("SELECT user_id FROM group_members WHERE group_id = ?", groupId);
      userIds = members.map((m: any) => m.user_id);
    }

    const placeholders = userIds.map(() => "?").join(",");
    const rows = await db.all(
      `SELECT p.*, r.name as recipe_name_lookup FROM planning p LEFT JOIN recipes r ON r.id = p.recipe_id WHERE p.week = ? AND p.user_id IN (${placeholders})`,
      req.params.week, ...userIds
    );

    const items = rows.map((r: any) => ({
      kind: "recipe" as const,
      id: r.id,
      user_id: r.user_id,
      recipe_id: r.recipe_id,
      recipe_name: r.recipe_name || r.recipe_name_lookup || "",
      week: r.week,
      day: r.day,
      meal: r.meal,
    }));

    res.json({ startDate: req.params.week, recipes: items });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

planningRouter.post("/", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const { recipe_id, recipe_name, week, day, meal } = req.body;
    const db = await getDB();
    const id = uuidv4();
    await db.run(
      "INSERT INTO planning (id, recipe_id, recipe_name, week, day, meal, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      id, recipe_id, recipe_name || "", week, day || null, meal || null, me.id
    );
    res.json({ kind: "recipe", id, user_id: me.id, recipe_id, recipe_name: recipe_name || "", week, day, meal });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

planningRouter.put("/:id", async (req, res) => {
  try {
    const { day, meal } = req.body;
    const db = await getDB();
    await db.run("UPDATE planning SET day = ?, meal = ? WHERE id = ?", day || null, meal || null, req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

planningRouter.delete("/:id", async (req, res) => {
  try {
    const db = await getDB();
    await db.run("DELETE FROM planning WHERE id = ?", req.params.id);
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

planningRouter.get("/:week/shopping-list", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    const rows = await db.all(
      `SELECT ri.food_id, ri.name, ri.quantity_value, ri.quantity_unit
       FROM planning p JOIN recipe_ingredients ri ON ri.recipe_id = p.recipe_id
       WHERE p.week = ? AND p.user_id = ?`,
      req.params.week, me.id
    );
    const map: Record<string, any> = {};
    for (const r of rows) {
      const key = r.name || r.food_id || uuidv4();
      if (map[key]) {
        map[key].quantity.value = (map[key].quantity.value || 0) + (r.quantity_value || 0);
      } else {
        map[key] = { id: r.food_id || key, name: r.name, quantity: { value: r.quantity_value || 0, unit: r.quantity_unit } };
      }
    }
    res.json(Object.values(map));
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
'''

# ── routes/groups.routes.ts ──────────────────────────
files["src/routes/groups.routes.ts"] = r'''import express from "express";
import { getDB } from "../db";
import { v4 as uuidv4 } from "uuid";
import { authenticateToken, JwtPayload } from "../auth.middleware";

export const groupsRouter = express.Router();
groupsRouter.use(authenticateToken);

groupsRouter.get("/mine", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    const row = await db.get(
      `SELECT g.id FROM groups_table g JOIN group_members gm ON gm.group_id = g.id WHERE gm.user_id = ? LIMIT 1`,
      me.id
    );
    if (!row) { res.json(null); return; }
    const members = await db.all("SELECT user_id FROM group_members WHERE group_id = ?", row.id);
    res.json({ id: row.id, users: members.map((m: any) => m.user_id) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

groupsRouter.post("/", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    const id = uuidv4();
    await db.run("INSERT INTO groups_table (id) VALUES (?)", id);
    await db.run("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)", id, me.id);
    res.json({ id, users: [me.id] });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

groupsRouter.post("/:id/join", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    await db.run("INSERT OR IGNORE INTO group_members (group_id, user_id) VALUES (?, ?)", req.params.id, me.id);
    const members = await db.all("SELECT user_id FROM group_members WHERE group_id = ?", req.params.id);
    res.json({ id: req.params.id, users: members.map((m: any) => m.user_id) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

groupsRouter.post("/:id/leave", async (req, res) => {
  try {
    const me = (req as any).user as JwtPayload;
    const db = await getDB();
    await db.run("DELETE FROM group_members WHERE group_id = ? AND user_id = ?", req.params.id, me.id);
    const members = await db.all("SELECT user_id FROM group_members WHERE group_id = ?", req.params.id);
    res.json({ id: req.params.id, users: members.map((m: any) => m.user_id) });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});
'''

# ── tsconfig.json ────────────────────────────────────
files["tsconfig.json"] = '''{
  "compilerOptions": {
    "rootDir": "./src",
    "outDir": "./dist",
    "module": "commonjs",
    "target": "es2020",
    "lib": ["es2020"],
    "types": ["node"],
    "sourceMap": true,
    "declaration": true,
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "moduleResolution": "node"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
'''

# ── Write all files ──────────────────────────────────
for relpath, content in files.items():
    fullpath = os.path.join(BASE, relpath)
    os.makedirs(os.path.dirname(fullpath), exist_ok=True)
    with open(fullpath, "w") as f:
        f.write(content)
    print(f"  Wrote {relpath}")

print("\nAll backend files written successfully.")
