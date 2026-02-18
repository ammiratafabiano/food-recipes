import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import { authRouter } from "./routes/auth.routes";
import { recipesRouter } from "./routes/recipes.routes";
import { planningRouter } from "./routes/planning.routes";
import { usersRouter } from "./routes/users.routes";
import { groupsRouter } from "./routes/groups.routes";

const app = express();
app.use(cors());
app.use(bodyParser.json());

app.use("/auth", authRouter);
app.use("/recipes", recipesRouter);
app.use("/planning", planningRouter);
app.use("/users", usersRouter);
app.use("/groups", groupsRouter);

app.get("/", (_, res) => res.send("🍳 FoodRecipes API running!"));

app.listen(3000, () => console.log("✅ Server http://localhost:3000"));
