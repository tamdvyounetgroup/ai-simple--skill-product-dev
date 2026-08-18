# Trả lời eval ui-design-logic — bản B

## case 0
Chưa viết code React. Bước 0: repo chưa có app-map/ba-spec nên tự thu brief từ đề — đủ: ai dùng (chủ trại), làm gì (xem ao, thông số nước, lịch ăn, cảnh báo), platform (mobile-first ngoài ao, desktop phụ), brand (cam neon). Bước 1 viết DESIGN-SPEC.md trước, đây là chốt chặn — design-verify.sh sẽ BLOCK nếu thiếu frontmatter coupling, thang user, screen map, ma trận trạng thái.

Thang user: chủ trại **mới** (muốn thấy ao mình có ổn không / sản phẩm truyền tải "1 màn biết ao nào đang nguy" / action tiếp: thêm ao đầu tiên) và chủ trại **quen** (muốn thấy ao nào lệch ngưỡng / truyền tải "cảnh báo là thứ nổi nhất" / action: xử lý cảnh báo). Chỉ 1 role nên không cần biến thể theo role, nhưng bậc Mới được empty state kiểu onboarding.

Screen map (Type: product, mọi màn ≤ 5 tab): Danh sách ao (vào từ mở app → goal: thấy ao lệch ngưỡng → step tiếp: mở ao đó → primary: mở ao) · Chi tiết ao (thông số pH/oxy/nhiệt trong CÙNG widget kèm ngưỡng — 1 câu hỏi không cần 2 widget → primary: ghi nhận đo mới) · Lịch cho ăn · Cảnh báo. Ma trận trạng thái từng màn: chưa login / trống (chưa có ao → 1 cụm + CTA "Thêm ao") / đang tải skeleton / lỗi mạng ngoài ao có nút thử lại / cực đoan (30 ao, tên ao dài, giá trị pH 0). Action → expectation: ghi đo xong thấy giá trị vừa ghi trên biểu đồ; xoá ao có Undo.

Cam neon rơi vào 04 B2(b): giữ hue, hạ S 50–70%, hạ L tới khi ĐO contrast ≥ 4.5:1 với chữ trắng (hue ấm thường L 32–40%); màu gốc chỉ ở logo; neutral ramp stone; logo trên nền neutral, không trên accent. Font system stack, có thể mở ngoại lệ [DEF] "chữ ≥18px ngoài nắng" ghi vào `## Ngoại lệ đã duyệt`. Stack React+Tailwind+shadcn. Bước 5: mobile bottom tab ≤ 5, table → list card; desktop sidebar. Bước 6: screenshot 375/768/1440 + dark mode + spot 320. Màn có auth → handoff security-logic trước khi chốt spec.

## case 1
Thêm màn vào app đã có → đọc DESIGN-SPEC.md hiện tại trước, tuân budget đã chốt, không dựng lại thang user. Không viết code khi chưa bổ sung spec — spec nhỏ (~10 dòng) nhưng bắt buộc: 1 dòng screen map + trạng thái + action→expectation cho mỗi màn mới.

Nav: sidebar hiện 5 mục, thêm "Khuyến mãi" thành 6 — trong ngưỡng [DEF] 5–7 mục cấp 1, không cần nhóm section, không phải RED. Nếu app có mobile bottom tab thì 6 > 5 (M3 hard max, [INV]) → Khuyến mãi vào tab "Thêm" hoặc gom Sản phẩm/Khuyến mãi thành 1 mục — quyết trong spec, không cảm tính. Label mới phải cùng hình dạng nhóm với 5 label cũ: đều 1–2 từ danh từ, 1 dòng ở 320px ("Khuyến mãi" đạt).

Screen map bổ sung: **Danh sách mã** (vào từ sidebar → goal: thấy mã đang chạy/hết hạn → step tiếp: tạo mã → primary duy nhất "Tạo mã"; bật/tắt là Switch inline trên hàng, không phải button thứ hai; badge trạng thái ≤ 2 từ theo bảng màu semantic đã chốt) · **Tạo mã** (page hay drawer tra 03 — form dài thì page; primary "Lưu"; validate ở ranh giới: mã trùng, ngày kết thúc < bắt đầu, giá trị %>100). Ma trận trạng thái: role không có quyền khuyến mãi (chưa có trong đề → mặc định ẩn mục + ghi `## Assumptions`, handoff BA xác nhận), trống ("Chưa có mã" + CTA Tạo mã), tải, lỗi lưu, cực đoan (500 mã → phân trang/tìm kiếm; tên chương trình dài → truncate). Action→expectation: tạo xong quay về danh sách và thấy mã vừa tạo ở đầu; tắt mã đổi badge ngay + toast Undo. Cột số (giảm giá, lượt dùng) tabular-nums căn phải, format locale. Xong: screenshot 2 màn ở 1440 + 375 + dark mode.

## case 2
Đọc file trước, phân loại theo 06 §3: nghiệp vụ không có dấu hiệu sai/thiếu, không phải slop landing → **case A** (giao diện rối) → chạy ngược checklist 06 §2, giữ nguyên WHAT. Chấm trên code (đề không có app chạy để screenshot; nếu có phải screenshot trước rồi mới chấm):

