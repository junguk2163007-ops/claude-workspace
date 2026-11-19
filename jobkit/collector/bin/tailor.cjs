"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// collector/tailor-cli.ts
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));

// lib/util/date.ts
function todaySeoul(now = /* @__PURE__ */ new Date()) {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  });
  return fmt.format(now);
}
function isIsoDate(s) {
  return !!s && /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function parts(iso) {
  const [y, m, d] = iso.split("-").map((v) => parseInt(v, 10));
  return { y, m, d };
}
function koreanDate(iso) {
  if (!isIsoDate(iso)) return "";
  const { y, m, d } = parts(iso);
  return `${y}\uB144 ${m}\uC6D4 ${d}\uC77C`;
}
function manAge(birth, today) {
  if (!isIsoDate(birth) || !isIsoDate(today)) return null;
  const b = parts(birth);
  const t = parts(today);
  let age = t.y - b.y;
  if (t.m < b.m || t.m === b.m && t.d < b.d) age -= 1;
  return age;
}
function birthWithAge(birth, today) {
  if (!isIsoDate(birth)) return "";
  const age = manAge(birth, today);
  return `${koreanDate(birth)}${age !== null ? ` (\uB9CC ${age}\uC138)` : ""}`;
}
function yearMonth(s) {
  if (!s) return "";
  const m = s.match(/^(\d{4})(?:-(\d{1,2}))?(?:-(\d{1,2}))?$/);
  if (!m) return s;
  if (m[3]) return `${m[1]}.${m[2].padStart(2, "0")}.${m[3].padStart(2, "0")}`;
  if (m[2]) return `${m[1]}.${m[2].padStart(2, "0")}`;
  return m[1];
}
function period(start, end) {
  const a = yearMonth(start);
  const b = yearMonth(end);
  if (!a && !b) return "";
  return `${a || "-"} ~ ${b || "-"}`;
}
function yearOf(s) {
  const m = s?.match(/^(\d{4})/);
  return m ? parseInt(m[1], 10) : null;
}

// lib/parser/lines.ts
var BULLET_RE = /^(?:[-–—*•·ㆍ▪▫◦‣∙○●◎◇◆□■▣▶▷►※✔✓☞→]+|\(?\d{1,2}\)|\d{1,2}\.(?!\d)|[①-⑳]|[가-하][.)]|[a-zA-Z][.)](?=\s))\s*/;
var HEADING_MARK_RE = /^\s*(?:\[([^\]]+)\]|【([^】]+)】|<([^>]+)>|〈([^〉]+)〉|《([^》]+)》|[■□◆◇▣◈●]\s*(.+)|(?:\d{1,2}|[IVX]{1,4})\.\s*(.+))\s*:?\s*$/;
var SECTION_WORDS = [
  "\uBAA8\uC9D1\uAC1C\uC694",
  "\uBAA8\uC9D1\uC694\uAC15",
  "\uCC44\uC6A9\uAC1C\uC694",
  "\uADFC\uBB34\uC870\uAC74",
  "\uADFC\uBB34\uD658\uACBD",
  "\uADFC\uBB34\uB0B4\uC6A9",
  "\uB2F4\uB2F9\uC5C5\uBB34",
  "\uC5C5\uBB34\uB0B4\uC6A9",
  "\uC790\uACA9\uC694\uAC74",
  "\uC9C0\uC6D0\uC790\uACA9",
  "\uC9C0\uC6D0\uC870\uAC74",
  "\uC790\uACA9\uC870\uAC74",
  "\uC751\uC2DC\uC790\uACA9",
  "\uD544\uC218\uC694\uAC74",
  "\uD544\uC218\uC870\uAC74",
  "\uD544\uC218\uC0AC\uD56D",
  "\uC6B0\uB300\uC0AC\uD56D",
  "\uC6B0\uB300\uC870\uAC74",
  "\uC6B0\uB300",
  "\uAE09\uC5EC",
  "\uCC98\uC6B0",
  "\uBCF5\uB9AC\uD6C4\uC0DD",
  "\uC81C\uCD9C\uC11C\uB958",
  "\uAD6C\uBE44\uC11C\uB958",
  "\uC811\uC218\uBC29\uBC95",
  "\uC9C0\uC6D0\uBC29\uBC95",
  "\uC811\uC218\uBC29\uC2DD",
  "\uC804\uD615",
  "\uAE30\uD0C0",
  "\uBB38\uC758",
  "\uB2F4\uB2F9\uC790",
  "\uBAA8\uC9D1\uBD84\uC57C",
  "\uCC44\uC6A9\uBD84\uC57C",
  "\uADFC\uBB34\uC9C0",
  "\uADFC\uBB34\uC2DC\uAC04",
  "\uADFC\uBB34\uD615\uD0DC",
  "\uC720\uC758\uC0AC\uD56D",
  "\uCC38\uACE0\uC0AC\uD56D"
];
var REQUIREMENT_SECTION_RE = /(자격|요건|우대|지원\s*조건|응시)/;
var NOT_REQUIREMENT_SECTION_RE = /(근무\s*조건|근무\s*환경|급여|처우)/;
function stripBullet(s) {
  const m = s.match(BULLET_RE);
  if (!m) return { text: s.trim(), bulleted: false };
  return { text: s.slice(m[0].length).trim(), bulleted: true };
}
function compactWord(s) {
  return s.replace(/\s+/g, "");
}
function headerOf(raw) {
  const line = raw.trim();
  if (!line) return null;
  let core = null;
  const m = line.match(HEADING_MARK_RE);
  if (m) core = (m.slice(1).find(Boolean) || "").trim();
  else if (/^[^:：]{1,16}[:：]\s*$/.test(line)) core = line.replace(/[:：]\s*$/, "").trim();
  else if (SECTION_WORDS.includes(compactWord(line))) core = line;
  if (core === null) return null;
  core = core.replace(/[:：]\s*$/, "").trim();
  const c = compactWord(core);
  if (c.length === 0 || c.length > 14) return null;
  if (!SECTION_WORDS.some((w) => c.startsWith(w))) return null;
  return core;
}
function categorize(line, section) {
  const byText = (t) => {
    if (/우대/.test(t)) return "\uC6B0\uB300";
    if (/[(\[]\s*필수\s*[)\]]/.test(t)) return "\uD544\uC218(\uBA85\uC2DC)";
    if (/(초보\s*가능|초보자\s*가능|신입\s*가능|무경험\s*가능|경력\s*무관)/.test(t)) return "\uC644\uD654";
    return null;
  };
  const fromLine = byText(line);
  if (fromLine) return fromLine;
  if (section) {
    if (/우대/.test(section)) return "\uC6B0\uB300";
    if (/필수/.test(section)) return "\uD544\uC218(\uBA85\uC2DC)";
    const s = byText(section);
    if (s) return s;
  }
  return "\uD544\uC218\uB85C \uBCF4\uC784";
}
function splitInlineBullets(line) {
  const re = /\s[*•]\s/g;
  const count = (line.match(re) || []).length;
  if (count < 2) return [line];
  return line.split(/\s(?=[*•]\s)/).map((s) => s.trim()).filter(Boolean);
}
function normalizeText(text) {
  return text.replace(/\r\n?/g, "\n").replace(/[  -​　]/g, " ").replace(/：/g, ":").replace(/～/g, "~");
}
function segmentLines(text, labelOf2) {
  const rawLines = normalizeText(text).split("\n").flatMap(splitInlineBullets);
  const out = [];
  let section = null;
  let prevBlank = false;
  rawLines.forEach((raw, idx) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      prevBlank = true;
      out.push({ idx, raw, text: "", bulleted: false, isHeader: false, section, category: "\uD544\uC218\uB85C \uBCF4\uC784", inRequirementSection: false });
      return;
    }
    const header = headerOf(trimmed);
    const { text: body, bulleted } = stripBullet(trimmed);
    let isHeader = false;
    if (header) {
      section = header;
      isHeader = true;
    } else {
      const label = labelOf2(body);
      if (label && !bulleted) section = label;
      else if (prevBlank && !bulleted) section = null;
    }
    prevBlank = false;
    const inReq = !!section && REQUIREMENT_SECTION_RE.test(section) && !NOT_REQUIREMENT_SECTION_RE.test(section);
    out.push({
      idx,
      raw,
      text: body,
      bulleted,
      isHeader,
      section,
      category: categorize(body, isHeader ? null : section),
      inRequirementSection: inReq && !isHeader
    });
  });
  return out;
}

