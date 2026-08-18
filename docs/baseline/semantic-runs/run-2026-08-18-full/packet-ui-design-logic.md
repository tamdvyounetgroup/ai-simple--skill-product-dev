# Gói chấm MÙ — skill ui-design-logic

## RUBRIC (tiêu chí chấm từng case)

## case 0
# rubric cho ui-design-logic id=0 (new-app-from-scratch)
DESIGN-SPEC.md được tạo TRƯỚC khi code (screen map có cột 'user đến để làm gì', density, flows). Mobile-first vì chủ trại dùng điện thoại ngoài ao. Accent là bản trầm của cam neon (không lấy nguyên màu logo), neutral ramp stone. Bottom tabs trên mobile, table ao biến thành list card trên mobile. Có screenshot QA loop trước khi tuyên bố xong.

## case 1
# rubric cho ui-design-logic id=1 (add-screen-to-existing-app)
Nhận ra nav đã chạm budget 5 mục — KHÔNG thêm mục thứ 6 một cách vô tư; đề xuất phương án có lý do (gom vào mục có sẵn, hoặc tái cấu trúc nav, hoặc tab trong page liên quan). Tạo/sửa mã (form đơn giản ≤5 field) dùng drawer chứ không page riêng. Cập nhật screen map trước khi code.

## case 2
# rubric cho ui-design-logic id=2 (diagnose-ugly-ui)
Chạy diagnose theo 06: screenshot hiện trạng trước, liệt kê vi phạm phân cấp BLOCK/MAJOR/MINOR (spacing ngoài thang, title lệch ngữ pháp, 2 primary button, vượt density budget...), sửa theo thứ tự hình học trước màu sau, screenshot before/after. KHÔNG nhảy vào đổi màu/đổi font đầu tiên.

## case 3
# rubric cho ui-design-logic id=3 (font-ban-and-ai-text)
Giữ system font stack theo rule FONT [DEF] (SKILL.md): 'trendy chút' KHÔNG phải lý do hợp lệ — [DEF] chỉ mở khi user chỉ đích danh font, hoặc có dòng '## Ngoại lệ đã duyệt' trong design-spec với lý do audience/kỹ thuật (vd chữ to cho user lớn tuổi, subset tiếng Việt). Nêu rõ đường ngoại lệ đó cho user thay vì cấm suông. Không viết subtitle/văn thuyết minh dưới mỗi mục — UI chỉ có nhãn chức năng ngắn; giải thích nếu thật cần thì tooltip. Nêu rõ 2 quyết định này với user thay vì im lặng làm theo.

## case 4
# rubric cho ui-design-logic id=4 (redesign-admin-4case-routing)
Phân loại theo 06 §3 trước khi sửa: đây là case A/B (nghiệp vụ đúng, giao diện rối/AI-looking) → chạy ngược checklist 06 §2 + gate anti-slop. KHÔNG mở Hallmark cho màn admin (contract 08: admin cấm Hallmark, không macrostructure/theme). Guardrail: đổi HOW nhìn giữ WHAT chạy — không đổi AC/permission/flow; đổi token toàn cục nếu cần là RED phải confirm 1 câu. Kết quả có screenshot before/after.

# ===== BẢN A =====
# Trả lời eval — ui-design-logic (bộ B)

## case 0

App mới, chưa có ba-spec → tôi tự thu brief rồi chạy đủ pipeline 7 bước, và **chưa viết dòng React nào trước khi có DESIGN-SPEC.md** (chốt chặn bước 1, `design-verify.sh` BLOCK nếu spec thiếu section).

Thang user: chủ trại ngoài ao (power, một tay, nắng, mạng chập chờn) / chủ trại ở nhà trên laptop (cùng người, ngữ cảnh khác) / công nhân cho ăn nếu có — mỗi loại trả đủ 3 câu muốn thấy gì · truyền tải gì · action tiếp. Màn Danh sách ao phục vụ ≥ 2 loại → có biến thể, cấm bản trung bình cộng.

Screen map (Type: `product` — công cụ visual ngoài đứng ngoài): Danh sách ao → Chi tiết ao (thông số nước) → Ghi cho ăn → Cảnh báo. Mỗi dòng khai vào từ đâu · goal · step tiếp · đúng 1 primary. Ma trận trạng thái bắt buộc: chưa login, ao trống, đang tải, lỗi/mất mạng ngoài ao, cảm biến null, pH cực đoan. Action → expectation: ghi cho ăn xong thấy ngay bản ghi vừa tạo; xoá có Undo.

