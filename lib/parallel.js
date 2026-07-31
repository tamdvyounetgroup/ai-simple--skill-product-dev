/* ai-simple parallel — lớp máy của nguyên tắc 13 (Git-Native Parallel Sessions).
 * Contract: methodology/13-parallel-sessions.md + docs/adr/001 (amendments R1–R9).
 * Zero dependency — chỉ Node built-ins. Windows-first: mkdir lock, rename không đè,
 * casefold path trên win32/darwin, retry EPERM/EBUSY (antivirus giữ handle).
 *
 * Registry: <GIT_COMMON_DIR>/ai-simple/claims/*.json  (ephemeral — KHÔNG commit)
 * Journal : <GIT_COMMON_DIR>/ai-simple/journal/merging-<run>--<lot>.json
 * Lock    : <GIT_COMMON_DIR>/ai-simple/lock/  (mkdir-based, owner.json, stale 30s)
 */
'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const SCHEMA_VERSION = 1;
const LOCK_STALE_MS = 30_000;          // registry lock — critical section ngắn (đọc/ghi claim)
const MERGE_LOCK_STALE_MS = 900_000;   // merge lock — giữ SUỐT cmdMerge (rebase+test dài hợp lệ), stale 15 phút
const DEFAULT_LEASE_HOURS = 8;
const CASEFOLD = process.platform === 'win32' || process.platform === 'darwin';

// ---------- git helpers ----------
function git(args, opts = {}) {
  const r = spawnSync('git', args, { encoding: 'utf8', cwd: opts.cwd || process.cwd() });
  return { status: r.status === null ? 1 : r.status, stdout: (r.stdout || '').trim(), stderr: (r.stderr || '').trim() };
}
function must(r, msg) {
  if (r.status !== 0) die(`${msg}${r.stderr ? ' — ' + r.stderr : ''}`);
  return r.stdout;
}
function die(msg, code = 1) { console.error(`FAIL: ${msg}`); process.exit(code); }
function inGitRepo() { return git(['rev-parse', '--is-inside-work-tree']).status === 0; }
function commonDir() {
  const d = must(git(['rev-parse', '--git-common-dir']), 'không đọc được git-common-dir');
  return path.resolve(process.cwd(), d);
}
function isAncestor(a, b) { return git(['merge-base', '--is-ancestor', a, b]).status === 0; }
function revParse(ref) { const r = git(['rev-parse', '--verify', '--quiet', ref]); return r.status === 0 ? r.stdout : null; }

// ---------- registry paths ----------
function regDirs() {
  const base = path.join(commonDir(), 'ai-simple');
  return { base, claims: path.join(base, 'claims'), journal: path.join(base, 'journal'), lock: path.join(base, 'lock') };
}
function mergeLockDir(dirs, run) { return path.join(dirs.base, `lock-merge--${sanitize(run)}`); }
function sanitize(name) {
  const s = String(name || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!s) die(`tên không hợp lệ: '${name}'`);
  return s;
}
function claimFile(dirs, run, lot) { return path.join(dirs.claims, `${sanitize(run)}--${sanitize(lot)}.json`); }
function runLeaseFile(dirs, targetBranch) { return path.join(dirs.claims, `run-lease--${sanitize(targetBranch)}.json`); }
function journalFile(dirs, run, lot) { return path.join(dirs.journal, `merging-${sanitize(run)}--${sanitize(lot)}.json`); }

// ---------- atomic file ops (NTFS-safe, R6) ----------
function writeAtomic(file, obj) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
  fs.writeFileSync(tmp, JSON.stringify(obj, null, 2) + '\n', 'utf8');
  for (let i = 0; i < 6; i++) {
    try { fs.renameSync(tmp, file); return; }
    catch (e) {
      if ((e.code === 'EPERM' || e.code === 'EEXIST' || e.code === 'EBUSY' || e.code === 'EACCES') && i < 5) {
        try { fs.unlinkSync(file); } catch { /* target có thể chưa tồn tại */ }
        sleepMs(20 * (i + 1));
      } else { try { fs.unlinkSync(tmp); } catch {} throw e; }
    }
  }
}
function readJson(file) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } }
function sleepMs(ms) { const sab = new SharedArrayBuffer(4); Atomics.wait(new Int32Array(sab), 0, 0, ms); }

// ---------- registry lock (mkdir-based, R6) ----------
// die() gọi process.exit() — finally KHÔNG chạy khi exit, nên lock phải được nhả
// qua exit-handler; thiếu nó là lock mồ côi làm mọi lệnh sau treo (bug bắt bởi self-test).
let HELD_LOCK = null;
let HELD_MERGE_LOCK = null;
// Owner-check TRƯỚC khi rm (N1 vòng 2): lock có thể đã bị waiter khác stale-takeover —
// victim xong việc không được xóa lock CỦA NGƯỜI KHÁC (áp cho CẢ registry lẫn merge lock).
function rmLockIfOwner(dir) {
  try {
    const owner = readJson(path.join(dir, 'owner.json'));
    if (!owner || owner.pid === process.pid) fs.rmSync(dir, { recursive: true, force: true });
  } catch {}
}
process.on('exit', () => {
  if (HELD_LOCK) rmLockIfOwner(HELD_LOCK);
  if (HELD_MERGE_LOCK) rmLockIfOwner(HELD_MERGE_LOCK);
});
function acquireLock(dirs, sessionId) {
  fs.mkdirSync(dirs.base, { recursive: true });
  const deadline = Date.now() + 5000;
  for (;;) {
    try {
      fs.mkdirSync(dirs.lock); // atomic trên cả POSIX lẫn NTFS
      HELD_LOCK = dirs.lock;
      writeAtomic(path.join(dirs.lock, 'owner.json'), { pid: process.pid, session: sessionId, epoch: Date.now() });
      return;
    } catch (e) {
      if (e.code !== 'EEXIST') throw e;
      let stale = false;
      try { stale = Date.now() - fs.statSync(dirs.lock).mtimeMs > LOCK_STALE_MS; } catch { stale = true; }
      if (stale) { try { fs.rmSync(dirs.lock, { recursive: true, force: true }); } catch {} continue; }
      if (Date.now() > deadline) die('không lấy được registry lock sau 5s — session khác đang giữ (hoặc lock mồ côi < 30s, thử lại)');
      sleepMs(25 + Math.floor(Math.random() * 50));
    }
  }
}
function releaseLock(dirs) {
  rmLockIfOwner(dirs.lock); // M5: chỉ xóa lock của chính mình
  HELD_LOCK = null;
}
function withLock(dirs, sessionId, fn) {
  acquireLock(dirs, sessionId);
  try { return fn(); } finally { releaseLock(dirs); }
}
// Merge lock — serialize TOÀN BỘ cmdMerge của một run (C1: 2 merge đồng thời từng làm
// mất lot khỏi integration 8/8 lần — tái hiện bởi hội đồng review; lock này + CAS ở bước ff đóng cửa sổ đó).
function acquireMergeLock(dirs, run) {
  const dir = mergeLockDir(dirs, run);
  fs.mkdirSync(dirs.base, { recursive: true });
  try {
    fs.mkdirSync(dir);
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
    let stale = false;
    try { stale = Date.now() - fs.statSync(dir).mtimeMs > MERGE_LOCK_STALE_MS; } catch { stale = true; }
    if (!stale) die(`merge queue của run '${run}' đang chạy ở process khác — queue là TUẦN TỰ, đợi nó xong (hoặc lock mồ côi sẽ tự stale sau 15 phút)`);
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch {}
    try { fs.mkdirSync(dir); } catch (e2) { // N2: 2 waiter cùng thấy stale — bên thua nhận EEXIST tử tế
      if (e2.code === 'EEXIST') die(`waiter khác vừa lấy merge lock của run '${run}' sau stale-takeover — thử lại sau`);
      throw e2;
    }
  }
  writeAtomic(path.join(dir, 'owner.json'), { pid: process.pid, epoch: Date.now() });
  HELD_MERGE_LOCK = dir;
}
// Heartbeat (N1): bước dài hợp lệ (rebase repo lớn, --test-cmd) phải làm tươi mtime lock
// để stale-15-phút không cắn merge đang sống. Gọi trước mỗi bước dài.
function touchMergeLock() {
  if (!HELD_MERGE_LOCK) return;
  const now = new Date();
  try { fs.utimesSync(HELD_MERGE_LOCK, now, now); } catch {}
  try { fs.utimesSync(path.join(HELD_MERGE_LOCK, 'owner.json'), now, now); } catch {}
}
function releaseMergeLock() {
  if (HELD_MERGE_LOCK) { rmLockIfOwner(HELD_MERGE_LOCK); HELD_MERGE_LOCK = null; }
}

