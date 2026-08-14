# 04 — Visual Tokens: mọi con số đã được quyết sẵn

Tầng visual chỉ chạy SAU khi 01–03 xong. Token dưới đây là mặc định cho mọi project;
chỉ override khi DESIGN-SPEC ghi lý do.

## 1. Màu

**Cấu trúc bắt buộc: 1 neutral ramp + 1 accent + 4 semantic. Không thêm họ màu trang trí.**

- Neutral: dùng ramp xám của Tailwind (slate/zinc/stone — chọn 1, ghi vào spec). Nền trang
  `*-50`, card trắng, border `*-200`, text phụ `*-500`, text chính `*-900`
- Accent: MỘT màu, dùng cho primary button, link, focus ring, trạng thái active. Accent xuất hiện
  < 10% diện tích màn hình — accent tràn lan thì không còn gì nổi bật
- Semantic cố định toàn app: success=green, warning=amber, danger=red, info=blue.
  Accent KHÔNG trùng họ với semantic (accent đỏ làm nút xoá mất nghĩa)
- **Categorical palette cho chart** (chỉ khi app có chart nhiều series): 02 §1 bắt hue mã hoá
  DANH MỤC — semantic KHÔNG được trưng dụng làm màu danh mục (phá nghĩa cố định của nó).
  Khai riêng 4–6 màu chart trong spec (đủ khác hue, cùng độ bão hoà, phân biệt được với mù màu
  — desaturate thử để kiểm); series thứ 7+ là dấu hiệu chart sai loại, không phải thiếu màu
- Text contrast ≥ 4.5:1 — **đo theo CẶP (màu chữ, màu nền THỰC TẾ sau khi kế thừa)**, không đo theo
  token khai báo. Ba đường lọt kinh điển: chữ trong card kế thừa color mặc định khi card đã đổi nền;
  nền tối không đổi màu chữ trong cùng rule; nền accent không có token chữ-trên-accent. Text trên nền
  có sắc lấy stop đậm cùng họ hoặc foreground token — không đen tuyền, không xám trung tính
  *(nguồn ý tưởng HM-contrast-pair + IMP-gray-on-color · ép bởi 06 §2 BLOCK + đo thật trong QA loop)*
- **CẤM tô gradient lên CHỮ** — không ngoại lệ kể cả landing: chữ gradient không đo được contrast
  nên nó lọt MỌI cổng màu; nhấn bằng weight/cỡ/accent đặc *(nguồn ý tưởng HM∩IMP-gradient-text ·
  ép bởi hook 1d-g BLOCK)*

## 2. Hoà màu logo — quy trình 4 bước, chống "logo chỏi lỏi"

Logo chỏi vì 2 lỗi: lấy nguyên màu logo làm accent dù nó quá chói/quá bẩn,
hoặc bỏ qua logo chọn màu vô can. Quy trình:

```
B1. Lấy màu chủ đạo logo (hue H, saturation S, lightness L)
B2. Phân loại:
    a) Màu "dùng được" (S 40–90%, L 35–60%, không phải vàng neon/xanh chuối)
       → accent = chính nó, chỉnh L TỚI KHI ĐO ĐƯỢC contrast ≥ 4.5:1 với chữ trắng — ĐO,
         không áng chừng: hue ấm (đỏ/cam/vàng, H 0–60°) thường phải xuống L 32–40% mới đạt
         (hsl(25,60%,45%) + chữ trắng chỉ 4.18:1 = trượt gate BLOCK 06 §2); hue lạnh đạt ở L 45–55%.
         Không muốn hạ L (mất chất logo) → đổi chữ trên accent sang đen/tối cùng họ và đo lại
    b) Màu quá chói/quá nhạt (vàng, cam neon, pastel)
       → accent = giữ HUE, kéo S xuống 50–70%, L hạ tới khi ĐO ĐƯỢC ≥ 4.5:1 theo quy tắc (a)
       → màu gốc logo chỉ xuất hiện trong chính logo và các điểm nhấn nhỏ (icon trang trí)
    c) Logo đen/trắng/xám → tự do chọn accent theo ngành (tài chính: xanh dương đậm;
       nông nghiệp: xanh lá trầm; trẻ em: coral...) — ghi lý do vào spec
    d) Logo nhiều màu (cầu vồng) → coi như (c), chọn 1 màu trong logo làm accent, các màu kia bỏ
B3. Chọn neutral ramp NGHIÊNG theo accent: accent ấm (đỏ/cam) → stone; accent lạnh (xanh) → slate;
    không rõ → zinc. Đây là thứ làm cả giao diện "cùng tông" với logo một cách vô hình
B4. Logo luôn đặt trên nền neutral (trắng/xám nhạt/sidebar sẫm) với khoảng thở ≥ 1× chiều cao logo.
    KHÔNG đặt logo trên nền accent, không đổi màu logo, không thêm shadow cho logo
```

