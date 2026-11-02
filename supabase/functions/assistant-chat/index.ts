import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `אתה Yohan — סוכן AI חכם לניהול פרויקטי התחדשות עירונית בעיריית אשדוד.

## הכלל הבסיסי שלך:

כל בקשה שמשתמש שולח לך — אתה מנסה לבצע אותה. אתה לא מסביר למה זה קשה. אתה פשוט עושה.

## איך לחשוב:

1. קרא את הבקשה
2. זהה אילו נתונים צריך
3. השתמש בכלים הזמינים לשלוף את הנתונים
4. הרכב תשובה מלאה ומסודרת

## כלים זמינים:

- get_project_by_id / get_project_by_name — פרטי פרויקט בודד
- get_all_projects_status — כל הפרויקטים עם סטטוס, שלב, חסמים
- get_projects_field_list — רשימת כל הפרויקטים עם שדה ספציפי
- get_project_tasks — משימות של פרויקט
- get_project_forum_status — סטטוס יועצים
- create_task / create_meeting / create_reminder — יצירת פעולות
- update_project_field — עדכון שדה בפרויקט

## דוגמאות לבקשות שאתה חייב לבצע:

- "הצג רשימת אדריכלים לפי פרויקט" → get_projects_field_list(field="architect")
- "אילו פרויקטים תקועים?" → get_all_projects_status() + סנן לפי חסמים
- "מי היזם של כל פרויקט?" → get_projects_field_list(field="developer")
- "כמה פרויקטים בכל שלב?" → get_all_projects_status() + קבץ לפי שלב
- "צור משימה לפרויקט X" → get_project_by_name() + create_task()

## כללי תשובה:

- תמיד ענה בעברית
- תמיד השתמש בכלים לפני שאתה עונה — אל תנחש נתונים
- אם חסר כלי — אמור מה בדיוק חסר ואיך לפתור
- הצג נתונים בטבלה או רשימה מסודרת
- אל תגיד "אין לי גישה" אם יש לך כלי שיכול לפתור את הבעיה

שלבי הפרויקט (לשימוש ב-update_project_stage):

pre_feasibility, resident_agreements, resident_committee, developer_selection, architect_team,

taba_preparation, taba_submission, taba_validation, taba_deposit, taba_objections,

taba_approval, taba_published, forum1_harmonika, binui_post_forum1,

forum2_consultants, design_review_pre_forum3, forum3_committee_prep, committee_decision,

licensing_prep, submission, completion_rounds, permit, execution, occupancy

כשמבקשים לבצע פעולה על פרויקט לפי שם (למשל "המעפילים", "הרב מימון"):

1. קרא תחילה ל-search_projects עם שם הפרויקט.
2. קבל את ה-id מהתוצאה.
3. בצע את הפעולה המבוקשת עם ה-id שקיבלת.

אל תניח project_id בלי לחפש קודם.

כשאתה מציג שמות שלבים בתשובות — תמיד תרגם לעברית לפי הטבלה:

pre_feasibility=היתכנות ראשונית, resident_agreements=הסכמות דיירים,
resident_committee=מינוי נציגות, developer_selection=בחירת יזם,
architect_team=מינוי אדריכל, taba_preparation=הכנת תב"ע,
taba_submission=הגשה למקומית, taba_validation=בדיקת שלמות,
taba_deposit=פרסום להפקדה, taba_objections=דיון התנגדויות,
taba_approval=אישור מחוזי, taba_published=פרסום לתוקף,
forum1_harmonika=פורום 1 – הרמוניקה,
binui_post_forum1=בינוי – תיקונים אחרי פורום 1,
forum2_consultants=פורום 2 – יועצים,
design_review_pre_forum3=בקרת תכן לפני פורום 3,
forum3_committee_prep=פורום 3 – הכנה לוועדה,
committee_decision=ועדה – החלטה,
licensing_prep=רישוי – הכנה, submission=הגשה/קליטה,
completion_rounds=סבבי השלמות, permit=היתר,
execution=ביצוע, occupancy=אכלוס.

לעולם אל תציג stage_id טכני כמו forum1_harmonika בתשובה לסופי.

לעולם אל תציג שדה id / UUID / מזהה טכני של פרויקט, משימה, ישיבה או כל ישות אחרת בתשובה למשתמש. השתמש ב-id רק פנימית לצורך קריאה לכלים. אל תכלול בתשובה שורות כמו "מזהה: ..." או UUIDs.`;

