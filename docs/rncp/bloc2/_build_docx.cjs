/* eslint-disable -- standalone CommonJS build script for the dossier document,
   run manually with plain Node; not part of the application runtime or its ESM rules */
/**
 * Builds Bloc2_Dossier.docx from Bloc2_Dossier.md.
 * Layout rules: Calibri 11, every chapter starts on a fresh page, styled
 * headings/tables/code blocks, cover page, field TOC, numbered footer.
 * Usage: node _build_docx.cjs
 */
const fs = require("fs");
const path = require("path");
const {
  AlignmentType, BorderStyle, Document, ExternalHyperlink, Footer, Header,
  HeadingLevel, LevelFormat, PageNumber, Packer, Paragraph, ShadingType,
  Table, TableCell, TableOfContents, TableRow, TextRun, WidthType,
} = require("docx");

const SRC = path.join(__dirname, "Bloc2_Dossier.md");
const OUT = path.join(__dirname, "Bloc2_Dossier.docx");

const ACCENT = "1F3864";
const ACCENT_LIGHT = "DEEAF6";
const CALLOUT_BG = "EDF3F9";
const CODE_BG = "F5F5F5";
const BORDER_GRAY = "BFBFBF";
const USABLE = 9026; // A4 width minus 1" margins, in DXA

const md = fs.readFileSync(SRC, "utf8").replace(/\r\n/g, "\n");
const lines = md.split("\n");

/* ---------- inline markdown -> runs ---------- */

const INLINE = /(\*\*[^*]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s)\]]+)/g;

function runsOf(text, base = {}) {
  const out = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    if (m.index > last) out.push(new TextRun({ text: text.slice(last, m.index), ...base }));
    const tok = m[0];
    const emphasis = (inner, style) => {
      for (const piece of inner.split(/(`[^`]+`)/g)) {
        if (!piece) continue;
        if (piece.startsWith("`")) out.push(new TextRun({
          text: piece.slice(1, -1), ...style, font: "Consolas", size: 19, color: "3B3B3B",
          shading: { type: ShadingType.CLEAR, fill: "EFEFEF" }, ...base,
        }));
        else out.push(new TextRun({ text: piece, ...style, ...base }));
      }
    };
    if (tok.startsWith("**")) {
      emphasis(tok.slice(2, -2), { bold: true });
    } else if (tok.startsWith("`")) {
      out.push(new TextRun({
        text: tok.slice(1, -1), font: "Consolas", size: 19, color: "3B3B3B",
        shading: { type: ShadingType.CLEAR, fill: "EFEFEF" }, ...base,
      }));
    } else if (tok.startsWith("*")) {
      emphasis(tok.slice(1, -1), { italics: true });
    } else if (tok.startsWith("[")) {
      const t = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(tok);
      out.push(new ExternalHyperlink({
        link: t[2],
        children: [new TextRun({ text: t[1], style: "Hyperlink", ...base })],
      }));
    } else {
      out.push(new ExternalHyperlink({
        link: tok,
        children: [new TextRun({ text: tok, style: "Hyperlink", ...base })],
      }));
    }
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(new TextRun({ text: text.slice(last), ...base }));
  return out;
}

/* split a table row on pipes that are outside backtick spans */
function splitCells(row) {
  const cells = [];
  let cur = "", inCode = false;
  for (const ch of row) {
    if (ch === "`") { inCode = !inCode; cur += ch; }
    else if (ch === "|" && !inCode) { cells.push(cur); cur = ""; }
    else cur += ch;
  }
  cells.push(cur);
  return cells.slice(1, -1).map((c) => c.trim()); // drop leading/trailing empties
}