## 3. Typography

- 1 font duy nhất cho UI nghiệp vụ — MẶC ĐỊNH SYSTEM FONT STACK (rule FONT [DEF] trong SKILL.md):
  `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif`.
  Không serif/display trang trí, không font trendy cho UI sản phẩm. Font riêng (kể cả Inter) chỉ khi
  (a) user chỉ đích danh font, hoặc (b) design-spec ghi `## Ngoại lệ đã duyệt` với lý do
  audience/kỹ thuật (xem SKILL.md — lý do "đẹp/trendy" không được tính). Font user đã chê đích danh
  → mục Anti-references của spec project đó, không phải luật toàn cục.
  Landing page ĐƯỢC PHÉP thêm 1 display font cho hero — cũng chỉ qua 2 cửa (a)/(b) trên.
  Được phép +1 font MONO chỉ cho code, ID, phím tắt, data label kỹ thuật (10–14px; label uppercase
  thì tracking +0.3 đến +1.5px) — chuẩn ngành Linear/Vercel. Không mono cho body. Tối đa 3 font/project
- Scale: 12 (caption) / 13 (label phụ) / 14 (body UI) / 16 (body đọc dài) / 18 (section title)
  / 22 (page title) / 20–24 (metric phụ — ≥ 1,5× cỡ label) / 32–40 (hero KPI — 2–3× cỡ label; tỷ lệ 2–3× CHỈ cho hero, xem 02 §5) / 40+ (chỉ landing hero)
- Weight: 400 và 500–600. Không 300 cho chữ < 18px (mảnh quá), không 700+ trong UI (chỉ landing)
- Line-height: 1.5 body, 1.2–1.3 heading. Đoạn đọc dài: max-width 65–75 ký tự
- **Chữ IN HOA không dùng line-height < 1.0** (sàn 1.0, nên 1.05–1.1) — lý do của ta nặng hơn nguồn:
  chữ hoa tiếng Việt có dấu (Ế, Ồ, Ữ, Ằ) đội thêm một tầng trên đỉnh chữ, `leading-none` là cắt dấu
  *(nguồn ý tưởng HM-caps-leading + lý do riêng · ép bởi hook 1d-m WARN P2)*
- **Cỡ chữ trong app (`product`/`read`) là thang rem CỐ ĐỊNH**; `clamp()` chỉ hợp lệ ở màn
  `marketing-public` — và `text-[clamp(...)]` vô hiệu hoá gate type-ramp (không so được với ramp)
  *(nguồn ý tưởng IMP-fixed-rem-scale · ép bởi hook 1d-n WARN P2)*
- **Một bộ icon duy nhất cho cả project** ([STACK] mặc định `lucide-react`); **emoji không làm icon
  chức năng** — emoji do OS vẽ mỗi máy một kiểu, và ✨🚀 là dấu hiệu AI rõ nhất còn lại
  *(nguồn ý tưởng HM-emoji-icon · ép bởi 06 §2)*
- **Landing hero display**: tỷ lệ hero/body 8–12:1 (body 16 → hero 130–190px desktop);
  luôn fluid bằng `clamp()` với TRẦN px cứng (120–200px — Awwwards SOTY đo thực tế: Lando 127,
  Scout cap 160, Dropbox cap 200); line-height 0.8–1.0; letter-spacing âm −0.01 → −0.03em
  tăng dần theo cỡ, KHÔNG tracking âm cho chữ < 20px; cả landing chỉ dùng 3–4 cỡ chữ tổng cộng

## 4. Hình khối & độ nổi

- Radius thống nhất: button/input 4–8px (trung tâm ngành 4–6: Stripe 4, Linear/Ant/Primer 6;
  Polaris 8 là biên trên — không 16px+ cho control), card 8–12px, modal/sheet 12–16px, badge/pill full.
  CHỌN 1 BỘ ghi vào spec — trộn card vuông cạnh card tròn là lỗi nhận ra ngay
