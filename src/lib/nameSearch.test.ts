import { describe, expect, it } from 'vitest';
import {
  MAX_NAME_TOKENS,
  nameMatchesAllTokens,
  nameSearchTokens,
} from './nameSearch';

describe('nameSearchTokens', () => {
  it('returns nothing for a single-word query, so single-word search is untouched', () => {
    expect(nameSearchTokens('אגסי')).toEqual([]);
    expect(nameSearchTokens('  אגסי  ')).toEqual([]);
    expect(nameSearchTokens('')).toEqual([]);
  });

  it('splits a two-word query into tokens', () => {
    expect(nameSearchTokens('נילי אגסי')).toEqual(['נילי', 'אגסי']);
  });

  it('lowercases latin tokens', () => {
    expect(nameSearchTokens('Nili AGASSI')).toEqual(['nili', 'agassi']);
  });

  it('drops tokens shorter than the minimum', () => {
    // A single letter would AND-match a large share of the table.
    expect(nameSearchTokens('א אגסי')).toEqual([]);
    expect(nameSearchTokens('נילי א אגסי')).toEqual(['נילי', 'אגסי']);
  });

  it('splits on punctuation and collapses whitespace', () => {
    expect(nameSearchTokens('אגסי,  נילי')).toEqual(['אגסי', 'נילי']);
    expect(nameSearchTokens('בן-גוריון דוד')).toEqual(['בן', 'גוריון', 'דוד']);
  });

  it('keeps digits as tokens', () => {
    expect(nameSearchTokens('דירה 12')).toEqual(['דירה', '12']);
  });

  it('caps the number of tokens', () => {
    const many = 'אחד שתיים שלוש ארבע חמש שש';
    expect(nameSearchTokens(many)).toHaveLength(MAX_NAME_TOKENS);
  });

  it('never emits a character that is reserved in the PostgREST filter grammar', () => {
    const tokens = nameSearchTokens('a(b),c%d e_f');
    expect(tokens.every((t) => /^[0-9a-z\u0590-\u05FF]+$/.test(t))).toBe(true);
  });
});

describe('nameMatchesAllTokens', () => {
  const tokens = nameSearchTokens('נילי אגסי');

  it('matches the stored name in the opposite word order', () => {
    expect(nameMatchesAllTokens('אגסי נילי', tokens)).toBe(true);
  });

  it('matches the same word order', () => {
    expect(nameMatchesAllTokens('נילי אגסי', tokens)).toBe(true);
  });

  it('matches with other words in between', () => {
    expect(nameMatchesAllTokens('אגסי משה נילי', tokens)).toBe(true);
  });

  it('does not match when only one token is present', () => {
    expect(nameMatchesAllTokens('נילי כהן', tokens)).toBe(false);
    expect(nameMatchesAllTokens('אגסי משה', tokens)).toBe(false);
  });

  it('still allows partial words, so a half-typed query keeps working', () => {
    expect(nameMatchesAllTokens('אגסי נילי', nameSearchTokens('ניל אגס'))).toBe(true);
  });

  it('is case-insensitive', () => {
    expect(nameMatchesAllTokens('Agassi Nili', nameSearchTokens('nili agassi'))).toBe(true);
  });

  it('is false for an empty token list, so a single-word query falls through', () => {
    expect(nameMatchesAllTokens('אגסי נילי', nameSearchTokens('אגסי'))).toBe(false);
  });

  it('is false for a missing name', () => {
    expect(nameMatchesAllTokens(undefined, tokens)).toBe(false);
    expect(nameMatchesAllTokens(null, tokens)).toBe(false);
    expect(nameMatchesAllTokens('', tokens)).toBe(false);
  });
});
