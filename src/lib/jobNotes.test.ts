import { describe, expect, it } from 'vitest';
import { joinJobNotes, splitJobNotes, withEditedNotes } from './jobNotes';

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

// The הערות box in the day-approval / day-detail dialog edits the notes half only.
// Before this, it was seeded with the whole joined string, so text typed into a field
// labelled "הערות" was written back as the DESCRIPTION — and on a calendar row with no
// customer_name the description is the name on the monthly board, so a note renamed the job.
describe('technician notes editor', () => {
  // The real row from the report: a calendar title with no separator in it.
  const CALENDAR_ROW = 'קומה 3 דירה 22      חוץ+תלת';

  it('seeds the box EMPTY for a row that has no notes yet', () => {
    // Not the description — that is the whole point.
    expect(splitJobNotes(CALENDAR_ROW).notes).toBe('');
  });

  it('seeds the box with the notes half when there are notes', () => {
    expect(splitJobNotes('תיאור | לתאם מראש').notes).toBe('לתאם מראש');
  });

  describe('withEditedNotes', () => {
    it('keeps a separator-free description intact when notes are added', () => {
      expect(withEditedNotes(CALENDAR_ROW, 'להביא סולם')).toBe(
        `${CALENDAR_ROW} | להביא סולם`,
      );
    });

    it('replaces existing notes without touching the description', () => {
      expect(withEditedNotes('תיאור | ישן', 'חדש')).toBe('תיאור | חדש');
    });

    it('clearing the notes leaves the description alone', () => {
      expect(withEditedNotes('תיאור | ישן', '')).toBe('תיאור');
      expect(withEditedNotes(CALENDAR_ROW, '')).toBe(CALENDAR_ROW);
    });

    it('never lets typed text become the description', () => {
      // Whatever is typed, the first half is unchanged — the board label is safe.
      for (const typed of ['אבי פרטוש', 'קומה 3', '', 'a | b']) {
        expect(splitJobNotes(withEditedNotes(CALENDAR_ROW, typed)).description).toBe(
          CALENDAR_ROW,
        );
      }
    });

    it('handles a missing joined string', () => {
      expect(withEditedNotes(undefined, 'הערה')).toBe('הערה');
      expect(withEditedNotes(null, '')).toBe('');
    });
  });
});
