/**
 * Seed script — run once to populate the DB with sample recipes.
 * Usage:
 *   npx ts-node src/seed.ts          (development)
 *   node dist/seed.js                (after build)
 */

import crypto from 'crypto';
import { getDB, seedFoods } from './db';

const uuid = () => crypto.randomUUID();

async function main() {
  const db = await getDB();
  await seedFoods();

  // Check if recipes already seeded
  const count = await db.get('SELECT COUNT(*) as c FROM recipes');
  if (count && count.c > 0) {
    console.log(`DB already has ${count.c} recipes — skipping seed.`);
    process.exit(0);
  }

  // Create a demo user (owner of sample recipes)
  const demoUserId = uuid();
  await db.run(
    `INSERT OR IGNORE INTO users (id, name, email, avatar_url) VALUES (?, ?, ?, ?)`,
    demoUserId,
    'Chef Demo',
    'demo@foodrecipes.app',
    '',
  );

  const recipes: {
    name: string;
    description: string;
    cuisine: string;
    type: string;
    difficulty: string;
    time_value: number;
    time_unit: string;
    servings: number;
    tags: string[];
    ingredients: { name: string; qty: number; unit: string }[];
    steps: string[];
  }[] = [
    {
      name: 'Spaghetti alla Carbonara',
      description: 'Il classico romano con uova, pecorino e guanciale.',
      cuisine: 'ITALIAN',
      type: 'FIRST',
      difficulty: 'MEDIUM',
      time_value: 30,
      time_unit: 'MINUTE',
      servings: 4,
      tags: ['pasta', 'roman', 'classic'],
      ingredients: [
        { name: 'Spaghetti', qty: 400, unit: 'GRAM' },
        { name: 'Guanciale', qty: 150, unit: 'GRAM' },
        { name: 'Pecorino Romano', qty: 80, unit: 'GRAM' },
        { name: 'Egg yolks', qty: 4, unit: 'PIECE' },
        { name: 'Black pepper', qty: 5, unit: 'GRAM' },
      ],
      steps: [
        'Boil salted water and cook spaghetti al dente.',
        'Fry guanciale in a pan until crispy, no oil needed.',
        'Beat egg yolks with grated pecorino and plenty of black pepper.',
        'Drain pasta, remove pan from heat, add pasta to guanciale.',
        'Add egg mixture and toss quickly adding pasta water as needed.',
      ],
    },
    {
      name: 'Margherita Pizza',
      description: 'Pizza napoletana con pomodoro, fior di latte e basilico.',
      cuisine: 'ITALIAN',
      type: 'MAIN',
      difficulty: 'MEDIUM',
      time_value: 90,
      time_unit: 'MINUTE',
      servings: 2,
      tags: ['pizza', 'neapolitan', 'vegetarian'],
      ingredients: [
        { name: 'Flour (type 00)', qty: 300, unit: 'GRAM' },
        { name: 'Fresh yeast', qty: 5, unit: 'GRAM' },
        { name: 'Tomato sauce', qty: 150, unit: 'GRAM' },
        { name: 'Fior di latte mozzarella', qty: 200, unit: 'GRAM' },
        { name: 'Fresh basil', qty: 10, unit: 'GRAM' },
        { name: 'Extra virgin olive oil', qty: 20, unit: 'MILLILITER' },
      ],
      steps: [
        'Mix flour, yeast, water (200ml) and salt; knead for 10 min.',
        'Let dough rise covered for 1 hour at room temperature.',
        'Stretch dough on floured surface to a thin round.',
        'Spread tomato sauce, add torn mozzarella.',
        'Bake at 250°C for 8-10 min until crust is golden.',
        'Top with fresh basil and a drizzle of olive oil.',
      ],
    },
    {
      name: 'Risotto ai Funghi Porcini',
      description: 'Cremoso risotto piemontese con porcini secchi e parmigiano.',
      cuisine: 'ITALIAN',
      type: 'FIRST',
      difficulty: 'MEDIUM',
      time_value: 40,
      time_unit: 'MINUTE',
      servings: 4,
      tags: ['risotto', 'mushroom', 'vegetarian'],
      ingredients: [
        { name: 'Carnaroli rice', qty: 320, unit: 'GRAM' },
        { name: 'Dried porcini mushrooms', qty: 30, unit: 'GRAM' },
        { name: 'Shallot', qty: 1, unit: 'PIECE' },
        { name: 'Dry white wine', qty: 100, unit: 'MILLILITER' },
        { name: 'Vegetable stock', qty: 1000, unit: 'MILLILITER' },
        { name: 'Butter', qty: 40, unit: 'GRAM' },
        { name: 'Parmigiano Reggiano', qty: 60, unit: 'GRAM' },
      ],
      steps: [
        'Soak porcini in 200ml warm water for 20 min; strain and keep the liquid.',
        'Sauté shallot in butter until translucent.',
        'Toast rice 2 min, deglaze with white wine.',
        'Add porcini and their liquid. Add warm stock ladle by ladle, stirring.',
        'After 18 min the rice should be al dente. Remove from heat.',
        'Mantecare with butter and parmigiano until creamy.',
      ],
    },
    {
      name: 'Tiramisù',
      description: 'Il dolce italiano per eccellenza con mascarpone e savoiardi.',
      cuisine: 'ITALIAN',
      type: 'DESSERT',
      difficulty: 'EASY',
      time_value: 30,
      time_unit: 'MINUTE',
      servings: 6,
      tags: ['dessert', 'coffee', 'no-bake'],
      ingredients: [
        { name: 'Ladyfinger biscuits (savoiardi)', qty: 300, unit: 'GRAM' },
        { name: 'Mascarpone', qty: 500, unit: 'GRAM' },
        { name: 'Eggs', qty: 4, unit: 'PIECE' },
        { name: 'Sugar', qty: 100, unit: 'GRAM' },
        { name: 'Espresso coffee', qty: 300, unit: 'MILLILITER' },
        { name: 'Cocoa powder', qty: 20, unit: 'GRAM' },
      ],
      steps: [
        'Separate eggs. Whisk yolks with sugar until pale.',
        'Fold mascarpone into yolk mixture.',
        'Whisk egg whites to stiff peaks, fold into mascarpone cream.',
        'Dip savoiardi quickly in cold espresso; layer in dish.',
        'Spread half the cream, add another layer of savoiardi, then remaining cream.',
        'Dust with cocoa powder. Refrigerate at least 4 hours.',
      ],
    },
    {
      name: 'Insalata Greca',
      description: 'Fresca insalata estiva con feta, olive nere e cetriolo.',
      cuisine: 'GREEK',
      type: 'STARTER',
      difficulty: 'EASY',
      time_value: 15,
      time_unit: 'MINUTE',
      servings: 2,
      tags: ['salad', 'vegetarian', 'summer', 'no-cook'],
      ingredients: [
        { name: 'Tomatoes', qty: 300, unit: 'GRAM' },
        { name: 'Cucumber', qty: 1, unit: 'PIECE' },
        { name: 'Red onion', qty: 0.5, unit: 'PIECE' },
        { name: 'Feta cheese', qty: 150, unit: 'GRAM' },
        { name: 'Kalamata olives', qty: 80, unit: 'GRAM' },
        { name: 'Extra virgin olive oil', qty: 30, unit: 'MILLILITER' },
        { name: 'Dried oregano', qty: 3, unit: 'GRAM' },
      ],
      steps: [
        'Cut tomatoes into wedges, cucumber into half-moons.',
        'Thinly slice red onion.',
        'Combine vegetables and olives in a bowl.',
        'Place feta block on top (or crumble it).',
        'Drizzle with olive oil, season with oregano and salt.',
      ],
    },
    {
      name: 'Pollo al Limone',
      description: 'Petto di pollo leggero con salsa al limone e prezzemolo.',
      cuisine: 'ITALIAN',
      type: 'MAIN',
      difficulty: 'EASY',
      time_value: 25,
      time_unit: 'MINUTE',
      servings: 2,
      tags: ['chicken', 'quick', 'light'],
      ingredients: [
        { name: 'Chicken breast', qty: 400, unit: 'GRAM' },
        { name: 'Lemon', qty: 2, unit: 'PIECE' },
        { name: 'Garlic', qty: 2, unit: 'PIECE' },
        { name: 'Fresh parsley', qty: 15, unit: 'GRAM' },
        { name: 'Extra virgin olive oil', qty: 30, unit: 'MILLILITER' },
        { name: 'Flour', qty: 20, unit: 'GRAM' },
      ],
      steps: [
        'Slice chicken breast into thin cutlets; dust with flour.',
        'Brown in olive oil with crushed garlic, 3 min per side.',
        'Add lemon juice and zest; let sauce reduce 2 min.',
        'Finish with chopped parsley and season with salt.',
      ],
    },
  ];

  for (const r of recipes) {
    const recipeId = uuid();
    await db.run(
      `INSERT INTO recipes (id, user_id, name, description, cuisine, type, difficulty, time_value, time_unit, servings)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      recipeId,
      demoUserId,
      r.name,
      r.description,
      r.cuisine,
      r.type,
      r.difficulty,
      r.time_value,
      r.time_unit,
      r.servings,
    );

    for (let i = 0; i < r.ingredients.length; i++) {
      const ing = r.ingredients[i];
      await db.run(
        `INSERT INTO recipe_ingredients (id, recipe_id, name, quantity_value, quantity_unit, sort_order)
         VALUES (?, ?, ?, ?, ?, ?)`,
        uuid(),
        recipeId,
        ing.name,
        ing.qty,
        ing.unit,
        i,
      );
    }

    for (let i = 0; i < r.steps.length; i++) {
      await db.run(
        `INSERT INTO recipe_steps (id, recipe_id, text, sort_order) VALUES (?, ?, ?, ?)`,
        uuid(),
        recipeId,
        r.steps[i],
        i,
      );
    }

    for (const tag of r.tags) {
      await db.run(
        `INSERT OR IGNORE INTO recipe_tags (recipe_id, tag) VALUES (?, ?)`,
        recipeId,
        tag,
      );
    }

    console.log(`✓ ${r.name}`);
  }

  console.log(`\nSeeded ${recipes.length} recipes for user "Chef Demo".`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
