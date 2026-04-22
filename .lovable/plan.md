
# חיבור Google Sheets לטבלאות התקלות וההתקנות

## מצב נוכחי
כבר קיים בסיס מהשלבים הקודמים:
- ✅ טבלאות `malfunctions` ו-`installations` ב-DB עם עמודת `sheet_row_id` ו-`source`
- ✅ Edge Function `receive-from-make` (Sheets → DB)
- ✅ Edge Function `send-to-make` (DB → Sheets, דרך Make webhook)
- ✅ Secret `MAKE_WEBHOOK_URL` מוגדר
- ❌ ה-UI עדיין טוען מ-CSV (`public/malfunctions.csv`, `public/installations.csv`) ולא מהטבלאות
- ❌ אין Database Webhooks שמפעילים את `send-to-make`
- ❌ אין Realtime על הטבלאות
- ❌ אין Make Scenarios בנויים

## מה נשאר לעשות

### 1. הפעלת Realtime על הטבלאות
מיגרציה שמוסיפה את `malfunctions` ו-`installations` ל-`supabase_realtime` ומגדירה `REPLICA IDENTITY FULL`, כך שה-UI יתעדכן מיידית כשנתון משתנה (גם משינוי שמגיע מ-Sheets).

### 2. Database Webhooks → send-to-make
יצירת trigger ב-DB שקורא ל-`send-to-make` בכל INSERT/UPDATE/DELETE על שתי הטבלאות (במקום הגדרה ידנית בלוח הבקרה). הטריגר ישלח payload בפורמט שה-Edge Function כבר מכיר (`type`, `table`, `record`, `old_record`).

### 3. החלפת מקור הנתונים ב-UI
- יצירת hook חדש `useMalfunctionsAndInstallations` שעושה `select` מהטבלאות + `supabase.channel().on('postgres_changes')` לעדכון חי.
- שילוב ב-`useJobs`/`JobsContext` כך ש-`jobs` מסוג `malfunction` ו-`installation` יגיעו מה-DB במקום מה-CSV.
- `updateJob` יבצע `update` על הטבלה המתאימה (עם `source: 'app'`) במקום עדכון מקומי בלבד.
- שמירת תאימות לאחור: אם הטבלאות ריקות ה-UI לא נשבר.

### 4. סנכרון ראשוני (אופציונלי, מומלץ)
כפתור "ייבוא ראשוני מ-Sheets" או הרצה חד-פעמית של Make Scenario 2 כדי למלא את ה-DB מהגיליונות הקיימים. כל שורה תקבל `sheet_row_id` יציב (נשתמש ב-Row ID של Google או ב-UUID שנייצר ונכתוב לעמודה נסתרת).

### 5. הוראות הקמת Make.com
מדריך ברור (אספק בצ'אט, לא בקוד):

**Scenario A — Sheets → System** (אחד לכל גיליון, סה"כ 2):
```text
[Google Sheets: Watch Rows]  →  [HTTP: Make a request]
                                  POST receive-from-make
                                  Body: { type, action, sheet_row_id, data: {...} }
```

**Scenario B — System → Sheets** (אחד שמטפל בשני הסוגים):
```text
[Webhook: k7lpm4gd...]  →  [Router]
                              ├─ type=malfunction → [Sheets: Search/Update/Add/Delete row]
                              └─ type=installation → [Sheets: Search/Update/Add/Delete row]
```
המפתח להתאמה בשני הכיוונים: `sheet_row_id` בעמודה ייעודית בכל גיליון.

### 6. מיפוי עמודות
מיפוי שמות העמודות בעברית בגיליון ⇄ שמות השדות ב-DB (יסופק כטבלה במדריך Make):
```text
תקלות:       שם לקוח→customer_name, טלפון→phone, עיר→city,
             כתובת→address, אזור→region, תיאור→description,
             תאריך→malfunction_date, סטטוס→status, עדיפות→priority, הערות→notes
התקנות:      שם לקוח→customer_name, טלפון→phone, עיר→city,
             כתובת→address, אזור→region, סוג מוצר→product_type,
             תאריך התקנה→installation_date, שעה→installation_time,
             סטטוס→status, עדיפות→priority, הערות→notes
```

## פרטים טכניים
- מניעת לולאות: `send-to-make` כבר בודק `source==='sheet'` ולא משדר חזרה. ב-`receive-from-make` נשמור `source='sheet'`. כשה-UI כותב — `source='app'`.
- Conflict resolution: last-write-wins לפי `updated_at` (טריגר `set_updated_at` כבר קיים — נצרף אותו לשתי הטבלאות אם אינו מחובר).
- ה-CSV ב-`public/` יישאר כ-fallback בלבד; לאחר שתוודא שהסנכרון עובד אפשר להסיר.

## קבצים שייווצרו/יתעדכנו
- מיגרציה חדשה: realtime + DB triggers שקוראים ל-`send-to-make`
- `src/hooks/useMalfunctionsInstallations.ts` (חדש)
- `src/hooks/useJobs.ts` ו-`src/contexts/JobsContext.tsx` (עדכון מקור הנתונים + פונקציות update)
- `src/pages/JobCategoryPage.tsx` (התאמות קלות אם צריך)

## מה נדרש ממך לאחר ההטמעה
1. לפתוח את שני הגיליונות ולהוסיף עמודה אחרונה בשם `sheet_row_id` (תישאר ריקה — Make ימלא).
2. לבנות ב-Make את שני ה-Scenarios לפי המדריך שאספק (לוקח ~10 דקות).
3. להריץ ייבוא ראשוני פעם אחת.
