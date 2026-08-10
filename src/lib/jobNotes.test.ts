import { describe, expect, it } from 'vitest';
import { joinJobNotes, splitJobNotes } from './jobNotes';

describe('splitJobNotes', () => {
  it('splits a joined description + notes on the first separator', () => {
    expect(splitJobNotes('החלפת פילטר | הלקוח ביקש אחה״צ')).toEqual({
      description: 'החלפת פילטר',
      notes: 'הלקוח ביקש אחה״צ',
    });
  });

  it('keeps later separators inside the notes half', () => {
    expect(splitJobNotes('תיאור | הערה א | הערה ב')).toEqual({
      description: 'תיאור',
      notes: 'הערה א | הערה ב',
    });
  });

  it('treats a value with no separator as description only', () => {
    expect(splitJobNotes('תקלה בברז')).toEqual({ description: 'תקלה בברז', notes: '' });
  });

  it('handles undefined / empty input', () => {
    expect(splitJobNotes(undefined)).toEqual({ description: '', notes: '' });
    expect(splitJobNotes('')).toEqual({ description: '', notes: '' });
  });
});

describe('joinJobNotes', () => {
  it('joins both halves with the separator', () => {
    expect(joinJobNotes('תיאור', 'הערה')).toBe('תיאור | הערה');
  });

  it('drops an empty half instead of leaving a dangling separator', () => {
    expect(joinJobNotes('תיאור', '')).toBe('תיאור');
    expect(joinJobNotes('', 'הערה')).toBe('הערה');
    expect(joinJobNotes('', '')).toBe('');
  });
});

describe('round-trip', () => {
  // The bug this guards: the old code wrote the joined string back into `notes`, so a
  // save → refetch duplicated the description. split → join must be stable instead.
  it.each([
    'תיאור | הערה',
    'תיאור בלבד',
    'תיאור | הערה א | הערה ב',
    '',
  ])('is stable for %j', (value) => {
    const { description, notes } = splitJobNotes(value);
    expect(joinJobNotes(description, notes)).toBe(value);
  });
});
