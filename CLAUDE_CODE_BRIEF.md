# Tal Hermon — מסמך אפיון מקיף לבנייה מחדש בקלוד קוד

> **איך להשתמש במסמך הזה:** העתק את כל התוכן והדבק כפרומפט הראשון בסשן חדש של Claude Code. הוא מכיל את כל מה שצריך לדעת כדי לבנות את האפליקציה מאפס — מוצר, סטאק, מודל נתונים, מסכים, לוגיקה עסקית, אינטגרציות וכללי עבודה.

---

## 1. סקירה כללית

**שם המוצר:** Tal Hermon — מערכת ניהול שירות שטח לחברת טיפול במים (פילטרים, התקנות, תקלות).

**משתמשים:**
- **מנהל** (אני) — מתכנן ימים, מאשר לו"ז, רואה את כל המידע.
- **2 טכנאים בשטח** — שילה ונריה. בסיס באבני חפץ (ישראל).
- **לקוחות** — מאשרים מועד שירות דרך עמוד ייעודי.

**שפה:** עברית מלאה, RTL מלא בכל האפליקציה. שמות משתנים בקוד באנגלית, כל טקסט UI בעברית.

**חוקי עבודה:**
- ימי עבודה: ראשון–חמישי.
- שעות: 09:00–17:00.
- 2 טכנאים בלבד.
- אזורי שירות מסביב לאבני חפץ (מרכז + שרון + שומרון).

---

## 2. סטאק טכנולוגי

| רכיב | טכנולוגיה |
|------|----------|
| Frontend framework | React 18 + Vite 5 |
| שפה | TypeScript 5 (strict) |
| Styling | Tailwind CSS v4 דרך `@tailwindcss/vite` + semantic tokens ב-HSL בלבד |
| UI library | shadcn/ui (Radix + Tailwind) |
| Routing | React Router v6 |
| Data fetching | TanStack Query v5 |
| Backend | Supabase (Postgres + Auth + Edge Functions + Realtime + Storage) |
| Maps | **Google Maps JavaScript API בלבד** — אסור Leaflet, אסור Mapbox |
| Forms | react-hook-form + zod |
| Icons | lucide-react |
| Toasts | sonner |

**RTL:** הגדר `<html dir="rtl" lang="he">` ב-`index.html`. Tailwind מתפקד טוב עם RTL כשמשתמשים ב-`text-start/end` במקום `text-left/right`.

---

## 3. מודל נתונים מלא

קובץ: `src/types/index.ts`