// ---------- path normalize + overlap (R6: casefold win32/darwin) ----------
function normPath(p) {
  let s = String(p || '').trim().replace(/\\/g, '/').replace(/^\.\//, '').replace(/\/+$/, '');
  if (!s || s === '.' || path.isAbsolute(s) || s.split('/').includes('..'))
    die(`path phải repo-relative, không '..': '${p}'`);
  // Reject space/quote/control (M3): hook gate sh word-split theo space — path như vậy
  // sẽ lọt gate im lặng. Chặn từ CLI = non-goal được enforce, không phải lời hứa suông.
  if (/[\s\x00-\x1f"'`]/.test(s))
    die(`path chứa space/quote/control không được hỗ trợ (non-goal — hook gate sh không word-split an toàn được): '${p}'`);
  return s;
}
// NFC normalize + casefold trên FS case-insensitive. Full Unicode casefold (İ/ß) là non-goal — ghi trong doc 13.
function foldKey(p) { const n = p.normalize('NFC'); return CASEFOLD ? n.toLowerCase() : n; }
function overlaps(a, b) {
  const fa = foldKey(a), fb = foldKey(b);
  return fa === fb || fa.startsWith(fb + '/') || fb.startsWith(fa + '/'); // ancestor/child = overlap
}
function anyOverlap(pathsA, pathsB) {
  for (const a of pathsA) for (const b of pathsB) if (overlaps(a, b)) return { a, b };
  return null;
}
function parsePaths(csv) { return String(csv || '').split(',').map((s) => s.trim()).filter(Boolean).map(normPath); }

// ---------- protected paths (dirty work của user — tầng 0, R4 re-scan) ----------
// Unescape C-quoted path của git porcelain ("t\303\252n vi\341\273\207t.md") — thiếu nó
// PROTECTED miss file tên non-ASCII ở mức file (m8). Phạm vi scan: worktree HIỆN TẠI —
// dirty ở worktree khác được che bởi branch-exclusivity + quy tắc "không đụng worktree lạ" (ghi trong doc 13).
function unquoteC(p) {
  if (!(p.startsWith('"') && p.endsWith('"'))) return p;
  const inner = p.slice(1, -1);
  const bytes = [];
  for (let i = 0; i < inner.length; i++) {
    if (inner[i] === '\\') {
      const oct = inner.slice(i + 1, i + 4);
      if (/^[0-7]{3}$/.test(oct)) { bytes.push(parseInt(oct, 8)); i += 3; continue; }
      const esc = { n: 10, t: 9, '"': 34, '\\': 92 }[inner[i + 1]];
      if (esc !== undefined) { bytes.push(esc); i++; continue; }
    }
    bytes.push(...Buffer.from(inner[i], 'utf8'));
  }
  return Buffer.from(bytes).toString('utf8');
}
function protectedPaths() {
  const r = git(['status', '--porcelain']);
  if (r.status !== 0) return [];
  const out = [];
  for (const line of r.stdout.split('\n')) {
    if (!line.trim()) continue;
    let p = line.slice(3).trim();
    const arrow = p.indexOf(' -> ');
    if (arrow >= 0) p = p.slice(arrow + 4); // rename: lấy đích
    p = unquoteC(p);
    p = p.replace(/\\/g, '/').replace(/\/+$/, '');
    if (p) out.push(p);
  }
  return [...new Set(out)];
}

// ---------- claims ----------
function loadClaims(dirs, { failClosed = true } = {}) {
  if (!fs.existsSync(dirs.claims)) return [];
  const out = [];
  const corrupt = [];
  for (const f of fs.readdirSync(dirs.claims)) {
    if (!f.endsWith('.json') || f.includes('.tmp-')) continue;
    const file = path.join(dirs.claims, f);
    const data = readJson(file);
    if (data) out.push({ file, data });
    else corrupt.push(f);
  }
  // FAIL-CLOSED (M1): claim JSON hỏng = claim TÀNG HÌNH với overlap check — nguy hiểm hơn
  // không có registry. Không silent-filter: chặn thao tác, trỏ người dùng dọn có chủ đích.
  if (corrupt.length && failClosed)
    die(`${corrupt.length} claim file hỏng/không parse được trong registry: ${corrupt.join(', ')} — kiểm tra bằng \`ai-simple doctor\`, dọn bằng \`ai-simple parallel release --run <r> --lot <l> --force\` (hoặc xóa tay file .json hỏng NẾU người đã xác minh). Fail-closed: mọi claim/status dừng cho tới khi registry sạch.`);
  return out;
}
function leaseState(c) {
  if (!c.lease_until_epoch) return 'ACTIVE';
  return Date.now() / 1000 > c.lease_until_epoch ? 'STALE' : 'ACTIVE';
}
function nowIso() { return new Date().toISOString(); }
function leaseUntil(hours) { return Math.floor(Date.now() / 1000 + hours * 3600); }
// M2: run-lease phải SỐNG theo hoạt động của run — mọi renew/extend/ready/merge bump nó,
// không thì run dài > lease tự hết hạn giữa chừng và R3 thủng đúng lúc cần nhất.
function bumpRunLease(dirs, run, hours = DEFAULT_LEASE_HOURS) {
  if (!fs.existsSync(dirs.claims)) return;
  for (const f of fs.readdirSync(dirs.claims)) {
    if (!f.startsWith('run-lease--') || !f.endsWith('.json')) continue;
    const file = path.join(dirs.claims, f);
    const d = readJson(file);
    if (d && d.run === run) { d.renewed_at = nowIso(); d.lease_until_epoch = leaseUntil(hours); writeAtomic(file, d); }
  }
}

function checkConflicts(dirs, { run, lot, writePaths, session }) {
  const conflicts = [];
  // 1) claim khác (khác lot) — write/write, kể cả STALE (STALE không được silent takeover)
  for (const { data: c } of loadClaims(dirs)) {
    if (c.type === 'run-lease') continue;
    if (c.run === run && c.lot === lot) continue; // chính mình (extend/renew)
    const hit = anyOverlap(writePaths, c.write_paths || []);
    if (hit) conflicts.push({ state: leaseState(c) === 'STALE' ? 'STALE' : 'CONFLICT', path: hit.a, other: `${c.run}/${c.lot}`, session: c.session, lease: c.lease_until_epoch });
  }
  // 2) dirty work của user trong worktree hiện tại → PROTECTED, không ngoại lệ
  const prot = protectedPaths();
  const hitP = anyOverlap(writePaths, prot);
  if (hitP) conflicts.push({ state: 'PROTECTED', path: hitP.a, other: 'user-dirty-worktree', session: 'user' });
  return conflicts;
}
function reportConflicts(conflicts, json) {
  if (json) { console.log(JSON.stringify({ ok: false, conflicts }, null, 2)); return; }
  for (const c of conflicts)
    console.error(`${c.state}: ${c.path} — ${c.other}${c.session ? ` (session ${c.session})` : ''}${c.lease ? ` lease tới epoch ${c.lease}` : ''}`);
  console.error('→ đợi lot kia merge / đổi ranh giới lot / STALE thì chạy `parallel recover`. Dirty của user: hỏi user.');
}

// ---------- commands ----------
function cmdClaim(a) {
  const run = a.run || die('--run bắt buộc'), lot = a.lot || die('--lot bắt buộc');
  const writePaths = parsePaths(a.paths); if (!writePaths.length) die('--paths bắt buộc (write-set, phẩy ngăn cách)');
  const readPaths = parsePaths(a.read || '');
  const session = a.session || `sess-${os.hostname()}-${process.pid}`;
  const baseBranch = a['base-branch'] || 'main';
  const dirs = regDirs();
  const baseSha = revParse(baseBranch) || die(`base branch '${baseBranch}' không tồn tại`);
  const leaseHours = a['lease-hours'] !== undefined ? Number(a['lease-hours']) : DEFAULT_LEASE_HOURS;

  withLock(dirs, session, () => {
    const file = claimFile(dirs, run, lot);
    if (fs.existsSync(file)) die(`claim ${run}/${lot} đã tồn tại — dùng extend/renew, không claim đè`);
    const conflicts = checkConflicts(dirs, { run, lot, writePaths, session });
    if (conflicts.length) { reportConflicts(conflicts, a.json); process.exit(2); }
    // Target-branch lease (R3): 1 target chỉ 1 run ACTIVE. STALE ≠ tự lấy: takeover
    // run-lease của run khác BẮT BUỘC người đã chạy recover + truyền --force-run (M2).
    const rl = runLeaseFile(dirs, baseBranch);
    const existing = readJson(rl);
    if (existing && existing.run !== run) {
      if (leaseState(existing) !== 'STALE')
        die(`target '${baseBranch}' đang thuộc run '${existing.run}' (R3: 1 target = 1 run ACTIVE) — đợi run đó xong hoặc base lên integrate/${existing.run}`, 2);
      if (!a['force-run'])
        die(`run-lease của run '${existing.run}' trên target '${baseBranch}' đã STALE — KHÔNG silent takeover: chạy \`parallel recover\` cho các lot của run đó, xác minh không còn dirty/unmerged, rồi claim lại với --force-run`, 2);
    }
    writeAtomic(rl, { schema_version: SCHEMA_VERSION, type: 'run-lease', run, target_branch: baseBranch, session, claimed_at: nowIso(), lease_until_epoch: leaseUntil(leaseHours) });
    // WARN read/write (R5): read của mình ∩ write của lot khác
    for (const { data: c } of loadClaims(dirs)) {
      if (c.type === 'run-lease' || (c.run === run && c.lot === lot)) continue;
      const hit = anyOverlap(readPaths, c.write_paths || []);
      if (hit) console.error(`WARN (R5): read_path '${hit.a}' đang là write của ${c.run}/${c.lot} — cân nhắc depends_on để sang wave sau`);
    }
    const claim = {
      schema_version: SCHEMA_VERSION, session, run, lot,
      wave: a.wave !== undefined ? Number(a.wave) : 1,
      base_branch: baseBranch, base_sha: baseSha,
      branch: a.branch || `lot/${sanitize(run)}/${sanitize(lot)}`,
      worktree: a.worktree || null,
      intent: a.intent || '',
      write_paths: writePaths, read_paths: readPaths,
      declared_deps: parseListRaw(a.deps), depends_on: parseListRaw(a['depends-on']),
      status: 'ACTIVE', claimed_at: nowIso(), renewed_at: nowIso(),
      lease_until_epoch: leaseUntil(leaseHours),
      original_head_sha: null, head_sha: null,
    };
    writeAtomic(file, claim);
    if (a.json) console.log(JSON.stringify({ ok: true, claim }, null, 2));
    else console.log(`OK: claimed ${run}/${lot} — branch ${claim.branch}, ${writePaths.length} write path, lease ${leaseHours}h`);
  });
}
function parseListRaw(csv) { return String(csv || '').split(',').map((s) => s.trim()).filter(Boolean); }

function cmdExtend(a) {
  const run = a.run || die('--run bắt buộc'), lot = a.lot || die('--lot bắt buộc');
  const addPaths = parsePaths(a.paths); if (!addPaths.length) die('--paths bắt buộc');
  const dirs = regDirs();
  withLock(dirs, a.session || 'extend', () => {
    const file = claimFile(dirs, run, lot);
    const c = readJson(file) || die(`claim ${run}/${lot} không tồn tại`);
    const conflicts = checkConflicts(dirs, { run, lot, writePaths: addPaths, session: c.session });
    if (conflicts.length) { reportConflicts(conflicts, a.json); process.exit(2); } // first-extend-wins (R2)
    c.write_paths = [...new Set([...c.write_paths, ...addPaths])];
    c.renewed_at = nowIso();
    writeAtomic(file, c);
    bumpRunLease(dirs, run); // M2
    console.log(`OK: extended ${run}/${lot} +${addPaths.length} path (tổng ${c.write_paths.length})`);
  });
}

function cmdRenew(a) {
  const run = a.run || die('--run bắt buộc'), lot = a.lot || die('--lot bắt buộc');
  const dirs = regDirs();
  const hours = a['lease-hours'] !== undefined ? Number(a['lease-hours']) : DEFAULT_LEASE_HOURS;
  withLock(dirs, 'renew', () => {
    const file = claimFile(dirs, run, lot);
    const c = readJson(file) || die(`claim ${run}/${lot} không tồn tại`);
    c.renewed_at = nowIso(); c.lease_until_epoch = leaseUntil(hours);
    if (a.head) c.head_sha = a.head;
    writeAtomic(file, c);
    bumpRunLease(dirs, run, hours); // M2: run-lease sống theo hoạt động của run
    console.log(`OK: renewed ${run}/${lot} — lease tới epoch ${c.lease_until_epoch}`);
  });
}

function cmdStatus(a) {
  const dirs = regDirs();
  const claims = loadClaims(dirs).map(({ data: c }) => ({ ...c, computed_state: c.type === 'run-lease' ? leaseState(c) : leaseState(c) }));
  if (a.check) {
    // Cổng conflict cho router (NT03): output ≤ 100 token, CLEAR = im lặng exit 0
    const paths = parsePaths(a.check);
    const hits = [];
    for (const c of claims) {
      if (c.type === 'run-lease') continue;
      const hit = anyOverlap(paths, c.write_paths || []);
      if (hit) hits.push(`${leaseState(c) === 'STALE' ? 'STALE' : 'CONFLICT'}: ${hit.a} — lot ${c.run}/${c.lot} (session ${c.session})`);
    }
    const hitP = anyOverlap(paths, protectedPaths());
    if (hitP) hits.push(`PROTECTED: ${hitP.a} — dirty work của user`);
    if (!hits.length) { if (!a.quiet) console.log('CLEAR'); process.exit(0); }
    hits.forEach((h) => console.log(h)); process.exit(2);
  }
  if (a.json) { console.log(JSON.stringify({ claims, protected: protectedPaths() }, null, 2)); return; }
  if (!claims.length) { console.log('Không có claim nào. Registry: ' + dirs.claims); return; }
  for (const c of claims) {
    if (c.type === 'run-lease') { console.log(`RUN-LEASE ${c.run} → target ${c.target_branch} [${c.computed_state}]`); continue; }
    console.log(`${c.computed_state.padEnd(6)} ${c.run}/${c.lot} — ${c.status} — branch ${c.branch} — ${(c.write_paths || []).join(', ')}`);
  }
  const prot = protectedPaths();
  if (prot.length) console.log(`PROTECTED (user dirty): ${prot.slice(0, 8).join(', ')}${prot.length > 8 ? ` +${prot.length - 8}` : ''}`);
}

function findWorktreeFor(branch) {
  const r = git(['worktree', 'list', '--porcelain']);
  if (r.status !== 0) return null;
  let cur = null;
  for (const line of r.stdout.split('\n')) {
    if (line.startsWith('worktree ')) cur = line.slice(9).trim();
    else if (line.startsWith('branch ') && line.slice(7).trim() === `refs/heads/${branch}`) return cur;
  }
  return null;
}

function cmdReady(a) {
  const run = a.run || die('--run bắt buộc'), lot = a.lot || die('--lot bắt buộc');
  const dirs = regDirs();
  git(['worktree', 'prune']); // m3: dọn admin entry mồ côi trước khi tra worktree
  withLock(dirs, 'ready', () => {
    const file = claimFile(dirs, run, lot);
    const c = readJson(file) || die(`claim ${run}/${lot} không tồn tại`);
    const tip = revParse(c.branch) || die(`branch '${c.branch}' không tồn tại`);
    const wt = findWorktreeFor(c.branch);
    if (wt) {
      const st = git(['status', '--porcelain'], { cwd: wt });
      if (st.status !== 0 || st.stdout.trim()) die(`worktree ${wt} chưa clean — commit hoặc dọn trước khi READY (dirty không bao giờ bị tự xử)`);
      const rm = git(['worktree', 'remove', wt]);
      if (rm.status !== 0) die(`không nhả được worktree ${wt} — ${rm.stderr}. READY = worker đã nhả worktree (R1)`);
      console.log(`OK: đã nhả worktree ${wt}`);
    }
    c.status = 'READY'; c.head_sha = tip; c.original_head_sha = tip; c.renewed_at = nowIso();
    writeAtomic(file, c);
    bumpRunLease(dirs, run); // M2
    console.log(`OK: ${run}/${lot} READY tại ${tip.slice(0, 10)} — vào merge queue được`);
  });
}

function cmdMerge(a) {
  const run = a.run || die('--run bắt buộc'), lot = a.lot || die('--lot bắt buộc');
  const dirs = regDirs();
  const session = a.session || 'merge-queue';
  // C1 — SERIALIZE: merge lock per-run giữ SUỐT cmdMerge. 2 merge đồng thời không lock
  // từng làm mất lot khỏi integration 8/8 lần (cả hai qua ancestry check rồi branch -f đè nhau).
  acquireMergeLock(dirs, run);
  git(['worktree', 'prune']); // m3
  const file = claimFile(dirs, run, lot);
  const c = readJson(file) || die(`claim ${run}/${lot} không tồn tại`);
  const integ = a.integration || `integrate/${sanitize(run)}`;
  const jf = journalFile(dirs, run, lot);
  const journal = (step, extra = {}) => writeAtomic(jf, { run, lot, step, at: nowIso(), original_head_sha: c.original_head_sha, ...extra });
  const fail = (why) => { // FAILED: về ACTIVE kèm lý do, fail-eject — không đóng băng wave (R1)
    withLock(dirs, session, () => { const cc = readJson(file); if (cc) { cc.status = 'ACTIVE'; cc.failed_reason = why; writeAtomic(file, cc); } });
    try { fs.unlinkSync(jf); } catch {}
    releaseMergeLock();
    die(`merge ${run}/${lot} FAILED → eject về ACTIVE: ${why}`, 3);
  };
  // m2: rebase THÀNH CÔNG nhưng ff không được (integration đã tiến) → branch đã rewrite,
  // eject về READY với head mới + xóa journal → lần merge sau rebase tiếp từ integ head mới.
  const ejectReady = (postSha, why) => {
    withLock(dirs, session, () => {
      const cc = readJson(file);
      if (cc) { cc.status = 'READY'; cc.head_sha = postSha; cc.original_head_sha = postSha; cc.renewed_at = nowIso(); writeAtomic(file, cc); }
    });
    try { fs.unlinkSync(jf); } catch {}
    releaseMergeLock();
    die(`merge ${run}/${lot} chưa vào được integration: ${why} — claim vẫn READY, chạy lại \`parallel merge\``, 3);
  };

  if (c.status !== 'READY' && !readJson(jf)) { releaseMergeLock(); die(`claim ${run}/${lot} đang '${c.status}' — cần READY trước (parallel ready)`); }
  const tip = revParse(c.branch) || die(`branch '${c.branch}' không tồn tại`);
  const prevJournal = readJson(jf);
  const resuming = prevJournal && prevJournal.post_rebase_sha && prevJournal.post_rebase_sha === tip;

  // Bước 1 — verify head bằng ANCESTRY, không so SHA bằng nhau (R1)
  if (!resuming) {
    if (c.head_sha && tip !== c.head_sha) {
      if (isAncestor(c.head_sha, tip)) fail(`branch có commit mới sau READY (${c.head_sha.slice(0, 8)} → ${tip.slice(0, 8)}) — chạy lại ready`);
      else fail(`tip ${tip.slice(0, 8)} không phải hậu duệ của head đã ghi ${c.head_sha.slice(0, 8)} — branch bị sửa ngoài quy trình, cần người xem`);
    }
    if (findWorktreeFor(c.branch)) fail('worker chưa nhả worktree — READY phải remove worktree (R1)');
  }
  // Bước 2 — re-scan PROTECTED (R4: chống TOCTOU)
  const hitP = anyOverlap(c.write_paths || [], protectedPaths());
  if (hitP) fail(`CONFLICT với dirty work mới của user tại '${hitP.a}' — hỏi user trước khi tích hợp`);

  // Bước 3 — integration branch (idempotent: thua race tạo branch = vô hại, đọc lại)
  if (!revParse(integ)) {
    const mk = git(['branch', integ, c.base_sha]);
    if (mk.status !== 0 && !revParse(integ)) fail(`không tạo được ${integ} từ base_sha — ${mk.stderr}`);
  }
  const integHead = revParse(integ);
  // N3: bump run-lease TRONG cùng withLock với lần set MERGING — không read-modify-write ngoài lock
  withLock(dirs, session, () => {
    const cc = readJson(file);
    if (cc) { cc.status = 'MERGING'; writeAtomic(file, cc); }
    bumpRunLease(dirs, run);
  });

  let postSha = tip;
  if (!resuming) {
    // Bước 4 — rebase trong worktree TẠM của queue (worker đã nhả — R1)
    journal('rebase-start', { integration: integ, integration_head: integHead, branch_tip: tip });
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-simple-mq-'));
    const wtDir = path.join(tmp, 'wt');
    const cleanupTmp = () => { // N5: dọn ở MỌI đường ra, không chỉ đường thành công
      git(['worktree', 'remove', '--force', wtDir]);
      try { fs.rmSync(tmp, { recursive: true, force: true }); } catch {}
    };
    touchMergeLock(); // N1: heartbeat trước bước dài
    const add = git(['worktree', 'add', wtDir, c.branch]);
    if (add.status !== 0) { cleanupTmp(); fail(`không mở được worktree queue cho ${c.branch} — ${add.stderr}`); }
    const rb = git(['rebase', integ], { cwd: wtDir });
    if (rb.status !== 0) {
      git(['rebase', '--abort'], { cwd: wtDir });
      cleanupTmp();
      fail(`rebase lên ${integ} conflict — worker rebase tay rồi READY lại. ${rb.stderr.split('\n')[0] || ''}`);
    }
    postSha = must(git(['rev-parse', 'HEAD'], { cwd: wtDir }), 'không đọc được HEAD sau rebase');
    journal('rebase-done', { post_rebase_sha: postSha });
    // Bước 5 — targeted tests (tùy chọn; heartbeat trước vì test được phép dài)
    if (a['test-cmd']) {
      touchMergeLock(); // N1
      const t = spawnSync(a['test-cmd'], { shell: true, cwd: wtDir, encoding: 'utf8' });
      touchMergeLock();
      if ((t.status === null ? 1 : t.status) !== 0) {
        cleanupTmp();
        fail(`targeted tests fail: ${a['test-cmd']}\n${(t.stdout || '') + (t.stderr || '')}`.slice(0, 2000));
      }
    }
    cleanupTmp();
  } else {
    console.log(`RESUME: journal cho thấy rebase đã xong tại ${tip.slice(0, 10)} — tiếp tục từ ff-merge (crash recovery)`);
    postSha = tip;
  }

  // Bước 6 — fast-forward integration bằng CAS (`git update-ref <ref> <new> <expected-old>`):
  // atomic compare-and-swap của chính git — kể cả khi merge-lock bị vượt qua (stale-takeover),
  // hai bên KHÔNG THỂ cùng thắng: bên thua CAS bị eject READY có báo, không silent-loss (C1).
  journal('ff-start', { post_rebase_sha: postSha });
  const integNow = revParse(integ);
  if (!isAncestor(integNow, postSha)) ejectReady(postSha, `integration ${integ} đã tiến (lot khác vào trước) — cần rebase lại`);
  const cas = git(['update-ref', `refs/heads/${integ}`, postSha, integNow]);
  if (cas.status !== 0) ejectReady(postSha, `CAS thua tại ${integ} (ref đổi giữa chừng) — ${cas.stderr.split('\n')[0] || ''}`);
  journal('ff-done', { post_rebase_sha: postSha });

  // Bước 7 — MERGED + release claim (xóa cùng lúc), dọn journal + merge lock
  withLock(dirs, session, () => { try { fs.unlinkSync(file); } catch {} });
  try { fs.unlinkSync(jf); } catch {}
  releaseMergeLock();
  console.log(`OK: MERGED ${run}/${lot} → ${integ} @ ${postSha.slice(0, 10)} — claim released`);
  console.log(`Còn lại: cuối wave chạy relevant suite; cuối run full suite rồi mới đụng target (${c.base_branch}).`);
}

function cmdRecover(a) {
  const run = a.run || die('--run bắt buộc'), lot = a.lot || die('--lot bắt buộc');
  const dirs = regDirs();
  git(['worktree', 'prune']); // m3
  const c = readJson(claimFile(dirs, run, lot)) || die(`claim ${run}/${lot} không tồn tại (file hỏng? xem doctor)`);
  const j = readJson(journalFile(dirs, run, lot));
  const tip = revParse(c.branch);
  const wt = c.branch ? findWorktreeFor(c.branch) : null;
  const report = {
    claim_status: c.status, lease: leaseState(c),
    branch_exists: !!tip,
    worktree: wt || 'none',
    worktree_dirty: wt ? !!git(['status', '--porcelain'], { cwd: wt }).stdout : false,
    ahead_of_base: tip ? Number(git(['rev-list', '--count', `${c.base_sha}..${tip}`]).stdout || 0) : 0,
    head_matches: tip ? (c.head_sha ? (tip === c.head_sha ? 'exact' : isAncestor(c.head_sha, tip) ? 'descendant' : j && j.post_rebase_sha === tip ? 'rebased-by-queue (journal)' : 'DIVERGED — cần người xem') : 'chưa ghi head') : 'n/a',
    merged_into_integration: tip ? isAncestor(tip, revParse(`integrate/${sanitize(run)}`) || tip) && !!revParse(`integrate/${sanitize(run)}`) : false,
    journal: j ? `MERGING dở ở bước '${j.step}' lúc ${j.at}` : 'không có',
  };
  console.log(JSON.stringify(report, null, 2));
  if (report.worktree_dirty || (report.branch_exists && !report.merged_into_integration && report.ahead_of_base > 0))
    console.log('→ Dirty/unmerged work — ĐƯỢC BẢO VỆ. Không release. Lease hết ≠ takeover: người/orchestrator quyết ABANDON hay tiếp tục.');
  else if (j && j.post_rebase_sha) console.log('→ Crash giữa merge queue: chạy lại `parallel merge` — resume từ journal (ancestry check).');
  else console.log('→ An toàn để `parallel release` nếu lot đã xong/bỏ.');
}

function cmdRelease(a) {
  const run = a.run || die('--run bắt buộc'), lot = a.lot || die('--lot bắt buộc');
  const dirs = regDirs();
  withLock(dirs, 'release', () => {
    const file = claimFile(dirs, run, lot);
    const c = readJson(file);
    if (!c) {
      if (!fs.existsSync(file)) die(`claim ${run}/${lot} không tồn tại`);
      // claim hỏng: chỉ --force (sau khi NGƯỜI xác minh) mới dọn được — đường thoát của fail-closed M1
      if (!a.force) die(`claim ${run}/${lot} file hỏng (không parse được) — xác minh branch/worktree bằng tay rồi \`release --force\` để dọn`);
      fs.unlinkSync(file);
      console.log(`OK: đã dọn claim hỏng ${run}/${lot} (--force)`);
      return;
    }
    const wt = c.branch ? findWorktreeFor(c.branch) : null;
    if (wt && git(['status', '--porcelain'], { cwd: wt }).stdout && !a.force)
      die(`worktree ${wt} còn dirty — dirty không bao giờ bị xóa im lặng. Dọn tay, hoặc --force nếu NGƯỜI đã quyết`);
    if (a.abandon) console.log(`ABANDONED: giữ branch ${c.branch} làm forensics, chỉ xóa claim.`);
    fs.unlinkSync(file);
    // dọn run-lease nếu không còn lot nào của run (failClosed:false — release phải chạy được cả khi registry bẩn)
    const left = loadClaims(dirs, { failClosed: false }).filter(({ data: d }) => d.type !== 'run-lease' && d.run === run);
    if (!left.length) { try { fs.unlinkSync(runLeaseFile(dirs, c.base_branch)); } catch {} }
    console.log(`OK: released ${run}/${lot}`);
  });
}

function cmdPlan(a) {
  const src = a.file ? fs.readFileSync(a.file, 'utf8') : die('--file <lots.json> bắt buộc ({"lots":[{lot,write_paths,depends_on,...}]})');
  const plan = JSON.parse(src);
  const lots = plan.lots || die('JSON thiếu "lots"');
  const errs = [];
  for (const l of lots) { l.write_paths = (l.write_paths || []).map(normPath); l.depends_on = l.depends_on || []; }
  // MECE test 1 — exclusive (kể cả ancestor/child)
  for (let i = 0; i < lots.length; i++) for (let j = i + 1; j < lots.length; j++) {
    const hit = anyOverlap(lots[i].write_paths, lots[j].write_paths);
    if (hit) errs.push(`OVERLAP: '${hit.a}' (${lots[i].lot}) ∩ '${hit.b}' (${lots[j].lot}) — extract thành lot wave-0 hoặc gộp`);
  }
  // deps tồn tại + topo sort → waves
  const names = new Set(lots.map((l) => l.lot));
  for (const l of lots) for (const d of l.depends_on) if (!names.has(d)) errs.push(`depends_on '${d}' của lot '${l.lot}' không tồn tại`);
  if (errs.length) { errs.forEach((e) => console.error('FAIL: ' + e)); process.exit(1); }
  const wave = {}; const resolved = new Set(); let level = 0; let rest = [...lots];
  while (rest.length) {
    const ready = rest.filter((l) => l.depends_on.every((d) => resolved.has(d)));
    if (!ready.length) { console.error('FAIL: dependency vòng — ' + rest.map((l) => l.lot).join(', ')); process.exit(1); }
    ready.forEach((l) => { wave[l.lot] = level; resolved.add(l.lot); });
    rest = rest.filter((l) => !resolved.has(l.lot)); level++;
  }
  // R5 — read/write giữa lot cùng wave → khuyên depends_on
  for (const x of lots) for (const y of lots) {
    if (x === y || wave[x.lot] !== wave[y.lot]) continue;
    const hit = anyOverlap((x.read_paths || []).map(normPath), y.write_paths);
    if (hit) console.log(`WARN (R5): ${x.lot} đọc '${hit.a}' mà ${y.lot} ghi — cân nhắc ${x.lot}.depends_on += ${y.lot}`);
  }
  console.log('ME: PASS (exclusive ✓, deps ✓ — Exhaustive: NGƯỜI kiểm, máy không biết deliverables đủ chưa)');
  const byWave = {};
  for (const l of lots) (byWave[wave[l.lot]] = byWave[wave[l.lot]] || []).push(l.lot);
  for (const w of Object.keys(byWave).map(Number).sort((x, y) => x - y)) console.log(`Wave ${w}: ${byWave[w].join(' ∥ ')}`);
  console.log(`Admission: ${lots.length >= 2 && Object.values(byWave).some((ws) => ws.length >= 2) ? 'PASS — có wave ≥ 2 lot song song' : 'SINGLE-SESSION — không đủ 2 lot độc lập, đừng trả overhead'}`);
}

// ---------- self-test (test nghiệm thu ADR §13) ----------
function cmdSelfTest() {
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), 'ai-simple-par-'));
  const repo = path.join(sandbox, 'repo');
  fs.mkdirSync(repo, { recursive: true });
  const g = (args, cwd = repo) => git(args, { cwd });
  const node = process.execPath;
  const cli = path.join(__dirname, '..', 'bin', 'ai-simple.js');
  const run = (args, cwd = repo) => spawnSync(node, [cli, 'parallel', ...args], { encoding: 'utf8', cwd });
  let pass = 0, failn = 0;
  const t = (name, ok, note = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}: ${name}${!ok && note ? ' — ' + note : ''}`); ok ? pass++ : failn++; };

  try {
    g(['init', '-q']); g(['config', 'user.email', 't@t']); g(['config', 'user.name', 't']); g(['config', 'commit.gpgsign', 'false']);
    fs.writeFileSync(path.join(repo, 'a.txt'), 'base\n'); g(['add', '.']); g(['commit', '-q', '-m', 'base']);
    g(['branch', '-M', 'main']);

    // 1. claim cơ bản
    let r = run(['claim', '--run', 'r1', '--lot', 'shop', '--paths', 'src/shop,tests/shop', '--base-branch', 'main']);
    t('claim cơ bản OK', r.status === 0, r.stderr);
    // 2. write/write overlap chặn
    r = run(['claim', '--run', 'r1', '--lot', 'other', '--paths', 'src/shop/cart']);
    t('ancestor/child overlap bị CHẶN', r.status === 2, `exit=${r.status}`);
    // 3. casefold (win32/darwin)
    if (CASEFOLD) {
      r = run(['claim', '--run', 'r1', '--lot', 'case', '--paths', 'SRC/Shop']);
      t('casefold overlap bị CHẶN (NTFS)', r.status === 2, `exit=${r.status}`);
    } else t('casefold overlap (skip trên linux)', true);
    // 4. path độc lập → OK
    r = run(['claim', '--run', 'r1', '--lot', 'scoring', '--paths', 'src/scoring']);
    t('lot MECE thứ 2 OK', r.status === 0, r.stderr);
    // 5. target-branch lease (R3): run khác cùng target bị chặn
    r = run(['claim', '--run', 'r2', '--lot', 'x', '--paths', 'src/x', '--base-branch', 'main']);
    t('run thứ 2 cùng target bị CHẶN (R3)', r.status !== 0, `exit=${r.status}`);
    // 6. PROTECTED: dirty file của user
    fs.writeFileSync(path.join(repo, 'dirty.txt'), 'user đang làm dở\n');
    r = run(['claim', '--run', 'r1', '--lot', 'evil', '--paths', 'dirty.txt']);
    t('dirty work của user → PROTECTED, bị CHẶN (R4)', r.status === 2, `exit=${r.status}`);
    fs.unlinkSync(path.join(repo, 'dirty.txt'));
    // 7. status --check (cổng conflict router)
    r = run(['status', '--check', 'src/shop/ui.tsx']);
    t('status --check báo CONFLICT', r.status === 2 && /CONFLICT/.test(r.stdout), r.stdout);
    r = run(['status', '--check', 'src/elsewhere']);
    t('status --check CLEAR', r.status === 0, r.stdout);
    // 8. RACE: 6 process claim cùng path đồng thời → đúng 1 thắng
    const winners = [];
    const procs = [];
    for (let i = 0; i < 6; i++)
      procs.push(spawnSync(node, [cli, 'parallel', 'claim', '--run', 'r1', '--lot', 'race', '--paths', 'src/race', '--session', `racer-${i}`], { encoding: 'utf8', cwd: repo }));
    // 6 lần tuần tự KHÔNG phải race thật — race thật: ADR §13 yêu cầu 100 lượt →
    // 20 vòng × 5 process CONCURRENT, mỗi vòng phải đúng 1 thắng (m9).
    const { spawn } = require('child_process');
    const spawnCli = (args) => new Promise((res) => {
      const k = spawn(node, [cli, 'parallel', ...args], { cwd: repo });
      k.on('exit', (code) => res(code));
    });
    return (async () => {
      const seqWinners = procs.filter((p) => p.status === 0).length;
      t('race tuần tự: đúng 1 claimant thắng', seqWinners === 1, `${seqWinners} thắng`);
      let badRounds = 0;
      for (let round = 0; round < 20; round++) {
        const codes = await Promise.all([0, 1, 2, 3, 4].map((i) =>
          spawnCli(['claim', '--run', 'r1', '--lot', `race2-${round}`, '--paths', `src/race2-${round}`, '--session', `c-${round}-${i}`])));
        if (codes.filter((c2) => c2 === 0).length !== 1) badRounds++;
      }
      t('race CONCURRENT 100 lượt (20 vòng × 5): mỗi vòng đúng 1 thắng', badRounds === 0, `${badRounds} vòng sai`);
      await selfTestPhase2();
    })();

    async function selfTestPhase2() {
      // 9. lease 0 → STALE, và STALE vẫn CHẶN (không silent takeover)
      let r2 = run(['claim', '--run', 'r1', '--lot', 'stale', '--paths', 'src/stale', '--lease-hours', '0']);
      t('claim lease 0h OK', r2.status === 0, r2.stderr);
      r2 = run(['claim', '--run', 'r1', '--lot', 'thief', '--paths', 'src/stale/sub']);
      t('STALE vẫn CHẶN — không silent takeover', r2.status === 2 && /STALE/.test(r2.stderr + r2.stdout), `exit=${r2.status}`);
      r2 = run(['renew', '--run', 'r1', '--lot', 'stale']);
      t('renew hồi lease', r2.status === 0, r2.stderr);
      // 10. extend vào path lot khác → chặn; path tự do → OK
      r2 = run(['extend', '--run', 'r1', '--lot', 'scoring', '--paths', 'src/shop']);
      t('extend chiếm path lot khác bị CHẶN (R2)', r2.status === 2, `exit=${r2.status}`);
      r2 = run(['extend', '--run', 'r1', '--lot', 'scoring', '--paths', 'src/scoring-utils']);
      t('extend path tự do OK (R2)', r2.status === 0, r2.stderr);

      // 10b. FAIL-CLOSED: claim file hỏng chặn mọi claim/status (M1)
      const claimsDir = path.join(commonDirOf(repo), 'ai-simple', 'claims');
      fs.writeFileSync(path.join(claimsDir, 'zz-corrupt.json'), '{tum lai la hong', 'utf8');
      r2 = run(['claim', '--run', 'r1', '--lot', 'anyx', '--paths', 'src/anyx']);
      t('claim file hỏng → FAIL-CLOSED chặn claim mới (M1)', r2.status !== 0 && /hỏng/.test(r2.stderr), `exit=${r2.status}`);
      r2 = run(['status']);
      t('status cũng fail-closed khi registry bẩn (M1)', r2.status !== 0, `exit=${r2.status}`);
      fs.unlinkSync(path.join(claimsDir, 'zz-corrupt.json'));
      // 10c. path chứa space bị reject từ CLI (M3)
      r2 = run(['claim', '--run', 'r1', '--lot', 'sp', '--paths', 'src/my dir']);
      t('path chứa space bị REJECT tại CLI (M3)', r2.status !== 0, `exit=${r2.status}`);
      // 10d. run-lease STALE: run khác KHÔNG silent takeover — cần --force-run (M2/R3)
      const rlFile = path.join(claimsDir, 'run-lease--main.json');
      const rlData = JSON.parse(fs.readFileSync(rlFile, 'utf8'));
      rlData.lease_until_epoch = 1;
      fs.writeFileSync(rlFile, JSON.stringify(rlData), 'utf8');
      r2 = run(['claim', '--run', 'rx', '--lot', 'take', '--paths', 'src/take']);
      t('run-lease STALE vẫn chặn run khác thiếu --force-run (M2)', r2.status === 2 && /force-run/.test(r2.stderr), `exit=${r2.status}`);
      r2 = run(['claim', '--run', 'rx', '--lot', 'take', '--paths', 'src/take', '--force-run']);
      t('takeover có chủ đích --force-run OK (M2)', r2.status === 0, r2.stderr);
      r2 = run(['release', '--run', 'rx', '--lot', 'take']);
      t('release rx dọn cả run-lease (không còn lot)', r2.status === 0 && !fs.existsSync(rlFile), r2.stderr);

      // 11. MERGE end-to-end: 2 lot, worktree per lot, queue tuần tự, integration nhận đủ
      const wt1 = path.join(sandbox, 'wt-shop'), wt2 = path.join(sandbox, 'wt-scoring');
      g(['branch', 'lot/r1/shop']); g(['branch', 'lot/r1/scoring']);
      g(['worktree', 'add', wt1, 'lot/r1/shop']); g(['worktree', 'add', wt2, 'lot/r1/scoring']);
      fs.mkdirSync(path.join(wt1, 'src/shop'), { recursive: true });
      fs.writeFileSync(path.join(wt1, 'src/shop/index.ts'), 'export const shop = 1;\n');
      git(['add', '.'], { cwd: wt1 }); git(['commit', '-q', '-m', 'feat: shop'], { cwd: wt1 });
      fs.mkdirSync(path.join(wt2, 'src/scoring'), { recursive: true });
      fs.writeFileSync(path.join(wt2, 'src/scoring/index.ts'), 'export const scoring = 1;\n');
      git(['add', '.'], { cwd: wt2 }); git(['commit', '-q', '-m', 'feat: scoring'], { cwd: wt2 });

      r2 = run(['merge', '--run', 'r1', '--lot', 'shop']);
      t('merge khi worker CHƯA nhả worktree bị chặn (R1)', r2.status !== 0, `exit=${r2.status}`);
      r2 = run(['ready', '--run', 'r1', '--lot', 'shop']);
      t('ready nhả worktree + ghi head', r2.status === 0, r2.stderr);
      r2 = run(['merge', '--run', 'r1', '--lot', 'shop']);
      t('merge lot 1 vào integration OK', r2.status === 0, r2.stderr + r2.stdout);
      r2 = run(['ready', '--run', 'r1', '--lot', 'scoring']);
      t('ready lot 2', r2.status === 0, r2.stderr);
      r2 = run(['merge', '--run', 'r1', '--lot', 'scoring']);
      t('merge lot 2 (rebase lên integration head) OK', r2.status === 0, r2.stderr + r2.stdout);
      const integTip = git(['rev-parse', 'integrate/r1'], { cwd: repo }).stdout;
      const files = git(['ls-tree', '-r', '--name-only', integTip], { cwd: repo }).stdout;
      t('integration chứa ĐỦ cả 2 lot', /src\/shop\/index\.ts/.test(files) && /src\/scoring\/index\.ts/.test(files), files);
      t('claim 2 lot đã released sau merge', !fs.existsSync(path.join(commonDirOf(repo), 'ai-simple', 'claims', 'r1--shop.json')) && !fs.existsSync(path.join(commonDirOf(repo), 'ai-simple', 'claims', 'r1--scoring.json')));
      // main (target) KHÔNG bị đụng
      t('target branch main không bị đụng', git(['rev-list', '--count', 'main..main'], { cwd: repo }).status === 0 && git(['ls-tree', '-r', '--name-only', 'main'], { cwd: repo }).stdout.trim() === 'a.txt');

      // 12. Crash recovery: journal giả lập MERGING dở → recover nhận diện + merge resume
      r2 = run(['claim', '--run', 'r1', '--lot', 'crash', '--paths', 'src/crash']);
      const wtc = path.join(sandbox, 'wt-crash');
      g(['branch', 'lot/r1/crash', 'integrate/r1']);
      g(['worktree', 'add', wtc, 'lot/r1/crash']);
      fs.mkdirSync(path.join(wtc, 'src/crash'), { recursive: true });
      fs.writeFileSync(path.join(wtc, 'src/crash/x.ts'), 'x\n');
      git(['add', '.'], { cwd: wtc }); git(['commit', '-q', '-m', 'crash lot'], { cwd: wtc });
      run(['ready', '--run', 'r1', '--lot', 'crash']);
      const crashTip = git(['rev-parse', 'lot/r1/crash'], { cwd: repo }).stdout;
      // giả lập crash SAU rebase, TRƯỚC ff: journal post_rebase_sha = tip hiện tại
      const jdir = path.join(commonDirOf(repo), 'ai-simple', 'journal');
      fs.mkdirSync(jdir, { recursive: true });
      fs.writeFileSync(path.join(jdir, 'merging-r1--crash.json'), JSON.stringify({ run: 'r1', lot: 'crash', step: 'rebase-done', at: nowIso(), post_rebase_sha: crashTip }), 'utf8');
      r2 = run(['recover', '--run', 'r1', '--lot', 'crash']);
      t('recover nhận diện journal MERGING dở', r2.status === 0 && /journal/.test(r2.stdout), r2.stdout.slice(0, 200));
      r2 = run(['merge', '--run', 'r1', '--lot', 'crash']);
      t('merge RESUME từ journal sau crash (ancestry check)', r2.status === 0 && /RESUME/.test(r2.stdout), r2.stderr + r2.stdout.slice(0, 200));

      // 13. release bảo vệ dirty
      run(['claim', '--run', 'r1', '--lot', 'dirtyrel', '--paths', 'src/dr']);
      const wtd = path.join(sandbox, 'wt-dr');
      g(['branch', 'lot/r1/dirtyrel']); g(['worktree', 'add', wtd, 'lot/r1/dirtyrel']);
      fs.writeFileSync(path.join(wtd, 'wip.txt'), 'chưa commit\n');
      r2 = run(['release', '--run', 'r1', '--lot', 'dirtyrel']);
      t('release từ chối khi worktree dirty', r2.status !== 0, `exit=${r2.status}`);

      // 14. CONCURRENT MERGE (C1) — 4 vòng, mỗi vòng 2 merge đồng thời:
      // KHÔNG được silent-loss (cả hai exit 0 mà integration thiếu lot); bên thua phải
      // còn claim để retry; sau retry tuần tự integration phải đủ cả 2 lot.
      for (let i = 0; i < 4; i++) {
        const runName = `rm${i}`, baseBr = `mbase${i}`;
        g(['branch', baseBr, 'main']);
        let setupOk = true;
        for (const lot of ['la', 'lb']) {
          const res = run(['claim', '--run', runName, '--lot', lot, '--paths', `src/cm${i}/${lot}`, '--base-branch', baseBr]);
          if (res.status !== 0) { setupOk = false; t(`cmerge vòng ${i}: setup claim ${lot}`, false, res.stderr); break; }
          const br = `lot/${runName}/${lot}`;
          g(['branch', br, baseBr]);
          const wtm = path.join(sandbox, `wt-${runName}-${lot}`);
          g(['worktree', 'add', wtm, br]);
          fs.mkdirSync(path.join(wtm, `src/cm${i}`), { recursive: true });
          fs.writeFileSync(path.join(wtm, `src/cm${i}/${lot}.ts`), `export const v = '${lot}${i}';\n`);
          git(['add', '.'], { cwd: wtm }); git(['commit', '-q', '-m', lot], { cwd: wtm });
          run(['ready', '--run', runName, '--lot', lot]);
        }
        if (!setupOk) continue;
        const codes = await Promise.all([
          spawnCli(['merge', '--run', runName, '--lot', 'la']),
          spawnCli(['merge', '--run', runName, '--lot', 'lb']),
        ]);
        // Bên thua (nếu có) phải còn claim ở trạng thái retry-được (READY sau CAS-eject,
        // hoặc nguyên READY nếu chết ở merge-lock) — không được biến mất, không được MERGING treo
        for (const lot of ['la', 'lb']) {
          const cf2 = path.join(commonDirOf(repo), 'ai-simple', 'claims', `${runName}--${lot}.json`);
          if (fs.existsSync(cf2)) {
            const cd = JSON.parse(fs.readFileSync(cf2, 'utf8'));
            if (i === 0) t(`cmerge: bên thua giữ claim trạng thái retry-được (${cd.status})`, cd.status === 'READY' || cd.status === 'ACTIVE', cd.status);
            run(['ready', '--run', runName, '--lot', lot]);
            run(['merge', '--run', runName, '--lot', lot]);
          }
        }
        const mfiles = git(['ls-tree', '-r', '--name-only', `integrate/${runName}`], { cwd: repo }).stdout;
        const both = mfiles.includes(`src/cm${i}/la.ts`) && mfiles.includes(`src/cm${i}/lb.ts`);
        const silentLoss = codes[0] === 0 && codes[1] === 0 && !both;
        t(`cmerge vòng ${i}: KHÔNG silent-loss khi 2 merge đồng thời (C1)`, !silentLoss, `codes=${codes.join(',')}`);
        t(`cmerge vòng ${i}: integration đủ 2 lot sau retry tuần tự`, both, mfiles.replace(/\n/g, ','));
      }

      // 15. Merge-lock stale takeover (N1): lock mồ côi mtime 16 phút trước → merge mới vào được
      {
        const runName = 'rstale', baseBr = 'sbase';
        g(['branch', baseBr, 'main']);
        run(['claim', '--run', runName, '--lot', 'sl', '--paths', 'src/sl', '--base-branch', baseBr]);
        g(['branch', `lot/${runName}/sl`, baseBr]);
        const wts = path.join(sandbox, 'wt-sl');
        g(['worktree', 'add', wts, `lot/${runName}/sl`]);
        fs.mkdirSync(path.join(wts, 'src/sl'), { recursive: true });
        fs.writeFileSync(path.join(wts, 'src/sl/x.ts'), 'x\n');
        git(['add', '.'], { cwd: wts }); git(['commit', '-q', '-m', 'sl'], { cwd: wts });
        run(['ready', '--run', runName, '--lot', 'sl']);
        const staleDir = path.join(commonDirOf(repo), 'ai-simple', `lock-merge--${runName}`);
        fs.mkdirSync(staleDir, { recursive: true });
        const past = new Date(Date.now() - 16 * 60_000);
        fs.utimesSync(staleDir, past, past);
        const rS = run(['merge', '--run', runName, '--lot', 'sl']);
        t('merge-lock mồ côi (16 phút) được stale-takeover, merge vẫn chạy', rS.status === 0, rS.stderr + rS.stdout.slice(0, 200));
      }

      console.log(`\nparallel self-test: ${pass} PASS, ${failn} FAIL`);
      try { fs.rmSync(sandbox, { recursive: true, force: true }); } catch { /* Windows: worktree file lock — bỏ qua */ }
      process.exit(failn ? 1 : 0);
    }
  } catch (e) {
    console.error('self-test exception: ' + (e && e.stack || e));
    process.exit(1);
  }

  function commonDirOf(repoDir) {
    const r = git(['rev-parse', '--git-common-dir'], { cwd: repoDir });
    return path.resolve(repoDir, r.stdout);
  }
}

// ---------- dispatch ----------
const HELP = `ai-simple parallel — nguyên tắc 13 (Git-Native Parallel Sessions)
  plan     --file lots.json                 MECE test + DAG→waves + admission
  claim    --run R --lot L --paths a,b [--read x,y] [--branch B] [--base-branch main]
           [--intent "..."] [--session S] [--lease-hours 8] [--wave N] [--worktree DIR]
  extend   --run R --lot L --paths new1     mở rộng write-set (qua đúng lock + overlap check)
  renew    --run R --lot L [--head SHA]     bump lease (gọi mỗi commit)
  status   [--json] [--check p1,p2]         claims + PROTECTED; --check: CLEAR/CONFLICT cho router
  ready    --run R --lot L                  verify clean + NHẢ worktree + ghi head → vào queue
  merge    --run R --lot L [--test-cmd "npm test"] [--integration BR]   queue 1 lot (journal + resume)
  recover  --run R --lot L                  checklist crash recovery — không bao giờ silent takeover
  release  --run R --lot L [--abandon] [--force]
  self-test                                  race/crash/dirty/overlap — test nghiệm thu ADR-001`;

const BOOL_FLAGS = new Set(['json', 'quiet', 'force', 'abandon', 'force-run']);
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      if (!BOOL_FLAGS.has(key) && i + 1 < argv.length && !argv[i + 1].startsWith('--')) args[key] = argv[++i];
      else args[key] = true;
    } else args._.push(a);
  }
  return args;
}

function main(argv) {
  const args = parseArgs(argv);
  const sub = args._[0];
  if (sub !== 'self-test' && sub && !inGitRepo()) die('không phải git repo');
  switch (sub) {
    case 'plan': return cmdPlan(args);
    case 'claim': return cmdClaim(args);
    case 'extend': return cmdExtend(args);
    case 'renew': return cmdRenew(args);
    case 'status': return cmdStatus(args);
    case 'ready': return cmdReady(args);
    case 'merge': return cmdMerge(args);
    case 'recover': return cmdRecover(args);
    case 'release': return cmdRelease(args);
    case 'self-test': return cmdSelfTest();
    default: console.log(HELP);
  }
}

module.exports = { main, overlaps, normPath, foldKey };
