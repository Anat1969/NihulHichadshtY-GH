const FOOTER_TEXT = 'נוצר על ידי Yohan AI — מערכת ניהול התחדשות עירונית אשדוד';

export function todayHe(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

// Detect a list (numbered, bulleted) OR a pipe-separated table in the assistant text.
export function containsList(text: string): boolean {
  if (!text) return false;
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const listLineRe = /^([•\-\*•]|(\d+)[\.\)])\s+/;
  const listMatches = lines.filter((l) => listLineRe.test(l)).length;
  if (listMatches >= 2) return true;
  const tableMatches = lines.filter((l) => l.includes('|')).length;
  return tableMatches >= 2;
}

export function exportYohanPdf(title: string, content: string) {
  const rows = content.split('\n').filter((line) => line.trim() && !line.includes('---'));
  const isTable = rows.some((line) => line.includes('|'));

  let bodyHTML = '';
  if (isTable) {
    const tableRows = rows.filter((line) => line.includes('|'));
    bodyHTML = '<table>';
    tableRows.forEach((row, i) => {
      const cells = row.split('|').filter((c) => c.trim());
      const tag = i === 0 ? 'th' : 'td';
      bodyHTML +=
        '<tr>' + cells.map((c) => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
    });
    bodyHTML += '</table>';
  } else {
    const items = rows.filter((line) => /^\d+\./.test(line.trim()) || line.trim().startsWith('•'));
    bodyHTML =
      '<ol>' +
      items
        .map(
          (item) =>
            `<li>${item.replace(/^\s*\d+\.\s*/, '').replace(/^\s*•\s*/, '').trim()}</li>`,
        )
        .join('') +
      '</ol>';
  }

  const safeTitle = (title || 'תשובת Yohan AI').replace(/</g, '&lt;');
  const html = `<!DOCTYPE html>
<html dir="rtl" lang="he">
<head>
<meta charset="UTF-8" />
<title>${safeTitle}</title>
<style>
  body { font-family: Arial, "Segoe UI", sans-serif; padding: 30px; direction: rtl; text-align: right; color: #111; }
  h1 { font-size: 22px; margin: 0 0 4px; color: #1E3A5F; }
  .date { color: #666; font-size: 13px; margin-bottom: 18px; }
  table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  th, td { border: 1px solid #ccc; padding: 8px 10px; text-align: right; font-size: 13px; }
  th { background: #1E3A5F; color: #fff; }
  ol { padding-right: 20px; font-size: 14px; line-height: 1.7; }
  li { margin-bottom: 6px; }
  .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #ddd; color: #888; font-size: 11px; text-align: center; }
  @media print { body { padding: 15px; } }
</style>
</head>
<body>
  <h1>${safeTitle}</h1>
  <div class="date">${new Date().toLocaleDateString('he-IL')}</div>
  ${bodyHTML}
  <div class="footer">${FOOTER_TEXT}</div>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) return;
  win.document.write(html);
  win.document.close();
  setTimeout(() => win.print(), 500);
}

export async function exportYohanDocx(title: string, content: string) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    AlignmentType,
    WidthType,
    ShadingType,
  } = await import('docx');

  const rows = content.split('\n').filter((line) => line.trim() && !line.includes('---'));
  const isTable = rows.some((line) => line.includes('|'));

  const docChildren: any[] = [];

  docChildren.push(
    new Paragraph({
      children: [new TextRun({ text: title, bold: true, size: 28, font: 'Arial', rightToLeft: true })],
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
    }),
  );

  docChildren.push(
    new Paragraph({
      children: [
        new TextRun({
          text: new Date().toLocaleDateString('he-IL'),
          size: 20,
          color: '666666',
          font: 'Arial',
          rightToLeft: true,
        }),
      ],
      alignment: AlignmentType.RIGHT,
      bidirectional: true,
    }),
  );

  if (isTable) {
    const tableRows = rows.filter((line) => line.includes('|'));
    const tableChildren = tableRows.map((row, i) => {
      // Keep logical order; table-level visuallyRightToLeft handles RTL display.
      const cells = row.split('|').filter((c) => c.trim());
      return new TableRow({
        children: cells.map(
          (cell) =>
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: cell.trim(),
                      bold: i === 0,
                      font: 'Arial',
                      size: 20,
                      color: i === 0 ? 'FFFFFF' : '000000',
                      rightToLeft: true,
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                  bidirectional: true,
                }),
              ],
              shading:
                i === 0
                  ? { type: ShadingType.SOLID, color: '1E3A5F', fill: '1E3A5F' }
                  : undefined,
            }),
        ),
      });
    });
    docChildren.push(
      new Table({
        rows: tableChildren,
        width: { size: 100, type: WidthType.PERCENTAGE },
        visuallyRightToLeft: true,
      } as any),
    );
  } else {
    rows
      .filter((line) => /^\d+\./.test(line.trim()) || line.trim().startsWith('•'))
      .forEach((item) => {
        docChildren.push(
          new Paragraph({
            children: [
              new TextRun({
                text: item.replace(/^\s*\d+\.\s*/, '').replace(/^\s*•\s*/, '').trim(),
                font: 'Arial',
                size: 22,
                rightToLeft: true,
              }),
            ],
            alignment: AlignmentType.RIGHT,
            bidirectional: true,
          }),
        );
      });
  }

  const doc = new Document({
    sections: [
      {
        properties: { bidi: true } as any,
        children: docChildren,
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${title || 'yohan'}.docx`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
