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

## Nhóm B — semantic

Chưa có runner (2/5 skill có evals: ba-flow 8 case, ui-design 5 case). Deadline: trước Wave 4a.

## Phân rã per-block hook self-test (phục vụ KPI Wave 2b "<60s")

KPI "<60s" CHỈ được chốt sau khi phân rã cho thấy tổng phần cắt được ≥38s (mốc sạch 98s).
Lần đo awk-arrival-time thất bại vì pipe buffering (mọi dòng tới cùng lúc) — Wave 2b đo lại bằng
timestamp chèn trong-process (`date +%s` giữa các fixture block, bản instrument tạm, không commit).
Hàng này KHÔNG chặn Wave 1.
