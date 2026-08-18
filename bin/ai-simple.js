#!/usr/bin/env node
/* ai-simple — CLI cho lớp máy (deterministic) của phương pháp ai-simple-product-dev.
 * Não (routing /fl, /audit, verify-on-use) sống trong Claude Code skill cùng repo;
 * CLI này cài và bảo trì phần chạy-không-cần-AI: hook, doc-health, templates, workflow.
 * Zero dependency — chỉ Node built-ins. */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync, spawn } = require('child_process');

const PKG_ROOT = path.join(__dirname, '..');
const PKG = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8'));
const TPL = (name) => path.join(PKG_ROOT, 'templates', name);

// ---------- helpers ----------
function findSh() {
  // 1. PATH
  const probe = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['sh'], { encoding: 'utf8' });
  if (probe.status === 0 && probe.stdout.trim()) return probe.stdout.trim().split(/\r?\n/)[0];
  // 2. Suy từ git (Git for Windows luôn kèm sh)
  const git = spawnSync('git', ['--exec-path'], { encoding: 'utf8' });
  if (git.status === 0) {
    const execPath = git.stdout.trim(); // ...\Git\mingw64\libexec\git-core
    const candidates = [
      path.join(execPath, '..', '..', '..', 'bin', 'sh.exe'),
      path.join(execPath, '..', '..', '..', 'usr', 'bin', 'sh.exe'),
    ];
    for (const c of candidates) if (fs.existsSync(c)) return c;
  }
  // 3. Vị trí phổ biến trên Windows
  for (const c of ['C:\\Program Files\\Git\\bin\\sh.exe', 'C:\\Program Files\\Git\\usr\\bin\\sh.exe'])
    if (fs.existsSync(c)) return c;
  return null;
}

function sh(scriptAndArgs, opts = {}) {
  const shPath = findSh();
  if (!shPath) return { status: 127, stdout: '', stderr: 'khong tim thay sh (can Git for Windows hoac POSIX shell)' };
  const r = spawnSync(shPath, scriptAndArgs, { encoding: 'utf8', cwd: opts.cwd || process.cwd() });
  return { status: r.status === null ? 1 : r.status, stdout: r.stdout || '', stderr: r.stderr || '' };
}

function git(args, opts = {}) {
  const r = spawnSync('git', args, { encoding: 'utf8', cwd: opts.cwd || process.cwd() });
  return { status: r.status === null ? 1 : r.status, stdout: (r.stdout || '').trim(), stderr: r.stderr || '' };
}

function inGitRepo() { return git(['rev-parse', '--is-inside-work-tree']).status === 0; }

function readVersionMarker(file) {
  try {
    const head = fs.readFileSync(file, 'utf8').split('\n').slice(0, 5).join('\n');
    const m = head.match(/ai-simple-version:\s*([0-9][0-9a-zA-Z.\-]*)/);
    return m ? m[1] : null;
  } catch { return null; }
}

function stampVersion(content) {
  return content.replace(/(ai-simple-version:\s*)[0-9][0-9a-zA-Z.\-]*/, `$1${PKG.version}`);
}

// ---------- update channel (kênh báo bản mới — 2 nguồn vì README document 2 đường cài) ----------
// GitHub là nguồn gốc (npm có thể trễ vài version — đã xảy ra thật, xem README ⚠ npx 404).
// LUẬT CHỐNG-OAN: mọi lỗi mạng/timeout/registry chết → trả null, KHÔNG BAO GIỜ throw hay kéo FAIL.
const UPDATE_SOURCES = {
  npm: 'https://registry.npmjs.org/ai-simple/latest',
  github: 'https://raw.githubusercontent.com/Long-Forfun/ai-simple--skill-product-dev/main/package.json',
};
const UPDATE_CACHE_TTL_S = 7 * 24 * 3600; // cache 7 ngày trong .git/ — không gọi mạng mỗi lần doctor

function semverCmp(a, b) {
  const pa = String(a).split('.').map((n) => parseInt(n, 10) || 0);
  const pb = String(b).split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

function updateCachePath() {
  const common = git(['rev-parse', '--git-common-dir']);
  if (common.status !== 0) return null;
  return path.join(path.resolve(process.cwd(), common.stdout), 'ai-simple', 'update-check.json');
}

async function fetchVersion(url, timeoutMs, fetchFn) {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await (fetchFn || fetch)(url, { signal: ctl.signal });
    if (!res.ok) return null;
    const j = await res.json();
    return typeof j.version === 'string' ? j.version : null;
  } catch { return null; } finally { clearTimeout(t); }
}

async function checkLatestVersion({ fetchFn = null, cachePath = undefined, now = Date.now(), timeoutMs = 3000 } = {}) {
  // Trả { latest, source, npm, github, cached? } hoặc null (offline/tắt/không có dữ liệu).
  if (process.env.AI_SIMPLE_NO_UPDATE_CHECK === '1') return null;
  const cp = cachePath === undefined ? updateCachePath() : cachePath; // truyền null = không cache (self-test)
  if (cp) {
    try {
      const c = JSON.parse(fs.readFileSync(cp, 'utf8'));
      if (now / 1000 - c.checked_epoch < UPDATE_CACHE_TTL_S && c.latest) return { ...c, cached: true };
    } catch { /* cache hỏng/chưa có — đi hỏi mạng */ }
  }
  const [npmV, ghV] = await Promise.all([
    fetchVersion(UPDATE_SOURCES.npm, timeoutMs, fetchFn),
    fetchVersion(UPDATE_SOURCES.github, timeoutMs, fetchFn),
  ]);
  if (!npmV && !ghV) return null;
  const source = ghV && (!npmV || semverCmp(ghV, npmV) > 0) ? 'github' : 'npm';
  const result = { latest: source === 'github' ? ghV : npmV, source, npm: npmV, github: ghV };
  if (cp) {
    try {
      fs.mkdirSync(path.dirname(cp), { recursive: true });
      fs.writeFileSync(cp, JSON.stringify({ ...result, checked_epoch: Math.floor(now / 1000) }), 'utf8');
    } catch { /* .git read-only (worktree/CI) — check vẫn chạy, chỉ mất cache */ }
  }
  return result;
}

function updateCommandFor(up) {
  // npm có bản mới nhất → đường npm (ngắn); npm trễ → đường GitHub (README ⚠ đã document)
  return up.npm && semverCmp(up.npm, up.latest) === 0
    ? 'npx ai-simple@latest update'
    : 'npx github:Long-Forfun/ai-simple--skill-product-dev update';
}