Mobile là design chính (375, spot-check 320), bottom tabs ≤ 5 mục, touch target 48dp vì tay ướt; desktop là design con.

Cam neon = case (b) của 04 §2: KHÔNG lấy thô làm accent — giữ hue, S 50–70%, hạ L (hue ấm thường 32–40%) tới khi **đo được** ≥ 4.5:1 với chữ trắng; neutral ramp stone cho tông ấm. Cảnh báo: accent cam dễ trùng họ semantic warning/amber — nếu trùng thì đổi accent, giữ cam gốc chỉ trong logo. Stack React + Tailwind + shadcn. Kết bằng screenshot loop.

## case 1

Đây là "thêm màn hình vào app đã có" → việc đầu tiên là **đọc DESIGN-SPEC.md hiện có**, không dựng lại thang user, tuân budget đã chốt; nếu có ba-spec thì mã giảm giá là nghiệp vụ mới — quy tắc tính giảm, chồng mã, hết hạn KHÔNG phải việc tôi tự quyết, handoff ngược BA. Tôi chỉ quyết HOW-nhìn.

Spec vẫn phải có, nhưng nhỏ — khoảng 10 dòng, thêm dòng vào screen map + ma trận trạng thái của spec cũ, cùng commit.

Nav: sidebar lên 6 mục cấp 1, vẫn trong [DEF] 5–7 và độ sâu ≤ 2 cấp nên không cần tái cấu trúc. Nhưng nếu app có mobile, bottom tabs ≤ 5 là [INV] → mục thứ 6 vào "Thêm". Label phải đồng bộ hình dạng với nhóm ngang hàng: sidebar đang toàn danh từ 1–2 từ, 1 dòng → đặt **"Khuyến mãi"**, không phải "Quản lý khuyến mãi" (lệch cỡ từ, wrap 2 dòng).

Screen map: (1) Danh sách mã — vào từ sidebar, goal soát/bật tắt mã, step tiếp là tạo mã, primary duy nhất "Tạo mã"; (2) Tạo mã — theo 03 chọn drawer (form ngắn, giữ ngữ cảnh danh sách) thay vì page. Bật/tắt là switch ngay trên hàng.

Ma trận trạng thái: chưa có mã nào (empty 1 cụm ngắn + CTA, cấm văn thuyết minh), skeleton, lỗi có lối thoát, dữ liệu cực đoan (tên mã dài, giảm 100%, hàng nghìn mã → phân trang; mã hết hạn). Action → expectation: tạo xong danh sách hiện mã vừa tạo ở đầu; tắt mã đổi badge trạng thái tức thì. Table desktop → list card ở mobile. QA screenshot 2 màn × 3 viewport.

## case 2

Trước khi sửa, chạy diagnose 4-case của 06 §3: đây là **case A** (nghiệp vụ chạy đúng, giao diện rối) pha một chút case B — không phải case C/D, nên không handoff. Guardrail: đổi HOW nhìn, giữ WHAT chạy. Chưa có design-spec cho màn này → dựng spec nhỏ từ hiện trạng làm oracle trước.

Chấm ngược checklist 06 §2 trên file — MAJOR: spacing ngoài thang khắp nơi (`p-[13px]`, `mb-[7px]`, `gap-[11px]`, `gap-[18px]`, `mt-[27px]`, `mt-[19px]` → 12/8/12/16/24/16); **2 primary button** cùng màu tím (Tạo đơn + Xuất báo cáo) và hàng 4 button > 3 → giữ 1 primary "Tạo đơn mới", còn lại secondary + gom vào menu ⋯; title lệch casing/ngữ pháp ("Quản Lý Đơn Hàng" title-case, "xem thêm" lowercase → sentence case); nhóm ngang hàng lệch hình dạng label (2 từ vs "Cài đặt hệ thống nâng cao" 4 từ; card "Doanh thu hôm nay" vs "ĐƠN CHỜ DUYỆT" uppercase) → sửa bằng đổi TỪ NGỮ theo budget nhóm; số `12345678`/`1200000` không format locale, cột tiền thiếu `tabular-nums` và không căn phải; màu hard-code `#7c3aed` không phải token accent; `grid-cols-4` mà chỉ 2 card.