```typescript
export type JobType = 'filter_replacement' | 'malfunction' | 'installation';

export type ServiceTrack =
  | 'annual_filter'      // פילטר שנתי, כל 12 חודשים
  | 'external_filter'    // פילטר חוץ, כל 6 חודשים
  | 'bypass_siliphos'    // בייפס/סיליפוס, כל 6 חודשים
  | 'service_visit';     // ביקור שירות, כל 2 חודשים

export type JobStatus =
  | 'draft'              // טיוטה — לפני שיבוץ
  | 'pending_customer'   // ממתין לאישור לקוח
  | 'confirmed'          // לקוח אישר, משובץ
  | 'in_progress'        // הטכנאי בדרך/בביצוע
  | 'completed'          // הסתיים
  | 'rescheduled';       // נדחה

export type CompletionStatus = 'done' | 'not_done' | 'need_return';
export type JobPriority = 'low' | 'medium' | 'high';

export interface Technician {
  id: string;
  name: string;       // "שילה" / "נריה"
  region: string;
  skills: string[];
  phone: string;
  avatar?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  city: string;
  email: string;
  product: string;
  filterReplacementMonth: number;  // 1-12 — באיזה חודש מחליפים פילטר שנתי
  serviceTrack?: ServiceTrack;
  nextServiceDate?: string;        // ISO date
  lat?: number;
  lng?: number;
  placeId?: string;                // Google Maps place_id
  notes?: string;
}

export interface Job {
  id: string;
  type: JobType;
  status: JobStatus;
  priority: JobPriority;
  customerId: string;
  technicianId?: string;
  scheduledDate?: string;          // YYYY-MM-DD
  scheduledTime?: string;          // HH:mm
  estimatedDuration: number;       // דקות
  location: string;
  city: string;
  notes: string;
  completionNotes?: string;
  completionStatus?: CompletionStatus;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  customerId: string;
  jobId?: string;
  action: string;
  details: string;
  timestamp: string;
}

export const JOB_TYPE_CONFIG: Record<JobType, {
  label: string; duration: number; priority: JobPriority; icon: string; color: string;
}> = {
  filter_replacement: { label: 'החלפת פילטר', duration: 20,  priority: 'low',    icon: 'Filter',        color: 'info' },
  malfunction:        { label: 'תקלה',         duration: 60,  priority: 'high',   icon: 'AlertTriangle', color: 'destructive' },
  installation:       { label: 'התקנה חדשה',   duration: 120, priority: 'medium', icon: 'Wrench',        color: 'secondary' },
};

export const SERVICE_TRACK_CONFIG: Record<ServiceTrack, {
  label: string; intervalMonths: number; color: string; bgClass: string; textClass: string;
}> = {
  annual_filter:    { label: 'פילטר שנתי',    intervalMonths: 12, color: 'info',      bgClass: 'bg-info/15 border-info/30',           textClass: 'text-info' },
  external_filter:  { label: 'פילטר חוץ',     intervalMonths: 6,  color: 'secondary', bgClass: 'bg-secondary/15 border-secondary/30', textClass: 'text-secondary' },
  bypass_siliphos:  { label: 'בייפס/סיליפוס', intervalMonths: 6,  color: 'accent',    bgClass: 'bg-accent/15 border-accent/30',       textClass: 'text-accent' },
  service_visit:    { label: 'ביקור שירות',   intervalMonths: 2,  color: 'primary',   bgClass: 'bg-primary/15 border-primary/30',     textClass: 'text-primary' },
};

export const STATUS_CONFIG: Record<JobStatus, { label: string; color: string }> = {
  draft:            { label: 'טיוטה',         color: 'muted' },
  pending_customer: { label: 'ממתין ללקוח',   color: 'warning' },
  confirmed:        { label: 'מאושר',          color: 'info' },
  in_progress:      { label: 'בביצוע',         color: 'secondary' },
  completed:        { label: 'הושלם',          color: 'success' },
  rescheduled:      { label: 'נדחה',           color: 'accent' },
};
```

---

## 4. מסכים וניתובים

| Route | רכיב | תיאור |
|-------|------|------|
| `/` | `Dashboard` | סקירה כוללת: KPIs, היום שלך, התראות |
| `/daily-route` | `DailyRoutePage` | תכנון יום ספציפי + מפת Google + תיבת אופטימיזציה |
| `/malfunctions` | `JobCategoryPage category="malfunctions"` | רשימת כל התקלות עם סינון/חיפוש |
| `/installations` | `JobCategoryPage category="installations"` | רשימת התקנות |
| `/service` | `ServiceCyclePage` | מחזור שירות שנתי + Smart Distribution של פילטרים |
| `/work-schedule` | `WorkSchedulePage` | לוח חודשי / שבועי לתכנון |
| `/technician` | `TechnicianPage` | תצוגת טכנאי בשטח (יום + שבוע, עם דיווח השלמה) |
| `/customers` | `CustomersPage` | ניהול לקוחות + history per customer |
| `/confirm` | `CustomerConfirmation` | דף ציבורי לאישור מועד ע"י הלקוח (token בלינק) |
| `*` | `NotFound` | 404 |

מבנה ב-`App.tsx`: `QueryClientProvider` → `TooltipProvider` → `Toaster` → `BrowserRouter` → `JobsProvider` (Context) → `AppLayout` → `Routes`.

---

## 5. לוגיקה עסקית קריטית

### 5.1 Smart Distribution (חלוקה חכמה של פילטרים)
- כל לקוח עם `serviceTrack='annual_filter'` צריך להיות מתוזמן פעם בשנה לפי `filterReplacementMonth`.
- ה-dialog פותח את כל הלקוחות לפי חודש, מאפשר ידנית לדחות/לקדם, ומייצר Jobs מסוג `filter_replacement` בסטטוס `draft`.

