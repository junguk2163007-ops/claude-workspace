// 브라우저용 문서 레이아웃 엔진.
// 한 번 배치한 결과(ops)를 캔버스 미리보기와 PDF(pdf-lib) 양쪽에 그린다.
// 서버 버전(lib/render/templates.ts)의 HTML 템플릿과 같은 모양을 목표로 한다.

import { PDFDocument, rgb, type PDFFont, type PDFImage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { subsetTtf } from './ttfsub';
import type { LetterData, ResumeData } from '../../lib/render/compose';

export const PAGE_W = 595.28;
export const PAGE_H = 841.89;
const MM = 72 / 25.4;

export interface Level {
  fs: number;
  pad: number;
  lh: number;
  gap: number;
}

export const RESUME_LEVELS: Level[] = [
  { fs: 10.5, pad: 14, lh: 1.5, gap: 4 },
  { fs: 10.5, pad: 12, lh: 1.45, gap: 3.5 },
  { fs: 10, pad: 12, lh: 1.45, gap: 3.5 },
  { fs: 10, pad: 11, lh: 1.4, gap: 3 },
  { fs: 9.5, pad: 11, lh: 1.4, gap: 3 },
  { fs: 9.5, pad: 10, lh: 1.35, gap: 2.5 },
  { fs: 9, pad: 10, lh: 1.35, gap: 2.5 },
  { fs: 9, pad: 8, lh: 1.3, gap: 2 },
];
export const LETTER_LEVELS_1P: Level[] = [
  { fs: 11, pad: 18, lh: 1.75, gap: 5 },
  { fs: 10.5, pad: 16, lh: 1.7, gap: 4.5 },
  { fs: 10, pad: 14, lh: 1.65, gap: 4 },
];
export const LETTER_LEVELS_2P: Level[] = [
  { fs: 11, pad: 18, lh: 1.75, gap: 5 },
  { fs: 10, pad: 14, lh: 1.6, gap: 4 },
  { fs: 9, pad: 12, lh: 1.5, gap: 3 },
];

const C = {
  text: '#111111',
  em: '#1F4E79',
  target: '#0B2A4A',
  border: '#9ca3af',
  th: '#f1f3f5',
  muted: '#6b7280',
};

export type Op =
  | { t: 'text'; x: number; y: number; size: number; bold: boolean; color: string; s: string }
  | { t: 'line'; x1: number; y1: number; x2: number; y2: number; w: number; color: string; dash?: number[] }
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill?: string; stroke?: string; sw?: number; dash?: number[] }
  | { t: 'img'; x: number; y: number; w: number; h: number };

export interface Page {
  ops: Op[];
}

export interface Laid {
  pages: Page[];
  level: Level;
  overflow: boolean;
}

// ---------- 폰트 ----------

interface FKFont {
  unitsPerEm: number;
  ascent: number;
  descent: number;
  layout(s: string): { advanceWidth: number; glyphs: { id: number }[] };
}

export interface Fonts {
  regular: Uint8Array;
  bold: Uint8Array;
  r: FKFont;
  b: FKFont;
}

export function loadFonts(regular: Uint8Array, bold: Uint8Array): Fonts {
  const fk = fontkit as unknown as { create(b: Uint8Array): FKFont };
  return { regular, bold, r: fk.create(regular), b: fk.create(bold) };
}

class Measurer {
  private cache = new Map<string, number>();
  readonly asc: number;
  readonly desc: number;
  constructor(private fonts: Fonts) {
    this.asc = fonts.r.ascent / fonts.r.unitsPerEm;
    this.desc = -fonts.r.descent / fonts.r.unitsPerEm;
  }
  /** 1pt 기준 너비 */
  unit(s: string, bold: boolean): number {
    const key = (bold ? 'b' : 'r') + s;
    let w = this.cache.get(key);
    if (w === undefined) {
      const f = bold ? this.fonts.b : this.fonts.r;
      w = f.layout(s).advanceWidth / f.unitsPerEm;
      this.cache.set(key, w);
    }
    return w;
  }
  w(s: string, size: number, bold = false) {
    return this.unit(s, bold) * size;
  }
  /** 줄 상자 안에서 글자 기준선 위치 */
  baseline(top: number, boxH: number, size: number) {
    return top + (boxH - (this.asc + this.desc) * size) / 2 + this.asc * size;
  }
}

