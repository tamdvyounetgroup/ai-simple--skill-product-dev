#!/usr/bin/env node
/* dogfood-gate.js — G4 của bộ chấm điểm sản phẩm ai-simple.
 * "Sản phẩm dạy dogfood thì phải tự dùng." Kiểm CÁC SỰ THẬT COMMIT ĐƯỢC (không phụ thuộc
 * git config per-máy — CI/clone mới set hooksPath riêng):
 *   D1. .githooks/pre-commit tồn tại (repo tự cài hook của chính mình).
 *   D2. Bản cài .githooks/pre-commit ĐỒNG BỘ với templates/pre-commit.hook.template (bỏ dòng
 *       version-stamp) — đúng kỷ luật "bản cài sync từ template trong cùng commit" mà sản phẩm bán;
 *       chặn drift kiểu bản hook lạc pre-1.4 từng nằm trong skills/ (v1.5.0 W1).
 *   D3. docs SỐNG không over-claim "đã bảo mật ✓" / "100% secure" ngoài ngữ cảnh CẤM (luật NT14).
 * (doctor-on-self KHÔNG dùng: doctor kiểm layout PROJECT TIÊU THỤ — CLAUDE.md, scripts/doc-health,
 *  docs/app-map — repo NGUỒN không có và không nên có; dogfood đúng nghĩa ở đây = hook tự-gác commit.)
 * Zero-dependency. Dùng: node scripts/dogfood-gate.js
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
let failed = 0;
const fail = (m) => { failed++; console.log('FAIL dogfood-gate: ' + m); };
const stripVer = (s) => s.replace(/^#\s*ai-simple-version:.*$/m, '').replace(/\r\n/g, '\n').trim();

// D1 + D2 — hook tự cài + đồng bộ template
const installed = path.join(ROOT, '.githooks', 'pre-commit');
const template = path.join(ROOT, 'templates', 'pre-commit.hook.template');
if (!fs.existsSync(installed)) {
  fail('.githooks/pre-commit KHÔNG tồn tại — repo nguồn chưa dogfood hook của chính nó (cài: cp templates/pre-commit.hook.template .githooks/pre-commit + git config core.hooksPath .githooks)');
} else if (fs.existsSync(template)) {
  if (stripVer(fs.readFileSync(installed, 'utf8')) !== stripVer(fs.readFileSync(template, 'utf8')))
    fail('.githooks/pre-commit LỆCH templates/pre-commit.hook.template (bỏ version-stamp) — sync lại trong cùng commit sửa template (kỷ luật doc-đi-cùng-code)');
}

// D3 — over-claim scan trên docs SỐNG (surface tuyên bố hiện hành). CHANGELOG/ADR bị LOẠI: là
// LỊCH SỬ thảo luận về chính luật (luôn trích "đã bảo mật ✓" như thứ bị cấm) — cùng cách
// identity-numbers guard miễn trừ chúng.
const LIVE = ['README.md', 'SKILL.md', 'methodology/README.md', 'methodology/14-security-gate.md',
  ...['ba-flow-logic', 'ui-design-logic', 'ui-ux-triage', 'security-logic'].map((s) => `skills/${s}/SKILL.md`)];
// Ngữ cảnh CẤM/lên-án (dòng đang condemn over-claim, không phải claim): mở rộng đủ để bắt cả câu mô tả anti-pattern.
const NEG = /(không|khong|cấm|never|đừng|luật vàng|luat vang|anti-pattern|slogan|giả|cảm giác|cam giac|lỗ hổng|lo hong|false|cám dỗ|cam do|tránh|"[^"]*✓"|`[^`]*✓`)/i;
for (const rel of LIVE) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) continue;
  const lines = fs.readFileSync(p, 'utf8').split(/\r?\n/);
  lines.forEach((ln, i) => {
    const overclaim = (/✓/.test(ln) && /(bảo mật|bao mat|secure|an toàn|an toan)/i.test(ln)) || /\b100%\s*(secure|an toàn|an toan)\b/i.test(ln);
    if (overclaim && !NEG.test(ln))
      fail(`${rel}:${i + 1} over-claim "đã bảo mật ✓" ngoài ngữ cảnh cấm (NT14 luật vàng) -> ${ln.trim().slice(0, 80)}`);
  });
}

if (failed === 0) console.log('PASS dogfood-gate (hook tự cài + đồng bộ template + docs không over-claim)');
process.exit(failed ? 1 : 0);