**MAJOR** (không thấy BLOCK trong đoạn này — chưa có bằng chứng contrast/focus/touch vì chưa render):
1. Spacing ngoài thang: `p-[13px] mb-[7px] gap-[11px] gap-[18px] mt-[27px] mt-[19px]` → về 12/8/12/16/24/16.
2. 2 primary button (`bg-[#7c3aed]` ×2) + hàng 4 button > 3 → "Tạo đơn mới" là primary duy nhất; "Xuất báo cáo" secondary; 2 cái còn lại vào menu ⋯.
3. Màu hard-code `#7c3aed` → token accent (`bg-primary`) theo 04.
4. Title lệch casing/ngữ pháp: "Quản Lý Đơn Hàng" (Title Case) / "ĐƠN CHỜ DUYỆT" (caps) / "Doanh thu hôm nay" / "xem thêm" → sentence case toàn bộ; label nhóm cùng cỡ từ.
5. Subtitle văn thuyết minh kiểu AI ("Đây là trang tổng quan giúp bạn…") → bỏ.
6. Font "Be Vietnam Pro" không qua cửa [DEF] → system stack (nếu là project ForFish còn nằm trong Anti-references).
7. Số `12345678`, `1200000` chưa format locale; cột Tổng tiền thiếu `tabular-nums` + căn phải; hero KPI `text-lg` chưa đạt 2–3× label.
8. `text-[22px]` heading arbitrary → dùng thang type.

Thứ tự sửa: spacing/căn hàng → text/title → màu, KHÔNG đổi màu trước. Đổi wording thì sync design-spec cùng commit; thuật ngữ nghiệp vụ ("Đơn chờ duyệt") giữ khớp ba-spec. Xong phải screenshot 1440 + 375 + dark mode, báo cáo before/after "0 BLOCK, 8 MAJOR → 0".

## case 3
Nhận việc thiết kế màn cài đặt tài khoản (Type: product) — nhưng 2 yêu cầu phụ đi ngược [DEF] và tôi từ chối có lý do, không "thương lượng bằng mồm":

- **Font trendy**: rule FONT [DEF] mặc định system stack; làm khác chỉ khi (a) user chỉ đích danh font, hoặc (b) spec có `## Ngoại lệ đã duyệt` với lý do AUDIENCE/KỸ THUẬT. "Đẹp/trendy" bị nêu đích danh là lý do bị từ chối. App nội bộ càng không cần display font. Nếu anh chỉ đích danh 1 font vì lý do cụ thể (vd nhân viên lớn tuổi cần nét đậm), tôi ghi ngoại lệ vào spec rồi dùng.
- **Mô tả dưới mỗi mục**: [DEF] "không viết chữ giải thích kiểu AI trên UI" — UI sản phẩm chỉ có nhãn ngắn. Thay bằng: nhãn rõ nghĩa ("Đổi mật khẩu", "Ngôn ngữ", "Thông báo email"), helper text chỉ ở ô cần ràng buộc kỹ thuật (mật khẩu ≥ 8 ký tự), user bậc Mới được checklist onboarding chứ không phải văn thuyết minh rải khắp form.

Rồi đi đúng pipeline: spec ~10 dòng trước code. Thang user: nhân viên thường / admin (admin có thêm mục quản lý phiên, thấy khác — cấm bản trung bình cộng). Screen map: vào từ avatar menu → goal: đổi 1 thông tin → step tiếp: Lưu → primary duy nhất "Lưu thay đổi"; các nhóm (Hồ sơ / Bảo mật / Thông báo) là tab 2–6 hoặc section, không tab lồng tab. Ma trận: chưa login → redirect; role; đang tải skeleton; lỗi lưu giữ chỗ không đẩy form; cực đoan (tên 60 ký tự, email dài). Form mobile 1 cột, touch ≥ 44, focus ring giữ nguyên, action→expectation: lưu xong thấy giá trị mới + toast. Màn chạm auth (đổi mật khẩu, phiên) → handoff security-logic trước khi chốt spec. QA screenshot 1440/375 + dark.

## case 4
Phân loại theo 06 §3 trước khi sửa. Đề nêu "chức năng đúng, nhìn như AI" → loại trừ D (triage) và C (thiếu hành vi) → **case B (slop)**, có thể kèm A. Type = product (admin dashboard) → theo 08 §1 công cụ visual ngoài KHÔNG được đụng dù user nói "làm đẹp"; xử lý hoàn toàn bằng 06 §2 nội hoá.

Guardrail redesign: chỉ đổi HOW nhìn (layout, spacing, component, hierarchy, density, mobile). Không đổi AC/permission/flow/dữ liệu/trạng thái nghiệp vụ. Đổi token toàn cục hay tái cấu trúc nav là RED → 1 câu confirm riêng, không nằm trong "redesign".

Cách làm: (1) đọc DESIGN-SPEC hiện có — không có thì viết spec ngược từ màn đang chạy trước (thang user: nhân viên kho / quản lý kho; screen map; budget). (2) Screenshot hiện trạng 1440/375/dark. (3) Chấm 06 §2 nhắm triệu chứng slop điển hình: hero + 3 card giống hệt kiểu template, gradient trang trí vô cớ/chữ gradient, metric bịa hoặc placeholder đẹp thay dữ liệu cực đoan, emoji làm icon/trộn bộ icon, card lồng card, subtitle văn thuyết minh, animation lúc tải, font display. Kèm mục hình học: spacing ngoài thang, KPI chưa 2–3× label, cột số thiếu tabular-nums, 2 primary, title lệch ngữ pháp. (4) Sửa theo thứ tự BLOCK → spacing/căn hàng → text → màu; IA tổ chức theo bộ phận/đối tượng (nhập kho, xuất kho, tồn) — không theo khái niệm trừu tượng. (5) Đổi wording thì sync design-spec cùng commit; thuật ngữ kho phải khớp ba-spec. (6) Screenshot lại, báo cáo "X BLOCK, Y MAJOR → 0" kèm before/after; MINOR còn lại liệt kê cho anh quyết.
