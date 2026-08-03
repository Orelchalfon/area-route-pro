# טל חרמון — promo video shooting script

**Length:** 1:15 (75s) · **9 scenes** · **Hebrew VO, Hebrew on-screen text, RTL**
**Audience:** owners/managers of Israeli water-treatment service companies
**Grounding rule:** every Hebrew string quoted below is copied from source, with `file:line`. Nothing here is invented.

---

## Part 1 — Creative rationale

### The core promise

> **כל העבודה של החודש על לוח אחד — ומהלוח היא יוצאת לטכנאי וללקוח.**

Not "software for your business." One specific, provable claim: the work stops living in three
places (paper, WhatsApp threads, a spreadsheet) and starts living on one board that the manager
controls and the technician receives.

### The one idea the viewer must retain

**The manager decides, the board distributes.** Nothing reaches a technician or a customer until
the manager approves the day. That is genuinely how the product works — `approveDaySchedule`
(`src/hooks/useJobs.ts:512`) is what flips jobs to `confirmed`, and the technician's day only
appears after `approveDay` writes to `approved_schedule_days` (`DailyRoutePage.tsx:41`). It is
also the strongest sales point for this buyer, who is not looking for autonomy — they are looking
to stop losing calls.

### Why this order

The arc moves along the actual life of one job: it arrives (scene 3), gets scheduled (4), gets
sequenced (5), reaches the customer (6), reaches the technician (7), and closes back into next
year's schedule (8). A capability montage would show more features and land less; following one
job means the viewer never has to be told how the pieces connect, they watch it happen.

### ⚠️ One change from the brief, and why

**The brief made `/confirm` — the customer confirmation page — the climax. It cannot be, and I
have replaced it with the WhatsApp flow.**

`src/pages/CustomerConfirmation.tsx` is a 106-line static mockup. It has no `supabase` import and
makes no network call of any kind; both buttons call `setStatus('confirmed')` / `setStatus('reschedule')`
(`:89`, `:97`) — pure local React state that resets on reload. Its fallback data is fake
(`שרה גולדשטיין`, `דוד כהן` at `:11-14` — and דוד כהן is not a technician in this system; the two
technicians are שילה and נריה, `src/data/technicians.ts:4-5`). It carries an `"FS"` placeholder
logo (`:65`), not טל חרמון branding. **And nothing in the app links to it** — grepping `/confirm`
across `src/` returns exactly one hit, the route declaration at `App.tsx:55`. A customer has no
way to arrive at that page. Filming it and saying "the customer confirms and you see it" would be
a claim you could not survive a demo call on.

**The real customer-facing flow is WhatsApp, and it makes better footage.** Once a day is approved,
`DayApprovalDialog.tsx:239-259` renders a green `תאם בוואטסאפ` button beside every stop, deep-linking
to `wa.me` with a message already written and signed in the company's name (`:244`):

> היי {שם הלקוח} מדברים מטל חרמון רצינו לתאם פגישה לשבוע הבא בתאריך {תאריך} בשעה {שעה} ,אנא אשר הגעת טכנאי.

A real green WhatsApp thread opening with real Hebrew already in the compose box is a more
convincing 8 seconds than any mock form — and this buyer already coordinates on WhatsApp, so it
reads as "this fits how I work" rather than "here is another system."

### What I cut, and why

| Cut | Reason |
|---|---|
| **`חלוקה חכמה`** (`/customers`) | The name oversells the code. `SmartDistributionDialog.tsx:52` is `[...eligibleCustomers].sort(() => Math.random() - 0.5)` — a random shuffle into a fixed 50% / 16.6% × 3 split, with no input from the customer's product, history, or location. A buyer who asks "how does it decide?" gets an answer that costs you the deal. Not worth 8 seconds. |
| **`/confirm`** | Non-functional (above). |
| **`/service` annual grid, `/work-schedule` two-week view, `/daily-route` planner, `/customers`, `/users`** | All real and all working — but a 75-second cut cannot carry nine screens without becoming a feature list. They are named on the closing card instead of shown. If you later want a 2:30 long-form cut, `/service` (the 12-month cycle view) is the first one to add back. |
| **Any "optimisation" language** | See Part 4 — there is no route optimiser in this codebase. Cutting the word protects the whole video's credibility. |

### Two things I could not verify end-to-end

