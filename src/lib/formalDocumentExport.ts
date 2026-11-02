// Formal Document Export — PDF (jsPDF, image-based for RTL fidelity) + DOCX
import jsPDF from 'jspdf';
import { saveAs } from 'file-saver';
import {
  Document, Packer, Paragraph, TextRun, AlignmentType, Table, TableRow,
  TableCell, WidthType, BorderStyle, HeadingLevel, ImageRun, ShadingType,
} from 'docx';
import logo1 from '@/assets/letterhead-logo-1.jpg';
import logo2 from '@/assets/letterhead-logo-2.jpg';

export interface ActionItem {
  id: string;
  task: string;
  owner: string;
  due: string;
}

export type FormalDocumentType = 'meeting' | 'project_status' | 'system_status' | 'tama_site';

export interface MeetingDocumentDraft {
  date: string;            // DD-MM-YYYY
  recipient: string;       // לכבוד
  subject: string;         // הנדון
  projectsLine: string;    // שמות פרויקטים / מספרי תכנית
  participantsMunicipality: string;
  participantsProjects: string;
  body: string;            // מהלך הישיבה / תוכן עיקרי
  decisions: string;       // החלטות וסיכומים
  actionItems: ActionItem[];
  signature: string;
  copies: string;
  showLogo1: boolean;
  showLogo2: boolean;
  documentType?: FormalDocumentType;
  // Section labels (override defaults per document type)
  bodyLabel?: string;        // default: "מהלך הישיבה"
  decisionsLabel?: string;   // default: "החלטות וסיכומים"
  actionItemsLabel?: string; // default: "משימות לביצוע"
  hideParticipants?: boolean;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
async function fetchAsBase64(url: string): Promise<string> {
  const res = await fetch(url);
  const blob = await res.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchAsUint8(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  const buf = await res.arrayBuffer();
  return new Uint8Array(buf);
}

// ─── PDF EXPORT (renders the on-screen preview as image to keep Hebrew RTL) ──
export async function exportFormalDocPdfFromElement(el: HTMLElement, filename: string) {
  const { default: html2canvas } = await import('html2canvas').catch(() => ({ default: null as any }));
  if (!html2canvas) {
    // Fallback: simple text PDF (no Hebrew shaping but functional)
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    doc.text('Document export (text fallback)', 10, 10);
    doc.save(filename);
    return;
  }
  const canvas = await html2canvas(el, { scale: 2, backgroundColor: '#ffffff', useCORS: true });
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgW = pageW;
  const imgH = (canvas.height * imgW) / canvas.width;

  if (imgH <= pageH) {
    pdf.addImage(imgData, 'JPEG', 0, 0, imgW, imgH);
  } else {
    // Multi-page slicing
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
}

// ─── DOCX EXPORT ─────────────────────────────────────────────────────────────
const BRAND = '1F3A5F'; // navy

const heRun = (text: string, opts: any = {}) =>
  new TextRun({ text, font: 'David', rightToLeft: true, ...opts });

const heParagraph = (text: string, opts: any = {}, paraOpts: any = {}) =>
  new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    children: [heRun(text, opts)],
    spacing: { after: 120, line: 320 },
    ...paraOpts,
  });

const heSectionHeading = (text: string) =>
  new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.RIGHT,
    spacing: { before: 280, after: 140 },
    children: [heRun(text, { bold: true, size: 26, color: BRAND })],
  });

// Compute display dimensions in EMUs while preserving aspect ratio.
// Equal HEIGHT for optical balance; width derived from native ratio.
async function imageBalancedDims(url: string, targetHeightPx: number) {
  return new Promise<{ data: Uint8Array; width: number; height: number }>(async (resolve, reject) => {
    try {
      const data = await fetchAsUint8(url);
      const img = new Image();
      const blobUrl = URL.createObjectURL(new Blob([data as BlobPart]));
      img.onload = () => {
        const ratio = img.naturalWidth / img.naturalHeight;
        const height = targetHeightPx;
        const width = Math.round(height * ratio);
        URL.revokeObjectURL(blobUrl);
        resolve({ data, width, height });
      };
      img.onerror = (e) => { URL.revokeObjectURL(blobUrl); reject(e); };
      img.src = blobUrl;
    } catch (e) { reject(e); }
  });
}