function parseChangelogDelta(text, fromV, toV) {
  // Trích các mục CHANGELOG trong khoảng (fromV, toV] — mới nhất trước.
  // RE-APPLY convention: dòng `**RE-APPLY**: <việc project tiêu thụ cần làm lại>` trong mục version.
  // BUG THẬT đã bắt trên dữ liệu sống (v1.17.1): CHANGELOG.md trên Windows là CRLF (.gitattributes chỉ
  // ép eol=lf cho *.sh), mà trong JS `.` KHÔNG khớp `\r` (nó là line terminator) → `(.+)$` fail →
  // checklist RE-APPLY chết IM LẶNG, `update` in "không có — update xong là xong" dù CHANGELOG có 5 dòng.
  // Fixture cũ dùng chuỗi LF ghép trong code nên không bao giờ chạm ca này. Chuẩn hoá trước khi parse.
  text = String(text).replace(/\r\n?/g, '\n');
  const heads = [];
  const re = /^## v([0-9][\w.\-]*)[^\n]*$/gm;
  let m;
  while ((m = re.exec(text))) heads.push({ version: m[1], title: m[0].replace(/^## /, ''), index: m.index, end: m.index + m[0].length });
  const out = [];
  for (let i = 0; i < heads.length; i++) {
    const h = heads[i];
    if (semverCmp(h.version, fromV) <= 0 || semverCmp(h.version, toV) > 0) continue;
    const body = text.slice(h.end, i + 1 < heads.length ? heads[i + 1].index : text.length);
    // v1.19.0 (audit độc lập 2026-08-16, M3) — GOM DÒNG NỐI: CHANGELOG xuống dòng theo lề ~100 ký tự,
    // regex một-dòng cắt checklist giữa câu (3/8 mục bị cụt, mất đúng phần "phải làm gì"). Dòng tiếp
    // theo được coi là phần nối khi nó thụt lề và KHÔNG mở bullet/heading mới.
    const reapply = [];
    const lines = body.split('\n');
    for (let li = 0; li < lines.length; li++) {
      const rm = lines[li].match(/^\s*(?:[-*]\s+)?\*\*RE-APPLY\*\*:\s*(.+)$/);
      if (!rm) continue;
      let acc = rm[1].trim();
      for (let k = li + 1; k < lines.length; k++) {
        const nx = lines[k];
        if (!/^\s{2,}\S/.test(nx)) break;            // hết thụt lề → hết đoạn
        if (/^\s*(?:[-*]\s+|#{1,6}\s)/.test(nx)) break; // bullet/heading mới → mục khác
        acc += ' ' + nx.trim();
        li = k;
      }
      reapply.push(acc);
    }
    out.push({ version: h.version, title: h.title, reapply });
  }
  return out;
}

// ---------- junction skill (Wave 3 — collision-fix, dùng chung init/update) ----------
// Kế hoạch hội đồng: init cũ SKIP im lặng MỌI đích tồn tại → bản copy STALE tiếp tục được load
// (đo thật: ForFish có thư mục thật ai-simple-product-dev description còn "12 nguyên tắc").
// Luật mới: junction sẵn → no-op có báo (idempotent); THƯ MỤC THẬT → in tóm tắt khác biệt, chỉ thay
// khi có cờ consent --replace-stale-skills (vết trong lịch sử lệnh): backup <tên>.bak rồi thay junction —
// không tự xoá, không SKIP im lặng; .bak đã tồn tại → báo và dừng phần đó (không bak-2 vô hạn).
function skillDesc(dir) {
  try {
    const m = fs.readFileSync(path.join(dir, 'SKILL.md'), 'utf8').match(/^description:\s*(.*)$/m);
    return m ? m[1].slice(0, 90) : '(không đọc được description)';
  } catch { return '(không có SKILL.md)'; }
}
function installSkillJunction(src, dst, name, { replaceStale = false, log = console.log } = {}) {
  let st = null; try { st = fs.lstatSync(dst); } catch { /* chưa có */ }
  if (st && st.isSymbolicLink()) { log(`  OK    .claude/skills/${name} — junction sẵn có (no-op)`); return 'ok'; }
  if (st && st.isDirectory()) {
    log(`  WARN  .claude/skills/${name} là THƯ MỤC THẬT (bản copy — sẽ drift, không nhận update):`);
    log(`        bản tại chỗ : ${skillDesc(dst)}`);
    log(`        bản package : ${skillDesc(src)}`);
    if (!replaceStale) { log(`        → chạy lại với --replace-stale-skills để backup ${name}.bak + thay junction (không tự xoá)`); return 'stale-kept'; }
    const bak = dst + '.bak';
    if (fs.existsSync(bak)) { log(`        BACKUP đã tồn tại: ${bak} — dọn/di chuyển rồi chạy lại (không backup đè)`); return 'bak-exists'; }
    fs.renameSync(dst, bak);
    log(`        OK backup → ${bak}`);
  } else if (st) { log(`  WARN  .claude/skills/${name}: tồn tại nhưng không phải junction/thư mục — bỏ qua`); return 'odd'; }
  try {
    fs.symlinkSync(src, dst, 'junction'); // Windows: junction không cần admin; POSIX: dir symlink
    log(`  OK    .claude/skills/${name} (junction → package — không copy, chống drift)`);
    return 'created';
  } catch (e) { log(`  WARN  .claude/skills/${name}: không tạo được junction (${e.code || e.message}) — tạo tay theo README §Cài 5 skill`); return 'err'; }
}
function warnTrackedSkillPaths() {
  const tr = git(['ls-files', '.claude/skills/']);
  if (tr.status === 0 && tr.stdout.trim()) {
    console.log('  WARN  git đang TRACK path dưới .claude/skills/ (gitignore BẤT LỰC với file đã track — commit sẽ tái diễn copy=drift #08/#10):');
    console.log(tr.stdout.split('\n').slice(0, 3).map((l) => '        ' + l).join('\n'));
    console.log('        → gỡ index (KHÔNG đụng working tree/junction): git rm -r --cached .claude/skills/<tên> rồi commit');
  }
}

function copyTemplate(src, dest, { force = false, transform = null } = {}) {
  if (fs.existsSync(dest) && !force) return { action: 'SKIP (đã tồn tại — dùng --force để ghi đè, hoặc `update` để nâng cấp giữ config)', dest };
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  let content = fs.readFileSync(src, 'utf8');
  content = stampVersion(content);
  if (transform) content = transform(content);
  fs.writeFileSync(dest, content, 'utf8'); // Node ghi UTF-8 không BOM — an toàn tiếng Việt
  try { fs.chmodSync(dest, 0o755); } catch { /* Windows: không cần */ }
  return { action: 'OK', dest };
}

// LƯU Ý replacement: luôn dùng REPLACER FUNCTION (() => line) thay vì chuỗi —
// config chứa "$'" (vd regex kết thúc $') sẽ bị String.replace hiểu là "phần sau match"
// và nhân bản file (bug bắt được khi tự test v1.1.0).
const STACKS = {
  supabase: null, // default trong template
  prisma: (c) => c
    .replace(/^MIGRATIONS_PATTERN=.*$/m, () => "MIGRATIONS_PATTERN='prisma/migrations/.*\\.sql$'")
    .replace(/^SELF_TEST_MIGRATION_SAMPLE=.*$/m, () => "SELF_TEST_MIGRATION_SAMPLE='prisma/migrations/20240101000000_init/migration.sql'"),
  custom: (c) => c, // giữ default, người dùng tự sửa CONFIG — doctor sẽ nhắc qua self-test
};

const FILES = [
  { tpl: 'CLAUDE.md.template',               dest: 'CLAUDE.md',                              stackable: false },
  { tpl: 'app-map-README.md.template',       dest: 'docs/app-map/README.md',                 stackable: false },
  { tpl: 'pre-commit.hook.template',         dest: '.githooks/pre-commit',                   stackable: true  },
  { tpl: 'doc-health-report.sh.template',    dest: 'scripts/doc-health-report.sh',           stackable: false },
  { tpl: 'fl.command.md.template',           dest: '.claude/commands/fl.md',                 stackable: false },
  { tpl: 'audit.command.md.template',        dest: '.claude/commands/audit.md',              stackable: false },
  { tpl: 'learn.command.md.template',        dest: '.claude/commands/learn.md',              stackable: false },
  { tpl: 'context-router.agent.md.template', dest: '.claude/agents/context-router.md',       stackable: false },
  { tpl: 'doc-health.workflow.yml.template', dest: '.github/workflows/doc-health.yml',       stackable: false, optionalFlag: 'no-workflow' },
  // Bộ template viết-doc để dành trong repo (copy khi cần viết doc mới)
  { tpl: 'app-map-doc.md.template',          dest: 'docs/_templates/app-map-doc.md.template',          stackable: false },
  { tpl: 'ADR.md.template',                  dest: 'docs/_templates/ADR.md.template',                  stackable: false },
  { tpl: 'runbook.md.template',              dest: 'docs/_templates/runbook.md.template',              stackable: false },
  { tpl: 'state-registry.md.template',       dest: 'docs/_templates/state-registry.md.template',       stackable: false },
  { tpl: 'ops-schedules.md.template',        dest: 'docs/_templates/ops-schedules.md.template',        stackable: false },
  { tpl: 'ops-external-services.md.template',dest: 'docs/_templates/ops-external-services.md.template',stackable: false },
  { tpl: 'contract-doc.md.template',         dest: 'docs/_templates/contract-doc.md.template',         stackable: false },
  // Wave 3 — template SỐNG TRONG SKILL (self-contained; tpl chứa '/' = path từ PKG_ROOT, không qua templates/)
  { tpl: 'skills/security-logic/security-review.md.template', dest: 'docs/_templates/security-review.md.template', stackable: false },
  { tpl: 'skills/ui-design-logic/design-spec.md.template',    dest: 'docs/_templates/design-spec.md.template',     stackable: false },
];

function runSelfTests() {
  const results = [];
  if (fs.existsSync('.githooks/pre-commit')) {
    const r = sh(['.githooks/pre-commit', '--self-test']);
    results.push({ name: 'hook --self-test', ok: r.status === 0, out: r.stdout + r.stderr });
  } else results.push({ name: 'hook --self-test', ok: false, out: '.githooks/pre-commit không tồn tại' });
  if (fs.existsSync('scripts/doc-health-report.sh')) {
    const r = sh(['scripts/doc-health-report.sh', '--self-test']);
    results.push({ name: 'report --self-test', ok: r.status === 0, out: r.stdout + r.stderr });
  } else results.push({ name: 'report --self-test', ok: false, out: 'scripts/doc-health-report.sh không tồn tại' });
  return results;
}

// ---------- commands ----------
function cmdInit(args) {
  if (!inGitRepo()) { console.error('FAIL: không phải git repo. Chạy `git init` trước — toàn bộ enforcement sống trên git.'); process.exit(1); }
  const stack = (args.stack || 'supabase').toLowerCase();
  if (!(stack in STACKS)) { console.error(`FAIL: --stack phải là ${Object.keys(STACKS).join('|')}`); process.exit(1); }
  // M7: nhận ĐỦ các tên profile trong SKILL.md — về bộ file, mọi profile ≠ tiny cài như core
  // (khác biệt giữa scale/contracts/ops/optimization/parallel nằm ở NGUYÊN TẮC KÍCH HOẠT
  // trong SKILL.md/methodology, không phải ở file cài — in note cho rõ, đừng FAIL người dùng).
  const PROFILES = ['tiny', 'core', 'full', 'scale', 'contracts', 'ops', 'optimization', 'parallel', 'security'];
  const profile = (args.profile || '').toLowerCase();
  if (profile && !PROFILES.includes(profile)) { console.error(`FAIL: --profile phải là ${PROFILES.join('|')}`); process.exit(1); }
  if (profile && !['tiny', 'core', 'full', ''].includes(profile))
    console.log(`Profile '${profile}': bộ file cài giống core — khác biệt là nguyên tắc nào BẬT (xem SKILL.md §Bước 0 + methodology tương ứng).\n`);

  // R18 — auto-detect: gợi ý profile theo tải thật, không theo đức tin
  const tracked = git(['ls-files']);
  const fileCount = tracked.status === 0 && tracked.stdout ? tracked.stdout.split('\n').length : 0;
  if (!profile && fileCount > 0 && fileCount < 10)
    console.log(`GỢI Ý (R19): repo chỉ ${fileCount} file — cân nhắc \`ai-simple init --profile tiny\` (chỉ CLAUDE.md + risk tier, chi phí ≈ 0; scale-up sau qua doctor).\n`);

  console.log(`ai-simple v${PKG.version} — init (stack: ${stack}${profile ? `, profile: ${profile}` : ''})\n`);

  // R19 — profile tiny: chỉ CLAUDE.md bản TINY (01 + 06, KHÔNG tham chiếu /fl, hook,
  // app-map — những thứ tiny cố ý không cài; M8: template full ở đây = AI gọi lệnh ma).
  if (profile === 'tiny') {
    const r = copyTemplate(TPL('CLAUDE.tiny.md.template'), 'CLAUDE.md', { force: !!args.force });
    console.log(`  ${r.action === 'OK' ? 'OK   ' : 'SKIP '} CLAUDE.md (bản tiny)`);
    console.log('\nProfile tiny: xong. Khi repo lớn (≥ 30 file / có DB / nhiều flow) chạy lại `ai-simple init` để lên core — doctor sẽ nhắc.');
    process.exit(0);
  }

  for (const f of FILES) {
    if (f.optionalFlag && args[f.optionalFlag]) { console.log(`  SKIP  ${f.dest} (--${f.optionalFlag})`); continue; }
    const transform = f.stackable ? STACKS[stack] : null;
    const r = copyTemplate(f.tpl.includes('/') ? path.join(PKG_ROOT, f.tpl) : TPL(f.tpl), f.dest, { force: !!args.force, transform });
    console.log(`  ${r.action === 'OK' ? 'OK   ' : 'SKIP '} ${f.dest}${r.action.startsWith('SKIP') ? ' — đã tồn tại' : ''}`);
  }

  const hp = git(['config', 'core.hooksPath', '.githooks']);
  console.log(`  ${hp.status === 0 ? 'OK   ' : 'FAIL '} git config core.hooksPath .githooks`);

  // Phần NÃO: junction 4 skill vào .claude/skills — hội đồng 2026-08-13: init chưa từng cài skill,
  // project tiêu thụ chỉ có mỗi ai-simple-product-dev trong .claude/skills, còn dòng wire
  // design-verify trỏ đường dẫn không ai tạo. JUNCTION, KHÔNG COPY (bài học #08/#10: copy = drift).
  const skillsSrc = path.join(PKG_ROOT, 'skills');
  if (fs.existsSync(skillsSrc)) {
    fs.mkdirSync(path.join('.claude', 'skills'), { recursive: true });
    // Junction là artifact PER-MACHINE — git trên Windows recurse junction thành BẢN COPY đầy đủ
    // khi add (đo thật 2026-08-14: 29 file trùng lặp suýt vào commit) = đúng "copy = drift" #08/#10.
    // → tự thêm gitignore, mỗi máy clone chạy lại `ai-simple init` để có junction.
    try {
      const gi = fs.existsSync('.gitignore') ? fs.readFileSync('.gitignore', 'utf8') : '';
      if (!gi.includes('.claude/skills/')) {
        fs.appendFileSync('.gitignore', `${gi.endsWith('\n') || gi === '' ? '' : '\n'}# Junction skill per-machine (ai-simple init) — cam commit: git recurse junction = copy = drift\n.claude/skills/\n`);
        console.log('  OK    .gitignore += .claude/skills/ (junction không được commit)');
      }
    } catch { /* gitignore read-only: bỏ qua, doctor sẽ nhắc */ }
    for (const s of fs.readdirSync(skillsSrc)) {
      const src = path.join(skillsSrc, s);
      if (!fs.statSync(src).isDirectory()) continue;
      installSkillJunction(src, path.join('.claude', 'skills', s), s, { replaceStale: !!args['replace-stale-skills'] });
    }
    warnTrackedSkillPaths();
  }

  console.log('\nSelf-test (tin instrument sau khi nó tự chứng minh):');
  let failed = false;
  for (const t of runSelfTests()) {
    console.log(`  ${t.ok ? 'PASS ' : 'FAIL '} ${t.name}`);
    if (!t.ok) { failed = true; console.log(t.out.split('\n').map((l) => '        ' + l).join('\n')); }
  }
  if (stack === 'custom') console.log('\nLƯU Ý stack custom: sửa CONFIG trong .githooks/pre-commit (MIGRATIONS_PATTERN, SELF_TEST_*) rồi chạy `ai-simple doctor`.');
  console.log('\nTiếp theo: điền placeholder {{...}} trong CLAUDE.md; doc gắn code khai covers:/last_verified:/ttl_days:;');
  console.log('máy clone mới chỉ cần chạy lại: git config core.hooksPath .githooks (hoặc `ai-simple doctor` sẽ nhắc).');
  // v1.11.0 — PreToolUse guard là OPT-IN: chỉ IN hướng dẫn, KHÔNG tự cài (SKILL.md ui-ux-triage §12: "cần user đồng ý").
  console.log('\n(Tuỳ chọn, KHÔNG tự cài) Guard chặn lệnh git phá dirty (reset/checkout --/stash/restore) cho Claude Code:');
  console.log('  1. cp node_modules/ai-simple/templates/pretooluse-git-guard.sh .claude/  (hoặc từ repo nguồn)');
  console.log('  2. Thêm vào .claude/settings.json: {"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"sh .claude/pretooluse-git-guard.sh"}]}]}}');
  console.log('  Đây là rào VÔ Ý (pattern-match, không chặn lách chủ đích) — đọc header script trước khi bật.');
  process.exit(failed ? 1 : 0);
}

async function cmdDoctor() {
  console.log(`ai-simple v${PKG.version} — doctor\n`);
  const checks = [];
  const add = (name, status, note = '') => checks.push({ name, status, note });

  add('git repo', inGitRepo() ? 'PASS' : 'FAIL', inGitRepo() ? '' : 'chạy git init');

  // Profile tiny (R19): CLAUDE.md có + không hook + repo nhỏ = setup tiny HỢP LỆ —
  // không được phán "hỏng" vì thiếu những thứ tiny cố ý không cài (lời hứa trong SKILL.md).
  // N1 vòng 2: tiny chỉ hợp lệ khi KHÔNG có dấu vết core nào — repo đã init core mà mất
  // .githooks (hook đang im lặng không chạy!) tuyệt đối không được false-PASS thành "tiny".
  const trackedR = git(['ls-files']);
  const trackedCount = trackedR.status === 0 && trackedR.stdout ? trackedR.stdout.split('\n').length : 0;
  const coreTraces = fs.existsSync('scripts/doc-health-report.sh') || fs.existsSync('docs/app-map')
    || fs.existsSync('.claude/commands/fl.md') || git(['config', 'core.hooksPath']).stdout === '.githooks';
  const isTiny = fs.existsSync('CLAUDE.md') && !fs.existsSync('.githooks/pre-commit') && !coreTraces && trackedCount > 0 && trackedCount < 30;
  if (!isTiny && coreTraces && !fs.existsSync('.githooks/pre-commit'))
    add('HOOK MẤT nhưng repo có dấu vết core', 'FAIL', 'core.hooksPath/app-map/scripts tồn tại mà .githooks/pre-commit biến mất — hook đang KHÔNG chạy im lặng; `ai-simple init --force` hoặc `update` để cài lại');
  if (isTiny) {
    const size = fs.statSync('CLAUDE.md').size;
    add(`profile tiny (${trackedCount} file tracked)`, 'PASS', 'CLAUDE.md + risk tier — đúng thiết kế, không thiếu gì');
    add(`CLAUDE.md ${size} chars`, size <= 24000 ? 'PASS' : 'WARN', size > 24000 ? 'vượt budget — root diet (01)' : '');
    console.log('  Trigger scale-up (khi chạm → `ai-simple init` để lên core):');
    console.log('    ≥ 30 file / có DB+migrations / nhiều flow / ≥ 2 người-agent cùng sửa / process chạy nền');
    for (const c of checks) console.log(`  ${c.status.padEnd(5)} ${c.name}${c.note ? ' — ' + c.note : ''}`);
    console.log('\nOK: setup tiny lành mạnh.');
    process.exit(0);
  }
  const hp = git(['config', 'core.hooksPath']);
  add('core.hooksPath = .githooks', hp.stdout === '.githooks' ? 'PASS' : 'FAIL', hp.stdout ? `đang là '${hp.stdout}'` : 'chưa set — hook KHÔNG chạy; `git config core.hooksPath .githooks`');

  for (const [file, label] of [['.githooks/pre-commit', 'hook'], ['scripts/doc-health-report.sh', 'doc-health-report']]) {
    if (!fs.existsSync(file)) { add(`${label} tồn tại`, 'FAIL', `thiếu ${file} — chạy \`ai-simple init\``); continue; }
    add(`${label} tồn tại`, 'PASS');
    const v = readVersionMarker(file);
    if (v === PKG.version) add(`${label} version ${v}`, 'PASS');
    else add(`${label} version`, 'WARN', `bản cài ${v || 'không rõ'} ≠ CLI ${PKG.version} — chạy \`ai-simple update\` (giữ nguyên CONFIG)`);
  }

  // Kênh báo bản mới (OS-style "Check for Updates") — hỏi npm + GitHub, cache 7 ngày.
  // Offline/timeout → up === null → KHÔNG in gì, tuyệt đối không FAIL/WARN oan (fixture trong self-test).
  const up = await checkLatestVersion();
  if (up && semverCmp(up.latest, PKG.version) > 0)
    add(`bản mới v${up.latest} có trên ${up.source}`, 'WARN',
      `CLI đang v${PKG.version} — chạy \`${updateCommandFor(up)}\` (giữ CONFIG, backup .bak); update xong sẽ in mục RE-APPLY từ CHANGELOG`);
  else if (up) add(`update-check: v${PKG.version} là bản mới nhất${up.cached ? ' (cache ≤ 7 ngày)' : ''}`, 'PASS');

  for (const t of runSelfTests()) add(t.name, t.ok ? 'PASS' : 'FAIL', t.ok ? '' : t.out.split('\n').find((l) => l.includes('FAIL')) || 'xem output');

  if (fs.existsSync('CLAUDE.md')) {
    const size = fs.statSync('CLAUDE.md').size;
    add(`CLAUDE.md ${size} chars`, size <= 24000 ? 'PASS' : 'WARN', size > 24000 ? 'vượt budget ~6K tokens — root diet (nguyên tắc 01)' : '');
  } else add('CLAUDE.md', 'WARN', 'chưa có — AI session mới sẽ mù context');

  if (fs.existsSync('docs/app-map')) {
    const docs = [];
    (function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory() && e.name !== '_generated') walk(p); else if (e.name.endsWith('.md')) docs.push(p); } })('docs/app-map');
    const withCovers = docs.filter((d) => { try { return /^covers:/im.test(fs.readFileSync(d, 'utf8').split('\n').slice(0, 10).join('\n')); } catch { return false; } });
    add(`app-map: ${docs.length} docs, ${withCovers.length} có covers`, withCovers.length > 0 || docs.length <= 1 ? 'PASS' : 'WARN', withCovers.length === 0 && docs.length > 1 ? 'doc gắn code chưa khai covers: — nằm ngoài 2 cổng bảo vệ (nguyên tắc 12)' : '');
    add('doc-status.md', fs.existsSync('docs/app-map/_generated/doc-status.md') ? 'PASS' : 'WARN', fs.existsSync('docs/app-map/_generated/doc-status.md') ? '' : 'chưa sinh — chạy `ai-simple doc-status` (cổng đọc cần file này)');
  } else add('docs/app-map', 'WARN', 'chưa có — chạy `ai-simple init`');

  // Lớp BUILD (NT15, nội hoá 2026-08-14): hook có gate build discipline chưa + CLAUDE.md có 7 điều chưa
  if (fs.existsSync('.githooks/pre-commit')) {
    const hookBody = fs.readFileSync('.githooks/pre-commit', 'utf8');
    add('hook gate NT15 (1f build discipline)', hookBody.includes('1f-') || hookBody.includes('BUILD_CHECKS') ? 'PASS' : 'WARN',
      hookBody.includes('1f-') || hookBody.includes('BUILD_CHECKS') ? '' : 'hook bản cũ chưa có gate nợ-marker/lane/state — `ai-simple update` (giữ CONFIG)');
  }
  if (fs.existsSync('CLAUDE.md')) {
    const cm = fs.readFileSync('CLAUDE.md', 'utf8');
    add('CLAUDE.md có Quy tắc viết code (NT15)', /nguyên tắc 15|Leo thang trước khi viết/i.test(cm) ? 'PASS' : 'WARN',
      /nguyên tắc 15|Leo thang trước khi viết/i.test(cm) ? '' : 'block 7 điều NT15 chưa có — chép từ templates/CLAUDE.md.template mục "Quy tắc viết code"');
  }

  // Lớp DESIGN (hội đồng 2026-08-13): doctor trước đây 0/10 check chạm lớp design —
  // cổng design tắt hay bật không ai biết. 3 check, guarded để repo không-UI im lặng.
  const uiSignals = fs.readdirSync('.').some((f) => f.startsWith('tailwind.config.'))
    || fs.existsSync('src/app/globals.css') || fs.existsSync('app/globals.css');
  const dvPath = path.join('.claude', 'skills', 'ui-design-logic', 'design-verify.sh');
  let dvExists = false; try { dvExists = fs.statSync(dvPath).isFile(); } catch { /* junction chưa có */ }
  if (uiSignals || dvExists) {
    add('skill ui-design-logic (junction .claude/skills)', dvExists ? 'PASS' : 'WARN',
      dvExists ? '' : 'repo có dấu hiệu UI mà skill chưa cài — `ai-simple init` tạo junction (design-verify + hook 1d2 đang tắt)');
    if (dvExists) {
      const r = sh([dvPath, '--self-test']);
      add('design-verify --self-test', r.status === 0 ? 'PASS' : 'FAIL', r.status === 0 ? '' : (r.stdout + r.stderr).split('\n').find((l) => l.includes('FAIL')) || 'xem output');
    }
    if (uiSignals && fs.existsSync('docs/app-map')) {
      const hasDesignSpec = fs.readdirSync('docs/app-map').some((f) => /design-spec/i.test(f)) || fs.existsSync('DESIGN-SPEC.md');
      add('design-spec tồn tại', hasDesignSpec ? 'PASS' : 'WARN',
        hasDesignSpec ? '' : 'repo có UI (tailwind/globals.css) mà chưa có design-spec trong app-map — pipeline ui-design-logic bước 1 chưa chạy');
    }
  }

  // NT13 — claims registry (guarded: chỉ khi tồn tại, repo không parallel thì im lặng)
  const common = git(['rev-parse', '--git-common-dir']);
  if (common.status === 0) {
    const cdir = path.join(path.resolve(process.cwd(), common.stdout), 'ai-simple', 'claims');
    if (fs.existsSync(cdir)) {
      const cfiles = fs.readdirSync(cdir).filter((f) => f.endsWith('.json') && !f.includes('.tmp-'));
      let stale = 0, orphan = 0;
      for (const f of cfiles) {
        try {
          const c = JSON.parse(fs.readFileSync(path.join(cdir, f), 'utf8'));
          if (c.type === 'run-lease') continue;
          if (c.lease_until_epoch && Date.now() / 1000 > c.lease_until_epoch) stale++;
          if (c.branch && git(['rev-parse', '--verify', '--quiet', c.branch]).status !== 0) orphan++;
        } catch { orphan++; } // file tay/hỏng cũng là orphan — WARN, không crash
      }
      add(`claims registry: ${cfiles.length} claim (NT13)`, stale + orphan === 0 ? 'PASS' : 'WARN',
        [stale ? `${stale} STALE — \`ai-simple parallel recover\` (không silent takeover)` : '',
         orphan ? `${orphan} orphan/hỏng (branch không còn hoặc JSON tay) — \`ai-simple parallel release\`` : ''].filter(Boolean).join('; '));
      // Journal mồ côi (m4): crash sau release-claim nhưng trước dọn journal
      const jdir = path.join(path.resolve(process.cwd(), common.stdout), 'ai-simple', 'journal');
      if (fs.existsSync(jdir)) {
        const orphanJ = fs.readdirSync(jdir).filter((f) => f.endsWith('.json') && !fs.existsSync(path.join(cdir, f.replace(/^merging-/, ''))));
        if (orphanJ.length) add(`journal mồ côi: ${orphanJ.length}`, 'WARN', `claim tương ứng đã release — xóa được: ${orphanJ.join(', ')}`);
      }
    }
  }

  let fail = 0;
  for (const c of checks) {
    console.log(`  ${c.status.padEnd(5)} ${c.name}${c.note ? ' — ' + c.note : ''}`);
    if (c.status === 'FAIL') fail++;
  }
  console.log(`\n${fail === 0 ? 'OK: setup lành mạnh.' : `FAIL: ${fail} mục hỏng — sửa theo ghi chú trên.`}`);
  process.exit(fail === 0 ? 0 : 1);
}

function cmdUpdate(args) {
  if (!inGitRepo()) { console.error('FAIL: không phải git repo.'); process.exit(1); }
  console.log(`ai-simple v${PKG.version} — update (giữ nguyên CONFIG người dùng)\n`);
  // Đọc dấu version TRƯỚC khi ghi đè — để cuối lệnh in đúng delta CHANGELOG (v-cũ → v-mới]
  const oldVersion = readVersionMarker('.githooks/pre-commit') || readVersionMarker('scripts/doc-health-report.sh');
  const PRESERVE = {
    '.githooks/pre-commit': ['MIGRATIONS_PATTERN=', 'DB_DOC_PATTERN=', 'CLAUDE_MD_CHAR_BUDGET=', 'SELF_TEST_MIGRATION_SAMPLE=', 'SELF_TEST_DOC_SAMPLE='],
    'scripts/doc-health-report.sh': ['MIGRATIONS_DIR=', 'DOC_LAG_MAX_DAYS='],
  };
  const SRC = { '.githooks/pre-commit': 'pre-commit.hook.template', 'scripts/doc-health-report.sh': 'doc-health-report.sh.template' };
  // v1.19.0 (audit độc lập 2026-08-16, B2) — COMMAND md cũng phải được refresh: chúng là văn bản
  // LOAD-BEARING (/audit chấm theo bảng nguyên tắc trong chính nó). Trước đây `update` chỉ refresh 2 file
  // và `copyTemplate` SKIP khi file tồn tại ⇒ mọi project init trước v1.18.0 giữ "14 nguyên tắc" VĨNH VIỄN,
  // /audit chấm thiếu hẳn NT15 mà không lệnh nào sửa được. Không có CONFIG người dùng trong các file này,
  // nhưng vẫn backup .bak trước khi ghi (user có thể đã sửa tay).
  const CMD_SRC = { '.claude/commands/audit.md': 'audit.command.md.template', '.claude/commands/fl.md': 'fl.command.md.template', '.claude/commands/learn.md': 'learn.command.md.template' };

  for (const [dest, keys] of Object.entries(PRESERVE)) {
    const preserved = {};
    if (fs.existsSync(dest)) {
      const old = fs.readFileSync(dest, 'utf8');
      for (const k of keys) { const m = old.match(new RegExp(`^${k}.*$`, 'm')); if (m) preserved[k] = m[0]; }
      fs.copyFileSync(dest, dest + '.bak');
    }
    let content = stampVersion(fs.readFileSync(TPL(SRC[dest]), 'utf8'));
    for (const [k, line] of Object.entries(preserved)) content = content.replace(new RegExp(`^${k}.*$`, 'm'), () => line);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content, 'utf8');
    try { fs.chmodSync(dest, 0o755); } catch {}
    console.log(`  OK    ${dest} → v${PKG.version} (config giữ: ${Object.keys(preserved).length}/${keys.length}; bản cũ: ${dest}.bak)`);
  }
  for (const [dest, tpl] of Object.entries(CMD_SRC)) {
    if (!fs.existsSync(dest)) continue;   // project không dùng command này → không tự thêm
    const now = fs.readFileSync(dest, 'utf8');
    const next = stampVersion(fs.readFileSync(TPL(tpl), 'utf8'));
    if (now.replace(/\r\n/g, '\n') === next.replace(/\r\n/g, '\n')) { console.log(`  OK    ${dest} — đã khớp bản ${PKG.version}`); continue; }
    fs.copyFileSync(dest, dest + '.bak');
    fs.writeFileSync(dest, next, 'utf8');
    console.log(`  OK    ${dest} → v${PKG.version} (văn bản load-bearing; bản cũ: ${dest}.bak)`);
  }
  if (fs.existsSync('.github/workflows/doc-health.yml') || args.workflow) {
    const r = copyTemplate(TPL('doc-health.workflow.yml.template'), '.github/workflows/doc-health.yml', { force: true });
    console.log(`  OK    ${r.dest}`);
  }

  // Wave 3 — junction-migration trong update (năng lực MỚI; SRC map cũ chỉ refresh 2 file):
  // thay junction/skill giữa lúc session Claude Code đang mở → skill load dở trạng thái trung gian.
  // Cổng consent: flag --i-closed-sessions do user gõ (vết trong lịch sử lệnh). Heuristic mtime chỉ là
  // THÔNG-TIN-THAM-KHẢO in ra, KHÔNG chặn (mtime đổi vì nhiều lý do — vừa BLOCK oan vừa an-toàn-giả).
  const skillsSrcU = path.join(PKG_ROOT, 'skills');
  if (fs.existsSync(skillsSrcU) && fs.existsSync('.claude')) {
    const needs = [];
    for (const s of fs.readdirSync(skillsSrcU)) {
      const src = path.join(skillsSrcU, s);
      if (!fs.statSync(src).isDirectory()) continue;
      const dst = path.join('.claude', 'skills', s);
      let st = null; try { st = fs.lstatSync(dst); } catch { /* chưa có */ }
      if (!st || !st.isSymbolicLink()) needs.push(s);
    }
    if (needs.length) {
      let mt = '(không đọc được)';
      try { mt = fs.statSync('.claude').mtime.toISOString(); } catch { /* tham khảo */ }
      console.log(`\nJunction skill cần tạo/thay: ${needs.join(', ')} (mtime .claude gần nhất: ${mt} — nếu có session Claude Code đang mở trên repo này, đóng trước)`);
      if (!args['i-closed-sessions']) {
        console.log('  SKIP  phần junction — chạy lại: ai-simple update --i-closed-sessions (kèm --replace-stale-skills nếu muốn thay thư mục copy stale)');
      } else {
        fs.mkdirSync(path.join('.claude', 'skills'), { recursive: true });
        for (const s of needs) installSkillJunction(path.join(skillsSrcU, s), path.join('.claude', 'skills', s), s, { replaceStale: !!args['replace-stale-skills'] });
        warnTrackedSkillPaths();
        console.log('  → Restart session Claude Code để skill nạp bản mới.');
      }
    }
  }
  console.log('\nSelf-test:');
  let failed = false;
  for (const t of runSelfTests()) { console.log(`  ${t.ok ? 'PASS ' : 'FAIL '} ${t.name}`); if (!t.ok) { failed = true; console.log(t.out.split('\n').map((l) => '        ' + l).join('\n')); } }
  if (failed) console.log('\nFAIL: rollback bằng file .bak nếu cần (mv .bak về tên cũ).');

  // "Release notes + việc cần làm lại" (phần OS có mà update mù version thiếu):
  // in các mục CHANGELOG trong khoảng (bản-cũ → bản-mới] kèm checklist RE-APPLY.
  const clPath = path.join(PKG_ROOT, 'CHANGELOG.md');
  if (!failed && oldVersion && semverCmp(oldVersion, PKG.version) < 0 && fs.existsSync(clPath)) {
    const delta = parseChangelogDelta(fs.readFileSync(clPath, 'utf8'), oldVersion, PKG.version);
    if (delta.length) {
      console.log(`\nĐổi gì từ v${oldVersion} → v${PKG.version} (chi tiết: CHANGELOG.md trong package):`);
      const todos = [];
      for (const d of delta) {
        console.log(`  • ${d.title}`);
        for (const r of d.reapply) todos.push(`v${d.version}: ${r}`);
      }
      if (todos.length) {
        console.log('\nRE-APPLY — việc project này cần làm lại sau update:');
        for (const t of todos) console.log(`  [ ] ${t}`);
      } else console.log('\nRE-APPLY: không có — update xong là xong, không phải rà lại gì.');
    }
  }
  process.exit(failed ? 1 : 0);
}

function passthrough(scriptArgs) {
  if (!fs.existsSync('scripts/doc-health-report.sh')) { console.error('FAIL: thiếu scripts/doc-health-report.sh — chạy `ai-simple init` trước.'); process.exit(1); }
  const r = sh(['scripts/doc-health-report.sh', ...scriptArgs]);
  process.stdout.write(r.stdout); process.stderr.write(r.stderr);
  process.exit(r.status);
}

// Wave 2b: chạy nhiều self-test ĐỒNG THỜI (process độc lập, spawn-bound trên Windows) rồi in
// THEO THỨ TỰ CỐ ĐỊNH → wall-clock giảm, output vẫn ổn định/so-diff-được.
function shAsync(scriptAndArgs, opts = {}) {
  return new Promise((resolve) => {
    const shPath = findSh();
    if (!shPath) return resolve({ status: 127, stdout: '', stderr: 'khong tim thay sh' });
    const p = spawn(shPath, scriptAndArgs, { cwd: opts.cwd || process.cwd() });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve({ status: code === null ? 1 : code, stdout: out, stderr: err }));
    p.on('error', (e) => resolve({ status: 1, stdout: '', stderr: String(e) }));
  });
}
function nodeAsync(args, opts = {}) {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, args, { cwd: opts.cwd || process.cwd() });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; }); p.stderr.on('data', (d) => { err += d; });
    p.on('close', (code) => resolve({ status: code === null ? 1 : code, stdout: out, stderr: err }));
    p.on('error', (e) => resolve({ status: 1, stdout: '', stderr: String(e) }));
  });
}