// lib/parser/index.ts
var L = (labels) => labels.map((l) => Array.isArray(l) ? { label: l[0], strict: true } : { label: l });
var SITE_LABELS = L(["\uB2E8\uC9C0\uBA85", "\uC544\uD30C\uD2B8\uBA85", "\uC0AC\uC5C5\uC7A5\uBA85", "\uD604\uC7A5\uBA85", "\uAC74\uBB3C\uBA85", "\uADFC\uBB34\uCC98\uBA85", "\uADFC\uBB34\uCC98", ["\uC544\uD30C\uD2B8", true], ["\uB2E8\uC9C0", true]]);
var TITLE_LABELS = L(["\uCC44\uC6A9\uC815\uBCF4", "\uCC44\uC6A9\uBD84\uC57C", "\uBAA8\uC9D1\uBD84\uC57C", "\uBAA8\uC9D1\uC9C1\uC885", "\uCC44\uC6A9\uC9C1\uC885", "\uBAA8\uC9D1\uBD80\uBB38", "\uCC44\uC6A9\uBD80\uBB38", "\uBAA8\uC9D1\uC9C1\uCC45", "\uCC44\uC6A9\uC9C1\uCC45", "\uC9C1\uCC45", ["\uC9C1\uC885", true], ["\uBAA8\uC9D1\uC9C1\uBB34", true]]);
var COMPANY_LABELS = L(["\uC704\uD0C1\uC0AC\uBA85", "\uC704\uD0C1\uAD00\uB9AC\uD68C\uC0AC", "\uC704\uD0C1\uD68C\uC0AC", "\uC704\uD0C1\uC0AC", "\uAD00\uB9AC\uD68C\uC0AC", "\uAD00\uB9AC\uC5C5\uCCB4", "\uD68C\uC0AC\uBA85", "\uC5C5\uCCB4\uBA85", "\uAE30\uC5C5\uBA85"]);
var ADDRESS_LABELS = L(["\uADFC\uBB34\uC9C0\uC8FC\uC18C", "\uB2E8\uC9C0\uC8FC\uC18C", "\uC8FC\uC18C", "\uC18C\uC7AC\uC9C0", "\uADFC\uBB34\uC7A5\uC18C", ["\uADFC\uBB34\uC9C0", true], ["\uC704\uCE58", true]]);
var HOUSEHOLD_LABELS = L(["\uCD1D\uC138\uB300\uC218", "\uC138\uB300\uC218"]);
var SALARY_LABELS = L(["\uC6D4\uAE09\uC5EC", "\uAE09\uC5EC\uC870\uAC74", "\uAE09\uC5EC", "\uC784\uAE08", "\uC6D4\uAE09", "\uBCF4\uC218", "\uC5F0\uBD09"]);
var SHIFT_LABELS = L(["\uADFC\uBB34\uD615\uD0DC", "\uADFC\uBB34\uC2DC\uAC04", "\uADFC\uBB34\uBC29\uC2DD", "\uADFC\uBB34\uC77C\uC2DC", "\uADFC\uBB34\uC694\uC77C", ["\uADFC\uBB34\uC870\uAC74", true]]);
var PHONE_LABELS = L(["\uB2F4\uB2F9\uC790\uC5F0\uB77D\uCC98", "\uADFC\uBB34\uCC98\uC804\uD654", "\uAD00\uB9AC\uC0AC\uBB34\uC18C\uC804\uD654", "\uC804\uD654\uBC88\uD638", ["\uC5F0\uB77D\uCC98", true], ["\uC804\uD654", true], ["\uBB38\uC758", true], ["TEL", true], ["\uB2F4\uB2F9\uC790", true]]);
var DEADLINE_LABELS = L(["\uB9C8\uAC10\uC77C\uC790", "\uB9C8\uAC10\uC77C", "\uC811\uC218\uB9C8\uAC10", "\uC811\uC218\uAE30\uAC04", "\uBAA8\uC9D1\uAE30\uAC04", "\uCC44\uC6A9\uAE30\uAC04", ["\uB9C8\uAC10", true]]);
var START_LABELS = L(["\uCD9C\uADFC\uC608\uC815\uC77C", "\uADFC\uBB34\uC2DC\uC791\uC77C", "\uADFC\uBB34\uAC1C\uC2DC\uC77C", "\uC785\uC0AC\uC608\uC815\uC77C", "\uADFC\uBB34\uC608\uC815\uC77C", "\uCD9C\uADFC\uC77C"]);
var SUBMIT_LABELS = L(["\uC81C\uCD9C\uC11C\uB958", "\uAD6C\uBE44\uC11C\uB958", ["\uC11C\uB958", true]]);
var APPLY_LABELS = L(["\uC811\uC218\uBC29\uBC95", "\uC9C0\uC6D0\uBC29\uBC95", "\uC811\uC218\uBC29\uC2DD", "\uC9C0\uC6D0\uBC29\uC2DD"]);
var SECTION_LABELS = L(["\uC9C0\uC6D0\uC870\uAC74", "\uC790\uACA9\uC694\uAC74", "\uC9C0\uC6D0\uC790\uACA9", "\uC790\uACA9\uC870\uAC74", "\uC6B0\uB300\uC0AC\uD56D", "\uC6B0\uB300\uC870\uAC74", "\uC751\uC2DC\uC790\uACA9", "\uD544\uC218\uC694\uAC74", "\uD544\uC218\uC0AC\uD56D"]);
var ALL_LABELS = [
  SITE_LABELS,
  TITLE_LABELS,
  COMPANY_LABELS,
  ADDRESS_LABELS,
  HOUSEHOLD_LABELS,
  SALARY_LABELS,
  SHIFT_LABELS,
  PHONE_LABELS,
  DEADLINE_LABELS,
  START_LABELS,
  SUBMIT_LABELS,
  APPLY_LABELS,
  SECTION_LABELS,
  L(["\uC774\uBA54\uC77C", "E-MAIL", "\uD734\uAC8C\uC2DC\uAC04"])
].flat();
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
var labelReCache = /* @__PURE__ */ new Map();
function labelRe(spec) {
  const key = `${spec.label}|${spec.strict ? 1 : 0}`;
  let re = labelReCache.get(key);
  if (!re) {
    const pat = Array.from(spec.label).map(escapeRe).join("\\s*");
    const sep = spec.strict ? "(?:\\s*[:|]\\s*|\\t+\\s*)" : "(?:\\s*[:|]\\s*|\\t+\\s*|\\s+)";
    re = new RegExp(`^${pat}(?:${sep}(.*)|\\s*[:|]?\\s*$)`, "i");
    labelReCache.set(key, re);
  }
  return re;
}
function matchLabel(text, specs) {
  for (const s of specs) {
    const m = text.match(labelRe(s));
    if (m) return { label: s.label, value: (m[1] || "").trim() };
  }
  return null;
}
var SORTED_ALL = [...ALL_LABELS].sort((a, b) => b.label.length - a.label.length);
function labelOf(text) {
  const m = matchLabel(text, SORTED_ALL);
  if (!m) return null;
  return m.label;
}
function findLabeled(lines, specs, accept = () => true) {
  const sorted = [...specs].sort((a, b) => b.label.length - a.label.length);
  for (let i = 0; i < lines.length; i++) {
    const li = lines[i];
    if (!li.text || li.isHeader) continue;
    const m = matchLabel(li.text, sorted);
    if (!m) continue;
    let value = m.value;
    if (!value) {
      const next = lines.slice(i + 1).find((l) => l.text);
      if (next && !labelOf(next.text) && !next.isHeader) value = next.text;
    }
    if (value && accept(value)) return value;
  }
  return null;
}
var DECOR_RE = /[★☆◀▶◁▷►◄【】\[\]「」『』<>《》〈〉♠♣♥♡◆◇■□●○◎※✔✓✅❗!~♬♪]+/g;
var ROLE_WORDS = "\uC8FC\uC784|\uAE30\uC0AC|\uACFC\uC7A5|\uC18C\uC7A5|\uBC18\uC7A5|\uB300\uB9AC|\uD300\uC7A5|\uACBD\uB9AC|\uC9C1\uC6D0|\uAD00\uB9AC\uC6D0|\uACBD\uBE44\uC6D0|\uBBF8\uD654\uC6D0|\uAE30\uC804|\uAE30\uC220\uC790";
function cleanTitle(v) {
  let t = v.replace(DECOR_RE, " ").replace(/\s+/g, " ").trim();
  t = t.replace(/\s*(구인|채용|모집|구함|급구)\s*(합니다|중|공고)?\s*$/, "").trim();
  t = t.replace(/^(구인|채용|모집)\s+/, "").trim();
  const m = t.match(new RegExp(`^([\uAC00-\uD7A3]{1,4})\\s+(${ROLE_WORDS})(\\(.*\\))?$`));
  if (m) t = `${m[1]}${m[2]}${m[3] ?? ""}`;
  return t;
}
function cleanValue(v) {
  return (v || "").replace(DECOR_RE, " ").replace(/\s+/g, " ").trim();
}
function parseSalaryAmount(s) {
  const won = s.match(/(\d{1,3}(?:,\d{3})+|\d{4,})\s*원/);
  if (won) return parseInt(won[1].replace(/,/g, ""), 10);
  const man = s.match(/(\d{1,4}(?:[.,]\d+)?)\s*만\s*원?/);
  if (man) return Math.round(parseFloat(man[1].replace(/,/g, "")) * 1e4);
  return null;
}
function classifyShift(s) {
  if (/격일|24\s*시간\s*맞?교대|맞교대/.test(s)) return "\uACA9\uC77C";
  if (/3\s*교대|삼교대|주\s*당\s*비|주당비/.test(s)) return "3\uAD50\uB300";
  if (/주\s*[·\/]?\s*야\s*간?\s*교대|주\s*\/\s*야|2\s*교대/.test(s)) return "\uC8FC\uC57C\uAD50\uB300";
  if (/평일|월\s*[~\-]\s*금|주\s*5\s*일|상근|일근|주간\s*근무|0?9\s*:\s*00\s*~\s*1[78]\s*:\s*00/.test(s)) return "\uC0C1\uADFC";
  return null;
}
function parseDates(s, refYear) {
  const out = [];
  const re = /(\d{4})\s*(?:[-./]|년)\s*(\d{1,2})\s*(?:[-./]|월)\s*(\d{1,2})\s*일?|(\d{1,2})\s*월\s*(\d{1,2})\s*일/g;
  let m;
  while (m = re.exec(s)) {
    const y = m[1] ? parseInt(m[1], 10) : refYear;
    const mo = parseInt(m[2] ?? m[4], 10);
    const d = parseInt(m[3] ?? m[5], 10);
    if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) out.push(`${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
  }
  return out;
}
var EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}/g;
var PHONE_RE = /(?<!\d)(?:0\d{1,2}|1[5-9]\d{2})[-.)\s]?\d{3,4}[-.\s]?\d{4}(?!\d)/g;
function normalizePhone(p) {
  const d = p.replace(/\D/g, "");
  if (/^02\d{7,8}$/.test(d)) return d.length === 9 ? `02-${d.slice(2, 5)}-${d.slice(5)}` : `02-${d.slice(2, 6)}-${d.slice(6)}`;
  if (/^0\d{9,10}$/.test(d)) return d.length === 10 ? `${d.slice(0, 3)}-${d.slice(3, 6)}-${d.slice(6)}` : `${d.slice(0, 3)}-${d.slice(3, 7)}-${d.slice(7)}`;
  if (/^1\d{7}$/.test(d)) return `${d.slice(0, 4)}-${d.slice(4)}`;
  return p.trim();
}
var QUOTE_RES = [/“\s*([^”\n]{2,80}?)\s*”/, /"\s*([^"\n]{2,80}?)\s*"/, /‘\s*([^’\n]{2,80}?)\s*’/, /'\s*([^'\n]{2,80}?)\s*'/, /「\s*([^」\n]{2,80}?)\s*」/, /『\s*([^』\n]{2,80}?)\s*』/];
var PLACEHOLDER_RE = /(지원\s*분야|지원\s*직종|성명|이름|단지\s*명|아파트\s*명|직책|지원하는|해당\s*(?:단지|아파트|직)|지원자명|○○|OO|xx|XX|\{|\})/;
function extractRequiredPhrase(lines) {
  const isTrigger = (t) => /(기재|표기|명시|적어)/.test(t) || /필수/.test(t) && /(제목|상단)/.test(t);
  const texts = lines.map((l) => l.raw.trim());
  for (let i = 0; i < texts.length; i++) {
    if (!isTrigger(texts[i])) continue;
    for (const j of [i, i + 1, i - 1]) {
      const t = texts[j];
      if (!t) continue;
      for (const re of QUOTE_RES) {
        const m = t.match(re);
        if (m && !PLACEHOLDER_RE.test(m[1])) return m[1].trim();
      }
    }
  }
  for (const t of texts) {
    if (!isTrigger(t)) continue;
    const m = t.match(/(?:상단|제목|상단부)\s*(?:에는|에)\s*(.+?)\s*(?:을|를)?\s*(?:꼭|반드시|필히)?\s*(?:필수\s*)?(?:로\s*)?(?:기재|표기)/);
    if (!m) continue;
    const c = m[1].replace(/^(?:꼭|반드시|필히)\s*/, "").trim();
    if (c.length >= 2 && c.length <= 60 && !PLACEHOLDER_RE.test(c) && !/(이력서|메일|제목|상단)/.test(c)) return c;
  }
  return null;
}
var DOC_KEYWORDS = [
  ["\uC774\uB825\uC11C", /이력서/],
  ["\uC790\uAE30\uC18C\uAC1C\uC11C", /자기소개서|자소서/],
  ["\uC790\uACA9\uC99D \uC0AC\uBCF8", /자격증\s*(?:사본|복사본)|자격수첩/],
  ["\uACBD\uB825\uC99D\uBA85\uC11C", /경력\s*증명서/],
  ["\uC8FC\uBBFC\uB4F1\uB85D\uB4F1\uBCF8", /주민등록\s*등본|등본/],
  ["\uC8FC\uBBFC\uB4F1\uB85D\uCD08\uBCF8", /초본/],
  ["\uD1B5\uC7A5 \uC0AC\uBCF8", /통장\s*(?:사본)?/],
  ["\uAC1C\uC778\uC815\uBCF4\uB3D9\uC758\uC11C", /개인정보[^,\n]{0,12}동의서/],
  ["\uC878\uC5C5\uC99D\uBA85\uC11C", /졸업\s*증명서/],
  ["\uAC74\uAC15\uC9C4\uB2E8\uC11C", /건강\s*진단서|보건증|채용\s*신체검사/],
  ["\uAC00\uC871\uAD00\uACC4\uC99D\uBA85\uC11C", /가족관계/],
  ["\uC2E0\uBD84\uC99D \uC0AC\uBCF8", /신분증/],
  ["\uC6B4\uC804\uACBD\uB825\uC99D\uBA85\uC11C", /운전\s*경력/]
];
function extractSubmitDocs(lines, fullText) {
  const parts2 = [];
  lines.forEach((l) => {
    if (!l.text) return;
    if (l.section && /서류/.test(l.section)) parts2.push(l.text);
    else if (matchLabel(l.text, SUBMIT_LABELS)) parts2.push(l.text);
  });
  const scope = parts2.length ? parts2.join("\n") : fullText;
  const found = DOC_KEYWORDS.filter(([, re]) => re.test(scope)).map(([n]) => n);
  for (const n of ["\uC8FC\uBBFC\uB4F1\uB85D\uB4F1\uBCF8", "\uD1B5\uC7A5 \uC0AC\uBCF8"]) {
    const re = DOC_KEYWORDS.find(([k]) => k === n)[1];
    if (!found.includes(n) && re.test(fullText)) found.push(n);
  }
  return found;
}
function extractChannels(text, emails) {
  const out = [];
  if (emails.length || /(이메일|e-?mail|메일)\s*(접수|지원|제출)/i.test(text)) out.push("email");
  if (/고용\s*24|워크넷|work\s*24/i.test(text)) out.push("\uACE0\uC6A924");
  if (/잡코리아/.test(text)) out.push("\uC7A1\uCF54\uB9AC\uC544");
  if (/사람인/.test(text)) out.push("\uC0AC\uB78C\uC778");
  if (/방문\s*(?:접수|제출)|직접\s*방문|내방/.test(text)) out.push("\uBC29\uBB38");
  if (/우편|등기/.test(text)) out.push("\uC6B0\uD3B8");
  if (/팩스|fax/i.test(text)) out.push("\uD329\uC2A4");
  return out;
}
function fallbackFromTitleLine(lines) {
  const first = lines.find((l) => l.text)?.raw.trim() ?? "";
  const stripped = first.replace(/\[[^\]]*\]|【[^】]*】|\([^)]*\)|㈜/g, " ").replace(DECOR_RE, " ").replace(/\s+/g, " ").trim();
  const tokens = stripped.split(" ");
  const roleIdx = tokens.findIndex((t) => new RegExp(`(${ROLE_WORDS}|\uC2DC\uC124|\uAD00\uB9AC|\uAD6C\uC778|\uCC44\uC6A9|\uBAA8\uC9D1)`).test(t));
  const site = roleIdx > 0 ? tokens.slice(0, roleIdx).join(" ") : "";
  const titleTokens = roleIdx >= 0 ? tokens.slice(roleIdx) : [];
  const title = cleanTitle(titleTokens.join(" "));
  return { site, title: new RegExp(`(${ROLE_WORDS})`).test(title) ? title : "" };
}
function itemText(l) {
  const m = matchLabel(l.text, SECTION_LABELS);
  return stripBullet(m && m.value ? m.value : l.text).text;
}
function scanLines(text) {
  return segmentLines(text, labelOf);
}
function parsePosting(text, today = todaySeoul()) {
  const norm = normalizeText(text);
  const lines = scanLines(norm);
  const refYear = parseInt(today.slice(0, 4), 10);
  const fb = fallbackFromTitleLine(lines);
  const site = cleanValue(findLabeled(lines, SITE_LABELS)) || fb.site;
  const titleRaw = findLabeled(lines, TITLE_LABELS);
  const title = titleRaw && cleanTitle(titleRaw) || fb.title;
  const company = cleanValue(findLabeled(lines, COMPANY_LABELS));
  const address = cleanValue(findLabeled(lines, ADDRESS_LABELS, (v) => /[가-힣]/.test(v)));
  const hh = findLabeled(lines, HOUSEHOLD_LABELS, (v) => /\d/.test(v));
  const households = hh ? parseInt(hh.replace(/[^\d]/g, ""), 10) || null : null;
  const salary_text = cleanValue(findLabeled(lines, SALARY_LABELS, (v) => /\d|협의|내규|면접/.test(v)));
  const salary_amount = salary_text ? parseSalaryAmount(salary_text) : null;
  const shiftValues = [];
  const shiftSorted = [...SHIFT_LABELS].sort((a, b) => b.label.length - a.label.length);
  for (const l of lines) {
    if (!l.text || l.isHeader) continue;
    const m = matchLabel(l.text, shiftSorted);
    if (m && m.value) shiftValues.push(m.value);
  }
  const shiftText = shiftValues.join(" / ");
  const shift = classifyShift(shiftText) ?? classifyShift(norm) ?? "\uAE30\uD0C0";
  const breakM = norm.match(/휴게\s*(?:시간)?\s*[:|]?\s*([^\n]+)/);
  const break_time = breakM ? cleanValue(breakM[1]) : "";
  const emails = Array.from(new Set((norm.match(EMAIL_RE) || []).map((e) => e.toLowerCase())));
  const allPhones = Array.from(new Set((norm.match(PHONE_RE) || []).map(normalizePhone)));
  const phoneOne = new RegExp(PHONE_RE.source);
  const lp = findLabeled(lines, PHONE_LABELS, (v) => phoneOne.test(v))?.match(phoneOne)?.[0];
  const phone = lp ? normalizePhone(lp) : allPhones[0] ?? "";
  const phones = lp ? Array.from(/* @__PURE__ */ new Set([normalizePhone(lp), ...allPhones])) : allPhones;
  const deadlineRaw = findLabeled(lines, DEADLINE_LABELS) ?? "";
  let deadline = null;
  if (deadlineRaw && !/채용\s*시\s*까지|채용시|상시|충원\s*시|마감\s*시/.test(deadlineRaw)) {
    const ds = parseDates(deadlineRaw, refYear);
    deadline = ds.length ? ds[ds.length - 1] : null;
  }
  let start_date = null;
  const startRaw = findLabeled(lines, START_LABELS, (v) => parseDates(v, refYear).length > 0);
  if (startRaw) start_date = parseDates(startRaw, refYear)[0];
  else {
    const m = norm.match(/(?:출근|근무\s*시작|근무\s*개시|입사)\s*(?:예정)?\s*일?\s*[:|]?\s*([^\n]{0,30})/);
    if (m) start_date = parseDates(m[1], refYear)[0] ?? null;
  }
  const probLine = lines.find((l) => /(\d+\s*개월)[^\n]{0,25}(평가|계약\s*연장|정규직)|수습\s*(기간)?|시용\s*기간/.test(l.text));
  const requirements = lines.filter((l) => l.inRequirementSection && l.text).map((l) => ({ line: itemText(l), section: l.section, category: l.category }));
  return {
    site,
    title,
    company,
    address,
    households,
    salary_text,
    salary_amount,
    shift,
    shift_text: shiftText,
    break_time,
    emails,
    phone,
    phones,
    deadline,
    deadline_text: cleanValue(deadlineRaw),
    start_date,
    required_phrase: extractRequiredPhrase(lines),
    submit_docs: extractSubmitDocs(lines, norm),
    apply_channels: extractChannels(norm, emails),
    flags: { probation: probLine ? stripBullet(probLine.text).text : null },
    requirements
  };
}

// node_modules/zod/v3/external.js
var external_exports = {};
__export(external_exports, {
  BRAND: () => BRAND,
  DIRTY: () => DIRTY,
  EMPTY_PATH: () => EMPTY_PATH,
  INVALID: () => INVALID,
  NEVER: () => NEVER,
  OK: () => OK,
  ParseStatus: () => ParseStatus,
  Schema: () => ZodType,
  ZodAny: () => ZodAny,
  ZodArray: () => ZodArray,
  ZodBigInt: () => ZodBigInt,
  ZodBoolean: () => ZodBoolean,
  ZodBranded: () => ZodBranded,
  ZodCatch: () => ZodCatch,
  ZodDate: () => ZodDate,
  ZodDefault: () => ZodDefault,
  ZodDiscriminatedUnion: () => ZodDiscriminatedUnion,
  ZodEffects: () => ZodEffects,
  ZodEnum: () => ZodEnum,
  ZodError: () => ZodError,
  ZodFirstPartyTypeKind: () => ZodFirstPartyTypeKind,
  ZodFunction: () => ZodFunction,
  ZodIntersection: () => ZodIntersection,
  ZodIssueCode: () => ZodIssueCode,
  ZodLazy: () => ZodLazy,
  ZodLiteral: () => ZodLiteral,
  ZodMap: () => ZodMap,
  ZodNaN: () => ZodNaN,
  ZodNativeEnum: () => ZodNativeEnum,
  ZodNever: () => ZodNever,
  ZodNull: () => ZodNull,
  ZodNullable: () => ZodNullable,
  ZodNumber: () => ZodNumber,
  ZodObject: () => ZodObject,
  ZodOptional: () => ZodOptional,
  ZodParsedType: () => ZodParsedType,
  ZodPipeline: () => ZodPipeline,
  ZodPromise: () => ZodPromise,
  ZodReadonly: () => ZodReadonly,
  ZodRecord: () => ZodRecord,
  ZodSchema: () => ZodType,
  ZodSet: () => ZodSet,
  ZodString: () => ZodString,
  ZodSymbol: () => ZodSymbol,
  ZodTransformer: () => ZodEffects,
  ZodTuple: () => ZodTuple,
  ZodType: () => ZodType,
  ZodUndefined: () => ZodUndefined,
  ZodUnion: () => ZodUnion,
  ZodUnknown: () => ZodUnknown,
  ZodVoid: () => ZodVoid,
  addIssueToContext: () => addIssueToContext,
  any: () => anyType,
  array: () => arrayType,
  bigint: () => bigIntType,
  boolean: () => booleanType,
  coerce: () => coerce,
  custom: () => custom,
  date: () => dateType,
  datetimeRegex: () => datetimeRegex,
  defaultErrorMap: () => en_default,
  discriminatedUnion: () => discriminatedUnionType,
  effect: () => effectsType,
  enum: () => enumType,
  function: () => functionType,
  getErrorMap: () => getErrorMap,
  getParsedType: () => getParsedType,
  instanceof: () => instanceOfType,
  intersection: () => intersectionType,
  isAborted: () => isAborted,
  isAsync: () => isAsync,
  isDirty: () => isDirty,
  isValid: () => isValid,
  late: () => late,
  lazy: () => lazyType,
  literal: () => literalType,
  makeIssue: () => makeIssue,
  map: () => mapType,
  nan: () => nanType,
  nativeEnum: () => nativeEnumType,
  never: () => neverType,
  null: () => nullType,
  nullable: () => nullableType,
  number: () => numberType,
  object: () => objectType,
  objectUtil: () => objectUtil,
  oboolean: () => oboolean,
  onumber: () => onumber,
  optional: () => optionalType,
  ostring: () => ostring,
  pipeline: () => pipelineType,
  preprocess: () => preprocessType,
  promise: () => promiseType,
  quotelessJson: () => quotelessJson,
  record: () => recordType,
  set: () => setType,
  setErrorMap: () => setErrorMap,
  strictObject: () => strictObjectType,
  string: () => stringType,
  symbol: () => symbolType,
  transformer: () => effectsType,
  tuple: () => tupleType,
  undefined: () => undefinedType,
  union: () => unionType,
  unknown: () => unknownType,
  util: () => util,
  void: () => voidType
});

// node_modules/zod/v3/helpers/util.js
var util;
(function(util2) {
  util2.assertEqual = (_) => {
  };
  function assertIs(_arg) {
  }
  util2.assertIs = assertIs;
  function assertNever(_x) {
    throw new Error();
  }
  util2.assertNever = assertNever;
  util2.arrayToEnum = (items) => {
    const obj = {};
    for (const item of items) {
      obj[item] = item;
    }
    return obj;
  };
  util2.getValidEnumValues = (obj) => {
    const validKeys = util2.objectKeys(obj).filter((k) => typeof obj[obj[k]] !== "number");
    const filtered = {};
    for (const k of validKeys) {
      filtered[k] = obj[k];
    }
    return util2.objectValues(filtered);
  };
  util2.objectValues = (obj) => {
    return util2.objectKeys(obj).map(function(e) {
      return obj[e];
    });
  };
  util2.objectKeys = typeof Object.keys === "function" ? (obj) => Object.keys(obj) : (object) => {
    const keys = [];
    for (const key in object) {
      if (Object.prototype.hasOwnProperty.call(object, key)) {
        keys.push(key);
      }
    }
    return keys;
  };
  util2.find = (arr, checker) => {
    for (const item of arr) {
      if (checker(item))
        return item;
    }
    return void 0;
  };
  util2.isInteger = typeof Number.isInteger === "function" ? (val) => Number.isInteger(val) : (val) => typeof val === "number" && Number.isFinite(val) && Math.floor(val) === val;
  function joinValues(array, separator = " | ") {
    return array.map((val) => typeof val === "string" ? `'${val}'` : val).join(separator);
  }
  util2.joinValues = joinValues;
  util2.jsonStringifyReplacer = (_, value) => {
    if (typeof value === "bigint") {
      return value.toString();
    }
    return value;
  };
})(util || (util = {}));
var objectUtil;
(function(objectUtil2) {
  objectUtil2.mergeShapes = (first, second) => {
    return {
      ...first,
      ...second
      // second overwrites first
    };
  };
})(objectUtil || (objectUtil = {}));
var ZodParsedType = util.arrayToEnum([
  "string",
  "nan",
  "number",
  "integer",
  "float",
  "boolean",
  "date",
  "bigint",
  "symbol",
  "function",
  "undefined",
  "null",
  "array",
  "object",
  "unknown",
  "promise",
  "void",
  "never",
  "map",
  "set"
]);
var getParsedType = (data) => {
  const t = typeof data;
  switch (t) {
    case "undefined":
      return ZodParsedType.undefined;
    case "string":
      return ZodParsedType.string;
    case "number":
      return Number.isNaN(data) ? ZodParsedType.nan : ZodParsedType.number;
    case "boolean":
      return ZodParsedType.boolean;
    case "function":
      return ZodParsedType.function;
    case "bigint":
      return ZodParsedType.bigint;
    case "symbol":
      return ZodParsedType.symbol;
    case "object":
      if (Array.isArray(data)) {
        return ZodParsedType.array;
      }
      if (data === null) {
        return ZodParsedType.null;
      }
      if (data.then && typeof data.then === "function" && data.catch && typeof data.catch === "function") {
        return ZodParsedType.promise;
      }
      if (typeof Map !== "undefined" && data instanceof Map) {
        return ZodParsedType.map;
      }
      if (typeof Set !== "undefined" && data instanceof Set) {
        return ZodParsedType.set;
      }
      if (typeof Date !== "undefined" && data instanceof Date) {
        return ZodParsedType.date;
      }
      return ZodParsedType.object;
    default:
      return ZodParsedType.unknown;
  }
};

// node_modules/zod/v3/ZodError.js
var ZodIssueCode = util.arrayToEnum([
  "invalid_type",
  "invalid_literal",
  "custom",
  "invalid_union",
  "invalid_union_discriminator",
  "invalid_enum_value",
  "unrecognized_keys",
  "invalid_arguments",
  "invalid_return_type",
  "invalid_date",
  "invalid_string",
  "too_small",
  "too_big",
  "invalid_intersection_types",
  "not_multiple_of",
  "not_finite"
]);
var quotelessJson = (obj) => {
  const json = JSON.stringify(obj, null, 2);
  return json.replace(/"([^"]+)":/g, "$1:");
};
var ZodError = class _ZodError extends Error {
  get errors() {
    return this.issues;
  }
  constructor(issues) {
    super();
    this.issues = [];
    this.addIssue = (sub) => {
      this.issues = [...this.issues, sub];
    };
    this.addIssues = (subs = []) => {
      this.issues = [...this.issues, ...subs];
    };
    const actualProto = new.target.prototype;
    if (Object.setPrototypeOf) {
      Object.setPrototypeOf(this, actualProto);
    } else {
      this.__proto__ = actualProto;
    }
    this.name = "ZodError";
    this.issues = issues;
  }
  format(_mapper) {
    const mapper = _mapper || function(issue) {
      return issue.message;
    };
    const fieldErrors = { _errors: [] };
    const processError = (error) => {
      for (const issue of error.issues) {
        if (issue.code === "invalid_union") {
          issue.unionErrors.map(processError);
        } else if (issue.code === "invalid_return_type") {
          processError(issue.returnTypeError);
        } else if (issue.code === "invalid_arguments") {
          processError(issue.argumentsError);
        } else if (issue.path.length === 0) {
          fieldErrors._errors.push(mapper(issue));
        } else {
          let curr = fieldErrors;
          let i = 0;
          while (i < issue.path.length) {
            const el = issue.path[i];
            const terminal = i === issue.path.length - 1;
            if (!terminal) {
              curr[el] = curr[el] || { _errors: [] };
            } else {
              curr[el] = curr[el] || { _errors: [] };
              curr[el]._errors.push(mapper(issue));
            }
            curr = curr[el];
            i++;
          }
        }
      }
    };
    processError(this);
    return fieldErrors;
  }
  static assert(value) {
    if (!(value instanceof _ZodError)) {
      throw new Error(`Not a ZodError: ${value}`);
    }
  }
  toString() {
    return this.message;
  }
  get message() {
    return JSON.stringify(this.issues, util.jsonStringifyReplacer, 2);
  }
  get isEmpty() {
    return this.issues.length === 0;
  }
  flatten(mapper = (issue) => issue.message) {
    const fieldErrors = {};
    const formErrors = [];
    for (const sub of this.issues) {
      if (sub.path.length > 0) {
        const firstEl = sub.path[0];
        fieldErrors[firstEl] = fieldErrors[firstEl] || [];
        fieldErrors[firstEl].push(mapper(sub));
      } else {
        formErrors.push(mapper(sub));
      }
    }
    return { formErrors, fieldErrors };
  }
  get formErrors() {
    return this.flatten();
  }
};
ZodError.create = (issues) => {
  const error = new ZodError(issues);
  return error;
};

// node_modules/zod/v3/locales/en.js
var errorMap = (issue, _ctx) => {
  let message;
  switch (issue.code) {
    case ZodIssueCode.invalid_type:
      if (issue.received === ZodParsedType.undefined) {
        message = "Required";
      } else {
        message = `Expected ${issue.expected}, received ${issue.received}`;
      }
      break;
    case ZodIssueCode.invalid_literal:
      message = `Invalid literal value, expected ${JSON.stringify(issue.expected, util.jsonStringifyReplacer)}`;
      break;
    case ZodIssueCode.unrecognized_keys:
      message = `Unrecognized key(s) in object: ${util.joinValues(issue.keys, ", ")}`;
      break;
    case ZodIssueCode.invalid_union:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_union_discriminator:
      message = `Invalid discriminator value. Expected ${util.joinValues(issue.options)}`;
      break;
    case ZodIssueCode.invalid_enum_value:
      message = `Invalid enum value. Expected ${util.joinValues(issue.options)}, received '${issue.received}'`;
      break;
    case ZodIssueCode.invalid_arguments:
      message = `Invalid function arguments`;
      break;
    case ZodIssueCode.invalid_return_type:
      message = `Invalid function return type`;
      break;
    case ZodIssueCode.invalid_date:
      message = `Invalid date`;
      break;
    case ZodIssueCode.invalid_string:
      if (typeof issue.validation === "object") {
        if ("includes" in issue.validation) {
          message = `Invalid input: must include "${issue.validation.includes}"`;
          if (typeof issue.validation.position === "number") {
            message = `${message} at one or more positions greater than or equal to ${issue.validation.position}`;
          }
        } else if ("startsWith" in issue.validation) {
          message = `Invalid input: must start with "${issue.validation.startsWith}"`;
        } else if ("endsWith" in issue.validation) {
          message = `Invalid input: must end with "${issue.validation.endsWith}"`;
        } else {
          util.assertNever(issue.validation);
        }
      } else if (issue.validation !== "regex") {
        message = `Invalid ${issue.validation}`;
      } else {
        message = "Invalid";
      }
      break;
    case ZodIssueCode.too_small:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `more than`} ${issue.minimum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? "exactly" : issue.inclusive ? `at least` : `over`} ${issue.minimum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "bigint")
        message = `Number must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${issue.minimum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly equal to ` : issue.inclusive ? `greater than or equal to ` : `greater than `}${new Date(Number(issue.minimum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.too_big:
      if (issue.type === "array")
        message = `Array must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `less than`} ${issue.maximum} element(s)`;
      else if (issue.type === "string")
        message = `String must contain ${issue.exact ? `exactly` : issue.inclusive ? `at most` : `under`} ${issue.maximum} character(s)`;
      else if (issue.type === "number")
        message = `Number must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "bigint")
        message = `BigInt must be ${issue.exact ? `exactly` : issue.inclusive ? `less than or equal to` : `less than`} ${issue.maximum}`;
      else if (issue.type === "date")
        message = `Date must be ${issue.exact ? `exactly` : issue.inclusive ? `smaller than or equal to` : `smaller than`} ${new Date(Number(issue.maximum))}`;
      else
        message = "Invalid input";
      break;
    case ZodIssueCode.custom:
      message = `Invalid input`;
      break;
    case ZodIssueCode.invalid_intersection_types:
      message = `Intersection results could not be merged`;
      break;
    case ZodIssueCode.not_multiple_of:
      message = `Number must be a multiple of ${issue.multipleOf}`;
      break;
    case ZodIssueCode.not_finite:
      message = "Number must be finite";
      break;
    default:
      message = _ctx.defaultError;
      util.assertNever(issue);
  }
  return { message };
};
var en_default = errorMap;

