#!/usr/bin/env node
/* metadata-words.js — NGUỒN ĐO DUY NHẤT cho "token metadata" của 5 SKILL.md (Wave 0 Nhóm A).
 * Đếm SỐ TỪ phần VALUE của name: + description: trong frontmatter (trích value bỏ key —
 * cách đếm tính cả key bị hội đồng loại). Mọi so sánh trước/sau khi rút metadata dùng đúng
 * script này; không PR nào được chọn lệnh đếm khác.
 * Dùng: node scripts/metadata-words.js [--self-test]
 * Mốc 2026-08-15 (HEAD 2dd42a8): root 209 · ba-flow 113 · security 130 · ui-design 288 · triage 77 = 817.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

function countFile(p) {
  if (!fs.existsSync(p)) return null;
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  let inFm = false, dashes = 0, words = 0;
  for (const ln of lines) {
    if (/^---\s*$/.test(ln)) { dashes++; if (dashes >= 2) break; inFm = true; continue; }
    if (!inFm) continue;
    const m = ln.match(/^(name|description):\s*(.*)$/);
    if (m) words += m[2].trim().split(/\s+/).filter(Boolean).length;
  }
  return words;
}

if (process.argv[2] === '--self-test') {
  const os = require('os');
  let rc = 0;
  const t = path.join(os.tmpdir(), `mw-${process.pid}.md`);
  fs.writeFileSync(t, '---\nname: ba mot hai\ndescription: bon nam sau bay\nother: x y z\n---\n# body\ndescription: khong dem dong body\n', 'utf8');
  const got = countFile(t);
  if (got === 7) console.log('PASS metadata-words: đếm đúng value name+description (7), bỏ key khác + body');
  else { rc = 1; console.log(`FAIL metadata-words: kỳ vọng 7, ra ${got}`); }
  fs.unlinkSync(t);
  process.exit(rc);
}

const FILES = [['root', 'SKILL.md'], ['ba-flow-logic', 'skills/ba-flow-logic/SKILL.md'],
  ['security-logic', 'skills/security-logic/SKILL.md'], ['ui-design-logic', 'skills/ui-design-logic/SKILL.md'],
  ['ui-ux-triage', 'skills/ui-ux-triage/SKILL.md']];
let total = 0;
for (const [label, rel] of FILES) {
  const n = countFile(path.join(ROOT, rel));
  console.log(`${String(n).padStart(4)}  ${label} (${rel})`);
  if (n) total += n;
}
console.log(`${String(total).padStart(4)}  TỔNG`);
