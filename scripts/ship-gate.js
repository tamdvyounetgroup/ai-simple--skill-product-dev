#!/usr/bin/env node
/* ship-gate.js — G3 của bộ chấm điểm sản phẩm ai-simple.
 * THUẦN STATIC (không cài gì — kiểm "CLI sống sau cài" thuộc G2/stranger-path E2E).
 * Chặn 2 class bug ĐÃ TỪNG xảy ra:
 *   - tarball thiếu file mà code require / bin tham chiếu (v1.4.1 thiếu lib/ -> `parallel` chết).
 *   - link/pointer chết trong README/SKILL (v1.5.0 W4, v1.6.0 m7: dangling pointer trong tarball).
 * Chạy qua `prepublishOnly` (npm tự chạy trước publish) + trong CI. Zero-dependency.
 *
 * Dùng: node scripts/ship-gate.js   (exit 0 = qua; exit 1 = chặn ship, in rõ cái thiếu)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
let failed = 0;
const fail = (m) => { failed++; console.log('FAIL ship-gate: ' + m); };

// ── Tarball manifest (nguồn sự thật về "cái gì THẬT SỰ được publish") ──
function tarballFiles() {
  const r = spawnSync('npm', ['pack', '--dry-run', '--json'], { cwd: ROOT, encoding: 'utf8', shell: process.platform === 'win32' });
  if (r.status !== 0) { fail('`npm pack --dry-run --json` lỗi: ' + (r.stderr || '').trim()); return null; }
  try {
    const j = JSON.parse(r.stdout);
    return new Set((j[0].files || []).map((f) => f.path.replace(/\\/g, '/')));
  } catch (e) { fail('không parse được output npm pack: ' + e.message); return null; }
}

// ── 1. require-coverage: mọi require('../x') / require('./x') trong bin+lib phải nằm trong tarball ──
function checkRequires(inTarball) {
  const srcFiles = [];
  for (const d of ['bin', 'lib']) {
    const dir = path.join(ROOT, d);
    if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir)) if (f.endsWith('.js')) srcFiles.push(path.join(d, f));
  }
  for (const rel of srcFiles) {
    const body = fs.readFileSync(path.join(ROOT, rel), 'utf8');
    const re = /require\((['"])(\.[^'"]+)\1\)/g;
    let m;
    while ((m = re.exec(body))) {
      let target = path.posix.normalize(path.posix.join(path.posix.dirname(rel.replace(/\\/g, '/')), m[2]));
      const cands = [target, target + '.js', target + '.json', target + '/index.js'];
      const onDisk = cands.find((c) => fs.existsSync(path.join(ROOT, c)));
      if (!onDisk) { fail(`${rel} require('${m[2]}') -> KHÔNG có file trên disk`); continue; }
      if (!inTarball.has(onDisk)) fail(`${rel} require('${m[2]}') -> '${onDisk}' KHÔNG nằm trong tarball (thêm vào package.json "files")`);
    }
  }
}

// ── 2. template-coverage: mọi *.template bin tham chiếu phải nằm trong tarball ──
function checkTemplates(inTarball) {
  const bin = fs.readFileSync(path.join(ROOT, 'bin', 'ai-simple.js'), 'utf8');
  const names = new Set();
  // TPL('x.template') + chuỗi '....template' trong FILES/SRC
  for (const m of bin.matchAll(/['"]([\w.-]+\.template)['"]/g)) names.add(m[1]);
  for (const name of [...names].sort()) {
    const rel = 'templates/' + name;
    if (!fs.existsSync(path.join(ROOT, rel))) { fail(`bin tham chiếu template '${name}' -> KHÔNG có trên disk`); continue; }
    if (!inTarball.has(rel)) fail(`template '${name}' bin dùng nhưng KHÔNG trong tarball`);
  }
}

// ── 3. link-check: link markdown tương đối trong README + SKILL trỏ file tồn tại (disk + tarball) ──
function checkLinks(inTarball) {
  for (const doc of ['README.md', 'SKILL.md']) {
    const p = path.join(ROOT, doc);
    if (!fs.existsSync(p)) continue;
    const body = fs.readFileSync(p, 'utf8');
    // [text](path) — bỏ http(s)/mailto/anchor thuần; tách #anchor và query; bỏ path có placeholder <...>
    for (const m of body.matchAll(/\]\(([^)]+)\)/g)) {
      let href = m[1].trim();
      if (/^(https?:|mailto:|#)/.test(href)) continue;
      href = href.split('#')[0].split('?')[0].replace(/^\.\//, '');
      if (!href || href.includes('<') || href.includes('{{') || href.includes('*')) continue;
      if (!fs.existsSync(path.join(ROOT, href))) { fail(`${doc}: link chết '${href}' (không có trên disk)`); continue; }
      // Chỉ enforce trong-tarball nếu file thuộc phạm vi được ship (tránh báo oan link tới file dev như evals/)
      const shipped = [...inTarball].some((f) => f === href || f.startsWith(href + '/'));
      const isDir = fs.existsSync(path.join(ROOT, href)) && fs.statSync(path.join(ROOT, href)).isDirectory();
      if (!isDir && inTarballScope(href) && !inTarball.has(href) && !shipped)
        fail(`${doc}: link '${href}' tồn tại trên disk nhưng KHÔNG vào tarball (reader bản npm sẽ 404)`);
    }
  }
}
// Phạm vi ship theo package.json "files" — chỉ enforce in-tarball cho link nằm trong các thư mục đó
function inTarballScope(href) {
  const files = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).files || [];
  return files.some((f) => href === f || href.startsWith(f.replace(/\/$/, '') + '/'));
}

const inTarball = tarballFiles();
if (inTarball) {
  checkRequires(inTarball);
  checkTemplates(inTarball);
  checkLinks(inTarball);
}
if (failed === 0) console.log('PASS ship-gate (require-coverage + template-coverage + link-check trên tarball)');
process.exit(failed ? 1 : 0);