// node_modules/zod/v3/errors.js
var overrideErrorMap = en_default;
function setErrorMap(map) {
  overrideErrorMap = map;
}
function getErrorMap() {
  return overrideErrorMap;
}

// node_modules/zod/v3/helpers/parseUtil.js
var makeIssue = (params) => {
  const { data, path: path2, errorMaps, issueData } = params;
  const fullPath = [...path2, ...issueData.path || []];
  const fullIssue = {
    ...issueData,
    path: fullPath
  };
  if (issueData.message !== void 0) {
    return {
      ...issueData,
      path: fullPath,
      message: issueData.message
    };
  }
  let errorMessage = "";
  const maps = errorMaps.filter((m) => !!m).slice().reverse();
  for (const map of maps) {
    errorMessage = map(fullIssue, { data, defaultError: errorMessage }).message;
  }
  return {
    ...issueData,
    path: fullPath,
    message: errorMessage
  };
};
var EMPTY_PATH = [];
function addIssueToContext(ctx, issueData) {
  const overrideMap = getErrorMap();
  const issue = makeIssue({
    issueData,
    data: ctx.data,
    path: ctx.path,
    errorMaps: [
      ctx.common.contextualErrorMap,
      // contextual error map is first priority
      ctx.schemaErrorMap,
      // then schema-bound map if available
      overrideMap,
      // then global override map
      overrideMap === en_default ? void 0 : en_default
      // then global default map
    ].filter((x) => !!x)
  });
  ctx.common.issues.push(issue);
}
var ParseStatus = class _ParseStatus {
  constructor() {
    this.value = "valid";
  }
  dirty() {
    if (this.value === "valid")
      this.value = "dirty";
  }
  abort() {
    if (this.value !== "aborted")
      this.value = "aborted";
  }
  static mergeArray(status, results) {
    const arrayValue = [];
    for (const s of results) {
      if (s.status === "aborted")
        return INVALID;
      if (s.status === "dirty")
        status.dirty();
      arrayValue.push(s.value);
    }
    return { status: status.value, value: arrayValue };
  }
  static async mergeObjectAsync(status, pairs) {
    const syncPairs = [];
    for (const pair of pairs) {
      const key = await pair.key;
      const value = await pair.value;
      syncPairs.push({
        key,
        value
      });
    }
    return _ParseStatus.mergeObjectSync(status, syncPairs);
  }
  static mergeObjectSync(status, pairs) {
    const finalObject = {};
    for (const pair of pairs) {
      const { key, value } = pair;
      if (key.status === "aborted")
        return INVALID;
      if (value.status === "aborted")
        return INVALID;
      if (key.status === "dirty")
        status.dirty();
      if (value.status === "dirty")
        status.dirty();
      if (key.value !== "__proto__" && (typeof value.value !== "undefined" || pair.alwaysSet)) {
        finalObject[key.value] = value.value;
      }
    }
    return { status: status.value, value: finalObject };
  }
};
var INVALID = Object.freeze({
  status: "aborted"
});
var DIRTY = (value) => ({ status: "dirty", value });
var OK = (value) => ({ status: "valid", value });
var isAborted = (x) => x.status === "aborted";
var isDirty = (x) => x.status === "dirty";
var isValid = (x) => x.status === "valid";
var isAsync = (x) => typeof Promise !== "undefined" && x instanceof Promise;

// node_modules/zod/v3/helpers/errorUtil.js
var errorUtil;
(function(errorUtil2) {
  errorUtil2.errToObj = (message) => typeof message === "string" ? { message } : message || {};
  errorUtil2.toString = (message) => typeof message === "string" ? message : message?.message;
})(errorUtil || (errorUtil = {}));

