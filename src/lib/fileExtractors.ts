// Robust client-side text extraction for PPTX, PDF, DOCX, plus plain text.
// Returns structured result so UI can show success/partial/failure clearly.

import JSZip from 'jszip';
import mammoth from 'mammoth';

function normalizeExtractedLine(value: string): string {
  return value.replace(/\s+/g, ' ').replace(/[​-‍﻿]/g, '').trim();
}

function compactOrderedLines(lines: string[]): string[] {
  const compacted: string[] = [];
  let lastKey = '';
  let repeats = 0;

  for (const rawLine of lines) {
    const line = normalizeExtractedLine(rawLine);
    if (!line) continue;
    const key = line.normalize('NFKD').replace(/[\s\-_'"״׳.,:;()\[\]{}]/g, '').toLowerCase();
    if (!key) continue;

    if (key === lastKey) {
      repeats += 1;
      if (repeats >= 2) continue;
    } else {
      lastKey = key;
      repeats = 0;
    }

    compacted.push(line);
  }

  return compacted;
}

function extractTextRunsFromXml(xml: string): string[] {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'application/xml');
    if (doc.querySelector('parsererror')) throw new Error('xml parse failed');
    const nodes = Array.from(doc.getElementsByTagNameNS('*', 't'));
    return compactOrderedLines(nodes.map((node) => node.textContent || ''));
  } catch {
    return compactOrderedLines(
      Array.from(xml.matchAll(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g)).map((m) => decodeXmlEntities(m[1]))
    );
  }
}

export type ExtractStatus = 'success' | 'partial' | 'failed';
export type DetectedType = 'pptx' | 'pdf' | 'docx' | 'text' | 'unknown';

export interface ExtractResult {
  text: string;
  status: ExtractStatus;
  detectedType: DetectedType;
  fileName: string;
  fileSize: number;
  message: string;       // human-readable Hebrew status
  meta?: {
    pages?: number;
    slides?: number;
    chars?: number;
    warnings?: string[];
  };
}

function detectType(file: File): DetectedType {
  const n = file.name.toLowerCase();
  if (n.endsWith('.pptx')) return 'pptx';
  if (n.endsWith('.pdf')) return 'pdf';
  if (n.endsWith('.docx')) return 'docx';
  if (n.endsWith('.txt') || n.endsWith('.md') || n.endsWith('.csv')) return 'text';
  return 'unknown';
}

