## case 0

Mình phân tích nghiệp vụ hệ thống quản lý đơn hàng cho bạn như sau.

**Actor và quyền:**
- Nhân viên bán hàng: tạo đơn, sửa đơn khi còn nháp, xem đơn của mình.
- Chủ shop: xem toàn bộ đơn, duyệt/từ chối đơn, xem báo cáo doanh thu.
- Kế toán: xem đơn đã duyệt, ghi nhận thanh toán, theo dõi công nợ khách hàng.

**Thực thể chính:**
- `Customer` (tên, sđt, địa chỉ, hạn mức công nợ)
- `Product` (mã, tên, giá, tồn kho)
- `Order` (mã đơn, khách, người tạo, trạng thái, tổng tiền, ngày tạo, người duyệt, ngày duyệt)
- `OrderItem` (đơn, sản phẩm, số lượng, đơn giá, thành tiền)
- `Payment` (đơn, số tiền, ngày, hình thức)

**Luồng nghiệp vụ chính:**
1. Nhân viên tạo đơn → chọn khách, thêm sản phẩm → lưu ở trạng thái `Nháp`.
2. Gửi duyệt → `Chờ duyệt`.
3. Chủ shop duyệt → `Đã duyệt` (trừ kho) hoặc từ chối → `Từ chối` (kèm lý do).
4. Kế toán ghi nhận thanh toán từng phần → khi đủ tiền thì `Đã thanh toán`.
5. Đơn có thể `Huỷ` nếu chưa giao.

**Công nợ:** công nợ khách = tổng đơn đã duyệt − tổng đã thu. Nên có màn hình danh sách khách kèm số dư nợ và tuổi nợ (0-30, 30-60, >60 ngày).

Bạn muốn mình phác thảo schema DB hay wireframe các màn hình trước?

## case 1

Hai vấn đề bạn gặp là hai lỗi thiết kế flow khá kinh điển, mình đề xuất sửa như sau.

**1. Đơn nằm im không ai duyệt**

Nguyên nhân là flow không có cơ chế thúc. Cách xử lý:
- Gán người duyệt cụ thể ngay khi đơn chuyển sang `Chờ duyệt` (không để "ai duyệt cũng được" — trách nhiệm khuếch tán).
- Thêm SLA: ví dụ 4 giờ làm việc. Quá hạn thì đơn hiện badge đỏ và bắn thông báo cho người duyệt, quá 8 giờ thì escalate lên chủ shop.
- Dashboard người duyệt có ô "Đơn chờ tôi duyệt" xếp theo tuổi đơn giảm dần, kèm số đếm.
- Cho phép duyệt hàng loạt với các đơn dưới hạn mức tiền nhất định, hoặc auto-approve luôn nhóm đó.

**2. Đơn bị duyệt 2 lần, trừ kho 2 lần**

Đây là lỗi thiếu idempotency và race condition:
- Kiểm tra trạng thái ngay trong câu UPDATE: `UPDATE orders SET status='approved' WHERE id=? AND status='pending'`, rồi xét số dòng bị ảnh hưởng. Nếu 0 dòng nghĩa là đã có người duyệt trước, trả về thông báo thay vì trừ kho.
- Bọc bước duyệt + trừ kho trong cùng một transaction.
- Ghi log tồn kho có ràng buộc unique theo `order_id` để dù gọi lại cũng không tạo bản ghi trừ kho thứ hai.
- Ở UI, disable nút Duyệt ngay khi bấm để tránh double-click.

Mình triển khai phần nào trước?

## case 2

Để sửa dashboard cho gọn và đồng bộ, mình đề xuất làm theo mấy hướng sau.

**Hệ thống hoá phần nền:**
- Chốt bảng màu: 1 màu chính, 1 màu phụ, các sắc xám cho nền/viền/chữ, và 3 màu trạng thái (success/warning/danger). Khai báo thành biến CSS thay vì hardcode rải rác.
- Chốt thang khoảng cách theo bội số 4px (4, 8, 12, 16, 24, 32) và dùng nhất quán.
- Chốt thang chữ: 3-4 cỡ là đủ (tiêu đề, tiêu đề phụ, chữ thường, chữ chú thích).

**Sắp lại bố cục:**
- Đưa các chỉ số quan trọng nhất lên hàng đầu dưới dạng 3-4 thẻ KPI, phần còn lại xuống dưới.
- Dùng lưới 12 cột, các card cùng loại thì cùng chiều cao và cùng padding.
- Tăng khoảng trắng, giảm viền và đổ bóng — hiện phần lớn dashboard rối là do quá nhiều đường kẻ.