// node_modules/zod/v3/types.js
var ParseInputLazyPath = class {
  constructor(parent, value, path2, key) {
    this._cachedPath = [];
    this.parent = parent;
    this.data = value;
    this._path = path2;
    this._key = key;
  }
  get path() {
    if (!this._cachedPath.length) {
      if (Array.isArray(this._key)) {
        this._cachedPath.push(...this._path, ...this._key);
      } else {
        this._cachedPath.push(...this._path, this._key);
      }
    }
    return this._cachedPath;
  }
};
var handleResult = (ctx, result) => {
  if (isValid(result)) {
    return { success: true, data: result.value };
  } else {
    if (!ctx.common.issues.length) {
      throw new Error("Validation failed but no issues detected.");
    }
    return {
      success: false,
      get error() {
        if (this._error)
          return this._error;
        const error = new ZodError(ctx.common.issues);
        this._error = error;
        return this._error;
      }
    };
  }
};
function processCreateParams(params) {
  if (!params)
    return {};
  const { errorMap: errorMap2, invalid_type_error, required_error, description } = params;
  if (errorMap2 && (invalid_type_error || required_error)) {
    throw new Error(`Can't use "invalid_type_error" or "required_error" in conjunction with custom error map.`);
  }
  if (errorMap2)
    return { errorMap: errorMap2, description };
  const customMap = (iss, ctx) => {
    const { message } = params;
    if (iss.code === "invalid_enum_value") {
      return { message: message ?? ctx.defaultError };
    }
    if (typeof ctx.data === "undefined") {
      return { message: message ?? required_error ?? ctx.defaultError };
    }
    if (iss.code !== "invalid_type")
      return { message: ctx.defaultError };
    return { message: message ?? invalid_type_error ?? ctx.defaultError };
  };
  return { errorMap: customMap, description };
}
var ZodType = class {
  get description() {
    return this._def.description;
  }
  _getType(input) {
    return getParsedType(input.data);
  }
  _getOrReturnCtx(input, ctx) {
    return ctx || {
      common: input.parent.common,
      data: input.data,
      parsedType: getParsedType(input.data),
      schemaErrorMap: this._def.errorMap,
      path: input.path,
      parent: input.parent
    };
  }
  _processInputParams(input) {
    return {
      status: new ParseStatus(),
      ctx: {
        common: input.parent.common,
        data: input.data,
        parsedType: getParsedType(input.data),
        schemaErrorMap: this._def.errorMap,
        path: input.path,
        parent: input.parent
      }
    };
  }
  _parseSync(input) {
    const result = this._parse(input);
    if (isAsync(result)) {
      throw new Error("Synchronous parse encountered promise.");
    }
    return result;
  }
  _parseAsync(input) {
    const result = this._parse(input);
    return Promise.resolve(result);
  }
  parse(data, params) {
    const result = this.safeParse(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  safeParse(data, params) {
    const ctx = {
      common: {
        issues: [],
        async: params?.async ?? false,
        contextualErrorMap: params?.errorMap
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const result = this._parseSync({ data, path: ctx.path, parent: ctx });
    return handleResult(ctx, result);
  }
  "~validate"(data) {
    const ctx = {
      common: {
        issues: [],
        async: !!this["~standard"].async
      },
      path: [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    if (!this["~standard"].async) {
      try {
        const result = this._parseSync({ data, path: [], parent: ctx });
        return isValid(result) ? {
          value: result.value
        } : {
          issues: ctx.common.issues
        };
      } catch (err) {
        if (err?.message?.toLowerCase()?.includes("encountered")) {
          this["~standard"].async = true;
        }
        ctx.common = {
          issues: [],
          async: true
        };
      }
    }
    return this._parseAsync({ data, path: [], parent: ctx }).then((result) => isValid(result) ? {
      value: result.value
    } : {
      issues: ctx.common.issues
    });
  }
  async parseAsync(data, params) {
    const result = await this.safeParseAsync(data, params);
    if (result.success)
      return result.data;
    throw result.error;
  }
  async safeParseAsync(data, params) {
    const ctx = {
      common: {
        issues: [],
        contextualErrorMap: params?.errorMap,
        async: true
      },
      path: params?.path || [],
      schemaErrorMap: this._def.errorMap,
      parent: null,
      data,
      parsedType: getParsedType(data)
    };
    const maybeAsyncResult = this._parse({ data, path: ctx.path, parent: ctx });
    const result = await (isAsync(maybeAsyncResult) ? maybeAsyncResult : Promise.resolve(maybeAsyncResult));
    return handleResult(ctx, result);
  }
  refine(check, message) {
    const getIssueProperties = (val) => {
      if (typeof message === "string" || typeof message === "undefined") {
        return { message };
      } else if (typeof message === "function") {
        return message(val);
      } else {
        return message;
      }
    };
    return this._refinement((val, ctx) => {
      const result = check(val);
      const setError = () => ctx.addIssue({
        code: ZodIssueCode.custom,
        ...getIssueProperties(val)
      });
      if (typeof Promise !== "undefined" && result instanceof Promise) {
        return result.then((data) => {
          if (!data) {
            setError();
            return false;
          } else {
            return true;
          }
        });
      }
      if (!result) {
        setError();
        return false;
      } else {
        return true;
      }
    });
  }
  refinement(check, refinementData) {
    return this._refinement((val, ctx) => {
      if (!check(val)) {
        ctx.addIssue(typeof refinementData === "function" ? refinementData(val, ctx) : refinementData);
        return false;
      } else {
        return true;
      }
    });
  }
  _refinement(refinement) {
    return new ZodEffects({
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "refinement", refinement }
    });
  }
  superRefine(refinement) {
    return this._refinement(refinement);
  }
  constructor(def) {
    this.spa = this.safeParseAsync;
    this._def = def;
    this.parse = this.parse.bind(this);
    this.safeParse = this.safeParse.bind(this);
    this.parseAsync = this.parseAsync.bind(this);
    this.safeParseAsync = this.safeParseAsync.bind(this);
    this.spa = this.spa.bind(this);
    this.refine = this.refine.bind(this);
    this.refinement = this.refinement.bind(this);
    this.superRefine = this.superRefine.bind(this);
    this.optional = this.optional.bind(this);
    this.nullable = this.nullable.bind(this);
    this.nullish = this.nullish.bind(this);
    this.array = this.array.bind(this);
    this.promise = this.promise.bind(this);
    this.or = this.or.bind(this);
    this.and = this.and.bind(this);
    this.transform = this.transform.bind(this);
    this.brand = this.brand.bind(this);
    this.default = this.default.bind(this);
    this.catch = this.catch.bind(this);
    this.describe = this.describe.bind(this);
    this.pipe = this.pipe.bind(this);
    this.readonly = this.readonly.bind(this);
    this.isNullable = this.isNullable.bind(this);
    this.isOptional = this.isOptional.bind(this);
    this["~standard"] = {
      version: 1,
      vendor: "zod",
      validate: (data) => this["~validate"](data)
    };
  }
  optional() {
    return ZodOptional.create(this, this._def);
  }
  nullable() {
    return ZodNullable.create(this, this._def);
  }
  nullish() {
    return this.nullable().optional();
  }
  array() {
    return ZodArray.create(this);
  }
  promise() {
    return ZodPromise.create(this, this._def);
  }
  or(option) {
    return ZodUnion.create([this, option], this._def);
  }
  and(incoming) {
    return ZodIntersection.create(this, incoming, this._def);
  }
  transform(transform) {
    return new ZodEffects({
      ...processCreateParams(this._def),
      schema: this,
      typeName: ZodFirstPartyTypeKind.ZodEffects,
      effect: { type: "transform", transform }
    });
  }
  default(def) {
    const defaultValueFunc = typeof def === "function" ? def : () => def;
    return new ZodDefault({
      ...processCreateParams(this._def),
      innerType: this,
      defaultValue: defaultValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodDefault
    });
  }
  brand() {
    return new ZodBranded({
      typeName: ZodFirstPartyTypeKind.ZodBranded,
      type: this,
      ...processCreateParams(this._def)
    });
  }
  catch(def) {
    const catchValueFunc = typeof def === "function" ? def : () => def;
    return new ZodCatch({
      ...processCreateParams(this._def),
      innerType: this,
      catchValue: catchValueFunc,
      typeName: ZodFirstPartyTypeKind.ZodCatch
    });
  }
  describe(description) {
    const This = this.constructor;
    return new This({
      ...this._def,
      description
    });
  }
  pipe(target) {
    return ZodPipeline.create(this, target);
  }
  readonly() {
    return ZodReadonly.create(this);
  }
  isOptional() {
    return this.safeParse(void 0).success;
  }
  isNullable() {
    return this.safeParse(null).success;
  }
};
var cuidRegex = /^c[^\s-]{8,}$/i;
var cuid2Regex = /^[0-9a-z]+$/;
var ulidRegex = /^[0-9A-HJKMNP-TV-Z]{26}$/i;
var uuidRegex = /^[0-9a-fA-F]{8}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{4}\b-[0-9a-fA-F]{12}$/i;
var nanoidRegex = /^[a-z0-9_-]{21}$/i;
var jwtRegex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
var durationRegex = /^[-+]?P(?!$)(?:(?:[-+]?\d+Y)|(?:[-+]?\d+[.,]\d+Y$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:(?:[-+]?\d+W)|(?:[-+]?\d+[.,]\d+W$))?(?:(?:[-+]?\d+D)|(?:[-+]?\d+[.,]\d+D$))?(?:T(?=[\d+-])(?:(?:[-+]?\d+H)|(?:[-+]?\d+[.,]\d+H$))?(?:(?:[-+]?\d+M)|(?:[-+]?\d+[.,]\d+M$))?(?:[-+]?\d+(?:[.,]\d+)?S)?)??$/;
var emailRegex = /^(?!\.)(?!.*\.\.)([A-Z0-9_'+\-\.]*)[A-Z0-9_+-]@([A-Z0-9][A-Z0-9\-]*\.)+[A-Z]{2,}$/i;
var _emojiRegex = `^(\\p{Extended_Pictographic}|\\p{Emoji_Component})+$`;
var emojiRegex;
var ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])$/;
var ipv4CidrRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\.){3}(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])\/(3[0-2]|[12]?[0-9])$/;
var ipv6Regex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))$/;
var ipv6CidrRegex = /^(([0-9a-fA-F]{1,4}:){7,7}[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,7}:|([0-9a-fA-F]{1,4}:){1,6}:[0-9a-fA-F]{1,4}|([0-9a-fA-F]{1,4}:){1,5}(:[0-9a-fA-F]{1,4}){1,2}|([0-9a-fA-F]{1,4}:){1,4}(:[0-9a-fA-F]{1,4}){1,3}|([0-9a-fA-F]{1,4}:){1,3}(:[0-9a-fA-F]{1,4}){1,4}|([0-9a-fA-F]{1,4}:){1,2}(:[0-9a-fA-F]{1,4}){1,5}|[0-9a-fA-F]{1,4}:((:[0-9a-fA-F]{1,4}){1,6})|:((:[0-9a-fA-F]{1,4}){1,7}|:)|fe80:(:[0-9a-fA-F]{0,4}){0,4}%[0-9a-zA-Z]{1,}|::(ffff(:0{1,4}){0,1}:){0,1}((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])|([0-9a-fA-F]{1,4}:){1,4}:((25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9])\.){3,3}(25[0-5]|(2[0-4]|1{0,1}[0-9]){0,1}[0-9]))\/(12[0-8]|1[01][0-9]|[1-9]?[0-9])$/;
var base64Regex = /^([0-9a-zA-Z+/]{4})*(([0-9a-zA-Z+/]{2}==)|([0-9a-zA-Z+/]{3}=))?$/;
var base64urlRegex = /^([0-9a-zA-Z-_]{4})*(([0-9a-zA-Z-_]{2}(==)?)|([0-9a-zA-Z-_]{3}(=)?))?$/;
var dateRegexSource = `((\\d\\d[2468][048]|\\d\\d[13579][26]|\\d\\d0[48]|[02468][048]00|[13579][26]00)-02-29|\\d{4}-((0[13578]|1[02])-(0[1-9]|[12]\\d|3[01])|(0[469]|11)-(0[1-9]|[12]\\d|30)|(02)-(0[1-9]|1\\d|2[0-8])))`;
var dateRegex = new RegExp(`^${dateRegexSource}$`);
function timeRegexSource(args) {
  let secondsRegexSource = `[0-5]\\d`;
  if (args.precision) {
    secondsRegexSource = `${secondsRegexSource}\\.\\d{${args.precision}}`;
  } else if (args.precision == null) {
    secondsRegexSource = `${secondsRegexSource}(\\.\\d+)?`;
  }
  const secondsQuantifier = args.precision ? "+" : "?";
  return `([01]\\d|2[0-3]):[0-5]\\d(:${secondsRegexSource})${secondsQuantifier}`;
}
function timeRegex(args) {
  return new RegExp(`^${timeRegexSource(args)}$`);
}
function datetimeRegex(args) {
  let regex = `${dateRegexSource}T${timeRegexSource(args)}`;
  const opts = [];
  opts.push(args.local ? `Z?` : `Z`);
  if (args.offset)
    opts.push(`([+-]\\d{2}:?\\d{2})`);
  regex = `${regex}(${opts.join("|")})`;
  return new RegExp(`^${regex}$`);
}
function isValidIP(ip, version) {
  if ((version === "v4" || !version) && ipv4Regex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6Regex.test(ip)) {
    return true;
  }
  return false;
}
function isValidJWT(jwt, alg) {
  if (!jwtRegex.test(jwt))
    return false;
  try {
    const [header] = jwt.split(".");
    if (!header)
      return false;
    const base64 = header.replace(/-/g, "+").replace(/_/g, "/").padEnd(header.length + (4 - header.length % 4) % 4, "=");
    const decoded = JSON.parse(atob(base64));
    if (typeof decoded !== "object" || decoded === null)
      return false;
    if ("typ" in decoded && decoded?.typ !== "JWT")
      return false;
    if (!decoded.alg)
      return false;
    if (alg && decoded.alg !== alg)
      return false;
    return true;
  } catch {
    return false;
  }
}
function isValidCidr(ip, version) {
  if ((version === "v4" || !version) && ipv4CidrRegex.test(ip)) {
    return true;
  }
  if ((version === "v6" || !version) && ipv6CidrRegex.test(ip)) {
    return true;
  }
  return false;
}
var ZodString = class _ZodString extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = String(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.string) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.string,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.length < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.length > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "string",
            inclusive: true,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "length") {
        const tooBig = input.data.length > check.value;
        const tooSmall = input.data.length < check.value;
        if (tooBig || tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          if (tooBig) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_big,
              maximum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          } else if (tooSmall) {
            addIssueToContext(ctx, {
              code: ZodIssueCode.too_small,
              minimum: check.value,
              type: "string",
              inclusive: true,
              exact: true,
              message: check.message
            });
          }
          status.dirty();
        }
      } else if (check.kind === "email") {
        if (!emailRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "email",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "emoji") {
        if (!emojiRegex) {
          emojiRegex = new RegExp(_emojiRegex, "u");
        }
        if (!emojiRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "emoji",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "uuid") {
        if (!uuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "uuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "nanoid") {
        if (!nanoidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "nanoid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid") {
        if (!cuidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cuid2") {
        if (!cuid2Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cuid2",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ulid") {
        if (!ulidRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ulid",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "url") {
        try {
          new URL(input.data);
        } catch {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "regex") {
        check.regex.lastIndex = 0;
        const testResult = check.regex.test(input.data);
        if (!testResult) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "regex",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "trim") {
        input.data = input.data.trim();
      } else if (check.kind === "includes") {
        if (!input.data.includes(check.value, check.position)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { includes: check.value, position: check.position },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "toLowerCase") {
        input.data = input.data.toLowerCase();
      } else if (check.kind === "toUpperCase") {
        input.data = input.data.toUpperCase();
      } else if (check.kind === "startsWith") {
        if (!input.data.startsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { startsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "endsWith") {
        if (!input.data.endsWith(check.value)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: { endsWith: check.value },
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "datetime") {
        const regex = datetimeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "datetime",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "date") {
        const regex = dateRegex;
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "date",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "time") {
        const regex = timeRegex(check);
        if (!regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_string,
            validation: "time",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "duration") {
        if (!durationRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "duration",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "ip") {
        if (!isValidIP(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "ip",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "jwt") {
        if (!isValidJWT(input.data, check.alg)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "jwt",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "cidr") {
        if (!isValidCidr(input.data, check.version)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "cidr",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64") {
        if (!base64Regex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "base64url") {
        if (!base64urlRegex.test(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            validation: "base64url",
            code: ZodIssueCode.invalid_string,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _regex(regex, validation, message) {
    return this.refinement((data) => regex.test(data), {
      validation,
      code: ZodIssueCode.invalid_string,
      ...errorUtil.errToObj(message)
    });
  }
  _addCheck(check) {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  email(message) {
    return this._addCheck({ kind: "email", ...errorUtil.errToObj(message) });
  }
  url(message) {
    return this._addCheck({ kind: "url", ...errorUtil.errToObj(message) });
  }
  emoji(message) {
    return this._addCheck({ kind: "emoji", ...errorUtil.errToObj(message) });
  }
  uuid(message) {
    return this._addCheck({ kind: "uuid", ...errorUtil.errToObj(message) });
  }
  nanoid(message) {
    return this._addCheck({ kind: "nanoid", ...errorUtil.errToObj(message) });
  }
  cuid(message) {
    return this._addCheck({ kind: "cuid", ...errorUtil.errToObj(message) });
  }
  cuid2(message) {
    return this._addCheck({ kind: "cuid2", ...errorUtil.errToObj(message) });
  }
  ulid(message) {
    return this._addCheck({ kind: "ulid", ...errorUtil.errToObj(message) });
  }
  base64(message) {
    return this._addCheck({ kind: "base64", ...errorUtil.errToObj(message) });
  }
  base64url(message) {
    return this._addCheck({
      kind: "base64url",
      ...errorUtil.errToObj(message)
    });
  }
  jwt(options) {
    return this._addCheck({ kind: "jwt", ...errorUtil.errToObj(options) });
  }
  ip(options) {
    return this._addCheck({ kind: "ip", ...errorUtil.errToObj(options) });
  }
  cidr(options) {
    return this._addCheck({ kind: "cidr", ...errorUtil.errToObj(options) });
  }
  datetime(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "datetime",
        precision: null,
        offset: false,
        local: false,
        message: options
      });
    }
    return this._addCheck({
      kind: "datetime",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      offset: options?.offset ?? false,
      local: options?.local ?? false,
      ...errorUtil.errToObj(options?.message)
    });
  }
  date(message) {
    return this._addCheck({ kind: "date", message });
  }
  time(options) {
    if (typeof options === "string") {
      return this._addCheck({
        kind: "time",
        precision: null,
        message: options
      });
    }
    return this._addCheck({
      kind: "time",
      precision: typeof options?.precision === "undefined" ? null : options?.precision,
      ...errorUtil.errToObj(options?.message)
    });
  }
  duration(message) {
    return this._addCheck({ kind: "duration", ...errorUtil.errToObj(message) });
  }
  regex(regex, message) {
    return this._addCheck({
      kind: "regex",
      regex,
      ...errorUtil.errToObj(message)
    });
  }
  includes(value, options) {
    return this._addCheck({
      kind: "includes",
      value,
      position: options?.position,
      ...errorUtil.errToObj(options?.message)
    });
  }
  startsWith(value, message) {
    return this._addCheck({
      kind: "startsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  endsWith(value, message) {
    return this._addCheck({
      kind: "endsWith",
      value,
      ...errorUtil.errToObj(message)
    });
  }
  min(minLength, message) {
    return this._addCheck({
      kind: "min",
      value: minLength,
      ...errorUtil.errToObj(message)
    });
  }
  max(maxLength, message) {
    return this._addCheck({
      kind: "max",
      value: maxLength,
      ...errorUtil.errToObj(message)
    });
  }
  length(len, message) {
    return this._addCheck({
      kind: "length",
      value: len,
      ...errorUtil.errToObj(message)
    });
  }
  /**
   * Equivalent to `.min(1)`
   */
  nonempty(message) {
    return this.min(1, errorUtil.errToObj(message));
  }
  trim() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "trim" }]
    });
  }
  toLowerCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toLowerCase" }]
    });
  }
  toUpperCase() {
    return new _ZodString({
      ...this._def,
      checks: [...this._def.checks, { kind: "toUpperCase" }]
    });
  }
  get isDatetime() {
    return !!this._def.checks.find((ch) => ch.kind === "datetime");
  }
  get isDate() {
    return !!this._def.checks.find((ch) => ch.kind === "date");
  }
  get isTime() {
    return !!this._def.checks.find((ch) => ch.kind === "time");
  }
  get isDuration() {
    return !!this._def.checks.find((ch) => ch.kind === "duration");
  }
  get isEmail() {
    return !!this._def.checks.find((ch) => ch.kind === "email");
  }
  get isURL() {
    return !!this._def.checks.find((ch) => ch.kind === "url");
  }
  get isEmoji() {
    return !!this._def.checks.find((ch) => ch.kind === "emoji");
  }
  get isUUID() {
    return !!this._def.checks.find((ch) => ch.kind === "uuid");
  }
  get isNANOID() {
    return !!this._def.checks.find((ch) => ch.kind === "nanoid");
  }
  get isCUID() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid");
  }
  get isCUID2() {
    return !!this._def.checks.find((ch) => ch.kind === "cuid2");
  }
  get isULID() {
    return !!this._def.checks.find((ch) => ch.kind === "ulid");
  }
  get isIP() {
    return !!this._def.checks.find((ch) => ch.kind === "ip");
  }
  get isCIDR() {
    return !!this._def.checks.find((ch) => ch.kind === "cidr");
  }
  get isBase64() {
    return !!this._def.checks.find((ch) => ch.kind === "base64");
  }
  get isBase64url() {
    return !!this._def.checks.find((ch) => ch.kind === "base64url");
  }
  get minLength() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxLength() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodString.create = (params) => {
  return new ZodString({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodString,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
function floatSafeRemainder(val, step) {
  const valDecCount = (val.toString().split(".")[1] || "").length;
  const stepDecCount = (step.toString().split(".")[1] || "").length;
  const decCount = valDecCount > stepDecCount ? valDecCount : stepDecCount;
  const valInt = Number.parseInt(val.toFixed(decCount).replace(".", ""));
  const stepInt = Number.parseInt(step.toFixed(decCount).replace(".", ""));
  return valInt % stepInt / 10 ** decCount;
}
var ZodNumber = class _ZodNumber extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
    this.step = this.multipleOf;
  }
  _parse(input) {
    if (this._def.coerce) {
      input.data = Number(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.number) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.number,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "int") {
        if (!util.isInteger(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.invalid_type,
            expected: "integer",
            received: "float",
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            minimum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            maximum: check.value,
            type: "number",
            inclusive: check.inclusive,
            exact: false,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (floatSafeRemainder(input.data, check.value) !== 0) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "finite") {
        if (!Number.isFinite(input.data)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_finite,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodNumber({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodNumber({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  int(message) {
    return this._addCheck({
      kind: "int",
      message: errorUtil.toString(message)
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: 0,
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  finite(message) {
    return this._addCheck({
      kind: "finite",
      message: errorUtil.toString(message)
    });
  }
  safe(message) {
    return this._addCheck({
      kind: "min",
      inclusive: true,
      value: Number.MIN_SAFE_INTEGER,
      message: errorUtil.toString(message)
    })._addCheck({
      kind: "max",
      inclusive: true,
      value: Number.MAX_SAFE_INTEGER,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
  get isInt() {
    return !!this._def.checks.find((ch) => ch.kind === "int" || ch.kind === "multipleOf" && util.isInteger(ch.value));
  }
  get isFinite() {
    let max = null;
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "finite" || ch.kind === "int" || ch.kind === "multipleOf") {
        return true;
      } else if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      } else if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return Number.isFinite(min) && Number.isFinite(max);
  }
};
ZodNumber.create = (params) => {
  return new ZodNumber({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodNumber,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodBigInt = class _ZodBigInt extends ZodType {
  constructor() {
    super(...arguments);
    this.min = this.gte;
    this.max = this.lte;
  }
  _parse(input) {
    if (this._def.coerce) {
      try {
        input.data = BigInt(input.data);
      } catch {
        return this._getInvalidInput(input);
      }
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.bigint) {
      return this._getInvalidInput(input);
    }
    let ctx = void 0;
    const status = new ParseStatus();
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        const tooSmall = check.inclusive ? input.data < check.value : input.data <= check.value;
        if (tooSmall) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            type: "bigint",
            minimum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        const tooBig = check.inclusive ? input.data > check.value : input.data >= check.value;
        if (tooBig) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            type: "bigint",
            maximum: check.value,
            inclusive: check.inclusive,
            message: check.message
          });
          status.dirty();
        }
      } else if (check.kind === "multipleOf") {
        if (input.data % check.value !== BigInt(0)) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.not_multiple_of,
            multipleOf: check.value,
            message: check.message
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return { status: status.value, value: input.data };
  }
  _getInvalidInput(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.bigint,
      received: ctx.parsedType
    });
    return INVALID;
  }
  gte(value, message) {
    return this.setLimit("min", value, true, errorUtil.toString(message));
  }
  gt(value, message) {
    return this.setLimit("min", value, false, errorUtil.toString(message));
  }
  lte(value, message) {
    return this.setLimit("max", value, true, errorUtil.toString(message));
  }
  lt(value, message) {
    return this.setLimit("max", value, false, errorUtil.toString(message));
  }
  setLimit(kind, value, inclusive, message) {
    return new _ZodBigInt({
      ...this._def,
      checks: [
        ...this._def.checks,
        {
          kind,
          value,
          inclusive,
          message: errorUtil.toString(message)
        }
      ]
    });
  }
  _addCheck(check) {
    return new _ZodBigInt({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  positive(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  negative(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: false,
      message: errorUtil.toString(message)
    });
  }
  nonpositive(message) {
    return this._addCheck({
      kind: "max",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  nonnegative(message) {
    return this._addCheck({
      kind: "min",
      value: BigInt(0),
      inclusive: true,
      message: errorUtil.toString(message)
    });
  }
  multipleOf(value, message) {
    return this._addCheck({
      kind: "multipleOf",
      value,
      message: errorUtil.toString(message)
    });
  }
  get minValue() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min;
  }
  get maxValue() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max;
  }
};
ZodBigInt.create = (params) => {
  return new ZodBigInt({
    checks: [],
    typeName: ZodFirstPartyTypeKind.ZodBigInt,
    coerce: params?.coerce ?? false,
    ...processCreateParams(params)
  });
};
var ZodBoolean = class extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = Boolean(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.boolean) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.boolean,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodBoolean.create = (params) => {
  return new ZodBoolean({
    typeName: ZodFirstPartyTypeKind.ZodBoolean,
    coerce: params?.coerce || false,
    ...processCreateParams(params)
  });
};
var ZodDate = class _ZodDate extends ZodType {
  _parse(input) {
    if (this._def.coerce) {
      input.data = new Date(input.data);
    }
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.date) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.date,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    if (Number.isNaN(input.data.getTime())) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_date
      });
      return INVALID;
    }
    const status = new ParseStatus();
    let ctx = void 0;
    for (const check of this._def.checks) {
      if (check.kind === "min") {
        if (input.data.getTime() < check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_small,
            message: check.message,
            inclusive: true,
            exact: false,
            minimum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else if (check.kind === "max") {
        if (input.data.getTime() > check.value) {
          ctx = this._getOrReturnCtx(input, ctx);
          addIssueToContext(ctx, {
            code: ZodIssueCode.too_big,
            message: check.message,
            inclusive: true,
            exact: false,
            maximum: check.value,
            type: "date"
          });
          status.dirty();
        }
      } else {
        util.assertNever(check);
      }
    }
    return {
      status: status.value,
      value: new Date(input.data.getTime())
    };
  }
  _addCheck(check) {
    return new _ZodDate({
      ...this._def,
      checks: [...this._def.checks, check]
    });
  }
  min(minDate, message) {
    return this._addCheck({
      kind: "min",
      value: minDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  max(maxDate, message) {
    return this._addCheck({
      kind: "max",
      value: maxDate.getTime(),
      message: errorUtil.toString(message)
    });
  }
  get minDate() {
    let min = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "min") {
        if (min === null || ch.value > min)
          min = ch.value;
      }
    }
    return min != null ? new Date(min) : null;
  }
  get maxDate() {
    let max = null;
    for (const ch of this._def.checks) {
      if (ch.kind === "max") {
        if (max === null || ch.value < max)
          max = ch.value;
      }
    }
    return max != null ? new Date(max) : null;
  }
};
ZodDate.create = (params) => {
  return new ZodDate({
    checks: [],
    coerce: params?.coerce || false,
    typeName: ZodFirstPartyTypeKind.ZodDate,
    ...processCreateParams(params)
  });
};
var ZodSymbol = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.symbol) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.symbol,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodSymbol.create = (params) => {
  return new ZodSymbol({
    typeName: ZodFirstPartyTypeKind.ZodSymbol,
    ...processCreateParams(params)
  });
};
var ZodUndefined = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.undefined,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodUndefined.create = (params) => {
  return new ZodUndefined({
    typeName: ZodFirstPartyTypeKind.ZodUndefined,
    ...processCreateParams(params)
  });
};
var ZodNull = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.null) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.null,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodNull.create = (params) => {
  return new ZodNull({
    typeName: ZodFirstPartyTypeKind.ZodNull,
    ...processCreateParams(params)
  });
};
var ZodAny = class extends ZodType {
  constructor() {
    super(...arguments);
    this._any = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodAny.create = (params) => {
  return new ZodAny({
    typeName: ZodFirstPartyTypeKind.ZodAny,
    ...processCreateParams(params)
  });
};
var ZodUnknown = class extends ZodType {
  constructor() {
    super(...arguments);
    this._unknown = true;
  }
  _parse(input) {
    return OK(input.data);
  }
};
ZodUnknown.create = (params) => {
  return new ZodUnknown({
    typeName: ZodFirstPartyTypeKind.ZodUnknown,
    ...processCreateParams(params)
  });
};
var ZodNever = class extends ZodType {
  _parse(input) {
    const ctx = this._getOrReturnCtx(input);
    addIssueToContext(ctx, {
      code: ZodIssueCode.invalid_type,
      expected: ZodParsedType.never,
      received: ctx.parsedType
    });
    return INVALID;
  }
};
ZodNever.create = (params) => {
  return new ZodNever({
    typeName: ZodFirstPartyTypeKind.ZodNever,
    ...processCreateParams(params)
  });
};
var ZodVoid = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.undefined) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.void,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return OK(input.data);
  }
};
ZodVoid.create = (params) => {
  return new ZodVoid({
    typeName: ZodFirstPartyTypeKind.ZodVoid,
    ...processCreateParams(params)
  });
};
var ZodArray = class _ZodArray extends ZodType {
  _parse(input) {
    const { ctx, status } = this._processInputParams(input);
    const def = this._def;
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (def.exactLength !== null) {
      const tooBig = ctx.data.length > def.exactLength.value;
      const tooSmall = ctx.data.length < def.exactLength.value;
      if (tooBig || tooSmall) {
        addIssueToContext(ctx, {
          code: tooBig ? ZodIssueCode.too_big : ZodIssueCode.too_small,
          minimum: tooSmall ? def.exactLength.value : void 0,
          maximum: tooBig ? def.exactLength.value : void 0,
          type: "array",
          inclusive: true,
          exact: true,
          message: def.exactLength.message
        });
        status.dirty();
      }
    }
    if (def.minLength !== null) {
      if (ctx.data.length < def.minLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.minLength.message
        });
        status.dirty();
      }
    }
    if (def.maxLength !== null) {
      if (ctx.data.length > def.maxLength.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxLength.value,
          type: "array",
          inclusive: true,
          exact: false,
          message: def.maxLength.message
        });
        status.dirty();
      }
    }
    if (ctx.common.async) {
      return Promise.all([...ctx.data].map((item, i) => {
        return def.type._parseAsync(new ParseInputLazyPath(ctx, item, ctx.path, i));
      })).then((result2) => {
        return ParseStatus.mergeArray(status, result2);
      });
    }
    const result = [...ctx.data].map((item, i) => {
      return def.type._parseSync(new ParseInputLazyPath(ctx, item, ctx.path, i));
    });
    return ParseStatus.mergeArray(status, result);
  }
  get element() {
    return this._def.type;
  }
  min(minLength, message) {
    return new _ZodArray({
      ...this._def,
      minLength: { value: minLength, message: errorUtil.toString(message) }
    });
  }
  max(maxLength, message) {
    return new _ZodArray({
      ...this._def,
      maxLength: { value: maxLength, message: errorUtil.toString(message) }
    });
  }
  length(len, message) {
    return new _ZodArray({
      ...this._def,
      exactLength: { value: len, message: errorUtil.toString(message) }
    });
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodArray.create = (schema, params) => {
  return new ZodArray({
    type: schema,
    minLength: null,
    maxLength: null,
    exactLength: null,
    typeName: ZodFirstPartyTypeKind.ZodArray,
    ...processCreateParams(params)
  });
};
function deepPartialify(schema) {
  if (schema instanceof ZodObject) {
    const newShape = {};
    for (const key in schema.shape) {
      const fieldSchema = schema.shape[key];
      newShape[key] = ZodOptional.create(deepPartialify(fieldSchema));
    }
    return new ZodObject({
      ...schema._def,
      shape: () => newShape
    });
  } else if (schema instanceof ZodArray) {
    return new ZodArray({
      ...schema._def,
      type: deepPartialify(schema.element)
    });
  } else if (schema instanceof ZodOptional) {
    return ZodOptional.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodNullable) {
    return ZodNullable.create(deepPartialify(schema.unwrap()));
  } else if (schema instanceof ZodTuple) {
    return ZodTuple.create(schema.items.map((item) => deepPartialify(item)));
  } else {
    return schema;
  }
}
var ZodObject = class _ZodObject extends ZodType {
  constructor() {
    super(...arguments);
    this._cached = null;
    this.nonstrict = this.passthrough;
    this.augment = this.extend;
  }
  _getCached() {
    if (this._cached !== null)
      return this._cached;
    const shape = this._def.shape();
    const keys = util.objectKeys(shape);
    this._cached = { shape, keys };
    return this._cached;
  }
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.object) {
      const ctx2 = this._getOrReturnCtx(input);
      addIssueToContext(ctx2, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx2.parsedType
      });
      return INVALID;
    }
    const { status, ctx } = this._processInputParams(input);
    const { shape, keys: shapeKeys } = this._getCached();
    const extraKeys = [];
    if (!(this._def.catchall instanceof ZodNever && this._def.unknownKeys === "strip")) {
      for (const key in ctx.data) {
        if (!shapeKeys.includes(key)) {
          extraKeys.push(key);
        }
      }
    }
    const pairs = [];
    for (const key of shapeKeys) {
      const keyValidator = shape[key];
      const value = ctx.data[key];
      pairs.push({
        key: { status: "valid", value: key },
        value: keyValidator._parse(new ParseInputLazyPath(ctx, value, ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (this._def.catchall instanceof ZodNever) {
      const unknownKeys = this._def.unknownKeys;
      if (unknownKeys === "passthrough") {
        for (const key of extraKeys) {
          pairs.push({
            key: { status: "valid", value: key },
            value: { status: "valid", value: ctx.data[key] }
          });
        }
      } else if (unknownKeys === "strict") {
        if (extraKeys.length > 0) {
          addIssueToContext(ctx, {
            code: ZodIssueCode.unrecognized_keys,
            keys: extraKeys
          });
          status.dirty();
        }
      } else if (unknownKeys === "strip") {
      } else {
        throw new Error(`Internal ZodObject error: invalid unknownKeys value.`);
      }
    } else {
      const catchall = this._def.catchall;
      for (const key of extraKeys) {
        const value = ctx.data[key];
        pairs.push({
          key: { status: "valid", value: key },
          value: catchall._parse(
            new ParseInputLazyPath(ctx, value, ctx.path, key)
            //, ctx.child(key), value, getParsedType(value)
          ),
          alwaysSet: key in ctx.data
        });
      }
    }
    if (ctx.common.async) {
      return Promise.resolve().then(async () => {
        const syncPairs = [];
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          syncPairs.push({
            key,
            value,
            alwaysSet: pair.alwaysSet
          });
        }
        return syncPairs;
      }).then((syncPairs) => {
        return ParseStatus.mergeObjectSync(status, syncPairs);
      });
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get shape() {
    return this._def.shape();
  }
  strict(message) {
    errorUtil.errToObj;
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strict",
      ...message !== void 0 ? {
        errorMap: (issue, ctx) => {
          const defaultError = this._def.errorMap?.(issue, ctx).message ?? ctx.defaultError;
          if (issue.code === "unrecognized_keys")
            return {
              message: errorUtil.errToObj(message).message ?? defaultError
            };
          return {
            message: defaultError
          };
        }
      } : {}
    });
  }
  strip() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "strip"
    });
  }
  passthrough() {
    return new _ZodObject({
      ...this._def,
      unknownKeys: "passthrough"
    });
  }
  // const AugmentFactory =
  //   <Def extends ZodObjectDef>(def: Def) =>
  //   <Augmentation extends ZodRawShape>(
  //     augmentation: Augmentation
  //   ): ZodObject<
  //     extendShape<ReturnType<Def["shape"]>, Augmentation>,
  //     Def["unknownKeys"],
  //     Def["catchall"]
  //   > => {
  //     return new ZodObject({
  //       ...def,
  //       shape: () => ({
  //         ...def.shape(),
  //         ...augmentation,
  //       }),
  //     }) as any;
  //   };
  extend(augmentation) {
    return new _ZodObject({
      ...this._def,
      shape: () => ({
        ...this._def.shape(),
        ...augmentation
      })
    });
  }
  /**
   * Prior to zod@1.0.12 there was a bug in the
   * inferred type of merged objects. Please
   * upgrade if you are experiencing issues.
   */
  merge(merging) {
    const merged = new _ZodObject({
      unknownKeys: merging._def.unknownKeys,
      catchall: merging._def.catchall,
      shape: () => ({
        ...this._def.shape(),
        ...merging._def.shape()
      }),
      typeName: ZodFirstPartyTypeKind.ZodObject
    });
    return merged;
  }
  // merge<
  //   Incoming extends AnyZodObject,
  //   Augmentation extends Incoming["shape"],
  //   NewOutput extends {
  //     [k in keyof Augmentation | keyof Output]: k extends keyof Augmentation
  //       ? Augmentation[k]["_output"]
  //       : k extends keyof Output
  //       ? Output[k]
  //       : never;
  //   },
  //   NewInput extends {
  //     [k in keyof Augmentation | keyof Input]: k extends keyof Augmentation
  //       ? Augmentation[k]["_input"]
  //       : k extends keyof Input
  //       ? Input[k]
  //       : never;
  //   }
  // >(
  //   merging: Incoming
  // ): ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"],
  //   NewOutput,
  //   NewInput
  // > {
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  setKey(key, schema) {
    return this.augment({ [key]: schema });
  }
  // merge<Incoming extends AnyZodObject>(
  //   merging: Incoming
  // ): //ZodObject<T & Incoming["_shape"], UnknownKeys, Catchall> = (merging) => {
  // ZodObject<
  //   extendShape<T, ReturnType<Incoming["_def"]["shape"]>>,
  //   Incoming["_def"]["unknownKeys"],
  //   Incoming["_def"]["catchall"]
  // > {
  //   // const mergedShape = objectUtil.mergeShapes(
  //   //   this._def.shape(),
  //   //   merging._def.shape()
  //   // );
  //   const merged: any = new ZodObject({
  //     unknownKeys: merging._def.unknownKeys,
  //     catchall: merging._def.catchall,
  //     shape: () =>
  //       objectUtil.mergeShapes(this._def.shape(), merging._def.shape()),
  //     typeName: ZodFirstPartyTypeKind.ZodObject,
  //   }) as any;
  //   return merged;
  // }
  catchall(index) {
    return new _ZodObject({
      ...this._def,
      catchall: index
    });
  }
  pick(mask) {
    const shape = {};
    for (const key of util.objectKeys(mask)) {
      if (mask[key] && this.shape[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  omit(mask) {
    const shape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (!mask[key]) {
        shape[key] = this.shape[key];
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => shape
    });
  }
  /**
   * @deprecated
   */
  deepPartial() {
    return deepPartialify(this);
  }
  partial(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      const fieldSchema = this.shape[key];
      if (mask && !mask[key]) {
        newShape[key] = fieldSchema;
      } else {
        newShape[key] = fieldSchema.optional();
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  required(mask) {
    const newShape = {};
    for (const key of util.objectKeys(this.shape)) {
      if (mask && !mask[key]) {
        newShape[key] = this.shape[key];
      } else {
        const fieldSchema = this.shape[key];
        let newField = fieldSchema;
        while (newField instanceof ZodOptional) {
          newField = newField._def.innerType;
        }
        newShape[key] = newField;
      }
    }
    return new _ZodObject({
      ...this._def,
      shape: () => newShape
    });
  }
  keyof() {
    return createZodEnum(util.objectKeys(this.shape));
  }
};
ZodObject.create = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.strictCreate = (shape, params) => {
  return new ZodObject({
    shape: () => shape,
    unknownKeys: "strict",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
ZodObject.lazycreate = (shape, params) => {
  return new ZodObject({
    shape,
    unknownKeys: "strip",
    catchall: ZodNever.create(),
    typeName: ZodFirstPartyTypeKind.ZodObject,
    ...processCreateParams(params)
  });
};
var ZodUnion = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const options = this._def.options;
    function handleResults(results) {
      for (const result of results) {
        if (result.result.status === "valid") {
          return result.result;
        }
      }
      for (const result of results) {
        if (result.result.status === "dirty") {
          ctx.common.issues.push(...result.ctx.common.issues);
          return result.result;
        }
      }
      const unionErrors = results.map((result) => new ZodError(result.ctx.common.issues));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return Promise.all(options.map(async (option) => {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        return {
          result: await option._parseAsync({
            data: ctx.data,
            path: ctx.path,
            parent: childCtx
          }),
          ctx: childCtx
        };
      })).then(handleResults);
    } else {
      let dirty = void 0;
      const issues = [];
      for (const option of options) {
        const childCtx = {
          ...ctx,
          common: {
            ...ctx.common,
            issues: []
          },
          parent: null
        };
        const result = option._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: childCtx
        });
        if (result.status === "valid") {
          return result;
        } else if (result.status === "dirty" && !dirty) {
          dirty = { result, ctx: childCtx };
        }
        if (childCtx.common.issues.length) {
          issues.push(childCtx.common.issues);
        }
      }
      if (dirty) {
        ctx.common.issues.push(...dirty.ctx.common.issues);
        return dirty.result;
      }
      const unionErrors = issues.map((issues2) => new ZodError(issues2));
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union,
        unionErrors
      });
      return INVALID;
    }
  }
  get options() {
    return this._def.options;
  }
};
ZodUnion.create = (types, params) => {
  return new ZodUnion({
    options: types,
    typeName: ZodFirstPartyTypeKind.ZodUnion,
    ...processCreateParams(params)
  });
};
var getDiscriminator = (type) => {
  if (type instanceof ZodLazy) {
    return getDiscriminator(type.schema);
  } else if (type instanceof ZodEffects) {
    return getDiscriminator(type.innerType());
  } else if (type instanceof ZodLiteral) {
    return [type.value];
  } else if (type instanceof ZodEnum) {
    return type.options;
  } else if (type instanceof ZodNativeEnum) {
    return util.objectValues(type.enum);
  } else if (type instanceof ZodDefault) {
    return getDiscriminator(type._def.innerType);
  } else if (type instanceof ZodUndefined) {
    return [void 0];
  } else if (type instanceof ZodNull) {
    return [null];
  } else if (type instanceof ZodOptional) {
    return [void 0, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodNullable) {
    return [null, ...getDiscriminator(type.unwrap())];
  } else if (type instanceof ZodBranded) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodReadonly) {
    return getDiscriminator(type.unwrap());
  } else if (type instanceof ZodCatch) {
    return getDiscriminator(type._def.innerType);
  } else {
    return [];
  }
};
var ZodDiscriminatedUnion = class _ZodDiscriminatedUnion extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const discriminator = this.discriminator;
    const discriminatorValue = ctx.data[discriminator];
    const option = this.optionsMap.get(discriminatorValue);
    if (!option) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_union_discriminator,
        options: Array.from(this.optionsMap.keys()),
        path: [discriminator]
      });
      return INVALID;
    }
    if (ctx.common.async) {
      return option._parseAsync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    } else {
      return option._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
    }
  }
  get discriminator() {
    return this._def.discriminator;
  }
  get options() {
    return this._def.options;
  }
  get optionsMap() {
    return this._def.optionsMap;
  }
  /**
   * The constructor of the discriminated union schema. Its behaviour is very similar to that of the normal z.union() constructor.
   * However, it only allows a union of objects, all of which need to share a discriminator property. This property must
   * have a different value for each object in the union.
   * @param discriminator the name of the discriminator property
   * @param types an array of object schemas
   * @param params
   */
  static create(discriminator, options, params) {
    const optionsMap = /* @__PURE__ */ new Map();
    for (const type of options) {
      const discriminatorValues = getDiscriminator(type.shape[discriminator]);
      if (!discriminatorValues.length) {
        throw new Error(`A discriminator value for key \`${discriminator}\` could not be extracted from all schema options`);
      }
      for (const value of discriminatorValues) {
        if (optionsMap.has(value)) {
          throw new Error(`Discriminator property ${String(discriminator)} has duplicate value ${String(value)}`);
        }
        optionsMap.set(value, type);
      }
    }
    return new _ZodDiscriminatedUnion({
      typeName: ZodFirstPartyTypeKind.ZodDiscriminatedUnion,
      discriminator,
      options,
      optionsMap,
      ...processCreateParams(params)
    });
  }
};
function mergeValues(a, b) {
  const aType = getParsedType(a);
  const bType = getParsedType(b);
  if (a === b) {
    return { valid: true, data: a };
  } else if (aType === ZodParsedType.object && bType === ZodParsedType.object) {
    const bKeys = util.objectKeys(b);
    const sharedKeys = util.objectKeys(a).filter((key) => bKeys.indexOf(key) !== -1);
    const newObj = { ...a, ...b };
    for (const key of sharedKeys) {
      const sharedValue = mergeValues(a[key], b[key]);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newObj[key] = sharedValue.data;
    }
    return { valid: true, data: newObj };
  } else if (aType === ZodParsedType.array && bType === ZodParsedType.array) {
    if (a.length !== b.length) {
      return { valid: false };
    }
    const newArray = [];
    for (let index = 0; index < a.length; index++) {
      const itemA = a[index];
      const itemB = b[index];
      const sharedValue = mergeValues(itemA, itemB);
      if (!sharedValue.valid) {
        return { valid: false };
      }
      newArray.push(sharedValue.data);
    }
    return { valid: true, data: newArray };
  } else if (aType === ZodParsedType.date && bType === ZodParsedType.date && +a === +b) {
    return { valid: true, data: a };
  } else {
    return { valid: false };
  }
}
var ZodIntersection = class extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const handleParsed = (parsedLeft, parsedRight) => {
      if (isAborted(parsedLeft) || isAborted(parsedRight)) {
        return INVALID;
      }
      const merged = mergeValues(parsedLeft.value, parsedRight.value);
      if (!merged.valid) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.invalid_intersection_types
        });
        return INVALID;
      }
      if (isDirty(parsedLeft) || isDirty(parsedRight)) {
        status.dirty();
      }
      return { status: status.value, value: merged.data };
    };
    if (ctx.common.async) {
      return Promise.all([
        this._def.left._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        }),
        this._def.right._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        })
      ]).then(([left, right]) => handleParsed(left, right));
    } else {
      return handleParsed(this._def.left._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }), this._def.right._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      }));
    }
  }
};
ZodIntersection.create = (left, right, params) => {
  return new ZodIntersection({
    left,
    right,
    typeName: ZodFirstPartyTypeKind.ZodIntersection,
    ...processCreateParams(params)
  });
};
var ZodTuple = class _ZodTuple extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.array) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.array,
        received: ctx.parsedType
      });
      return INVALID;
    }
    if (ctx.data.length < this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_small,
        minimum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      return INVALID;
    }
    const rest = this._def.rest;
    if (!rest && ctx.data.length > this._def.items.length) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.too_big,
        maximum: this._def.items.length,
        inclusive: true,
        exact: false,
        type: "array"
      });
      status.dirty();
    }
    const items = [...ctx.data].map((item, itemIndex) => {
      const schema = this._def.items[itemIndex] || this._def.rest;
      if (!schema)
        return null;
      return schema._parse(new ParseInputLazyPath(ctx, item, ctx.path, itemIndex));
    }).filter((x) => !!x);
    if (ctx.common.async) {
      return Promise.all(items).then((results) => {
        return ParseStatus.mergeArray(status, results);
      });
    } else {
      return ParseStatus.mergeArray(status, items);
    }
  }
  get items() {
    return this._def.items;
  }
  rest(rest) {
    return new _ZodTuple({
      ...this._def,
      rest
    });
  }
};
ZodTuple.create = (schemas, params) => {
  if (!Array.isArray(schemas)) {
    throw new Error("You must pass an array of schemas to z.tuple([ ... ])");
  }
  return new ZodTuple({
    items: schemas,
    typeName: ZodFirstPartyTypeKind.ZodTuple,
    rest: null,
    ...processCreateParams(params)
  });
};
var ZodRecord = class _ZodRecord extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.object) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.object,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const pairs = [];
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    for (const key in ctx.data) {
      pairs.push({
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, key)),
        value: valueType._parse(new ParseInputLazyPath(ctx, ctx.data[key], ctx.path, key)),
        alwaysSet: key in ctx.data
      });
    }
    if (ctx.common.async) {
      return ParseStatus.mergeObjectAsync(status, pairs);
    } else {
      return ParseStatus.mergeObjectSync(status, pairs);
    }
  }
  get element() {
    return this._def.valueType;
  }
  static create(first, second, third) {
    if (second instanceof ZodType) {
      return new _ZodRecord({
        keyType: first,
        valueType: second,
        typeName: ZodFirstPartyTypeKind.ZodRecord,
        ...processCreateParams(third)
      });
    }
    return new _ZodRecord({
      keyType: ZodString.create(),
      valueType: first,
      typeName: ZodFirstPartyTypeKind.ZodRecord,
      ...processCreateParams(second)
    });
  }
};
var ZodMap = class extends ZodType {
  get keySchema() {
    return this._def.keyType;
  }
  get valueSchema() {
    return this._def.valueType;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.map) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.map,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const keyType = this._def.keyType;
    const valueType = this._def.valueType;
    const pairs = [...ctx.data.entries()].map(([key, value], index) => {
      return {
        key: keyType._parse(new ParseInputLazyPath(ctx, key, ctx.path, [index, "key"])),
        value: valueType._parse(new ParseInputLazyPath(ctx, value, ctx.path, [index, "value"]))
      };
    });
    if (ctx.common.async) {
      const finalMap = /* @__PURE__ */ new Map();
      return Promise.resolve().then(async () => {
        for (const pair of pairs) {
          const key = await pair.key;
          const value = await pair.value;
          if (key.status === "aborted" || value.status === "aborted") {
            return INVALID;
          }
          if (key.status === "dirty" || value.status === "dirty") {
            status.dirty();
          }
          finalMap.set(key.value, value.value);
        }
        return { status: status.value, value: finalMap };
      });
    } else {
      const finalMap = /* @__PURE__ */ new Map();
      for (const pair of pairs) {
        const key = pair.key;
        const value = pair.value;
        if (key.status === "aborted" || value.status === "aborted") {
          return INVALID;
        }
        if (key.status === "dirty" || value.status === "dirty") {
          status.dirty();
        }
        finalMap.set(key.value, value.value);
      }
      return { status: status.value, value: finalMap };
    }
  }
};
ZodMap.create = (keyType, valueType, params) => {
  return new ZodMap({
    valueType,
    keyType,
    typeName: ZodFirstPartyTypeKind.ZodMap,
    ...processCreateParams(params)
  });
};
var ZodSet = class _ZodSet extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.set) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.set,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const def = this._def;
    if (def.minSize !== null) {
      if (ctx.data.size < def.minSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_small,
          minimum: def.minSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.minSize.message
        });
        status.dirty();
      }
    }
    if (def.maxSize !== null) {
      if (ctx.data.size > def.maxSize.value) {
        addIssueToContext(ctx, {
          code: ZodIssueCode.too_big,
          maximum: def.maxSize.value,
          type: "set",
          inclusive: true,
          exact: false,
          message: def.maxSize.message
        });
        status.dirty();
      }
    }
    const valueType = this._def.valueType;
    function finalizeSet(elements2) {
      const parsedSet = /* @__PURE__ */ new Set();
      for (const element of elements2) {
        if (element.status === "aborted")
          return INVALID;
        if (element.status === "dirty")
          status.dirty();
        parsedSet.add(element.value);
      }
      return { status: status.value, value: parsedSet };
    }
    const elements = [...ctx.data.values()].map((item, i) => valueType._parse(new ParseInputLazyPath(ctx, item, ctx.path, i)));
    if (ctx.common.async) {
      return Promise.all(elements).then((elements2) => finalizeSet(elements2));
    } else {
      return finalizeSet(elements);
    }
  }
  min(minSize, message) {
    return new _ZodSet({
      ...this._def,
      minSize: { value: minSize, message: errorUtil.toString(message) }
    });
  }
  max(maxSize, message) {
    return new _ZodSet({
      ...this._def,
      maxSize: { value: maxSize, message: errorUtil.toString(message) }
    });
  }
  size(size, message) {
    return this.min(size, message).max(size, message);
  }
  nonempty(message) {
    return this.min(1, message);
  }
};
ZodSet.create = (valueType, params) => {
  return new ZodSet({
    valueType,
    minSize: null,
    maxSize: null,
    typeName: ZodFirstPartyTypeKind.ZodSet,
    ...processCreateParams(params)
  });
};
var ZodFunction = class _ZodFunction extends ZodType {
  constructor() {
    super(...arguments);
    this.validate = this.implement;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.function) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.function,
        received: ctx.parsedType
      });
      return INVALID;
    }
    function makeArgsIssue(args, error) {
      return makeIssue({
        data: args,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_arguments,
          argumentsError: error
        }
      });
    }
    function makeReturnsIssue(returns, error) {
      return makeIssue({
        data: returns,
        path: ctx.path,
        errorMaps: [ctx.common.contextualErrorMap, ctx.schemaErrorMap, getErrorMap(), en_default].filter((x) => !!x),
        issueData: {
          code: ZodIssueCode.invalid_return_type,
          returnTypeError: error
        }
      });
    }
    const params = { errorMap: ctx.common.contextualErrorMap };
    const fn = ctx.data;
    if (this._def.returns instanceof ZodPromise) {
      const me = this;
      return OK(async function(...args) {
        const error = new ZodError([]);
        const parsedArgs = await me._def.args.parseAsync(args, params).catch((e) => {
          error.addIssue(makeArgsIssue(args, e));
          throw error;
        });
        const result = await Reflect.apply(fn, this, parsedArgs);
        const parsedReturns = await me._def.returns._def.type.parseAsync(result, params).catch((e) => {
          error.addIssue(makeReturnsIssue(result, e));
          throw error;
        });
        return parsedReturns;
      });
    } else {
      const me = this;
      return OK(function(...args) {
        const parsedArgs = me._def.args.safeParse(args, params);
        if (!parsedArgs.success) {
          throw new ZodError([makeArgsIssue(args, parsedArgs.error)]);
        }
        const result = Reflect.apply(fn, this, parsedArgs.data);
        const parsedReturns = me._def.returns.safeParse(result, params);
        if (!parsedReturns.success) {
          throw new ZodError([makeReturnsIssue(result, parsedReturns.error)]);
        }
        return parsedReturns.data;
      });
    }
  }
  parameters() {
    return this._def.args;
  }
  returnType() {
    return this._def.returns;
  }
  args(...items) {
    return new _ZodFunction({
      ...this._def,
      args: ZodTuple.create(items).rest(ZodUnknown.create())
    });
  }
  returns(returnType) {
    return new _ZodFunction({
      ...this._def,
      returns: returnType
    });
  }
  implement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  strictImplement(func) {
    const validatedFunc = this.parse(func);
    return validatedFunc;
  }
  static create(args, returns, params) {
    return new _ZodFunction({
      args: args ? args : ZodTuple.create([]).rest(ZodUnknown.create()),
      returns: returns || ZodUnknown.create(),
      typeName: ZodFirstPartyTypeKind.ZodFunction,
      ...processCreateParams(params)
    });
  }
};
var ZodLazy = class extends ZodType {
  get schema() {
    return this._def.getter();
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const lazySchema = this._def.getter();
    return lazySchema._parse({ data: ctx.data, path: ctx.path, parent: ctx });
  }
};
ZodLazy.create = (getter, params) => {
  return new ZodLazy({
    getter,
    typeName: ZodFirstPartyTypeKind.ZodLazy,
    ...processCreateParams(params)
  });
};
var ZodLiteral = class extends ZodType {
  _parse(input) {
    if (input.data !== this._def.value) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_literal,
        expected: this._def.value
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
  get value() {
    return this._def.value;
  }
};
ZodLiteral.create = (value, params) => {
  return new ZodLiteral({
    value,
    typeName: ZodFirstPartyTypeKind.ZodLiteral,
    ...processCreateParams(params)
  });
};
function createZodEnum(values, params) {
  return new ZodEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodEnum,
    ...processCreateParams(params)
  });
}
var ZodEnum = class _ZodEnum extends ZodType {
  _parse(input) {
    if (typeof input.data !== "string") {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(this._def.values);
    }
    if (!this._cache.has(input.data)) {
      const ctx = this._getOrReturnCtx(input);
      const expectedValues = this._def.values;
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get options() {
    return this._def.values;
  }
  get enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Values() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  get Enum() {
    const enumValues = {};
    for (const val of this._def.values) {
      enumValues[val] = val;
    }
    return enumValues;
  }
  extract(values, newDef = this._def) {
    return _ZodEnum.create(values, {
      ...this._def,
      ...newDef
    });
  }
  exclude(values, newDef = this._def) {
    return _ZodEnum.create(this.options.filter((opt) => !values.includes(opt)), {
      ...this._def,
      ...newDef
    });
  }
};
ZodEnum.create = createZodEnum;
var ZodNativeEnum = class extends ZodType {
  _parse(input) {
    const nativeEnumValues = util.getValidEnumValues(this._def.values);
    const ctx = this._getOrReturnCtx(input);
    if (ctx.parsedType !== ZodParsedType.string && ctx.parsedType !== ZodParsedType.number) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        expected: util.joinValues(expectedValues),
        received: ctx.parsedType,
        code: ZodIssueCode.invalid_type
      });
      return INVALID;
    }
    if (!this._cache) {
      this._cache = new Set(util.getValidEnumValues(this._def.values));
    }
    if (!this._cache.has(input.data)) {
      const expectedValues = util.objectValues(nativeEnumValues);
      addIssueToContext(ctx, {
        received: ctx.data,
        code: ZodIssueCode.invalid_enum_value,
        options: expectedValues
      });
      return INVALID;
    }
    return OK(input.data);
  }
  get enum() {
    return this._def.values;
  }
};
ZodNativeEnum.create = (values, params) => {
  return new ZodNativeEnum({
    values,
    typeName: ZodFirstPartyTypeKind.ZodNativeEnum,
    ...processCreateParams(params)
  });
};
var ZodPromise = class extends ZodType {
  unwrap() {
    return this._def.type;
  }
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    if (ctx.parsedType !== ZodParsedType.promise && ctx.common.async === false) {
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.promise,
        received: ctx.parsedType
      });
      return INVALID;
    }
    const promisified = ctx.parsedType === ZodParsedType.promise ? ctx.data : Promise.resolve(ctx.data);
    return OK(promisified.then((data) => {
      return this._def.type.parseAsync(data, {
        path: ctx.path,
        errorMap: ctx.common.contextualErrorMap
      });
    }));
  }
};
ZodPromise.create = (schema, params) => {
  return new ZodPromise({
    type: schema,
    typeName: ZodFirstPartyTypeKind.ZodPromise,
    ...processCreateParams(params)
  });
};
var ZodEffects = class extends ZodType {
  innerType() {
    return this._def.schema;
  }
  sourceType() {
    return this._def.schema._def.typeName === ZodFirstPartyTypeKind.ZodEffects ? this._def.schema.sourceType() : this._def.schema;
  }
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    const effect = this._def.effect || null;
    const checkCtx = {
      addIssue: (arg) => {
        addIssueToContext(ctx, arg);
        if (arg.fatal) {
          status.abort();
        } else {
          status.dirty();
        }
      },
      get path() {
        return ctx.path;
      }
    };
    checkCtx.addIssue = checkCtx.addIssue.bind(checkCtx);
    if (effect.type === "preprocess") {
      const processed = effect.transform(ctx.data, checkCtx);
      if (ctx.common.async) {
        return Promise.resolve(processed).then(async (processed2) => {
          if (status.value === "aborted")
            return INVALID;
          const result = await this._def.schema._parseAsync({
            data: processed2,
            path: ctx.path,
            parent: ctx
          });
          if (result.status === "aborted")
            return INVALID;
          if (result.status === "dirty")
            return DIRTY(result.value);
          if (status.value === "dirty")
            return DIRTY(result.value);
          return result;
        });
      } else {
        if (status.value === "aborted")
          return INVALID;
        const result = this._def.schema._parseSync({
          data: processed,
          path: ctx.path,
          parent: ctx
        });
        if (result.status === "aborted")
          return INVALID;
        if (result.status === "dirty")
          return DIRTY(result.value);
        if (status.value === "dirty")
          return DIRTY(result.value);
        return result;
      }
    }
    if (effect.type === "refinement") {
      const executeRefinement = (acc) => {
        const result = effect.refinement(acc, checkCtx);
        if (ctx.common.async) {
          return Promise.resolve(result);
        }
        if (result instanceof Promise) {
          throw new Error("Async refinement encountered during synchronous parse operation. Use .parseAsync instead.");
        }
        return acc;
      };
      if (ctx.common.async === false) {
        const inner = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inner.status === "aborted")
          return INVALID;
        if (inner.status === "dirty")
          status.dirty();
        executeRefinement(inner.value);
        return { status: status.value, value: inner.value };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((inner) => {
          if (inner.status === "aborted")
            return INVALID;
          if (inner.status === "dirty")
            status.dirty();
          return executeRefinement(inner.value).then(() => {
            return { status: status.value, value: inner.value };
          });
        });
      }
    }
    if (effect.type === "transform") {
      if (ctx.common.async === false) {
        const base = this._def.schema._parseSync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (!isValid(base))
          return INVALID;
        const result = effect.transform(base.value, checkCtx);
        if (result instanceof Promise) {
          throw new Error(`Asynchronous transform encountered during synchronous parse operation. Use .parseAsync instead.`);
        }
        return { status: status.value, value: result };
      } else {
        return this._def.schema._parseAsync({ data: ctx.data, path: ctx.path, parent: ctx }).then((base) => {
          if (!isValid(base))
            return INVALID;
          return Promise.resolve(effect.transform(base.value, checkCtx)).then((result) => ({
            status: status.value,
            value: result
          }));
        });
      }
    }
    util.assertNever(effect);
  }
};
ZodEffects.create = (schema, effect, params) => {
  return new ZodEffects({
    schema,
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    effect,
    ...processCreateParams(params)
  });
};
ZodEffects.createWithPreprocess = (preprocess, schema, params) => {
  return new ZodEffects({
    schema,
    effect: { type: "preprocess", transform: preprocess },
    typeName: ZodFirstPartyTypeKind.ZodEffects,
    ...processCreateParams(params)
  });
};
var ZodOptional = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.undefined) {
      return OK(void 0);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodOptional.create = (type, params) => {
  return new ZodOptional({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodOptional,
    ...processCreateParams(params)
  });
};
var ZodNullable = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType === ZodParsedType.null) {
      return OK(null);
    }
    return this._def.innerType._parse(input);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodNullable.create = (type, params) => {
  return new ZodNullable({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodNullable,
    ...processCreateParams(params)
  });
};
var ZodDefault = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    let data = ctx.data;
    if (ctx.parsedType === ZodParsedType.undefined) {
      data = this._def.defaultValue();
    }
    return this._def.innerType._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  removeDefault() {
    return this._def.innerType;
  }
};
ZodDefault.create = (type, params) => {
  return new ZodDefault({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodDefault,
    defaultValue: typeof params.default === "function" ? params.default : () => params.default,
    ...processCreateParams(params)
  });
};
var ZodCatch = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const newCtx = {
      ...ctx,
      common: {
        ...ctx.common,
        issues: []
      }
    };
    const result = this._def.innerType._parse({
      data: newCtx.data,
      path: newCtx.path,
      parent: {
        ...newCtx
      }
    });
    if (isAsync(result)) {
      return result.then((result2) => {
        return {
          status: "valid",
          value: result2.status === "valid" ? result2.value : this._def.catchValue({
            get error() {
              return new ZodError(newCtx.common.issues);
            },
            input: newCtx.data
          })
        };
      });
    } else {
      return {
        status: "valid",
        value: result.status === "valid" ? result.value : this._def.catchValue({
          get error() {
            return new ZodError(newCtx.common.issues);
          },
          input: newCtx.data
        })
      };
    }
  }
  removeCatch() {
    return this._def.innerType;
  }
};
ZodCatch.create = (type, params) => {
  return new ZodCatch({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodCatch,
    catchValue: typeof params.catch === "function" ? params.catch : () => params.catch,
    ...processCreateParams(params)
  });
};
var ZodNaN = class extends ZodType {
  _parse(input) {
    const parsedType = this._getType(input);
    if (parsedType !== ZodParsedType.nan) {
      const ctx = this._getOrReturnCtx(input);
      addIssueToContext(ctx, {
        code: ZodIssueCode.invalid_type,
        expected: ZodParsedType.nan,
        received: ctx.parsedType
      });
      return INVALID;
    }
    return { status: "valid", value: input.data };
  }
};
ZodNaN.create = (params) => {
  return new ZodNaN({
    typeName: ZodFirstPartyTypeKind.ZodNaN,
    ...processCreateParams(params)
  });
};
var BRAND = Symbol("zod_brand");
var ZodBranded = class extends ZodType {
  _parse(input) {
    const { ctx } = this._processInputParams(input);
    const data = ctx.data;
    return this._def.type._parse({
      data,
      path: ctx.path,
      parent: ctx
    });
  }
  unwrap() {
    return this._def.type;
  }
};
var ZodPipeline = class _ZodPipeline extends ZodType {
  _parse(input) {
    const { status, ctx } = this._processInputParams(input);
    if (ctx.common.async) {
      const handleAsync = async () => {
        const inResult = await this._def.in._parseAsync({
          data: ctx.data,
          path: ctx.path,
          parent: ctx
        });
        if (inResult.status === "aborted")
          return INVALID;
        if (inResult.status === "dirty") {
          status.dirty();
          return DIRTY(inResult.value);
        } else {
          return this._def.out._parseAsync({
            data: inResult.value,
            path: ctx.path,
            parent: ctx
          });
        }
      };
      return handleAsync();
    } else {
      const inResult = this._def.in._parseSync({
        data: ctx.data,
        path: ctx.path,
        parent: ctx
      });
      if (inResult.status === "aborted")
        return INVALID;
      if (inResult.status === "dirty") {
        status.dirty();
        return {
          status: "dirty",
          value: inResult.value
        };
      } else {
        return this._def.out._parseSync({
          data: inResult.value,
          path: ctx.path,
          parent: ctx
        });
      }
    }
  }
  static create(a, b) {
    return new _ZodPipeline({
      in: a,
      out: b,
      typeName: ZodFirstPartyTypeKind.ZodPipeline
    });
  }
};
var ZodReadonly = class extends ZodType {
  _parse(input) {
    const result = this._def.innerType._parse(input);
    const freeze = (data) => {
      if (isValid(data)) {
        data.value = Object.freeze(data.value);
      }
      return data;
    };
    return isAsync(result) ? result.then((data) => freeze(data)) : freeze(result);
  }
  unwrap() {
    return this._def.innerType;
  }
};
ZodReadonly.create = (type, params) => {
  return new ZodReadonly({
    innerType: type,
    typeName: ZodFirstPartyTypeKind.ZodReadonly,
    ...processCreateParams(params)
  });
};
function cleanParams(params, data) {
  const p = typeof params === "function" ? params(data) : typeof params === "string" ? { message: params } : params;
  const p2 = typeof p === "string" ? { message: p } : p;
  return p2;
}
function custom(check, _params = {}, fatal) {
  if (check)
    return ZodAny.create().superRefine((data, ctx) => {
      const r = check(data);
      if (r instanceof Promise) {
        return r.then((r2) => {
          if (!r2) {
            const params = cleanParams(_params, data);
            const _fatal = params.fatal ?? fatal ?? true;
            ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
          }
        });
      }
      if (!r) {
        const params = cleanParams(_params, data);
        const _fatal = params.fatal ?? fatal ?? true;
        ctx.addIssue({ code: "custom", ...params, fatal: _fatal });
      }
      return;
    });
  return ZodAny.create();
}
var late = {
  object: ZodObject.lazycreate
};
var ZodFirstPartyTypeKind;
(function(ZodFirstPartyTypeKind2) {
  ZodFirstPartyTypeKind2["ZodString"] = "ZodString";
  ZodFirstPartyTypeKind2["ZodNumber"] = "ZodNumber";
  ZodFirstPartyTypeKind2["ZodNaN"] = "ZodNaN";
  ZodFirstPartyTypeKind2["ZodBigInt"] = "ZodBigInt";
  ZodFirstPartyTypeKind2["ZodBoolean"] = "ZodBoolean";
  ZodFirstPartyTypeKind2["ZodDate"] = "ZodDate";
  ZodFirstPartyTypeKind2["ZodSymbol"] = "ZodSymbol";
  ZodFirstPartyTypeKind2["ZodUndefined"] = "ZodUndefined";
  ZodFirstPartyTypeKind2["ZodNull"] = "ZodNull";
  ZodFirstPartyTypeKind2["ZodAny"] = "ZodAny";
  ZodFirstPartyTypeKind2["ZodUnknown"] = "ZodUnknown";
  ZodFirstPartyTypeKind2["ZodNever"] = "ZodNever";
  ZodFirstPartyTypeKind2["ZodVoid"] = "ZodVoid";
  ZodFirstPartyTypeKind2["ZodArray"] = "ZodArray";
  ZodFirstPartyTypeKind2["ZodObject"] = "ZodObject";
  ZodFirstPartyTypeKind2["ZodUnion"] = "ZodUnion";
  ZodFirstPartyTypeKind2["ZodDiscriminatedUnion"] = "ZodDiscriminatedUnion";
  ZodFirstPartyTypeKind2["ZodIntersection"] = "ZodIntersection";
  ZodFirstPartyTypeKind2["ZodTuple"] = "ZodTuple";
  ZodFirstPartyTypeKind2["ZodRecord"] = "ZodRecord";
  ZodFirstPartyTypeKind2["ZodMap"] = "ZodMap";
  ZodFirstPartyTypeKind2["ZodSet"] = "ZodSet";
  ZodFirstPartyTypeKind2["ZodFunction"] = "ZodFunction";
  ZodFirstPartyTypeKind2["ZodLazy"] = "ZodLazy";
  ZodFirstPartyTypeKind2["ZodLiteral"] = "ZodLiteral";
  ZodFirstPartyTypeKind2["ZodEnum"] = "ZodEnum";
  ZodFirstPartyTypeKind2["ZodEffects"] = "ZodEffects";
  ZodFirstPartyTypeKind2["ZodNativeEnum"] = "ZodNativeEnum";
  ZodFirstPartyTypeKind2["ZodOptional"] = "ZodOptional";
  ZodFirstPartyTypeKind2["ZodNullable"] = "ZodNullable";
  ZodFirstPartyTypeKind2["ZodDefault"] = "ZodDefault";
  ZodFirstPartyTypeKind2["ZodCatch"] = "ZodCatch";
  ZodFirstPartyTypeKind2["ZodPromise"] = "ZodPromise";
  ZodFirstPartyTypeKind2["ZodBranded"] = "ZodBranded";
  ZodFirstPartyTypeKind2["ZodPipeline"] = "ZodPipeline";
  ZodFirstPartyTypeKind2["ZodReadonly"] = "ZodReadonly";
})(ZodFirstPartyTypeKind || (ZodFirstPartyTypeKind = {}));
var instanceOfType = (cls, params = {
  message: `Input not instance of ${cls.name}`
}) => custom((data) => data instanceof cls, params);
var stringType = ZodString.create;
var numberType = ZodNumber.create;
var nanType = ZodNaN.create;
var bigIntType = ZodBigInt.create;
var booleanType = ZodBoolean.create;
var dateType = ZodDate.create;
var symbolType = ZodSymbol.create;
var undefinedType = ZodUndefined.create;
var nullType = ZodNull.create;
var anyType = ZodAny.create;
var unknownType = ZodUnknown.create;
var neverType = ZodNever.create;
var voidType = ZodVoid.create;
var arrayType = ZodArray.create;
var objectType = ZodObject.create;
var strictObjectType = ZodObject.strictCreate;
var unionType = ZodUnion.create;
var discriminatedUnionType = ZodDiscriminatedUnion.create;
var intersectionType = ZodIntersection.create;
var tupleType = ZodTuple.create;
var recordType = ZodRecord.create;
var mapType = ZodMap.create;
var setType = ZodSet.create;
var functionType = ZodFunction.create;
var lazyType = ZodLazy.create;
var literalType = ZodLiteral.create;
var enumType = ZodEnum.create;
var nativeEnumType = ZodNativeEnum.create;
var promiseType = ZodPromise.create;
var effectsType = ZodEffects.create;
var optionalType = ZodOptional.create;
var nullableType = ZodNullable.create;
var preprocessType = ZodEffects.createWithPreprocess;
var pipelineType = ZodPipeline.create;
var ostring = () => stringType().optional();
var onumber = () => numberType().optional();
var oboolean = () => booleanType().optional();
var coerce = {
  string: ((arg) => ZodString.create({ ...arg, coerce: true })),
  number: ((arg) => ZodNumber.create({ ...arg, coerce: true })),
  boolean: ((arg) => ZodBoolean.create({
    ...arg,
    coerce: true
  })),
  bigint: ((arg) => ZodBigInt.create({ ...arg, coerce: true })),
  date: ((arg) => ZodDate.create({ ...arg, coerce: true }))
};
var NEVER = INVALID;

