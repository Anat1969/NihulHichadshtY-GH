import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Doc = { name: string; type: string; url: string };

const UA =
  "Mozilla/5.0 (compatible; AshdodComplotBot/1.0; +https://ashdod.muni.il)";

// fetch with retry + UA — works around intermittent TLS HandshakeFailure
// against ags.iplan.gov.il / mavat.iplan.gov.il.
async function safeFetch(url: string, init: RequestInit = {}, attempts = 3): Promise<Response | null> {
  for (let i = 0; i < attempts; i++) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 15000);
      console.log(`[iplan-documents] FETCH attempt ${i + 1}: ${url}`);
      const r = await fetch(url, {
        ...init,
        signal: ctrl.signal,
        headers: {
          "User-Agent": UA,
          "Accept": "application/json,text/html;q=0.9,*/*;q=0.8",
          "Accept-Language": "he,en;q=0.8",
          ...(init.headers || {}),
        },
      });
      clearTimeout(t);
      console.log(`[iplan-documents] -> status ${r.status}`);
      return r;
    } catch (e: any) {
      console.warn(`[iplan-documents] attempt ${i + 1} failed: ${e?.message || e}`);
      await new Promise((res) => setTimeout(res, 600 * (i + 1)));
    }
  }
  return null;
}

function buildQueryUrl(whereClause: string): string {
  return (
    `https://ags.iplan.gov.il/arcgisiplan/rest/services/PlanningPublic/Xplan/MapServer/1/query` +
    `?where=${encodeURIComponent(whereClause)}` +
    `&outFields=OBJECTID,PLAN_NUMBER,PLAN_NAME,PLAN_COUNTY_NAME&f=json`
  );
}

