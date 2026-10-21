import { Recipe } from '../models/recipe.model';

/**
 * Normalizes text for search comparison:
 * - lowercase
 * - strips accents and diacritics (e.g. è -> e, à -> a)
 * - trims and removes punctuation
 */
export function normalizeSearchText(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove diacritics
    .replace(/[^a-z0-9\s]/g, ' ') // replace punctuation with space
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes Levenshtein edit distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j] + 1, // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Checks if a candidate word matches a target word:
 * 1. Exact match
 * 2. Prefix match (e.g. "carb" matches "carbonara")
 * 3. Substring match
 * 4. Fuzzy typo match for words >= 4 chars (max 1 typo for 4-6 chars, max 2 for >6 chars)
 */
function wordMatches(targetWord: string, candidateWord: string): boolean {
  if (targetWord === candidateWord) return true;
  if (targetWord.startsWith(candidateWord)) return true;
  if (targetWord.includes(candidateWord)) return true;

  if (candidateWord.length >= 4) {
    const maxDistance = candidateWord.length > 6 ? 2 : 1;
    // Check edit distance with target word or target prefix of same length
    const targetPrefix = targetWord.slice(0, candidateWord.length + 1);
    if (levenshteinDistance(candidateWord, targetPrefix) <= maxDistance) return true;
  }

  return false;
}

/**
 * Checks if all query tokens match within a given set of target words
 */
function matchAllTokens(targetWords: string[], queryTokens: string[]): boolean {
  return queryTokens.every((token) =>
    targetWords.some((targetWord) => wordMatches(targetWord, token)),
  );
}

/**
 * Calculates a relevance score for a recipe given a search query.
 * Returns score > 0 if matched, 0 if not matched.
 */
export function scoreRecipeMatch(recipe: Recipe, query: string): number {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return 1;

  const queryTokens = normQuery.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return 1;

  const normName = normalizeSearchText(recipe.name);
  const nameWords = normName.split(' ').filter(Boolean);

  // 1. Exact full title match
  if (normName === normQuery) return 1000;

  // 2. Title starts with query
  if (normName.startsWith(normQuery)) return 850;

  // 3. Title contains query as substring
  if (normName.includes(normQuery)) return 750;

  // 4. All query tokens in recipe title
  const titleMatches = matchAllTokens(nameWords, queryTokens);
  if (titleMatches) {
    // Shorter names with all tokens rank higher (more focused)
    const lengthPenalty = Math.min(100, nameWords.length * 5);
    return 600 - lengthPenalty;
  }

  // 5. Check ingredients, tags, cuisine
  const ingredientNames = (recipe.ingredients || [])
    .map((i) => normalizeSearchText(i.name))
    .join(' ');
  const ingredientWords = ingredientNames.split(' ').filter(Boolean);

  const tagWords = (recipe.tags || [])
    .map((t) => normalizeSearchText(t))
    .join(' ')
    .split(' ')
    .filter(Boolean);

  const cuisineWords = recipe.cuisine ? normalizeSearchText(recipe.cuisine).split(' ') : [];

  const allWords = [...nameWords, ...ingredientWords, ...tagWords, ...cuisineWords];

  // Check if all tokens match anywhere across name, ingredients, tags, cuisine
  const allMatched = matchAllTokens(allWords, queryTokens);
  if (allMatched) {
    // Reward matching name tokens even if some are in ingredients
    const titleTokenHits = queryTokens.filter((token) =>
      nameWords.some((w) => wordMatches(w, token)),
    ).length;
    return 350 + titleTokenHits * 50;
  }

  // If query has 3+ tokens, allow partial match (e.g. matched 2 of 3)
  if (queryTokens.length >= 3) {
    let matchedCount = 0;
    for (const token of queryTokens) {
      if (allWords.some((w) => wordMatches(w, token))) {
        matchedCount++;
      }
    }
    if (matchedCount >= queryTokens.length - 1) {
      return 150 + matchedCount * 20;
    }
  }

  return 0;
}

/**
 * Filter and sort recipes smartly by relevance
 */
export function filterRecipesSmart(recipes: Recipe[] | undefined, query: string): Recipe[] {
  if (!recipes || recipes.length === 0) return [];
  const norm = normalizeSearchText(query);
  if (!norm) {
    return [...recipes].sort((a, b) => a.name.localeCompare(b.name));
  }

  const scored: { recipe: Recipe; score: number }[] = [];
  for (const recipe of recipes) {
    const score = scoreRecipeMatch(recipe, norm);
    if (score > 0) {
      scored.push({ recipe, score });
    }
  }

  return scored
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.recipe.name.localeCompare(b.recipe.name);
    })
    .map((s) => s.recipe);
}

/**
 * Smart matcher for simple text items (e.g. food selection or ingredient list)
 */
export function smartMatchItem(text: string, query: string): boolean {
  const normQuery = normalizeSearchText(query);
  if (!normQuery) return true;

  const queryTokens = normQuery.split(' ').filter(Boolean);
  if (queryTokens.length === 0) return true;

  const normText = normalizeSearchText(text);
  if (normText.includes(normQuery)) return true;

  const textWords = normText.split(' ').filter(Boolean);
  return matchAllTokens(textWords, queryTokens);
}