- **`אשר יום ושלח הודעות ללקוחות`** (`DayApprovalDialog.tsx:300`) does not itself send anything.
  Approving reveals the per-customer WhatsApp buttons; the manager clicks each one. The VO in
  scene 6 is written to say exactly that. See Part 4, claim #1.
- **The dashboard subtitle** `שירות שוטף מתוזמן אוטומטית לפי חודש קבוע ללקוח` (`AdminDashboard.tsx:19`)
  appears on screen in scene 2. It is **not narrated as a claim**, because the auto-*distribution*
  it implies is dead code. What is real — and what scene 8 narrates instead — is auto-*generation*
  and auto-*renewal*. See Part 4, claim #3.

### Note on the repo docs

`CLAUDE.md` is stale in ways that would mislead anyone scripting from documentation rather than
code: `src/data/mockData.ts`, `useICSImport`, `public/contacts.csv`, `public/calendar_1.ics` and
the entire `supabase/` directory no longer exist. (`useJobs.ts:341` still falls back to
`fetch("/contacts.csv")`, which will 404 if the customers table is ever empty — worth a look,
separately from this video.) Everything in this script was read from source, not from the docs.

---

## Part 2 — Scene table

VO budget: ~2.5 Hebrew words/second. Word counts are marked `[n]` and every line is within budget.
**Total VO: 152 words across 75 seconds.**

