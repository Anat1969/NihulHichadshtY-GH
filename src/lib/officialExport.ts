// ═══════════════════════════════════════════════════════════════════════
//  ייצוא רשמי – "סטטוס פינוי בינוי" (תבנית יוהאן)
//  שחזור מדויק של מבנה הקובץ המקורי:
//   • 3 גיליונות בשמות מקוריים: "גיליון1", "גיליון2", "מקורות ועדכונים"
//   • 28 עמודות בגיליון הראשי בסדר זהה למקור
//   • RTL אמיתי + שורת כותרת קפואה (A2)
//   • שורה לכל תכנית; שורת "סה״כ במתחם" עם נוסחאות SUM
//   • סגנון מוסדי אחיד (זהה ל-exportUtils.ts)
// ═══════════════════════════════════════════════════════════════════════
import * as XLSX from 'xlsx-js-style';
import { formatDate } from '@/lib/dateUtils';

// ─── שפת עיצוב מוסדית אחידה ─────────────────────────────────────────────
const HEADER_NAVY = 'FF2E5FA3';
const HEADER_NAVY_DARK = 'FF1B3A6B';
const SUBTOTAL_FILL = 'FFDCE6F4';
const SUBTOTAL_FILL_STRONG = 'FFB8CCE4';
const BODY_FILL_ALT = 'FFF5F8FC';
const BORDER_SOFT = 'FFD0D7E2';

const FONT_HEADER = { name: 'Arial', sz: 11, bold: true, color: { rgb: 'FFFFFFFF' } };
const FONT_BODY = { name: 'Arial', sz: 10, color: { rgb: 'FF1F2937' } };
const FONT_SUBTOTAL = { name: 'Arial', sz: 10, bold: true, color: { rgb: 'FF1B3A6B' } };

const borderSoft = {
  top: { style: 'thin', color: { rgb: BORDER_SOFT } },
  bottom: { style: 'thin', color: { rgb: BORDER_SOFT } },
  left: { style: 'thin', color: { rgb: BORDER_SOFT } },
  right: { style: 'thin', color: { rgb: BORDER_SOFT } },
};
const borderNavy = {
  top: { style: 'thin', color: { rgb: HEADER_NAVY_DARK } },
  bottom: { style: 'thin', color: { rgb: HEADER_NAVY_DARK } },
  left: { style: 'thin', color: { rgb: HEADER_NAVY_DARK } },
  right: { style: 'thin', color: { rgb: HEADER_NAVY_DARK } },
};
const borderSubtotal = {
  top: { style: 'medium', color: { rgb: HEADER_NAVY } },
  bottom: { style: 'medium', color: { rgb: HEADER_NAVY } },
  left: { style: 'thin', color: { rgb: BORDER_SOFT } },
  right: { style: 'thin', color: { rgb: BORDER_SOFT } },
};

const headerStyle = () => ({
  fill: { patternType: 'solid', fgColor: { rgb: HEADER_NAVY } },
  font: FONT_HEADER,
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true, readingOrder: 2 },
  border: borderNavy,
});

const bodyStyle = (rowIndex: number, horizontal: 'right' | 'center' = 'right', bold = false, fontColor = 'FF1F2937') => ({
  fill: { patternType: 'solid', fgColor: { rgb: rowIndex % 2 === 0 ? 'FFFFFFFF' : BODY_FILL_ALT } },
  font: { ...FONT_BODY, bold, color: { rgb: fontColor } },
  alignment: { horizontal, vertical: 'center', wrapText: true, readingOrder: 2 },
  border: borderSoft,
});

const subtotalStyle = (strong = false) => ({
  fill: { patternType: 'solid', fgColor: { rgb: strong ? SUBTOTAL_FILL_STRONG : SUBTOTAL_FILL } },
  font: FONT_SUBTOTAL,
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true, readingOrder: 2 },
  border: borderSubtotal,
});

// ─── תוויות סטטוס בעברית ────────────────────────────────────────────────
const statusLabel = (s: string | null | undefined) => {
  if (s === 'active') return 'פעיל';
  if (s === 'on_hold') return 'מושהה';
  if (s === 'stuck') return 'תקוע';
  if (s === 'completed') return 'אישור/תוקף';
  return s || '';
};