// ---------- PPTX ----------
async function extractPptx(file: File): Promise<ExtractResult> {
  const fileSize = file.size;
  try {
    const buf = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buf);
    const slideFiles = Object.keys(zip.files)
      .filter(n => /^ppt\/slides\/slide\d+\.xml$/.test(n))
      .sort((a, b) => {
        const ai = parseInt(a.match(/slide(\d+)\.xml/)![1], 10);
        const bi = parseInt(b.match(/slide(\d+)\.xml/)![1], 10);
        return ai - bi;
      });

    if (slideFiles.length === 0) {
      return {
        text: '', status: 'failed', detectedType: 'pptx', fileName: file.name, fileSize,
        message: 'לא נמצאו שקפים בקובץ ה-PPTX. ייתכן שהקובץ פגום או ריק.',
      };
    }

    const parts: string[] = [];
    const warnings: string[] = [];
    let emptySlides = 0;

    for (const slideName of slideFiles) {
      const idx = parseInt(slideName.match(/slide(\d+)\.xml/)![1], 10);
      const xml = await zip.files[slideName].async('string');
      const runs = extractTextRunsFromXml(xml);

      // Try to also grab notes if present
      const notesPath = `ppt/notesSlides/notesSlide${idx}.xml`;
      let notesText = '';
      if (zip.files[notesPath]) {
        const nxml = await zip.files[notesPath].async('string');
        notesText = extractTextRunsFromXml(nxml).join(' ');
      }

      if (runs.length === 0 && !notesText) {
        emptySlides++;
        parts.push(`--- שקף ${idx} ---\n[שקף ללא טקסט]`);
        continue;
      }
      const block = [`--- שקף ${idx} ---`, runs.join('\n')];
      if (notesText) block.push(`[הערות מציג]: ${notesText}`);
      parts.push(block.join('\n'));
    }

    const text = parts.join('\n\n').replace(/\n{3,}/g, '\n\n').trim();
    const status: ExtractStatus = emptySlides === slideFiles.length ? 'failed'
      : emptySlides > 0 ? 'partial' : 'success';
    if (emptySlides > 0 && emptySlides < slideFiles.length) {
      warnings.push(`${emptySlides} מתוך ${slideFiles.length} שקפים ללא טקסט (כנראה תמונות בלבד).`);
    }

    return {
      text, status, detectedType: 'pptx', fileName: file.name, fileSize,
      message: status === 'success'
        ? `חילוץ מלא: ${slideFiles.length} שקפים, ${text.length.toLocaleString('he-IL')} תווים.`
        : status === 'partial'
        ? `חילוץ חלקי: ${slideFiles.length - emptySlides}/${slideFiles.length} שקפים עם טקסט.`
        : 'לא נמצא טקסט בשקפים. ייתכן שהמצגת מבוססת תמונות בלבד.',
      meta: { slides: slideFiles.length, chars: text.length, warnings },
    };
  } catch (e: any) {
    return {
      text: '', status: 'failed', detectedType: 'pptx', fileName: file.name, fileSize,
      message: `שגיאה בקריאת קובץ PPTX: ${e?.message || e}`,
    };
  }
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(parseInt(n, 10)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

// ---------- PDF ----------
async function extractPdf(file: File): Promise<ExtractResult> {
  const fileSize = file.size;
  try {
    // Dynamic import + worker setup (Vite-friendly).
    const pdfjs: any = await import('pdfjs-dist');
    // Use the bundled worker via Vite's ?url
    const workerUrl = (await import('pdfjs-dist/build/pdf.worker.min.mjs?url')).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    const pages = doc.numPages;
    const parts: string[] = [];
    let emptyPages = 0;

    for (let i = 1; i <= pages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const strs: string[] = (content.items || [])
        .map((it: any) => (typeof it.str === 'string' ? it.str : ''))
        .filter(Boolean);
      const pageText = strs.join(' ').replace(/\s{2,}/g, ' ').trim();
      if (!pageText) { emptyPages++; continue; }
      parts.push(`--- עמוד ${i} ---\n${pageText}`);
    }

    const text = parts.join('\n\n');
    const warnings: string[] = [];
    let status: ExtractStatus;
    let message: string;

    if (emptyPages === pages) {
      status = 'failed';
      message = 'ה-PDF נראה כמורכב מתמונות בלבד (סרוק ללא OCR). לא ניתן לחלץ טקסט. נסה לייצא ל-PDF טקסטואלי או לבצע OCR מראש.';
    } else if (emptyPages > 0) {
      status = 'partial';
      warnings.push(`${emptyPages} מתוך ${pages} עמודים ללא טקסט (כנראה תמונות).`);
      message = `חילוץ חלקי: ${pages - emptyPages}/${pages} עמודים עם טקסט.`;
    } else {
      status = 'success';
      message = `חילוץ מלא: ${pages} עמודים, ${text.length.toLocaleString('he-IL')} תווים.`;
    }

    return {
      text, status, detectedType: 'pdf', fileName: file.name, fileSize, message,
      meta: { pages, chars: text.length, warnings },
    };
  } catch (e: any) {
    return {
      text: '', status: 'failed', detectedType: 'pdf', fileName: file.name, fileSize,
      message: `שגיאה בקריאת PDF: ${e?.message || e}`,
    };
  }
}

// ---------- DOCX ----------
async function extractDocx(file: File): Promise<ExtractResult> {
  const fileSize = file.size;
  try {
    const buf = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer: buf });
    const text = (result.value || '').trim();
    if (!text) {
      return {
        text: '', status: 'failed', detectedType: 'docx', fileName: file.name, fileSize,
        message: 'לא נמצא טקסט במסמך ה-DOCX.',
      };
    }
    const warnings = (result.messages || []).map((m: any) => m.message).slice(0, 3);
    return {
      text, status: 'success', detectedType: 'docx', fileName: file.name, fileSize,
      message: `חילוץ מלא: ${text.length.toLocaleString('he-IL')} תווים.`,
      meta: { chars: text.length, warnings },
    };
  } catch (e: any) {
    return {
      text: '', status: 'failed', detectedType: 'docx', fileName: file.name, fileSize,
      message: `שגיאה בקריאת DOCX: ${e?.message || e}`,
    };
  }
}

// ---------- TEXT ----------
async function extractText(file: File): Promise<ExtractResult> {
  const fileSize = file.size;
  try {
    const text = (await file.text()).trim();
    if (!text) {
      return {
        text: '', status: 'failed', detectedType: 'text', fileName: file.name, fileSize,
        message: 'הקובץ ריק.',
      };
    }
    return {
      text, status: 'success', detectedType: 'text', fileName: file.name, fileSize,
      message: `חילוץ מלא: ${text.length.toLocaleString('he-IL')} תווים.`,
      meta: { chars: text.length },
    };
  } catch (e: any) {
    return {
      text: '', status: 'failed', detectedType: 'text', fileName: file.name, fileSize,
      message: `שגיאה בקריאת הקובץ: ${e?.message || e}`,
    };
  }
}

export async function extractFromFile(file: File): Promise<ExtractResult> {
  const t = detectType(file);
  switch (t) {
    case 'pptx': return extractPptx(file);
    case 'pdf': return extractPdf(file);
    case 'docx': return extractDocx(file);
    case 'text': return extractText(file);
    default:
      return {
        text: '', status: 'failed', detectedType: 'unknown', fileName: file.name, fileSize: file.size,
        message: 'סוג קובץ לא נתמך. השתמש ב-PPTX, PDF, DOCX, TXT, MD או CSV.',
      };
  }
}