// Tools: search_projects, get_project_by_id, get_all_projects, get_project_tasks,
// get_project_meetings, create_task, update_project_field, create_meeting,
// add_reminder, add_calendar_event, complete_task
// Gemini-native function declarations
const FUNCTION_DECLARATIONS = [
  {
    name: "get_project_by_id",
    description: "מחזיר פרויקט פינוי-בינוי לפי מזהה",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "search_projects",
    description: "חיפוש פרויקטים לפי שם / כתובת / מספר תוכנית",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "get_dashboard_summary",
    description:
      "מחזיר סיכום מצב כללי: מספר פרויקטים, משימות פתוחות, תזכורות, אתרי תמ״א",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_tama_site_by_id",
    description: "מחזיר אתר תמ״א בביצוע לפי מזהה",
    parameters: {
      type: "object",
      properties: { id: { type: "string" } },
      required: ["id"],
    },
  },
  {
    name: "create_formal_document_draft",
    description:
      "מכין טיוטה למסמך רשמי (לוגית בלבד — מחזיר אובייקט טיוטה, לא יוצר קובץ)",
    parameters: {
      type: "object",
      properties: {
        subject: { type: "string" },
        body: { type: "string" },
        entityType: {
          type: "string",
          enum: ["project", "tama_site", "meeting"],
        },
        entityId: { type: "string" },
      },
      required: ["subject", "body"],
    },
  },
  {
    name: "search_system_entities",
    description:
      "חיפוש רוחבי במערכת: פרויקטים, אתרי תמ״א, משימות ותזכורות",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
  },
  {
    name: "get_project_forum_status",
    description: "מחזיר סטטוס יועצים (פורום 2) ובקרת תכן (פורום 1) של פרויקט",
    parameters: {
      type: "object",
      properties: { project_id: { type: "string" } },
      required: ["project_id"],
    },
  },
  {
    name: "get_all_projects_status",
    description: "מחזיר רשימת כל הפרויקטים עם שלב, סטטוס, חסם ופעולה הבאה",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_projects_field_list",
    description: "מחזיר רשימה של כל הפרויקטים עם ערך שדה מסוים. שימושי לשאלות כמו: מי האדריכל של כל פרויקט, מה היזם של כל פרויקט, וכו'",
    parameters: {
      type: "object",
      properties: {
        field: { type: "string", description: "שם השדה לשליפה (למשל: architect, developer, plan_number, main_stage, plan_submitter)" },
      },
      required: ["field"],
    },
  },
  {
    name: "create_task",
    description: "יוצר משימה חדשה עם כותרת, אחראי ותאריך יעד — מופיעה בלשונית המשימות של הפרויקט. השתמש בזה כשמבקשים להוסיף משימה, תפקיד, או פעולה עם אחראי ספציפי.",
    parameters: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "מזהה הפרויקט" },
        title: { type: "string", description: "כותרת המשימה" },
        owner: { type: "string", description: "שם האחראי" },
        deadline: { type: "string", description: "תאריך יעד בפורמט YYYY-MM-DD" },
        priority: { type: "string", enum: ["low","medium","high"], description: "עדיפות" },
      },
      required: ["project_id", "title"],
    },
  },
  {
    name: "update_project_blocker",
    description: "מעדכן את החסם המרכזי של הפרויקט",
    parameters: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        blocker: { type: "string", description: "תיאור החסם. שלח מחרוזת ריקה '' כדי לנקות חסם." },
      },
      required: ["project_id", "blocker"],
    },
  },
  {
    name: "update_project_stage",
    description: "מקדם או משנה את שלב הפרויקט",
    parameters: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        stage_id: {
          type: "string",
          description: "מזהה השלב מהרשימה: pre_feasibility, resident_agreements, resident_committee, developer_selection, architect_team, taba_preparation, taba_submission, taba_validation, taba_deposit, taba_objections, taba_approval, taba_published, forum1_harmonika, binui_post_forum1, forum2_consultants, design_review_pre_forum3, forum3_committee_prep, committee_decision, licensing_prep, submission, completion_rounds, permit, execution, occupancy"
        },
      },
      required: ["project_id", "stage_id"],
    },
  },
  {
    name: "create_meeting",
    description: "יוצר ישיבת פורום חדשה בפרויקט",
    parameters: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        forum_type: { type: "string", enum: ["forum1","forum2","forum3"] },
        date: { type: "string", description: "תאריך בפורמט YYYY-MM-DD" },
        time: { type: "string", description: "שעת התחלה HH:MM" },
        time_end: { type: "string", description: "שעת סיום HH:MM" },
        location: { type: "string" },
        summary: { type: "string", description: "נושאי הישיבה" },
      },
      required: ["project_id", "forum_type"],
    },
  },
  {
    name: "add_reminder",
    description: "מוסיף תזכורת עם תאריך ושעה",
    parameters: {
      type: "object",
      properties: {
        project_id: { type: "string", description: "מזהה פרויקט (אופציונלי)" },
        message: { type: "string", description: "תוכן התזכורת" },
        due_at: { type: "string", description: "תאריך ושעה ISO: YYYY-MM-DDTHH:MM:00" },
      },
      required: ["message", "due_at"],
    },
  },
  {
    name: "add_calendar_event",
    description: "מוסיף אירוע ליומן האירועים",
    parameters: {
      type: "object",
      properties: {
        title: { type: "string" },
        date: { type: "string", description: "YYYY-MM-DD" },
        time_start: { type: "string", description: "HH:MM" },
        time_end: { type: "string", description: "HH:MM" },
        project_id: { type: "string" },
        type: { type: "string", enum: ["meeting","task","action","reminder","milestone"] },
        priority: { type: "string", enum: ["normal","attention","urgent","done"] },
        notes: { type: "string" },
      },
      required: ["title", "date"],
    },
  },
  {
    name: "complete_task",
    description: "מסמן משימה כהושלמה לפי כותרת ופרויקט",
    parameters: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        task_title_query: { type: "string", description: "חלק מכותרת המשימה לחיפוש" },
      },
      required: ["project_id", "task_title_query"],
    },
  },
  {
    name: "delete_task",
    description: "מוחק משימה לפי כותרת ופרויקט",
    parameters: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        task_title_query: { type: "string", description: "חלק מכותרת המשימה למחיקה" },
      },
      required: ["project_id", "task_title_query"],
    },
  },
  {
    name: "delete_meeting",
    description: "מוחק ישיבת פורום לפי פרויקט ופורום",
    parameters: {
      type: "object",
      properties: {
        project_id: { type: "string" },
        forum_type: { type: "string", enum: ["forum1","forum2","forum3"] },
        meeting_number: { type: "number", description: "מספר הישיבה (אופציונלי)" },
      },
      required: ["project_id", "forum_type"],
    },
  },
  {
    name: "get_project_tasks",
    description: "מחזיר את המשימות הפתוחות של פרויקט",
    parameters: {
      type: "object",
      properties: { project_id: { type: "string" } },
      required: ["project_id"],
    },
  },
  {
    name: "get_project_meetings",
    description: "מחזיר את ישיבות הפורום של פרויקט",
    parameters: {
      type: "object",
      properties: { project_id: { type: "string" } },
      required: ["project_id"],
    },
  },
];

