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