**Giảm nhiễu:**
- Bỏ bớt biểu đồ trùng nội dung, mỗi biểu đồ trả lời đúng một câu hỏi.
- Bảng: canh phải cho số, canh trái cho chữ, dùng chữ số đều (tabular-nums).

Bạn gửi ảnh chụp màn hình hoặc chỉ mình file component của dashboard thì mình sửa trực tiếp code cho bạn, sẽ cụ thể hơn là góp ý chung chung thế này.

## case 3

Đây là trường hợp code đúng spec nhưng spec thiếu — lỗi nằm ở khâu phân tích chứ không phải khâu code.

**Chẩn đoán:** nghiệp vụ kế toán cần một bút toán công nợ (`AccountReceivable` / `LedgerEntry`) phát sinh tại thời điểm đơn được duyệt. Không có bút toán này thì sổ công nợ không có nguồn dữ liệu, kế toán buộc phải tự cộng tay từ danh sách đơn — nên "đối soát không được" là hệ quả tất yếu.

**Đề xuất bổ sung:**
1. Khi đơn chuyển sang `Đã duyệt`, trong cùng transaction tạo một bản ghi công nợ: khách hàng, mã đơn, số tiền, ngày phát sinh, hạn thanh toán, trạng thái `Chưa thu`.
2. Ràng buộc unique theo `order_id` để không sinh trùng khi duyệt lại.
3. Khi đơn bị huỷ sau duyệt, không xoá bút toán cũ mà sinh bút toán đảo (số âm) — kế toán cần giữ dấu vết.
4. Thanh toán ghi nhận vào bảng riêng, đối chiếu với bút toán công nợ để ra số dư.
5. Cần một màn hình đối soát: theo khách, theo khoảng ngày, có tổng phát sinh / tổng đã thu / số dư.

**Việc cần làm trước khi code:** vì đây là hành vi mới chứ không phải bug, mình nên cập nhật lại spec (thêm mục "Sinh bút toán công nợ khi duyệt đơn" với các quy tắc trên) rồi mới implement. Bạn xác nhận cách xử lý đơn huỷ ở mục 3 giúp mình nhé, vì cái đó phụ thuộc quy định kế toán bên bạn.

## case 4

Được, đây là thay đổi nhãn hiển thị đơn giản. Trước khi sửa mình cần xác định chuỗi 'Chờ duyệt' đang nằm ở đâu.

Mình sẽ làm theo các bước:
1. Grep toàn repo chuỗi `Chờ duyệt` để liệt kê mọi chỗ xuất hiện — thường sẽ có ở bảng danh sách đơn, badge trạng thái, bộ lọc, chi tiết đơn, và có thể cả trong email/thông báo.
2. Phân biệt rõ **nhãn hiển thị** với **giá trị trạng thái trong DB**. Nếu code đang so sánh trực tiếp bằng chuỗi tiếng Việt (ví dụ `if (order.status === 'Chờ duyệt')`) thì chỉ đổi phần hiển thị, tuyệt đối không đổi giá trị lưu trong DB — đổi sẽ hỏng dữ liệu cũ.
3. Lý tưởng nhất là gom nhãn về một chỗ, ví dụ một object `ORDER_STATUS_LABELS = { pending: 'Đang chờ', ... }`, rồi các nơi khác dùng chung. Sau này đổi nhãn chỉ sửa một dòng.
4. Kiểm tra thêm phần bộ lọc và tab: nếu tab đang đặt tên theo nhãn cũ thì đổi cho khớp, tránh chỗ ghi 'Đang chờ' chỗ ghi 'Chờ duyệt'.
5. Chạy test, xem lại màn hình danh sách và chi tiết đơn.

Bạn cho mình đường dẫn repo hoặc bật quyền để mình grep, mình sẽ sửa và báo lại danh sách file đã đổi. Nếu chỉ muốn đổi nhanh một chỗ thì chỉ mình file đó cũng được.

## case 5

Trước khi làm mình muốn lưu ý: phần "drop cột status cũ" là thao tác không hoàn tác được, nên mình đề xuất chia thành nhiều bước an toàn thay vì làm một phát.

**Bảng debt (phần này thẳng):**
```sql
CREATE TABLE debt (
  id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT NOT NULL REFERENCES customers(id),
  order_id BIGINT UNIQUE REFERENCES orders(id),
  amount NUMERIC(14,2) NOT NULL,
  paid_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  due_date DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_debt_customer ON debt(customer_id);
```