Font Be Vietnam Pro: vi phạm rule FONT [DEF] (không qua cửa nào) và nằm đúng danh sách user đã chê → về system stack, ghi vào Anti-references của spec. Subtitle "Đây là trang tổng quan giúp bạn..." là văn thuyết minh kiểu AI → xoá.

Thiếu hẳn ma trận trạng thái (empty/loading/lỗi, ô trống chưa có "—"). Thứ tự sửa: BLOCK → hình học (spacing/căn trục) → text/title → màu SAU CÙNG; 80% cảm giác rối đến từ spacing, đừng đổi màu trước. Kết bằng screenshot before/after.

## case 3

Hai yêu cầu trong câu này đều bị luật chặn, và tôi từ chối đúng cơ chế chứ không cãi bằng cảm giác.

Font: rule FONT là [DEF] với đúng 2 cửa — (a) user chỉ đích danh một font, (b) design-spec có dòng `## Ngoại lệ đã duyệt` với lý do **audience hoặc kỹ thuật**. "Đẹp đẹp trendy chút" không phải tên font, cũng không phải lý do audience/kỹ thuật → giữ **system font stack** (`-apple-system, ..., Segoe UI, Roboto`, có sẵn dấu tiếng Việt, không tải Google Fonts), số dùng system mono + tabular-nums. Nếu anh gọi tên một font cụ thể, cửa (a) mở ngay — tôi làm, không tranh luận thẩm mỹ.

Mô tả dưới mỗi mục: [DEF] cấm chữ giải thích kiểu AI trên UI sản phẩm — UI nội bộ chỉ có nhãn chức năng ngắn. Thay vì subtitle mỗi mục, tôi làm nhãn tự nói được nghĩa, và chỉ giữ helper text ở nơi có ràng buộc THẬT (định dạng bắt buộc, hệ quả không đảo ngược như "đổi email cần xác thực lại"); người dùng mới thì dùng checklist onboarding, không rải văn thuyết minh.

Vẫn phải có design-spec dù màn nhỏ: thang user (member/admin), screen map — Cài đặt tài khoản, vào từ menu avatar, goal cập nhật thông tin, step tiếp "Lưu" là primary duy nhất, Type `product`; tab trong page 2–6, không lồng. Ma trận trạng thái: chưa login → redirect, skeleton, lỗi lưu giữ nguyên dữ liệu đã nhập, tên/email dài. Action → expectation: lưu xong thấy giá trị mới + toast. Có đổi mật khẩu/2FA → chạm auth, handoff `security-logic` trước khi chốt spec. QA screenshot 3 viewport + dark.

## case 4

"Nhìn như AI làm" = case B trong diagnose 4-case của 06 §3, trên màn Type `product`. Theo 08 §1, `product` là ui-design-logic 100% — **công cụ visual ngoài không được đụng, kể cả khi user nói "làm đẹp"**; tôi xử bằng gate anti-slop đã nội hoá trong 06 §2.

Guardrail redesign đúng ý anh "đừng phá": được đổi layout, spacing, component, hierarchy, density, mobile adaptation. KHÔNG tự đổi AC, permission, flow, dữ liệu, trạng thái nghiệp vụ. Riêng đổi token toàn cục hoặc tái cấu trúc nav là RED (07 §4) → tôi hỏi gộp đúng 1 câu confirm trước khi chạm. Đổi wording thì sync design-spec cùng commit; thuật ngữ nghiệp vụ (tên trạng thái tồn kho, tên đối tượng) phải khớp ba-spec, lệch thì hỏi BA chứ không tự đổi.

Triệu chứng slop tôi soi trước: metric/số liệu bịa trên UI (BLOCK — thay bằng số thật hoặc "—" kèm nhãn chờ số liệu), bố cục "hero + 3 card giống hệt", gradient trang trí không mã hoá thông tin gì, gradient trên chữ, emoji làm icon chức năng hoặc trộn 2 bộ icon, fake chrome (browser bar giả), card lồng card, scroll-reveal khiến nội dung thật ẩn chờ JS, và demo bằng dữ liệu đẹp — dashboard kho phải chạy dữ liệu cực đoan thật: SKU tên dài, tồn 0 và âm, list nghìn dòng, cột số `tabular-nums` căn phải, ô trống "—".

Không có design-spec cũ thì dựng spec nhỏ từ hiện trạng (screen map + ma trận trạng thái) làm oracle trước khi sửa. Thứ tự: BLOCK → hình học → text → màu cuối. Kết: screenshot before/after ở 1440/768/375 + dark + spot 320, báo cáo "X BLOCK, Y MAJOR", MINOR liệt kê cho anh quyết.