| # | Timecode (running) | On-screen — route + exact Hebrew UI text | Action / camera move | Motion-graphic overlay | Hebrew VO | On-screen text |
|---|---|---|---|---|---|---|
| **1** | 0:00–0:07 (0:07) | No UI. B-roll only — see Part 4 shot B1. | Handheld, slightly loose. Three hard cuts at 0:00 / 0:02.5 / 0:05: crumpled work order on a desk → phone showing a chaotic WhatsApp group → a spreadsheet with a half-filled column. Each held ~2.3s. | Nothing until 0:05. At 0:05 three small amber tags (`--accent`) snap in **from the right**, stacking: `דף`, `וואטסאפ`, `אקסל` — then all three shatter outward on the cut to scene 2. | «דף פה, וואטסאפ שם, אקסל שאף אחד לא מעדכן. ככה מנהלים יום עבודה של שני טכנאים בשטח?» **[17]** | — (tags only) |
| **2** | 0:07–0:14 (0:14) | `/` — `ניהול לו״ז חודשי` (`AdminDashboard.tsx:17`), subtitle `שירות שוטף מתוזמן אוטומטית לפי חודש קבוע ללקוח. תקלות והתקנות משובצות ידנית.` (`:19`), nav `לוח בקרה` (`AppLayout.tsx:33`), stat tiles `שירות שוטף` · `משובצים ידנית` · `ממתינים לשיבוץ` (`MonthlyScheduleBoard.tsx:753-756`) | Start at 130% scale centred on the month grid, **pull back** to 100% over 2.5s to reveal the full board. Hold 2s. Then a slow 1.15× push into the three stat tiles. | On the pull-back, the day cells fade up in a **right-to-left cascade** (Sunday column last), ~40ms apart. At 0:11 a thin teal keyline (`--secondary`) draws around the three stat tiles, right to left. | «טל חרמון מרכזת את כל העבודה של החודש על לוח אחד. תקלות, התקנות ושירות שוטף — במקום אחד.» **[17]** | Lower-third, enters from the right at 0:08: **לוח אחד לכל החודש** |
| **3** | 0:14–0:24 (0:24) | `/malfunctions` — `מאגר תקלות` (`JobCategoryPage.tsx:37`), `ממתינים: {n}` / `שובצו: {n}` (`:188,192`), section heading **`ממתינים לשיבוץ ({n})`** (`:239`), then `שובצו בלוח ({n})` (`:248`); button `פתח תקלה` (`OpenJobDialog.tsx:35`), dialog `פתיחת תקלה` (`:36`), footer `הפנייה תישמר ב"ממתינים לשיבוץ" — שבץ אותה ללוח כשתרצה.` (`:218`) | Cut in on the `ממתינים לשיבוץ` heading at 110%. Cursor clicks `פתח תקלה`; dialog slides in. Fill only `שם` and `טלפון` (pre-typed in one take — do not film slow typing), click `שמור תקלה`. Snap-cut back to the pool; the new row is now top of `ממתינים לשיבוץ` and the counter ticks up. | At 0:16 an amber pill (`--accent`) grows leftward out of the `ממתינים לשיבוץ` heading reading **המאגר**. At 0:22 the new row gets a 2px amber left-edge flash that decays over 400ms. Freeze-highlight the footer line `הפנייה תישמר ב"ממתינים לשיבוץ"` at 0:20 with a soft dark plate behind it. | «כל פנייה חדשה נכנסת למאגר ונשארת שם עד שאתה משבץ אותה. שום דבר לא נופל בין הכיסאות, ושום דבר לא קופץ ללוח בלי שאישרת.» **[24]** | Right-entering at 0:21: **הפנייה מחכה לך — לא ללוח** |
| **4** | 0:24–0:34 (0:34) | `/` — technician toggle `שילה` / `נריה` (`MonthlyScheduleBoard.tsx:795`), day-cell area chip `בחר אזור` (`:1097`), popover `בחר אזורים ליום:` (`:1115`) with area names `שומרון`, `השרון`, `גוש דן` (`lib/generated/settlementAreas.ts:4-13`), then `הוספת משימה — {יום}` (`UnifiedJobPickerDialog.tsx:174`) with tabs `תקלות ({n})` · `התקנות ({n})` · `שירות ({n})` (`:189-197`) and search `חיפוש לפי שם / טלפון / תיאור / עיר...` (`:205`) | Three deliberate clicks, no cuts between them: (a) cursor taps `נריה` — the board repaints; (b) taps `בחר אזור` on Tuesday, ticks `שומרון`; (c) taps the `+` on that day, dialog opens on `תקלות`, cursor clicks two rows, clicks `הוסף`. Camera holds wide through (a)–(b), then pushes 1.2× into the dialog for (c). | On (b), as `שומרון` is ticked, non-matching rows in the picker **dim to 35% and slide 12px right** before disappearing — make the filter visible, don't just let rows vanish. On (c), a teal counter badge over the `הוסף` button counts `1 → 2` in sync with the clicks. | «בוחר טכנאי, בוחר יום, בוחר אזור — והמערכת מציגה רק את הפניות שנמצאות שם. האזור נקבע לפי העיר של הלקוח, אוטומטית.» **[20]** | At 0:31, right-entering: **האזור נגזר מהעיר — לא מהקלדה** |
| **5** | 0:34–0:44 (0:44) | `/` → `אישור לו״ז — {יום}` dialog (`DayApprovalDialog.tsx:125`), hint `גרור לשינוי סדר` (`:128`), summary `{n} משימות` and `10:00 – …` (`:152-155`), per-row `{סוג} · {n} דק׳` (`:216`), map on the left | Open the dialog on the day built in scene 4. Hold 1.5s on the split (map ‖ list). Then: **cursor grabs stop #3 and drags it above stop #1** — hold the drag ~1.2s so the `ring-2 ring-primary` drop indicator reads on camera. On release, the map polyline redraws and the time column re-flows. Push 1.3× into the time column for the last 2s. | As the drag lands, the numbered badges `1 2 3 4` re-number with a 150ms flip each, **right to left**. The re-flowing times (`10:00 – 10:20`, `10:20 – 11:20`…) get a brief amber underline that sweeps right-to-left across the column. Do **not** overlay anything on the map itself. | «היום שלם מול העיניים — על מפה. גורר את העצירות לסדר שאתה רוצה, והשעות מסתדרות לבד.» **[15]** | At 0:41, right-entering over the time column: **השעות מתחשבנות מחדש** |
| **6** | 0:44–0:53 (0:53) | Same dialog → CTA `אשר יום ושלח הודעות ללקוחות` (`:300`) → banner `✓ יום זה אושר — הודעות נשלחו ללקוחות` (`:305`) → green `תאם בוואטסאפ` buttons (`:256`) → **cut to phone**: WhatsApp compose with the real message (`:244`) | Cursor clicks the green CTA. **Do not cut** — hold on the list as the WhatsApp buttons fade+slide in per row (the app already animates this: `animate-in fade-in slide-in-from-top-2`). Click the top one. Hard cut to a phone screen recording: WhatsApp open, contact name visible, message already in the compose box. Thumb taps send. Hold 1s on the sent bubble. | On the CTA click, a single `--success` ripple expands from the button. As each WhatsApp button appears, a 1-frame `#25D366` flash on its row. On the phone cut, the message text types on in a **right-to-left** reveal (~5 chars/frame) before the thumb taps send — this is the money shot, let it breathe. | «מאשר את היום — ולכל לקוח יש כפתור וואטסאפ עם ההודעה כבר מוכנה. לחיצה אחת לכל לקוח, וההודעה יוצאת.» **[18]** | On the phone at 0:50, entering from the right: **התיאום — בוואטסאפ שהלקוח כבר מכיר** |
| **7** | 0:53–1:03 (1:03) | `/technician` — hero `{שם הטכנאי}` + `{אזור} · פילטרים, התקנות, תקלות` (`TechnicianView.tsx:136-137`), tiles `פעילות` / `הושלמו` (`:171,176`), banner `הבא בתור ב-{שעה}` (`:203`), heading `משימות פעילות` (`:212`), green `וואטסאפ — בדרך אליך` (`:233`), and the three buttons **`בוצע`** / **`לא בוצע`** / **`צריך לחזור`** (`:251,260,269`); completion dialog `סימון כבוצע` (`technician-view/CompletionDialog.tsx:27`) with `הוסף הערות...` (`:33`) and `אישור` (`:50`) | Phone screen recording, portrait, held in hand. Scroll down one short flick to the first active job card. Thumb taps **`בוצע`** → dialog → thumb taps `אישור`. The card animates into the `דווחו ({n})` section (`:284`) with the `✓ בוצע` chip. Then a quick 0.8s beat: scroll to a card on a locked day showing `יום זה נעול לעריכה על ידי המנהל` (`:241`). | The three buttons get a staggered right-to-left highlight sweep at 0:56 (green, red, amber in turn) before the thumb commits. On the lock beat, a small navy plate (`--primary`) slides in from the right: **המנהל נעל — הטכנאי לא משנה**. | «הטכנאי פותח את הטלפון ורואה רק את היום שלו. בוצע, לא בוצע, צריך לחזור — שלושה כפתורים, והדיווח חוזר אליך מיד.» **[20]** | At 0:55: **שלושה כפתורים. זה כל הדיווח.** |
| **8** | 1:03–1:11 (1:11) | `/` — `סיכום יום` button (`AdminDashboard.tsx:25`) → `סיכום יום עבודה` (`DailySummaryDialog.tsx:120`), `פקודות שבוצעו היום ({n})` (`:154`), bullet `{n} החלפות פילטר נסגרו — שירות הבא תוזמן לשנה הבאה` (`:235`), CTA `אישור וסיום יום עבודה` (`:198`) | Cut back to desktop. Cursor clicks `סיכום יום`. The dialog opens; **push 1.25× onto the bullet line** about next year's service and hold it 2.5s — this is the retention argument, give it the room. Cursor moves to `אישור וסיום יום עבודה` but the scene cuts before the click. | The bullet line gets a navy plate and the words `לשנה הבאה` are boxed in amber, drawn right-to-left. A small calendar glyph arcs from the current month to the same month next year — one clean 600ms move, no spin. | «בסוף היום — סיכום אחד. וכל החלפת פילטר שנסגרה כבר קבועה מחדש לשנה הבאה.» **[13]** | At 1:07: **לקוח שנסגר היום כבר קבוע לשנה הבאה** |
| **9** | 1:11–1:15 (1:15) | Brand only. No app UI. | Static. Logo settles centre from a 4px rise. | Logo, wordmark `טל חרמון`, then a single line of supporting text entering from the right. Hold 2s on the final frame with contact details. | «טל חרמון. כל היום שלך, על לוח אחד.» **[8]** | **טל חרמון**<br>ניהול שירות שדה — מהפנייה ועד הדיווח<br><small>לוז חודשי · מאגר פניות · מפת יום · אפליקציית טכנאי · כרטיסי לקוחות</small><br>{טלפון / אתר} |

