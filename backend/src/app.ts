import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import http from 'http';
import cors from 'cors';
import bodyParser from 'body-parser';
import { getDB, seedFoods } from './db';
import { keyStore } from './key-store';
import { authRouter } from './routes/auth.routes';
import { recipesRouter } from './routes/recipes.routes';
import { planningRouter } from './routes/planning.routes';
import { usersRouter } from './routes/users.routes';
import { groupsRouter } from './routes/groups.routes';
import { foodsRouter } from './routes/foods.routes';
import { initSocketIO } from './socket';

export const app = express();
export const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:8100',
    credentials: true,
  }),
);
app.use(bodyParser.json({ limit: '10mb' }));

app.use('/auth', authRouter);
app.use('/recipes', recipesRouter);
app.use('/planning', planningRouter);
app.use('/users', usersRouter);
app.use('/groups', groupsRouter);
app.use('/foods', foodsRouter);

app.get('/', (_, res) => res.send('Food Recipes API running'));

// Initialize Socket.IO for real-time group sync
initSocketIO(server);

async function start() {
  await getDB();
  await seedFoods();
  await keyStore.init();
  server.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

start().catch(console.error);
