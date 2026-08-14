# 08 — Landing & nguồn ngoài: route theo Type, luật của ta thắng

> **v2 (2026-08-14, nội hoá — NOTICE.md + docs/adr/002).** Bản v1 là CONTRACT trỏ sang skill
> Hallmark bên ngoài; hội đồng đo được upstream không định danh nổi (0 tag, số gate tự khai lệch
> nhau trong cùng cây) → toàn bộ gate phổ quát đã NỘI HOÁ vào 06 §2 + hook 1d, luật viết lại bằng
> lời của ta. File này còn đúng 4 việc: route theo Type, precedence, handoff, và CỬA TUỲ CHỌN
> cho công cụ ngoài khi cần visual craft thật sự.

## 1. Route theo cột Type của screen map (01 §7 — enum, design-verify BLOCK giá trị lạ)

| Type | Ai xử lý | Công cụ ngoài được đụng? |
|---|---|---|
| `product` (admin/dashboard/app — mặc định) | ui-design-logic 100% (pipeline 7 bước) | **KHÔNG** — kể cả khi user nói "làm đẹp" |
| `read` (trợ giúp/điều khoản/bài viết) | ui-design-logic; mở khoá văn diễn giải, siết đo đọc (01 §7) | KHÔNG |
| `marketing-public` (landing/marketing) | ui-design-logic bước 0–2 (IA, screen map, budget) → visual craft (tự làm theo 04, hoặc công cụ ngoài qua §4) → bước 5 platform → bước 6 QA | Có, trong ranh giới §2 |
| UI có sẵn nhìn "AI/slop" | 06 §3 diagnose 4-case trước — case B chấm bằng 06 §2 (đã đủ gate nội hoá) | Audit-only nếu là landing |
| "Xấu" nhưng thiếu hành vi/nghiệp vụ | Handoff BA (06 §3 case C) — không phải việc design | KHÔNG |

Không khai Type = mặc định `product` = công cụ ngoài đứng ngoài.

## 2. Precedence — luật của ta thắng MỌI nguồn ngoài, không thương lượng

Khi bất kỳ công cụ/skill/theme ngoài nào chạy trong project dùng ai-simple:
- **[INV] + [STACK] + [DEF] của ta override** toàn bộ đề xuất của công cụ ngoài. Font qua đúng 2 cửa
  của rule FONT [DEF] (SKILL.md); màu theo "1 neutral + 1 accent + 4 semantic + categorical" (04 §1);
  token map vào `globals.css` theo 04 §5 — công cụ ngoài KHÔNG được emit hệ token riêng ở root.
- **Một hệ cho cả app**: mọi màn hình share cùng token/macrostructure — không rotation/diversification
  giữa các màn. DESIGN-SPEC là oracle giao diện duy nhất (07 §1), không có bản sao thứ hai.
- **Có spec thì im lặng mà đọc**: audience/use-case/tone lấy từ ba-spec §User registry + design-spec —
  công cụ ngoài không được hỏi lại user điều spec đã trả lời.
- **Risk tier giữ nguyên (07 §4)**: đổi theme/token toàn cục = RED → 1 câu confirm; công cụ ngoài
  không được âm thầm đổi token khi build màn mới.

## 3. Handoff — output visual ghi về đâu

Sau khi build/redesign một màn `marketing-public`, ghi vào DESIGN-SPEC mục **Ngôn ngữ hình** của màn đó:

```markdown
## Ngôn ngữ hình — <tên màn> (type: marketing-public)
- Bố cục: <mô tả 1 dòng>          - Bảng màu: <paper/accent → biến đã map vào globals>
- Display font (nếu có, qua cửa [DEF]): <tên + lý do>
- Anti-slop: pass checklist 06 §2 (ghi mục còn fail nếu có)
- Mobile verify: 320 / 375 / 768 / 1440 ✓
```

Token đề xuất → lift vào `globals.css` theo 04 §5 CÙNG COMMIT. QA cuối vẫn là screenshot loop 06 —
không công cụ ngoài nào thay được nghiệm thu của ta.

## 4. Cửa tuỳ chọn — khi cần visual craft vượt sàn

Nói thẳng giới hạn: sau nội hoá, ta có **SÀN** anti-slop cho landing (không metric bịa, không chrome
giả, không gradient trên chữ, contrast đo theo cặp, mobile không vỡ — tất cả trong 06 §2 + hook 1d)
nhưng **không có TRẦN** visual craft — không catalog bố cục, không cơ chế trích DNA từ URL tham khảo.
Landing của ta mặc định là "đúng, không sai gì", chưa phải "trang có cá tính".

Khi user cần landing khác biệt thật sự về hình: ĐƯỢC cài công cụ ngoài (vd skill visual-craft
chuyên landing) theo đúng 3 điều kiện, vi phạm điều nào thì không cài:
1. Ghi **commit** đang cài vào design-spec màn đó (không ghi version string — số của upstream trôi);
2. Chạy trong ranh giới §1 (chỉ màn `marketing-public`) + precedence §2;
3. Output ghi về §3 — không file trạng thái/nguồn sự thật mới trong repo.

Không có công cụ ngoài → tự làm theo 04 (đủ cho SÀN) — thiếu trần là đánh đổi có ghi nhận
(docs/adr/002), không phải quên.