// ---------- 줄바꿈 ----------

interface Run {
  s: string;
  bold?: boolean;
  color?: string;
}
interface LineRun extends Run {
  w: number;
}
interface Line {
  runs: LineRun[];
  w: number;
}

/** **굵게** 표기를 실행 단위로 나눈다 */
export function markupRuns(text: string): Run[] {
  const out: Run[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ s: text.slice(last, m.index) });
    out.push({ s: m[1], bold: true, color: C.em });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ s: text.slice(last).replace(/\*\*/g, '') });
  return out;
}

/** 공백 단위 줄바꿈(한국어 keep-all). 한 단어가 줄보다 길면 글자 단위로 자른다. */
function wrap(M: Measurer, runs: Run[], width: number, size: number): Line[] {
  const lines: Line[] = [];
  let cur: Line = { runs: [], w: 0 };
  const push = (r: Run, s: string, w: number) => {
    const lastRun = cur.runs[cur.runs.length - 1];
    if (lastRun && lastRun.bold === r.bold && lastRun.color === r.color) {
      lastRun.s += s;
      lastRun.w += w;
    } else cur.runs.push({ s, bold: r.bold, color: r.color, w });
    cur.w += w;
  };
  const newline = () => {
    // 줄 끝 공백 제거
    const lr = cur.runs[cur.runs.length - 1];
    if (lr && /\s+$/.test(lr.s)) {
      const trimmed = lr.s.replace(/\s+$/, '');
      const tw = M.w(trimmed, size, !!lr.bold);
      cur.w -= lr.w - tw;
      lr.s = trimmed;
      lr.w = tw;
    }
    lines.push(cur);
    cur = { runs: [], w: 0 };
  };
  for (const r of runs) {
    const parts = r.s.split('\n');
    parts.forEach((part, pi) => {
      if (pi > 0) newline();
      const tokens = part.match(/\s+|[^\s]+/g) || [];
      for (const tok of tokens) {
        const isSpace = /^\s+$/.test(tok);
        if (isSpace) {
          if (cur.w === 0) continue;
          push(r, ' ', M.w(' ', size, !!r.bold));
          continue;
        }
        const tw = M.w(tok, size, !!r.bold);
        if (cur.w + tw <= width + 0.01) {
          push(r, tok, tw);
          continue;
        }
        if (cur.w > 0 && tw <= width) {
          newline();
          push(r, tok, tw);
          continue;
        }
        // 글자 단위로 자르기
        for (const ch of Array.from(tok)) {
          const cw = M.w(ch, size, !!r.bold);
          if (cur.w + cw > width + 0.01 && cur.w > 0) newline();
          push(r, ch, cw);
        }
      }
    });
  }
  if (cur.runs.length || lines.length === 0) newline();
  return lines;
}

// ---------- 그리기 도우미 ----------

class Canvas {
  pages: Page[] = [{ ops: [] }];
  get ops() {
    return this.pages[this.pages.length - 1].ops;
  }
  newPage() {
    this.pages.push({ ops: [] });
  }
}

function drawLines(cv: Canvas, M: Measurer, lines: Line[], x: number, top: number, width: number, size: number, lh: number, align: 'left' | 'center' | 'right', base: Partial<Run> = {}) {
  const boxH = size * lh;
  lines.forEach((ln, i) => {
    const y = M.baseline(top + i * boxH, boxH, size);
    let cx = align === 'left' ? x : align === 'center' ? x + (width - ln.w) / 2 : x + width - ln.w;
    for (const r of ln.runs) {
      if (r.s)
        cv.ops.push({ t: 'text', x: cx, y, size, bold: !!(r.bold ?? base.bold), color: r.color ?? base.color ?? C.text, s: r.s });
      cx += r.w;
    }
  });
  return lines.length * boxH;
}

function textBlock(cv: Canvas, M: Measurer, text: string | Run[], x: number, top: number, width: number, size: number, lh: number, align: 'left' | 'center' | 'right' = 'left', base: Partial<Run> = {}) {
  const runs = typeof text === 'string' ? [{ s: text, bold: base.bold, color: base.color }] : text;
  const lines = wrap(M, runs, width, size);
  return drawLines(cv, M, lines, x, top, width, size, lh, align, base);
}

