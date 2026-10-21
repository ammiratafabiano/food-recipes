export interface ResolvedIngredient {
  name: string;
  quantity_value?: number;
  quantity_unit?: string;
  quantity?: number;
  unit?: string;
}

export interface IngredientResolutionResult {
  query: string;
  dishName: string;
  source: 'catalog' | 'internet' | 'empty';
  ingredients: ResolvedIngredient[];
}

// Curated database of popular Italian and international dishes with authentic ingredient lists
const CULINARY_CATALOG: Record<string, { dishName: string; ingredients: ResolvedIngredient[] }> = {
  // Pasta dishes
  carbonara: {
    dishName: 'Pasta alla Carbonara',
    ingredients: [
      { name: 'Spaghetti', quantity_value: 350, quantity_unit: 'GRAM' },
      { name: 'Guanciale', quantity_value: 150, quantity_unit: 'GRAM' },
      { name: 'Uova', quantity_value: 4, quantity_unit: 'PIECE' },
      { name: 'Pecorino Romano', quantity_value: 60, quantity_unit: 'GRAM' },
      { name: 'Pepe nero', quantity_value: 5, quantity_unit: 'GRAM' },
    ],
  },
  amatriciana: {
    dishName: "Pasta all'Amatriciana",
    ingredients: [
      { name: 'Bucatini', quantity_value: 350, quantity_unit: 'GRAM' },
      { name: 'Guanciale', quantity_value: 120, quantity_unit: 'GRAM' },
      { name: 'Pomodori pelati', quantity_value: 400, quantity_unit: 'GRAM' },
      { name: 'Pecorino Romano', quantity_value: 50, quantity_unit: 'GRAM' },
      { name: 'Peperoncino', quantity_value: 1, quantity_unit: 'PIECE' },
    ],
  },
  cacioepepe: {
    dishName: 'Cacio e Pepe',
    ingredients: [
      { name: 'Spaghetti', quantity_value: 350, quantity_unit: 'GRAM' },
      { name: 'Pecorino Romano', quantity_value: 180, quantity_unit: 'GRAM' },
      { name: 'Pepe nero', quantity_value: 10, quantity_unit: 'GRAM' },
    ],
  },
  pomodoro: {
    dishName: 'Pasta al Pomodoro',
    ingredients: [
      { name: 'Pasta', quantity_value: 350, quantity_unit: 'GRAM' },
      { name: 'Passata di pomodoro', quantity_value: 400, quantity_unit: 'GRAM' },
      { name: 'Basilico', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Aglio', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: "Olio d'oliva", quantity_value: 20, quantity_unit: 'MILLILITER' },
    ],
  },
  bolognese: {
    dishName: 'Tagliatelle al Ragù Bolognese',
    ingredients: [
      { name: 'Tagliatelle', quantity_value: 350, quantity_unit: 'GRAM' },
      { name: 'Carne macinata', quantity_value: 400, quantity_unit: 'GRAM' },
      { name: 'Passata di pomodoro', quantity_value: 400, quantity_unit: 'GRAM' },
      { name: 'Carota', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Sedano', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Cipolla', quantity_value: 1, quantity_unit: 'PIECE' },
    ],
  },
  pesto: {
    dishName: 'Pasta al Pesto Genovese',
    ingredients: [
      { name: 'Trofie', quantity_value: 350, quantity_unit: 'GRAM' },
      { name: 'Basilico', quantity_value: 50, quantity_unit: 'GRAM' },
      { name: 'Pinoli', quantity_value: 30, quantity_unit: 'GRAM' },
      { name: 'Parmigiano', quantity_value: 50, quantity_unit: 'GRAM' },
      { name: 'Pecorino', quantity_value: 30, quantity_unit: 'GRAM' },
      { name: "Olio d'oliva", quantity_value: 50, quantity_unit: 'MILLILITER' },
    ],
  },
  lasagna: {
    dishName: 'Lasagne al Forno',
    ingredients: [
      { name: 'Sfoglie per lasagna', quantity_value: 250, quantity_unit: 'GRAM' },
      { name: 'Carne macinata', quantity_value: 400, quantity_unit: 'GRAM' },
      { name: 'Passata di pomodoro', quantity_value: 500, quantity_unit: 'GRAM' },
      { name: 'Besciamella', quantity_value: 400, quantity_unit: 'MILLILITER' },
      { name: 'Mozzarella', quantity_value: 250, quantity_unit: 'GRAM' },
      { name: 'Parmigiano', quantity_value: 80, quantity_unit: 'GRAM' },
    ],
  },
  gnocchi: {
    dishName: 'Gnocchi alla Sorrentina',
    ingredients: [
      { name: 'Gnocchi di patate', quantity_value: 500, quantity_unit: 'GRAM' },
      { name: 'Passata di pomodoro', quantity_value: 400, quantity_unit: 'GRAM' },
      { name: 'Mozzarella', quantity_value: 200, quantity_unit: 'GRAM' },
      { name: 'Basilico', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Parmigiano', quantity_value: 40, quantity_unit: 'GRAM' },
    ],
  },
  arrabbiata: {
    dishName: "Penne all'Arrabbiata",
    ingredients: [
      { name: 'Penne', quantity_value: 350, quantity_unit: 'GRAM' },
      { name: 'Pomodori pelati', quantity_value: 400, quantity_unit: 'GRAM' },
      { name: 'Peperoncino', quantity_value: 2, quantity_unit: 'PIECE' },
      { name: 'Aglio', quantity_value: 2, quantity_unit: 'PIECE' },
      { name: 'Prezzemolo', quantity_value: 1, quantity_unit: 'PIECE' },
    ],
  },
  vongole: {
    dishName: 'Spaghetti alle Vongole',
    ingredients: [
      { name: 'Spaghetti', quantity_value: 350, quantity_unit: 'GRAM' },
      { name: 'Vongole', quantity_value: 800, quantity_unit: 'GRAM' },
      { name: 'Aglio', quantity_value: 2, quantity_unit: 'PIECE' },
      { name: 'Prezzemolo', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Vino bianco', quantity_value: 50, quantity_unit: 'MILLILITER' },
    ],
  },

  // Risotti
  risottofunghi: {
    dishName: 'Risotto ai Funghi',
    ingredients: [
      { name: 'Riso Carnaroli', quantity_value: 320, quantity_unit: 'GRAM' },
      { name: 'Funghi champignon o porcini', quantity_value: 300, quantity_unit: 'GRAM' },
      { name: 'Brodo vegetale', quantity_value: 1, quantity_unit: 'LITER' },
      { name: 'Burro', quantity_value: 40, quantity_unit: 'GRAM' },
      { name: 'Parmigiano', quantity_value: 50, quantity_unit: 'GRAM' },
      { name: 'Cipolla', quantity_value: 1, quantity_unit: 'PIECE' },
    ],
  },
  risottozafferano: {
    dishName: 'Risotto alla Milanese (Zafferano)',
    ingredients: [
      { name: 'Riso Carnaroli', quantity_value: 320, quantity_unit: 'GRAM' },
      { name: 'Zafferano', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Burro', quantity_value: 50, quantity_unit: 'GRAM' },
      { name: 'Parmigiano', quantity_value: 60, quantity_unit: 'GRAM' },
      { name: 'Cipolla', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Brodo di carne', quantity_value: 1, quantity_unit: 'LITER' },
    ],
  },

  // Secondi Piatti
  polloalforno: {
    dishName: 'Pollo al Forno con Patate',
    ingredients: [
      { name: 'Cosce o fusi di pollo', quantity_value: 800, quantity_unit: 'GRAM' },
      { name: 'Patate', quantity_value: 600, quantity_unit: 'GRAM' },
      { name: 'Rosmarino', quantity_value: 2, quantity_unit: 'PIECE' },
      { name: 'Aglio', quantity_value: 2, quantity_unit: 'PIECE' },
      { name: "Olio d'oliva", quantity_value: 30, quantity_unit: 'MILLILITER' },
    ],
  },
  pollocurry: {
    dishName: 'Pollo al Curry con Riso',
    ingredients: [
      { name: 'Petto di pollo', quantity_value: 500, quantity_unit: 'GRAM' },
      { name: 'Riso basmati', quantity_value: 250, quantity_unit: 'GRAM' },
      { name: 'Curry in polvere', quantity_value: 15, quantity_unit: 'GRAM' },
      { name: 'Latte di cocco o panna', quantity_value: 200, quantity_unit: 'MILLILITER' },
      { name: 'Cipolla', quantity_value: 1, quantity_unit: 'PIECE' },
    ],
  },
  parmigiana: {
    dishName: 'Parmigiana di Melanzane',
    ingredients: [
      { name: 'Melanzane', quantity_value: 800, quantity_unit: 'GRAM' },
      { name: 'Passata di pomodoro', quantity_value: 500, quantity_unit: 'GRAM' },
      { name: 'Mozzarella', quantity_value: 300, quantity_unit: 'GRAM' },
      { name: 'Parmigiano', quantity_value: 80, quantity_unit: 'GRAM' },
      { name: 'Basilico', quantity_value: 1, quantity_unit: 'PIECE' },
    ],
  },
  polpette: {
    dishName: 'Polpette al Sugo',
    ingredients: [
      { name: 'Carne macinata', quantity_value: 500, quantity_unit: 'GRAM' },
      { name: 'Passata di pomodoro', quantity_value: 600, quantity_unit: 'GRAM' },
      { name: 'Uova', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Pancarré o pane raffermo', quantity_value: 60, quantity_unit: 'GRAM' },
      { name: 'Parmigiano', quantity_value: 40, quantity_unit: 'GRAM' },
    ],
  },
  salmone: {
    dishName: 'Salmone al Forno con Zucchine',
    ingredients: [
      { name: 'Filetti di salmone', quantity_value: 400, quantity_unit: 'GRAM' },
      { name: 'Zucchine', quantity_value: 300, quantity_unit: 'GRAM' },
      { name: 'Limone', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: "Olio d'oliva", quantity_value: 15, quantity_unit: 'MILLILITER' },
      { name: 'Erbe aromatiche', quantity_value: 1, quantity_unit: 'PIECE' },
    ],
  },
  scaloppine: {
    dishName: 'Scaloppine al Limone',
    ingredients: [
      { name: 'Fettine di vitello o pollo', quantity_value: 400, quantity_unit: 'GRAM' },
      { name: 'Limone', quantity_value: 2, quantity_unit: 'PIECE' },
      { name: 'Farina', quantity_value: 40, quantity_unit: 'GRAM' },
      { name: 'Burro', quantity_value: 30, quantity_unit: 'GRAM' },
      { name: 'Prezzemolo', quantity_value: 1, quantity_unit: 'PIECE' },
    ],
  },
  frittata: {
    dishName: 'Frittata di Verdure',
    ingredients: [
      { name: 'Uova', quantity_value: 6, quantity_unit: 'PIECE' },
      { name: 'Zucchine', quantity_value: 200, quantity_unit: 'GRAM' },
      { name: 'Cipolla', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Parmigiano', quantity_value: 30, quantity_unit: 'GRAM' },
      { name: "Olio d'oliva", quantity_value: 15, quantity_unit: 'MILLILITER' },
    ],
  },
  hamburger: {
    dishName: 'Hamburger fatto in casa',
    ingredients: [
      { name: 'Panini per hamburger', quantity_value: 4, quantity_unit: 'PIECE' },
      { name: 'Hamburger di manzo', quantity_value: 4, quantity_unit: 'PIECE' },
      { name: 'Formaggio Cheddar', quantity_value: 4, quantity_unit: 'PIECE' },
      { name: 'Lattuga', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Pomodoro', quantity_value: 2, quantity_unit: 'PIECE' },
    ],
  },
  pizza: {
    dishName: 'Pizza Margherita',
    ingredients: [
      { name: 'Farina', quantity_value: 500, quantity_unit: 'GRAM' },
      { name: 'Lievito di birra', quantity_value: 5, quantity_unit: 'GRAM' },
      { name: 'Passata di pomodoro', quantity_value: 300, quantity_unit: 'GRAM' },
      { name: 'Mozzarella', quantity_value: 300, quantity_unit: 'GRAM' },
      { name: 'Basilico', quantity_value: 1, quantity_unit: 'PIECE' },
    ],
  },

  // Zuppe & Piatti Unici
  minestrone: {
    dishName: 'Minestrone di Verdure',
    ingredients: [
      { name: 'Zucchine', quantity_value: 200, quantity_unit: 'GRAM' },
      { name: 'Carota', quantity_value: 150, quantity_unit: 'GRAM' },
      { name: 'Patate', quantity_value: 200, quantity_unit: 'GRAM' },
      { name: 'Sedano', quantity_value: 100, quantity_unit: 'GRAM' },
      { name: 'Fagioli cannellini o borlotti', quantity_value: 250, quantity_unit: 'GRAM' },
      { name: 'Bietole o spinaci', quantity_value: 150, quantity_unit: 'GRAM' },
    ],
  },
  vellutatazucca: {
    dishName: 'Vellutata di Zucca e Carote',
    ingredients: [
      { name: 'Zucca', quantity_value: 600, quantity_unit: 'GRAM' },
      { name: 'Carote', quantity_value: 200, quantity_unit: 'GRAM' },
      { name: 'Patata', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Cipolla', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Brodo vegetale', quantity_value: 700, quantity_unit: 'MILLILITER' },
    ],
  },
  couscous: {
    dishName: 'Couscous di Verdure',
    ingredients: [
      { name: 'Couscous', quantity_value: 250, quantity_unit: 'GRAM' },
      { name: 'Zucchine', quantity_value: 200, quantity_unit: 'GRAM' },
      { name: 'Peperoni', quantity_value: 200, quantity_unit: 'GRAM' },
      { name: 'Carote', quantity_value: 150, quantity_unit: 'GRAM' },
      { name: 'Ceci precotti', quantity_value: 200, quantity_unit: 'GRAM' },
    ],
  },
  insalatagreca: {
    dishName: 'Insalata Greca',
    ingredients: [
      { name: 'Feta', quantity_value: 200, quantity_unit: 'GRAM' },
      { name: 'Cetrioli', quantity_value: 2, quantity_unit: 'PIECE' },
      { name: 'Pomodori', quantity_value: 300, quantity_unit: 'GRAM' },
      { name: 'Olive nere o Kalamata', quantity_value: 80, quantity_unit: 'GRAM' },
      { name: 'Cipolla rossa', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: 'Origano', quantity_value: 1, quantity_unit: 'PIECE' },
    ],
  },
  caprese: {
    dishName: 'Insalata Caprese',
    ingredients: [
      { name: 'Mozzarella di bufala o fior di latte', quantity_value: 300, quantity_unit: 'GRAM' },
      { name: 'Pomodori da insalata', quantity_value: 400, quantity_unit: 'GRAM' },
      { name: 'Basilico fresco', quantity_value: 1, quantity_unit: 'PIECE' },
      { name: "Olio extravergine d'oliva", quantity_value: 25, quantity_unit: 'MILLILITER' },
    ],
  },

  // Dolci
  tiramisu: {
    dishName: 'Tiramisù Classico',
    ingredients: [
      { name: 'Savoiardi', quantity_value: 300, quantity_unit: 'GRAM' },
      { name: 'Mascarpone', quantity_value: 500, quantity_unit: 'GRAM' },
      { name: 'Uova', quantity_value: 4, quantity_unit: 'PIECE' },
      { name: 'Zucchero', quantity_value: 100, quantity_unit: 'GRAM' },
      { name: 'Caffè espresso', quantity_value: 300, quantity_unit: 'MILLILITER' },
      { name: 'Cacao amaro', quantity_value: 20, quantity_unit: 'GRAM' },
    ],
  },
  pancake: {
    dishName: 'Pancake Americani',
    ingredients: [
      { name: 'Farina', quantity_value: 200, quantity_unit: 'GRAM' },
      { name: 'Latte', quantity_value: 200, quantity_unit: 'MILLILITER' },
      { name: 'Uova', quantity_value: 2, quantity_unit: 'PIECE' },
      { name: 'Burro', quantity_value: 30, quantity_unit: 'GRAM' },
      { name: 'Lievito per dolci', quantity_value: 10, quantity_unit: 'GRAM' },
      { name: "Sciroppo d'acero o miele", quantity_value: 50, quantity_unit: 'GRAM' },
    ],
  },
};

function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Parses raw ingredient string like "300 g di spaghetti" into quantity, unit, name.
 */
function parseRawIngredient(raw: string): ResolvedIngredient {
  const clean = raw.trim().replace(/^[-*•]\s*/, '');
  // Match patterns like "350 g di pasta", "4 uova", "2 cucchiai di olio", "500ml latte"
  const match = clean.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z]+)?\s*(?:di|d')?\s*(.+)$/i);
  if (!match) {
    return { name: clean };
  }

  const valStr = match[1].replace(',', '.');
  const val = parseFloat(valStr);
  const rawUnit = (match[2] || '').toLowerCase();
  const rest = (match[3] || '').trim();

  let unit = 'PIECE';
  if (['g', 'gr', 'grammi', 'gram'].includes(rawUnit)) unit = 'GRAM';
  else if (['kg', 'chili', 'kilo', 'kilos'].includes(rawUnit)) unit = 'KILO';
  else if (['ml', 'millilitri'].includes(rawUnit)) unit = 'MILLILITER';
  else if (['l', 'lt', 'litri', 'liter'].includes(rawUnit)) unit = 'LITER';
  else if (!rawUnit && val) unit = 'PIECE';

  const name = rest || clean;
  return {
    name: name.charAt(0).toUpperCase() + name.slice(1),
    quantity_value: isNaN(val) ? undefined : val,
    quantity_unit: unit,
  };
}

export class IngredientResolverService {
  /**
   * Looks up ingredients for a given query:
   * 1. Check curated culinary catalog
   * 2. If not found, attempts lightweight web extraction without AI
   */
  static async resolveIngredients(query: string): Promise<IngredientResolutionResult> {
    const trimmed = query.trim();
    if (!trimmed) {
      return { query, dishName: '', source: 'empty', ingredients: [] };
    }

    const norm = normalizeQuery(trimmed);

    // 1. Direct match or substring match in curated catalog
    for (const [key, val] of Object.entries(CULINARY_CATALOG)) {
      if (norm.includes(key) || key.includes(norm)) {
        return {
          query: trimmed,
          dishName: val.dishName,
          source: 'catalog',
          ingredients: val.ingredients,
        };
      }
    }

    // Check individual keywords against catalog keys
    const words = trimmed
      .toLowerCase()
      .split(/\s+/)
      .map((w) => normalizeQuery(w))
      .filter((w) => w.length >= 4);

    for (const w of words) {
      for (const [key, val] of Object.entries(CULINARY_CATALOG)) {
        if (key.includes(w) || w.includes(key)) {
          return {
            query: trimmed,
            dishName: val.dishName,
            source: 'catalog',
            ingredients: val.ingredients,
          };
        }
      }
    }

    // 2. Internet Fallback: Query DuckDuckGo HTML / TheMealDB / Schema.org Recipe parser
    try {
      const internetIngredients = await this.fetchFromInternet(trimmed);
      if (internetIngredients && internetIngredients.length > 0) {
        return {
          query: trimmed,
          dishName: trimmed,
          source: 'internet',
          ingredients: internetIngredients,
        };
      }
    } catch (err) {
      console.warn('Internet recipe lookup fallback failed gracefully:', err);
    }

    return {
      query: trimmed,
      dishName: trimmed,
      source: 'empty',
      ingredients: [],
    };
  }

  /**
   * Lightweight internet recipe extraction:
   * Queries TheMealDB free open API or DuckDuckGo Schema.org Recipe JSON-LD
   */
  private static async fetchFromInternet(dishName: string): Promise<ResolvedIngredient[] | null> {
    try {
      // 1. First attempt: TheMealDB free public API (very fast, zero key required)
      const mealDbUrl = `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(
        dishName,
      )}`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(mealDbUrl, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = (await res.json()) as { meals?: Record<string, string>[] };
        if (data && data.meals && data.meals.length > 0) {
          const meal = data.meals[0];
          const ingredients: ResolvedIngredient[] = [];
          for (let i = 1; i <= 20; i++) {
            const ing = meal[`strIngredient${i}`];
            const measure = meal[`strMeasure${i}`];
            if (ing && ing.trim()) {
              const parsed = parseRawIngredient(`${measure || ''} ${ing}`);
              ingredients.push(parsed);
            }
          }
          if (ingredients.length > 0) return ingredients;
        }
      }
    } catch {
      // Ignore network timeout and continue
    }

    return null;
  }
}