### 5.2 חידוש אוטומטי של שירות
ב-`closeJob()` ו-`completeFilterJob()`: אם הקריאה היא `filter_replacement`, צור אוטומטית קריאה חדשה לאותו חודש בשנה הבאה. השתמש ב-ID דטרמיניסטי `filter-{year}-{month}-{customerId}` כדי למנוע כפילויות.

### 5.3 קיבוץ לפי אזור
`getJobsByArea()` מקבץ Jobs לפי `city`. משמש בתכנון יום — להציע ימים מרוכזים גיאוגרפית.

### 5.4 Activity Log
כל פעולה משמעותית (פתיחה, שיבוץ, השלמה, סגירה, החזרה, עדכון פרטים) מוסיפה רשומה ל-`activityLogs[]` ומקושרת ל-customer ו/או job.

### 5.5 ICS + CSV Merge Logic
- `public/contacts.csv` — מקור האמת לפרטי לקוחות.
- `public/calendar_1.ics` — לוח שנה מ-Outlook עם תאריכי שירות.
- המיזוג מתאים לפי שם (case-insensitive, includes בשני הכיוונים).
- ICS-only customers נוספים כחדשים.
- CSV-only customers נשארים כמו שהם.

### 5.6 סנכרון דו-כיווני עם Google Sheets (פתוח — לסיים)
- שדות `sheet_row_id` ו-`source` בטבלאות `malfunctions` ו-`installations`.
- App → Sheets: trigger ב-DB שולח ל-edge function `send-to-make` שדוחף ל-Make.com webhook.
- Sheets → App: Make.com (Watch Rows) שולח ל-edge function `receive-from-make` שמכניס/מעדכן בטבלה.
- `source` עוזר למנוע לולאות (אם `source='sheets'`, לא לשלוח חזרה).

---

## 6. Backend — Lovable Cloud (Supabase)

### 6.1 טבלאות

```sql
CREATE TABLE public.malfunctions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  phone        TEXT,
  address      TEXT,
  city         TEXT,
  notes        TEXT,
  priority     TEXT DEFAULT 'high',
  status       TEXT DEFAULT 'draft',
  sheet_row_id TEXT,           -- ל-mapping מול שורה בגוגל שיט
  source       TEXT DEFAULT 'app',  -- 'app' / 'sheets'
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.installations (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  phone        TEXT,
  address      TEXT,
  city         TEXT,
  product      TEXT,
  notes        TEXT,
  status       TEXT DEFAULT 'draft',
  sheet_row_id TEXT,
  source       TEXT DEFAULT 'app',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.malfunctions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.installations ENABLE ROW LEVEL SECURITY;

-- בשלב ראשון (לפני auth): גישה ציבורית, אחרי auth להחליף ל-policy לפי role.
CREATE POLICY "public read malfunctions"  ON public.malfunctions  FOR SELECT USING (true);
CREATE POLICY "public write malfunctions" ON public.malfunctions  FOR ALL    USING (true) WITH CHECK (true);
CREATE POLICY "public read installations" ON public.installations FOR SELECT USING (true);
CREATE POLICY "public write installations" ON public.installations FOR ALL   USING (true) WITH CHECK (true);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.malfunctions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.installations;

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

CREATE TRIGGER trg_malfunctions_touch  BEFORE UPDATE ON public.malfunctions
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_installations_touch BEFORE UPDATE ON public.installations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
```

### 6.2 Edge Functions (Deno)

| Function | תפקיד | verify_jwt |
|----------|------|------------|
| `get-google-maps-key` | מחזיר את ה-API key של Google Maps (מ-secret) | true |
| `receive-from-make` | קולט POST מ-Make.com, מבצע upsert בטבלה לפי `sheet_row_id` | **false** (webhook ציבורי) |
| `send-to-make` | מקבל שינוי מה-DB ושולח ל-Make.com webhook | **false** |

ב-`supabase/config.toml`:
```toml
[functions.receive-from-make]
verify_jwt = false
[functions.send-to-make]
verify_jwt = false
```

### 6.3 Secrets
- `GOOGLE_MAPS_API_KEY`
- `MAKE_WEBHOOK_URL` (Make.com webhook שמקבל עדכונים מהאפליקציה)
- `MAKE_WEBHOOK_SECRET` (סוד משותף ל-`x-make-secret` מ-Make אל `receive-from-make`)

---

## 7. אינטגרציות חיצוניות