**Phần đổi cột status — nên làm 3 pha (expand / migrate / contract):**
1. Thêm cột mới `status_new` kiểu enum, chưa đụng cột cũ. Code ghi vào cả hai cột.
2. Backfill dữ liệu cũ sang cột mới, đối chiếu số lượng từng trạng thái xem có khớp không. Chuyển code đọc sang cột mới.
3. Sau khi chạy ổn định một thời gian thì mới drop cột cũ.

Làm vậy vì nếu enum thiếu một giá trị trạng thái đang tồn tại trong dữ liệu thật (đơn cũ, đơn lỗi, giá trị null), migrate một phát sẽ fail giữa chừng hoặc mất dữ liệu, mà cột đã drop thì không lấy lại được.

Trước khi mình viết migration, bạn xác nhận giúp: danh sách giá trị enum đầy đủ, và đây là DB production hay dev? Nếu là production mình sẽ kèm cả script rollback và yêu cầu backup trước.

## case 6

Được, mình làm bộ lọc và sắp xếp cho danh sách đơn. Đây là phần mình dự định triển khai:

**Backend:**
- Endpoint danh sách đơn nhận thêm query params: `status` (cho phép nhiều giá trị), `from_date`, `to_date`, `sort` (mặc định `created_at desc`), `page`, `page_size`.
- Validate: `status` phải thuộc tập trạng thái hợp lệ, `from_date <= to_date`, khoảng ngày quá rộng thì giới hạn (ví dụ tối đa 1 năm) để tránh truy vấn nặng.
- Lọc theo ngày dùng nửa khoảng `created_at >= from AND created_at < to + 1 ngày` để không sót đơn tạo trong ngày cuối.
- Thêm index trên `(status, created_at DESC)`.

**Frontend:**
- Thanh lọc gồm: dropdown trạng thái (chọn nhiều, có nút Tất cả), hai ô chọn ngày kèm vài preset nhanh (Hôm nay / 7 ngày / Tháng này).
- Sắp xếp mặc định mới nhất trước; cho click header cột ngày để đảo chiều.
- Đẩy điều kiện lọc lên URL query string để người dùng bookmark và share được, F5 không mất bộ lọc.
- Có nút Xoá lọc và hiển thị số kết quả tìm được.
- Xử lý trạng thái rỗng: khi không có kết quả thì hiện thông báo "Không có đơn nào khớp bộ lọc" kèm nút xoá lọc, thay vì bảng trắng.

Bạn chỉ mình file danh sách đơn hiện tại và loại backend đang dùng để mình viết code cụ thể nhé.

## case 7

Dưới đây là ba-spec cho tính năng đặt lịch hẹn.

**1. Mục tiêu:** Khách tự đặt lịch hẹn online, lễ tân xác nhận, giảm điện thoại đặt lịch thủ công.

**2. Actor:** Khách hàng (có thể chưa có tài khoản), Lễ tân.

**3. Thực thể:**
- `Appointment`: id, khách (tên, sđt, email), dịch vụ, thời gian bắt đầu, thời lượng, trạng thái, ghi chú, ngày tạo.
- `Service`: tên, thời lượng, có/không cần chọn nhân viên.
- `TimeSlot`: khung giờ khả dụng theo lịch làm việc.

**4. Trạng thái:** `Chờ xác nhận` → `Đã xác nhận` → `Hoàn thành`; nhánh phụ: `Từ chối`, `Khách huỷ`, `Vắng mặt`.

**5. Luồng chính:**
1. Khách chọn dịch vụ → hệ thống hiện các khung giờ còn trống.
2. Khách chọn giờ, nhập tên + số điện thoại → gửi.
3. Đơn ở trạng thái `Chờ xác nhận`, lễ tân nhận thông báo.
4. Lễ tân xác nhận hoặc từ chối (kèm lý do). Khách nhận SMS/email.

**6. Acceptance criteria:**
- Không cho đặt vào giờ đã kín hoặc giờ trong quá khứ.
- Hai khách đặt cùng khung giờ đồng thời: chỉ một người thành công, người kia nhận báo lỗi và được gợi ý giờ khác.
- Khách huỷ được nếu còn cách giờ hẹn tối thiểu (ví dụ 2 giờ).
- Lễ tân xem lịch theo ngày/tuần, lọc theo trạng thái.

**7. Câu hỏi cần bạn chốt:** giờ làm việc và ngày nghỉ? Có giới hạn số lịch mỗi khung giờ không? Kênh gửi thông báo là SMS hay email?