async function cmdSelfTest(args = {}) { // dùng cho `npm test` của chính package: chạy self-test template + skill-verifier
  let failed = false;
  const MUT = path.join(PKG_ROOT, 'scripts', 'mutation-suite.sh');
  // v1.18.0 (audit 2026-08-16) — HAI TẦNG: `--fast` cho vòng lặp sửa-chạy của PR thường (bỏ 2 job
  // nặng nhất: hook self-test ~56s và mutation full ~30s, cả hai đều spawn hàng chục git subprocess);
  // full (mặc định, dùng cho pre-push/CI) chạy tất cả. Job nặng đánh dấu slow:true để một chỗ quyết định.
  // v1.19.0 (audit độc lập, M5) — GUARD: `--fast` bỏ hook self-test (~21 fixture, artifact an toàn
  // nhất của sản phẩm). Nếu chính hook template/bản cài đang dirty hoặc staged thì fast KHÔNG được
  // bỏ nó — đúng lúc cần lưới nhất lại là lúc lưới bị tắt.
  let FAST = !!args.fast;
  if (FAST) {
    const ch = spawnSync('git', ['status', '--porcelain', '--', 'templates/pre-commit.hook.template', '.githooks/pre-commit'], { encoding: 'utf8', cwd: PKG_ROOT });
    if ((ch.stdout || '').trim()) {
      FAST = false;
      console.log('INFO --fast bị VÔ HIỆU: hook template/bản cài đang thay đổi → chạy đủ lưới hook (guard M5)');
    }
  }
  const jobs = [
    ['template hook --self-test', () => shAsync([TPL('pre-commit.hook.template'), '--self-test'], { cwd: PKG_ROOT }), null, true],
    ['template report --self-test', () => shAsync([TPL('doc-health-report.sh.template'), '--self-test'], { cwd: PKG_ROOT })],
    ['template pretooluse-guard --self-test', () => shAsync([TPL('pretooluse-git-guard.sh'), '--self-test'], { cwd: PKG_ROOT })],
    ['script metadata-words --self-test', () => nodeAsync([path.join(PKG_ROOT, 'scripts', 'metadata-words.js'), '--self-test'], { cwd: PKG_ROOT }), path.join(PKG_ROOT, 'scripts', 'metadata-words.js')],
    ['script perf-budget --self-test', () => nodeAsync([path.join(PKG_ROOT, 'scripts', 'perf-budget.js'), '--self-test'], { cwd: PKG_ROOT }), path.join(PKG_ROOT, 'scripts', 'perf-budget.js')],
    ['script perf-budget (hook <=20s o quy mo 20 doc/80 path)', () => nodeAsync([path.join(PKG_ROOT, 'scripts', 'perf-budget.js')], { cwd: PKG_ROOT }), path.join(PKG_ROOT, 'scripts', 'perf-budget.js'), true],
    ['script eval-runner --self-test (schema evals + tách dữ liệu blind)', () => nodeAsync([path.join(PKG_ROOT, 'scripts', 'eval-runner.js'), '--self-test'], { cwd: PKG_ROOT }), path.join(PKG_ROOT, 'scripts', 'eval-runner.js')],
    ['script mutation-suite --self-test', () => shAsync([MUT, '--self-test'], { cwd: PKG_ROOT }), MUT],
    ['script mutation-suite (full: 0 false-pass/0 false-block)', () => shAsync([MUT], { cwd: PKG_ROOT }), MUT, true],
  ];
  // Skill-verifier fixtures (G1 bộ chấm điểm — self-test hợp nhất): MỌI skills/*/*-verify.sh có
  // --self-test phải chạy trong `npm test`, không suite mồ côi (trước đây chỉ security-verify được nối,
  // 3 cái kia PASS nhưng ngoài gate -> rot lúc nào không biết). Auto-discover, không hardcode tên.
  const skillsDir = path.join(PKG_ROOT, 'skills');
  const verifiers = fs.existsSync(skillsDir)
    ? fs.readdirSync(skillsDir)
        .map((s) => {
          const dir = path.join(skillsDir, s);
          if (!fs.statSync(dir).isDirectory()) return null;
          // -verify.sh (cổng spec) + -lane.sh (classifier — hội đồng 2026-08-13): mọi script
          // có --self-test trong skill đều vào gate, không script nào rot ngoài tầm nhìn
          const vfs = fs.readdirSync(dir).filter((f) => /-(verify|lane)\.sh$/.test(f));
          return vfs.length ? vfs.map((vf) => ({ skill: s, file: path.join(dir, vf) })) : null;
        })
        .filter(Boolean)
        .flat()
        .sort((a, b) => a.skill.localeCompare(b.skill) || a.file.localeCompare(b.file))
    : [];
  for (const { skill, file } of verifiers)
    jobs.push([`skill ${skill} ${path.basename(file)} --self-test`, () => shAsync([file, '--self-test'], { cwd: PKG_ROOT })]);
  // Chạy ĐỒNG THỜI, in theo thứ tự khai báo (ổn định như bản tuần tự).
  // Job trỏ vào scripts/ chỉ tồn tại ở REPO NGUỒN (package.json files[] không ship scripts/ — đo bằng
  // npm pack: self-test từ tarball từng báo FAIL GIẢ 3 dòng "Cannot find module"). SKIP có báo, không FAIL.
  const results = await Promise.all(jobs.map(([, run, needs, slow]) => {
    if (FAST && slow) return Promise.resolve({ skipFast: true });
    if (needs && !fs.existsSync(needs)) return Promise.resolve({ skip: true });
    return run();
  }));
  jobs.forEach(([label], i) => {
    const r = results[i];
    if (r.skipFast) { console.log(`SKIP ${label} — tier --fast (job nặng, chạy đủ ở npm test / pre-push / CI)`); return; }
    if (r.skip) { console.log(`SKIP ${label} — chỉ có trong repo nguồn (scripts/ không nằm trong tarball)`); return; }
    console.log(`${r.status === 0 ? 'PASS' : 'FAIL'} ${label}`);
    if (r.status !== 0) { failed = true; console.log(r.stdout + r.stderr); }
  });
  // Identity: guard blacklist số-cũ (2 đời regex) đã GỠ ở Wave 2a — thay bằng identity-manifest
  // enforcer WHITELIST bên dưới (đếm thực-tế + so manifest; bắt MỌI số lệch, không chỉ số cũ đã biết;
  // ca FAIL bắt buộc "14 composable principles" nằm trong fixture ranh giới của enforcer).
  // LIVE = surface tuyên bố hiện hành. v1.18.0: THÊM template ship xuống project tiêu thụ — audit
  // template từng ghi "14 nguyên tắc" và lọt guard vì scope cũ chỉ có docs của repo nguồn (audit 2026-08-16).
  // v1.21.0 (audit 2026-08-18) — HẾT WHITELIST TAY: quét MỌI file .md/.md.template SẼ ĐI THEO
  // TARBALL (nguồn = package.json "files" — đúng thứ consumer nhận) + README/CLAUDE.md/scoring.md
  // của repo nguồn. Whitelist cũ bỏ sót surface ĐANG SHIP: `docs/adr/001` ghi "Hiện hành: 14 nguyên
  // tắc" nằm trong tarball ⇒ consumer npm đọc số sai mà không gate nào canh.
  // MIỄN TRỪ phải TƯỜNG MINH bằng marker `identity-exempt` trong 30 dòng đầu — không miễn theo thư
  // mục, vì "ADR là lịch sử" từng bị chính dòng tự nhận "Hiện hành" lợi dụng.
  const pkgFiles = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'package.json'), 'utf8')).files || [];
  const walkMd = (rel, acc) => {
    const abs = path.join(PKG_ROOT, rel);
    if (!fs.existsSync(abs)) return acc;
    if (fs.statSync(abs).isFile()) { if (/\.md(\.template)?$/.test(rel)) acc.push(rel); return acc; }
    for (const e of fs.readdirSync(abs)) walkMd(rel.replace(/\\/g, '/') + '/' + e, acc);
    return acc;
  };
  const LIVE = [...new Set([...pkgFiles, 'README.md', 'CLAUDE.md', 'docs/scoring.md'].flatMap((f) => walkMd(f, [])))]
    .filter((f) => f !== 'CHANGELOG.md')   // nhật ký phát hành: số cũ là DỮ KIỆN lịch sử
    .filter((f) => !/identity-exempt/.test(fs.readFileSync(path.join(PKG_ROOT, f), 'utf8').split('\n').slice(0, 30).join('\n')));
  // skills-yaml (v1.21.0): agents/openai.yaml là metadata packaging cho runtime khác — nếu không có
  // gate, nó sẽ lệch SKILL.md ngay lần sửa description đầu tiên (đúng lớp drift repo này hay mắc).
  // Luật: mỗi skill phải có file; name khớp thư mục; description là TIỀN TỐ của description trong
  // SKILL.md (cho phép bản yaml ngắn hơn, cấm bản yaml nói khác).
  {
    let yOk = true;
    for (const s of fs.readdirSync(path.join(PKG_ROOT, 'skills')).filter((d) => fs.statSync(path.join(PKG_ROOT, 'skills', d)).isDirectory())) {
      const yp = path.join(PKG_ROOT, 'skills', s, 'agents', 'openai.yaml');
      if (!fs.existsSync(yp)) { failed = true; yOk = false; console.log(`FAIL skills-yaml: skills/${s}/agents/openai.yaml không tồn tại`); continue; }
      const y = fs.readFileSync(yp, 'utf8');
      const nm = (y.match(/^name:\s*(\S+)/m) || [])[1];
      const dsc = (y.match(/^description:\s*"([\s\S]*?)"\s*$/m) || [])[1];
      if (nm !== s) { failed = true; yOk = false; console.log(`FAIL skills-yaml: ${s}: name='${nm}' ≠ tên thư mục`); }
      const skillDesc = ((fs.readFileSync(path.join(PKG_ROOT, 'skills', s, 'SKILL.md'), 'utf8').match(/^description:\s*(.*)$/m) || [])[1] || '').replace(/^"|"$/g, '');
      if (!dsc || !skillDesc.startsWith(dsc.slice(0, Math.min(40, dsc.length)))) {
        failed = true; yOk = false;
        console.log(`FAIL skills-yaml: ${s}: description trong openai.yaml LỆCH SKILL.md (phải là tiền tố; sửa SKILL.md thì sync yaml cùng commit)`);
      }
    }
    if (yOk) console.log('PASS skills-yaml (5/5 skill có agents/openai.yaml, name + description khớp SKILL.md)');
  }
  // Cross-cut mktemp fail-fast (v1.11.0 — Lỗ an toàn số 1): tập quét ĐỘNG git ls-files '*.sh' '*.sh.template'
  // + template hook. Dòng chứa $(mktemp thiếu CẢ '|| exit' LẪN '|| return' cùng dòng → FAIL
  // (mktemp fail mà chạy tiếp = self-test ghi ~40 commit lạ + đổi branch NGAY TRONG repo thật — đã repro).
  let mkOk = true;
  const noGuard = (line) => line.includes('$(mktemp') && !/\|\|\s*exit/.test(line) && !/\|\|\s*return/.test(line);
  const lsr = spawnSync('git', ['ls-files', '*.sh', '*.sh.template'], { encoding: 'utf8', cwd: PKG_ROOT });
  const mkFiles = new Set((lsr.stdout || '').split('\n').map(s => s.trim()).filter(Boolean));
  mkFiles.add('templates/pre-commit.hook.template');
  for (const f of mkFiles) {
    const p = path.join(PKG_ROOT, f);
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      if (noGuard(line)) { failed = true; mkOk = false; console.log(`FAIL mktemp-guard: ${f}:${i + 1} có $(mktemp thiếu '|| exit'/'|| return' cùng dòng`); }
    });
  }
  // Fixture chống-oan của chính assertion + ca FAIL bắt buộc
  for (const l of ['T=$(mktemp -d) || exit 1', 'T=$(mktemp -d) && cd "$T" || exit 1', 'X=$(mktemp) || return 1'])
    if (noGuard(l)) { failed = true; mkOk = false; console.log('FAIL mktemp-guard-fixture: dòng guard hợp lệ bị bắt oan'); }
  if (!noGuard('T=$(mktemp -d); RC=0')) { failed = true; mkOk = false; console.log('FAIL mktemp-guard-fixture: dòng thiếu guard không bị bắt'); }
  if (mkOk) console.log('PASS mktemp-guard (tập quét động .sh/.sh.template: mọi $(mktemp có fail-fast cùng dòng; fixture chống-oan xanh)');
  // Identity manifest enforcer (Wave 2a — thay guard blacklist số-cũ bằng WHITELIST đếm-thực-tế):
  // (1) manifest vs THỰC TẾ: đếm file methodology/NN-*.md == principles; đếm skill (4 con + root) == skills.
  // (2) manifest vs DOCS SỐNG: mọi biến-thể "N nguyên tắc/principles/lớp/layers/N-skill" phải khớp số manifest.
  //     Ranh giới chống-oan (đo 2026-08-15): cụm subset hợp lệ dùng số nhỏ ("1 nguyên tắc", "3 lớp") →
  //     chỉ bắt N≥10 cho principles-VN, N≥4 cho layers; English + N-skill bắt mọi N lệch.
  {
    let idmOk = true;
    const MF = JSON.parse(fs.readFileSync(path.join(PKG_ROOT, 'system-manifest.json'), 'utf8'));
    const nPrin = fs.readdirSync(path.join(PKG_ROOT, 'methodology')).filter(f => /^\d{2}-.*\.md$/.test(f)).length;
    // Wave 3: foundation skill đã vào skills/ai-simple-product-dev/ — đếm = số thư mục skills/ (không +1 root nữa)
    const nSkills = fs.readdirSync(path.join(PKG_ROOT, 'skills')).filter(s => fs.statSync(path.join(PKG_ROOT, 'skills', s)).isDirectory()).length;
    if (nPrin !== MF.principles) { failed = true; idmOk = false; console.log(`FAIL identity-manifest: methodology/ có ${nPrin} nguyên tắc ≠ manifest ${MF.principles}`); }
    if (nSkills !== MF.skills) { failed = true; idmOk = false; console.log(`FAIL identity-manifest: đếm được ${nSkills} thư mục skill ≠ manifest ${MF.skills}`); }
    const idmScan = (text, rel, sink) => {
      const bad = sink || [];
      for (const m of text.matchAll(/(\d+)(?: \w+)? principles/gi)) if (+m[1] !== MF.principles) bad.push(m[0]);
      for (const m of text.matchAll(/(\d+) nguyên tắc/g)) if (+m[1] >= 10 && +m[1] !== MF.principles) bad.push(m[0]);
      for (const m of text.matchAll(/(\d+) (?:lớp|layers)/gi)) if (+m[1] >= 4 && +m[1] !== MF.layers) bad.push(m[0]);
      for (const m of text.matchAll(/(\d+)-skill/gi)) if (+m[1] !== MF.skills) bad.push(m[0]);
      // v1.18.0 (audit 2026-08-16) — DRIFT NGỮ NGHĨA dạng RANGE: bảng profile ghi "01–14" trong khi
      // manifest là 15; identity guard cũ chỉ đếm dạng "N nguyên tắc" nên không bắt được. Range
      // 01–NN chỉ có một nghĩa trong hệ này: liệt kê nguyên tắc từ 01 tới NN.
      // m6 (audit độc lập): SIẾT — chỉ dải zero-padded "01–NN" mới là cách hệ này liệt kê nguyên tắc.
      // Dải thường ("mục 1–20", "Wave 1-12", "chương 1–14") KHÔNG còn bị bắt oan.
      for (const m of text.matchAll(/\b01\s*[–-]\s*(\d{1,2})\b/g)) if (+m[1] >= 10 && +m[1] !== MF.principles) bad.push(m[0]);
      if (sink) return;   // chế độ fixture: chỉ thu thập vào sink, không phán/không in
      for (const b of bad) { failed = true; idmOk = false; console.log(`FAIL identity-manifest: '${b}' trong ${rel} lệch manifest (${MF.principles} nguyên tắc / ${MF.layers} lớp / ${MF.skills}-skill)`); }
    };
    for (const f of LIVE) {
      const p = path.join(PKG_ROOT, f);
      if (fs.existsSync(p)) idmScan(fs.readFileSync(p, 'utf8'), f);
    }
    // Fixture ranh giới (chạy trên chuỗi tổng hợp, không đụng file thật):
    const mustCatch = ['14 nguyên tắc', '14 composable principles', '16 principles', '5 lớp', '4 layers', '4-skill', '6-skill',
      '01–14', '01-14', 'bật 01–12'];
    const mustPass = ['15 nguyên tắc', '15 core principles', '6 lớp', '6 layers', '5-skill', '1 nguyên tắc', '3 lớp',
      '01–15', '01-15', 'mục 1-3', 'bước 1–2',
      // m6 (audit độc lập): dải THƯỜNG không được bắt oan — chỉ dải zero-padded 01–NN mới là cách hệ liệt kê nguyên tắc
      'mục 1–20', 'Wave 1-12', 'chương 1–14', 'SKU 1-14 đã bán', '2026-08-14', 'dòng 1-100'];
    // m7 (audit độc lập 2026-08-16): fixture chấm CHÍNH hàm production, không phải bản copy-paste —
    // sửa idmScan mà quên bản sao thì 21 fixture vẫn xanh trong khi production đã hỏng (cùng lớp lỗi
    // với "fixture ghép chuỗi LF nên không bao giờ chạm CRLF").
    const hits = (str) => { const found = []; idmScan(str, null, found); return found.length; };
    for (const s of mustCatch) if (hits(s) === 0) { failed = true; idmOk = false; console.log(`FAIL identity-manifest-fixture: '${s}' phải bị bắt mà lọt`); }
    for (const s of mustPass) if (hits(s) !== 0) { failed = true; idmOk = false; console.log(`FAIL identity-manifest-fixture: '${s}' bị bắt oan`); }
    if (idmOk) console.log(`PASS identity-manifest (thực-tế ${nPrin} nguyên tắc/${nSkills} skill khớp manifest; whitelist docs sống + fixture ranh giới xanh)`);
  }
  // Fixture junction collision-fix (Wave 3 — temp, không đụng repo): idempotent + stale-dir + bak-exists
  {
    let jOk = true;
    const os = require('os');
    const jt = fs.mkdtempSync(path.join(os.tmpdir(), 'ais-junc-'));
    const jsrc = path.join(jt, 'srcskill'); fs.mkdirSync(jsrc);
    fs.writeFileSync(path.join(jsrc, 'SKILL.md'), '---\nname: x\ndescription: ban moi\n---\n', 'utf8');
    const silent = () => {};
    const jd1 = path.join(jt, 'dst');
    const r1 = installSkillJunction(jsrc, jd1, 'x', { log: silent });
    const r2 = installSkillJunction(jsrc, jd1, 'x', { log: silent });
    if (!(r1 === 'created' && r2 === 'ok')) { failed = true; jOk = false; console.log(`FAIL junction-fixture: created→no-op, ra (${r1}/${r2})`); }
    const jd2 = path.join(jt, 'dst2'); fs.mkdirSync(jd2);
    fs.writeFileSync(path.join(jd2, 'SKILL.md'), '---\ndescription: ban stale\n---\n', 'utf8');
    const r3 = installSkillJunction(jsrc, jd2, 'y', { log: silent });
    const stillDir = fs.lstatSync(jd2).isDirectory() && !fs.lstatSync(jd2).isSymbolicLink();
    if (!(r3 === 'stale-kept' && stillDir)) { failed = true; jOk = false; console.log(`FAIL junction-fixture: stale-dir không flag phải GIỮ NGUYÊN (${r3})`); }
    const r4 = installSkillJunction(jsrc, jd2, 'y', { replaceStale: true, log: silent });
    if (!(r4 === 'created' && fs.lstatSync(jd2).isSymbolicLink() && fs.existsSync(jd2 + '.bak'))) { failed = true; jOk = false; console.log(`FAIL junction-fixture: replace-stale phải backup .bak + thay junction (${r4})`); }
    fs.rmSync(jd2, { force: true }); fs.mkdirSync(jd2);
    const r5 = installSkillJunction(jsrc, jd2, 'y', { replaceStale: true, log: silent });
    if (r5 !== 'bak-exists') { failed = true; jOk = false; console.log(`FAIL junction-fixture: .bak sẵn có phải DỪNG không bak-đè (${r5})`); }
    fs.rmSync(jt, { recursive: true, force: true });
    if (jOk) console.log('PASS junction-fixture (idempotent; stale-dir giữ nguyên khi thiếu flag; replace backup .bak; không bak-đè)');
  }
  // Cross-cut coverage guard: 4 skill anh em PHẢI nhắc security-logic (sơ đồ 5-skill / handoff) —
  // identity-numbers chỉ đếm số, guard này bắt "skill thiếu sơ đồ" (reviewer cuối trừ điểm đúng lỗ này).
  let xcutOk = true;
  for (const s of ['ba-flow-logic', 'ui-design-logic', 'ui-ux-triage']) {
    const p = path.join(PKG_ROOT, 'skills', s, 'SKILL.md');
    if (fs.existsSync(p) && !fs.readFileSync(p, 'utf8').includes('security-logic')) {
      failed = true; xcutOk = false;
      console.log(`FAIL cross-cut: skills/${s}/SKILL.md không nhắc security-logic — thiếu sơ đồ 5-skill/handoff (NT14)`);
    }
  }
  if (xcutOk) console.log('PASS cross-cut (cả 3 skill anh em khai security-logic cắt ngang)');

  // Update-channel fixtures (YELLOW — đổi hành vi doctor/update): fixture chống-oan là bắt buộc,
  // ca quan trọng nhất: OFFLINE KHÔNG ĐƯỢC THROW/FAIL (bài học design-verify BLOCK oan dogfood).
  const envSave = process.env.AI_SIMPLE_NO_UPDATE_CHECK;
  delete process.env.AI_SIMPLE_NO_UPDATE_CHECK;
  const ut = [];
  ut.push(['semver: 1.10.0 > 1.9.0 (so số, không so chuỗi)', semverCmp('1.10.0', '1.9.0') > 0]);
  ut.push(['semver: bằng nhau → 0', semverCmp('1.9.0', '1.9.0') === 0]);
  const sampleCl = ['# Changelog', '', '## v1.10.0 — 2026-08-14 (kênh update)', '- x',
    '- **RE-APPLY**: chạy lại design-verify trên spec hiện có', '',
    '## v1.9.0 — 2026-08-14 (NT15)', '- y', '', '## v1.8.0 — 2026-08-13 (design)', '- z', ''].join('\n');
  const d1 = parseChangelogDelta(sampleCl, '1.8.0', '1.10.0');
  ut.push(['changelog delta (1.8.0→1.10.0] = 2 mục, mới nhất trước', d1.length === 2 && d1[0].version === '1.10.0' && d1[1].version === '1.9.0']);
  ut.push(['changelog RE-APPLY trích đúng dòng', d1[0].reapply.length === 1 && d1[0].reapply[0].includes('design-verify') && d1[1].reapply.length === 0]);
  // v1.17.1 — ca CRLF: bug thật bắt trên dữ liệu sống (CHANGELOG.md working tree Windows là CRLF;
  // `.` trong JS không khớp `\r` → RE-APPLY chết im lặng). Fixture LF-thuần ở trên KHÔNG chạm ca này.
  const d1crlf = parseChangelogDelta(sampleCl.replace(/\n/g, '\r\n'), '1.8.0', '1.10.0');
  ut.push(['changelog CRLF (Windows) vẫn trích được RE-APPLY — chống chết-im-lặng',
    d1crlf.length === 2 && d1crlf[0].reapply.length === 1 && d1crlf[0].reapply[0].includes('design-verify')]);
  // Ca dữ liệu SỐNG: CHANGELOG thật của package phải trích được ≥1 RE-APPLY trong 5 version gần nhất —
  // fixture tổng hợp không thay được việc kiểm chính file sẽ đi theo release.
  {
    const realTxt = fs.readFileSync(path.join(PKG_ROOT, 'CHANGELOG.md'), 'utf8');
    const vs = [...realTxt.matchAll(/^## v([0-9][\w.\-]*)/gm)].map((m) => m[1]);
    const from = vs[Math.min(5, vs.length - 1)];
    const dReal = parseChangelogDelta(realTxt, from, vs[0]);
    ut.push([`changelog THẬT (v${from}→v${vs[0]}) trích được RE-APPLY`, dReal.reduce((s, x) => s + x.reapply.length, 0) > 0]);
  }
  ut.push(['changelog delta rỗng khi đã mới nhất', parseChangelogDelta(sampleCl, '1.10.0', '1.10.0').length === 0]);
  const offline = await checkLatestVersion({ fetchFn: () => Promise.reject(new Error('offline')), cachePath: null });
  ut.push(['update-check OFFLINE → null, không throw (chống FAIL oan doctor)', offline === null]);
  let netCalls = 0;
  // Fake mạng-treo phải tôn trọng abort signal (như fetch thật) — đây chính là đường timeout được test
  const hang = (url, opts) => new Promise((_, rej) => opts.signal.addEventListener('abort', () => rej(new Error('aborted'))));
  const slow = await checkLatestVersion({ fetchFn: hang, cachePath: null, timeoutMs: 100 });
  ut.push(['update-check TIMEOUT (mạng treo) → null qua abort, không treo doctor', slow === null]);
  const tmpCache = path.join(require('os').tmpdir(), `ai-simple-selftest-${process.pid}.json`);
  fs.writeFileSync(tmpCache, JSON.stringify({ checked_epoch: Math.floor(Date.now() / 1000), latest: '9.9.9', source: 'npm', npm: '9.9.9', github: null }), 'utf8');
  netCalls = 0;
  const cached = await checkLatestVersion({ fetchFn: () => { netCalls++; return Promise.reject(new Error('x')); }, cachePath: tmpCache });
  ut.push(['update-check cache tươi (≤7 ngày) → dùng cache, 0 lần gọi mạng', !!cached && cached.latest === '9.9.9' && cached.cached === true && netCalls === 0]);
  const mkRes = (v) => Promise.resolve({ ok: true, json: () => Promise.resolve({ version: v }) });
  const gh = await checkLatestVersion({ fetchFn: (url) => mkRes(url.includes('github') ? '2.1.0' : '2.0.0'), cachePath: null });
  ut.push(['update-check GitHub mới hơn npm → source github + lệnh đường github', !!gh && gh.latest === '2.1.0' && gh.source === 'github' && updateCommandFor(gh).includes('github:Long-Forfun')]);
  const npmUp = await checkLatestVersion({ fetchFn: () => mkRes('2.0.0'), cachePath: null });
  ut.push(['update-check npm đủ mới → lệnh đường npm ngắn', !!npmUp && updateCommandFor(npmUp) === 'npx ai-simple@latest update']);
  process.env.AI_SIMPLE_NO_UPDATE_CHECK = '1';
  ut.push(['AI_SIMPLE_NO_UPDATE_CHECK=1 → tắt hẳn, trả null', (await checkLatestVersion({ fetchFn: () => mkRes('9.9.9'), cachePath: null })) === null]);
  if (envSave === undefined) delete process.env.AI_SIMPLE_NO_UPDATE_CHECK; else process.env.AI_SIMPLE_NO_UPDATE_CHECK = envSave;
  try { fs.unlinkSync(tmpCache); } catch { /* dọn best-effort */ }
  for (const [name, ok] of ut) { console.log(`${ok ? 'PASS' : 'FAIL'} update-channel: ${name}`); if (!ok) failed = true; }
  // CHANGELOG.md thật phải parse được (format drift thì kênh RE-APPLY chết im lặng).
  // Check LIÊN TỤC minor-version, không chỉ mục đầu — bug thật đã bắt: edit nuốt heading ## v1.9.0
  // làm body v1.9.0 merge im lặng vào mục trên, RE-APPLY gắn nhầm version.
  const realCl = fs.readFileSync(path.join(PKG_ROOT, 'CHANGELOG.md'), 'utf8');
  const realDelta = parseChangelogDelta(realCl, '0.0.0', PKG.version);
  const versions = realDelta.map((d) => d.version);
  const minors = versions.filter((v) => v.endsWith('.0') || true).map((v) => v.split('.').slice(0, 2).join('.'));
  const missing = [];
  for (let mi = 1; mi <= parseInt(PKG.version.split('.')[1], 10); mi++) if (!minors.includes(`1.${mi}`)) missing.push(`1.${mi}`);
  const clOk = realDelta.length > 0 && realDelta[0].version === PKG.version && missing.length === 0;
  console.log(`${clOk ? 'PASS' : 'FAIL'} update-channel: CHANGELOG.md thật — ${realDelta.length} mục, đầu = v${versions[0]}, minor liên tục${missing.length ? ` (THIẾU heading v${missing.join(', v')} — nuốt heading?)` : ''}`);
  if (!clOk) failed = true;

  process.exit(failed ? 1 : 0);
}

// ---------- arg parsing & dispatch ----------
function parse(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (i + 1 < argv.length && !argv[i + 1].startsWith('--') && ['stack', 'profile'].includes(key)) args[key] = argv[++i];
      else args[key] = true;
    } else args._.push(a);
  }
  return args;
}