### 7.1 Google Maps (חובה — לא להחליף ב-Leaflet!)
- טוען את ה-SDK דרך `useGoogleMapsKey()` שקורא ל-edge `get-google-maps-key` ומקַשה את התשובה ב-localStorage.
- **Autocomplete:** רכיב `AddressAutocomplete` עם `places` library, מוגבל ל-`country:il`.
- **Geocoding:** `useGeocodeCustomers` רץ אחרי טעינת לקוחות, ממיר address→lat/lng, ושומר ב-state + (אופציונלי) חזרה ל-DB.
- **Directions:** `useDirectionsRoute` משתמש ב-DirectionsService למסלול מתוכנן ליום, עם optimization של נקודות ביניים.
- **DayRouteMap:** מציג Markers יציבים (key=jobId), Polyline של המסלול, ומאפשר drag לסידור מחדש.

### 7.2 Make.com (Google Sheets sync)
- 2 תרחישי **Watch Rows** (אחד לכל גליון: תקלות, התקנות) → POST ל-`receive-from-make`.
- 1 תרחיש **Custom Webhook** שמקבל מה-app → Add/Update Row ב-Sheets.

### 7.3 Outlook ICS + CSV Import
- `useICSImport()` קורא `/calendar_1.ics`, פרסר ב-`src/lib/icsParser.ts`.
- `loadCustomersFromCSV()` קורא `/contacts.csv`, פרסר ב-`src/lib/csvParser.ts`.
- שני המקורות ממוזגים ב-`useJobs()`.

---

## 8. קבצי Bootstrap data (תיקיית public)

| קובץ | תפקיד | פורמט |
|------|------|------|
| `public/contacts.csv` | רשימת לקוחות מקור | name, phone, address, city, email, product, filter_month |
| `public/calendar_1.ics` | אירועי שירות מ-Outlook | iCalendar standard |
| `public/malfunctions.csv` | תקלות פתוחות התחלתיות | name, phone, address, city, notes |
| `public/installations.csv` | התקנות עתידיות התחלתיות | name, phone, address, city, product, notes |

---

## 9. עיצוב ו-UI

### 9.1 פלטה — Navy + Teal (HSL בלבד)
ב-`src/index.css`:
```css
:root {
  --background: 210 40% 98%;
  --foreground: 222 47% 11%;
  --primary: 222 80% 25%;        /* Navy עמוק */
  --primary-foreground: 0 0% 100%;
  --secondary: 180 65% 40%;      /* Teal */
  --secondary-foreground: 0 0% 100%;
  --accent: 35 90% 55%;          /* כתום-זהב להתראות */
  --info: 200 85% 45%;
  --success: 145 60% 42%;
  --warning: 38 92% 50%;
  --destructive: 0 75% 50%;
  --muted: 215 16% 90%;
  --border: 215 20% 85%;
  --radius: 0.75rem;
}
```

### 9.2 עקרונות
- **תמיד** semantic tokens (`bg-primary`, `text-secondary`). **לעולם לא** `bg-blue-500` או `#fff`.
- כרטיסים עם `rounded-2xl shadow-sm border` ו-padding נדיב.
- אייקונים גדולים יחסית (h-5/h-6).
- header גרפי בכל דף — לוגו + כותרת + תיאור + כפתורי פעולה ימניים (RTL).
- מצבים ויזואליים ברורים לסטטוסים (badge עם צבע לפי `STATUS_CONFIG`).

### 9.3 RTL
- `<html dir="rtl" lang="he">`.
- `text-start` / `text-end` במקום left/right.
- `me-*` / `ms-*` במקום `mr-*` / `ml-*`.

---

## 10. סדר בנייה מומלץ (10 צעדים)