function measureBlock(M: Measurer, text: string, width: number, size: number, lh: number, bold = false) {
  return wrap(M, [{ s: text, bold }], width, size).length * size * lh;
}

/** 자간을 준 제목 (이 력 서) */
function spacedTitle(cv: Canvas, M: Measurer, text: string, centerX: number, top: number, size: number, spacingEm: number) {
  const chars = Array.from(text);
  const sp = size * spacingEm;
  const total = chars.reduce((a, ch) => a + M.w(ch, size, true) + sp, 0) - sp;
  let x = centerX - total / 2;
  const boxH = size * 1.3;
  const y = M.baseline(top, boxH, size);
  for (const ch of chars) {
    if (ch !== ' ') cv.ops.push({ t: 'text', x, y, size, bold: true, color: C.text, s: ch });
    x += M.w(ch, size, true) + sp;
  }
  return boxH;
}

const dash = (v: string | null | undefined) => (v && v.trim() ? v.trim() : '-');

interface Cell {
  text: string;
  align?: 'left' | 'center' | 'right';
  head?: boolean;
}

/** 표 그리기. 행 높이는 내용에 맞춘다. */
function table(cv: Canvas, M: Measurer, x: number, top: number, cols: number[], rows: Cell[][], lv: Level, minRowH = 0) {
  const padV = 1.3 * MM;
  const padH = 2 * MM;
  const size = lv.fs;
  let y = top;
  for (const row of rows) {
    const heights = row.map((c, i) => measureBlock(M, c.text, cols[i] - 2 * padH, size, lv.lh, !!c.head) + 2 * padV);
    const h = Math.max(minRowH, ...heights);
    let cx = x;
    row.forEach((c, i) => {
      const w = cols[i];
      cv.ops.push({ t: 'rect', x: cx, y, w, h, fill: c.head ? C.th : undefined, stroke: C.border, sw: 0.6 });
      const th = heights[i] - 2 * padV;
      textBlock(cv, M, c.text, cx + padH, y + (h - th) / 2, w - 2 * padH, size, lv.lh, c.align ?? (c.head ? 'center' : 'left'), { bold: !!c.head });
      cx += w;
    });
    y += h;
  }
  return y - top;
}

// ---------- 이력서 ----------

