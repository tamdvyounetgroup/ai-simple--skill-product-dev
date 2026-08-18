#!/usr/bin/env node
/* perf-budget.js — v1.21.0. NGÂN SÁCH THỜI GIAN có máy ép.
 *
 * Vì sao có file này: hook từng tụt xuống ~1m37s MỖI COMMIT trên project tiêu thụ (19 doc, 70
 * covers-path) mà KHÔNG cổng nào báo — vì self-test của hook chạy trên temp repo 1-3 doc (~1.4s).
 * Regression 100× (fork-per-covers-path) chỉ bị phát hiện bằng audit tay. Test chức năng xanh
 * không đủ: hệ này bán "gate chạy mỗi commit", nên TỐC ĐỘ là hợp đồng, không phải tuỳ chọn.
 *
 * Cách đo: dựng repo tạm ở QUY MÔ THẬT (mặc định 20 doc × 4 covers-path = 80 path, ~40 file code),
 * chạy hook đúng đường commit thật, so với ngân sách. In số đo dù đạt hay không.
 *
 * Ngân sách CHỌN THEO NGUYÊN TẮC, không theo số đẹp: mỗi commit phải nhanh hơn thời gian một người
 * mất kiên nhẫn (~10s). Đặt trần 20s để còn biên cho máy chậm/CI, và vẫn bắt được regression bậc 10×.
 *
 * Dùng: node scripts/perf-budget.js [--budget-ms N] [--docs N] [--self-test]
 */
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const argVal = (n, d) => { const i = args.indexOf(n); return i >= 0 ? Number(args[i + 1]) : d; };
const BUDGET_MS = argVal('--budget-ms', 20000);
const NDOCS = argVal('--docs', 20);

function sh(cmd, cwd) { return spawnSync(cmd[0], cmd.slice(1), { cwd, encoding: 'utf8', shell: false }); }
function git(a, cwd) { return sh(['git', ...a], cwd); }

function buildRepo(dir, ndocs) {
  fs.mkdirSync(path.join(dir, '.githooks'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'docs', 'app-map'), { recursive: true });
  git(['init', '-q', '.'], dir); git(['config', 'user.email', 't@t.t'], dir); git(['config', 'user.name', 't'], dir);
  fs.copyFileSync(path.join(ROOT, 'templates', 'pre-commit.hook.template'), path.join(dir, '.githooks', 'pre-commit'));
  git(['config', 'core.hooksPath', '.githooks'], dir);
  for (let d = 1; d <= ndocs; d++) {
    const covers = [];
    for (let c = 0; c < 4; c++) {
      const mod = `src/mod${d}_${c}`;
      fs.mkdirSync(path.join(dir, mod), { recursive: true });
      fs.writeFileSync(path.join(dir, mod, 'index.ts'), `export const m${d}_${c} = ${d};\n`);
      covers.push(mod);
    }
    fs.writeFileSync(path.join(dir, 'docs', 'app-map', `${String(d).padStart(2, '0')}-doc.md`),
      `# doc ${d}\n> Load khi: task cham mod${d}\ncovers: ${covers.join(', ')}\ngate: warn\nlast_verified: 2026-08-01\nttl_days: 90\n\n## Noi dung\nmo ta.\n`);
  }
  git(['add', '-A'], dir); git(['commit', '-qm', 'setup'], dir);
}

function measure(dir) {
  const f = path.join(dir, 'src', 'mod1_0', 'index.ts');
  fs.appendFileSync(f, '// touch\n');
  git(['add', '-A'], dir);
  const t0 = Date.now();
  const r = git(['commit', '-m', 'perf probe'], dir);
  return { ms: Date.now() - t0, status: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

if (args.includes('--self-test')) {
  // Self-test của chính công cụ đo: repo 2 doc phải chạy nhanh hơn hẳn ngân sách, và phép đo phải
  // trả về số dương + commit thành công (nếu hook chặn thì số đo vô nghĩa).
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'perfbud-'));
  buildRepo(dir, 2);
  const m = measure(dir);
  fs.rmSync(dir, { recursive: true, force: true });
  const ok = m.ms > 0 && m.status === 0;
  console.log(ok
    ? `PASS perf-budget self-test (repo 2 doc: ${m.ms}ms, commit qua hook thành công)`
    : `FAIL perf-budget self-test: ms=${m.ms} status=${m.status}\n${m.out}`);
  process.exit(ok ? 0 : 1);
}

const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'perfbud-'));
buildRepo(dir, NDOCS);
const runs = [measure(dir), measure(dir)];
fs.rmSync(dir, { recursive: true, force: true });
const best = Math.min(...runs.map((r) => r.ms));
const bad = runs.find((r) => r.status !== 0);
console.log(`perf-budget: hook trên repo ${NDOCS} doc / ${NDOCS * 4} covers-path — ${runs.map((r) => r.ms + 'ms').join(' · ')} (lấy min: ${best}ms, ngân sách ${BUDGET_MS}ms)`);
if (bad) { console.log('FAIL perf-budget: hook CHẶN commit thăm dò — số đo không có nghĩa:\n' + bad.out.split('\n').slice(0, 5).join('\n')); process.exit(1); }
if (best > BUDGET_MS) {
  console.log(`FAIL perf-budget: ${best}ms > ngân sách ${BUDGET_MS}ms.`);
  console.log('  -> Đây là hợp đồng tốc độ của "gate chạy mỗi commit": chậm hơn ngưỡng thì dev sẽ dùng --no-verify.');
  console.log('  -> Nghi trước hết: vòng lặp có fork/spawn theo SỐ PATH hoặc SỐ DOC (case builtin thay $(...)).');
  process.exit(1);
}
console.log('PASS perf-budget (hook trong ngân sách ở quy mô thật)');