**Running total check:** 7 + 7 + 10 + 10 + 10 + 9 + 10 + 8 + 4 = **75s = 1:15** ✓
**VO check:** 17+17+24+20+15+18+20+13+8 = **152 words** over 75s = 2.03 w/s, comfortably inside the 2.5 w/s ceiling with room to breathe on scenes 5 and 8.

---

## Part 3 — Capture list

Recorded in this order. Assumes `pnpm dev` on `http://localhost:8080`, logged in as the admin,
browser at 1920×1080 with bookmarks bar hidden and zoom at 100%.

### Pre-flight state checklist — do this before you press record

The repo no longer ships mock data (`src/data/mockData.ts` is gone; only `src/data/technicians.ts`
remains, with שילה and נריה). Everything comes live from Supabase, so what you need is not seeded
*data* but seeded *state*. Confirm all six before filming:

1. **≥1 unassigned malfunction** visible under `ממתינים לשיבוץ` on `/malfunctions`, so the section
   is not empty when you cut to it.
2. **One target day with ≥4 stops across ≥2 different cities.** Fewer than 4 and the map polyline
   looks trivial; one city and the route reads as a dot. Pick a day whose customers are in שומרון
   plus one neighbouring area so the map shows actual travel.
3. **That target day must NOT be approved yet** when you start scene 6 — the whole shot is the
   approve → WhatsApp-buttons-appear transition. If you've already approved it, use
   `בטל אישור יום` (`DayApprovalDialog.tsx:325`) and choose **`לא, רק בטל אישור`** (`:357`) so you
   don't wipe the technician's completion reports you need for scene 8.