function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
}

async function runTool(name: string, args: any): Promise<any> {
  const sb = getSupabase();
  try {
    switch (name) {
      case "get_project_by_id": {
        const { data, error } = await sb
          .from("projects")
          .select("*")
          .eq("id", args.id)
          .maybeSingle();
        if (error) throw error;
        return data ?? { notFound: true };
      }
      case "search_projects": {
        const q = `%${args.query}%`;
        const { data, error } = await sb
          .from("projects")
          .select(
            "id, project_name, address_cluster_summary, plan_number, main_stage, management_status",
          )
          .or(
            `project_name.ilike.${q},address_cluster_summary.ilike.${q},plan_number.ilike.${q}`,
          )
          .limit(15);
        if (error) throw error;
        return data ?? [];
      }
      case "get_dashboard_summary": {
        const [pr, tk, rm, tm] = await Promise.all([
          sb.from("projects").select("id, management_status", { count: "exact" }),
          sb.from("tasks").select("id, status", { count: "exact" }).eq("status", "open"),
          sb.from("reminders").select("id, status", { count: "exact" }).eq("status", "open"),
          sb.from("tama_sites").select("id, review_status", { count: "exact" }),
        ]);
        return {
          projects_total: pr.count ?? 0,
          tasks_open: tk.count ?? 0,
          reminders_open: rm.count ?? 0,
          tama_sites_total: tm.count ?? 0,
        };
      }
      case "get_tama_site_by_id": {
        const { data, error } = await sb
          .from("tama_sites")
          .select("*")
          .eq("id", args.id)
          .maybeSingle();
        if (error) throw error;
        return data ?? { notFound: true };
      }
      case "create_formal_document_draft": {
        return {
          ok: true,
          draft: {
            subject: args.subject,
            body: args.body,
            entityType: args.entityType ?? null,
            entityId: args.entityId ?? null,
            createdAt: new Date().toISOString(),
          },
        };
      }
      case "search_system_entities": {
        const q = `%${args.query}%`;
        const [projects, tama, tasks, reminders] = await Promise.all([
          sb.from("projects").select("id, project_name").or(
            `project_name.ilike.${q},address_cluster_summary.ilike.${q}`,
          ).limit(5),
          sb.from("tama_sites").select("id, site_address").ilike("site_address", q).limit(5),
          sb.from("tasks").select("id, title").ilike("title", q).limit(5),
          sb.from("reminders").select("id, title").ilike("title", q).limit(5),
        ]);
        return {
          projects: projects.data ?? [],
          tama_sites: tama.data ?? [],
          tasks: tasks.data ?? [],
          reminders: reminders.data ?? [],
        };
      }
      case "get_project_meetings": {
        const { data, error } = await sb
          .from("meetings")
          .select("id, forum_type, date, status, summary, raw_notes")
          .eq("project_id", args.project_id)
          .order("date", { ascending: false });
        if (error) throw error;
        return data ?? [];
      }
      case "get_project_tasks": {
        const { data, error } = await sb
          .from("tasks")
          .select("id, title, owner, deadline, status, blocker, notes")
          .eq("project_id", args.project_id)
          .neq("status", "completed")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data ?? [];
      }
      case "get_project_forum_status": {
        const [checks, reviews] = await Promise.all([
          sb.from("forum1_checks")
            .select("name, status, note")
            .eq("project_id", args.project_id)
            .order("item_index"),
          sb.from("forum2_reviews")
            .select("reviewer_name, status, note")
            .eq("project_id", args.project_id),
        ]);
        return {
          forum1_checks: checks.data ?? [],
          forum2_reviews: reviews.data ?? [],
          forum1_summary: {
            red: (checks.data ?? []).filter((c: any) => c.status === "red").length,
            yellow: (checks.data ?? []).filter((c: any) => c.status === "yellow").length,
            green: (checks.data ?? []).filter((c: any) => c.status === "green").length,
          },
          forum2_summary: {
            approved: (reviews.data ?? []).filter((r: any) => r.status === "approved").length,
            fix_required: (reviews.data ?? []).filter((r: any) => r.status === "fix_required").length,
            pending: (reviews.data ?? []).filter((r: any) => ["not_sent","sent","received"].includes(r.status)).length,
          },
        };
      }
      case "get_all_projects_status": {
        const { data, error } = await sb
          .from("projects")
          .select("id, project_name, main_stage, management_status, main_blocker, next_action, next_action_owner, next_action_due_date, risk_level, units_in, units_out, developer, plan_submitter, last_update")
          .order("order_index", { ascending: true });
        if (error) throw error;
        return data ?? [];
      }
      case "get_projects_field_list": {
        const ALLOWED_FIELDS = new Set([
          "address_cluster_summary","authority","developer","iplan_object_id","last_update",
          "main_blocker","main_stage","management_status","multiplier","next_action",
          "next_action_due_date","next_action_owner","notes","plan_number","plan_submitter",
          "quarter","risk_level","sub_stage","units_in","units_out","architect",
        ]);
        const field = String(args.field || "").trim();
        if (!ALLOWED_FIELDS.has(field)) {
          return { error: `שדה לא מוכר: ${field}` };
        }
        // architect column does not exist — fall back to null
        const selectField = field === "architect" ? null : field;
        const cols = selectField ? `id, project_name, ${selectField}` : `id, project_name`;
        const { data, error } = await sb
          .from("projects")
          .select(cols)
          .order("project_name", { ascending: true });
        if (error) throw error;
        if (!selectField) {
          return (data ?? []).map((r: any) => ({ ...r, architect: null }));
        }
        return data ?? [];
      }
      case "create_task": {
        const { data, error } = await sb.from("tasks").insert({
          project_id: args.project_id,
          title: args.title,
          owner: args.owner || "",
          deadline: args.deadline || null,
          priority: args.priority || "medium",
          status: "open",
          blocker: "",
          notes: "",
          meeting_id: null,
          decision_id: null,
        }).select().single();
        if (error) {
          console.error("create_task error:", JSON.stringify(error));
          throw new Error(`create_task failed: ${error.message}`);
        }
        return { ok: true, task_id: data.id, title: data.title, deadline: data.deadline };
      }
      case "update_project_blocker": {
        const { error } = await sb.from("projects")
          .update({ main_blocker: args.blocker || null })
          .eq("id", args.project_id);
        if (error) throw error;
        try {
          await sb.from("audit_log").insert({
            entity_type: "project", entity_id: args.project_id,
            action: "edit", actor: "Yohan AI",
            details: { field: "main_blocker", new_value: args.blocker },
          });
        } catch (_) {}
        return { ok: true, blocker: args.blocker };
      }
      case "update_project_stage": {
        const { error } = await sb.from("projects")
          .update({ main_stage: args.stage_id })
          .eq("id", args.project_id);
        if (error) throw error;
        try {
          await sb.from("audit_log").insert({
            entity_type: "project", entity_id: args.project_id,
            action: "edit", actor: "Yohan AI",
            details: { field: "main_stage", new_value: args.stage_id },
          });
        } catch (_) {}
        return { ok: true, stage: args.stage_id };
      }
      case "create_meeting": {
        const { count } = await sb.from("meetings")
          .select("id", { count: "exact" })
          .eq("project_id", args.project_id)
          .eq("forum_type", args.forum_type);
        const number = (count || 0) + 1;
        const { data, error } = await sb.from("meetings").insert({
          project_id: args.project_id,
          forum_type: args.forum_type,
          date: args.date || null,
          time: args.time || null,
          time_end: args.time_end || null,
          location: args.location || null,
          summary: args.summary || null,
          status: "planned",
          number,
        }).select().single();
        if (error) throw error;
        return { ok: true, meeting_id: data.id, date: data.date, forum_type: data.forum_type, number };
      }
      case "add_reminder": {
        const { data, error } = await sb.from("reminders").insert({
          project_id: args.project_id || null,
          message: args.message,
          due_at: args.due_at,
          status: "open",
          title: args.message,
        }).select().single();
        if (error) throw error;
        return { ok: true, reminder_id: data.id, due_at: args.due_at };
      }
      case "add_calendar_event": {
        const projectName = args.project_id
          ? (await sb.from("projects").select("project_name").eq("id", args.project_id).maybeSingle())?.data?.project_name || ""
          : "";
        const { error } = await sb.from("audit_log").insert({
          entity_type: "project",
          entity_id: args.project_id || "manual",
          action: "milestone",
          actor: "Yohan AI",
          details: {
            title: args.title,
            date: args.date,
            time_start: args.time_start || null,
            time_end: args.time_end || null,
            notes: args.notes || null,
            project_name: projectName,
            type: args.type || "milestone",
            priority: args.priority || "normal",
          },
        });
        if (error) throw error;
        return { ok: true, title: args.title, date: args.date };
      }
      case "complete_task": {
        const { data: tasks } = await sb.from("tasks")
          .select("id, title")
          .eq("project_id", args.project_id)
          .ilike("title", `%${args.task_title_query}%`)
          .limit(1);
        if (!tasks || tasks.length === 0) return { ok: false, error: "לא נמצאה משימה תואמת" };
        await sb.from("tasks").update({ status: "completed" }).eq("id", tasks[0].id);
        return { ok: true, completed_task: tasks[0].title };
      }
      case "delete_task": {
        const { data: tasks } = await sb.from("tasks")
          .select("id, title")
          .eq("project_id", args.project_id)
          .ilike("title", `%${args.task_title_query}%`)
          .limit(1);
        if (!tasks || tasks.length === 0) return { ok: false, error: "לא נמצאה משימה תואמת" };
        await sb.from("tasks").delete().eq("id", tasks[0].id);
        return { ok: true, deleted_task: tasks[0].title };
      }
      case "delete_meeting": {
        let query = sb.from("meetings")
          .select("id, number, forum_type")
          .eq("project_id", args.project_id)
          .eq("forum_type", args.forum_type)
          .order("number", { ascending: false });
        if (args.meeting_number) {
          query = query.eq("number", args.meeting_number);
        }
        const { data: meetings } = await query.limit(1);
        if (!meetings || meetings.length === 0) return { ok: false, error: "לא נמצאה ישיבה תואמת" };
        await sb.from("meetings").delete().eq("id", meetings[0].id);
        return { ok: true, deleted_meeting: `${meetings[0].forum_type} מספר ${meetings[0].number}` };
      }
      case "get_project_tasks": {
        const { data } = await sb.from("tasks")
          .select("id, title, status, deadline, owner, priority")
          .eq("project_id", args.project_id)
          .order("deadline", { ascending: true });
        return data || [];
      }
      case "get_project_meetings": {
        const { data } = await sb.from("meetings")
          .select("id, forum_type, date, time, status, summary")
          .eq("project_id", args.project_id)
          .order("date", { ascending: false });
        return data || [];
      }
      default:
        return { error: `Unknown tool: ${name}` };
    }
  } catch (e: any) {
    return { error: e?.message ?? String(e) };
  }
}

