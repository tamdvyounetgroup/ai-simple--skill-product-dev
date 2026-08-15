# Wave 0 baseline — số đo tại HEAD 2dd42a8 (trước v1.11.0)

> Load khi: cần so trước/sau cho mọi thay đổi gate/tốc độ (KPI Wave 2b, routing Wave 3).
> Mọi số trong file này đo bằng lệnh ghi kèm, trên máy Windows 11 chính (Git Bash), KHÔNG tải song song.
> Lượt đo đầu 2026-08-15 bị loại vì 3 process đo chạy chồng nhau (số phồng + 1 exit=1 giả) — đúng
> bài học "số nhạy-phương-pháp": chỉ nhận số từ lượt đo TUẦN TỰ SẠCH bên dưới.

## Nhóm A — deterministic

| Metric | Lệnh | Kết quả (đo sạch tuần tự 2026-08-15, HEAD 2dd42a8) |
|---|---|---|
| npm test | `time npm test` ×3 | **140s** median (144/140/140) |
| hook self-test | `time sh templates/pre-commit.hook.template --self-test` ×3 | **98s** median (98/98/100) — nghẽn chính của npm test |
| ba-verify --self-test | `time sh skills/ba-flow-logic/ba-verify.sh --self-test` ×1 | 4s |
| security-verify --self-test | ×1 | 5s |
| design-verify --self-test | ×1 | 12s |
| triage-verify --self-test | ×1 | 3s |
| stranger-path | `time node scripts/stranger-path.js` ×1 | **442s** (chuỗi prepublishOnly ≈ gates + stranger ≈ 10 phút Windows — áp lực bỏ-qua-gate thật) |
| Token metadata | `node scripts/metadata-words.js` (NGUỒN DUY NHẤT từ v1.11.0) | root 212 · ba 121 · sec 133 · design 295 · triage 79 = **840** (script JS; lệnh awk lịch sử của kế hoạch cho 817 — khác nhau do ranh giới tách từ, từ nay chỉ dùng script) |
| False-pass đã tái hiện | 3 ca — xem [false-pass-fixtures.md](false-pass-fixtures.md) | space-filename · mktemp `--staged` · hook mktemp |

## Nhóm A′ — routing snapshot

Bộ prompt + giao thức: [routing-snapshot.md](routing-snapshot.md). Phần ĐO có mốc riêng
(trước phần rút metadata đầu tiên của Wave 3), không nằm trên đường găng Wave 1.

## Nhóm B — semantic (Wave 4a — ĐÃ CÓ HẠ TẦNG)

`scripts/eval-runner.js` + evals đủ **5/5 skill, 34 case** (ba-flow 8 · ui-design 5 · security 7 · triage 7 · foundation 7);
mỗi skill ≥5 case dương + 2 case vùng-biên âm. Runner **tách dữ liệu thật** (self-test kiểm bằng máy:
`--emit-task` không được chứa câu đầu của `expected_output`) nên agent làm bài không thấy đáp án, judge đọc rubric riêng.

```sh
node scripts/eval-runner.js --list
node scripts/eval-runner.js --emit-task <skill> <id>     # phát cho agent LÀM BÀI
node scripts/eval-runner.js --emit-rubric <skill> <id>   # phát cho agent CHẤM
node scripts/eval-runner.js --record <skill> <id> pass|fail|partial [note]
node scripts/eval-runner.js --report
```

Nhãn trung thực: runner là **hạ tầng tách bài + ghi sổ [ENFORCED phần schema/tách dữ liệu]**; việc CHẤM là
agent/người [ADVISORY] — không có máy nào tự phán semantic. Ngưỡng release semantic vẫn CHƯA chốt:
cần ≥2 lần đo baseline thật (luật của chính kế hoạch), `--report` in kèm cảnh báo đó.

## Phân rã per-block hook self-test (phục vụ KPI Wave 2b "<60s")

**ĐÃ ĐO (2026-08-15, trace `PS4='+T$(date +%s) ' bash -x ... --self-test`)**: span 142s (máy đang tải nhẹ;
mốc sạch 98s), trong đó **48 điểm ≥2s tổng 112s — TOÀN BỘ là các `git commit` fixture**: mỗi fixture-commit
chạy trọn bộ hook như subprocess (~2.5-3s/lượt × ~40 fixture). Không có block đơn lẻ nào nóng —
chi phí là tích số (số fixture-commit) × (số git-spawn mỗi lượt hook).
→ **KPI Wave 2b "<60s" ĐƯỢC CHỐT** (điều kiện "phần cắt được ≥38s" thoả): đường cắt = gộp fixture
cùng repo/commit + giảm git-subprocess mỗi lượt hook chạy. Việc optimize = PR Wave 2b riêng.
(Lần đo awk-arrival-time trước đó thất bại vì pipe buffering — phương pháp trace PS4 là chuẩn từ nay.)