4. **A second day, already approved AND locked**, on the other technician — this is what scene 7's
   lock beat films (`יום זה נעול לעריכה על ידי המנהל`, `TechnicianView.tsx:241`).
5. **At least one customer on the target day with a real, valid Israeli phone.** The
   `תאם בוואטסאפ` button only renders if `normalizeIsraeliPhone(phone)` returns non-null
   (`DayApprovalDialog.tsx:241-242`) — a customer with a junk or missing phone silently has **no
   button**, and you will not find out until you're mid-take. Check the row shows `📱` (`:235`).
6. **≥1 job already marked `בוצע`** on some day, so `משימות להמשך` (`FollowUpTasksPopover.tsx:167`)
   exists if you want the optional pickup, and so `סיכום יום` has content instead of showing
   `לא בוצעו פקודות היום` (`DailySummaryDialog.tsx:190`).

### Three filming cautions — all code-verified, all will bite you

- **Area selections are NOT persisted.** `dayAreaOverrides` is plain component state
  (`MonthlyScheduleBoard.tsx:350`) and is wiped both on page refresh **and on switching technician**
  (`:790`). Scene 4 must therefore be **one unbroken take** — select the technician, then the area,
  then open the picker, without reloading. If you reload mid-setup, every `בחר אזור` resets.
- **Map pins are frequently approximate.** `customerCoords.ts:183-188` falls back to a city
  centroid plus a deterministic ID-derived jitter for addresses it can't resolve. **Never zoom
  tight on a single pin**, and never narrate a pin as the customer's exact location. Wide map
  framing only — which is what scene 5 calls for anyway.
- **Keep `/*` (NotFound) off camera.** `src/pages/NotFound.tsx` is English-only (`404`,
  `Oops! Page not found`) — a mistyped URL on screen breaks the Hebrew-product illusion instantly.

### Shot list

