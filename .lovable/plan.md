
המשתמש רוצה סנכרון דו-כיווני בזמן אמת בין שני Google Sheets (תקלות + התקנות) לבין הטבלאות המקבילות בתוכנה. כרגע במערכת אין טבלאות DB לתקלות והתקנות - הנתונים נטענים מ-CSV ב-public/. צריך:

1. ליצור טבלאות DB ל-malfunctions ו-installations
2. Service Account של Google לגישה ל-Sheets
3. Edge functions לסנכרון דו-כיווני
4. Apps Script ב-Sheet שדוחף שינויים חזרה (Webhook)
5. Realtime ב-Supabase כדי שה-UI יתעדכן מיד

# חיבור Google Sheets דו-כיווני בזמן אמת

## סקירה
נחבר את שני הגיליונות (תקלות + התקנות) למערכת כך שכל שינוי בצד אחד יופיע בצד השני תוך שניות.

## ארכיטקטורה
```text
Google Sheet (תקלות)  <--->  Edge Function  <--->  DB (malfunctions)  <--->  UI
Google Sheet (התקנות) <--->  Edge Function  <--->  DB (installations) <--->  UI
                ^                                          |
                |                                          |
         Apps Script                              Realtime subscription
         (on edit trigger)                        (פוסט-גרס changes)
```

## שלבי המימוש

### 1. טבלאות במסד הנתונים
- `malfunctions` - שם לקוח, עיר, תיאור תקלה, תאריך, אזור, סטטוס, sheet_row_id
- `installations` - שדות מקבילים מתוך `installations.csv` הקיים
- RLS פתוח (כמו `ongoing_services` הקיים)
- הפעלת Realtime על שתי הטבלאות

### 2. חיבור Google Sheets (Service Account)
המשתמש יצטרך:
- ליצור Service Account ב-Google Cloud Console
- להוריד מפתח JSON
- לשתף את שני הגיליונות עם כתובת המייל של ה-Service Account (Editor)
- לשמור את ה-JSON כסוד `GOOGLE_SERVICE_ACCOUNT_JSON` + את שני ה-Sheet IDs כ-`MALFUNCTIONS_SHEET_ID` ו-`INSTALLATIONS_SHEET_ID`

### 3. Edge Functions
- `sync-from-sheets` - מושך נתונים משני הגיליונות ומעדכן את ה-DB (upsert לפי שורה). רץ בכל פעם שה-Sheet מעדכן.
- `sync-to-sheets` - כשמשתמש משנה רשומה ב-UI, דוחף את השינוי לשורה המתאימה בגיליון.
- `sheets-webhook` - מקבל קריאה מ-Apps Script כשעורכים את הגיליון, ומפעיל את `sync-from-sheets`.

### 4. Apps Script בכל גיליון
המשתמש יוסיף סקריפט קטן (אספק לו את הקוד המדויק) שמופעל ב-`onEdit` ושולח POST ל-`sheets-webhook` עם ה-Sheet ID. כך השינוי מ-Sheets מגיע למערכת תוך שניות.

### 5. סנכרון מהמערכת ל-Sheet
כל `INSERT/UPDATE` בטבלאות `malfunctions`/`installations` יפעיל database trigger → Edge Function → כתיבה לגיליון.

### 6. UI בזמן אמת
החלפת טעינת ה-CSV ב-`JobCategoryPage` ב-query מהטבלאות החדשות + מנוי `supabase.channel` לעדכונים חיים.

## פרטים טכניים
- הזיהוי בין שורת Sheet ל-DB row יתבצע ע"י עמודה `sheet_row_id` (UUID שנכתב חזרה לעמודה נסתרת בגיליון בעת הסנכרון הראשון)
- מניעת לולאות אינסופיות: לכל פעולה דגל `source` ('sheet' | 'app') - לא נדחוף חזרה אם המקור הוא הצד השני
- במקרה של קונפליקט - "last write wins" לפי `updated_at`

## מה אני צריך ממך לפני שמתחילים
שתי שאלות חשובות:
