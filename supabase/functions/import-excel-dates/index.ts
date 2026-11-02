import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Map Excel column index to stage_id
// Excel columns (0-based from column 15 which is index 15):
// col 15: תאריך עמידה בתנאי סף במקומית → taba_submission
// col 16: תאריך דיון מקומית → taba_validation
// col 17: תאריך העברה למחוז → taba_deposit
// col 18: תאריך עמידה בתנאי סף מחוזי → taba_objections
// col 19: תאריך דיון הפקדה → taba_approval
// col 20: הפקדה בפועל → taba_published
// col 21: תאריך דיון מתן תוקף → committee_decision
// col 22: מתן תוקף בפועל → permit
// col 25: תאריך מתן היתר → execution

const COL_TO_STAGE: Record<number, string> = {
  15: 'taba_submission',
  16: 'taba_validation',
  17: 'taba_deposit',
  18: 'taba_objections',
  19: 'taba_approval',
  20: 'taba_published',
  21: 'committee_decision',
  22: 'taba_published',
};

// Stage order for comparison
const STAGE_ORDER: Record<string, number> = {
  pre_feasibility: 1, resident_agreements: 2, resident_committee: 3,
  developer_selection: 4, architect_team: 5, taba_preparation: 6,
  taba_submission: 7, taba_validation: 8, taba_deposit: 9,
  taba_objections: 10, taba_approval: 11, taba_published: 12,
  binui_prep_forum1: 13, forum1_harmonika: 14, binui_post_forum1: 15,
  forum2_consultants: 16, design_review_pre_forum3: 17,
  forum3_committee_prep: 18, committee_decision: 19,
  licensing_prep: 20, submission: 21, completion_rounds: 22,
  permit: 23, execution: 24, occupancy: 25,
};

// Map Excel status text to stage_id
const STATUS_TO_STAGE: Record<string, string> = {
  'אושרה למתן תוקף': 'taba_published',
  'מתן תוקף': 'permit',
  'תוקף': 'permit',
  'הכנה לדיון הפקדה': 'taba_approval',
  'ממתין להפקדה': 'taba_approval',
  'הכנות מקדמיות מול הותמ"ל': 'taba_deposit',
  'בטיפול לשכת התכנון': 'taba_objections',
  'השלמת תנאים טרם הפקדה': 'taba_approval',
  'השלמת תנאי ועדה מחוזית לפני הפקדה': 'taba_objections',
  'תיקון מסמכים על בסיס החלטת מקומית': 'taba_validation',
  'טרם הוגשה תכנית': 'taba_submission',
  'הגישו מסמכים - טרם עמדו בתנאי הסף': 'taba_submission',
  'התוכנית החלה בלשכת התכנון': 'taba_deposit',
  'טרם עמידה בתנאי סף בלשכת תכנון מחוזית': 'taba_objections',
  'בחינת חלופות תכנון': 'taba_preparation',
  'אי עמידה בתנאי סף': 'taba_submission',
  'הכנת חוות דעת לדיון מקומית': 'taba_validation',
  'לקראת מתן תוקף': 'committee_decision',
};

function parseDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date || (typeof val === 'object' && val?.toISOString)) {
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return null;
      return d.toISOString().split('T')[0];
    } catch { return null; }
  }
  if (typeof val === 'string') {
    // Try to parse date strings like "29/03/2022"
    const match = val.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (match) {
      const [, d, m, y] = match;
      return `${y}-${m.padStart(2,'0')}-${d.padStart(2,'0')}`;
    }
    // Try ISO
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    // Excel serial date
    const d = new Date((val - 25569) * 86400 * 1000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  }
  return null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const sb = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Receive pre-parsed data from client
    // { sheets: [{ name: string, rows: any[][] }] }
    const { sheets } = await req.json();

    if (!sheets || !Array.isArray(sheets)) {
      return new Response(JSON.stringify({ error: 'No sheets data provided' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const results: any[] = [];

    for (const sheet of sheets) {
      const { name: sheetName, rows } = sheet;

      if (!rows || rows.length < 2) {
        results.push({ sheet: sheetName, status: 'empty' });
        continue;
      }

      const dataRow = rows[1]; // Row index 1 = Excel row 2 (data row)

      if (!dataRow || dataRow.every((c: any) => c === null || c === undefined || c === '')) {
        results.push({ sheet: sheetName, status: 'empty' });
        continue;
      }

      // Find project by sheet name
      const { data: projects } = await sb.from('projects')
        .select('id, project_name, main_stage')
        .ilike('project_name', `%${sheetName.trim()}%`)
        .limit(1);

      if (!projects || projects.length === 0) {
        results.push({ sheet: sheetName, status: 'not_found' });
        continue;
      }

      const project = projects[0];

      const stageDates: Record<string, string> = {};

      // Extract dates from columns
      for (const [colStr, stageId] of Object.entries(COL_TO_STAGE)) {
        const colIdx = parseInt(colStr);
        const val = dataRow[colIdx];
        const date = parseDate(val);
        if (date) stageDates[stageId] = date;
      }

      // Upsert stage dates
      let datesInserted = 0;
      for (const [stageId, date] of Object.entries(stageDates)) {
        const { error } = await sb.from('project_stage_dates')
          .upsert({
            project_id: project.id,
            stage_id: stageId,
            actual_start: date,
            planned_start: date,
          }, { onConflict: 'project_id,stage_id' });
        if (!error) datesInserted++;
      }

      // Determine most advanced stage from dates
      let mostAdvancedStage = '';
      let mostAdvancedOrder = 0;
      for (const stageId of Object.keys(stageDates)) {
        const order = STAGE_ORDER[stageId] || 0;
        if (order > mostAdvancedOrder) {
          mostAdvancedOrder = order;
          mostAdvancedStage = stageId;
        }
      }

      // Check status text col 14
      const statusText = dataRow[14];
      if (typeof statusText === 'string') {
        for (const [text, stageId] of Object.entries(STATUS_TO_STAGE)) {
          if (statusText.includes(text)) {
            const order = STAGE_ORDER[stageId] || 0;
            if (order > mostAdvancedOrder) {
              mostAdvancedOrder = order;
              mostAdvancedStage = stageId;
            }
            break;
          }
        }
      }

      // Update main_stage ONLY if more advanced
      let stageUpdated = false;
      if (mostAdvancedStage) {
        const currentOrder = STAGE_ORDER[project.main_stage] || 0;
        // Never downgrade from binui stages (order >= 13) using Excel data
        // Excel only has taba data (stages 1-12), binui data comes from the system
        if (mostAdvancedOrder > currentOrder && currentOrder < 13) {
          await sb.from('projects')
            .update({ main_stage: mostAdvancedStage })
            .eq('id', project.id);
          stageUpdated = true;
        }
      }

      results.push({
        sheet: sheetName,
        project: project.project_name,
        status: 'ok',
        datesInserted,
        mostAdvancedStage,
        stageUpdated,
        currentStage: project.main_stage,
      });
    }

    return new Response(JSON.stringify({ ok: true, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (e: any) {
    console.error('import-excel-dates error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});