# Prompt for Claude Code — Tal Hermon promo video script

Paste everything below the line into Claude Code, run from the repo root.

---

You are acting as a product marketing director + video director. I need a **scene-by-scene
shooting script** for a 60–90 second promo video for this application (טל חרמון), which I built.

Before writing anything, **read the codebase and ground every claim in what actually exists.**
Do not invent features. Specifically:

1. Read `CLAUDE.md` and `CLAUDE_CODE_BRIEF.md` for the product/domain spec.
2. Map the real routes from `src/App.tsx` — list every page, which are admin-only, which are public.
3. For each page, open its component under `src/pages/` (and its main children in `src/components/`)
   and extract: what the screen actually shows, the **exact Hebrew UI strings** (headings, button
   labels, tab names, status chips), and what the primary user action on that screen is.
4. Read `src/hooks/useJobs.ts`, `src/lib/dbJobSync.ts`, and `src/lib/areas.ts` well enough to
   describe the scheduling logic and area-routing in plain language a non-technical buyer understands.
5. Note the real constraints baked into the product — Sunday–Thursday working days, 09:00–17:00,
   two technicians (שילה, נריה) based in אבני חפץ, service tracks, the "ממתינים לשיבוץ" pool,
   and the customer confirmation flow at `/confirm`.

## Video parameters

- **Audience:** Hebrew-speaking buyers — owners/managers of water-treatment service companies.
  This is a sales/demo video, not internal training.
- **Language:** Hebrew narration, Hebrew on-screen text, RTL. Write the actual Hebrew VO copy —
  natural spoken Hebrew, not translated-from-English Hebrew.
- **Length:** 60–90 seconds, roughly 8–11 scenes.
- **Style:** Real screen recording of the app as the hero, with motion-graphics callouts,
  zooms, and kinetic text overlays. Credibility comes from showing the actual product.
- **Arc:** cold-open on the pain (paper/WhatsApp/Excel chaos of dispatching technicians) →
  the app as the answer → 3 strongest capabilities → the customer-facing confirmation moment →
  close with the outcome and a CTA.

## Deliverable

Write to `docs/video/promo-script.md`. Structure it as follows.

### Part 1 — Creative rationale (short)
Half a page: the core promise, who it's for, the one idea the viewer must retain, and why
these scenes in this order. State explicitly which features you chose to *cut* and why —
a 75-second video cannot show everything.

### Part 2 — Scene table
One row per scene. Columns:

| # | Timecode | On-screen (exact route + exact Hebrew UI text visible) | Action / camera move | Motion-graphic overlay | Hebrew VO | On-screen text |

Rules for this table:
- **Timecodes must sum to the target length.** Show a running total.
- The "on-screen" column must name a real route (e.g. `/work-schedule`) and quote real Hebrew
  strings pulled from the source. If a string isn't in the code, don't put it in the table.
- Camera moves should be specific and achievable in a screen recording: "slow 1.2× push into the
  Sunday column", "horizontal whip-pan between technician lanes", "cursor drags job card from
  ממתינים לשיבוץ onto נריה's Tuesday slot", not "dynamic movement".
- VO copy per scene should be speakable in the allotted time — roughly 2.5 Hebrew words per second.
  Put the word count next to each VO line so I can verify.
- Remember RTL: motion should generally read right-to-left, and text should enter from the right.

### Part 3 — Capture list
A numbered, literal list of what I need to record, in the order I should record it. For each:
the route, the exact app state required (which job, which technician, which date, seeded how),
the clicks to perform, and the duration to record. Assume I'm running `pnpm dev` on
`http://localhost:8080` with realistic seed data. Flag anywhere the demo data currently looks
too sparse or too fake to film, and tell me what to seed instead.

### Part 4 — Production notes
- Recommended resolution/aspect ratio, and a 9:16 variant plan if the 16:9 cut needs one.
- Hebrew font and type-treatment guidance consistent with the app's theme tokens
  (`src/index.css`, `@theme inline`) — name the actual tokens/colors to use for overlays
  so the graphics match the product.
- Music/pacing direction, and where the beats should land.
- A B-roll shot list for any non-UI footage (field technician, filter install, van) — describe
  each shot in enough detail to hand to an AI video generator as a prompt.
- Anything in the video that would be a **claim I can't back up** — flag it so I can cut it.

## Constraints

- Do not modify any application code. This task only creates documentation under `docs/video/`.
- Every feature shown must be verifiably present in the codebase. If you're unsure whether
  something works end-to-end, say so in the rationale rather than putting it in the script.
- If the codebase reveals a genuinely stronger story than the arc I proposed above, tell me
  before you write the full script.
