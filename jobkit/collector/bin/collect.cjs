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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// collector/collect.ts
var collect_exports = {};
__export(collect_exports, {
  NOT_ROLE_RE: () => NOT_ROLE_RE,
  ORIGIN: () => ORIGIN,
  ROLE_RE: () => ROLE_RE,
  geocode: () => geocode,
  isRelevant: () => isRelevant
});
module.exports = __toCommonJS(collect_exports);
var import_node_fs = __toESM(require("node:fs"));
var import_node_path = __toESM(require("node:path"));
var import_playwright = require("playwright");

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
var PLACEHOLDER_RE = /(지원\s*분야|지원\s*직종|성명|이름|단지명|지원자명|○○|OO|xx|XX|\{|\})/;
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
  const parts = [];
  lines.forEach((l) => {
    if (!l.text) return;
    if (l.section && /서류/.test(l.section)) parts.push(l.text);
    else if (matchLabel(l.text, SUBMIT_LABELS)) parts.push(l.text);
  });
  const scope = parts.length ? parts.join("\n") : fullText;
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

// artifact/src/commute.ts
var COMMUTE_LIMIT = 30;
var COMMUTE_MAX = 35;
var DEFAULT_COMMUTE = [
  // 북구 칠곡지구
  { area: "\uBD81\uAD6C \uD0DC\uC804\uB3D9", keys: ["\uD0DC\uC804\uB3D9", "\uD0DC\uC804\uB85C", "\uD0DC\uC804\uC5ED", "\uD0DC\uC804"], min: 8, route: "\uB3C4\uBCF4\xB7\uB9C8\uC744\uBC84\uC2A4" },
  { area: "\uBD81\uAD6C \uAD6C\uC554\uB3D9", keys: ["\uAD6C\uC554\uB3D9", "\uAD6C\uC554\uB85C", "\uAD6C\uC554\uC5ED", "\uAD6C\uC554"], min: 12, route: "3\uD638\uC120 \uD0DC\uC804\u2192\uAD6C\uC554 1\uC815\uAC70\uC7A5" },
  { area: "\uBD81\uAD6C \uB9E4\uCC9C\uB3D9", keys: ["\uB9E4\uCC9C\uB3D9", "\uB9E4\uCC9C\uB85C", "\uB9E4\uCC9C\uC5ED", "\uB9E4\uCC9C\uC2DC\uC7A5"], min: 12, route: "3\uD638\uC120 \uD0DC\uC804\u2192\uB9E4\uCC9C" },
  { area: "\uBD81\uAD6C \uAD00\uC74C\uB3D9", keys: ["\uAD00\uC74C\uB3D9", "\uAD00\uC74C\uB85C", "\uAD00\uC74C\uC911\uC559\uB85C", "\uAD00\uC74C"], min: 15, route: "\uBC84\uC2A4 10\uBD84\uB300" },
  { area: "\uBD81\uAD6C \uB3D9\uCC9C\uB3D9", keys: ["\uB3D9\uCC9C\uB3D9", "\uB3D9\uCC9C\uB85C", "\uB3D9\uCC9C\uC5ED", "\uB3D9\uCC9C"], min: 15, route: "3\uD638\uC120 \uD0DC\uC804\u2192\uB3D9\uCC9C 3\uC815\uAC70\uC7A5" },
  { area: "\uBD81\uAD6C \uC74D\uB0B4\uB3D9", keys: ["\uC74D\uB0B4\uB3D9", "\uD314\uAC70\uC5ED", "\uD314\uAC70\uCC9C", "\uC74D\uB0B4"], min: 16, route: "3\uD638\uC120 \uD0DC\uC804\u2192\uD314\uAC70" },
  { area: "\uBD81\uAD6C \uD314\uB2EC\uB3D9", keys: ["\uD314\uB2EC\uB3D9", "\uD314\uB2EC\uC5ED"], min: 16, route: "3\uD638\uC120 \uD0DC\uC804\u2192\uD314\uB2EC" },
  { area: "\uBD81\uAD6C \uAE08\uD638\uB3D9", keys: ["\uAE08\uD638\uB3D9", "\uAE08\uD638\uC9C0\uAD6C", "\uC11C\uBCC0\uB300\uB85C"], min: 18, route: "3\uD638\uC120 \uB9E4\uCC9C\xB7\uD314\uB2EC\uC5ED + \uB3C4\uBCF4" },
  { area: "\uBD81\uAD6C \uD559\uC815\uB3D9", keys: ["\uD559\uC815\uB3D9", "\uD559\uC815\uB85C", "\uD559\uC815\uC5ED", "\uCE60\uACE1\uACBD\uB300\uBCD1\uC6D0", "\uD559\uC815"], min: 20, route: "3\uD638\uC120 \uD0DC\uC804\u2192\uD559\uC815\xB7\uCE60\uACE1\uACBD\uB300\uBCD1\uC6D0" },
  { area: "\uBD81\uAD6C \uAD6D\uC6B0\uB3D9", keys: ["\uAD6D\uC6B0\uB3D9", "\uAD6D\uC6B0\uB85C", "\uAD6D\uC6B0"], min: 22, route: "\uBC84\uC2A4 15~20\uBD84" },
  { area: "\uBD81\uAD6C \uB178\uACE1\uB3D9", keys: ["\uB178\uACE1\uB3D9"], min: 22, route: "3\uD638\uC120 \uD314\uB2EC\uC5ED + \uBC84\uC2A4" },
  { area: "\uBD81\uAD6C \uB178\uC6D0\uB3D9", keys: ["\uB178\uC6D0\uB3D9", "\uB178\uC6D0\uB85C", "\uACF5\uB2E8\uC5ED", "\uB9CC\uD3C9\uC5ED"], min: 22, route: "3\uD638\uC120 \uD0DC\uC804\u2192\uACF5\uB2E8\xB7\uB9CC\uD3C9" },
  { area: "\uBD81\uAD6C \uC6D0\uB300\uB3D9", keys: ["\uC6D0\uB300\uB3D9", "\uC6D0\uB300\uB85C", "\uC6D0\uB300\uC5ED"], min: 24, route: "3\uD638\uC120 \uD0DC\uC804\u2192\uC6D0\uB300" },
  { area: "\uBD81\uAD6C \uC0AC\uC218\uB3D9", keys: ["\uC0AC\uC218\uB3D9", "\uC0AC\uC218\uB85C"], min: 25, route: "\uBC84\uC2A4 20\uBD84 \uC548\uD30E" },
  { area: "\uBD81\uAD6C \uC870\uC57C\uB3D9", keys: ["\uC870\uC57C\uB3D9"], min: 25, route: "\uBC84\uC2A4 20\uBD84 \uC548\uD30E" },
  { area: "\uBD81\uAD6C \uCE68\uC0B0\uB3D9", keys: ["\uCE68\uC0B0\uB3D9", "\uCE68\uC0B0\uB85C", "\uC624\uBD09\uC0B0", "\uCE68\uC0B0"], min: 28, route: "3\uD638\uC120 \uD314\uB2EC\uC2DC\uC7A5\xB7\uC6D0\uB300\uC5ED + \uB3C4\uBCF4\xB7\uBC84\uC2A4" },
  { area: "\uBD81\uAD6C \uB3C4\uB0A8\uB3D9", keys: ["\uB3C4\uB0A8\uB3D9", "\uB3C4\uB0A8\uAE38", "\uB3C4\uB0A8\uC911\uC559\uB85C", "\uB3C4\uB0A8\uC9C0\uAD6C", "\uB3C4\uB0A8"], min: 28, route: "\uBC84\uC2A4(\uAD6D\uC6B0\uB3D9 \uACBD\uC720) 20~25\uBD84" },
  { area: "\uBD81\uAD6C \uACE0\uC131\uB3D9", keys: ["\uACE0\uC131\uB3D9", "\uACE0\uC131\uB85C", "\uBD81\uAD6C\uCCAD\uC5ED"], min: 28, route: "3\uD638\uC120 \uD0DC\uC804\u2192\uBD81\uAD6C\uCCAD" },
  { area: "\uBD81\uAD6C \uCE60\uC131\uB3D9", keys: ["\uCE60\uC131\uB3D9", "\uCE60\uC131\uC2DC\uC7A5", "\uB300\uAD6C\uC5ED"], min: 33, route: "3\uD638\uC120 \uBD81\uAD6C\uCCAD\uC5ED + \uB3C4\uBCF4\xB7\uBC84\uC2A4" },
  { area: "\uBD81\uAD6C \uC0B0\uACA9\uB3D9", keys: ["\uC0B0\uACA9\uB3D9", "\uC0B0\uACA9\uB85C", "\uC5D1\uC2A4\uCF54", "\uC0B0\uACA9"], min: 34, route: "3\uD638\uC120 + \uBC84\uC2A4 \uD658\uC2B9" },
  { area: "\uBD81\uAD6C \uB300\uD604\uB3D9", keys: ["\uB300\uD604\uB3D9", "\uB300\uD604\uB85C", "\uB300\uD604"], min: 38, route: "\uC9C0\uD558\uCCA0 \uD658\uC2B9 + \uBC84\uC2A4" },
  { area: "\uBD81\uAD6C \uBCF5\uD604\uB3D9", keys: ["\uBCF5\uD604\uB3D9", "\uBCF5\uD604\uB85C", "\uBCF5\uD604"], min: 40, route: "\uBC84\uC2A4 \uD658\uC2B9" },
  { area: "\uBD81\uAD6C \uAC80\uB2E8\uB3D9", keys: ["\uAC80\uB2E8\uB3D9"], min: 42, route: "\uBC84\uC2A4 \uD658\uC2B9" },
  { area: "\uBD81\uAD6C \uB3D9\uBCC0\uB3D9", keys: ["\uB3D9\uBCC0\uB3D9"], min: 40, route: "\uBC84\uC2A4 \uD658\uC2B9" },
  { area: "\uBD81\uAD6C \uC11C\uBCC0\uB3D9", keys: ["\uC11C\uBCC0\uB3D9"], min: 40, route: "\uBC84\uC2A4 \uD658\uC2B9" },
  { area: "\uBD81\uAD6C \uC5F0\uACBD\uB3D9", keys: ["\uC5F0\uACBD\uB3D9", "\uC5F0\uACBD\uC9C0\uAD6C", "\uC5F0\uACBD"], min: 45, route: "\uBC84\uC2A4 \uD658\uC2B9" },
  // 북구 칠곡지구 도로명(동이 안 적힌 주소용)
  { area: "\uBD81\uAD6C \uCE60\uACE1 \uC77C\uB300", keys: ["\uCE60\uACE1\uC911\uC559\uB300\uB85C", "\uD314\uAC70\uCC9C\uB3D9\uB85C", "\uD314\uAC70\uCC9C\uC11C\uB85C", "\uCE60\uACE1\uC9C0\uAD6C", "\uCE60\uACE13\uC9C0\uAD6C", "\uCE60\uACE1"], min: 15, route: "3\uD638\uC120\xB7\uBC84\uC2A4 15\uBD84 \uC548\uD30E" },
  // 서구·중구
  { area: "\uC11C\uAD6C \uBE44\uC0B0\uB3D9", keys: ["\uBE44\uC0B0\uB3D9", "\uBD81\uBE44\uC0B0", "\uBE44\uC0B0\uB85C", "\uBE44\uC0B0"], min: 32, route: "3\uD638\uC120 \uC6D0\uB300\xB7\uB2EC\uC131\uACF5\uC6D0 + \uB3C4\uBCF4\xB7\uBC84\uC2A4" },
  { area: "\uC11C\uAD6C \uC774\uD604\uB3D9", keys: ["\uC774\uD604\uB3D9"], min: 34, route: "3\uD638\uC120 + \uBC84\uC2A4" },
  { area: "\uC11C\uAD6C \uD3C9\uB9AC\uB3D9", keys: ["\uD3C9\uB9AC\uB3D9", "\uD3C9\uB9AC\uB85C", "\uD3C9\uB9AC"], min: 38, route: "3\uD638\uC120 + \uBC84\uC2A4 \uD658\uC2B9" },
  { area: "\uC11C\uAD6C \uB0B4\uB2F9\uB3D9", keys: ["\uB0B4\uB2F9\uB3D9"], min: 40, route: "3\uD638\uC120\u21922\uD638\uC120 \uD658\uC2B9" },
  { area: "\uC11C\uAD6C \uC911\uB9AC\uB3D9", keys: ["\uC911\uB9AC\uB3D9"], min: 42, route: "\uD658\uC2B9 2\uD68C" },
  { area: "\uC911\uAD6C \uB300\uC2E0\uB3D9", keys: ["\uB300\uC2E0\uB3D9", "\uB2EC\uC131\uACF5\uC6D0"], min: 32, route: "3\uD638\uC120 \uD0DC\uC804\u2192\uB2EC\uC131\uACF5\uC6D0" },
  { area: "\uC911\uAD6C \uB3D9\uC0B0\uB3D9", keys: ["\uB3D9\uC0B0\uB3D9", "\uC11C\uBB38\uC2DC\uC7A5"], min: 34, route: "3\uD638\uC120 \uD0DC\uC804\u2192\uC11C\uBB38\uC2DC\uC7A5" },
  { area: "\uC911\uAD6C \uB0A8\uC0B0\uB3D9", keys: ["\uB0A8\uC0B0\uB3D9", "\uB0A8\uC0B0\uC5ED"], min: 36, route: "3\uD638\uC120 \uD0DC\uC804\u2192\uB0A8\uC0B0" },
  { area: "\uC911\uAD6C \uC2DC\uB0B4", keys: ["\uB3D9\uC131\uB85C", "\uC0BC\uB355\uB3D9", "\uC131\uB0B4\uB3D9", "\uB300\uBD09\uB3D9", "\uB3D9\uC778\uB3D9", "\uBC18\uC6D4\uB2F9"], min: 38, route: "3\uD638\uC120 + \uD658\uC2B9\xB7\uB3C4\uBCF4" },
  // 칠곡군
  { area: "\uCE60\uACE1\uAD70 \uB3D9\uBA85\uBA74", keys: ["\uB3D9\uBA85\uBA74"], min: 32, route: "3\uD638\uC120 \uCE60\uACE1\uACBD\uB300\uBCD1\uC6D0 + \uBC84\uC2A4" },
  { area: "\uCE60\uACE1\uAD70 \uC9C0\uCC9C\uBA74", keys: ["\uC9C0\uCC9C\uBA74"], min: 38, route: "\uBC84\uC2A4 \uD658\uC2B9" },
  { area: "\uCE60\uACE1\uAD70 \uC11D\uC801\uC74D", keys: ["\uC11D\uC801\uC74D", "\uC11D\uC801"], min: 45, route: "\uBC84\uC2A4 \uD658\uC2B9" },
  { area: "\uCE60\uACE1\uAD70 \uBD81\uC0BC\uC74D", keys: ["\uBD81\uC0BC\uC74D", "\uBD81\uC0BC"], min: 50, route: "\uBC84\uC2A4 \uD658\uC2B9" },
  { area: "\uCE60\uACE1\uAD70 \uC65C\uAD00\uC74D", keys: ["\uC65C\uAD00\uC74D", "\uC65C\uAD00"], min: 55, route: "\uBC84\uC2A4\xB7\uAE30\uCC28" },
  { area: "\uCE60\uACE1\uAD70", keys: ["\uCE60\uACE1\uAD70"], min: 45, route: "\uBC84\uC2A4 \uD658\uC2B9" },
  // 먼 곳 (구 단위)
  { area: "\uC218\uC131\uAD6C", keys: ["\uC218\uC131\uAD6C"], min: 50, route: "3\uD638\uC120 30\uBD84 \uC774\uC0C1 + \uD658\uC2B9" },
  { area: "\uB3D9\uAD6C", keys: ["\uB3D9\uAD6C"], min: 50, route: "\uD658\uC2B9 2\uD68C \uC774\uC0C1" },
  { area: "\uB0A8\uAD6C", keys: ["\uB0A8\uAD6C"], min: 45, route: "3\uD638\uC120\u21921\uD638\uC120 \uD658\uC2B9" },
  { area: "\uB2EC\uC11C\uAD6C", keys: ["\uB2EC\uC11C\uAD6C"], min: 55, route: "3\uD638\uC120\u21922\uD638\uC120 \uD658\uC2B9" },
  { area: "\uB2EC\uC131\uAD70", keys: ["\uB2EC\uC131\uAD70"], min: 65, route: "\uD658\uC2B9 2\uD68C \uC774\uC0C1" },
  { area: "\uACBD\uC0B0", keys: ["\uACBD\uC0B0"], min: 70, route: "\uD658\uC2B9 2\uD68C \uC774\uC0C1" }
];
var compact = (s) => s.replace(/\s+/g, "");
var DISTRICTS = ["\uC218\uC131\uAD6C", "\uB2EC\uC11C\uAD6C", "\uB2EC\uC131\uAD70", "\uCE60\uACE1\uAD70", "\uBD81\uAD6C", "\uC11C\uAD6C", "\uC911\uAD6C", "\uB0A8\uAD6C", "\uB3D9\uAD6C", "\uACBD\uC0B0"];
function districtOf(area) {
  return area.split(" ")[0];
}
function estimateCommute(address, site, table = DEFAULT_COMMUTE) {
  const addr = compact(address || "");
  const district = DISTRICTS.find((d) => addr.includes(d)) ?? null;
  const pool = district ? table.filter((a) => districtOf(a.area) === district || a.area === district) : table;
  const dongs = (address || "").match(/[가-힣]{1,6}(?:동|읍|면)(?=[\s,)]|$)/g) ?? [];
  for (const text of [...dongs.map(compact), addr, compact(site || "")]) {
    if (!text) continue;
    let best = null;
    for (const a of pool)
      for (const k of a.keys) {
        const ck = compact(k);
        if (ck.length >= 2 && text.includes(ck) && (!best || ck.length > compact(best.k).length)) best = { a, k };
      }
    if (best) {
      const m = best.a.min;
      return {
        verdict: m <= COMMUTE_LIMIT ? "ok" : m <= COMMUTE_MAX ? "edge" : "far",
        min: m,
        area: best.a.area,
        route: best.a.route,
        matched: best.k
      };
    }
  }
  return { verdict: "unknown", min: null, area: district ? `${district}(\uB3D9 \uBBF8\uC0C1)` : null, route: null, matched: null };
}