# ===== BẢN B =====
# Đáp án — ui-design-logic (arm A: trợ lý thông thường)

## case 0

Mình đề xuất dựng bằng React + Vite + TypeScript, Tailwind CSS cho style, React Router cho điều hướng, TanStack Query cho gọi API và Recharts để vẽ biểu đồ thông số nước theo thời gian. Vì chủ trại chủ yếu dùng điện thoại ngoài ao nên mình sẽ làm mobile-first: layout 1 cột, bottom navigation 4 tab (Ao, Cho ăn, Cảnh báo, Cài đặt), lên breakpoint md thì chuyển sang sidebar + lưới nhiều cột cho laptop.

Cấu trúc màn hình:
- **Danh sách ao**: card từng ao, hiển thị tên ao, 3 chỉ số pH / oxy / nhiệt độ và một chấm trạng thái xanh–vàng–đỏ.
- **Chi tiết ao**: 3 card chỉ số ở trên, biểu đồ đường 24h/7 ngày ở dưới, tab lịch cho ăn.
- **Lịch cho ăn**: danh sách theo ngày, checkbox đánh dấu đã cho ăn.
- **Cảnh báo**: danh sách sự kiện vượt ngưỡng, ngưỡng cấu hình được trong Cài đặt.

Về màu: mình lấy cam neon của logo làm màu thương hiệu chính (primary), dùng cho nút hành động chính, tab đang chọn và điểm nhấn biểu đồ; nền trắng/xám nhạt, chữ xám đậm. Trạng thái cảnh báo dùng đỏ/vàng riêng để không lẫn với cam thương hiệu. Nút bấm để cỡ lớn vì thao tác ngoài trời, tay ướt.

Bạn muốn mình bắt đầu code luôn phần danh sách ao + chi tiết ao với dữ liệu mock không?

## case 1

Được, mình sẽ thêm mục thứ 6 vào sidebar là **Khuyến mãi**, đặt ngay sau "Sản phẩm" và trước "Báo cáo" vì nó thuộc nhóm nghiệp vụ bán hàng. Icon dùng dạng thẻ giảm giá (tag/ticket) cho đồng bộ với các icon còn lại.

Phần tính năng gồm một trang chính `/khuyen-mai` với:
- **Bảng danh sách mã**: các cột Mã, Loại giảm (% hoặc số tiền), Giá trị, Hạn dùng, Số lượt đã dùng, Trạng thái. Có ô tìm kiếm theo mã và filter theo trạng thái (đang bật / đã tắt / hết hạn).
- **Nút "Tạo mã giảm giá"** ở góc phải trên bảng, mở modal (hoặc drawer) với các trường: mã code, loại giảm, giá trị, đơn tối thiểu, ngày bắt đầu – kết thúc, giới hạn số lượt. Có nút sinh mã ngẫu nhiên cho tiện.
- **Bật/tắt mã**: dùng Switch ngay trên từng dòng của bảng, đổi trạng thái là gọi API luôn và hiện toast xác nhận, không cần vào trang sửa.

Về code, mình sẽ tạo thư mục `pages/promotions/` gồm `PromotionList.tsx`, `PromotionFormModal.tsx` và hook `usePromotions.ts`; thêm route mới và thêm một entry vào mảng cấu hình sidebar hiện có. Style bám theo component có sẵn của app (Table, Button, Modal) để nhìn đồng bộ.

Bạn gửi mình file cấu hình sidebar và một trang danh sách hiện có để mình bám đúng convention nhé.

## case 2

Mình đọc `dashboard.tsx` và thấy mấy vấn đề khiến trang nhìn rối:

