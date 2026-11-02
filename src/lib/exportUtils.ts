// ═══════════════════════════════════════════════════════════════════════
//  ייצואים כלליים – דשבורד / רשימת פרויקטים / כרטיס פרויקט
//  כל הטקסטים, הכותרות, התוויות ושמות הקבצים — בעברית בלבד.
//  PDF: הצגה תמונתית (html2canvas) על בסיס DOM עברי כדי לשמר RTL ועברית מלאה.
//  Excel: xlsx-js-style עם כותרות נייבי, יישור ימני, RTL והקפאת שורת כותרת.
// ═══════════════════════════════════════════════════════════════════════
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx-js-style';
import { getStageName, StageId } from '@/types/project';
import { formatDate } from '@/lib/dateUtils';

// ─── עזרי פורמט ────────────────────────────────────────────────────────
function formatRevenue(amount: number): string {
  if (amount >= 1_000_000_000) return `₪ ${(amount / 1_000_000_000).toFixed(2)} מיליארד`;
  if (amount >= 1_000_000) return `₪ ${(amount / 1_000_000).toFixed(1)} מיליון`;
  if (amount >= 1_000) return `₪ ${(amount / 1_000).toFixed(0)} אלף`;
  return `₪ ${amount.toLocaleString('he-IL')}`;
}

const statusLabel = (s: string | null) => {
  if (s === 'active') return 'פעיל';
  if (s === 'on_hold') return 'מושהה';
  if (s === 'stuck') return 'תקוע';
  if (s === 'completed') return 'הושלם';
  return s || '';
};

const riskLabel = (r: string | null | undefined) => {
  if (r === 'low') return 'נמוך';
  if (r === 'medium') return 'בינוני';
  if (r === 'high') return 'גבוה';
  return r || '';
};

// ─── סגנונות אקסל משותפים ──────────────────────────────────────────────
const HEADER_NAVY = 'FF2E5FA3';
const headerCellStyle = {
  fill: { patternType: 'solid', fgColor: { rgb: HEADER_NAVY } },
  font: { name: 'Arial', sz: 11, bold: true, color: { rgb: 'FFFFFFFF' } },
  alignment: { horizontal: 'center', vertical: 'center', wrapText: true, readingOrder: 2 },
  border: {
    top: { style: 'thin', color: { rgb: 'FF1B3A6B' } },
    bottom: { style: 'thin', color: { rgb: 'FF1B3A6B' } },
    left: { style: 'thin', color: { rgb: 'FF1B3A6B' } },
    right: { style: 'thin', color: { rgb: 'FF1B3A6B' } },
  },
};
const bodyCellStyle = {
  alignment: { horizontal: 'right', vertical: 'top', wrapText: true, readingOrder: 2 },
  font: { name: 'Arial', sz: 10 },
  border: {
    top: { style: 'thin', color: { rgb: 'FFD0D7E2' } },
    bottom: { style: 'thin', color: { rgb: 'FFD0D7E2' } },
    left: { style: 'thin', color: { rgb: 'FFD0D7E2' } },
    right: { style: 'thin', color: { rgb: 'FFD0D7E2' } },
  },
};

function applyStyles(ws: any, rowsCount: number, colsCount: number) {
  for (let r = 0; r < rowsCount; r++) {
    for (let c = 0; c < colsCount; c++) {
      const a = XLSX.utils.encode_cell({ r, c });
      if (!ws[a]) ws[a] = { v: '', t: 's' };
      ws[a].s = r === 0 ? headerCellStyle : bodyCellStyle;
    }
  }
}

function buildSheet(headers: string[], rows: any[][], widths?: number[]) {
  const aoa = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  applyStyles(ws, aoa.length, headers.length);
  ws['!cols'] = (widths || headers.map(() => 18)).map(w => ({ wch: w }));
  ws['!rows'] = aoa.map((_, i) => ({ hpt: i === 0 ? 36 : 24 }));
  ws['!freeze'] = 'A2';
  ws['!views'] = [{
    rightToLeft: true,
    state: 'frozen',
    ySplit: 1,
    xSplit: 0,
    topLeftCell: 'A2',
    activeCell: 'A2',
  } as any];
  ws['!autofilter'] = { ref: `A1:${XLSX.utils.encode_col(headers.length - 1)}1` };
  return ws;
}