- Elevation 3 mức, dùng border làm chính: mức 0 nền; mức 1 card = border 1px neutral-200
  + shadow-sm; mức 2 overlay = shadow-lg — và **cấm ghép border với shadow-lg trở lên trên CÙNG
  element** (bóng toả rộng dưới viền mảnh = 2 lớp elevation khai cùng một việc; border+shadow-sm
  mức 1 không bị đụng). Không shadow màu, không glow — glow = shadow offset 0 mọi hướng, hook 1d-h
  BLOCK *(nguồn ý tưởng IMP-ghost-card thu hẹp + IMP-no-glow · ép bởi hook 1d-h BLOCK, 1d-o WARN P2)*
- Border phân tách dùng neutral-200; HOẶC dùng nền xám phân tách — chọn 1, không dùng cả hai chỗ này chỗ kia

## 4b. Bề mặt trình duyệt — theme phải phủ tới nơi ít ai nhớ

Các bề mặt trình duyệt tự vẽ sẽ TỐ CÁO app "chưa xong" nếu để mặc định giữa một theme đã chăm chút.
Khai trong `globals.css` cùng chỗ với token *(nguồn ý tưởng IMP-browser-surfaces · ép bởi hook 1d-p WARN)*:
- `::selection` — nền chọn từ palette, chữ trên nó ĐO ≥ 4.5:1 (đừng accent nhạt + chữ trắng)
- `caret-color` — con nháy theo accent, không đen mặc định trên theme màu
- Focus ring: MỘT token cho cả app (width + `outline-offset` ≥ 2px + màu) — khớp luật focus [INV] ở SKILL.md
- Thanh cuộn của vùng cuộn DO MÌNH TẠO (panel/table/sheet) — style cho khớp nền; KHÔNG vẽ lại
  scrollbar của cả trang, không tự chế form control
- `text-underline-offset` 2–3px cho link trong body — gạch chân sát chân chữ có dấu tiếng Việt rất xấu

## 5. Triển khai với shadcn/ui

- Theme qua CSS variables trong `globals.css` (`--primary`, `--radius`...) — KHÔNG sửa file component
- Map: accent → `--primary`; neutral ramp → `--background/--muted/--border`; radius bộ đã chọn → `--radius`
- Dark mode: shadcn có sẵn qua `.dark` — định nghĩa đủ biến dark NGAY từ đầu, vì retrofit
  dark mode đắt gấp 10. Dark ≠ đảo màu: nền `neutral-950`, card `neutral-900`,
  accent TĂNG lightness 10–15% để giữ contrast
- Spacing dùng class Tailwind chuẩn (p-2/3/4/6/8 = thang 8/12/16/24/32). Cấm arbitrary value
  `p-[13px]` — thấy `[..px]` trong code UI là vi phạm thang spacing

## 6. Motion

- Transition 150–200ms ease-out cho hover/focus; 250–300ms cho drawer/modal. KHÔNG animation > 400ms trong UI nghiệp vụ
- Animation phải có nghĩa (xuất hiện từ hướng nó trượt vào, fade khi thay nội dung) — không trang trí
- **Màn `product`/`read`: chỉ animate `transform` và `opacity`.** Cấm `transition-all`; cấm animate
  `width/height/top/left/margin/padding` (tính lại layout mỗi frame — máy yếu là máy của user thật).
  1 element = 1 tín hiệu hover; easing không nảy (bounce/elastic) cho trạng thái UI.
  *Ghi rõ phe thua trong mâu thuẫn nguồn: có trường phái chủ trương blur/backdrop-filter/clip-path
  cũng thuộc bảng màu chuyển động — đúng cho `marketing-public`, SAI cho dashboard; phân giải bằng
  cột Type (01 §7).* *(nguồn ý tưởng HM-motion ∩ IMP, phân giải bằng Type · ép bởi hook 1d-j/1d-k WARN P2 + 06 §2)*
- **Màn `product` không có màn chào**: cấm sequence animation lúc tải và scroll-reveal theo section.
  Hệ quả cứng: nội dung thật không được nằm ẨN chờ JS — trạng thái nghỉ của DOM là trạng thái đã hiện
  (máy grep `opacity-0` đã đo oan 100% nên đây là mục CHECK BẰNG MẮT, không grep)
  *(nguồn ý tưởng IMP-no-load-sequence · ép bởi 06 §2 MAJOR)*
- **`prefers-reduced-motion` áp cho MỌI animation trong app, không riêng landing** — đây là a11y,
  không phải gu; user chóng mặt không phân biệt dashboard với landing *(nguồn ý tưởng HM-reduced-motion,
  mở rộng phạm vi · ép bởi 06 §2)*
- Landing (`marketing-public`) được giàu hơn: scroll reveal, stagger — vẫn phải tắt được theo dòng trên
