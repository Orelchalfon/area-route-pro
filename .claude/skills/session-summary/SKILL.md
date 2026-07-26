---
name: session-summary
description: Produce a numbered summary of everything accomplished in the current session and save it to sessions/[name].txt. Use when the user asks for a session recap, an end-of-session report, "סיכום סשן", "מה עשינו/מה בוצע", or a report to forward to stakeholders (e.g. Tal Hermon).
---

# Session Summary

When invoked, review what happened in the current session, produce a concise **numbered** summary
(1. 2. 3. …), **print it inline**, and **save it to a file**.

## Output rules

- Write in **Hebrew** by default (the user forwards these as reports to Tal Hermon). Switch to English only if the user asks.
- Number each item: `1.`, `2.`, `3.`, …
- Each item = one concrete change/feature, in **plain, non-technical language** focused on what the user/company gains — not code internals, file names, or function names.
- Keep it tight: one line per item, roughly 3–8 items. Fold tiny related changes into a single item.
- If verification ran (tests / type-check / build / lint), add a short final line stating it passed.
- Summarize **only what actually happened this session**. Never invent or pad with work that wasn't done. If nothing substantive was done, say so.

## Save to file (always)

After composing the summary:

1. **Filename** — `<YYYY-MM-DD>-<topic-slug>.txt`, where the date is today and `<topic-slug>` is a
   short kebab-case English slug of the session's main topic (e.g. `service-cycle-editing`). If the
   user passed an explicit name argument (see below), use `<that-name>.txt` instead.
2. **Write** the summary as UTF-8 to `./sessions/<filename>` **relative to the current project's
   working directory** (NOT the skill folder), using the Write tool — it creates the `sessions/`
   folder automatically. Write the same content shown inline (the numbered list + the verification
   line), with a title line at the top.
3. **Keep it out of git** — if the project has a `.gitignore` that does not already ignore
   `sessions/`, append a `sessions/` line to it. (Skip silently if there is no `.gitignore`.)
4. **Report the path** on the last line, e.g. `נשמר: sessions/2026-07-09-service-cycle-editing.txt`.

## Arguments (optional)

Modifiers (do not become the file name):
- `technical` → include the affected files/components and a brief "how".
- `english` → write the summary in English.
- `short` → 1–3 lines, headline-level only.

Any other single token is treated as the **explicit file name** (saved as `sessions/<token>.txt`),
e.g. `/session-summary talhermon-report` → `sessions/talhermon-report.txt`.