// ═══════════════════════════════════════════════════════════════════════
//  עזר ל-PDF עברי: בונה אלמנט HTML עברי-RTL, מצלם, ושומר כ-PDF A4
// ═══════════════════════════════════════════════════════════════════════
async function renderHebrewPdf(html: string, filename: string, orientation: 'p' | 'l' = 'l') {
  const { default: html2canvas } = await import('html2canvas');
  const wrapper = document.createElement('div');
  wrapper.style.position = 'fixed';
  wrapper.style.top = '-99999px';
  wrapper.style.left = '0';
  wrapper.style.width = orientation === 'l' ? '1400px' : '900px';
  wrapper.style.background = '#ffffff';
  wrapper.style.direction = 'rtl';
  wrapper.style.fontFamily = '"Heebo","Assistant","Segoe UI","Arial",sans-serif';
  wrapper.innerHTML = html;
  document.body.appendChild(wrapper);
  try {
    const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({ orientation, unit: 'mm', format: 'a4' });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    if (imgH <= pageH) {
      pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
    } else {
      let remaining = imgH;
      let position = 0;
      while (remaining > 0) {
        pdf.addImage(imgData, 'JPEG', 0, position, imgW, imgH);
        remaining -= pageH;
        position -= pageH;
        if (remaining > 0) pdf.addPage();
      }
    }
    pdf.save(filename);
  } finally {
    document.body.removeChild(wrapper);
  }
}

// ─── סגנונות HTML משותפים ל-PDFs ───────────────────────────────────────
const PDF_STYLES = `
  <style>
    .doc { padding: 28px 32px; color: #1f2937; }
    .doc h1 { font-size: 24px; color: #1B3A6B; margin: 0 0 4px; text-align: center; font-weight: 800; }
    .doc .sub { text-align: center; color: #64748b; font-size: 12px; margin-bottom: 18px; }
    .doc h2 { font-size: 16px; color: #1B3A6B; margin: 18px 0 8px; border-bottom: 2px solid #2E5FA3; padding-bottom: 4px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #2E5FA3; color: #ffffff; font-weight: 700; padding: 8px 6px; text-align: right; border: 1px solid #1B3A6B; }
    td { padding: 6px; border: 1px solid #d0d7e2; text-align: right; vertical-align: top; }
    tr:nth-child(even) td { background: #f5f8fc; }
    .kpi { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 12px; }
    .kpi .c { background: #f5f8fc; border: 1px solid #d0d7e2; border-radius: 8px; padding: 10px; }
    .kpi .l { font-size: 11px; color: #64748b; }
    .kpi .v { font-size: 18px; color: #1B3A6B; font-weight: 800; }
  </style>
`;

const escape = (s: any) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c] || c));

