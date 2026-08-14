#!/usr/bin/env node
/* rule-enforcer-gate — "luật không khai người ép thì không vào repo" (hội đồng 2026-08-14, ADR 002).
 * Cửa chống-mục sau nội hoá: upstream không còn để đối chiếu, thứ giữ luật sống là ENFORCER.
 * Quét mọi luật mang mã nguồn-ý-tưởng (PT-* / HM-* / IMP-*) trong skills/** + methodology/15:
 *   1. Luật có mã mà THIẾU "ép bởi <enforcer>"            -> FAIL
 *   2. Enforcer trỏ hook (1d-x / 1f-x) mà id đó KHÔNG tồn tại trong pre-commit.hook.template -> FAIL
 *   3. Enforcer chỉ-con-người (mắt QA / review / checklist) -> PASS nhưng ĐẾM; tỷ lệ > 40%
 *      là tín hiệu đưa vào /audit (in ra, không fail — ngưỡng của judge).
 * Ratchet: chỉ áp cho luật mang mã nội hoá; luật cũ không mã được ân hạn tới lần sửa kế. */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const HOOK = fs.readFileSync(path.join(ROOT, 'templates', 'pre-commit.hook.template'), 'utf8');
const DV_PATH = path.join(ROOT, 'skills', 'ui-design-logic', 'design-verify.sh');
const UL_PATH = path.join(ROOT, 'skills', 'ui-design-logic', 'ui-lane.sh');

// Enforcer "máy": pattern nhận diện -> hàm kiểm tồn tại. Enforcer "người/prompt": chỉ đếm.
const MACHINE = [
  { re: /hook\s+1d-([a-z])/g, check: (m) => HOOK.includes(`1d-${m[1]}`) , label: (m) => `hook 1d-${m[1]}` },
  { re: /hook\s+1f-([a-z])/g, check: (m) => HOOK.includes(`1f-${m[1]}`) , label: (m) => `hook 1f-${m[1]}` },
  { re: /design-verify/g,      check: () => fs.existsSync(DV_PATH),       label: () => 'design-verify.sh' },
  { re: /ui-lane/g,            check: () => fs.existsSync(UL_PATH),       label: () => 'ui-lane.sh' },
];
const HUMAN_RE = /mắt QA|mat QA|review người|review nguoi|code review|checklist|06 §2|QA loop/i;
const PROMPT_RE = /\/simplify|\/audit|NT04|bảng test|bang test/i;

function* ruleMatches(text) {
  // *(nguồn ý tưởng <mã...> · ép bởi <enforcer>)* — cho phép xuống dòng bên trong ngoặc
  const re = /\((?:nguồn ý tưởng|nguon y tuong)\s+([\s\S]{0,120}?)(?:·\s*(?:ép bởi|ep boi)\s+([\s\S]{0,160}?))?\)/g;
  let m;
  while ((m = re.exec(text)) !== null) yield { src: m[1].trim(), enf: (m[2] || '').trim(), idx: m.index };
}

const FILES = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) { if (!/node_modules|evals|research/.test(e.name)) walk(p); }
    else if (e.name.endsWith('.md')) FILES.push(p);
  }
})(path.join(ROOT, 'skills'));
FILES.push(path.join(ROOT, 'methodology', '15-build-discipline.md'));

let total = 0, humanOnly = 0, failed = 0;
for (const f of FILES) {
  const text = fs.readFileSync(f, 'utf8');
  const rel = path.relative(ROOT, f);
  for (const r of ruleMatches(text)) {
    if (!/\b(PT|HM|IMP)-/.test(r.src)) continue; // chỉ áp cho luật nội hoá có mã
    total++;
    const line = text.slice(0, r.idx).split('\n').length;
    if (!r.enf) { console.log(`FAIL ${rel}:${line} — luật mang mã (${r.src.split(/\s/)[0]}) nhưng THIẾU 'ép bởi'`); failed++; continue; }
    let machineHit = false, bad = null;
    for (const mc of MACHINE) {
      mc.re.lastIndex = 0; let mm;
      while ((mm = mc.re.exec(r.enf)) !== null) {
        machineHit = true;
        if (!mc.check(mm)) bad = mc.label(mm);
      }
    }
    if (bad) { console.log(`FAIL ${rel}:${line} — 'ép bởi ${bad}' nhưng enforcer đó KHÔNG tồn tại trong hook/script`); failed++; continue; }
    if (!machineHit) {
      if (HUMAN_RE.test(r.enf) || PROMPT_RE.test(r.enf)) humanOnly++;
      else { console.log(`FAIL ${rel}:${line} — enforcer không nhận diện được: '${r.enf}'`); failed++; }
    }
  }
}

const pct = total ? Math.round((humanOnly / total) * 100) : 0;
console.log(`rule-enforcer: ${total} luật nội hoá có mã · ${humanOnly} chỉ người/prompt ép (${pct}%)${pct > 40 ? ' — VƯỢT 40%, đưa vào /audit: máy-hoá thêm hoặc cắt luật' : ''}`);
if (failed) { console.log(`rule-enforcer: FAIL — ${failed} luật không có người ép thật. Luật không enforcer là chữ chờ mục (NT15).`); process.exit(1); }
console.log('PASS rule-enforcer (mọi luật nội hoá đều khai enforcer tồn tại thật)');