1. **Scaffolding** — Vite + React + TS + Tailwind + shadcn/ui, RTL, פלטה.
2. **Types** — צור `src/types/index.ts` בדיוק כמו בסעיף 3.
3. **Mock data** — `src/data/mockData.ts` עם 2 טכנאים + מספר Jobs לדוגמה.
4. **Routing + AppLayout** — `App.tsx` עם 9 routes + סייד-בר/הדר.
5. **Lovable Cloud** — צור טבלאות + RLS + edge `get-google-maps-key`.
6. **CSV + ICS import** — `useICSImport`, `loadCustomersFromCSV`, מיזוג ב-`useJobs`.
7. **Google Maps** — `useGoogleMapsKey`, `AddressAutocomplete`, `DayRouteMap`, geocoding.
8. **Smart Distribution + Service Cycle** — דיאלוג חלוקה, יצירת jobs דטרמיניסטית.
9. **Technician flow** — `TechnicianPage` עם דיווח השלמה, `markJobCompletion`.
10. **Sheets sync** — `send-to-make` + `receive-from-make` + Make.com scenarios + טריגרים ב-DB.

---

## 11. כללי עבודה — לקרוא לפני שכותבים שורת קוד

- **אל תיגע** בקבצים אוטומטיים: `src/integrations/supabase/client.ts`, `src/integrations/supabase/types.ts`, `.env`.
- **RLS על כל טבלה.** אחרי auth — `has_role()` security definer לפי תפקיד.
- **אל תאחסן roles בפרופיל** — תמיד טבלת `user_roles` נפרדת.
- שמות משתנים/קבצים באנגלית. כל UI בעברית.
- **אין שני sources of truth.** Cloud DB גובר על mock אחרי טעינה.
- מיגרציות **רק** דרך כלי ה-migration של Lovable.
- **אל תשתמש** ב-Leaflet, Mapbox, או כל ספריית מפות חוץ מ-Google Maps.
- אל תשתמש בצבעים hard-coded — רק tokens.
- כל קריאה ל-Sheets API דרך connector gateway, לא ישירות.

---

## 12. נקודות פתוחות (TODO)

- [x] DB triggers לסנכרון אוטומטי `send-to-make` בכל INSERT/UPDATE עבור `malfunctions` ו-`installations`.
- [x] `updateJob`/שיבוץ/החזרה/סגירה כותבים חזרה ל-Supabase עבור קריאות DB-backed (`db-malf-*`, `db-inst-*`).
- [ ] כפתור **Initial Import** שמייבא את כל ה-CSV התחלתיים ל-DB פעם אחת.
- [ ] **Auth** — עדיין לא הוטמע. להוסיף email+password + Google OAuth, ולסגור RLS.
- [x] תיעוד בכתב של Make.com scenarios (mapping של עמודות) תחת `tal_hermon_make_blueprints/`.
- [ ] להעביר את `mockData` ל-DB seed במקום state מקומי.
- [ ] חלון חיבור Google Sheets ב-Lovable כרגע "לא נותן ללחוץ" — לבדוק עם הצוות.

### סטטוס מימוש נוכחי

- `source` מנורמל ל-`sheets` עבור שינויים שמגיעים מ-Make/Google Sheets, כדי למנוע echo loop חזרה ל-Make.
- `receive-from-make` מאמת `x-make-secret`, מדלג על שורות header/ריקות, ומבצע upsert לפי `sheet_row_id`.
- קריאות שירות/פילטר שנוצרות באפליקציה עדיין נשארות מקומיות עד שתתווסף טבלת `jobs` מלאה.
- בדיקות בסיס: `pnpm lint`, `pnpm test`, `pnpm build`.

---

## 13. קבצים שכדאי לקרוא ראשונים (מהפרויקט הקיים)

אם יש לך גישה לקוד הישן, התחל מ-:
1. `src/types/index.ts` — מודל הנתונים.
2. `src/hooks/useJobs.ts` — לב הלוגיקה.
3. `src/contexts/JobsContext.tsx` — wrapping של ה-hook.
4. `src/hooks/useMalfunctionsInstallations.ts` — סנכרון DB.
5. `src/hooks/useICSImport.ts` — פרסור ICS.
6. `src/lib/csvParser.ts` — פרסור CSV.
7. `src/components/MonthlyScheduleBoard.tsx` — לוח החודשי.
8. `src/components/SmartDistributionDialog.tsx` — חלוקה חכמה.
9. `supabase/functions/send-to-make/index.ts` + `receive-from-make/index.ts`.
10. `.lovable/plan.md` — תוכניות שאושרו לאורך הדרך.

---

**סוף המסמך.** אם משהו לא ברור — תשאל לפני שמתחילים לבנות. אל תניח הנחות על לוגיקה עסקית.
