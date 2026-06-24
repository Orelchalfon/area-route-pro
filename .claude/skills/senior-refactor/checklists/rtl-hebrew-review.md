# Checklist — RTL & Hebrew review

This app ships a Hebrew, right-to-left UI. Refactors must **preserve** RTL
behavior and Hebrew copy exactly. A "clean" refactor that breaks direction or
mojibakes Hebrew text is a regression.

## Text integrity

- [ ] Hebrew strings are preserved **byte-for-byte** when moving code. Never
      retype Hebrew from memory — copy it.
- [ ] Files stay UTF-8; no encoding corruption (mojibake) introduced by edits.
- [ ] User-facing strings are not accidentally translated, reordered, or trimmed.
- [ ] Consider centralizing repeated strings into a constants file **only** if it
      doesn't risk altering the text — otherwise leave inline.

## Direction & layout

- [ ] `dir="rtl"` (on `<html>`, a provider, or container) is preserved.
- [ ] Use **logical** CSS properties / Tailwind logical utilities (`ms-*`, `me-*`,
      `ps-*`, `pe-*`, `start-*`, `end-*`) instead of hard `left/right` where the
      repo already does — don't flip layouts by switching to physical sides.
- [ ] Icons/chevrons that imply direction (back/forward, expand) point correctly
      for RTL; don't "fix" them to LTR.
- [ ] Flex/grid order isn't inverted by a refactor; verify visually if unsure.

## Numbers, dates, formatting

- [ ] Date formatting (`date-fns`) keeps its locale/format; don't switch locales.
- [ ] Numbers, phone numbers, and currency keep their intended direction (often
      LTR embedded in RTL text via `dir="ltr"` spans) — preserve those wrappers.

## Inputs & forms

- [ ] Text inputs keep correct `dir`/alignment for Hebrew.
- [ ] Mixed LTR content (emails, URLs, phone) keeps its `dir="ltr"` treatment.

## How to verify

- [ ] After splitting a component, diff the rendered strings — no Hebrew changed.
- [ ] Visually check the app (`pnpm dev`) for any layout flip on touched screens.
