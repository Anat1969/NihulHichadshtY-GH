// Fictional demo data used only for local visual verification (Playwright).
// Never shipped to the app bundle.
const day = (offset) => new Date(Date.now() + offset * 86400000).toISOString().split('T')[0];
const base = { created_at: '2026-01-01T00:00:00Z', updated_at: new Date().toISOString(), address_cluster_summary: null, authority: 'ועדה מקומית', developer: 'יזם לדוגמה', iplan_object_id: null, multiplier: null, notes: null, plan_number: '603-0000000', plan_submitter: null, quarter: null, source_addresses_text: null, sub_stage: null, pinned: false };
const rows = [
  ['הרצל 10–18', 'ז', 'forum2_consultants', '', 'low', 'active', 'לקבל חוות דעת תנועה', day(5), day(-2), 48, 192],
  ['רוטשילד צפון', 'א', 'taba_objections', 'התנגדויות דיירים בבניין 4', 'high', 'תקוע', 'ישיבת גישור', day(-21), day(-40), 120, 480],
  ['שדרות ירושלים', 'ב', 'licensing_prep', '', 'medium', 'active', 'הגשת בקשה להיתר', day(12), day(-6), 64, 256],
  ['הנשיאים מערב', 'ג', 'taba_preparation', 'אישור רשות מקרקעי ישראל', 'medium', 'active', 'פגישה עם רמ"י', day(-3), day(-12), 90, 330],
  ['נורדאו 3', 'ד', 'execution', '', 'low', 'active', 'פיקוח שוטף', day(30), day(-1), 32, 120],
  ['ביאליק 20', 'א', 'resident_agreements', 'אישור רשות מקרקעי ישראל', 'high', 'מושהה', '', null, day(-75), 56, 210],
  ['הפלמ"ח', 'ה', 'forum1_harmonika', '', 'low', 'active', 'הכנת מצגת פורום 1', day(9), day(-4), 40, 168],
  ['ז\'בוטינסקי', 'ה', 'completion_rounds', '', 'low', 'active', 'השלמת מסמכי כיבוי', day(2), day(-3), 72, 300],
  ['מבצע סיני', 'ו', 'committee_decision', 'תנאי סף תשתיות', 'medium', 'active', 'עדכון נספח תנועה', day(-9), day(-18), 60, 240],
  ['העצמאות דרום', 'ב', 'pre_feasibility', '', 'low', 'active', 'בדיקת היתכנות', day(20), day(-8), 36, 140],
];
export const projects = rows.map(([name, q, stage, blocker, risk, status, next, due, lu, uin, uout], i) => ({
  ...base, id: `demo-${i + 1}`, project_name: name, quarter: q, main_stage: stage, main_blocker: blocker, risk_level: risk,
  management_status: status, next_action: next, next_action_due_date: due, next_action_owner: ['ענת', 'יוהאן', 'דנה'][i % 3],
  last_update: lu, units_in: uin, units_out: uout, order_index: i,
}));
export const tasks = [
  { id: 't1', project_id: 'demo-2', title: 'מיפוי מתנגדים', owner: 'ענת', status: 'blocked', deadline: day(-10), priority: 'high', blocker: '', notes: '', decision_id: null, meeting_id: null, created_at: base.created_at, updated_at: base.updated_at },
  { id: 't2', project_id: 'demo-4', title: 'מכתב לרמ"י', owner: 'יוהאן', status: 'open', deadline: day(-5), priority: 'normal', blocker: '', notes: '', decision_id: null, meeting_id: null, created_at: base.created_at, updated_at: base.updated_at },
];
export const project_stage_dates = [
  { id: 's1', project_id: 'demo-1', stage_id: 'forum2_consultants', actual_start: day(-150), actual_end: null, planned_start: null, planned_end: day(-30), notes: null, status: 'in_progress', created_at: base.created_at, updated_at: base.updated_at },
];