// lib/types.ts
var EducationSchema = external_exports.object({
  school: external_exports.string().default(""),
  status: external_exports.string().default(""),
  // 졸업, 수료, 중퇴 등
  major: external_exports.string().default(""),
  start: external_exports.string().default(""),
  // YYYY-MM
  end: external_exports.string().default("")
}).strict();
var MilitarySchema = external_exports.object({
  branch: external_exports.string().default(""),
  // 군별 (육군)
  corps: external_exports.string().default(""),
  // 병과 (수색대)
  rank: external_exports.string().default(""),
  // 계급
  start: external_exports.string().default(""),
  end: external_exports.string().default(""),
  discharge: external_exports.string().default("")
  // 전역구분 (만기제대)
}).strict();
var LicenseSchema = external_exports.object({
  name: external_exports.string().default(""),
  issuer: external_exports.string().default(""),
  date: external_exports.string().default("")
  // YYYY 또는 YYYY-MM 또는 YYYY-MM-DD
}).strict();
var CareerSchema = external_exports.object({
  start: external_exports.string().default(""),
  end: external_exports.string().default(""),
  company: external_exports.string().default(""),
  duties: external_exports.string().default("")
}).strict();
var ProfileSchema = external_exports.object({
  name: external_exports.string().default(""),
  birth: external_exports.string().default(""),
  // YYYY-MM-DD (생년월일까지만 저장)
  phone: external_exports.string().default(""),
  email: external_exports.string().default(""),
  address: external_exports.string().default(""),
  education: external_exports.array(EducationSchema).default([]),
  military: MilitarySchema.default({}),
  licenses: external_exports.array(LicenseSchema).default([]),
  careers: external_exports.array(CareerSchema).default([])
}).strict();
var BARRIERS = ["none", "low", "medium", "high"];
var QualificationSchema = external_exports.object({
  id: external_exports.number().int().optional(),
  key: external_exports.string().nullable().default(null),
  // 내부 역할 키 (예: apt_exp = 아파트 근무 경력)
  name: external_exports.string().min(1),
  aliases: external_exports.array(external_exports.string()).default([]),
  have: external_exports.boolean().default(false),
  barrier: external_exports.enum(BARRIERS).default("none"),
  promisable: external_exports.boolean().default(false),
  promise_phrase: external_exports.string().default(""),
  hint: external_exports.string().default("")
}).strict();
var SettingsSchema = external_exports.object({
  near_keywords: external_exports.array(external_exports.string()).default(["\uBD81\uAD6C", "\uCE60\uACE1", "\uCE68\uC0B0", "\uAD6C\uC554", "\uAD00\uC74C", "\uAD6D\uC6B0", "\uB3C4\uB0A8"]),
  mail_signature: external_exports.string().default("{name} \uB4DC\uB9BC\n{phone}")
}).strict();
var BLOCK_KEYS = [
  "growth",
  "strength_s1",
  "strength_s2",
  "strength_s3_gyeogil",
  "strength_s3_gyodae",
  "strength_s3_default",
  "strength_s4",
  "experience",
  "experience_no_apt_prefix",
  "motive_m1",
  "motive_m2",
  "motive_m3",
  "motive_m3_start",
  "goal_g1",
  "goal_gap_default",
  "goal_gap_suffix",
  "goal_g2",
  "resume_intro_1",
  "resume_intro_2",
  "resume_intro_3",
  "mail_body"
];
var BlocksSchema = external_exports.object(
  Object.fromEntries(BLOCK_KEYS.map((k) => [k, external_exports.string()]))
).strict();