const HELP = `ai-simple v${PKG.version} — lớp máy của phương pháp ai-simple-product-dev
(não — /fl, /audit, verify-on-use — sống trong Claude Code skill cùng repo)

Usage:
  npx ai-simple init [--stack supabase|prisma|custom] [--profile tiny|core|full|scale|contracts|ops|optimization|parallel|security] [--force] [--no-workflow]
      Cài hook + doc-health + templates + workflow, set hooksPath, chạy self-test.
      --profile tiny: chỉ CLAUDE.md + risk tier (project < 10 file); repo nhỏ được tự gợi ý.
      Các profile ngoài tiny: bộ file cài giống core — khác biệt là nguyên tắc nào BẬT (SKILL.md §Bước 0).
  npx ai-simple parallel <plan|claim|extend|renew|status|ready|merge|recover|release|self-test>
      Nguyên tắc 13 — chia lot MECE, claim atomic có lease, worktree per lot, merge queue.
  npx ai-simple doctor
      Khám setup: hooksPath, version drift, self-tests, budget CLAUDE.md, covers coverage.
      + báo bản mới (npm + GitHub, cache 7 ngày, offline bỏ qua im lặng; tắt: AI_SIMPLE_NO_UPDATE_CHECK=1).
  npx ai-simple update [--workflow]
      Nâng hook + report lên bản CLI này, GIỮ NGUYÊN config người dùng (backup .bak);
      xong in changelog (bản-cũ → bản-mới] + checklist RE-APPLY việc cần làm lại.
  npx ai-simple doc-status
      Regenerate docs/app-map/_generated/doc-status.md (+ marker DOC-STATUS trong doc).
  npx ai-simple doc-health [--ci]
      Report doc-lag/ORPHANED/symbol chết/broken ref; --ci exit 1 để fail PR.
  npx ai-simple self-test
      Chạy self-test của hook + doc-health template (chính là \`npm test\`).
  npx ai-simple version | help

Sau khi init, hệ chạy theo SỰ KIỆN — không có lệnh nào phải nhớ:
commit → hook chặn sai; PR → CI fail nếu doc-lag; AI đọc doc → cổng đọc bắt verify.`;

const args = parse(process.argv.slice(2));
const cmd = args._[0] || 'help';
switch (cmd) {
  case 'parallel': require('../lib/parallel.js').main(process.argv.slice(3)); break;
  case 'init': cmdInit(args); break;
  case 'doctor': cmdDoctor(); break;
  case 'update': cmdUpdate(args); break;
  case 'doc-status': passthrough(['--status']); break;
  case 'doc-health': passthrough(args.ci ? ['--ci'] : []); break;
  case 'self-test': cmdSelfTest(args); break;
  case 'version': case '--version': case '-v': console.log(PKG.version); break;
  default: console.log(HELP);
}
