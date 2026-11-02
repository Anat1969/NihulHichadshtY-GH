import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `אתה מחלץ מידע על פרויקטי התחדשות עירונית ממסמכים בעברית עבור מערכת ניהול פינוי-בינוי בעיריית אשדוד.

המשתמש מספק טקסט גולמי שחולץ ממסמך. הטקסט יכול להגיע מ:

- מצגות סטטוס (שקפים עם שמות פרויקטים, חסמים, פעולות)

- פרוטוקולי ישיבות (החלטות, משימות, תאריכים)

- מיילים ועדכונים (בקשות, חסמים, אחראים)

- טבלאות עם עמודות כגון: שם פרויקט, סטטוס, חסם, פעולה הבאה, תאריך, אחראי

## המשימה

זהה כמה שיותר פריטים ברמת פרויקט. היה סובלני מאוד — עדיף יותר פריטים חלקיים מאשר רשימה ריקה.

## כללים קריטיים

1. שורה תקפה = יש שם פרויקט + לפחות שדה אחד (חסם/פעולה/תאריך/הערה)

2. אם הטקסט מכיל שמות של שכונות, רחובות, מתחמים — אלה כנראה שמות פרויקטים

3. חפש מילות מפתח: חסם, תקוע, ממתין, לתאם, לבדוק, לאשר, עד תאריך, אחראי

4. גם אם הטקסט לא מובנה כטבלה — נסה לחלץ

5. שמות פרויקטים אפשריים: מרגנית, הרב מימון, המעפילים, מרכז מסחרי, משמר הירדן, אח"י אילת, רונגזין מערב, רמב"ם, אבן גבירול, וכל שם אחר שנראה כמו שכונה/מתחם/רחוב

6. blocker = חסם / בעיה / מה שמעכב / ממתין ל...

7. nextAction = פעולה הבאה / מה צריך לעשות / המלצה

8. dueDate: פורמט YYYY-MM-DD. אם לא בטוח — null

9. אם אותו פרויקט מופיע כמה פעמים עם מידע שונה — הוצא פריטים נפרדים

10. confidence: high = מידע ברור, medium = חלקי, low = שם בלבד + שדה אחד

## חשוב ביותר

אם הטקסט מכיל תוכן רלוונטי כלשהו — הוצא פריטים. אל תחזיר רשימה ריקה אלא אם הטקסט הוא לחלוטין לא רלוונטי (לדוגמה: קוד תוכנה, טקסט באנגלית שאינו קשור, וכו').

החזר רק JSON תקני: { "items": [...] }. ללא טקסט נוסף, ללא code fences.`;

// Gemini structured response schema (constrained output)
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    items: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          projectName: { type: "STRING", nullable: true },
          blocker: { type: "STRING", nullable: true },
          nextAction: { type: "STRING", nullable: true },
          owner: { type: "STRING", nullable: true },
          dueDate: { type: "STRING", nullable: true },
          notes: { type: "STRING", nullable: true },
          forumContext: { type: "STRING", nullable: true },
          confidence: { type: "STRING", nullable: true, enum: ["high", "medium", "low"] },
        },
      },
    },
  },
  required: ["items"],
};