const statusColorMap: Array<{ match: RegExp; fill: string; font: string }> = [
  { match: /(אישור\/תוקף|בתוקף|פרסום לתוקף|אושר סופית|הושלם)/, fill: 'FFC6EFCE', font: 'FF276221' },
  { match: /(אושר בתנאים|בדרך לאישור|אושרה למתן תוקף)/, fill: 'FFE2EFDA', font: 'FF375623' },
  { match: /(הפקדה|דיון הפקדה|פרסום הפקדה)/, fill: 'FFDDEBF7', font: 'FF1F3864' },
  { match: /(תקוע|אי עמידה|נדחה)/, fill: 'FFFCE4D6', font: 'FF833C00' },
  { match: /(מושהה|חזרה לדיון|דיון במחוזית)/, fill: 'FFFFF2CC', font: 'FF7F6000' },
  { match: /(טרם הוגשה)/, fill: 'FFF2F2F2', font: 'FF595959' },
  { match: /(פעיל)/, fill: 'FFEBF3FB', font: 'FF1F4E79' },
];

const statusCellStyle = (rowIndex: number, value: string) => {
  const text = String(value || '').trim();
  const match = statusColorMap.find(s => s.match.test(text));
  if (!match) return bodyStyle(rowIndex, 'center', false);
  return {
    ...bodyStyle(rowIndex, 'center', true, match.font),
    fill: { patternType: 'solid', fgColor: { rgb: match.fill } },
  };
};

const inferPlanType = (project: any) => {
  const name = `${project.project_name || ''} ${project.plan_number || ''}`;
  const auth = String(project.authority || '');
  if (name.includes('איחוד וחלוקה')) return 'איחוד וחלוקה';
  if (name.includes('תוספת יח')) return 'תוספת יח"ד';
  if (name.includes('תמ"ל') || name.includes('תמל') || auth.includes('ותמ"ל') || auth.includes('ותמ״ל')) {
    return 'פינוי ובינוי';
  }
  return 'פינוי בינוי';
};

// ─── קיבוץ פרויקטים לפי שם מתחם (תומך במספר תכניות לאותו מתחם) ─────────
function groupByComplex(projects: any[]): Map<string, any[]> {
  const map = new Map<string, any[]>();
  projects.forEach(p => {
    const key = (p.project_name || '').trim() || '—';
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(p);
  });
  return map;
}

// ─── עזר: הקפאה אמיתית בקובץ (xlsx-js-style) ───────────────────────────
function applyFreezeAndRtl(ws: any, ySplit = 1) {
  ws['!freeze'] = `A${ySplit + 1}`;
  ws['!views'] = [{
    rightToLeft: true,
    state: 'frozen',
    ySplit,
    xSplit: 0,
    topLeftCell: `A${ySplit + 1}`,
    activeCell: `A${ySplit + 1}`,
  } as any];
}