function plain(text) {
  return text.replace(/\*\*|\*|`/g, "").replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
}

/* ---------- block builders ---------- */

const children = [];
let orderedInstance = 0;
let lastWasOrderedBlock = false;

function bodyPara(text, opts = {}) {
  children.push(new Paragraph({
    children: runsOf(text),
    alignment: AlignmentType.JUSTIFIED,
    spacing: { after: 120, line: 276 },
    ...opts,
  }));
}

function callout(text) {
  children.push(new Paragraph({
    children: runsOf(text),
    shading: { type: ShadingType.CLEAR, fill: CALLOUT_BG },
    border: { left: { style: BorderStyle.SINGLE, size: 24, color: ACCENT } },
    indent: { left: 240 },
    spacing: { before: 80, after: 200, line: 264 },
  }));
}

function codeBlock(blockLines) {
  const wide = blockLines.some((l) => l.length > 88);
  const size = wide ? 15 : 18; // 7.5pt when very wide, else 9pt
  blockLines.forEach((l, i) => {
    children.push(new Paragraph({
      children: [new TextRun({ text: l.length ? l : " ", font: "Consolas", size })],
      shading: { type: ShadingType.CLEAR, fill: CODE_BG },
      spacing: { before: i === 0 ? 120 : 0, after: i === blockLines.length - 1 ? 160 : 0, line: 240 },
      indent: { left: 240, right: 240 },
      keepLines: true,
      keepNext: i < blockLines.length - 1,
    }));
  });
}

function table(rows) {
  const header = splitCells(rows[0]);
  const body = rows.slice(2).map(splitCells).filter((r) => r.length > 0);
  const nCols = header.length;

  // column widths proportional to the longest plain-text cell, clamped
  const maxLen = header.map((h, i) => Math.max(
    plain(h).length,
    ...body.map((r) => plain(r[i] ?? "").length)
  ));
  const clamped = maxLen.map((l) => Math.max(8, Math.min(l, 70)));
  const total = clamped.reduce((a, b) => a + b, 0);
  const widths = clamped.map((l) => Math.round((l / total) * USABLE));
  widths[nCols - 1] = USABLE - widths.slice(0, -1).reduce((a, b) => a + b, 0);

  const mkCell = (text, i, isHeader) => new TableCell({
    width: { size: widths[i], type: WidthType.DXA },
    shading: isHeader ? { type: ShadingType.CLEAR, fill: ACCENT_LIGHT } : undefined,
    margins: { top: 60, bottom: 60, left: 100, right: 100 },
    children: [new Paragraph({
      children: runsOf(text, isHeader ? { bold: true } : {}),
      spacing: { after: 0, line: 252 },
    })],
  });

  children.push(new Table({
    columnWidths: widths,
    width: { size: USABLE, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
      bottom: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
      left: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
      right: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
      insideVertical: { style: BorderStyle.SINGLE, size: 4, color: BORDER_GRAY },
    },
    rows: [
      new TableRow({
        tableHeader: true, cantSplit: true,
        children: header.map((c, i) => mkCell(c, i, true)),
      }),
      ...body.map((r) => new TableRow({
        cantSplit: true,
        children: r.map((c, i) => mkCell(c, i, false)),
      })),
    ],
  }));
  children.push(new Paragraph({ spacing: { after: 120 }, children: [] }));
}

/* ---------- cover data ---------- */

const tocIdx = lines.findIndex((l) => l.startsWith("## Table des matières"));
const coverLines = lines.slice(0, tocIdx);
const coverRows = coverLines
  .filter((l) => l.startsWith("|") && !/^\|[\s|-]*$/.test(l))
  .map(splitCells)
  .filter((r) => r.length === 2 && plain(r[0]).length > 0);

/* ---------- main content parse ---------- */

let i = tocIdx;
while (i < lines.length && !/^## \d/.test(lines[i])) i++; // skip the markdown TOC

for (; i < lines.length; i++) {
  const l = lines[i];

  if (/^## /.test(l)) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_1,
      pageBreakBefore: true,
      spacing: { after: 240 },
      children: runsOf(l.slice(3), { bold: true }),
    }));
    lastWasOrderedBlock = false;
  } else if (/^### /.test(l)) {
    children.push(new Paragraph({
      heading: HeadingLevel.HEADING_2,
      spacing: { before: 240, after: 120 },
      children: runsOf(l.slice(4), { bold: true }),
    }));
    lastWasOrderedBlock = false;
  } else if (/^> /.test(l)) {
    callout(l.slice(2));
    lastWasOrderedBlock = false;
  } else if (/^```/.test(l)) {
    const block = [];
    i++;
    while (i < lines.length && !/^```/.test(lines[i])) { block.push(lines[i]); i++; }
    codeBlock(block);
    lastWasOrderedBlock = false;
  } else if (/^\|/.test(l)) {
    const rows = [];
    while (i < lines.length && /^\|/.test(lines[i])) { rows.push(lines[i]); i++; }
    i--;
    table(rows);
    lastWasOrderedBlock = false;
  } else if (/^- /.test(l)) {
    children.push(new Paragraph({
      children: runsOf(l.slice(2)),
      numbering: { reference: "bullets", level: 0 },
      spacing: { after: 60, line: 264 },
    }));
  } else if (/^ {2,}- /.test(l)) {
    children.push(new Paragraph({
      children: runsOf(l.replace(/^ +- /, "")),
      numbering: { reference: "bullets", level: 1 },
      spacing: { after: 60, line: 264 },
    }));
  } else if (/^\d+\. /.test(l)) {
    if (!lastWasOrderedBlock) orderedInstance++;
    children.push(new Paragraph({
      children: runsOf(l.replace(/^\d+\. /, "")),
      numbering: { reference: "ordered", level: 0, instance: orderedInstance },
      spacing: { after: 60, line: 264 },
    }));
    lastWasOrderedBlock = true;
  } else if (/^---\s*$/.test(l) || l.trim() === "") {
    // blank lines and rules keep the current list context
  } else {
    bodyPara(l);
    lastWasOrderedBlock = false;
  }
}

/* ---------- cover section ---------- */

const cover = [
  new Paragraph({ spacing: { before: 3200 }, children: [] }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "FitCoach AI", bold: true, size: 56, color: ACCENT })],
    spacing: { after: 160 },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "Dossier de projet — Bloc 2", size: 32 })],
    spacing: { after: 80 },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({
      text: "Concevoir et développer une solution applicative", size: 26, italics: true, color: "595959",
    })],
    spacing: { after: 120 },
  }),
  new Paragraph({
    alignment: AlignmentType.CENTER,
    children: [new TextRun({ text: "RNCP 39583 — Expert en Développement Logiciel", size: 22, color: "595959" })],
    spacing: { after: 600 },
  }),
  new Table({
    columnWidths: [2400, 6626],
    width: { size: USABLE, type: WidthType.DXA },
    borders: {
      top: { style: BorderStyle.NONE }, bottom: { style: BorderStyle.NONE },
      left: { style: BorderStyle.NONE }, right: { style: BorderStyle.NONE },
      insideVertical: { style: BorderStyle.NONE },
      insideHorizontal: { style: BorderStyle.SINGLE, size: 2, color: "E3E3E3" },
    },
    rows: coverRows.map(([k, v]) => new TableRow({
      cantSplit: true,
      children: [
        new TableCell({
          width: { size: 2400, type: WidthType.DXA },
          margins: { top: 70, bottom: 70, left: 60, right: 120 },
          children: [new Paragraph({ children: runsOf(k), spacing: { after: 0 } })],
        }),
        new TableCell({
          width: { size: 6626, type: WidthType.DXA },
          margins: { top: 70, bottom: 70, left: 60, right: 60 },
          children: [new Paragraph({ children: runsOf(v), spacing: { after: 0 } })],
        }),
      ],
    })),
  }),
];

/* ---------- document ---------- */

const doc = new Document({
  features: { updateFields: true },
  styles: {
    default: {
      document: { run: { font: "Calibri", size: 22, color: "1A1A1A" } },
    },
    paragraphStyles: [
      { id: "Heading1", name: "Heading 1", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Calibri", size: 32, bold: true, color: ACCENT },
        paragraph: { keepNext: true, spacing: { before: 0, after: 240 } } },
      { id: "Heading2", name: "Heading 2", basedOn: "Normal", next: "Normal", quickFormat: true,
        run: { font: "Calibri", size: 26, bold: true, color: ACCENT },
        paragraph: { keepNext: true, spacing: { before: 240, after: 120 } } },
    ],
  },
  numbering: {
    config: [
      { reference: "bullets", levels: [
        { level: 0, format: LevelFormat.BULLET, text: "•", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 420, hanging: 240 } } } },
        { level: 1, format: LevelFormat.BULLET, text: "◦", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 840, hanging: 240 } } } },
      ]},
      { reference: "ordered", levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: "%1.", alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 480, hanging: 300 } } } },
      ]},
    ],
  },
  sections: [
    {
      properties: { titlePage: true },
      headers: { default: new Header({ children: [] }) },
      footers: { default: new Footer({ children: [] }) },
      children: cover,
    },
    {
      headers: {
        default: new Header({
          children: [new Paragraph({
            alignment: AlignmentType.RIGHT,
            border: { bottom: { style: BorderStyle.SINGLE, size: 4, color: "D0D0D0" } },
            children: [new TextRun({
              text: "FitCoach AI — Dossier Bloc 2 · RNCP 39583", size: 16, color: "808080",
            })],
          })],
        }),
      },
      footers: {
        default: new Footer({
          children: [new Paragraph({
            alignment: AlignmentType.CENTER,
            border: { top: { style: BorderStyle.SINGLE, size: 4, color: "D0D0D0" } },
            children: [
              new TextRun({ text: "Alley Eddine — Alleycom", size: 16, color: "808080" }),
              new TextRun({ text: "        Page ", size: 16, color: "808080" }),
              new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "808080" }),
              new TextRun({ text: " / ", size: 16, color: "808080" }),
              new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "808080" }),
            ],
          })],
        }),
      },
      children: [
        new Paragraph({
          children: [new TextRun({ text: "Table des matières", bold: true, size: 32, color: ACCENT })],
          spacing: { after: 240 },
        }),
        new TableOfContents("Table des matières", { hyperlink: true, headingStyleRange: "1-2" }),
        ...children,
      ],
    },
  ],
});

Packer.toBuffer(doc).then((buf) => {
  fs.writeFileSync(OUT, buf);
  console.log(`OK ${OUT} (${(buf.length / 1024).toFixed(0)} KB)`);
});
