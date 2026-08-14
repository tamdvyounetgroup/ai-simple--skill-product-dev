#!/usr/bin/env node
/* ai-simple — CLI cho lớp máy (deterministic) của phương pháp ai-simple-product-dev.
 * Não (routing /fl, /audit, verify-on-use) sống trong Claude Code skill cùng repo;
 * CLI này cài và bảo trì phần chạy-không-cần-AI: hook, doc-health, templates, workflow.
 * Zero dependency — chỉ Node built-ins. */
'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

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
  { tpl: 'security-review.md.template',      dest: 'docs/_templates/security-review.md.template',      stackable: false },
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
    const r = copyTemplate(TPL(f.tpl), f.dest, { force: !!args.force, transform });
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
    for (const s of fs.readdirSync(skillsSrc)) {
      const src = path.join(skillsSrc, s);
      if (!fs.statSync(src).isDirectory()) continue;
      const dst = path.join('.claude', 'skills', s);
      let already = false; try { fs.lstatSync(dst); already = true; } catch { /* chưa có */ }
      if (already) { console.log(`  SKIP  .claude/skills/${s} — đã tồn tại`); continue; }
      try {
        fs.symlinkSync(src, dst, 'junction'); // Windows: junction không cần admin; POSIX: dir symlink
        console.log(`  OK    .claude/skills/${s} (junction → package — không copy, chống drift)`);
      } catch (e) {
        console.log(`  WARN  .claude/skills/${s}: không tạo được junction (${e.code || e.message}) — tạo tay theo README §Cài 5 skill`);
      }
    }
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
  process.exit(failed ? 1 : 0);
}

function cmdDoctor() {
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
  const PRESERVE = {
    '.githooks/pre-commit': ['MIGRATIONS_PATTERN=', 'DB_DOC_PATTERN=', 'CLAUDE_MD_CHAR_BUDGET=', 'SELF_TEST_MIGRATION_SAMPLE=', 'SELF_TEST_DOC_SAMPLE='],
    'scripts/doc-health-report.sh': ['MIGRATIONS_DIR=', 'DOC_LAG_MAX_DAYS='],
  };
  const SRC = { '.githooks/pre-commit': 'pre-commit.hook.template', 'scripts/doc-health-report.sh': 'doc-health-report.sh.template' };

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
  if (fs.existsSync('.github/workflows/doc-health.yml') || args.workflow) {
    const r = copyTemplate(TPL('doc-health.workflow.yml.template'), '.github/workflows/doc-health.yml', { force: true });
    console.log(`  OK    ${r.dest}`);
  }
  console.log('\nSelf-test:');
  let failed = false;
  for (const t of runSelfTests()) { console.log(`  ${t.ok ? 'PASS ' : 'FAIL '} ${t.name}`); if (!t.ok) { failed = true; console.log(t.out.split('\n').map((l) => '        ' + l).join('\n')); } }
  if (failed) console.log('\nFAIL: rollback bằng file .bak nếu cần (mv .bak về tên cũ).');
  process.exit(failed ? 1 : 0);
}

function passthrough(scriptArgs) {
  if (!fs.existsSync('scripts/doc-health-report.sh')) { console.error('FAIL: thiếu scripts/doc-health-report.sh — chạy `ai-simple init` trước.'); process.exit(1); }
  const r = sh(['scripts/doc-health-report.sh', ...scriptArgs]);
  process.stdout.write(r.stdout); process.stderr.write(r.stderr);
  process.exit(r.status);
}

function cmdSelfTest() { // dùng cho `npm test` của chính package: chạy self-test template + skill-verifier
  let failed = false;
  for (const [label, file, arg] of [['hook', TPL('pre-commit.hook.template'), '--self-test'], ['report', TPL('doc-health-report.sh.template'), '--self-test']]) {
    const r = sh([file, arg], { cwd: PKG_ROOT });
    console.log(`${r.status === 0 ? 'PASS' : 'FAIL'} template ${label} --self-test`);
    if (r.status !== 0) { failed = true; console.log(r.stdout + r.stderr); }
  }
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
  for (const { skill, file } of verifiers) {
    const r = sh([file, '--self-test'], { cwd: PKG_ROOT });
    console.log(`${r.status === 0 ? 'PASS' : 'FAIL'} skill ${skill} ${path.basename(file)} --self-test`);
    if (r.status !== 0) { failed = true; console.log(r.stdout + r.stderr); }
  }
  // Identity-numbers guard (hội đồng Fable, đề xuất #3): các "số bản sắc" (số nguyên tắc/lớp/skill)
  // drift ở ~8 chỗ mỗi lần thêm nguyên tắc. Fail khi doc HIỆN HÀNH còn số cũ. Scope CHỈ các file
  // sống (README/SKILL/methodology-README/skills) — CHANGELOG/ADR là lịch sử, được phép giữ số cũ.
  const STALE = [/1[0-3] nguyên tắc/, /1[0-3] (core )?principles/i, /[45] lớp/, /[45] layers/i, /[34]-skill/, /composable principles in [45] layers/i];
  const LIVE = ['README.md', 'SKILL.md', 'methodology/README.md',
    ...['ba-flow-logic', 'ui-design-logic', 'ui-ux-triage', 'security-logic'].map(s => `skills/${s}/SKILL.md`)];
  for (const f of LIVE) {
    const p = path.join(PKG_ROOT, f);
    if (!fs.existsSync(p)) continue;
    const body = fs.readFileSync(p, 'utf8');
    for (const re of STALE) {
      const m = body.match(re);
      if (m) { failed = true; console.log(`FAIL identity-numbers: '${m[0]}' còn trong ${f} — số bản sắc đã drift (hiện hành: 14 nguyên tắc / 6 lớp / 5-skill)`); }
    }
  }
  if (!LIVE.some(f => STALE.some(re => fs.existsSync(path.join(PKG_ROOT, f)) && fs.readFileSync(path.join(PKG_ROOT, f), 'utf8').match(re))))
    console.log('PASS identity-numbers (14 nguyên tắc / 6 lớp / 5-skill nhất quán trong docs sống)');
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
  npx ai-simple update [--workflow]
      Nâng hook + report lên bản CLI này, GIỮ NGUYÊN config người dùng (backup .bak).
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
  case 'self-test': cmdSelfTest(); break;
  case 'version': case '--version': case '-v': console.log(PKG.version); break;
  default: console.log(HELP);
}
