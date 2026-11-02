
המשתמש מדווח על שגיאה: "id-preview... סגר את החיבור באופן בלתי צפוי" — זה אומר שה-preview קרס (white screen / connection closed). סביר מאוד שזה קרה אחרי השינוי האחרון ב-`StudioTab.tsx` או ב-`IplanFetchDialog.tsx`.

הסיבה הסבירה ביותר: בהודעה הקודמת הקוד של `IplanFetchDialog.tsx` שהמשתמש שלח היה **פגום** — הוא הכיל JSX ריק/חסר (הרבה תגיות פתוחות בלי תוכן, generics ריקים כמו `useState()` במקום `useState<Step>('input')`, ו-`useState>({})` במקום `useState<Partial<...>>({})`). גם פונקציה בשם `fetch` שדורסת את ה-global `fetch` מסוכנת.

בנוסף — ב-`StudioTab.tsx` הוסף שימוש ב-`projectId` אבל ייתכן שה-prop הזה לא קיים בקומפוננטה, מה שיגרום לקריסה.

אני רוצה לבדוק:
1. האם `IplanFetchDialog.tsx` באמת מקומפל (תוכן הקובץ הנוכחי).
2. האם `StudioTab.tsx` מקבל `projectId` כ-prop.
3. דב-סרבר log לראות את שגיאת הקריסה האמיתית.

## תוכנית

**אבחון ותיקון של קריסת ה-Preview**

הקריסה כמעט בוודאות נובעת מהשינוי האחרון. אבדוק:

1. **קרא את `src/components/IplanFetchDialog.tsx`** — לוודא שהוא תקני (לא חתוך, generics מלאים, אין `fetch` שדורס global).
2. **קרא את `src/components/StudioTab.tsx`** — לוודא ש-`projectId` קיים כ-prop ושה-import של `Globe` ו-`IplanFetchDialog` נוסף נכון.
3. **בדוק `/tmp/dev-server-logs/dev-server.log`** — לזהות את שגיאת ה-build/runtime המדויקת.

**לאחר האבחון אתקן:**
- אם `IplanFetchDialog.tsx` חסר/פגום → אכתוב אותו מחדש במלואו עם generics נכונים, ושינוי שם הפונקציה הפנימית מ-`fetch` ל-`fetchData` (כדי לא לדרוס global).
- אם `StudioTab.tsx` לא מקבל `projectId` → אעביר אותו דרך ה-props מהמקום שמשתמש ב-`StudioTab` (סביר ב-`ProjectPage.tsx`).
- אם יש שגיאת import אחרת → אתקן בהתאם.

**ללא שינויים בקבצים אחרים** מעבר לנדרש לתיקון הקריסה.

הדיווח יכלול: מה הייתה הסיבה, מה תוקן, והאם ה-build עובר.
