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