function layoutResumeAt(M: Measurer, d: ResumeData, hasPhoto: boolean, lv: Level): { page: Page; height: number } {
  const cv = new Canvas();
  const m = lv.pad * MM;
  const W = PAGE_W - 2 * m;
  let y = m;
  y += spacedTitle(cv, M, '이 력 서', PAGE_W / 2, y, 20, 0.4);
  y += 2 * MM;
  y += textBlock(cv, M, d.target, m, y, W, 12.5, 1.35, 'center', { bold: true, color: C.target });
  y += (lv.gap + 1) * MM;

  // 인적사항 + 사진
  const c1 = 24 * MM;
  const c3 = 34 * MM;
  const c2 = W - c1 - c3;
  const info: [string, string][] = [
    ['성명', d.name],
    ['생년월일', d.birth],
    ['연락처', d.phone],
    ['이메일', d.email],
    ['주소', d.address],
    ['지원분야', d.applyField],
  ];
  const padV = 1.3 * MM;
  const padH = 2 * MM;
  const minRow = 7.2 * MM;
  const heights = info.map(([l, v]) =>
    Math.max(minRow, measureBlock(M, dash(v), c2 - 2 * padH, lv.fs, lv.lh) + 2 * padV, measureBlock(M, l, c1 - 2 * padH, lv.fs, lv.lh, true) + 2 * padV),
  );
  const photoH = 40 * MM;
  const total = heights.reduce((a, b) => a + b, 0);
  if (total < photoH + 3 * MM) {
    const extra = (photoH + 3 * MM - total) / heights.length;
    for (let i = 0; i < heights.length; i++) heights[i] += extra;
  }
  const infoTop = y;
  info.forEach(([label, value], i) => {
    const h = heights[i];
    cv.ops.push({ t: 'rect', x: m, y, w: c1, h, fill: C.th, stroke: C.border, sw: 0.6 });
    const lt = measureBlock(M, label, c1 - 2 * padH, lv.fs, lv.lh, true);
    textBlock(cv, M, label, m + padH, y + (h - lt) / 2, c1 - 2 * padH, lv.fs, lv.lh, 'center', { bold: true });
    cv.ops.push({ t: 'rect', x: m + c1, y, w: c2, h, stroke: C.border, sw: 0.6 });
    const vt = measureBlock(M, dash(value), c2 - 2 * padH, lv.fs, lv.lh);
    textBlock(cv, M, dash(value), m + c1 + padH, y + (h - vt) / 2, c2 - 2 * padH, lv.fs, lv.lh);
    y += h;
  });
  const infoH = y - infoTop;
  cv.ops.push({ t: 'rect', x: m + c1 + c2, y: infoTop, w: c3, h: infoH, stroke: C.border, sw: 0.6 });
  const px = m + c1 + c2 + (c3 - 30 * MM) / 2;
  const py = infoTop + (infoH - photoH) / 2;
  if (hasPhoto) cv.ops.push({ t: 'img', x: px, y: py, w: 30 * MM, h: photoH });
  else {
    cv.ops.push({ t: 'rect', x: px, y: py, w: 30 * MM, h: photoH, stroke: C.border, sw: 0.8, dash: [2, 2] });
    textBlock(cv, M, '사진 부착', px, py + photoH / 2 - 6, 30 * MM, 9, 1.3, 'center', { color: C.muted });
  }

  const h2 = (title: string) => {
    y += lv.gap * MM;
    y += textBlock(cv, M, title, m, y, W, lv.fs + 1, 1.3, 'left', { bold: true });
    y += 1.5 * MM;
  };

  h2('학력사항');
  const edu: Cell[][] = [
    ['구분', '학교명', '입학연월', '졸업연월', '졸업구분'].map((t) => ({ text: t, head: true })),
    ...(d.education.length
      ? d.education.map((e, i) => [
          { text: i === d.education.length - 1 ? '최종학력' : '학력', align: 'center' as const },
          { text: dash(e.school) + (e.major ? ` (${e.major})` : '') },
          { text: dash(e.start), align: 'center' as const },
          { text: dash(e.end), align: 'center' as const },
          { text: dash(e.status), align: 'center' as const },
        ])
      : [['-', '-', '-', '-', '-'].map((t) => ({ text: t, align: 'center' as const }))]),
  ];
  y += table(cv, M, m, y, [22 * MM, W - 96 * MM, 26 * MM, 26 * MM, 22 * MM], edu, lv);

  h2('병역사항');
  const mil = d.military;
  y += table(
    cv,
    M,
    m,
    y,
    [W / 4, W / 4, W / 4, W / 4],
    [
      ['군별 / 병과', '계급', '복무기간', '전역구분'].map((t) => ({ text: t, head: true })),
      [mil?.branchCorps, mil?.rank, mil?.period, mil?.discharge].map((t) => ({ text: dash(t), align: 'center' as const })),
    ],
    lv,
  );

  h2('자격 및 면허사항');
  y += table(
    cv,
    M,
    m,
    y,
    [W - 70 * MM, 40 * MM, 30 * MM],
    [
      ['자격/면허명', '발급기관', '취득일자'].map((t) => ({ text: t, head: true })),
      ...(d.licenses.length
        ? d.licenses.map((l) => [{ text: dash(l.name) }, { text: dash(l.issuer), align: 'center' as const }, { text: dash(l.date), align: 'center' as const }])
        : [[{ text: '-' }, { text: '-', align: 'center' as const }, { text: '-', align: 'center' as const }]]),
    ],
    lv,
  );

  h2('경력사항');
  y += table(
    cv,
    M,
    m,
    y,
    [32 * MM, 30 * MM, W - 62 * MM],
    [
      ['근무기간', '근무처', '담당업무'].map((t) => ({ text: t, head: true })),
      ...(d.careers.length
        ? d.careers.map((c) => [{ text: dash(c.period), align: 'center' as const }, { text: dash(c.company), align: 'center' as const }, { text: dash(c.duties) }])
        : [[{ text: '-', align: 'center' as const }, { text: '-', align: 'center' as const }, { text: '-' }]]),
    ],
    lv,
  );

  h2('지원동기 및 자기소개');
  const bpV = 2.5 * MM;
  const bpH = 3 * MM;
  const boxTop = y;
  let iy = y + bpV;
  d.intro.forEach((p, i) => {
    if (i > 0) iy += 1.5 * MM;
    iy += textBlock(cv, M, markupRuns(p), m + bpH, iy, W - 2 * bpH, lv.fs, lv.lh);
  });
  iy += bpV;
  cv.ops.push({ t: 'rect', x: m, y: boxTop, w: W, h: iy - boxTop, stroke: C.border, sw: 0.6 });
  y = iy;

  y += (lv.gap + 1) * MM;
  y += textBlock(cv, M, '위 내용은 사실과 다름이 없습니다.', m, y, W, lv.fs, lv.lh, 'center');
  y += 2 * MM;
  y += textBlock(cv, M, dash(d.date), m, y, W, lv.fs, lv.lh, 'center');
  y += 3 * MM;
  y += textBlock(cv, M, `지원자   ${d.signName}   (인)`, m, y, W, lv.fs + 1, lv.lh, 'right');
  return { page: cv.pages[0], height: y + m };
}