| # | Scene | Route | Required state | Clicks to perform | Record |
|---|---|---|---|---|---|
| **1** | 2 | `/` | Current month, technician `נריה` selected, board populated | None — just land on the page and let it settle. Record twice: once static, once with a slow scroll-free hold. | **20s** (you need 7s; over-record for the pull-back timing) |
| **2** | 3a | `/malfunctions` | ≥1 row in `ממתינים לשיבוץ` | Land on page. Slow-scroll so `ממתינים לשיבוץ ({n})` sits centre-frame. Hold 4s. | **15s** |
| **3** | 3b | `/malfunctions` | Same | Click `פתח תקלה` → dialog. **Paste** name + phone (don't type live — typing is slow and error-prone on camera). Click `שמור תקלה`. Stay on the resulting pool view 3s. | **25s** |
| **4** | 4 | `/` | Target day empty of manual jobs; ≥3 unassigned malfunctions in that area | **One take, no reload:** click `נריה` → click `בחר אזור` on the target Tuesday → tick `שומרון` → close popover → click `+` on that day → dialog opens on `תקלות` → click 2 rows → click `הוסף`. | **45s** |
| **5** | 5 | `/` | The day from shot 4, now with ≥4 stops, **not approved** | Click the day's green check to open `אישור לו״ז`. Hold 3s on the split view. Drag stop #3 above stop #1 — **slowly**, ~1.2s of travel. Release. Hold 4s on the re-flowed times and redrawn map. | **35s** |
| **6** | 6a | `/` | Same dialog still open, still unapproved | Click `אשר יום ושלח הודעות ללקוחות`. **Do not move the mouse for 2s** — let the green `תאם בוואטסאפ` buttons animate in. Then click the topmost one. WhatsApp Web/desktop opens in a new tab. | **25s** |
| **7** | 6b | — | WhatsApp on a phone, with the same customer thread | **Phone screen recording, portrait.** Open the `wa.me` link on the phone so the message is pre-filled in the compose box. Frame so the contact name and the full Hebrew message are readable. Thumb taps send. Hold 2s on the sent bubble. | **20s** |
| **8** | 7a | `/technician` | Phone, logged in as the technician; the approved day selected; ≥2 active jobs | **Phone screen recording, portrait, handheld.** Land on the day. Short flick-scroll to the first active card. Tap `בוצע` → dialog `סימון כבוצע` → tap `אישור`. Watch the card move into `דווחו`. | **30s** |
| **9** | 7b | `/technician` | The locked day (pre-flight #4) | Switch to the locked day in the week strip. Scroll so `יום זה נעול לעריכה על ידי המנהל` is centred. Hold 3s. | **12s** |
| **10** | 8 | `/` | ≥1 filter job closed today | Click `סיכום יום`. Let the dialog settle. Scroll (if needed) so the `{n} החלפות פילטר נסגרו — שירות הבא תוזמן לשנה הבאה` bullet is centred. Hold 5s. Move cursor toward `אישור וסיום יום עבודה` — **do not click**. | **25s** |
| **11** | 1, 9 | — | — | B-roll and end card — see Part 4. | per shot |

**Total screen-recording time to capture: ~4.5 minutes** for 60 seconds of cut UI footage. That
ratio is right; don't try to nail single takes.

---

## Part 4 — Production notes

### Resolution and aspect

**16:9 master:** 1920×1080, 60fps, screen recordings captured at native 1:1 (no browser zoom —
zoom in post, so text stays crisp). Record the browser with the URL bar visible: seeing
`localhost:8080/work-schedule` is fine, but if this is a sales cut, use a staging domain instead —
`localhost` reads as "not shipped."

**9:16 variant:** do **not** letterbox the 16:9. Re-cut it:

- Scenes **6b and 7** are already portrait phone recordings — they become the spine of the vertical
  cut and should be ~40% of its runtime.
- Scenes **2, 4, 5, 8** get re-framed to a **single day column** rather than the whole month grid,
  cropping to the calendar's vertical axis. The board is dense; scaled down to 9:16 full-width it
  becomes unreadable mush.
- Scene **3** re-frames tightly on the `ממתינים לשיבוץ` heading and the two rows below it.
- Vertical cut runs shorter: target **0:45**, dropping scene 1 to 4s and cutting scene 8 entirely.

### Type and colour

**Font: `Assistant`**, weights 400/500/600/700 — already loaded by the app
(`index.html:35`) and set as `--font-sans` (`src/index.css:11`). Use it for **all** Hebrew overlay
text so the graphics and the UI are the same typeface. Never substitute Arial Hebrew or Rubik;
the mismatch is visible in a side-by-side push.

Overlay palette, taken from the app's real light-theme tokens (`src/index.css:107-148`) so the
motion graphics read as part of the product rather than stuck on top of it:

| Use | Token | HSL | Hex ≈ |
|---|---|---|---|
| Base plates behind overlay text | `--primary` | `215 70% 28%` | `#15375A` |
| Callout keylines, secondary emphasis | `--secondary` | `175 60% 30%` | `#1F7A73` |
| **The single emphasis per scene** | `--accent` | `37 92% 55%` | `#F5A61F` |
| Confirm / done beats (scenes 6, 7) | `--success` | `152 62% 31%` | `#1E7F51` |
| Alert accents (scene 1 only) | `--destructive` | `0 72% 45%` | `#C52626` |
| Overlay text on plates | `--primary-foreground` | `210 40% 98%` | `#F7FAFC` |
| WhatsApp beat only | — | — | `#25D366` (`DayApprovalDialog.tsx:254`) |
| Brand / end card background | manifest `theme_color` | — | `#0f2747` |

**One amber emphasis per scene, maximum.** Amber is the "look here" colour; using it twice in a
scene means it points at nothing.

**RTL discipline:** every text overlay enters **from the right** and exits left. Underline and
keyline draws animate right-to-left. Numbered sequences flip right-to-left. This is not decoration —
a Hebrew-speaking viewer reads a left-entering overlay as backwards, and it registers as sloppy
even when they can't articulate why.

### Music and pacing

Restrained corporate-electronic, ~100–108 BPM, no vocal, no "inspiring piano." The product is a
dispatch tool, not a lifestyle brand.

- **0:00–0:07** — sparse, slightly tense, low-passed. Percussion only, no melody.
- **0:07** — **filter opens on the reveal.** This is the biggest single lift in the track and it
  must land exactly on the board pull-back.
- **0:07–0:44** — steady, unobtrusive, sits under the VO.
- **0:44** — **accent hit** on the `אשר יום` click.
- **0:53** — **second accent + brief 200ms duck** on the WhatsApp send. Let the send sound (if the
  phone recording has one) come through.
- **1:03** — soft lift into the closing section.
- **1:11–1:15** — resolve, tail out clean under the end card. No hard stop.

Cut every scene transition on a beat. Scenes 3 and 4 are the busiest; if the edit feels rushed,
steal a second from scene 1 rather than compressing scene 5's drag — the drag needs to be legible.

### B-roll shot list

Written as prompts for an AI video generator. All 16:9, 4–6s each, no on-screen text, no readable
faces of identifiable people.

**B1 — the cluttered dispatch desk (scene 1, cut 1)**
> Close-up, shallow depth of field, warm afternoon window light falling across a cluttered office
> desk in a small Israeli service business. A crumpled paper work order with handwritten Hebrew
> notes sits under a coffee mug ring. A pen, a stapler, and a spiral notebook with pages folded
> back. Slow 15cm handheld dolly left across the desk surface, gentle natural camera shake.
> Muted, slightly desaturated colour grade. No people, no faces. 5 seconds, 4K, 24fps.

**B2 — the overwhelmed phone (scene 1, cut 2)**
> Over-the-shoulder close-up of a man's hand holding a smartphone in a dim office, screen bright
> against the room. The screen shows a fast-scrolling messaging app conversation, text illegible
> and blurred by motion. His thumb scrolls rapidly, then pauses. Shallow depth of field, screen
> glow on the fingers. Camera static, subtle handheld drift. Cool colour grade. Face not visible.
> 4 seconds, 4K, 24fps.

**B3 — the van on the road (bridge, optional under scene 2)**
> Wide exterior tracking shot from a moving vehicle, following a small white service van driving
> along a two-lane road through dry hill country in the northern West Bank — pale limestone
> terraces, scattered olive trees, low scrub. Late-afternoon golden light, long shadows. Steady
> parallel tracking, van in the right third of the frame. Clean, warm, cinematic grade. No text or
> logos on the van. 6 seconds, 4K, 24fps.

**B4 — the technician at work (cutaway, scene 7)**
> Close-up, low angle from inside an under-sink cabinet looking out. A technician's hands in
> dark work gloves twist a white cylindrical water filter housing free from its mounting head;
> a few drops of water fall. Cool practical light from a headlamp raking across the pipes.
> Shallow depth of field on the hands, background kitchen soft and out of focus. Camera locked
> off, no movement. Neutral clean grade. No face visible. 5 seconds, 4K, 24fps.

Use **B1** and **B2** for scene 1. **B4** is a 0.8s cutaway inside scene 7 if the phone-only
footage feels flat — cut it in on the `בוצע` tap, not before. **B3** is optional; it's the first
thing to drop if the edit runs long.

---

## ⚠️ Claims you cannot back up — read before the VO session

Every one of these is something a viewer could reasonably infer from footage but which the code
does not support. They are listed most-damaging first. The script above already avoids all of
them; this section exists so nobody re-adds them in the edit.

**1. `אשר יום ושלח הודעות ללקוחות` does not send any messages.**
The button (`DayApprovalDialog.tsx:300`) calls `onApprove` → assignment + `approveDay`. Nothing is
transmitted. Worse, the post-approval banner then reads `✓ יום זה אושר — הודעות נשלחו ללקוחות`
(`:305`) — **the app's own UI overstates this.** What actually happens: a green `תאם בוואטסאפ`
button appears next to each stop (`:239-259`), and the manager clicks each one, which opens
WhatsApp with a pre-filled message he must then send by hand. No bulk send, no delivery tracking,
no scheduling.
→ **The scene-6 VO says «לחיצה אחת לכל לקוח» — keep it that way. Never «ההודעות יוצאות אוטומטית».**
→ Consider not holding on that banner at all; scene 6 is framed to cut past it to the buttons.
→ *Separately: that banner string is arguably a bug worth fixing in the product.*

**2. There is no route optimisation, and no travel time is budgeted.**
`useDirectionsRoute.ts:88` explicitly sets `optimizeWaypoints: false, // preserve user-defined order`.
The polyline follows exactly the order the manager dragged. Time slots are naive sequential
packing from 10:00 with each job's duration added (`MonthlyScheduleBoard.tsx:212`,
`monthly-schedule/utils.ts:70-85`) — **zero minutes are allocated for driving between stops.**
There is no distance matrix, no clustering, no nearest-neighbour anywhere in the repo.
→ Say **«רואים את היום על מפה ומסדרים בגרירה»**. Never «מסלול מיטבי», «אופטימיזציה», or
«חוסך זמן נסיעה».
→ Note `CLAUDE_CODE_BRIEF.md:157` promises `/daily-route` has a `תיבת אופטימיזציה` — **it does not.**
Don't script from that doc.

**3. Automatic distribution of filter jobs across the calendar is dead code.**
`distributeFilterJobs` (`monthly-schedule/utils.ts:29`) packs 3 jobs/day by city and is memoised at
`MonthlyScheduleBoard.tsx:353` — but **it is never rendered.** Day cells read from
`getFilterDayJobs` (`:434`), which uses only manual assignments. The board states it outright:
`// No auto-determined areas — days start empty, areas are selected manually` (`:358-361`).
→ The dashboard subtitle `שירות שוטף מתוזמן אוטומטית לפי חודש קבוע ללקוח` (`AdminDashboard.tsx:19`)
is on screen in scene 2 but **is not narrated**.
→ What IS true and IS safe to claim (scene 8): annual filter jobs are auto-**generated** per
customer from `filterReplacementMonth` (`utils.ts:6-26`), and auto-**renewed** for the same month
next year when closed (`useJobs.ts:756-760`). Generation and renewal — not distribution.

**4. Working hours are not enforced.**
`CLAUDE_CODE_BRIEF.md:20` documents 09:00–17:00, but auto-assigned times **start at 10:00**
(`MonthlyScheduleBoard.tsx:212`, `DailyRoutePage.tsx:111`) and the picker's default assignment time
is **08:00** (`:509`). There is **no upper bound at all** — `endMinutes = 10*60 + totalMinutes`
(`DayApprovalDialog.tsx:113`) will cheerfully render `10:00 – 34:00` if you overload a day.
Sunday–Thursday **is** enforced, but only in the board UI (`:261-264`, `:975`), not in any write path.
→ Don't put working hours on screen as a guarantee, and check your filmed day doesn't run past
17:00 in the time column.

**5. The activity log is in-memory only.**
`useActivityLogs.ts` holds logs in React state; every `addLog` call is lost on refresh.
`FollowUpTasksPopover.tsx:68-70` says so in a comment.
→ No «היסטוריה מלאה לכל לקוח» / audit-trail claim. The `היסטוריה` button on customer cards
(`CustomerCard.tsx:33`) will look empty after any reload — keep it out of frame.

**6. Push notifications have no sender.**
`usePushNotifications.ts` stores subscription endpoints, but there is no `supabase/` directory in
this repo and no sending function anywhere. It is plumbing with nothing upstream.
→ Do not show or mention notifications. (The install/notification banners in `AppLayout` may pop
during recording — dismiss them before you roll.)

**7. Half the status vocabulary is unreachable.**
Of the seven `JobStatus` values (`src/types/index.ts:81-87`), only `draft` → `confirmed` →
`completed`/`archived` are ever set by a user action. `ממתין ללקוח`, `בביצוע` and `נדחה` are dead:
`MonthlyScheduleBoard` declares the `onApprove` and `onStatusChange` props (`:80`, `:90`) and never
destructures them (`:121-131`).
→ Don't build an overlay around a status pipeline, and don't film a chip reading `ממתין ללקוח`.

**8. "Two technicians" is a code constant, not a setting.**
`src/data/technicians.ts` is a hard-coded two-element array. Adding a third technician is a code
change and a deploy.
→ Safe: «שני טכנאים בשטח» (scene 1) describes this business. **Unsafe:** any implication that a
buyer can add their own team from a settings screen. If a prospect asks, that's an honest
"currently configured per deployment."
