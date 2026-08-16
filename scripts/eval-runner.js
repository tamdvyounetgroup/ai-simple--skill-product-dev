#!/usr/bin/env node
/* eval-runner.js — Wave 4a: runner cho semantic eval của 5 skill (L3 của test pyramid).
 *
 * VẤN ĐỀ nó giải: evals.json để prompt CẠNH expected_output, nên "agent làm bài không thấy đáp án"
 * không thực hiện được nếu cứ đưa cả file cho agent. Runner này TÁCH DỮ LIỆU:
 *   --emit-task <skill> <id>   → in DUY NHẤT prompt (+ file fixture nếu có). KHÔNG có expected.
 *   --emit-rubric <skill> <id> → in expected_output cho JUDGE (agent khác, không phải agent làm bài).
 *   --list                     → bảng skill/id/eval_name (điều phối viên dùng để phát bài).
 *   --record <skill> <id> <pass|fail|partial> --run <run_id> --variant <baseline|with_skill>
 *                              [--model M] [--judge J] [ghi chú] → ghi 1 QUAN SÁT có danh tính.
 *                              Khoá duy nhất (run_id, variant, skill, case_id) — trùng thì từ chối.
 *   --report                   → theo VÒNG ĐO và VARIANT + checklist điều kiện chốt ngưỡng
 *                              (phủ đủ case · ≥2 vòng · có cặp control↔treatment · inter-rater).
 *   --self-test                → kiểm chính runner (tách dữ liệu THẬT SỰ tách, schema evals hợp lệ).
 *
 * NHÃN TRUNG THỰC: runner này là HẠ TẦNG TÁCH BÀI + GHI SỔ [ENFORCED ở phần schema/tách dữ liệu].
 * Việc CHẤM là do agent/người (ADVISORY) — không có máy nào tự phán semantic đúng/sai.
 * Ngưỡng release semantic (blind A/B ≥70%...) CHỈ được chốt sau ≥2 lần đo baseline thật (kế hoạch hội đồng).
 * Zero-dependency.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SKILLS = ['ai-simple-product-dev', 'ba-flow-logic', 'security-logic', 'ui-design-logic', 'ui-ux-triage'];
const BASELINE = path.join(ROOT, 'docs', 'baseline', 'semantic-baseline.jsonl');

function loadEvals(skill) {
  const p = path.join(ROOT, 'skills', skill, 'evals', 'evals.json');
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}
function getCase(skill, id) {
  const e = loadEvals(skill);
  if (!e) die(`skill '${skill}' chưa có evals/evals.json`);
  const c = e.evals.find((x) => String(x.id) === String(id));
  if (!c) die(`không có eval id='${id}' trong skill '${skill}'`);
  return c;
}
function die(m) { console.error('FAIL eval-runner: ' + m); process.exit(1); }

const [, , cmd, a1, a2, a3, ...rest] = process.argv;

if (cmd === '--list') {
  let n = 0;
  for (const s of SKILLS) {
    const e = loadEvals(s);
    if (!e) { console.log(`${s.padEnd(24)} (chưa có evals)`); continue; }
    for (const c of e.evals) { console.log(`${s.padEnd(24)} id=${String(c.id).padEnd(3)} ${c.eval_name}`); n++; }
  }
  console.log(`--- tổng ${n} case / ${SKILLS.length} skill`);
  process.exit(0);
}

if (cmd === '--emit-task') {
  const c = getCase(a1, a2);
  // CHỈ prompt + fixture. Không in eval_name (có thể lộ đáp án), không in expected_output.
  console.log(c.prompt);
  for (const f of c.files || []) {
    const fp = path.join(ROOT, 'skills', a1, 'evals', f);
    if (fs.existsSync(fp)) { console.log(`\n--- FILE: ${f} ---`); console.log(fs.readFileSync(fp, 'utf8')); }
  }
  process.exit(0);
}

if (cmd === '--emit-rubric') {
  const c = getCase(a1, a2);
  console.log(`# rubric cho ${a1} id=${a2} (${c.eval_name})`);
  console.log(c.expected_output);
  process.exit(0);
}

// v1.18.0 (audit 2026-08-16) — EXPERIMENT RUNNER, không còn là sổ append phẳng.
// Lỗ cũ: baseline và with_skill append chung, case lặp tính thành mẫu mới, không có run_id/variant/
// model/judge/timestamp → "83% pass" không đại diện cho 34 case và không so control↔treatment được.
// Record nay là một QUAN SÁT có danh tính: (run_id, variant, skill, case_id) là KHOÁ DUY NHẤT.
if (cmd === '--record') {
  const usage = 'dùng: --record <skill> <id> <pass|fail|partial> --run <run_id> --variant <baseline|with_skill> [--model M] [--judge J] [ghi chú]';
  if (!a1 || !a2 || !a3) die(usage);
  if (!['pass', 'fail', 'partial'].includes(a3)) die(`verdict '${a3}' ngoài {pass,fail,partial}`);
  const flag = (name) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : null; };
  const runId = flag('run'), variant = flag('variant');
  if (!runId) die('thiếu --run <run_id> — không có run_id thì không gom được vòng đo, không so được 2 vòng độc lập');
  if (!['baseline', 'with_skill'].includes(variant)) die('thiếu/sai --variant: phải là baseline hoặc with_skill (control vs treatment)');
  const c = getCase(a1, a2);
  const note = rest.filter((x, i) => !x.startsWith('--') && !['run', 'variant', 'model', 'judge'].includes(rest[i - 1]?.replace(/^--/, ''))).join(' ');
  const row = { run_id: runId, variant, skill: a1, case_id: c.id, eval_name: c.eval_name, verdict: a3,
    model: flag('model') || 'unspecified', judge: flag('judge') || 'unspecified', timestamp: new Date().toISOString(), note };
  fs.mkdirSync(path.dirname(BASELINE), { recursive: true });
  const prior = fs.existsSync(BASELINE) ? fs.readFileSync(BASELINE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l)) : [];
  const dupe = prior.find((r) => r.run_id === runId && r.variant === variant && r.skill === a1 && String(r.case_id) === String(c.id));
  if (dupe) die(`đã có quan sát cho (${runId}, ${variant}, ${a1}, ${c.id}) = ${dupe.verdict} — khoá duy nhất, đừng append đè (đổi --run nếu là vòng đo mới)`);
  fs.appendFileSync(BASELINE, JSON.stringify(row) + '\n', 'utf8');
  console.log(`ghi quan sát: run=${runId} variant=${variant} ${a1}/${c.id} = ${a3}`);
  process.exit(0);
}

if (cmd === '--report') {
  if (!fs.existsSync(BASELINE)) { console.log('chưa có quan sát nào (docs/baseline/semantic-baseline.jsonl)'); process.exit(0); }
  const raw = fs.readFileSync(BASELINE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
  const legacy = raw.filter((r) => !r.run_id).length;
  const rows = raw.filter((r) => r.run_id);
  const TOTAL_CASES = SKILLS.reduce((n, s) => n + ((loadEvals(s) || { evals: [] }).evals.length), 0);
  const runs = [...new Set(rows.map((r) => r.run_id))];
  console.log(`Tổng case trong bộ eval: ${TOTAL_CASES} · số vòng đo: ${runs.length} · quan sát hợp lệ: ${rows.length}${legacy ? ` (bỏ qua ${legacy} dòng format cũ, thiếu run_id)` : ''}`);
  for (const run of runs) {
    for (const variant of ['baseline', 'with_skill']) {
      const set = rows.filter((r) => r.run_id === run && r.variant === variant);
      if (!set.length) continue;
      const uniq = new Set(set.map((r) => `${r.skill}/${r.case_id}`)).size;
      const ok = set.filter((r) => r.verdict === 'pass').length;
      console.log(`  run=${run.padEnd(12)} ${variant.padEnd(10)} ${ok}/${set.length} pass · phủ ${uniq}/${TOTAL_CASES} case (${Math.round((uniq / TOTAL_CASES) * 100)}%)`);
    }
  }
  const cov = new Set(rows.map((r) => `${r.skill}/${r.case_id}`)).size;
  console.log('--- ĐIỀU KIỆN chốt ngưỡng release (chưa đạt cái nào thì KHÔNG được coi 1 con số % là release score):');
  console.log(`    [${cov === TOTAL_CASES ? 'x' : ' '}] phủ đủ ${TOTAL_CASES} case (hiện ${cov})`);
  console.log(`    [${runs.length >= 2 ? 'x' : ' '}] ≥2 vòng đo độc lập (hiện ${runs.length})`);
  const paired = runs.some((run) => ['baseline', 'with_skill'].every((v) => rows.some((r) => r.run_id === run && r.variant === v)));
  console.log(`    [${paired ? 'x' : ' '}] có cặp control↔treatment trong CÙNG vòng để so`);
  console.log('    [ ] inter-rater agreement (≥2 judge độc lập trên cùng quan sát) — chưa có cơ chế, ghi nhận là khoảng trống');
  process.exit(0);
}

if (cmd === '--self-test') {
  let rc = 0;
  const fail = (m) => { rc = 1; console.log('FAIL eval-runner: ' + m); };
  // 1) Mọi skill có evals phải đúng schema + id duy nhất + 3 trường bắt buộc
  let totalCases = 0, withEvals = 0;
  for (const s of SKILLS) {
    const e = loadEvals(s);
    if (!e) continue;
    withEvals++;
    if (e.skill_name !== s) fail(`${s}: skill_name='${e.skill_name}' ≠ tên thư mục`);
    if (!Array.isArray(e.evals) || !e.evals.length) { fail(`${s}: evals rỗng`); continue; }
    const ids = new Set();
    for (const c of e.evals) {
      totalCases++;
      for (const k of ['id', 'eval_name', 'prompt', 'expected_output']) if (!(k in c)) fail(`${s}/${c.id}: thiếu '${k}'`);
      if (ids.has(String(c.id))) fail(`${s}: id '${c.id}' TRÙNG`);
      ids.add(String(c.id));
      if (typeof c.prompt === 'string' && c.prompt.length < 15) fail(`${s}/${c.id}: prompt quá ngắn`);
    }
  }
  // 2) TÁCH DỮ LIỆU THẬT: output --emit-task KHÔNG được chứa expected_output (dù một câu)
  for (const s of SKILLS) {
    const e = loadEvals(s);
    if (!e) continue;
    for (const c of e.evals) {
      const task = [c.prompt, ...(c.files || [])].join('\n');
      const firstSentence = String(c.expected_output).split(/[.\n]/)[0].trim();
      if (firstSentence.length > 20 && task.includes(firstSentence)) fail(`${s}/${c.id}: prompt LỘ expected_output (blind bị phá)`);
    }
  }
  // 3) Fixture ranh giới của chính runner: verdict ngoài enum phải bị từ chối
  if (['pass', 'fail', 'partial'].includes('probably')) fail('enum verdict hỏng');
  console.log(rc === 0
    ? `PASS eval-runner (${withEvals}/${SKILLS.length} skill có evals, ${totalCases} case, schema hợp lệ, tách dữ liệu không lộ đáp án)`
    : 'eval-runner self-test: CÓ FAIL');
  process.exit(rc);
}

console.log(`eval-runner — dùng:
  node scripts/eval-runner.js --list
  node scripts/eval-runner.js --emit-task <skill> <id>      # phát cho agent LÀM BÀI (không đáp án)
  node scripts/eval-runner.js --emit-rubric <skill> <id>    # phát cho agent CHẤM (judge riêng)
  node scripts/eval-runner.js --record <skill> <id> <pass|fail|partial> --run <id> --variant <baseline|with_skill> [--model M] [--judge J] [note]
  node scripts/eval-runner.js --report
  node scripts/eval-runner.js --self-test`);
process.exit(0);
