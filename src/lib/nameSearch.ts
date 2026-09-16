/**
 * Order-insensitive matching for multi-word name queries.
 *
 * The customer list holds the same person under both word orders: the Outlook/CSV
 * import joins First + Middle + Last (csvParser.ts:67-69) while calendar- and
 * Rivhit-derived rows often arrive "Last First". A plain substring search for
 * "נילי אגסי" therefore finds one card and silently hides "אגסי נילי".
 *
 * Every search surface keeps its existing whole-query substring match and adds a
 * token branch on the NAME field only, so this can only ever widen results.
 *
 * Sibling of `nameKey` in scripts/customerMatch.mjs:67, which sorts tokens into a
 * dedupe key; that file is a Node ESM tool and cannot be imported from src/. The two
 * stay separate on purpose — this one matches a partial query against a stored name,
 * that one derives an identity. (Same reasoning as the phoneKey split documented in
 * customerCardMatch.ts:8-9.)
 */

/**
 * Two 1-char tokens would AND-match a large share of the table, which makes the
 * results look broken rather than filtered — the same reasoning as
 * MIN_PHONE_QUERY_DIGITS in jobSearch.ts:9.
 */
export const MIN_NAME_TOKEN_LENGTH = 2;

/** Cap so a pasted line can't build an unbounded filter URL / predicate. */
export const MAX_NAME_TOKENS = 4;

/**
 * The tokens of a multi-word name query, or `[]` when this isn't one.
 *
 * Returning `[]` for a single-word query is what keeps existing behaviour intact:
 * callers skip the token branch entirely and match exactly as they did before.
 *
 * Splits on the same Hebrew-aware class as `nameKey` (scripts/customerMatch.mjs:67).
 * Because only digits/latin/Hebrew survive, a token can never contain a character
 * that is reserved in PostgREST's filter grammar — `buildCustomerSearchFilter`
 * relies on that to interpolate tokens without further escaping.
 */
export function nameSearchTokens(query: string): string[] {
  const tokens = (query || '')
    .toLowerCase()
    .split(/[^0-9a-z\u0590-\u05FF]+/)
    .filter((t) => t.length >= MIN_NAME_TOKEN_LENGTH);

  if (tokens.length < 2) return [];
  return tokens.slice(0, MAX_NAME_TOKENS);
}

/**
 * True when every token appears somewhere in `name`, in any order.
 *
 * Substring per token rather than whole-word equality, so a partial query keeps
 * working: "ניל אגס" still finds "אגסי נילי".
 */
export function nameMatchesAllTokens(
  name: string | null | undefined,
  tokens: string[],
): boolean {
  if (!name || tokens.length === 0) return false;
  const haystack = name.toLowerCase();
  return tokens.every((token) => haystack.includes(token));
}
