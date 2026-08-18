# Giao thức A/B ngữ nghĩa — vòng đo đủ 34 case (2026-08-18)

Trả lời câu hỏi: **nạp skill có làm câu trả lời khác đi theo hướng luật của skill không**, hay skill chỉ là
văn bản đẹp mà mô hình vốn đã tự làm được? Đây là bằng chứng duy nhất cho lớp ngữ nghĩa — phần còn lại của
repo (hook, gate, verify script) là lớp tất định, đã có self-test riêng.

## Thiết kế

| Trục | Cách làm |
|---|---|
| Control | agent context sạch, **CẤM đọc `skills/` và `methodology/`**, chỉ nhận đề |
| Treatment | agent đọc `SKILL.md` của đúng skill (+ references) rồi trả lời cùng bộ đề |
| Đề bài | sinh bằng `eval-runner --emit-task` — **không kèm `expected_output`** |
| Rubric | sinh riêng bằng `--emit-rubric`, chỉ judge được đọc |
| Judge | 2 agent độc lập/skill, mỗi agent chỉ đọc đúng 1 file gói chấm |
| Chống thiên vị | nhãn **Bản A / Bản B đảo khác nhau theo skill**; map cất ở file riêng judge không đọc |

Nhãn đảo là điểm quan trọng: nếu mọi gói đều để treatment ở vị trí B, một judge đoán được quy luật là phép
đo hỏng mà không ai biết. Đây cùng lớp lỗi với **án lệ 2026-08-15** (hai vòng đo routing đầu bị huỷ vì agent
nhìn thấy cột "Kỳ vọng" nằm cạnh Prompt).

## 4 điều kiện chốt số — `eval-runner --report` tự kiểm

Runner **từ chối in con số so sánh** khi chưa đủ cả 4; điều này là cố ý, có fixture ép:

1. phủ đủ 34 case · 2. ≥2 vòng đo độc lập · 3. có cặp control↔treatment trong CÙNG vòng · 4. inter-rater ≥80%

Inter-rater tính trên ô `(run, variant, skill, case)` được ≥2 judge chấm. Gộp theo judge trước khi so
(verdict cuối thắng) — một judge ghi lại không được tính là tự bất đồng với chính mình.

## Kết quả đo được

- `run-2026-08-18-ab` — skill `ai-simple-product-dev`, 7 case × 2 variant × 2 judge
- `run-2026-08-18-full` — 4 skill còn lại, 27 case × 2 variant × 2 judge

Trên 2 vòng có ≥2 judge: **baseline 1/68 quan sát pass (1%) · with_skill 63/68 (93%)**, inter-rater
**59/68 = 87%**.

## Đọc con số này cho đúng

- Nó đo **tuân luật theo rubric của chính skill**, không đo "trả lời hay hơn". Bản baseline nhiều chỗ viết
  tốt về kỹ thuật nhưng trượt vì thiếu thứ luật bắt buộc phải có (khai declared-coverage A/B/C, risk tier,
  AC dạng Given/When/Then kèm `Test:`/`Assert`, screenshot before/after, từ chối + định tuyến ở case
  non-trigger). Rubric do chính repo này viết ⇒ đây là bằng chứng **nội bộ nhất quán**, không phải bằng
  chứng "tốt hơn theo chuẩn ngoài".
- 13% bất đồng còn lại nằm ở ranh giới `pass`/`partial` của các case yêu cầu nhiều tiêu chí — chỗ nào lệch
  thì sửa **rubric** cho hết mơ hồ, không phải chỉnh câu trả lời.
- Judge và thí sinh cùng họ mô hình. Muốn mạnh hơn thì chạy lại với người chấm hoặc mô hình khác họ; giao
  thức không đổi, chỉ đổi `--judge`.

## Chạy lại

```bash
node scripts/eval-runner.js --emit-task <skill> <id>     # đề, không đáp án
node scripts/eval-runner.js --emit-rubric <skill> <id>   # rubric, chỉ judge đọc
node scripts/eval-runner.js --record <skill> <id> <pass|fail|partial> --run <run> --variant <baseline|with_skill> --judge <j>
node scripts/eval-runner.js --report
```