// Recursively strip id/uuid-like fields so the model never sees raw UUIDs
const ID_KEYS = new Set([
  "id", "project_id", "meeting_id", "decision_id", "task_id",
  "reminder_id", "site_id", "tama_site_id", "address_id", "asset_id",
  "user_id", "created_by", "updated_by",
]);
function stripIds(value: any): any {
  if (Array.isArray(value)) return value.map(stripIds);
  if (value && typeof value === "object") {
    const out: any = {};
    for (const [k, v] of Object.entries(value)) {
      if (ID_KEYS.has(k)) continue;
      out[k] = stripIds(v);
    }
    return out;
  }
  return value;
}

// Convert OpenAI-style chat messages to Gemini "contents" format
function toGeminiContents(messages: any[]): any[] {
  const contents: any[] = [];
  for (const m of messages) {
    const role = m.role === "assistant" ? "model" : m.role === "user" ? "user" : null;
    if (!role) continue;
    const parts: any[] = [];
    if (Array.isArray(m.attachments)) {
      for (const att of m.attachments) {
        if (att?.dataBase64 && att?.mimeType) {
          parts.push({ inlineData: { mimeType: att.mimeType, data: att.dataBase64 } });
        }
      }
    }
    parts.push({ text: String(m.content ?? "") });
    contents.push({ role, parts });
  }
  return contents;
}

