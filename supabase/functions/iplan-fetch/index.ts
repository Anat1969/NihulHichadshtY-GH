import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GEMINI_MODEL = "gemini-2.5-flash";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { planNumber } = await req.json();
    if (!planNumber || typeof planNumber !== "string") {
      return new Response(JSON.stringify({ error: "מספר תוכנית חסר" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY חסר" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build iplan search URL
    const searchUrl = `https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer/1/query?where=PLAN_COUNTY_NAME%3D%27%D7%90%D7%A9%D7%93%D7%95%D7%93%27+AND+PLAN_NUMBER%3D%27${encodeURIComponent(planNumber)}%27&outFields=*&f=json`;

    let iplanData = "";
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);
      const resp = await fetch(searchUrl, { signal: controller.signal });
      clearTimeout(timeout);
      if (resp.ok) {
        const json = await resp.json();
        iplanData = JSON.stringify(json?.features?.[0]?.attributes || {});
      }
    } catch (e) {
      console.error("iplan fetch failed:", e);
      iplanData = "";
    }

    // Also try the mavat URL for richer data
    const mavatUrl = `https://mavat.iplan.gov.il/SV4/1/${planNumber.replace(/-/g, "")}`;

    const prompt = `אתה מחלץ נתוני תוכנית בנייה מידע תכנוני ממקורות שונים.

מספר התוכנית: ${planNumber}

נתונים מ-iplan API (אם זמינים):
${iplanData || "לא התקבלו נתונים מה-API"}

URL לצפייה: ${mavatUrl}

בהתבסס על מספר התוכנית ${planNumber} והנתונים שהתקבלו, חלץ את המידע הבא בפורמט JSON בלבד:
{
  "plan_number": "${planNumber}",
  "project_name": "שם הפרויקט/מתחם (אם ידוע מה-API)",
  "developer": "שם היזם (אם ידוע)",
  "address_cluster_summary": "כתובת המתחם (אם ידועה)",
  "quarter": "רובע (אם ידוע, מספר בלבד)",
  "units_in": null,
  "units_out": null,
  "authority": "עיריית אשדוד",
  "plan_status": "סטטוס התוכנית (אם ידוע)",
  "notes": "הערות נוספות רלוונטיות"
}

אם שדה לא ידוע — השתמש ב-null. החזר JSON בלבד ללא טקסט נוסף.`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const geminiResp = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
      }),
    });

    if (!geminiResp.ok) {
      const err = await geminiResp.text();
      console.error("Gemini error:", err);
      return new Response(JSON.stringify({ error: "שגיאה בשליפת נתונים" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const geminiData = await geminiResp.json();
    const content = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text || "{}";

    let parsed: Record<string, any> = {};
    try {
      parsed = JSON.parse(content);
    } catch {
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { parsed = {}; }
      }
    }

    return new Response(JSON.stringify({ data: parsed, iplanUrl: mavatUrl }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e: any) {
    console.error("iplan-fetch error:", e);
    return new Response(JSON.stringify({ error: e?.message || "שגיאה לא צפויה" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