1. **Spacing lộn xộn**: `p-[13px]`, `mb-[7px]`, `gap-[11px]`, `mt-[27px]`, `gap-[18px]` — toàn số lẻ, không theo thang nào. Mình sẽ đổi hết về thang 4px của Tailwind: `p-6`, `mb-2`, `gap-3`, `mt-8`, `gap-4`.
2. **Màu hard-code**: `bg-[#7c3aed]` nên chuyển sang token `bg-primary` để còn đổi theme và dùng lại được.
3. **Hai nút primary cạnh nhau**: "Tạo đơn mới" và "Xuất báo cáo" cùng màu tím đậm nên mắt không biết nhìn đâu. Giữ "Tạo đơn mới" là primary, "Xuất báo cáo" chuyển sang nút viền (secondary).
4. **Chữ trên nút không nhất quán**: "xem thêm" viết thường, "Cài đặt hệ thống nâng cao" thì dài. Thống nhất viết hoa chữ đầu và rút gọn còn "Cài đặt".
5. **Tiêu đề**: "Quản Lý Đơn Hàng" viết hoa từng từ kiểu tiếng Anh — tiếng Việt nên là "Quản lý đơn hàng". Câu subtitle dài, mình rút ngắn lại.
6. **Card KPI**: thẻ "ĐƠN CHỜ DUYỆT" đang viết hoa toàn bộ, lệch với thẻ kia; số `12345678` chưa format tiền tệ → đổi thành `12.345.678 ₫`.
7. **Bảng**: thiếu border, padding và căn phải cho cột tiền; thêm `tabular-nums` cho số thẳng hàng.

Mình sửa luôn cả file rồi gửi bạn bản mới nhé?

## case 3

Được. Về font, mình gợi ý vài lựa chọn đang được dùng nhiều và hỗ trợ tốt tiếng Việt: **Be Vietnam Pro** (rất hợp app tiếng Việt, dáng hiện đại), **Plus Jakarta Sans** (trẻ trung, geometric), hoặc **Inter** nếu bạn muốn an toàn và dễ đọc. Mình sẽ để mặc định là Be Vietnam Pro, load qua Google Fonts, weight 400/500/600.

Màn hình Cài đặt tài khoản mình bố cục như sau:
- **Hồ sơ cá nhân**: ảnh đại diện (nút Tải ảnh lên), Họ tên, Email, Số điện thoại, Phòng ban.
- **Bảo mật**: Đổi mật khẩu, Xác thực 2 lớp (switch), Danh sách phiên đăng nhập đang hoạt động.
- **Thông báo**: switch cho email, thông báo trong app, thông báo đẩy.
- **Giao diện**: chọn Sáng / Tối / Theo hệ thống, chọn ngôn ngữ.

Mỗi mục mình sẽ đặt trong một card riêng có tiêu đề, và như bạn yêu cầu, **dưới mỗi mục có một dòng mô tả** giải thích ngắn gọn, ví dụ: "Xác thực 2 lớp — Tăng bảo mật bằng cách yêu cầu mã OTP mỗi lần đăng nhập từ thiết bị mới", hay "Thông báo đẩy — Nhận thông báo ngay trên trình duyệt kể cả khi không mở app". Chữ mô tả để cỡ nhỏ, màu xám nhạt hơn tiêu đề.

Nút "Lưu thay đổi" mình đặt cố định ở cuối trang, chỉ sáng lên khi có chỉnh sửa.

## case 4

Hiểu rồi — mình sẽ chỉ đụng vào phần giao diện, giữ nguyên logic, API và state hiện có. Cách làm: tách phần trình bày ra component mới, giữ nguyên props và hàm xử lý cũ, không đổi tên field dữ liệu.

Những thứ thường khiến dashboard "nhìn như AI làm" và mình sẽ sửa:
- **Bỏ gradient tím-xanh và các card bo tròn quá đà**; chuyển sang nền trắng/xám rất nhạt, viền mảnh 1px, bo góc nhỏ (6–8px), đổ bóng nhẹ hoặc không có bóng.
- **Bỏ emoji và câu chào kiểu marketing** ("Chào mừng trở lại! 👋", "Quản lý kho của bạn dễ dàng hơn bao giờ hết") — app nội bộ thì vào thẳng dữ liệu.
- **Giảm số màu**: một màu nhấn duy nhất cho hành động chính, còn lại là thang xám; đỏ/vàng/xanh chỉ dùng cho trạng thái tồn kho.
- **Tăng mật độ thông tin**: app kho thật thường ưu tiên bảng dày, nhiều dòng nhìn được cùng lúc, thay vì 4 card KPI to chiếm nửa màn hình. Mình giữ KPI nhưng thu nhỏ thành một hàng gọn.
- **Bảng dữ liệu chuẩn**: header dính (sticky), sắp xếp theo cột, phân trang, số căn phải và dùng chữ số đều (tabular-nums), mã SKU dùng font mono.
- **Trạng thái rỗng và đang tải** rõ ràng thay vì khoảng trắng.

Bạn gửi mình file dashboard hiện tại (và ảnh chụp màn hình nếu có) để mình sửa đúng chỗ nhé.
