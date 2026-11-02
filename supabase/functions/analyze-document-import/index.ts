import { createClient } from "npm:@supabase/supabase-js@2";
import { encodeBase64 } from "jsr:@std/encoding@1/base64";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { fileUrl, fileName, text } = await req.json();
    if (!fileName || (!fileUrl && !text)) return json({ error: "חסרים נתוני קובץ" }, 400);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: projects } = await supabase.from("projects").select("id, project_name");
    const projectNames = (projects || []).map((p) => p.project_name).join("\n");

    const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_KEY) return json({ error: "מפתח AI אינו מוגדר" }, 500);

    const prompt = `אתה מנתח מסמך של מנהלת ההתחדשות העירונית באשדוד.
עבור כל פרויקט שמוזכר במסמך, חלץ את כל הנתונים הרלוונטיים ושייך לפרויקט המתאים.

רשימת הפרויקטים הרשמיים במערכת (שמות מדויקים):
${projectNames}

הנחיות להתאמת שמות:
- "הרותם" = "הרותם–פלדות"
- "מרגנית" = "אבן עזרא (מרגנית)"
- "מרכזון א׳" = "מרכז מסחרי רובע א׳ (מרכזון א׳)"
- שמות חלקיים — חפש את השם הרשמי הקרוב ביותר (העתק אותו בדיוק מהרשימה)
- אם אין התאמה ברורה — confidence: "low" ו-matchedProjectName: null

החזר JSON בלבד:
{ "summary": "תיאור קצר", "results": [ { "nameInDocument": "...", "matchedProjectName": "... או null", "confidence": "high|medium|low", "extractedData": { "שם שדה": "ערך" } } ] }

שדות אפשריים ב-extractedData: סטטוס, מספר תכנית, יח״ד קיימות, יח״ד בתב״ע, יח״ד להתחדשות, מצב היתר, אישור תכנית, יעד הבא, הערות.
כלל: extractedData יכיל רק שדות שבאמת מופיעים במסמך עבור אותו פרויקט. אל תמציא.`;

    const parts: any[] = [{ text: prompt }];
    if (text) {
      parts.push({ text: `תוכן המסמך (${fileName}):\n${String(text).slice(0, 120000)}` });
    } else {
      const fr = await fetch(fileUrl);
      if (!fr.ok) return json({ error: `לא ניתן להוריד את הקובץ (${fr.status})` }, 400);
      const buf = new Uint8Array(await fr.arrayBuffer());
      parts.push({ inline_data: { mime_type: "application/pdf", data: encodeBase64(buf) } });
    }

    const gr = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts }],
          generationConfig: { temperature: 0.1, maxOutputTokens: 16384, responseMimeType: "application/json", thinkingConfig: { thinkingBudget: 0 } },
        }),
      },
    );
    if (!gr.ok) {
      const t = await gr.text();
      console.error("Gemini error", gr.status, t);
      return json({ error: gr.status === 429 ? "חרגנו ממכסת הבקשות, נסה שוב בעוד רגע" : `שגיאת ניתוח (${gr.status})` }, gr.status === 429 ? 429 : 500);
    }
    const gd = await gr.json();
    const raw = (gd?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text || "").join("");
    let parsed: any;
    try {
      parsed = JSON.parse(raw.replace(/```json\n?|```\n?/g, "").trim());
    } catch {
      return json({ error: "לא ניתן לפענח את תשובת הניתוח" }, 500);
    }
    const norm = (s: string) => s.replace(/[\s״"'׳–\-()]/g, "");
    const results = (parsed.results || []).map((r: any) => {
      const name = r.matchedProjectName;
      const match = name
        ? (projects || []).find((p) => p.project_name === name) ||
          (projects || []).find((p) => norm(p.project_name) === norm(name))
        : null;
      return { ...r, extractedData: r.extractedData || {}, projectId: match?.id || null, matchedProjectName: match?.project_name || null };
    });
    return json({ results, summary: parsed.summary || "" });
  } catch (e: any) {
    console.error(e);
    return json({ error: e?.message || "שגיאה לא צפויה" }, 500);
  }
});