async function lookupObjectId(planNumber: string, projectName?: string): Promise<number | null> {
  const variants: string[] = [];
  const pn = planNumber.trim();
  if (pn) {
    // Try with space after slash, exact, and trimmed
    if (pn.includes("/")) {
      const [a, b] = pn.split("/");
      variants.push(`PLAN_NUMBER='${a}/ ${b.trim()}'`);
      variants.push(`PLAN_NUMBER='${a}/${b.trim()}'`);
    } else {
      variants.push(`PLAN_NUMBER='${pn}'`);
    }
  }
  if (projectName) {
    const cleaned = projectName.replace(/['"\\]/g, "").trim();
    if (cleaned) variants.push(`PLAN_NAME LIKE '%${cleaned}%'`);
    // strip "ה" prefix variant
    const noHe = cleaned.replace(/^ה/, "");
    if (noHe && noHe !== cleaned) variants.push(`PLAN_NAME LIKE '%${noHe}%'`);
  }

  for (const where of variants) {
    const url = buildQueryUrl(where);
    const r = await safeFetch(url);
    if (!r || !r.ok) continue;
    try {
      const j = await r.json();
      const oid = j?.features?.[0]?.attributes?.OBJECTID;
      console.log(`[iplan-documents] where=${where} oid=${oid ?? "none"}`);
      if (typeof oid === "number") return oid;
    } catch (e) {
      console.warn(`[iplan-documents] parse error for ${where}:`, e);
    }
  }
  return null;
}

function classify(name: string): string | null {
  const s = String(name || "");
  if (/הוראות/.test(s)) return "הוראות";
  if (/תשריט/.test(s)) return "תשריט";
  return null;
}

function extractDocsFromAny(data: any): Doc[] {
  const out: Doc[] = [];
  const visit = (node: any) => {
    if (!node) return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (typeof node === "object") {
      const name = node.name || node.fileName || node.docName || node.title || node.DOC_NAME || node.entityName;
      const url = node.url || node.fileUrl || node.docUrl || node.link || node.DOC_URL || node.path;
      if (name && url && /\.pdf(\?|$)/i.test(String(url))) {
        const type = classify(String(name));
        if (type) out.push({ name: String(name), type, url: String(url) });
      }
      for (const k of Object.keys(node)) visit(node[k]);
    }
  };
  visit(data);
  return out;
}

async function fetchDocs(objectId: number): Promise<Doc[]> {
  const endpoints = [
    `https://mavat.iplan.gov.il/api/plan/${objectId}/documents`,
    `https://mavat.iplan.gov.il/SV4/1/${objectId}/310`,
  ];
  for (const url of endpoints) {
    const r = await safeFetch(url);
    if (!r || !r.ok) continue;
    const ct = r.headers.get("content-type") || "";
    let docs: Doc[] = [];
    try {
      if (ct.includes("json")) {
        const j = await r.json();
        console.log(`[iplan-documents] json keys: ${Object.keys(j || {}).join(",")}`);
        docs = extractDocsFromAny(j);
      } else {
        const text = await r.text();
        console.log(`[iplan-documents] html length: ${text.length}`);
        const re = /href=["']([^"']+\.pdf[^"']*)["'][^>]*>([^<]+)/gi;
        let m: RegExpExecArray | null;
        while ((m = re.exec(text)) !== null) {
          const rawUrl = m[1].startsWith("http")
            ? m[1]
            : `https://mavat.iplan.gov.il${m[1].startsWith("/") ? "" : "/"}${m[1]}`;
          const name = m[2].trim();
          const type = classify(name);
          if (type) docs.push({ name, type, url: rawUrl });
        }
      }
    } catch (e) {
      console.warn(`[iplan-documents] parse error for ${url}:`, e);
    }
    if (docs.length) {
      console.log(`[iplan-documents] found ${docs.length} docs at ${url}`);
      return docs;
    }
  }
  return [];
}

function getSb() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const action = body.action || "list";

    if (action === "list") {
      const planNumber = String(body.planNumber || "").trim();
      const projectId = body.projectId ? String(body.projectId) : null;
      const sb = getSb();

      // 1) Try cached objectid from projects table
      let objectId: number | null = null;
      let projectName: string | undefined;
      if (projectId) {
        const { data: p } = await sb.from("projects")
          .select("iplan_object_id, project_name")
          .eq("id", projectId)
          .maybeSingle();
        if (p?.iplan_object_id) {
          objectId = Number(p.iplan_object_id);
          console.log(`[iplan-documents] using cached object_id=${objectId} for project ${projectId}`);
        }
        projectName = p?.project_name || undefined;
      }

      // 2) Hardcoded fallback for "המעפילים"
      if (!objectId && projectName && /מעפילים/.test(projectName)) {
        objectId = 6000390881;
        console.log(`[iplan-documents] hardcoded object_id=${objectId} for המעפילים`);
      }

      // 3) Lookup via iplan with multiple variants
      if (!objectId && planNumber) {
        objectId = await lookupObjectId(planNumber, projectName);
      }

      // 4) Last-resort: query iplan by OBJECTID itself (sanity)
      if (!objectId) {
        const url = buildQueryUrl("OBJECTID=6000390881").replace("OBJECTID,PLAN_NUMBER", "*");
        const r = await safeFetch(url);
        if (r?.ok) {
          try {
            const j = await r.json();
            const oid = j?.features?.[0]?.attributes?.OBJECTID;
            if (typeof oid === "number") objectId = oid;
          } catch { /* ignore */ }
        }
      }

      if (!objectId) {
        return new Response(JSON.stringify({
          error: "לא נמצא OBJECTID לתוכנית במאגר iplan",
          documents: [],
        }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Cache it for next time
      if (projectId) {
        await sb.from("projects").update({ iplan_object_id: objectId }).eq("id", projectId);
      }

      const documents = await fetchDocs(objectId);
      return new Response(JSON.stringify({ objectId, documents }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "save") {
      const projectId = String(body.projectId || "").trim();
      const url = String(body.url || "").trim();
      const name = String(body.name || "מסמך").trim();
      const type = String(body.type || "הוראות").trim();
      if (!projectId || !url) {
        return new Response(JSON.stringify({ error: "projectId/url חסרים" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const sb = getSb();
      const fileResp = await safeFetch(url);
      if (!fileResp || !fileResp.ok) throw new Error(`הורדת PDF נכשלה (${fileResp?.status ?? "no-resp"})`);
      const buf = new Uint8Array(await fileResp.arrayBuffer());
      const category = type === "תשריט" ? "drawings" : "plan_instructions";
      const safeName = `${Date.now()}_${Math.random().toString(36).slice(2)}.pdf`;
      const path = `${projectId}/${category}/${safeName}`;
      const { error: upErr } = await sb.storage.from("project-assets").upload(path, buf, {
        contentType: "application/pdf",
      });
      if (upErr) throw upErr;
      const { data: urlData } = sb.storage.from("project-assets").getPublicUrl(path);
      const { error: insErr } = await sb.from("project_assets").insert({
        project_id: projectId,
        file_path: urlData.publicUrl,
        asset_type: category,
        description: name,
        source: "iplan",
        slide_number: null,
      });
      if (insErr) throw insErr;
      return new Response(JSON.stringify({ ok: true, category, publicUrl: urlData.publicUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("iplan-documents error:", e);
    return new Response(JSON.stringify({ error: e?.message ?? "שגיאה" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