export function layoutResume(fonts: Fonts, d: ResumeData, hasPhoto: boolean): Laid {
  const M = new Measurer(fonts);
  let last: { page: Page; height: number } | null = null;
  for (const lv of RESUME_LEVELS) {
    last = layoutResumeAt(M, d, hasPhoto, lv);
    if (last.height <= PAGE_H) return { pages: [last.page], level: lv, overflow: false };
  }
  return { pages: [last!.page], level: RESUME_LEVELS[RESUME_LEVELS.length - 1], overflow: true };
}

// ---------- 자기소개서 ----------

function layoutLetterAt(M: Measurer, d: LetterData, lv: Level): Page[] {
  const cv = new Canvas();
  const m = lv.pad * MM;
  const W = PAGE_W - 2 * m;
  const bottom = PAGE_H - m;
  let y = m;
  y += spacedTitle(cv, M, '자 기 소 개 서', PAGE_W / 2, y, 20, 0.4);
  y += 2 * MM;
  y += textBlock(cv, M, d.target, m, y, W, 12.5, 1.35, 'center', { bold: true, color: C.target });
  y += (lv.gap + 1) * MM;
  y += textBlock(cv, M, `지원자 ${dash(d.name)}`, m, y, W, lv.fs + 0.5, lv.lh, 'right');
  y += (lv.gap - 1) * MM;

  for (const s of d.sections) {
    const headH = (lv.fs + 1) * 1.3 + 1 * MM + 1.5 * MM;
    const lineH = lv.fs * lv.lh;
    if (y + lv.gap * MM + headH + lineH > bottom) {
      cv.newPage();
      y = m;
    } else y += lv.gap * MM;
    y += textBlock(cv, M, s.title, m, y, W, lv.fs + 1, 1.3, 'left', { bold: true });
    y += 1 * MM;
    cv.ops.push({ t: 'line', x1: m, y1: y, x2: m + W, y2: y, w: 1, color: C.text });
    y += 1.5 * MM;
    const lines = wrap(M, markupRuns(s.text), W, lv.fs);
    for (const ln of lines) {
      if (y + lineH > bottom) {
        cv.newPage();
        y = m;
      }
      drawLines(cv, M, [ln], m, y, W, lv.fs, lv.lh, 'left');
      y += lineH;
    }
  }
  return cv.pages;
}

export function layoutLetter(fonts: Fonts, d: LetterData): Laid {
  const M = new Measurer(fonts);
  for (const lv of LETTER_LEVELS_1P) {
    const pages = layoutLetterAt(M, d, lv);
    if (pages.length <= 1) return { pages, level: lv, overflow: false };
  }
  let last: Page[] = [];
  for (const lv of LETTER_LEVELS_2P) {
    last = layoutLetterAt(M, d, lv);
    if (last.length <= 2) return { pages: last, level: lv, overflow: false };
  }
  return { pages: last, level: LETTER_LEVELS_2P[LETTER_LEVELS_2P.length - 1], overflow: true };
}

// ---------- 출력: PDF ----------