// artifact/src/criteria.ts
var DEFAULT_CRITERIA = {
  goal: "\uB300\uAD6C \uBD81\uAD6C \uCE60\uACE1(\uD0DC\uC804\uC5ED) \uC9D1\uC5D0\uC11C \uB300\uC911\uAD50\uD1B5\uC73C\uB85C \uC624\uAC00\uAE30 \uC26C\uC6B4 \uC544\uD30C\uD2B8\xB7\uAC74\uBB3C \uC2DC\uC124\uAD00\uB9AC\uC9C1\uC5D0 \uC9C0\uC6D0\uD574, \uC624\uB798 \uB2E4\uB2D0 \uC218 \uC788\uB294 \uC790\uB9AC\uB97C \uAD6C\uD569\uB2C8\uB2E4.",
  roles_include: ["\uC2DC\uC124\uC8FC\uC784", "\uC2DC\uC124\uAD00\uB9AC", "\uAE30\uC804", "\uC601\uC120", "\uAD00\uB9AC\uC8FC\uC784", "\uC2DC\uC124\uAE30\uC0AC", "\uC124\uBE44", "\uC804\uAE30", "\uC544\uD30C\uD2B8"],
  roles_exclude: ["\uC0AC\uBB34", "\uCCAD\uC18C", "\uBBF8\uD654", "\uC601\uC5C5", "\uC124\uACC4", "\uC0DD\uC0B0", "\uC624\uD37C\uB808\uC774\uD130", "\uACBD\uBE44", "\uC694\uC591"],
  commute_limit: 30,
  commute_max: 35,
  shifts: [],
  salary_min_man: null,
  email_only: false,
  hide_unqualified: true,
  hide_applied: true,
  notes: [
    '\uACF5\uACE0\uAC00 "\uD544\uC218 \uAE30\uC7AC"\uB97C \uC694\uAD6C\uD558\uBA74 \uBA54\uC77C \uC81C\uBAA9\uACFC \uC774\uB825\uC11C \uB9E8 \uC704\uC5D0 \uAE00\uC790 \uADF8\uB300\uB85C \uB123\uB294\uB2E4.',
    '\uACBD\uB825\xB7\uC790\uACA9\uC740 \uC0AC\uC2E4\uB9CC \uC4F4\uB2E4. \uC18C\uBC29\uC548\uC804\uAD00\uB9AC\uC790 \uBCF4\uC870\uCC98\uB7FC \uACE7 \uB538 \uC218 \uC788\uB294 \uC790\uACA9\uB9CC "\uCDE8\uB4DD \uC608\uC815"\uC73C\uB85C \uC801\uB294\uB2E4.',
    "\uB4F1\uBCF8\xB7\uD1B5\uC7A5 \uC0AC\uBCF8\uC744 \uC694\uAD6C\uD558\uBA74 \uD569\uACA9 \uD6C4 \uC81C\uCD9C\uD574\uB3C4 \uB418\uB294\uC9C0 \uBA3C\uC800 \uBB38\uC758\uD55C\uB2E4.",
    "\uAC19\uC740 \uB2E8\uC9C0\uC5D0 \uC911\uBCF5 \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294\uB2E4."
  ],
  updated_at: ""
};
function commuteVerdict(min, c) {
  if (min === null) return "unknown";
  if (min <= c.commute_limit) return "ok";
  if (min <= c.commute_max) return "edge";
  return "far";
}
var has = (text, words) => words.find((w) => w.trim() && text.replace(/\s+/g, "").includes(w.replace(/\s+/g, "")));
function filterJob(job, p, c, extra = {}) {
  const verdict = commuteVerdict(job.commute.min, c);
  const head = `${job.list_title} ${p.title || job.title}`;
  if ((c.hide_applied ?? true) && extra.applied) return { show: false, verdict, reason: `\uC774\uBBF8 \uC9C0\uC6D0\uD568 (${extra.applied})` };
  if (verdict === "far") return { show: false, verdict, reason: `\uD1B5\uADFC ${job.commute.min}\uBD84 (\uAE30\uC900 ${c.commute_max}\uBD84 \uCD08\uACFC)` };
  if ((c.hide_unqualified ?? true) && extra.blockers?.length) return { show: false, verdict, reason: `\uD544\uC218 \uC790\uACA9 \uC5C6\uC74C: ${extra.blockers.join(", ")}` };
  const ex = has(head, c.roles_exclude);
  if (ex) return { show: false, verdict, reason: `\uC81C\uC678 \uC9C1\uBB34 "${ex}"` };
  if (c.roles_include.length && !has(`${head} ${job.text.slice(0, 800)}`, c.roles_include)) return { show: false, verdict, reason: "\uCC3E\uB294 \uC9C1\uBB34\uC640 \uB2E4\uB984" };
  if (c.shifts.length && !c.shifts.includes(p.shift)) return { show: false, verdict, reason: `\uADFC\uBB34\uD615\uD0DC ${p.shift}` };
  if (c.salary_min_man !== null) {
    const amt = p.salary_text ? parseSalaryAmount(p.salary_text) : null;
    if (amt !== null && amt < c.salary_min_man * 1e4) return { show: false, verdict, reason: `\uAE09\uC5EC ${Math.round(amt / 1e4)}\uB9CC\uC6D0 (\uAE30\uC900 ${c.salary_min_man}\uB9CC\uC6D0 \uBBF8\uB9CC)` };
  }
  if (c.email_only && !p.emails.length) return { show: false, verdict, reason: "\uC774\uBA54\uC77C \uC811\uC218 \uC544\uB2D8" };
  return { show: true, verdict, reason: null };
}