// ═══════════════════════════════════════════════════════════════════════
//  דשבורד — PDF
// ═══════════════════════════════════════════════════════════════════════
export async function exportDashboardPdf(projects: any[], kpis: any) {
  const today = formatDate(new Date());
  const attention = projects
    .filter(p => (p.main_blocker && p.main_blocker.trim()) || p.risk_level === 'high' || p.management_status === 'stuck' || p.management_status === 'on_hold')
    .slice(0, 10);
  const top5 = [...projects]
    .filter(p => (p.units_out || 0) > 0)
    .sort((a, b) => (b.units_out || 0) - (a.units_out || 0))
    .slice(0, 5);

  const html = `
    ${PDF_STYLES}
    <div class="doc">
      <h1>דוח מצב מערכת — ניהול פינוי בינוי, אשדוד</h1>
      <div class="sub">תאריך הפקה: ${today}</div>

      <div class="kpi">
        <div class="c"><div class="l">סך פרויקטים</div><div class="v">${kpis.totalProjects}</div></div>
        <div class="c"><div class="l">יח״ד קיימות</div><div class="v">${(kpis.totalExisting||0).toLocaleString('he-IL')}</div></div>
        <div class="c"><div class="l">יח״ד מתוכננות</div><div class="v">${(kpis.totalPlanned||0).toLocaleString('he-IL')}</div></div>
        <div class="c"><div class="l">מכפיל ממוצע</div><div class="v">×${kpis.avgMultiplier}</div></div>
        <div class="c"><div class="l">פוטנציאל היתרים</div><div class="v">${formatRevenue(kpis.totalRevenue||0)}</div></div>
        <div class="c"><div class="l">פרויקטים עם חסמים</div><div class="v">${kpis.withBlockers}</div></div>
        <div class="c"><div class="l">סיכון גבוה/בינוני</div><div class="v">${kpis.highRisk}</div></div>
        <div class="c"><div class="l">פעולות באיחור</div><div class="v">${kpis.overdueActions}</div></div>
        <div class="c"><div class="l">תקועים / מושהים</div><div class="v">${kpis.stuckProjects}</div></div>
      </div>

      ${attention.length > 0 ? `
        <h2>דורשים תשומת לב מיידית</h2>
        <table>
          <thead><tr>
            <th>פרויקט</th><th>שלב</th><th>סטטוס</th><th>חסם עיקרי</th><th>פעולה הבאה</th><th>תאריך יעד</th>
          </tr></thead>
          <tbody>
            ${attention.map(p => `<tr>
              <td>${escape(p.project_name)}</td>
              <td>${escape(getStageName((p.main_stage as StageId) || 'forum1_harmonika'))}</td>
              <td>${escape(statusLabel(p.management_status))}</td>
              <td>${escape(p.main_blocker || '')}</td>
              <td>${escape(p.next_action || '')}</td>
              <td>${p.next_action_due_date ? formatDate(p.next_action_due_date) : ''}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      ` : ''}

      ${top5.length > 0 ? `
        <h2>5 פרויקטים מובילים לפי פוטנציאל היתרים</h2>
        <table>
          <thead><tr>
            <th>#</th><th>פרויקט</th><th>רובע</th><th>יח״ד מתוכננות</th><th>פוטנציאל היתרים</th><th>שלב</th>
          </tr></thead>
          <tbody>
            ${top5.map((p, i) => `<tr>
              <td>${i+1}</td>
              <td>${escape(p.project_name)}</td>
              <td>${escape(p.quarter || '')}</td>
              <td>${(p.units_out||0).toLocaleString('he-IL')}</td>
              <td>${formatRevenue((p.units_out||0)*25000)}</td>
              <td>${escape(getStageName((p.main_stage as StageId) || 'forum1_harmonika'))}</td>
            </tr>`).join('')}
          </tbody>
        </table>
      ` : ''}
    </div>
  `;

  await renderHebrewPdf(html, `דוח_דשבורד_${today}.pdf`, 'l');
}

// ═══════════════════════════════════════════════════════════════════════
//  דשבורד — Excel
// ═══════════════════════════════════════════════════════════════════════
export function exportDashboardExcel(projects: any[]) {
  const headers = [
    'שם פרויקט', 'רובע', 'מספר תוכנית', 'יזם', 'שלב', 'סטטוס ניהולי', 'רמת סיכון',
    'חסם עיקרי', 'פעולה הבאה', 'אחראי', 'תאריך יעד',
    'יח״ד קיימות', 'יח״ד מתוכננות', 'מכפיל', 'פוטנציאל היתרים (₪)',
  ];
  const rows = projects.map(p => [
    p.project_name || '',
    p.quarter || '',
    p.plan_number || '',
    p.developer || '',
    getStageName((p.main_stage as StageId) || 'forum1_harmonika'),
    statusLabel(p.management_status),
    riskLabel(p.risk_level),
    p.main_blocker || '',
    p.next_action || '',
    p.next_action_owner || '',
    p.next_action_due_date ? formatDate(p.next_action_due_date) : '',
    p.units_in || 0,
    p.units_out || 0,
    p.multiplier || 0,
    (p.units_out || 0) * 25000,
  ]);

  const wb = XLSX.utils.book_new();
  const ws = buildSheet(headers, rows, [22, 10, 16, 22, 22, 14, 12, 26, 26, 18, 14, 12, 14, 10, 18]);
  XLSX.utils.book_append_sheet(wb, ws, 'כל הפרויקטים');
  XLSX.writeFile(wb, `כל_הפרויקטים_${formatDate(new Date())}.xlsx`);
}

// ═══════════════════════════════════════════════════════════════════════
//  רשימת פרויקטים — PDF
// ═══════════════════════════════════════════════════════════════════════
export async function exportProjectsListPdf(projects: any[]) {
  const today = formatDate(new Date());
  const html = `
    ${PDF_STYLES}
    <div class="doc">
      <h1>דוח פרויקטים</h1>
      <div class="sub">${today} · ${projects.length} פרויקטים</div>
      <table>
        <thead><tr>
          <th>פרויקט</th><th>רובע</th><th>שלב</th><th>סטטוס</th><th>סיכון</th>
          <th>חסם</th><th>פעולה הבאה</th><th>יעד</th><th>יח״ד מתוכננות</th><th>פוטנציאל</th>
        </tr></thead>
        <tbody>
          ${projects.map(p => `<tr>
            <td>${escape(p.project_name)}</td>
            <td>${escape(p.quarter || '')}</td>
            <td>${escape(getStageName((p.main_stage as StageId) || 'forum1_harmonika'))}</td>
            <td>${escape(statusLabel(p.management_status))}</td>
            <td>${escape(riskLabel(p.risk_level))}</td>
            <td>${escape(p.main_blocker || '')}</td>
            <td>${escape(p.next_action || '')}</td>
            <td>${p.next_action_due_date ? formatDate(p.next_action_due_date) : ''}</td>
            <td>${(p.units_out||0).toLocaleString('he-IL')}</td>
            <td>${formatRevenue((p.units_out||0)*25000)}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  await renderHebrewPdf(html, `דוח_פרויקטים_${today}.pdf`, 'l');
}

// ═══════════════════════════════════════════════════════════════════════
//  רשימת פרויקטים — Excel (לפי הסינון הנוכחי)
// ═══════════════════════════════════════════════════════════════════════
export function exportProjectsListExcel(projects: any[]) {
  const headers = [
    'שם פרויקט', 'רובע', 'מספר תוכנית', 'יזם', 'מגיש התכנית',
    'שלב', 'סטטוס ניהולי', 'רמת סיכון', 'חסם עיקרי', 'פעולה הבאה', 'אחראי',
    'תאריך יעד', 'יח״ד קיימות', 'יח״ד מתוכננות', 'מכפיל', 'פוטנציאל היתרים (₪)',
  ];
  const rows = projects.map(p => [
    p.project_name || '',
    p.quarter || '',
    p.plan_number || '',
    p.developer || '',
    p.plan_submitter || '',
    getStageName((p.main_stage as StageId) || 'forum1_harmonika'),
    statusLabel(p.management_status),
    riskLabel(p.risk_level),
    p.main_blocker || '',
    p.next_action || '',
    p.next_action_owner || '',
    p.next_action_due_date ? formatDate(p.next_action_due_date) : '',
    p.units_in || 0,
    p.units_out || 0,
    p.multiplier || 0,
    (p.units_out || 0) * 25000,
  ]);
  const wb = XLSX.utils.book_new();
  const ws = buildSheet(headers, rows, [22, 10, 16, 22, 22, 22, 14, 12, 26, 26, 18, 14, 12, 14, 10, 18]);
  XLSX.utils.book_append_sheet(wb, ws, 'פרויקטים');
  XLSX.writeFile(wb, `פרויקטים_${formatDate(new Date())}.xlsx`);
}

// ═══════════════════════════════════════════════════════════════════════
//  פרויקט יחיד — PDF
// ═══════════════════════════════════════════════════════════════════════
export async function exportProjectPdf(project: any) {
  const today = formatDate(new Date());
  const p = project;
  const potential = (p.units_out || 0) * 25000;
  const mult = p.multiplier || (p.units_in && p.units_in > 0 ? ((p.units_out || 0) / p.units_in).toFixed(1) : '0');
  const addressText = p.addresses && p.addresses.length > 0
    ? p.addresses.map((a: any) => `${a.street_name} ${(a.building_numbers || []).join(', ')}`).join(' | ')
    : p.address_cluster_summary || '';

  const fields: [string, string][] = [
    ['שם פרויקט', p.project_name || '—'],
    ['רובע', p.quarter || '—'],
    ['כתובות', addressText || '—'],
    ['מספר תוכנית', p.plan_number || '—'],
    ['יזם', p.developer || '—'],
    ['מגיש התכנית / אדריכל', p.plan_submitter || '—'],
    ['סמכות', p.authority || '—'],
    ['שלב', getStageName((p.main_stage as StageId) || 'forum1_harmonika')],
    ['סטטוס ניהולי', statusLabel(p.management_status)],
    ['רמת סיכון', riskLabel(p.risk_level)],
    ['יח״ד קיימות', String(p.units_in || 0)],
    ['יח״ד מתוכננות', String(p.units_out || 0)],
    ['מכפיל', `×${mult}`],
    ['פוטנציאל היתרים', `${formatRevenue(potential)} (${(p.units_out||0).toLocaleString('he-IL')} יח״ד × 25,000 ₪)`],
    ['חסם עיקרי', p.main_blocker || '—'],
    ['פעולה הבאה', p.next_action || '—'],
    ['אחראי פעולה', p.next_action_owner || '—'],
    ['תאריך יעד', p.next_action_due_date ? formatDate(p.next_action_due_date) : '—'],
    ['עדכון אחרון', p.last_update ? formatDate(p.last_update) : '—'],
    ['הערות', p.notes || '—'],
  ];

  const html = `
    ${PDF_STYLES}
    <div class="doc">
      <h1>כרטיס פרויקט: ${escape(p.project_name)}</h1>
      <div class="sub">תאריך הפקה: ${today}</div>
      <table>
        <thead><tr><th style="width:30%">שדה</th><th>ערך</th></tr></thead>
        <tbody>
          ${fields.map(([k, v]) => `<tr><td><strong>${escape(k)}</strong></td><td>${escape(v)}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
  await renderHebrewPdf(html, `כרטיס_פרויקט_${p.project_name}_${today}.pdf`, 'p');
}

// ═══════════════════════════════════════════════════════════════════════
//  פרויקט יחיד — Excel
// ═══════════════════════════════════════════════════════════════════════
export function exportProjectExcel(project: any) {
  const p = project;
  const potential = (p.units_out || 0) * 25000;
  const mult = p.multiplier || (p.units_in && p.units_in > 0 ? ((p.units_out || 0) / p.units_in).toFixed(1) : '0');
  const headers = ['שדה', 'ערך'];
  const rows: any[][] = [
    ['שם פרויקט', p.project_name || ''],
    ['רובע', p.quarter || ''],
    ['מספר תוכנית', p.plan_number || ''],
    ['יזם', p.developer || ''],
    ['מגיש התכנית', p.plan_submitter || ''],
    ['שלב', getStageName((p.main_stage as StageId) || 'forum1_harmonika')],
    ['סטטוס', statusLabel(p.management_status)],
    ['רמת סיכון', riskLabel(p.risk_level)],
    ['יח״ד קיימות', p.units_in || 0],
    ['יח״ד מתוכננות', p.units_out || 0],
    ['מכפיל', mult],
    ['פוטנציאל היתרים (₪)', potential],
    ['חסם עיקרי', p.main_blocker || ''],
    ['פעולה הבאה', p.next_action || ''],
    ['אחראי', p.next_action_owner || ''],
    ['תאריך יעד', p.next_action_due_date ? formatDate(p.next_action_due_date) : ''],
    ['עדכון אחרון', p.last_update ? formatDate(p.last_update) : ''],
    ['הערות', p.notes || ''],
  ];
  const wb = XLSX.utils.book_new();
  const ws = buildSheet(headers, rows, [26, 60]);
  const sheetName = (p.project_name || 'פרויקט').substring(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `כרטיס_פרויקט_${p.project_name}_${formatDate(new Date())}.xlsx`);
}