// ═══════════════════════════════════════════════════════════════════════
//  הייצוא הרשמי
// ═══════════════════════════════════════════════════════════════════════
export function exportOfficialPinuiBinuiStatus(projects: any[]) {
  const wb = XLSX.utils.book_new();
  const groups = groupByComplex(projects);

  // ────────────────────────────────────────────────────────────────────
  //  גיליון1 — הדוח הראשי הרשמי (28 עמודות, סדר מדויק כמקור)
  // ────────────────────────────────────────────────────────────────────
  const headers = [
    'מתחם',                                              // A
    'סוג תוכנית',                                         // B
    'מספר תוכנית',                                        // C
    'סמכות',                                             // D
    'שם תוכנית',                                          // E
    'רובע',                                              // F
    'יח"ד נכנס',                                          // G
    'תוספת יח"ד',                                         // H
    'יח"ד יוצא',                                          // I
    'יח"ד ממומשות בהיתרי בניה',                            // J
    'יח"ד שנותרו למימוש',                                 // K
    'סטטוס',                                             // L
    'יזם',                                               // M
    'אדריכל',                                            // N
    'עורך דין דיירים',                                    // O
    'עורך דין יזם',                                       // P
    'יועץ חברתי',                                         // Q
    'מצב תסקיר',                                          // R
    'איש קשר',                                           // S
    'נציגות',                                            // T
    'תאריך עמידה בתנאי סף במקומית',                         // U
    'תאריך דיון מקומית',                                   // V
    'תאריך העברה למחוז/ותמ"ל',                             // W
    'תאריך עמידה בתנאי סף בלשכת התכנון המחוזית/ותמ"ל',     // X
    'תאריך דיון הפקדה',                                   // Y
    'הפקדה בפועל בעיתונות/רשומות',                         // Z
    'תאריך דיון עבור מתן תוקף',                            // AA
    'מתן תוקף בפועל ברשומות',                              // AB
  ];

  const aoa: any[][] = [headers];
  const rowKinds: Array<'header' | 'data' | 'subtotal'> = ['header'];

  groups.forEach((plans, complex) => {
    const firstDataRow = aoa.length + 1;
    plans.forEach(p => {
      const unitsIn = Number(p.units_in || 0);
      const unitsOut = Number(p.units_out || 0);
      const addition = Math.max(0, unitsOut - unitsIn);
      const r = aoa.length + 1;
      aoa.push([
        complex,                                  // A מתחם
        inferPlanType(p),                         // B סוג תוכנית
        p.plan_number || '',                      // C מספר תוכנית
        p.authority || 'מחוזית',                  // D סמכות
        p.project_name || '',                     // E שם תוכנית
        p.quarter || '',                          // F רובע
        unitsIn,                                  // G יח"ד נכנס
        addition,                                 // H תוספת יח"ד
        { f: `G${r}+H${r}` },                     // I יח"ד יוצא
        '',                                       // J יח"ד ממומשות
        '',                                       // K יח"ד שנותרו (אם אין מימוש – ריק)
        statusLabel(p.management_status),         // L סטטוס
        p.developer || '',                        // M יזם
        p.plan_submitter || '',                   // N אדריכל (מגיש התכנית במערכת)
        '',                                       // O עורך דין דיירים
        '',                                       // P עורך דין יזם
        '',                                       // Q יועץ חברתי
        '',                                       // R מצב תסקיר
        p.next_action_owner || '',                // S איש קשר
        '',                                       // T נציגות
        '', '', '', '', '', '', '', '',           // U-AB 8 תאריכים סטטוטוריים
      ]);
      rowKinds.push('data');
    });

    if (plans.length > 1) {
      const lastDataRow = aoa.length;
      const subRow = aoa.length + 1;
      aoa.push([
        '', '', '', '', '',
        `סה"כ במתחם ${complex}`,                  // F
        { f: `SUM(G${firstDataRow}:G${lastDataRow})` }, // G
        { f: `SUM(H${firstDataRow}:H${lastDataRow})` }, // H
        { f: `G${subRow}+H${subRow}` },                  // I
        { f: `SUM(J${firstDataRow}:J${lastDataRow})` }, // J
        { f: `I${subRow}-J${subRow}` },                  // K
        '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '', '',
      ]);
      rowKinds.push('subtotal');
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const ncols = headers.length;
  const nrows = aoa.length;

  for (let r = 0; r < nrows; r++) {
    for (let c = 0; c < ncols; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws[addr]) ws[addr] = { v: '', t: 's' };
      const kind = rowKinds[r];
      if (kind === 'header') {
        ws[addr].s = headerStyle();
      } else if (kind === 'subtotal') {
        const strong = c >= 5 && c <= 10;
        ws[addr].s = subtotalStyle(strong);
      } else {
        const isNumeric = c >= 6 && c <= 10;
        const isCenter = c === 1 || c === 2 || c === 3 || c === 5 || isNumeric;
        const horizontal: 'right' | 'center' = isCenter ? 'center' : 'right';
        const isComplex = c === 0;
        if (c === 11) {
          ws[addr].s = statusCellStyle(r, String(ws[addr].v ?? ws[addr].w ?? ''));
        } else {
          ws[addr].s = bodyStyle(r, horizontal, isComplex, isComplex ? HEADER_NAVY_DARK : 'FF1F2937');
        }
      }
    }
  }

  ws['!cols'] = [
    { wch: 22 }, { wch: 18 }, { wch: 14 }, { wch: 10 }, { wch: 38 }, { wch: 8 },
    { wch: 11 }, { wch: 11 }, { wch: 11 }, { wch: 18 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 16 },
    { wch: 16 }, { wch: 16 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 12 },
    { wch: 22 }, { wch: 16 }, { wch: 20 }, { wch: 26 }, { wch: 14 }, { wch: 22 }, { wch: 20 }, { wch: 20 },
  ];
  ws['!rows'] = aoa.map((_, i) => ({ hpt: i === 0 ? 56 : 22 }));
  applyFreezeAndRtl(ws, 1);
  ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(ncols - 1)}1` };
  XLSX.utils.book_append_sheet(wb, ws, 'גיליון1');

  // ────────────────────────────────────────────────────────────────────
  //  גיליון2 — סטטוס תוכניות מצומצם
  // ────────────────────────────────────────────────────────────────────
  const planHeaders = ['מתחם', 'סוג תוכנית', 'מספר תוכנית', 'סמכות', 'שם תוכנית', 'סטטוס'];
  const planAOA: any[][] = [planHeaders];
  groups.forEach((plans, complex) => {
    plans.forEach(p => {
      planAOA.push([
        complex,
        inferPlanType(p),
        p.plan_number || '',
        p.authority || 'מחוזית',
        p.project_name || '',
        statusLabel(p.management_status),
      ]);
    });
  });
  const ws2 = XLSX.utils.aoa_to_sheet(planAOA);
  for (let r = 0; r < planAOA.length; r++) {
    for (let c = 0; c < planHeaders.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws2[addr]) ws2[addr] = { v: '', t: 's' };
      if (r === 0) {
        ws2[addr].s = headerStyle();
      } else if (c === 5) {
        ws2[addr].s = statusCellStyle(r, String(ws2[addr].v ?? ws2[addr].w ?? ''));
      } else {
        const horizontal: 'right' | 'center' = (c === 0 || c === 1 || c === 2 || c === 3) ? 'center' : 'right';
        ws2[addr].s = bodyStyle(r, horizontal, c === 0, c === 0 ? HEADER_NAVY_DARK : 'FF1F2937');
      }
    }
  }
  ws2['!cols'] = [{ wch: 22 }, { wch: 22 }, { wch: 16 }, { wch: 10 }, { wch: 44 }, { wch: 24 }];
  ws2['!rows'] = planAOA.map((_, i) => ({ hpt: i === 0 ? 36 : 22 }));
  applyFreezeAndRtl(ws2, 1);
  ws2['!autofilter'] = { ref: 'A1:F1' };
  XLSX.utils.book_append_sheet(wb, ws2, 'גיליון2');

  // ────────────────────────────────────────────────────────────────────
  //  מקורות ועדכונים — מבנה זהה למקור: מספר תוכנית, שם, סטטוס, מקור URL, הערה
  // ────────────────────────────────────────────────────────────────────
  const srcHeaders = ['מספר תוכנית', 'שם תוכנית', 'סטטוס שמולא', 'מקור URL', 'הערה'];
  const srcAOA: any[][] = [srcHeaders];
  projects.forEach(p => {
    srcAOA.push([
      p.plan_number || '',
      p.project_name || '',
      statusLabel(p.management_status),
      p.source_addresses_text || '',
      p.notes || '',
    ]);
  });
  const ws3 = XLSX.utils.aoa_to_sheet(srcAOA);
  for (let r = 0; r < srcAOA.length; r++) {
    for (let c = 0; c < srcHeaders.length; c++) {
      const addr = XLSX.utils.encode_cell({ r, c });
      if (!ws3[addr]) ws3[addr] = { v: '', t: 's' };
      if (r === 0) {
        ws3[addr].s = headerStyle();
      } else {
        const horizontal: 'right' | 'center' = (c === 0 || c === 2) ? 'center' : 'right';
        ws3[addr].s = bodyStyle(r, horizontal);
      }
    }
  }
  ws3['!cols'] = [{ wch: 16 }, { wch: 44 }, { wch: 22 }, { wch: 50 }, { wch: 36 }];
  ws3['!rows'] = srcAOA.map((_, i) => ({ hpt: i === 0 ? 32 : 22 }));
  applyFreezeAndRtl(ws3, 1);
  ws3['!autofilter'] = { ref: 'A1:E1' };
  XLSX.utils.book_append_sheet(wb, ws3, 'מקורות ועדכונים');

  XLSX.writeFile(wb, `סטטוס_פינוי_בינוי_רשמי_${formatDate(new Date())}.xlsx`);
}