// collector/extract.ts
var TEXT_MAX = 3500;
var ORIGIN = { dghma: "\uB300\uAD6C\uC8FC\uD0DD\uAD00\uB9AC\uC0AC\uD611\uD68C", jobkorea: "\uC7A1\uCF54\uB9AC\uC544", saramin: "\uC0AC\uB78C\uC778", work24: "\uACE0\uC6A924" };
function toItem(source, id, url, listTitle, posted, text, fallback) {
  const today = todaySeoul();
  const p = parsePosting(text, today);
  const address = p.address || fallback.address || "";
  const site = p.site || fallback.site || "";
  const commute = estimateCommute(address, site);
  return {
    id: `${source}-${id}`,
    source,
    origin: ORIGIN[source],
    url,
    list_title: listTitle,
    site,
    title: p.title || fallback.title || listTitle,
    company: p.company || fallback.company || "",
    address,
    salary: p.salary_text,
    shift: p.shift,
    deadline: p.deadline,
    deadline_text: p.deadline_text,
    emails: p.emails,
    apply_channels: p.apply_channels,
    email_apply: p.emails.length > 0,
    commute,
    geo: null,
    posted,
    text: text.slice(0, TEXT_MAX)
  };
}
var clean = (s) => s.replace(/<!--[\s\S]*?-->/g, "").replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|div|li|tr|h\d)>/gi, "\n").replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/[ \t]+/g, " ").replace(/\n\s*\n+/g, "\n").trim();
function extractJobkorea(html, c) {
  const body = clean(html);
  const s = body.search(/모집요강|모집분야|근무조건|지원자격/);
  const e = body.search(/기업 정보|기업정보 더보기|이 기업의 다른 공고/);
  let text = body.slice(s >= 0 ? s : 0, e > s ? e : void 0);
  const addr = text.match(/근무지\s*주소\s*([^\n]+?)(?:\s*지도보기|\n|$)/)?.[1]?.trim() ?? "";
  const due = text.match(/마감일\s*(\d{4}\.\d{2}\.\d{2})/)?.[1];
  text = [`\uCC44\uC6A9\uC815\uBCF4 : ${c.title}`, `\uC704\uD0C1\uC0AC\uBA85 : ${c.company}`, addr && `\uC8FC\uC18C : ${addr}`, due && `\uB9C8\uAC10\uC77C\uC790 : ${due.replace(/\./g, "-")}`, text].filter(Boolean).join("\n");
  return { text, addr };
}
function extractSaramin(html, c) {
  let text = clean(html);
  const addr = text.match(/근무\s*(?:지|지역|장소)\s*[:：]\s*([^\n•]+)/)?.[1]?.trim() ?? "";
  text = [`\uCC44\uC6A9\uC815\uBCF4 : ${c.title}`, `\uC704\uD0C1\uC0AC\uBA85 : ${c.company}`, addr && `\uC8FC\uC18C : ${addr}`, text].filter(Boolean).join("\n");
  return { text, addr };
}
function extractWork24(html, c) {
  const body = clean(html);
  const pick = (label) => body.match(new RegExp(`${label}\\s*\\n\\s*([^\\n]+)`))?.[1]?.trim() ?? "";
  const s0 = body.indexOf("\uC9C1\uBB34\uB0B4\uC6A9");
  const duty = body.slice(s0 >= 0 ? s0 + 4 : 0, s0 >= 0 ? body.indexOf("\uB354\uBCF4\uAE30", s0) : 0).trim();
  const addr = pick("\uADFC\uBB34 \uC608\uC815\uC9C0").replace(/,\s*\.\s*/, " ");
  const site = addr.match(/\([^,)]*,\s*([^)]+)\)/)?.[1]?.trim() ?? "";
  const m0 = body.search(/접수 방법\s*\n/);
  const method = m0 >= 0 ? body.slice(m0, body.indexOf("\uC81C\uCD9C \uC11C\uB958", m0) > m0 ? body.indexOf("\uC81C\uCD9C \uC11C\uB958", m0) : m0 + 200).split("\n").slice(1).map((x) => x.trim()).filter((x) => x && x !== "\uD14D\uC2A4\uD2B8" && !/br태그/.test(x)).join(", ").slice(0, 120) : "";
  const k0 = body.indexOf("\uCC44\uC6A9 \uB2F4\uB2F9\uC790 \uC815\uBCF4 \uC5F4\uB78C");
  const cblock = k0 >= 0 ? body.slice(k0, body.indexOf("\uC9C8\uBB38\uD558\uAE30", k0) > k0 ? body.indexOf("\uC9C8\uBB38\uD558\uAE30", k0) : k0 + 1500) : "";
  const cName = cblock.match(/상세 보기\s*\n\s*([^\n*]+?)\s*\n/)?.[1]?.trim() ?? "";
  const cPhone = cblock.match(/전화번호\s*([0-9][0-9-]{7,})/)?.[1] ?? "";
  const cFax = cblock.match(/팩스\s*([0-9][0-9-]{7,})/)?.[1] ?? "";
  const bodyEmails = Array.from(new Set(body.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? [])).filter(
    (e) => !/(work24|keis|moel|korea)\.(go|or)\.kr$/i.test(e)
  );
  const due = pick("\uC811\uC218 \uB9C8\uAC10\uC77C").match(/\d{4}\.\d{2}\.\d{2}/)?.[0]?.replace(/\./g, "-") ?? "";
  const text = [
    `\uCC44\uC6A9\uC815\uBCF4 : ${c.title}`,
    site && `\uB2E8\uC9C0\uBA85 : ${site}`,
    `\uC704\uD0C1\uC0AC\uBA85 : ${c.company}`,
    addr && `\uC8FC\uC18C : ${addr}`,
    `\uAE09\uC5EC : ${pick("\uC784\uAE08 \uC870\uAC74")}`,
    `\uADFC\uBB34\uD615\uD0DC : ${pick("\uADFC\uBB34 \uD615\uD0DC")} ${pick("\uC0C1\uC138 \uADFC\uBB34\uC2DC\uAC04")}`.trim(),
    due && `\uB9C8\uAC10\uC77C\uC790 : ${due}`,
    `\uC81C\uCD9C\uC11C\uB958 : ${pick("\uC81C\uCD9C \uC11C\uB958")}`,
    `\uC811\uC218\uBC29\uBC95 : ${method}`,
    bodyEmails.length ? `\uC774\uBA54\uC77C : ${bodyEmails.join(", ")}` : "",
    cName || cPhone ? `\uCC44\uC6A9\uB2F4\uB2F9 : ${[cName, cPhone && `\uC804\uD654 ${cPhone}`, cFax && `\uD329\uC2A4 ${cFax}`].filter(Boolean).join(" \xB7 ")}` : "",
    "",
    duty
  ].filter((x) => typeof x === "string").join("\n");
  const contact = cName || cPhone || cFax || method ? { name: cName || void 0, phone: cPhone || void 0, fax: cFax || void 0, method: method || void 0 } : null;
  return { text, addr, site, contact };
}