// artifact/src/commute.ts
function distanceKm(a, b) {
  const R = 6371;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLng = (b.lng - a.lng) * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function minutesByDistance(home, work) {
  return Math.round(9 + distanceKm(home, work) * 4.2);
}
function finalMinutes(tableMin, home, work) {
  const km = home && work ? distanceKm(home, work) : null;
  const g = home && work ? minutesByDistance(home, work) : null;
  if (tableMin !== null && g !== null) return { min: Math.round((tableMin + g) / 2), km };
  return { min: g ?? tableMin, km };
}

// lib/util/text.ts
function compact(s) {
  return s.replace(/\s+/g, "");
}
function normalizeCompany(s) {
  return (s || "").replace(/\(\s*주\s*\)|㈜|주식회사|\(\s*유\s*\)|유한회사/g, "").replace(/\s+/g, "").toLowerCase();
}
function normalizeSite(s) {
  return (s || "").replace(/\s+/g, "").toLowerCase();
}
function spacedName(name) {
  return Array.from(name.replace(/\s+/g, "")).join(" ");
}

// lib/analyze/index.ts
var CATEGORY_RANK = { "\uD544\uC218(\uBA85\uC2DC)": 4, "\uD544\uC218\uB85C \uBCF4\uC784": 3, \uC6B0\uB300: 2, \uC644\uD654: 1 };
var REQUIRED = ["\uD544\uC218(\uBA85\uC2DC)", "\uD544\uC218\uB85C \uBCF4\uC784"];
function verdictOf(q) {
  if (q.have) return "\uCDA9\uC871";
  if (q.barrier === "low" || q.barrier === "none") return "\uBBF8\uCDA9\uC871-\uBCF4\uC644\uAC00\uB2A5";
  return "\uBBF8\uCDA9\uC871-\uC7A5\uBCBD";
}
function isNear(address, keywords) {
  const a = (address || "").trim();
  if (!a) return false;
  return keywords.some((k) => k.trim() && a.includes(k.trim()));
}
function matchLine(text, qualifications) {
  const c = compact(text);
  const spans = [];
  for (const q of qualifications) {
    const aliases = Array.from(new Set([q.name, ...q.aliases].map((a) => a.trim()).filter(Boolean)));
    for (const alias of aliases) {
      const ca = compact(alias);
      if (ca.length < 2) continue;
      let from = 0;
      let at;
      while ((at = c.indexOf(ca, from)) !== -1) {
        spans.push({ start: at, end: at + ca.length, q, alias });
        from = at + 1;
      }
    }
  }
  spans.sort((a, b) => b.end - b.start - (a.end - a.start) || a.start - b.start);
  const chosen = [];
  for (const s of spans) {
    if (chosen.some((o) => s.start < o.end && o.start < s.end)) continue;
    chosen.push(s);
  }
  chosen.sort((a, b) => a.start - b.start);
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const s of chosen) {
    if (seen.has(s.q.id)) continue;
    seen.add(s.q.id);
    out.push({ q: s.q, alias: s.alias });
  }
  return out;
}
var SKIP_UNMATCHED_RE = /(기재|표기|@|https?:|제출|접수|문의)/;
function buildRows(lines, qualifications) {
  const rows = [];
  for (const l of lines) {
    if (!l.text || l.isHeader) continue;
    const matches = matchLine(l.text, qualifications);
    const line = itemText(l);
    if (matches.length) {
      for (const { q, alias } of matches) {
        rows.push({
          line,
          section: l.section,
          category: l.category,
          qualification_id: q.id,
          qualification_name: q.name,
          matched_alias: alias,
          verdict: verdictOf(q),
          barrier: q.barrier,
          hint: q.hint
        });
      }
    } else if (l.inRequirementSection && /[가-힣]{2,}/.test(line) && !SKIP_UNMATCHED_RE.test(line)) {
      rows.push({
        line,
        section: l.section,
        category: l.category,
        qualification_id: null,
        qualification_name: null,
        matched_alias: null,
        verdict: "\uC9C1\uC811 \uD655\uC778",
        barrier: null,
        hint: ""
      });
    }
  }
  return rows;
}
function aggregateHits(rows, qualifications) {
  const map = /* @__PURE__ */ new Map();
  for (const r of rows) {
    if (r.qualification_id == null) continue;
    const q = qualifications.find((x) => x.id === r.qualification_id);
    const prev = map.get(q.id);
    if (!prev || CATEGORY_RANK[r.category] > CATEGORY_RANK[prev.category]) map.set(q.id, { qualification: q, category: r.category });
  }
  return Array.from(map.values());
}
function isAptExp(q) {
  return q.key === "apt_exp" || !q.key && /아파트/.test(q.name);
}
function signalOf(hits) {
  const unmetRequired = hits.filter((h) => REQUIRED.includes(h.category) && !h.qualification.have);
  const barrier = unmetRequired.filter((h) => verdictOf(h.qualification) === "\uBBF8\uCDA9\uC871-\uC7A5\uBCBD");
  const fixable = unmetRequired.filter((h) => verdictOf(h.qualification) === "\uBBF8\uCDA9\uC871-\uBCF4\uC644\uAC00\uB2A5");
  const names = (hs) => hs.map((h) => h.qualification.name).join(", ");
  if (barrier.length)
    return {
      level: "red",
      title: "\uC11C\uB958 \uD1B5\uACFC \uC608\uC0C1 \uB09C\uC774\uB3C4: \uB192\uC74C",
      detail: `\uB2E8\uAE30\uAC04\uC5D0 \uBCF4\uC644\uD558\uAE30 \uC5B4\uB824\uC6B4 \uD544\uC218 \uC694\uAC74\uC774 \uBBF8\uCDA9\uC871\uC785\uB2C8\uB2E4: ${names(barrier)}${fixable.length ? ` / \uBCF4\uC644 \uAC00\uB2A5: ${names(fixable)}` : ""}`
    };
  if (fixable.length)
    return { level: "yellow", title: "\uC11C\uB958 \uD1B5\uACFC \uC608\uC0C1 \uB09C\uC774\uB3C4: \uBCF4\uD1B5", detail: `\uBCF4\uC644 \uAC00\uB2A5\uD55C \uD544\uC218 \uC694\uAC74\uC774 \uBBF8\uCDA9\uC871\uC785\uB2C8\uB2E4: ${names(fixable)}` };
  return { level: "green", title: "\uC11C\uB958 \uD1B5\uACFC \uC608\uC0C1 \uB09C\uC774\uB3C4: \uB0AE\uC74C", detail: "\uD544\uC218\uB85C \uBCF4\uC774\uB294 \uC694\uAC74 \uC911 \uBBF8\uCDA9\uC871 \uD56D\uBAA9\uC774 \uC5C6\uC2B5\uB2C8\uB2E4." };
}
function analyze(text, parsed, ctx) {
  const today = ctx.today ?? todaySeoul();
  const lines = scanLines(text);
  const rows = buildRows(lines, ctx.qualifications);
  const hits = aggregateHits(rows, ctx.qualifications);
  const near = isNear(parsed.address, ctx.settings.near_keywords);
  const gap = hits.filter((h) => !h.qualification.have && h.qualification.promisable && h.qualification.promise_phrase.trim() && h.category !== "\uC644\uD654").sort((a, b) => CATEGORY_RANK[b.category] - CATEGORY_RANK[a.category]).map((h) => ({ id: h.qualification.id, name: h.qualification.name, promise_phrase: h.qualification.promise_phrase.trim() }));
  const apt_exp_required_unmet = hits.some((h) => isAptExp(h.qualification) && REQUIRED.includes(h.category) && !h.qualification.have);
  const warnings = [];
  const hasRrn = parsed.submit_docs.includes("\uC8FC\uBBFC\uB4F1\uB85D\uB4F1\uBCF8");
  const hasBank = parsed.submit_docs.includes("\uD1B5\uC7A5 \uC0AC\uBCF8");
  if (hasRrn || hasBank) {
    const what = [hasRrn && "\uC8FC\uBBFC\uB4F1\uB85D\uB4F1\uBCF8", hasBank && "\uD1B5\uC7A5 \uC0AC\uBCF8"].filter(Boolean).join("\xB7");
    warnings.push({
      kind: "docs",
      level: "warn",
      text: `\uC81C\uCD9C\uC11C\uB958\uC5D0 ${what}\uC774(\uAC00) \uC788\uC2B5\uB2C8\uB2E4. \uB4F1\uBCF8\uC740 \uC8FC\uBBFC\uBC88\uD638 \uB4B7\uC790\uB9AC \uAC00\uB9BC\uC73C\uB85C \uBC1C\uAE09\uD558\uACE0, \uD1B5\uC7A5 \uC0AC\uBCF8\uC740 \uACC4\uC88C\uBC88\uD638 \uC77C\uBD80\uB97C \uAC00\uB9AC\uC138\uC694. \uAC00\uB2A5\uD558\uBA74 \uD569\uACA9 \uD6C4 \uC81C\uCD9C\uD574\uB3C4 \uB418\uB294\uC9C0 \uBB38\uC758\uD558\uC138\uC694.`
    });
  }
  if (parsed.deadline && parsed.deadline < today)
    warnings.push({ kind: "deadline", level: "danger", text: `\uB9C8\uAC10\uC77C\uC774 \uC9C0\uB0AC\uC2B5\uB2C8\uB2E4 (${koreanDate(parsed.deadline)}).` });
  if (parsed.start_date && parsed.start_date < today)
    warnings.push({
      kind: "start_date",
      level: "warn",
      text: `\uCD9C\uADFC \uC608\uC815\uC77C\uC774 \uC9C0\uB0AC\uC2B5\uB2C8\uB2E4 (${koreanDate(parsed.start_date)}). \uC544\uC9C1 \uCC44\uC6A9 \uC911\uC778\uC9C0, \uC77C\uC815\uC774 \uBC14\uB00C\uC5C8\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694.`
    });
  if (parsed.shift === "\uACA9\uC77C")
    warnings.push({ kind: "shift", level: "info", text: "24\uC2DC\uAC04 \uACA9\uC77C \uADFC\uBB34\uC785\uB2C8\uB2E4. \uD734\uC77C \uAC1C\uB150\uC774 \uD76C\uBC15\uD558\uACE0, \uB2F9\uC9C1 \uD6C4 \uADC0\uAC00 \uC6B4\uC804\uC5D0 \uC8FC\uC758\uD558\uC138\uC694." });
  if (parsed.flags.probation) warnings.push({ kind: "probation", level: "info", text: `\uC218\uC2B5/\uD3C9\uAC00 \uC870\uAC74\uC774 \uC788\uC2B5\uB2C8\uB2E4: "${parsed.flags.probation}"` });
  const history = (ctx.history ?? []).filter((h) => h.status !== "\uC791\uC131\uC911" && h.id !== ctx.currentApplicationId);
  const comp = normalizeCompany(parsed.company);
  const emailSet = new Set(parsed.emails.map((e) => e.toLowerCase()));
  const matches = history.filter(
    (h) => comp && normalizeCompany(h.company) === comp || h.emails.some((e) => emailSet.has(e.toLowerCase()))
  );
  const siteKey = normalizeSite(parsed.site);
  const dup = siteKey ? history.filter((h) => normalizeSite(h.site) === siteKey) : [];
  if (dup.length)
    warnings.push({
      kind: "duplicate",
      level: "danger",
      text: `\uC911\uBCF5 \uC9C0\uC6D0: \uAC19\uC740 \uB2E8\uC9C0(${parsed.site})\uC5D0 \uC774\uBBF8 \uC9C0\uC6D0\uD55C \uC774\uB825\uC774 \uC788\uC2B5\uB2C8\uB2E4 \u2014 ${dup.map((h) => `${h.created_at.slice(0, 10)} ${h.status}`).join(", ")}`
    });
  if (matches.length)
    warnings.push({
      kind: "history",
      level: "info",
      text: `\uAC19\uC740 \uC704\uD0C1\uC0AC \uB610\uB294 \uC774\uBA54\uC77C\uB85C ${matches.length}\uBC88 \uC9C0\uC6D0\uD568 (${matches.map((h) => `${h.created_at.slice(0, 10)} ${h.site}`).join(", ")})`
    });
  if (!near)
    warnings.push({
      kind: "distance",
      level: "warn",
      text: parsed.address?.trim() ? "\uD1B5\uADFC \uAC70\uB9AC \uC9C1\uC811 \uD655\uC778 \uD544\uC694 (\uADFC\uAC70\uB9AC \uC9C0\uC5ED \uBAA9\uB85D\uC5D0 \uC5C6\uB294 \uC8FC\uC18C\uC785\uB2C8\uB2E4)." : "\uC8FC\uC18C\uAC00 \uC5C6\uC5B4 \uD1B5\uADFC \uAC70\uB9AC\uB97C \uD310\uB2E8\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4. \uD1B5\uADFC \uAC70\uB9AC \uC9C1\uC811 \uD655\uC778 \uD544\uC694."
    });
  return {
    rows,
    hits,
    signal: signalOf(hits),
    warnings,
    near,
    gap_qualifications: gap,
    apt_exp_required_unmet,
    history_matches: matches
  };
}

// lib/mail/index.ts
function signature(settings, profile) {
  return settings.mail_signature.replace(/\{name\}/g, profile.name).replace(/\{phone\}/g, profile.phone).replace(/\{email\}/g, profile.email).trim();
}
function mailBody({ template, parsed, profile, settings, extraDocs }) {
  const start = parsed.start_date ? ` \uC548\uB0B4\uD574 \uC8FC\uC2E0 \uCD9C\uADFC\uC608\uC815\uC77C(${koreanDate(parsed.start_date)})\uC5D0\uB3C4 \uB9DE\uCDB0 \uADFC\uBB34\uB97C \uC2DC\uC791\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.` : "";
  const docs = extraDocs.map((d) => d.trim()).filter(Boolean);
  const docsText = docs.length ? ` \uC694\uCCAD\uD558\uC2E0 ${docs.join(", ")}\uB3C4 \uD568\uAED8 \uCCA8\uBD80\uD558\uC600\uC2B5\uB2C8\uB2E4.` : "";
  return template.replace(/\{site\}/g, parsed.site.trim()).replace(/\{title\}/g, parsed.title.trim()).replace(/\{START\}/g, start).replace(/\{DOCS\}/g, docsText).replace(/\{SIGNATURE\}/g, signature(settings, profile));
}

// lib/render/compose.ts
function applyTarget(parsed) {
  const rp = parsed.required_phrase?.trim();
  if (rp) return rp;
  const t = parsed.title.trim();
  return `${parsed.site.trim()} ${t ? `\u300C${t}\u300D` : ""} \uC9C0\uC6D0`.replace(/\s+/g, " ").trim();
}
function salesYears(careers) {
  let total = 0;
  for (const c of careers) {
    if (!/분양/.test(`${c.company} ${c.duties}`)) continue;
    const s = yearOf(c.start);
    const e = yearOf(c.end);
    if (s !== null && e !== null && e >= s) total += e - s;
  }
  return total;
}
function buildGap(blocks, phrases) {
  if (!phrases.length) return blocks.goal_gap_default.trim();
  const head = phrases.slice(0, -1).map((p) => `${p}\uD558\uACE0, `).join("");
  return `${head}${phrases[phrases.length - 1]}${blocks.goal_gap_suffix.trim()}`;
}
function s3For(blocks, shift) {
  if (shift === "\uACA9\uC77C") return blocks.strength_s3_gyeogil;
  if (shift === "3\uAD50\uB300" || shift === "\uC8FC\uC57C\uAD50\uB300") return blocks.strength_s3_gyodae;
  return blocks.strength_s3_default;
}
var join = (...parts2) => parts2.map((p) => p.trim()).filter(Boolean).join(" ");
function composeLetter({ profile, blocks, parsed, analysis }) {
  const experience = (analysis.apt_exp_required_unmet ? blocks.experience_no_apt_prefix : "") + blocks.experience.trim().replace(/\{sales_years\}/g, String(salesYears(profile.careers)));
  const m3 = parsed.start_date ? blocks.motive_m3_start.replace(/\{start_date\}/g, koreanDate(parsed.start_date)) : blocks.motive_m3;
  const motive = analysis.near ? join(blocks.motive_m1, blocks.motive_m2, m3) : join(blocks.motive_m2, m3);
  const gap = buildGap(
    blocks,
    analysis.gap_qualifications.map((g) => g.promise_phrase)
  );
  const goal = join(blocks.goal_g1.replace(/\{GAP\}/g, gap), blocks.goal_g2);
  return {
    target: applyTarget(parsed),
    name: profile.name,
    sections: [
      { key: "growth", title: "\uC131\uC7A5\uACFC\uC815", text: blocks.growth.trim() },
      {
        key: "strength",
        title: "\uC131\uACA9\uC758 \uC7A5\uC810 \uBC0F \uBCF4\uC644\uC810",
        text: join(blocks.strength_s1, blocks.strength_s2, s3For(blocks, parsed.shift), blocks.strength_s4)
      },
      { key: "experience", title: "\uC9C1\uBB34 \uAD00\uB828 \uACBD\uD5D8", text: experience },
      { key: "motive", title: "\uC9C0\uC6D0\uB3D9\uAE30", text: motive },
      { key: "goal", title: "\uC785\uC0AC \uD6C4 \uD3EC\uBD80", text: goal }
    ]
  };
}
function composeResume({ profile, blocks, parsed, today }) {
  const m = profile.military;
  const hasMilitary = !!(m.branch || m.corps || m.rank || m.start || m.end || m.discharge);
  const title = parsed.title.trim();
  const site = parsed.site.trim();
  return {
    target: applyTarget(parsed),
    name: profile.name,
    birth: birthWithAge(profile.birth, today),
    phone: profile.phone,
    email: profile.email,
    address: profile.address,
    applyField: title && site ? `${title} (${site})` : title || site,
    education: profile.education.map((e) => ({
      school: e.school,
      status: e.status,
      major: e.major,
      start: yearMonth(e.start),
      end: yearMonth(e.end)
    })),
    military: hasMilitary ? {
      branchCorps: [m.branch, m.corps].filter(Boolean).join(" / "),
      rank: m.rank,
      period: period(m.start, m.end),
      discharge: m.discharge
    } : null,
    licenses: profile.licenses.map((l) => ({ name: l.name, issuer: l.issuer, date: yearMonth(l.date) })),
    // 입력 순서 유지 (최신순 정렬하지 않음)
    careers: profile.careers.map((c) => ({ period: period(c.start, c.end), company: c.company, duties: c.duties })),
    intro: [blocks.resume_intro_1, blocks.resume_intro_2, blocks.resume_intro_3].map((s) => s.trim()).filter(Boolean),
    date: koreanDate(today),
    signName: spacedName(profile.name)
  };
}