const GEMINI_MODELS = [
  "gemini-1.5-flash-8b",
  "gemini-1.5-flash-8b-latest",
  "gemini-1.5-flash",
  "gemini-1.5-flash-latest",
  "gemini-2.5-flash-lite",
];

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, screenContext } = await req.json();
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: "GEMINI_API_KEY חסר בהגדרות השרת" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const contextStr = screenContext
      ? `\n\nהקשר מסך נוכחי:\n${JSON.stringify(screenContext, null, 2)}`
      : "";

    const systemInstruction = {
      role: "system",
      parts: [{ text: SYSTEM_PROMPT + contextStr }],
    };

    const contents = toGeminiContents(Array.isArray(messages) ? messages : []);

    // Helper: fetch with timeout to avoid hanging forever
    const fetchGemini = async (timeoutMs = 45000) => {
      for (const model of GEMINI_MODELS) {
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
        console.log(`[assistant-chat] Trying model: ${model}`);

        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), timeoutMs);
        let res: Response;

        try {
          res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              systemInstruction,
              contents,
              tools: [{ functionDeclarations: FUNCTION_DECLARATIONS }],
              generationConfig: { temperature: 0.3 },
            }),
            signal: ctrl.signal,
          });
        } catch (e: any) {
          console.error(`Model ${model} fetch error:`, e?.message);
          clearTimeout(t);
          continue;
        }

        clearTimeout(t);

        if (res.status === 404) {
          console.warn(`Model ${model} not found (404), trying next...`);
          continue;
        }

        console.log(`[assistant-chat] Using model: ${model}, status: ${res.status}`);
        return res;
      }

      return new Response(
        JSON.stringify({ error: { code: 503, message: "All Gemini models unavailable" } }),
        { status: 503 }
      );
    };

    let lastTextReply = "";

    // Tool loop (max 8 iterations)
    for (let i = 0; i < 8; i++) {
      console.log(`[assistant-chat] iteration ${i}, contents length=${contents.length}`);
      let res: Response;
      try {
        res = await fetchGemini();
      } catch (e: any) {
        console.error("Gemini fetch failed/timeout:", e?.message ?? e);
        return new Response(
          JSON.stringify({
            reply: lastTextReply ||
              "לא התקבלה תשובה מ-Gemini בזמן סביר. נסה שוב בעוד רגע.",
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        console.error(`Gemini error ${res.status}:`, errorBody.slice(0, 300));
        // Return 200 with a structured fallback so the client can render a
        // clean Hebrew message (and trigger local summary fallback) instead of
        // surfacing the raw "Edge Function returned a non-2xx status code".
        const friendly =
          res.status === 429
            ? "השירות עמוס כרגע (חריגת מכסה). נסה שוב בעוד דקה."
            : res.status === 400
            ? `שגיאת בקשה ל-Gemini: ${errorBody.slice(0, 150)}`
            : `שגיאת Gemini ${res.status}: ${errorBody.slice(0, 100)}`;
        return new Response(
          JSON.stringify({
            reply: lastTextReply || friendly,
            fallback: true,
            upstreamStatus: res.status,
            errorDetail: errorBody.slice(0, 500),
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      const data = await res.json();
      const candidate = data.candidates?.[0];
      const parts: any[] = candidate?.content?.parts ?? [];
      console.log(
        `[assistant-chat] iter ${i} parts=${parts.length} finish=${candidate?.finishReason}`,
      );

      const functionCalls = parts.filter((p: any) => p.functionCall);
      const textParts = parts
        .filter((p: any) => typeof p.text === "string")
        .map((p: any) => p.text)
        .join("")
        .trim();

      if (textParts) lastTextReply = textParts;

      if (functionCalls.length > 0) {
        // Push the model turn (with function calls + any text) to contents
        contents.push({ role: "model", parts });

        // Run all tools, push function responses
        const responseParts: any[] = [];
        for (const p of functionCalls) {
          const fname = p.functionCall.name;
          const fargs = p.functionCall.args ?? {};
          console.log(`[assistant-chat] tool call: ${fname}`, JSON.stringify(fargs));
          const result = await runTool(fname, fargs);
          // Keep ids only for tools where the model needs them to chain calls
          const keepIdTools = new Set(["search_projects", "get_all_projects", "search_system_entities"]);
          const sanitized = keepIdTools.has(fname) ? result : stripIds(result);
          responseParts.push({
            functionResponse: {
              name: fname,
              response: { result: sanitized },
            },
          });
        }
        contents.push({ role: "user", parts: responseParts });
        continue;
      }

      // No tool calls — return text reply (or fallback if empty)
      return new Response(
        JSON.stringify({
          reply: textParts ||
            "הפעולה בוצעה. אם הפעולה לא נראית — רענן את הדף.",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        reply: lastTextReply ||
          "הפעולה בוצעה. אם הפעולה לא נראית — רענן את הדף.",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    console.error("assistant-chat error:", e);
    return new Response(
      JSON.stringify({ error: e?.message ?? "שגיאה פנימית" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
