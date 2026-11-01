// 최소 TrueType 서브셋: 글리프 번호는 그대로 두고, 쓰지 않는 글리프의 외곽선만 비운다.
// (pdf-lib/fontkit 의 subset 옵션은 Noto Sans KR 에서 글자가 빠지는 문제가 있어 직접 만든다.)
// cmap·hmtx 는 그대로라 글자 대응과 너비가 바뀌지 않는다.

const KEEP = ['cmap', 'head', 'hhea', 'hmtx', 'maxp', 'name', 'OS/2', 'post', 'loca', 'glyf', 'cvt ', 'fpgm', 'prep'];

interface TableRec {
  tag: string;
  offset: number;
  length: number;
}

function readTables(dv: DataView): Map<string, TableRec> {
  const num = dv.getUint16(4);
  const map = new Map<string, TableRec>();
  for (let i = 0; i < num; i++) {
    const p = 12 + i * 16;
    const tag = String.fromCharCode(dv.getUint8(p), dv.getUint8(p + 1), dv.getUint8(p + 2), dv.getUint8(p + 3));
    map.set(tag, { tag, offset: dv.getUint32(p + 8), length: dv.getUint32(p + 12) });
  }
  return map;
}

function checksum(b: Uint8Array): number {
  const padded = new Uint8Array((b.length + 3) & ~3);
  padded.set(b);
  const dv = new DataView(padded.buffer);
  let sum = 0;
  for (let i = 0; i < padded.length; i += 4) sum = (sum + dv.getUint32(i)) >>> 0;
  return sum;
}

/** glyphIds 에 든 글리프(와 그 구성요소)만 외곽선을 남긴 폰트 바이트 */
export function subsetTtf(font: Uint8Array, glyphIds: Iterable<number>): Uint8Array {
  const dv = new DataView(font.buffer, font.byteOffset, font.byteLength);
  const tables = readTables(dv);
  const head = tables.get('head')!;
  const maxp = tables.get('maxp')!;
  const loca = tables.get('loca')!;
  const glyf = tables.get('glyf')!;
  const longLoca = dv.getInt16(head.offset + 50) === 1;
  const numGlyphs = dv.getUint16(maxp.offset + 4);
  const off = (i: number) => (longLoca ? dv.getUint32(loca.offset + i * 4) : dv.getUint16(loca.offset + i * 2) * 2);

  // 사용 글리프 + 복합 글리프의 구성요소
  const keep = new Set<number>([0]);
  const stack = [...glyphIds];
  while (stack.length) {
    const g = stack.pop()!;
    if (g < 0 || g >= numGlyphs || keep.has(g)) continue;
    keep.add(g);
    const start = off(g);
    const end = off(g + 1);
    if (end <= start) continue;
    const p = glyf.offset + start;
    if (dv.getInt16(p) >= 0) continue; // 단순 글리프
    let q = p + 10;
    for (;;) {
      const flags = dv.getUint16(q);
      stack.push(dv.getUint16(q + 2));
      q += 4 + (flags & 0x0001 ? 4 : 2);
      if (flags & 0x0008) q += 2;
      else if (flags & 0x0040) q += 4;
      else if (flags & 0x0080) q += 8;
      if (!(flags & 0x0020)) break;
    }
  }

  // 새 glyf / loca (long 형식)
  let size = 0;
  for (const g of keep) size += (off(g + 1) - off(g) + 3) & ~3;
  const newGlyf = new Uint8Array(size);
  const newLoca = new Uint8Array((numGlyphs + 1) * 4);
  const ldv = new DataView(newLoca.buffer);
  let pos = 0;
  for (let g = 0; g < numGlyphs; g++) {
    ldv.setUint32(g * 4, pos);
    if (!keep.has(g)) continue;
    const s = off(g);
    const e = off(g + 1);
    if (e > s) {
      newGlyf.set(font.subarray(glyf.offset + s, glyf.offset + e), pos);
      pos += (e - s + 3) & ~3;
    }
  }
  ldv.setUint32(numGlyphs * 4, pos);

  const out = new Map<string, Uint8Array>();
  for (const tag of KEEP) {
    const t = tables.get(tag);
    if (!t) continue;
    if (tag === 'glyf') out.set(tag, newGlyf.subarray(0, pos));
    else if (tag === 'loca') out.set(tag, newLoca);
    else if (tag === 'post') {
      // 글리프 이름표를 버린 3.0 형식
      const p = font.slice(t.offset, t.offset + 32);
      new DataView(p.buffer).setUint32(0, 0x00030000);
      out.set(tag, p);
    } else out.set(tag, font.slice(t.offset, t.offset + t.length));
  }
  const headBytes = out.get('head')!;
  const hdv = new DataView(headBytes.buffer, headBytes.byteOffset, headBytes.byteLength);
  hdv.setInt16(50, 1); // indexToLocFormat = long
  hdv.setUint32(8, 0); // checkSumAdjustment 은 마지막에

  const tags = [...out.keys()].sort();
  const n = tags.length;
  let entrySelector = 0;
  while (1 << (entrySelector + 1) <= n) entrySelector++;
  const searchRange = (1 << entrySelector) * 16;
  let total = 12 + n * 16;
  for (const tag of tags) total += (out.get(tag)!.length + 3) & ~3;
  const buf = new Uint8Array(total);
  const odv = new DataView(buf.buffer);
  odv.setUint32(0, 0x00010000);
  odv.setUint16(4, n);
  odv.setUint16(6, searchRange);
  odv.setUint16(8, entrySelector);
  odv.setUint16(10, n * 16 - searchRange);
  let dataPos = 12 + n * 16;
  tags.forEach((tag, i) => {
    const data = out.get(tag)!;
    const p = 12 + i * 16;
    for (let k = 0; k < 4; k++) odv.setUint8(p + k, tag.charCodeAt(k));
    odv.setUint32(p + 4, checksum(data));
    odv.setUint32(p + 8, dataPos);
    odv.setUint32(p + 12, data.length);
    buf.set(data, dataPos);
    dataPos += (data.length + 3) & ~3;
  });
  const headPos = odv.getUint32(12 + tags.indexOf('head') * 16 + 8);
  odv.setUint32(headPos + 8, (0xb1b0afba - checksum(buf)) >>> 0);
  return buf;
}