export async function exportFormalDocDocx(draft: MeetingDocumentDraft, filename: string) {
  const children: any[] = [];

  const noBorders = {
    top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
    right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  } as any;

  // Logos row — balanced by HEIGHT, with subtle optical scaling for the urban-renewal logo
  if (draft.showLogo1 || draft.showLogo2) {
    const TARGET_H_LEFT = 88;  // Municipality logo (right cell, RTL)
    const TARGET_H_RIGHT = 83; // Urban renewal logo (left cell, RTL) — ~7% optical bump for visual balance
    const logo1Img = draft.showLogo1 ? await imageBalancedDims(logo1, TARGET_H_LEFT).catch(() => null) : null;
    const logo2Img = draft.showLogo2 ? await imageBalancedDims(logo2, TARGET_H_RIGHT).catch(() => null) : null;

    const cellFor = (img: typeof logo1Img, alignRight: boolean) => new TableCell({
      borders: noBorders,
      width: { size: 50, type: WidthType.PERCENTAGE },
      children: [new Paragraph({
        alignment: alignRight ? AlignmentType.RIGHT : AlignmentType.LEFT,
        children: img ? [new ImageRun({ data: img.data, transformation: { width: img.width, height: img.height } } as any)] : [new TextRun('')],
      })],
    });

    // RTL: right cell rendered first visually = logo1 (עיריית אשדוד); left = logo2 (התחדשות)
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [new TableRow({ children: [cellFor(logo2Img, false), cellFor(logo1Img, true)] })],
    }));

    // Divider — tighter spacing
    children.push(new Paragraph({
      spacing: { before: 80, after: 140 },
      border: { bottom: { style: BorderStyle.SINGLE, size: 12, color: BRAND, space: 1 } },
      children: [new TextRun('')],
    }));
  }

  // Date — tighter
  children.push(new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.LEFT,
    spacing: { after: 140 },
    children: [heRun(draft.date, { size: 20, color: '555555' })],
  }));

  // Recipient + greeting — tighter
  children.push(new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT,
    spacing: { after: 60, line: 320 },
    children: [heRun(`לכבוד: ${draft.recipient}`, { size: 24 })],
  }));
  children.push(new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT,
    spacing: { after: 160, line: 320 },
    children: [heRun('שלום רב,', { size: 24 })],
  }));

  // Subject — centered, bold, framed top/bottom
  children.push(new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.CENTER,
    spacing: { before: 80, after: 160, line: 320 },
    border: {
      top: { style: BorderStyle.SINGLE, size: 8, color: BRAND, space: 4 },
      bottom: { style: BorderStyle.SINGLE, size: 8, color: BRAND, space: 4 },
    },
    children: [heRun(`הנדון: ${draft.subject}`, { bold: true, size: 28 })],
  }));
  if (draft.projectsLine) children.push(new Paragraph({
    bidirectional: true,
    alignment: AlignmentType.CENTER,
    spacing: { after: 280 },
    children: [heRun(draft.projectsLine, { bold: true, size: 22 })],
  }));

  // Participants
  if (draft.participantsMunicipality.trim()) {
    children.push(heSectionHeading('משתתפים מטעם העירייה:'));
    draft.participantsMunicipality.split('\n').filter(Boolean).forEach(l => children.push(heParagraph(l, { size: 22 })));
  }
  if (draft.participantsProjects.trim()) {
    children.push(heSectionHeading('משתתפים מטעם הפרויקטים:'));
    draft.participantsProjects.split('\n').filter(Boolean).forEach(l => children.push(heParagraph(l, { size: 22 })));
  }

  // Body
  children.push(heSectionHeading('מהלך הישיבה:'));
  draft.body.split('\n').filter(Boolean).forEach(l => children.push(heParagraph(l, { size: 22 })));

  // Decisions
  children.push(heSectionHeading('החלטות וסיכומים:'));
  draft.decisions.split('\n').filter(Boolean).forEach(l => children.push(heParagraph(l, { size: 22 })));

  // Action items table
  if (draft.actionItems.length > 0 && draft.actionItems.some(a => a.task.trim())) {
    children.push(heSectionHeading('משימות לביצוע:'));
    const headerCell = (text: string) => new TableCell({
      shading: { fill: 'E8EEF5', type: ShadingType.CLEAR, color: 'auto' },
      children: [new Paragraph({
        bidirectional: true, alignment: AlignmentType.RIGHT,
        children: [heRun(text, { bold: true, size: 22, color: BRAND })],
      })],
    });
    const dataCell = (text: string) => new TableCell({
      children: [new Paragraph({
        bidirectional: true, alignment: AlignmentType.RIGHT,
        children: [heRun(text, { size: 22 })],
      })],
    });
    children.push(new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({ children: [headerCell('יעד'), headerCell('אחראי'), headerCell('משימה'), headerCell('מס׳')] }),
        ...draft.actionItems.filter(a => a.task.trim()).map((a, i) => new TableRow({
          children: [dataCell(a.due), dataCell(a.owner), dataCell(a.task), dataCell(String(i + 1))],
        })),
      ],
    }));
  }

  // Signature — hierarchy: closing → name (brand, bold) → title (lighter)
  children.push(new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT,
    spacing: { before: 420, after: 80, line: 320 },
    children: [heRun('בברכה,', { size: 24 })],
  }));
  const sigLines = draft.signature.split('\n').filter(Boolean);
  sigLines.forEach((l, i) => children.push(new Paragraph({
    bidirectional: true, alignment: AlignmentType.RIGHT,
    spacing: { after: 40, line: 300 },
    children: [heRun(l, i === 0
      ? { size: 24, bold: true, color: BRAND }
      : { size: 22, color: '333333' })],
  })));

  // Copies — separated by a soft top border, smaller hierarchy
  if (draft.copies.trim()) {
    children.push(new Paragraph({
      spacing: { before: 360, after: 80 },
      border: { top: { style: BorderStyle.SINGLE, size: 6, color: 'C9D3E0', space: 6 } },
      children: [new TextRun('')],
    }));
    children.push(new Paragraph({
      bidirectional: true, alignment: AlignmentType.RIGHT,
      spacing: { after: 60 },
      children: [heRun('העתקים:', { bold: true, size: 22, color: BRAND })],
    }));
    draft.copies.split('\n').filter(Boolean).forEach(l => children.push(new Paragraph({
      bidirectional: true, alignment: AlignmentType.RIGHT,
      spacing: { after: 30, line: 300 },
      children: [heRun(l, { size: 20, color: '444444' })],
    })));
  }

  const doc = new Document({
    styles: { default: { document: { run: { font: 'David', rightToLeft: true, size: 22 } } } },
    sections: [{
      properties: { page: { margin: { top: 1100, right: 1100, bottom: 1100, left: 1100 } } },
      children,
    }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, filename);
}

export const LETTERHEAD_LOGOS = { logo1, logo2 };