function hex(c: string) {
  const n = parseInt(c.slice(1), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

export interface Photo {
  bytes: Uint8Array;
  type: 'jpg' | 'png';
}

export async function toPdf(fonts: Fonts, pages: Page[], title: string, photo: Photo | null): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  doc.setTitle(title);
  doc.setCreator('jobkit');
  doc.setProducer('jobkit');
  // 쓰인 글리프만 남긴 폰트를 임베드 (pdf-lib 의 subset 옵션은 쓰지 않음)
  const used = { r: new Set<number>(), b: new Set<number>() };
  for (const p of pages)
    for (const op of p.ops)
      if (op.t === 'text') for (const g of (op.bold ? fonts.b : fonts.r).layout(op.s).glyphs) (op.bold ? used.b : used.r).add(g.id);
  const fr: PDFFont = await doc.embedFont(subsetTtf(fonts.regular, used.r), { subset: false });
  const fb: PDFFont = await doc.embedFont(subsetTtf(fonts.bold, used.b), { subset: false });
  let img: PDFImage | null = null;
  if (photo) img = photo.type === 'png' ? await doc.embedPng(photo.bytes) : await doc.embedJpg(photo.bytes);
  for (const p of pages) {
    const page = doc.addPage([PAGE_W, PAGE_H]);
    for (const op of p.ops) {
      if (op.t === 'text') page.drawText(op.s, { x: op.x, y: PAGE_H - op.y, size: op.size, font: op.bold ? fb : fr, color: hex(op.color) });
      else if (op.t === 'line')
        page.drawLine({ start: { x: op.x1, y: PAGE_H - op.y1 }, end: { x: op.x2, y: PAGE_H - op.y2 }, thickness: op.w, color: hex(op.color), dashArray: op.dash });
      else if (op.t === 'rect')
        page.drawRectangle({
          x: op.x,
          y: PAGE_H - op.y - op.h,
          width: op.w,
          height: op.h,
          color: op.fill ? hex(op.fill) : undefined,
          borderColor: op.stroke ? hex(op.stroke) : undefined,
          borderWidth: op.stroke ? op.sw ?? 0.6 : 0,
          borderDashArray: op.dash,
        });
      else if (op.t === 'img' && img) {
        // 사진은 업로드할 때 3:4 로 잘라 저장하므로 칸에 그대로 맞춘다
        page.drawImage(img, { x: op.x, y: PAGE_H - op.y - op.h, width: op.w, height: op.h });
      }
    }
  }
  return doc.save();
}

// ---------- 출력: 캔버스 미리보기 ----------

export const FONT_FAMILY = 'JobkitKR';

export function drawPage(canvas: HTMLCanvasElement, page: Page, photo: HTMLImageElement | null, cssWidth: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const scale = (cssWidth / PAGE_W) * dpr;
  canvas.width = Math.round(PAGE_W * scale);
  canvas.height = Math.round(PAGE_H * scale);
  canvas.style.width = `${cssWidth}px`;
  canvas.style.height = `${(cssWidth * PAGE_H) / PAGE_W}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.textBaseline = 'alphabetic';
  for (const op of page.ops) {
    if (op.t === 'rect') {
      if (op.fill) {
        ctx.fillStyle = op.fill;
        ctx.fillRect(op.x * scale, op.y * scale, op.w * scale, op.h * scale);
      }
      if (op.stroke) {
        ctx.strokeStyle = op.stroke;
        ctx.lineWidth = (op.sw ?? 0.6) * scale;
        ctx.setLineDash(op.dash ? op.dash.map((v) => v * scale) : []);
        ctx.strokeRect(op.x * scale, op.y * scale, op.w * scale, op.h * scale);
        ctx.setLineDash([]);
      }
    } else if (op.t === 'line') {
      ctx.strokeStyle = op.color;
      ctx.lineWidth = op.w * scale;
      ctx.beginPath();
      ctx.moveTo(op.x1 * scale, op.y1 * scale);
      ctx.lineTo(op.x2 * scale, op.y2 * scale);
      ctx.stroke();
    } else if (op.t === 'text') {
      ctx.fillStyle = op.color;
      ctx.font = `${op.bold ? 700 : 400} ${op.size * scale}px ${FONT_FAMILY}`;
      ctx.fillText(op.s, op.x * scale, op.y * scale);
    } else if (op.t === 'img' && photo) {
      ctx.drawImage(photo, op.x * scale, op.y * scale, op.w * scale, op.h * scale);
    }
  }
}
