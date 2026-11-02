import { MetricTemplate, StageId } from '@/types/project';

export const METRIC_TEMPLATES: MetricTemplate[] = [
  // חברתי - Phase א
  { id: 'm1', name: 'מגוון דיור', category: 'חברתי', phase: 'א', triggerStage: 'forum1_harmonika' },
  { id: 'm2', name: 'דיור בר-השגה', category: 'חברתי', phase: 'א', triggerStage: 'forum1_harmonika' },
  { id: 'm3', name: 'מוסדות חינוך', category: 'חברתי', phase: 'א', triggerStage: 'forum1_harmonika' },
  { id: 'm4', name: 'גני ילדים', category: 'חברתי', phase: 'א', triggerStage: 'forum1_harmonika' },
  { id: 'm5', name: 'מועדוניות נוער', category: 'חברתי', phase: 'א', triggerStage: 'forum1_harmonika' },
  { id: 'm6', name: 'מרכז קהילתי', category: 'חברתי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm7', name: 'שירותי בריאות', category: 'חברתי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm8', name: 'מסחר שכונתי', category: 'חברתי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm9', name: 'שטחי ספורט', category: 'חברתי', phase: 'ב', triggerStage: 'design_review_pre_forum3' },
  { id: 'm10', name: 'מרחבים ציבוריים', category: 'חברתי', phase: 'ב', triggerStage: 'design_review_pre_forum3' },
  { id: 'm11', name: 'נגישות אוניברסלית', category: 'חברתי', phase: 'א', triggerStage: 'forum1_harmonika' },
  { id: 'm12', name: 'שילוב קשישים', category: 'חברתי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm13', name: 'תמהיל אוכלוסייה', category: 'חברתי', phase: 'א', triggerStage: 'forum1_harmonika' },
  { id: 'm14', name: 'מענה חירום', category: 'חברתי', phase: 'ג', triggerStage: 'execution' },
  { id: 'm15', name: 'מרחבי מפגש', category: 'חברתי', phase: 'ב', triggerStage: 'forum3_committee_prep' },
  // סביבתי - Phase א/ב/ג
  { id: 'm16', name: 'ביופיליה', category: 'סביבתי', phase: 'א', triggerStage: 'forum1_harmonika' },
  { id: 'm17', name: 'שטחי ירוק', category: 'סביבתי', phase: 'א', triggerStage: 'forum1_harmonika' },
  { id: 'm18', name: 'ניהול נגר', category: 'סביבתי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm19', name: 'אנרגיה מתחדשת', category: 'סביבתי', phase: 'ב', triggerStage: 'design_review_pre_forum3' },
  { id: 'm20', name: 'בנייה ירוקה', category: 'סביבתי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm21', name: 'ניהול פסולת', category: 'סביבתי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm22', name: 'צמצום זיהום אוויר', category: 'סביבתי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm23', name: 'הצללה', category: 'סביבתי', phase: 'א', triggerStage: 'forum1_harmonika' },
  { id: 'm24', name: 'חלחול קרקע', category: 'סביבתי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm25', name: 'מגוון ביולוגי', category: 'סביבתי', phase: 'ב', triggerStage: 'design_review_pre_forum3' },
  { id: 'm26', name: 'תאורה חכמה', category: 'סביבתי', phase: 'ג', triggerStage: 'execution' },
  { id: 'm27', name: 'חומרים מקיימים', category: 'סביבתי', phase: 'ב', triggerStage: 'forum3_committee_prep' },
  { id: 'm28', name: 'צריכת מים', category: 'סביבתי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm29', name: 'רעש סביבתי', category: 'סביבתי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm30', name: 'גינון מקיים', category: 'סביבתי', phase: 'ג', triggerStage: 'execution' },
  // תפעולי - Phase ב/ג
  { id: 'm31', name: 'תחבורה ציבורית', category: 'תפעולי', phase: 'א', triggerStage: 'forum1_harmonika' },
  { id: 'm32', name: 'חניונים', category: 'תפעולי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm33', name: 'שבילי אופניים', category: 'תפעולי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm34', name: 'תשתיות תקשורת', category: 'תפעולי', phase: 'ג', triggerStage: 'execution' },
  { id: 'm35', name: 'ניהול תנועה', category: 'תפעולי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm36', name: 'פינוי אשפה', category: 'תפעולי', phase: 'ג', triggerStage: 'execution' },
  { id: 'm37', name: 'תחזוקת מבנים', category: 'תפעולי', phase: 'ג', triggerStage: 'occupancy' },
  { id: 'm38', name: 'ניהול חניה', category: 'תפעולי', phase: 'ב', triggerStage: 'forum3_committee_prep' },
  { id: 'm39', name: 'מערכות חכמות', category: 'תפעולי', phase: 'ג', triggerStage: 'execution' },
  { id: 'm40', name: 'תאורת רחוב', category: 'תפעולי', phase: 'ג', triggerStage: 'execution' },
  { id: 'm41', name: 'ביטחון ובטיחות', category: 'תפעולי', phase: 'ב', triggerStage: 'design_review_pre_forum3' },
  { id: 'm42', name: 'ניהול אירועים', category: 'תפעולי', phase: 'ג', triggerStage: 'occupancy' },
  { id: 'm43', name: 'תשתיות מים', category: 'תפעולי', phase: 'ב', triggerStage: 'forum2_consultants' },
  { id: 'm44', name: 'מוכנות חירום', category: 'תפעולי', phase: 'ג', triggerStage: 'occupancy' },
];

export function getMetricCategories(): string[] {
  return [...new Set(METRIC_TEMPLATES.map(m => m.category))];
}