// collector/collect.ts
var ROLE_RE = /(시설|기전|영선|관리주임|관리과장|관리기사|관리소|아파트|건물\s*관리|빌딩\s*관리|보일러|에너지\s*관리|전기\s*(기사|주임|안전|기술)|설비\s*(관리|유지|보수|기사|주임))/;
var NOT_ROLE_RE = /(사무|총무|경리|회계|청소|미화|영업|판매|상담원|물품|배송|운전기사|요양|간호|조리|강사|디자인|개발자|마케팅|안전관리대행|월점검|설계|오퍼레이터|\bOP\b|생산|제조|포장|건설|시공|현장\s*기계|엔지니어|정보통신|태양광|판금|절곡|제작|공사|공무|경비원|요양)/;
function nearInList(loc) {
  if (!/대구|칠곡/.test(loc)) return false;
  if (/북구|서구|중구|칠곡|대구\s*전체|대구전체/.test(loc)) return true;
  if (/(수성구|달서구|달성군|동구|남구|경산|구미|경주|포항|영천)/.test(loc)) return false;
  return /대구/.test(loc);
}
var sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function get(url) {
  const res = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}
var UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140 Safari/537.36";
var PER_SOURCE_MAX = 40;
function isRelevant(it) {
  const head = `${it.list_title} ${it.title}`;
  if (NOT_ROLE_RE.test(head)) return false;
  return ROLE_RE.test(head) || ROLE_RE.test(it.text.slice(0, 600));
}
function keep(it, today) {
  if (!isRelevant(it)) return "other";
  if (it.deadline && it.deadline < today) return "closed";
  if (it.commute.min !== null && it.commute.min > 50) return "far";
  if (it.commute.verdict === "unknown" && !(/대구|칠곡/.test(it.address) && /북구|서구|중구|칠곡/.test(it.address))) return "far";
  return "keep";
}
async function collectDghma(browser) {
  const errors = [];
  const items = [];
  const page = await browser.newPage({ userAgent: UA });
  const base = "https://www.dghma.org/pg/bbs/board.php?bo_table=recruit_new_3";
  const links = /* @__PURE__ */ new Map();
  for (const pg of [1, 2]) {
    await page.goto(`${base}&page=${pg}`, { waitUntil: "networkidle", timeout: 45e3 });
    const rows = await page.$$eval(
      'a[href*="wr_id="]',
      (as) => as.map((a) => ({ t: (a.textContent || "").trim().replace(/\s+/g, " "), h: a.href })).filter((x) => x.t)
    );
    for (const r of rows) {
      const id = r.h.match(/wr_id=(\d+)/)?.[1];
      if (id && !links.has(id)) links.set(id, r.t);
    }
    await sleep(800);
  }
  let scanned = 0;
  for (const [id, title] of links) {
    if (items.length >= PER_SOURCE_MAX) break;
    try {
      await page.goto(`${base}&wr_id=${id}`, { waitUntil: "networkidle", timeout: 45e3 });
      scanned++;
      const full = await page.evaluate(() => document.querySelector("#bo_v")?.innerText || document.body.innerText);
      if (/마감여부\s*마감(?!여부)/.test(full) && !/채용중/.test(full)) continue;
      const date = full.match(/작성일\s*\n?\s*(\d{2}-\d{2}-\d{2})/)?.[1] ?? "";
      const start = full.indexOf("\uAD6C\uC778\uC0C1\uC138\uC815\uBCF4");
      const end = full.lastIndexOf("\uC218\uC815\uD558\uAE30");
      const text = full.slice(start >= 0 ? start : 0, end > start ? end : void 0).split("\n").flatMap((line) => {
        const cells = line.split("	").map((c) => c.trim());
        if (cells.length < 2) return [line];
        const out = [];
        for (let i = 0; i < cells.length; i += 2) if (cells[i] && cells[i + 1]) out.push(`${cells[i]} : ${cells[i + 1]}`);
        return out;
      }).join("\n").trim();
      items.push(toItem("dghma", id, `${base}&wr_id=${id}`, title, date ? `20${date}` : "", text, {}));
    } catch (e) {
      errors.push(`\uD611\uD68C ${id}: ${e.message}`);
    }
    await sleep(700);
  }
  await page.close();
  return { items, scanned, errors };
}
var JK_QUERIES = ["\uB300\uAD6C \uC2DC\uC124\uAD00\uB9AC", "\uB300\uAD6C \uC544\uD30C\uD2B8 \uAD00\uB9AC", "\uB300\uAD6C \uAE30\uC804", "\uB300\uAD6C \uC601\uC120", "\uB300\uAD6C \uC2DC\uC124\uC8FC\uC784", "\uB300\uAD6C \uC804\uAE30 \uC2DC\uC124", "\uB300\uAD6C \uC124\uBE44", "\uCE60\uACE1 \uC2DC\uC124\uAD00\uB9AC"];
async function collectJobkorea() {
  const errors = [];
  const cards = /* @__PURE__ */ new Map();
  for (const q of JK_QUERIES) {
    try {
      const html = await get(`https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(q)}&tabType=recruit`);
      for (const part of html.split('data-sentry-component="CardJob"').slice(1)) {
        const gid = part.match(/GI_Read\/(\d+)/)?.[1];
        if (!gid || cards.has(gid)) continue;
        const texts = Array.from(part.matchAll(/>([^<>]{2,120})</g)).map((m) => clean(m[1])).filter((x) => x && !x.startsWith("{"));
        const loc = texts.find((x) => /^(대구|경북)\s/.test(x)) ?? "";
        if (!/^(대구|경북 칠곡)/.test(loc)) continue;
        const title = clean(part.match(/text-typo-b1-18[^"]*">([^<]+)</)?.[1] ?? "");
        const company = clean(part.match(/text-gray700 text-typo-b2-16">([^<]+)</)?.[1] ?? (part.match(/alt="([^"]+?) 로고"/)?.[1] ?? ""));
        const duty = clean(part.match(/text-typo-b4-14">([^<]+)<\/span><\/div><\/div>/)?.[1] ?? "");
        if (!title || !nearInList(loc) || NOT_ROLE_RE.test(title) || !ROLE_RE.test(`${title} ${duty}`)) continue;
        cards.set(gid, { title, company, loc, duty });
      }
    } catch (e) {
      errors.push(`\uC7A1\uCF54\uB9AC\uC544 \uAC80\uC0C9 "${q}": ${e.message}`);
    }
    await sleep(1e3);
  }
  const items = [];
  let scanned = 0;
  for (const [gid, c] of cards) {
    if (items.length >= PER_SOURCE_MAX) break;
    const url = `https://www.jobkorea.co.kr/Recruit/GI_Read/${gid}`;
    try {
      const html = await get(url);
      scanned++;
      const { text, addr } = extractJobkorea(html, c);
      items.push(toItem("jobkorea", gid, url, c.title, "", text, { address: addr || c.loc, company: c.company, title: c.title, site: c.company }));
    } catch (e) {
      errors.push(`\uC7A1\uCF54\uB9AC\uC544 ${gid}: ${e.message}`);
    }
    await sleep(900);
  }
  return { items, scanned, errors };
}
var SR_QUERIES = ["\uC2DC\uC124\uAD00\uB9AC", "\uC544\uD30C\uD2B8 \uAD00\uB9AC", "\uAE30\uC804", "\uC601\uC120", "\uC2DC\uC124\uC8FC\uC784", "\uC804\uAE30\uAE30\uC0AC", "\uC124\uBE44"];
async function collectSaramin() {
  const errors = [];
  const cards = /* @__PURE__ */ new Map();
  for (const q of SR_QUERIES) {
    try {
      const html = await get(`https://www.saramin.co.kr/zf_user/search/recruit?searchword=${encodeURIComponent(q)}&loc_mcd=104000&recruitPageCount=40`);
      for (const b of html.split('<div class="item_recruit"').slice(1)) {
        const id = b.match(/value="(\d+)"/)?.[1];
        if (!id || cards.has(id)) continue;
        const title = clean(b.match(/class="job_tit"[\s\S]*?title="([^"]+)"/)?.[1] ?? "");
        const company = clean(b.match(/class="corp_name"[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/)?.[1] ?? "");
        const cond = clean(b.match(/class="job_condition">([\s\S]*?)<\/div>/)?.[1] ?? "");
        const due = clean(b.match(/class="job_date">([\s\S]*?)<\/div>/)?.[1] ?? "");
        if (!nearInList(cond) || NOT_ROLE_RE.test(title) || !ROLE_RE.test(title)) continue;
        cards.set(id, { title, company, loc: cond, due });
      }
    } catch (e) {
      errors.push(`\uC0AC\uB78C\uC778 \uAC80\uC0C9 "${q}": ${e.message}`);
    }
    await sleep(1e3);
  }
  const items = [];
  let scanned = 0;
  for (const [id, c] of cards) {
    if (items.length >= PER_SOURCE_MAX) break;
    const url = `https://www.saramin.co.kr/zf_user/jobs/relay/view?rec_idx=${id}`;
    try {
      const html = await get(`https://www.saramin.co.kr/zf_user/jobs/relay/view-detail?rec_idx=${id}`);
      scanned++;
      const { text, addr } = extractSaramin(html, c);
      items.push(toItem("saramin", id, url, c.title, "", text, { address: addr, company: c.company, title: c.title, site: c.company }));
    } catch (e) {
      errors.push(`\uC0AC\uB78C\uC778 ${id}: ${e.message}`);
    }
    await sleep(900);
  }
  return { items, scanned, errors };
}
var GEO_UA = "jobkit-collector/1.0 (personal job search tool)";
var geoCache = /* @__PURE__ */ new Map();
async function geocodeOnce(q) {
  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&limit=1&countrycodes=kr&accept-language=ko`;
  const res = await fetch(url, { headers: { "User-Agent": GEO_UA } });
  await sleep(1100);
  if (!res.ok) return null;
  const d = await res.json();
  return d[0] ? { lat: Number(d[0].lat), lng: Number(d[0].lon) } : null;
}
async function geocode(address) {
  const a = address.replace(/☎.*$/, "").replace(/\(\d{5}\)/, "").trim();
  if (!a) return null;
  if (geoCache.has(a)) return geoCache.get(a);
  const road = a.match(/^(.*?(?:로|길)\s*\d+(?:-\d+)?)/)?.[1];
  const dong = a.match(/\(([가-힣0-9]+동)/)?.[1];
  const gu = a.match(/(북구|서구|중구|남구|동구|수성구|달서구|달성군|칠곡군)/)?.[1];
  const tries = [a, road, gu && dong ? `\uB300\uAD6C ${gu} ${dong}` : void 0].filter((x, i, arr) => !!x && arr.indexOf(x) === i);
  let found = null;
  for (const q of tries) {
    try {
      found = await geocodeOnce(q);
    } catch {
      found = null;
    }
    if (found) break;
  }
  geoCache.set(a, found);
  return found;
}
var W24_REGIONS = ["27230", "27170", "27110", "47850"];
var W24_QUERIES = ["\uC2DC\uC124", "\uAE30\uC804", "\uC601\uC120", "\uAD00\uB9AC\uC8FC\uC784", "\uC804\uAE30"];
async function collectWork24() {
  const errors = [];
  const cards = /* @__PURE__ */ new Map();
  for (const region of W24_REGIONS)
    for (const q of W24_QUERIES) {
      try {
        const html = await get(
          `https://www.work24.go.kr/wk/a/b/1200/retriveDtlEmpSrchList.do?srcKeyword=${encodeURIComponent(q)}&region=${region}&resultCnt=50`
        );
        for (const row of html.match(/<tr id="list\d+">[\s\S]*?<\/tr>/g) ?? []) {
          const v = row.match(/value="([^"]+)"/)?.[1]?.split("|");
          if (!v || v.length < 4 || cards.has(v[0])) continue;
          const title = clean(v[3]);
          const loc = clean(row.match(/<li class="site">([\s\S]*?)<\/li>/)?.[1] ?? "");
          if (NOT_ROLE_RE.test(title) || !ROLE_RE.test(title)) continue;
          cards.set(v[0], { title, company: clean(v[2]), loc });
        }
      } catch (e) {
        errors.push(`\uACE0\uC6A924 \uAC80\uC0C9 ${region} "${q}": ${e.message}`);
      }
      await sleep(900);
    }
  const items = [];
  let scanned = 0;
  for (const [no, c] of cards) {
    if (items.length >= PER_SOURCE_MAX) break;
    const url = `https://www.work24.go.kr/wk/a/b/1500/empDetailAuthView.do?wantedAuthNo=${no}&infoTypeCd=VALIDATION&infoTypeGroup=tb_workinfoworknet`;
    try {
      const body = await get(url);
      scanned++;
      const r = extractWork24(body, c);
      const item = toItem("work24", no, url, c.title, "", r.text, { address: r.addr || c.loc, company: c.company, title: c.title, site: r.site || c.company });
      item.contact = r.contact;
      items.push(item);
    } catch (e) {
      errors.push(`\uACE0\uC6A924 ${no}: ${e.message}`);
    }
    await sleep(900);
  }
  return { items, scanned, errors };
}
async function main() {
  const out = import_node_path.default.resolve(process.argv[2] || "collector/out");
  import_node_fs.default.mkdirSync(out, { recursive: true });
  const only = (process.argv[3] || "dghma,jobkorea,saramin,work24").split(",");
  const today = todaySeoul();
  const runAt = (/* @__PURE__ */ new Date()).toISOString();
  const status = { last_scan_at: runAt, last_full_scan_at: runAt, finished_at: "", kind: process.env.JOBKIT_KIND || "daily", sources: {}, new_total: 0, single: null };
  const prevStatusFile = process.env.JOBKIT_PREV ? import_node_path.default.join(process.env.JOBKIT_PREV, "scan_status.json") : "";
  if (status.kind === "single" && prevStatusFile && import_node_fs.default.existsSync(prevStatusFile)) {
    const ps = JSON.parse(import_node_fs.default.readFileSync(prevStatusFile, "utf8"));
    status.last_full_scan_at = ps.last_full_scan_at || ps.last_scan_at || runAt;
    status.sources = { ...ps.sources ?? {} };
    status.new_total = ps.new_total ?? 0;
  }
  const browser = only.includes("dghma") ? await import_playwright.chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || void 0 }) : null;
  try {
    for (const source of only) {
      const t0 = Date.now();
      let r;
      try {
        r = source === "dghma" ? await collectDghma(browser) : source === "jobkorea" ? await collectJobkorea() : source === "saramin" ? await collectSaramin() : await collectWork24();
      } catch (e) {
        r = { items: [], scanned: 0, errors: [`${source}: ${e.message}`] };
      }
      const kept = r.items.filter((it) => keep(it, today) === "keep");
      for (const it of kept) it.geo = await geocode(it.address);
      kept.sort((a, b) => (a.commute.min ?? 99) - (b.commute.min ?? 99));
      const prevFile = process.env.JOBKIT_PREV ? import_node_path.default.join(process.env.JOBKIT_PREV, `jobs_${source}.json`) : "";
      const prev = prevFile && import_node_fs.default.existsSync(prevFile) ? JSON.parse(import_node_fs.default.readFileSync(prevFile, "utf8")) : null;
      let newCount = 0;
      for (const it of kept) it.scanned_at = runAt;
      if (prev) {
        const seen = new Map((prev.items ?? []).map((x) => [x.id, x.first_seen ?? ""]));
        for (const it of kept) {
          if (seen.has(it.id)) it.first_seen = seen.get(it.id) || void 0;
          else {
            it.first_seen = runAt;
            newCount++;
          }
        }
      }
      const failed = r.scanned === 0 && r.errors.length > 0 && !!prev?.items?.length;
      const result = {
        source,
        updated_at: failed ? prev.updated_at : runAt,
        scanned: failed ? prev.scanned ?? 0 : r.scanned,
        kept: failed ? prev.items.length : kept.length,
        dropped_far: r.items.filter((it) => keep(it, today) === "far").length,
        errors: [...failed ? ["\uC774\uBC88 \uC2A4\uCE94 \uC2E4\uD328 \u2014 \uC774\uC804 \uBAA9\uB85D \uC720\uC9C0"] : [], ...r.errors].slice(0, 10),
        items: failed ? prev.items : kept
      };
      status.sources[source] = { scanned: r.scanned, kept: result.kept, new: failed ? 0 : newCount, errors: r.errors.length, ...failed ? { kept_previous: true } : {} };
      if (status.kind !== "single") status.new_total += failed ? 0 : newCount;
      if (process.env.JOBKIT_JOB && process.env.JOBKIT_JOB.startsWith(`${source}-`)) status.single = { job: process.env.JOBKIT_JOB, source, found: !failed && kept.some((x) => x.id === process.env.JOBKIT_JOB) };
      import_node_fs.default.writeFileSync(import_node_path.default.join(out, `jobs_${source}.json`), JSON.stringify(result));
      console.log(`${source}: \uBCF8 \uACF5\uACE0 ${r.scanned}\uAC74 \u2192 \uD1B5\uADFC \uC870\uAC74 \uB9DE\uB294 \uACF5\uACE0 ${kept.length}\uAC74 (${((Date.now() - t0) / 1e3).toFixed(0)}\uCD08)${r.errors.length ? `, \uC624\uB958 ${r.errors.length}\uAC74` : ""}`);
    }
  } finally {
    await browser?.close();
  }
  status.finished_at = (/* @__PURE__ */ new Date()).toISOString();
  import_node_fs.default.writeFileSync(import_node_path.default.join(out, "scan_status.json"), JSON.stringify(status));
  console.log(`\uC2A4\uCE94 \uC694\uC57D: \uC0C8 \uACF5\uACE0 ${status.new_total}\uAC74${status.single ? ` \xB7 ${status.single.job} ${status.single.found ? "\uC544\uC9C1 \uC788\uC74C" : "\uBAA9\uB85D\uC5D0 \uC5C6\uC74C(\uB9C8\uAC10\xB7\uC0AD\uC81C)"}` : ""}`);
}
main().catch((e) => {
  console.error(e);
  process.exit(1);
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  NOT_ROLE_RE,
  ORIGIN,
  ROLE_RE,
  geocode,
  isRelevant
});
