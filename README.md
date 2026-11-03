# ניהול התחדשות עירונית – אשדוד

מערכת חכמה לניהול פרויקטי פינוי־בינוי בעיריית אשדוד: מהיתכנות ראשונית ועד אכלוס.

## יכולות עיקריות
- **מרכז פיקוד חכם** (`/command-center`): ציון בריאות לכל פרויקט, צפי היתר, מפת חום רובע × שלב, זיהוי חסמים מערכתיים, תור פעולות מתועדף ותדריך יומי.
- ניהול פרויקטים, 24 שלבי תהליך, פורומים 1–3, גאנט, ישיבות, משימות, תזכורות ודוחות רשמיים (Word/PDF/Excel).
- עוזר AI "יוחאן" (Supabase Edge Function).
- עברית מלאה (RTL), מצב כהה ומובייל.

## פיתוח
```bash
npm install
npm run dev        # http://localhost:8080
npm run verify     # typecheck + tests + build
npm run screenshots
```

## פריסה
GitHub Pages: https://anat1969.github.io/NihulHichadshtY-GH/ . כל דחיפה ל-`main` בונה ומפרסמת אוטומטית (`.github/workflows/pages.yml`). ההגדרות ל-Vercel נמצאות ב-`vercel.json`, כאפשרות חלופית. הנתונים מגיעים מ-Supabase, וההגדרות הציבוריות שלו נמצאות ב-`.env`.

הנחיות לעבודה עם Claude Code: `CLAUDE.md` ו-`.claude/skills/`.
