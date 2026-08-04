# 08 — Contract với Hallmark (anti-slop layer cho landing/marketing page)

[Hallmark](https://github.com/Nutlope/hallmark) (MIT, đối chiếu bản v1.1.0) là design skill
chống "AI-looking UI" — mạnh ở macrostructure, theme, visual fingerprint, slop-test 58 gate
cho **landing/marketing page**. Đây là file CONTRACT: route + precedence + handoff.
**KHÔNG copy nội dung Hallmark vào repo này** (bài học #08/#10: copy = drift; Hallmark v1.1
vừa tách monolith thành lazy-load index — fork tóm tắt là dựng lại đúng cái nó vừa bỏ).
Cài khi cần: `npx skills add nutlope/hallmark`. Hallmark chưa cài → chỉ áp gate phổ quát
đã nhập ở 06/07, phần còn lại bỏ qua.

## 1. Bảng route — ai xử lý màn hình nào

| Loại màn hình | Xử lý | Hallmark được đụng? |
|---|---|---|
| Admin / internal / dashboard / form / report | ui-design-logic 100% (pipeline 7 bước) | **KHÔNG** — kể cả khi user nói "làm đẹp" |
| Landing / marketing / public page cần visual craft | ui-design-logic bước 0–3 (IA, screen map, budget) → Hallmark lo visual (macrostructure, theme, hero) → quay lại bước 6 QA | Có, trong ranh giới mục 2 |
| UI có sẵn nhìn "AI/slop" | 06 §3 diagnose trước; nếu là landing và cần chấm sâu → `hallmark audit` (read-only) | Audit only |
| "Redesign màn này" | Màn admin → ui-ux-triage/06 §3. Landing giữ copy/IA → `hallmark redesign`, ranh giới mục 2 | Landing only |
| User đưa screenshot/URL tham khảo | `hallmark study` (trích DNA, không pixel-clone) — chỉ khi đang làm landing | Study only |

Phân loại lấy từ **screen map trong DESIGN-SPEC**: màn hình phải khai `type: marketing-public`
thì Hallmark mới được vào. Không khai = mặc định product UI = Hallmark đứng ngoài.

## 2. Precedence — quy tắc cứng của skill này THẮNG Hallmark, không thương lượng

Khi Hallmark chạy trong project dùng skill này:

- **Font**: rule FONT trong SKILL.md override toàn bộ theme catalog. System font stack mặc định;
  CẤM Be Vietnam Pro / Plus Jakarta Sans (= theme Hum của Hallmark — không dùng theme này) /
  Fraunces; display font chỉ khi user YÊU CẦU rõ và chỉ cho hero landing. Theme Hallmark
  nhập theo kiểu **palette-only**: lấy paper/accent OKLCH, bỏ trường font.
- **Màu**: "1 neutral ramp + 1 accent + 4 semantic. Hết" + thuật toán hoà màu logo (04 §2)
  thắng palette theme khi có logo/brand. Map palette vào shadcn variables (04 §5), không
  emit `tokens.css` ở root.
- **Stack**: React + Tailwind + shadcn — Hallmark không tự dựng nav/footer archetype bằng
  HTML/CSS rời khi shadcn có component tương đương.
- **Diversification TẮT**: DESIGN-SPEC đóng vai `design.md` của Hallmark → theo chính luật
  của Hallmark ("pages must share the system"), mọi màn hình trong 1 app share 1 hệ.
  Không rotation macrostructure/theme giữa các màn. `.hallmark/log.json` không dùng.
- **3-question gate im lặng khi có spec**: có ba-spec/DESIGN-SPEC → feed audience/use-case/tone
  từ §User registry + §Flows vào Hallmark, KHÔNG để nó hỏi lại user (khớp bước 0 pipeline).
- **Risk tier giữ nguyên (07 §4)**: đổi theme/token toàn cục = RED → 1 câu confirm. Hallmark
  không được âm thầm đổi token khi build màn mới.
- **Safety rail của Hallmark giữ nguyên**: không xoá route/component/production file khi chưa
  duyệt file-level plan — trùng khớp risk tier, không nới.

## 3. Handoff — output Hallmark ghi về đâu

DESIGN-SPEC là oracle giao diện DUY NHẤT cho `ui-ux-triage` (07 §1: không có bản sao thứ hai).
Sau khi Hallmark build/redesign một landing page, ghi ngược vào DESIGN-SPEC mục
**Visual Fingerprint** của màn hình đó:

```markdown
## Visual fingerprint — <tên màn hình> (type: marketing-public)
- Macrostructure: <tên>          - Theme gốc: <tên, palette-only>
- Paper/accent: <OKLCH → biến shadcn đã map>
- Enrichment: <E# hoặc none>     - Slop-test: <N>/58 pass (gate fail còn lại: ...)
- Mobile verify: 320 / 375 / 768 / 1440 ✓
```

Token Hallmark đề xuất → lift vào `globals.css` theo 04 §5 CÙNG COMMIT. Stamp CSS của
Hallmark giữ nguyên trong code (vô hại, giúp audit sau này). QA cuối vẫn là screenshot
loop 06 — slop-test của Hallmark không thay thế nghiệm thu của skill này.

## 4. Cái đã nhập hẳn vào skill này (dùng được không cần cài Hallmark)

Các gate phổ quát đúng cho MỌI UI đã được cherry-pick (ghi nguồn gate để tra lại):
checklist 06 §2 (invented metrics — gate 46; fake chrome — 47; clickable text 2 dòng — 49;
scroll ngang mobile — 34; italic heading — 38a) và grep pre-commit 07 §5 (màu hard-code
ngoài token — 48; `overflow-x: hidden` ở root — 34; `1fr` trần cho grid ảnh — 50).
Đây là toàn bộ phần được phép "copy" — từng dòng checklist, không phải nội dung file.
