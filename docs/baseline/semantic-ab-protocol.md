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

## 3 điều kiện chốt số — `eval-runner --report` tự kiểm

Runner **từ chối in con số so sánh** khi chưa đủ cả 3; điều này là cố ý, có fixture ép:

1. phủ đủ 34 case
2. **TỪNG case** có ≥2 "vòng đủ" — vòng đủ = trong CÙNG run có baseline + with_skill, mỗi biến thể ≥2 judge
3. inter-rater ≥80%

Điều kiện 2 từng bị viết sai (v1.22.0): đếm `số run ≥ 2` trên toàn corpus. Hai run chia đôi corpus
(7 case + 27 case) làm checklist xanh trong khi 31/34 case mới có một vòng — audit ngoài bắt, có fixture
tái hiện đúng ca đó trong `--self-test`. Con số v1.22.0 công bố (93%) vì thế là **overclaim**, đã rút.

Inter-rater tính trên ô `(run, variant, skill, case)` được ≥2 judge chấm. Gộp theo judge trước khi so
(verdict cuối thắng) — một judge ghi lại không được tính là tự bất đồng với chính mình.

## Kết quả đo được (v1.23.0)

| run | phạm vi | judge | baseline pass | with_skill pass |
|---|---|---|---|---|
| `run-2026-08-18-ab` | 7 case foundation | 2 | 1/14 | 14/14 |
| `run-2026-08-18-full` | 27 case 4 skill | 2 | 0/54 | 49/54 |
| `run-2026-08-18-r2` | **34/34 case**, agent + judge mới hoàn toàn, nhãn A/B đảo NGƯỢC vòng 1 | 2 | 2/68 | **46/68** |

Sau 2 vòng đủ cho mọi case: **baseline 3/136 (2%) · with_skill 109/136 (80%)**, inter-rater
**118/136 = 87%**. Vòng 2 thấp hơn vòng 1 rõ rệt (68% so với 93%) — đó là phương sai thật của phép đo và
là lý do một vòng không được phép chốt số. Ô rớt từ pass→partial ở vòng 2 tập trung ở foundation (thiếu
`covers:`/doc-health TTL trong câu trả lời) và security case 0/2 (thiếu gate tường minh, gán tier sai).

## Artifact thô để tái kiểm — `docs/baseline/semantic-runs/<run>/`

Mỗi run lưu: `task-<skill>.md` (đề, không đáp án) · `rubric-<skill>.md` · `answers-<skill>-<variant>.md`
(câu trả lời thô, đặt tên theo variant THẬT) · `packet-<skill>.md` (đúng file judge đã đọc, chỉ có nhãn
Bản A/B) · `blind-map.txt` (map nhãn→variant, judge không đọc) · `judge-<skill>-<j>.md` (rationale từng
ô, do judge tự ghi lúc chấm). Vòng 1 thiếu file rationale (chỉ verdict) — ghi rõ ở `README-judge-rationale.md`,
không tái tạo sau khi biết map. Dòng `note` trong JSONL trỏ tới file rationale tương ứng.

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
