import { describe, expect, it } from 'vitest';
import { NOT_SET, filterMonthLabel, hasExactLocation } from './customerDisplay';

// The customer details dialog renders these straight into the screen, so the "unset" cases
// matter as much as the happy path: a null filter month arrives from the DB as 0, and a
// customer whose address was typed by hand has no coordinates at all.

describe('filterMonthLabel', () => {
  it('names the month for 1–12', () => {
    expect(filterMonthLabel(1)).toBe('ינואר');
    expect(filterMonthLabel(8)).toBe('אוגוסט');
    expect(filterMonthLabel(12)).toBe('דצמבר');
  });

  // rowToCustomer maps a null filter_replacement_month to 0 — the trap this guard exists for.
  it('treats 0 as unset rather than indexing off the end of the month list', () => {
    expect(filterMonthLabel(0)).toBe(NOT_SET);
  });

  it('falls back for missing and out-of-range values', () => {
    expect(filterMonthLabel(undefined)).toBe(NOT_SET);
    expect(filterMonthLabel(13)).toBe(NOT_SET);
    expect(filterMonthLabel(-1)).toBe(NOT_SET);
    expect(filterMonthLabel(6.5)).toBe(NOT_SET);
  });
});

describe('hasExactLocation', () => {
  it('is true only when both coordinates are present', () => {
    expect(hasExactLocation({ lat: 32.07, lng: 34.77 })).toBe(true);
    expect(hasExactLocation({ lat: 32.07, lng: undefined })).toBe(false);
    expect(hasExactLocation({ lat: undefined, lng: 34.77 })).toBe(false);
    expect(hasExactLocation({ lat: undefined, lng: undefined })).toBe(false);
  });

  // 0,0 is a real (if unlikely) coordinate — it must not read as "no location".
  it('accepts zero coordinates', () => {
    expect(hasExactLocation({ lat: 0, lng: 0 })).toBe(true);
  });
});