const GEMINI_MODEL = "gemini-2.5-flash";
const MAX_INPUT_CHARS = 60000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, fileName } = await req.json();
    if (!text || typeof text !== "string") {
      return new Response(JSON.stringify({ error: "missing text" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "מפתח Gemini אינו מוגדר במערכת. פנה למנהל." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userPrompt = `שם קובץ: ${fileName || "לא ידוע"}\n\nטקסט המסמך:\n${text.slice(0, 60000)}`;

    // Direct Gemini API (generateContent) with structured JSON output
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 45000);

    let resp: Response;
    try {
      resp = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          systemInstruction: { role: "system", parts: [{ text: SYSTEM }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            maxOutputTokens: 8192,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      });
    } catch (netErr: any) {
      clearTimeout(timeout);
      if (netErr?.name === "AbortError") {
        return new Response(JSON.stringify({ error: "פג זמן הקריאה ל-Gemini. נסה שוב או קצר את המסמך." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      console.error("Gemini network error:", netErr);
      return new Response(JSON.stringify({ error: "שגיאת רשת בגישה ל-Gemini. נסה שוב בעוד רגע." }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    clearTimeout(timeout);

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Gemini API error:", resp.status, errText);
      let detail = "";
      try {
        const j = JSON.parse(errText);
        detail = j?.error?.message || "";
      } catch { /* ignore */ }
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "חרגנו ממכסת הבקשות ל-Gemini. נסה שוב בעוד רגע." }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 401 || resp.status === 403) {
        return new Response(JSON.stringify({ error: `בעיית הרשאה ב-Gemini${detail ? `: ${detail}` : ""}. ודא שהמפתח תקף ושה-Generative Language API מופעל.` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 404) {
        return new Response(JSON.stringify({ error: `מודל Gemini לא זמין (${GEMINI_MODEL})${detail ? `: ${detail}` : ""}.` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 400) {
        return new Response(JSON.stringify({ error: `בקשה שגויה ל-Gemini${detail ? `: ${detail}` : ""}.` }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `שגיאת Gemini (${resp.status})${detail ? `: ${detail}` : ""}. נסה שוב מאוחר יותר.` }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const content =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text || "").join("") || "{}";
    const finishReason = data?.candidates?.[0]?.finishReason || null;
    const promptFeedback = data?.promptFeedback || null;

    let parsed: { items?: any[] } = { items: [] };
    let parseError: string | null = null;
    try {
      parsed = JSON.parse(content);
    } catch (e: any) {
      parseError = String(e?.message || e);
      const m = content.match(/\{[\s\S]*\}/);
      if (m) {
        try { parsed = JSON.parse(m[0]); parseError = null; } catch (e2: any) { parseError = String(e2?.message || e2); parsed = { items: [] }; }
      }
    }
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

    const cleanStr = (v: any): string | null => {
      if (v == null) return null;
      const s = String(v).trim();
      if (!s || s.toLowerCase() === "null" || s === "-" || s === "—") return null;
      return s;
    };
    const items = rawItems
      .map((it: any) => ({
        projectName: cleanStr(it?.projectName),
        blocker: cleanStr(it?.blocker),
        nextAction: cleanStr(it?.nextAction),
        owner: cleanStr(it?.owner),
        dueDate: cleanStr(it?.dueDate),
        notes: cleanStr(it?.notes),
        forumContext: cleanStr(it?.forumContext),
        confidence: cleanStr(it?.confidence) || "medium",
      }))
      .filter((it: any) =>
        !!it.projectName &&
        (it.blocker || it.nextAction || it.dueDate || it.notes)
      );

    console.log(`[import-extract] raw=${rawItems.length} kept=${items.length} finishReason=${finishReason} parseErr=${parseError} contentLen=${content.length} textLen=${text.length} fileName=${fileName || "?"}`);
    if (rawItems.length === 0) {
      console.log(`[import-extract] ZERO ITEMS — content preview: ${content.slice(0, 800)}`);
      console.log(`[import-extract] ZERO ITEMS — input preview: ${text.slice(0, 500)}`);
      console.log(`[import-extract] ZERO ITEMS — promptFeedback: ${JSON.stringify(promptFeedback)}`);
    }

    return new Response(JSON.stringify({
      items,
      _debug: {
        raw: rawItems.length,
        kept: items.length,
        finishReason,
        parseError,
        contentPreview: rawItems.length === 0 ? content.slice(0, 500) : undefined,
        promptFeedback: rawItems.length === 0 ? promptFeedback : undefined,
        inputLen: text.length,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("import-actions-extract error", e);
    return new Response(JSON.stringify({ error: "שגיאה לא צפויה בעיבוד המסמך. נסה שוב." }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