// artifact/src/tailor.ts
var SECTION_KEYS = ["growth", "strength", "experience", "motive", "goal"];
function facts(p, quals) {
  const have = quals.filter((q) => q.have).map((q) => q.name);
  const promise = quals.filter((q) => !q.have && q.promisable && q.promise_phrase.trim()).map((q) => `${q.name} (\uC4F8 \uC218 \uC788\uB294 \uD45C\uD604: "${q.promise_phrase.trim()}")`);
  const no = quals.filter((q) => !q.have && !q.promisable).map((q) => q.name);
  return [
    `\uC774\uB984: ${p.name}`,
    `\uD559\uB825: ${p.education.map((e) => `${e.school} ${e.status} (${e.start}~${e.end})`).join(", ") || "\uC5C6\uC74C"}`,
    `\uBCD1\uC5ED: ${[p.military.branch, p.military.corps, p.military.rank, p.military.discharge].filter(Boolean).join(" ")} (${p.military.start}~${p.military.end})`,
    `\uBA74\uD5C8\xB7\uC790\uACA9(\uBCF4\uC720): ${p.licenses.map((l) => `${l.name} (${l.issuer}, ${l.date})`).join(", ") || "\uC5C6\uC74C"}`,
    `\uACBD\uB825: ${p.careers.map((c) => `${c.start}~${c.end} ${c.company} \u2014 ${c.duties}`).join(" / ")}`,
    `\uBCF4\uC720\uB85C \uC778\uC815\uB418\uB294 \uC694\uAC74: ${have.join(", ") || "\uC5C6\uC74C"}`,
    `\uC544\uC9C1 \uC5C6\uC9C0\uB9CC "\uC900\uBE44 \uC911\xB7\uCDE8\uB4DD \uC608\uC815"\uC73C\uB85C\uB9CC \uC4F8 \uC218 \uC788\uB294 \uC790\uACA9: ${promise.join(", ") || "\uC5C6\uC74C"}`,
    `\uC5C6\uACE0 \uC4F0\uBA74 \uC548 \uB418\uB294 \uC790\uACA9\xB7\uACBD\uB825: ${no.join(", ") || "\uC5C6\uC74C"}`
  ].join("\n");
}
function tailorPrompt(t) {
  const cur = t.sections.map((s) => `[${s.key}] ${s.title}
${s.text}`).join("\n\n");
  return `\uB108\uB294 \uAD6C\uC9C1\uC790 \uC815\uBBFC\uC6B1 \uB2D8\uC758 \uC9C0\uC6D0\uC11C\uB97C \uACF5\uACE0\uC5D0 \uB9DE\uAC8C \uB2E4\uB4EC\uB294 \uB3C4\uC6B0\uBBF8\uB2E4. \uC544\uB798 "\uC9C0\uAE08 \uAE00"\uC744 \uC774 \uACF5\uACE0\uC5D0 \uC5B4\uC6B8\uB9AC\uAC8C \uB2E4\uC2DC \uC4F4\uB2E4.

\uC9C0\uD0AC \uAC83 (\uC5B4\uAE30\uBA74 \uADF8 \uD56D\uBAA9\uC740 \uBC84\uB824\uC9C4\uB2E4)
- \uC0AC\uC2E4\uC740 "\uC0AC\uC2E4" \uBAA9\uB85D\uC5D0 \uC788\uB294 \uAC83\uB9CC \uC4F4\uB2E4. \uACBD\uB825 \uC5F0\uC218\xB7\uD68C\uC0AC\xB7\uAE30\uAC04\xB7\uD559\uB825\xB7\uBCD1\uC5ED\xB7\uC790\uACA9 \uC774\uB984\xB7\uB0A0\uC9DC\uB97C \uC0C8\uB85C \uB9CC\uB4E4\uAC70\uB098 \uBC14\uAFB8\uC9C0 \uC54A\uB294\uB2E4. \uBAA9\uB85D\uC5D0 \uC5C6\uB294 \uC22B\uC790\uB97C \uC4F0\uC9C0 \uC54A\uB294\uB2E4.
- \uAC16\uACE0 \uC788\uC9C0 \uC54A\uC740 \uC790\uACA9\xB7\uACBD\uB825\uC744 \uAC00\uC9C4 \uAC83\uCC98\uB7FC \uC4F0\uC9C0 \uC54A\uB294\uB2E4. \uC544\uD30C\uD2B8 \uC2DC\uC124\uAD00\uB9AC \uC2E4\uBB34 \uACBD\uB825\uC740 \uC5C6\uB2E4. "\uC900\uBE44 \uC911\xB7\uCDE8\uB4DD \uC608\uC815"\uC740 \uD5C8\uC6A9\uB41C \uC790\uACA9\uC5D0\uB9CC, \uC8FC\uC5B4\uC9C4 \uD45C\uD604\uC73C\uB85C \uC4F4\uB2E4.
- \uACF5\uACE0\uC758 \uB2E8\uC9C0\xB7\uD68C\uC0AC \uC774\uB984, \uC9C1\uBB34, \uADFC\uBB34\uD615\uD0DC(${t.shift || "\uACF5\uACE0 \uCC38\uACE0"}), \uC5C5\uBB34 \uB0B4\uC6A9, \uC6B0\uB300\uC0AC\uD56D\uC5D0 \uB9DE\uCDB0 \uC65C \uC774 \uC790\uB9AC\uC5D0 \uB9DE\uB294 \uC0AC\uB78C\uC778\uC9C0 \uC790\uC5F0\uC2A4\uB7FD\uAC8C \uC5F0\uACB0\uD55C\uB2E4. \uACF5\uACE0\uC5D0 \uC5C6\uB294 \uB0B4\uC6A9(\uBCF5\uC9C0\xB7\uADDC\uBAA8 \uB4F1)\uC744 \uC9C0\uC5B4\uB0B4\uC9C0 \uC54A\uB294\uB2E4.
- ${t.near ? "\uC9D1\uC5D0\uC11C \uAC00\uAE4C\uC6B4 \uACF3\uC774\uB77C \uC624\uB798 \uB2E4\uB2D0 \uC218 \uC788\uB2E4\uB294 \uC810\uC744 \uC368\uB3C4 \uB41C\uB2E4." : "\uC9D1\uC5D0\uC11C \uAC00\uAE5D\uB2E4\uB294 \uB9D0\uC740 \uC4F0\uC9C0 \uC54A\uB294\uB2E4."}
- \uC131\uC7A5\uACFC\uC815\uC740 \uD06C\uAC8C \uBC14\uAFB8\uC9C0 \uB9D0\uACE0 \uC774 \uC9C1\uBB34\uC640 \uC774\uC5B4\uC9C0\uB294 \uD55C \uBB38\uC7A5 \uC815\uB3C4\uB9CC \uC190\uBCF8\uB2E4.
- \uAC01 \uD56D\uBAA9 \uAE38\uC774\uB294 \uC9C0\uAE08 \uAE00\uACFC \uBE44\uC2B7\uD558\uAC8C(\xB130%). \uC790\uAE30\uC18C\uAC1C\uC11C \uC804\uCCB4\uAC00 A4 \uD55C \uC7A5\uC744 \uB118\uC9C0 \uC54A\uAC8C.
- \uC874\uB313\uB9D0, \uB2F4\uBC31\uD558\uACE0 \uC790\uC5F0\uC2A4\uB7EC\uC6B4 \uD55C\uAD6D\uC5B4. \uACFC\uC7A5\xB7\uC0C1\uD22C\uC801 \uBBF8\uC0AC\uC5EC\uAD6C("\uCD5C\uACE0\uC758", "\uC5F4\uC815 \uB118\uCE58\uB294" \uB4F1) \uAE08\uC9C0.
- \uBA54\uC77C \uBCF8\uBB38: \uC778\uC0AC \u2192 \uC5B4\uB290 \uACF3 \uC5B4\uB290 \uC9C1\uBB34\uC5D0 \uC9C0\uC6D0\uD558\uB294\uC9C0 \u2192 \uC774 \uACF5\uACE0\uC5D0 \uB9DE\uCD98 2~3\uBB38\uC7A5 \u2192 \uCCA8\uBD80(\uC774\uB825\uC11C\xB7\uC790\uAE30\uC18C\uAC1C\uC11C) \uC548\uB0B4 \u2192 \uB9FA\uC74C\uB9D0. \uC11C\uBA85\xB7\uC5F0\uB77D\uCC98\uB294 \uC4F0\uC9C0 \uC54A\uB294\uB2E4(\uB530\uB85C \uBD99\uB294\uB2E4).${t.requiredPhrase ? `
- \uBA54\uC77C \uBCF8\uBB38 \uCCAB \uC904 \uAC00\uAE4C\uC774\uC5D0 \uACF5\uACE0\uC758 \uD544\uC218 \uAE30\uC7AC \uBB38\uAD6C "${t.requiredPhrase}"\uB97C \uAE00\uC790 \uADF8\uB300\uB85C \uB123\uB294\uB2E4.` : ""}
- \uC774\uB825\uC11C \uC790\uAE30\uC18C\uAC1C(intro)\uB294 2~3\uBB38\uB2E8, \uAC01 2~3\uBB38\uC7A5.

\uBC18\uB4DC\uC2DC JSON \uD558\uB098\uB9CC \uCD9C\uB825\uD55C\uB2E4:
{"mail_body": "...", "sections": {"growth": "...", "strength": "...", "experience": "...", "motive": "...", "goal": "..."}, "intro": ["...", "..."], "summary": "\uC774 \uACF5\uACE0\uC5D0 \uB9DE\uCDB0 \uBC14\uAFBC \uC810 \uD55C\uB450 \uBB38\uC7A5"}

\uC0AC\uC2E4
${facts(t.profile, t.quals)}

\uACF5\uACE0 (${t.site} / ${t.title})
${t.posting.slice(0, 3e3)}

\uC9C0\uAE08 \uAE00 \u2014 \uBA54\uC77C \uBCF8\uBB38 (\uC11C\uBA85 \uC55E\uAE4C\uC9C0)
${t.mailBody}

\uC9C0\uAE08 \uAE00 \u2014 \uC790\uAE30\uC18C\uAC1C\uC11C
${cur}

\uC9C0\uAE08 \uAE00 \u2014 \uC774\uB825\uC11C \uC790\uAE30\uC18C\uAC1C
${t.intro.join("\n")}`;
}
var digitsIn = (s) => new Set((s.match(/\d+/g) ?? []).map((d) => String(Number(d))));
function checkTailored(raw, t) {
  const r = raw && typeof raw === "object" ? raw : {};
  const kept = [];
  const allowedNums = digitsIn([facts(t.profile, t.quals), t.posting, t.mailBody, t.sections.map((s) => s.text).join(" "), t.intro.join(" ")].join(" "));
  const forbidden = t.quals.filter((q) => !q.have && !q.promisable).flatMap((q) => [q.name, ...q.aliases]).map((x) => x.trim()).filter((x) => x.length >= 3);
  const compact2 = (s) => s.replace(/\s+/g, "");
  function vet(what, next, prev) {
    if (typeof next !== "string" || !next.trim()) {
      kept.push({ what, why: "\uC0C8 \uAE00\uC774 \uBE44\uC5B4 \uC788\uC74C" });
      return prev;
    }
    const n = next.trim();
    const len = n.length;
    const base = Math.max(prev.length, 40);
    if (len < base * 0.5 || len > base * 1.8) {
      kept.push({ what, why: "\uAE38\uC774\uAC00 \uB108\uBB34 \uB2EC\uB77C\uC9D0" });
      return prev;
    }
    const badNum = [...digitsIn(n)].find((d) => !allowedNums.has(d));
    if (badNum) {
      kept.push({ what, why: `\uC0AC\uC2E4\uC5D0 \uC5C6\uB294 \uC22B\uC790 "${badNum}"` });
      return prev;
    }
    const badQual = forbidden.find((f) => compact2(n).includes(compact2(f)) && !compact2(prev).includes(compact2(f)));
    if (badQual) {
      kept.push({ what, why: `\uAC16\uACE0 \uC788\uC9C0 \uC54A\uC740 \uC790\uACA9 "${badQual}" \uC5B8\uAE09` });
      return prev;
    }
    if (/아파트\s*(시설\s*)?(관리|근무)\s*(경력|경험)[을를이가]?\s*(쌓|갖|보유|있)/.test(n)) {
      kept.push({ what, why: "\uC5C6\uB294 \uC544\uD30C\uD2B8 \uACBD\uB825\uC744 \uC4F4 \uAC83\uC73C\uB85C \uBCF4\uC784" });
      return prev;
    }
    return n;
  }
  const sectionsIn = r.sections && typeof r.sections === "object" ? r.sections : {};
  const titles = { growth: "\uC131\uC7A5\uACFC\uC815", strength: "\uC131\uACA9\uC758 \uC7A5\uC810 \uBC0F \uBCF4\uC644\uC810", experience: "\uC9C1\uBB34 \uAD00\uB828 \uACBD\uD5D8", motive: "\uC9C0\uC6D0\uB3D9\uAE30", goal: "\uC785\uC0AC \uD6C4 \uD3EC\uBD80" };
  const sections = {};
  for (const k of SECTION_KEYS) {
    const prev = t.sections.find((s) => s.key === k)?.text ?? "";
    sections[k] = vet(`\uC790\uAE30\uC18C\uAC1C\uC11C \xB7 ${titles[k]}`, sectionsIn[k], prev);
  }
  let mail = vet("\uBA54\uC77C \uBCF8\uBB38", r.mail_body, t.mailBody);
  if (t.requiredPhrase && !mail.includes(t.requiredPhrase)) {
    kept.push({ what: "\uBA54\uC77C \uBCF8\uBB38", why: "\uD544\uC218 \uAE30\uC7AC \uBB38\uAD6C\uAC00 \uBE60\uC9D0" });
    mail = t.mailBody;
  }
  const introIn = Array.isArray(r.intro) ? r.intro : [];
  let intro = t.intro;
  if (introIn.length >= 1 && introIn.length <= 4) {
    const joined = vet("\uC774\uB825\uC11C \uC790\uAE30\uC18C\uAC1C", introIn.filter((x) => typeof x === "string").join("\n"), t.intro.join("\n"));
    intro = joined === t.intro.join("\n") ? t.intro : joined.split("\n").map((x) => x.trim()).filter(Boolean);
  } else kept.push({ what: "\uC774\uB825\uC11C \uC790\uAE30\uC18C\uAC1C", why: "\uD615\uC2DD\uC774 \uB9DE\uC9C0 \uC54A\uC74C" });
  return { mail_body: mail, sections, intro, summary: typeof r.summary === "string" ? r.summary.slice(0, 300) : "", kept };
}
function textHash(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}
function hardBlockers(rows, quals) {
  const byLine = /* @__PURE__ */ new Map();
  for (const r of rows) {
    if (r.qualification_id == null || r.category !== "\uD544\uC218(\uBA85\uC2DC)" && r.category !== "\uD544\uC218\uB85C \uBCF4\uC784") continue;
    const q = quals.find((x) => x.id === r.qualification_id);
    if (!q) continue;
    const block = !q.have && !q.promisable && r.verdict === "\uBBF8\uCDA9\uC871-\uC7A5\uBCBD" && !/경력/.test(q.name);
    byLine.set(r.line, [...byLine.get(r.line) ?? [], { block, name: q.name }]);
  }
  const out = /* @__PURE__ */ new Set();
  for (const hits of byLine.values()) if (hits.every((h) => h.block)) hits.forEach((h) => out.add(h.name));
  return [...out];
}
function baseDocs(b) {
  const today = b.today ?? todaySeoul();
  const p0 = parsePosting(b.item.text, today);
  const parsed = { ...p0, site: p0.site || b.item.site, title: p0.title || b.item.title, address: p0.address || b.item.address, company: p0.company || b.item.company };
  const analysis = analyze(b.item.text, parsed, {
    qualifications: b.quals,
    settings: { ...b.prefs, near_keywords: b.near && parsed.address.trim() ? [parsed.address.trim()] : [] },
    today
  });
  const profile = { ...b.profile, photo_file: null };
  const input = { profile, blocks: b.blocks, parsed, analysis, today };
  const sig = signature(b.prefs, b.profile);
  const mail = mailBody({ template: b.blocks.mail_body, parsed, profile: b.profile, settings: b.prefs, extraDocs: [] });
  const mailNoSig = sig && mail.trimEnd().endsWith(sig) ? mail.trimEnd().slice(0, -sig.length).trimEnd() : mail.trimEnd();
  return { parsed, letter: composeLetter(input), resume: composeResume(input), mailNoSig, sig, blockers: hardBlockers(analysis.rows, b.quals), gapPhrases: analysis.gap_qualifications.map((g) => g.promise_phrase) };
}

// collector/tailor-cli.ts
var SOURCES = ["dghma", "jobkorea", "saramin", "work24", "manual"];
function readJson(file, fallback) {
  try {
    const d = JSON.parse(import_node_fs.default.readFileSync(file, "utf8"));
    if (d && typeof d === "object") delete d.version;
    return d;
  } catch {
    return fallback;
  }
}
function load(dir) {
  const profile = readJson(import_node_path.default.join(dir, "profile.json"), null);
  const blocks = readJson(import_node_path.default.join(dir, "blocks.json"), null);
  const quals = readJson(import_node_path.default.join(dir, "quals.json"), { list: [] }).list ?? [];
  const prefs = readJson(import_node_path.default.join(dir, "prefs.json"), {});
  const criteria = { ...DEFAULT_CRITERIA, ...readJson(import_node_path.default.join(dir, "criteria.json"), {}) };
  const jobEmails = readJson(import_node_path.default.join(dir, "job_emails.json"), {}).map ?? {};
  if (!profile || !blocks) throw new Error("profile.json / blocks.json \uC774 \uC5C6\uC2B5\uB2C8\uB2E4");
  const items = [];
  for (const s of SOURCES) for (const it of readJson(import_node_path.default.join(dir, `jobs_${s}.json`), { items: [] }).items ?? []) items.push(it);
  const tdir = import_node_path.default.join(dir, "tailor", "list");
  const tailors = /* @__PURE__ */ new Map();
  if (import_node_fs.default.existsSync(tdir)) {
    for (const f of import_node_fs.default.readdirSync(tdir)) if (f.endsWith(".json")) tailors.set(f.slice(0, -5), readJson(import_node_path.default.join(tdir, f), null));
  }
  return { profile, blocks, quals, prefs, criteria, jobEmails, items, tailors };
}
var textOf = (it, d) => {
  const e = d.jobEmails[it.id] ?? "";
  return e && !it.text.includes(e) ? `${it.text}
\uC774\uBA54\uC77C : ${e}` : it.text;
};
function judge(it, d) {
  const fm = finalMinutes(it.commute.min, d.prefs.home_geo, it.geo);
  const verdict = commuteVerdict(fm.min, d.criteria);
  const text = textOf(it, d);
  const base = baseDocs({ profile: d.profile, blocks: d.blocks, quals: d.quals, prefs: d.prefs, item: { ...it, text }, near: verdict === "ok" });
  const title = base.parsed.title || it.title;
  const multi = /(주임|기사|책임|과장|반장|직원|계장|소장|대리)\s*[\/,]\s*\S*?(주임|기사|책임|과장|반장|직원|계장|소장|대리)/.test(title) && !/전기기사|산업기사|전기안전관리자|선임/.test(title);
  const f = filterJob(
    { ...it, commute: { min: fm.min } },
    { title, shift: base.parsed.shift, salary_text: base.parsed.salary_text, emails: base.parsed.emails },
    d.criteria,
    { blockers: multi ? [] : base.blockers }
  );
  return { show: f.show, verdict, text, base };
}
function main() {
  const [cmd, dir, id, answer, out] = process.argv.slice(2);
  if (!cmd || !dir) throw new Error("\uC0AC\uC6A9\uBC95: tailor.cjs list|prompt|check DATA [id] [answer] [out]");
  const d = load(dir);
  if (cmd === "list") {
    const need = [];
    for (const it2 of d.items) {
      const j2 = judge(it2, d);
      if (!j2.show) continue;
      const t = d.tailors.get(it2.id);
      if (t && t.text_hash === textHash(j2.text)) continue;
      need.push({ id: it2.id, site: it2.site || it2.company, title: it2.title });
    }
    process.stdout.write(JSON.stringify(need, null, 1) + "\n");
    return;
  }
  const it = d.items.find((x) => x.id === id);
  if (!it) throw new Error(`\uACF5\uACE0 ${id} \uAC00 \uC5C6\uC2B5\uB2C8\uB2E4`);
  const j = judge(it, d);
  const input = {
    profile: d.profile,
    quals: d.quals,
    posting: j.text,
    site: j.base.parsed.site,
    title: j.base.parsed.title,
    shift: j.base.parsed.shift,
    requiredPhrase: j.base.parsed.required_phrase,
    near: j.verdict === "ok",
    mailBody: j.base.mailNoSig,
    sections: j.base.letter.sections,
    intro: j.base.resume.intro
  };
  if (cmd === "prompt") {
    process.stdout.write(tailorPrompt(input) + "\n");
    return;
  }
  if (cmd === "check") {
    if (!answer || !out) throw new Error("check \uC5D0\uB294 \uB2F5 \uD30C\uC77C\uACFC \uACB0\uACFC \uD30C\uC77C\uC774 \uD544\uC694\uD569\uB2C8\uB2E4");
    const res = checkTailored(JSON.parse(import_node_fs.default.readFileSync(answer, "utf8")), input);
    const doc = { job_id: it.id, text_hash: textHash(j.text), at: (/* @__PURE__ */ new Date()).toISOString(), ...res };
    import_node_fs.default.writeFileSync(out, JSON.stringify(doc));
    const changed = Object.entries(res.sections).filter(([k, v]) => v !== input.sections.find((s) => s.key === k)?.text).length;
    console.log(`${it.id}: \uC790\uAE30\uC18C\uAC1C\uC11C ${changed}/5 \uD56D\uBAA9\xB7\uBA54\uC77C ${res.mail_body !== input.mailBody ? "\uBC14\uB01C" : "\uADF8\uB300\uB85C"}${res.kept.length ? ` \xB7 \uC6D0\uB798 \uAE00 \uC720\uC9C0: ${res.kept.map((k) => `${k.what}(${k.why})`).join(", ")}` : ""}`);
    return;
  }
  throw new Error(`\uBAA8\uB974\uB294 \uBA85\uB839: ${cmd}`);
}
try {
  main();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
