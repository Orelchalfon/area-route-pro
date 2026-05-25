# מסמך אפיון מקיף לקלוד קוד — פרויקט Tal Hermon

## מה אני בונה

קובץ אחד גדול בשם **`CLAUDE_CODE_BRIEF.md`** (בעברית, מפורט מאוד) שתוכל להוריד / להעתיק ולהדביק כפרומפט הראשון בקלוד קוד. המסמך יכלול **כל מה שבנינו** עד עכשיו — מוצר, לוגיקה, מודל נתונים, UI, אינטגרציות, וכללי עבודה — ברמת פירוט שתאפשר לקלוד לבנות את האפליקציה מאפס בלי לנחש.

## מבנה המסמך (≈10–12 פרקים)

### 1. סקירה כללית
- שם: Tal Hermon — מערכת ניהול שירות שטח
- שפה: עברית מלאה + RTL
- 2 טכנאים (שילה, נריה), בסיס באבני חפץ
- שעות עבודה: ראשון–חמישי, 09:00–17:00

### 2. סטאק טכנולוגי מדויק
React 18 + Vite 5 + TypeScript 5 + Tailwind v4 (`@tailwindcss/vite`) + shadcn/ui + React Router v6 + TanStack Query + Supabase (Lovable Cloud) + Google Maps JS API

### 3. מודל נתונים מלא (types/index.ts)
- 3 סוגי קריאות: `filter_replacement` / `malfunction` / `installation`
- 4 מסלולי שירות: `annual_filter` (12 ח׳), `external_filter` (6 ח׳), `bypass_siliphos` (6 ח׳), `service_visit` (2 ח׳)
- 5 סטטוסים: draft / pending_customer / confirmed / in_progress / completed / rescheduled
- 3 רמות עדיפות, completionStatus, ActivityLog
- מבני Customer / Job / Technician מלאים עם כל השדות

### 4. מסכים וניתובים (9 routes)
טבלה: route → רכיב → תיאור תפקודי
- `/` Dashboard
- `/daily-route` תכנון יום + מפת Google
- `/malfunctions`, `/installations` קטגוריות
- `/service` מחזור שירות (Smart Distribution)
- `/work-schedule` לוח חודשי
- `/technician` תצוגת טכנאי
- `/customers` ניהול לקוחות
- `/confirm` אישור לקוח

### 5. לוגיקה עסקית קריטית
- **Smart Distribution** של פילטרים שנתיים לפי חודש לקוח
- **חידוש אוטומטי**: סגירת קריאת פילטר → יצירת קריאה לשנה הבאה
- **שעון אזורי** + חלוקה לאזורים
- **ICS + CSV merge logic** (התאמה לפי שם)
- **שדה sheet_row_id + source** ב-DB לסנכרון דו-כיווני
- **Activity log** על כל פעולה

### 6. Backend (Lovable Cloud)
- טבלאות: `malfunctions`, `installations` (סכמה מלאה + RLS)
- Edge functions: `get-google-maps-key`, `receive-from-make`, `send-to-make`
- Realtime publication על שתי הטבלאות
- Secrets: MAKE_WEBHOOK_URL, MAKE_WEBHOOK_SECRET, GOOGLE_MAPS_API_KEY

### 7. אינטגרציות חיצוניות
- Google Maps (אך ורק — לא Leaflet): autocomplete, geocoding, directions
- Make.com webhooks ל-Google Sheets (סנכרון דו-כיווני, פתוח)
- Outlook ICS + CSV import

### 8. קבצי Bootstrap data
`public/contacts.csv`, `public/calendar_1.ics`, `public/malfunctions.csv`, `public/installations.csv` — פורמט ודוגמה

### 9. עיצוב ו-UI
- פלטה Navy + Teal, HSL tokens ב-index.css
- כרטיסים, header גרפי, אייקונים גדולים
- RTL מלא, כל הטקסטים בעברית
- אסור צבעים hard-coded — רק semantic tokens

### 10. סדר בנייה מומלץ (10 צעדים)
מסטאק → types → mock data → דפים → Cloud → ICS/CSV → Maps → smart distribution → technician flow → Sheets sync

### 11. כללי עבודה לקלוד
- אל תיגע ב-`integrations/supabase/client.ts` ו-`types.ts`
- RLS על כל טבלה
- שמות משתנים באנגלית, UI בעברית
- אין שני sources of truth
- מיגרציות בלבד דרך כלי Supabase

### 12. סטטוס ונקודות פתוחות
- סנכרון Sheets דו-כיווני פעיל עבור `malfunctions`/`installations`: `source='sheets'`, `x-make-secret`, DB trigger ל-`send-to-make`, ו-persistence ב-`updateJob`/שיבוץ/החזרה/סגירה.
- קריאות שירות/פילטר עדיין מקומיות עד הוספת טבלת `jobs` מלאה.
- בדיקות baseline: להריץ `pnpm lint`, `pnpm test`, `pnpm build`.
- כפתור Initial import
- 2× Watch Rows + 1× Webhook ב-Make
- Auth (טרם הוטמע)

## פורמט פלט
- קובץ Markdown יחיד ב-`/mnt/documents/CLAUDE_CODE_BRIEF.md`
- ~600–900 שורות
- כותרות ברורות, טבלאות, code blocks ל-TypeScript types וסכימות SQL
- בסוף — `<presentation-artifact>` להורדה מיידית

## מה אני **לא** עושה
- לא משנה אף קובץ בפרויקט
- לא מתחיל ZIP / GitHub export (זה בנפרד)
- לא מטפל בחיבור Google Sheets התקוע
