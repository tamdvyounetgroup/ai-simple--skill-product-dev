# Gói chấm MÙ — skill ui-design-logic (vòng 2)

## RUBRIC

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
## case 0
Tôi sẽ dựng app React (Vite + TypeScript + Tailwind) theo hướng mobile-first vì chủ trại dùng điện thoại ngoài ao là chính. Cấu trúc màn hình: (1) Danh sách ao dạng card lớn, mỗi card hiện tên ao, 3 thông số pH / oxy / nhiệt độ với màu trạng thái (xanh bình thường, đỏ vượt ngưỡng), badge cảnh báo nổi bật ở đầu card; (2) Chi tiết ao gồm biểu đồ 24h của từng thông số, lịch cho ăn theo ngày với nút "Đã cho ăn" to; (3) Trang cảnh báo tổng hợp; (4) Cài đặt ngưỡng cho từng ao. Trên mobile dùng bottom navigation 3–4 tab, nút thao tác chính đặt trong tầm ngón cái, kích thước chạm tối thiểu 44px vì người dùng có thể đeo găng, tay ướt. Trên laptop chuyển sang layout 2 cột: sidebar danh sách ao + nội dung chi tiết. Màu cam neon của logo dùng làm màu accent (nút chính, active tab), nhưng chữ trên nền cam phải kiểm tra tương phản; nền chính giữ trung tính, không tràn cam để tránh nhầm với màu cảnh báo — cảnh báo dùng đỏ có icon kèm text để không phụ thuộc màu. Ưu tiên chữ lớn dễ đọc ngoài trời, hỗ trợ dark mode. State: React Query cho dữ liệu, mock API trước, có trạng thái loading/lỗi/trống. Cảnh báo cần push notification (PWA) vì người dùng không mở app liên tục.

## case 1
Tôi sẽ thêm mục "Khuyến mãi" vào sidebar hiện có, đặt sau "Sản phẩm" và trước "Báo cáo" để giữ logic vận hành → phân tích, dùng cùng icon set và style item đang có (không tự chế style mới). Cấu trúc trang: (1) Danh sách mã giảm giá dạng bảng, các cột: mã, loại (phần trăm/số tiền), giá trị, thời hạn, số lượt đã dùng/giới hạn, trạng thái; cột cuối là toggle bật/tắt ngay trên hàng để thao tác nhanh, có xác nhận nhẹ (toast kèm Undo) khi tắt mã đang chạy. Có ô tìm kiếm và bộ lọc trạng thái (đang chạy/hết hạn/tắt); trạng thái trống có nút "Tạo mã đầu tiên". (2) Tạo mã: dùng modal hoặc trang riêng tùy pattern app đang dùng cho "Tạo sản phẩm" — phải nhất quán với form hiện có; các trường: mã (có nút tạo ngẫu nhiên), loại giảm, giá trị, đơn tối thiểu, ngày bắt đầu/kết thúc, giới hạn lượt dùng; validate mã trùng, giá trị % không quá 100. Sau khi tạo, quay lại danh sách và highlight dòng vừa tạo. Cần làm rõ với bạn: mã có áp dụng theo sản phẩm/khách hàng cụ thể không, có cần lịch sử sử dụng mã không, và ai được phép bật tắt (phân quyền). Nếu chưa rõ tôi làm bản đơn giản trước, ghi lại giả định.

## case 2
Nhìn file có mấy vấn đề chính khiến trang "rối và xấu": (1) Spacing tùy tiện — p-[13px], mb-[7px], gap-[11px], mt-[27px]… không theo thang; đổi hết sang thang 4/8 của Tailwind (p-4, mb-2, gap-3, mt-6). (2) Màu hard-code #7c3aed lặp lại thay vì token; đưa vào theme (bg-primary). (3) Hai nút cùng style primary "Tạo đơn mới" và "Xuất báo cáo" cạnh nhau — chỉ giữ một hành động chính, các nút còn lại là secondary/ghost. Nhãn nút không nhất quán: "xem thêm" viết thường, "Cài đặt hệ thống nâng cao" quá dài; chuẩn hóa viết hoa chữ đầu, ngắn gọn. (4) Tiêu đề "Quản Lý Đơn Hàng" viết hoa từng chữ, còn card "ĐƠN CHỜ DUYỆT" viết hoa toàn bộ — thống nhất một kiểu. (5) Đoạn subtitle "Đây là trang tổng quan giúp bạn…" là câu thuyết minh vô nghĩa, bỏ đi. (6) Font Be Vietnam Pro có thể ổn nhưng nên đặt ở cấp global chứ không inline style; nếu app đã có font hệ thống thì dùng font đó. (7) Số liệu "12345678", "1200000" không định dạng và không dùng tabular-nums; format thành 12.345.678 ₫, căn phải, thêm class tabular-nums để cột thẳng hàng. (8) Grid 4 cột chỉ có 2 card, thiếu responsive; dùng grid-cols-2 md:grid-cols-4. Table thiếu header style, hàng zebra/hover, không có trạng thái trống. Tôi sẽ viết lại file theo các điểm trên và giữ nguyên dữ liệu.

## case 3
Về font: với app nội bộ tôi khuyên không nên chọn font "trendy" — app dùng hằng ngày cần dễ đọc, ổn định, hỗ trợ tiếng Việt đầy đủ (dấu không bị lệch). Lựa chọn hợp lý là Inter hoặc font hệ thống (system-ui); nếu muốn có cá tính hơn chút vẫn an toàn tiếng Việt thì có thể cân nhắc Be Vietnam Pro hoặc Public Sans, dùng nhất quán một font toàn app, không đổi riêng cho màn hình này. Về mô tả dưới mỗi mục: chỉ thêm khi mô tả mang thông tin thật (hệ quả, phạm vi, ví dụ), không viết kiểu "Cho phép bạn thay đổi mật khẩu" dưới mục "Đổi mật khẩu" — lặp lại nhãn chỉ làm rối. Ví dụ tốt: "Email dùng để nhận thông báo và khôi phục tài khoản", "Đăng xuất khỏi tất cả thiết bị khác". Bố cục màn hình: chia nhóm Hồ sơ (tên, ảnh, email), Bảo mật (mật khẩu, 2FA, phiên đăng nhập), Thông báo, Giao diện (ngôn ngữ, dark mode). Mỗi nhóm là một section có tiêu đề, form lưu theo nhóm hoặc autosave có toast xác nhận; hành động nguy hiểm (xóa tài khoản, thu hồi phiên) tách vùng riêng và có xác nhận. Đảm bảo label gắn với input, focus ring rõ, và có trạng thái loading/lỗi khi lưu.

## case 4
Cảm giác "AI làm" thường đến từ vài dấu hiệu: gradient tím-xanh, card bo góc quá to với shadow đều tăm tắp, icon emoji, mỗi khối đều có tiêu đề + dòng mô tả sáo rỗng, số liệu to bất thường, khoảng cách quá rộng, và bố cục đối xứng hoàn hảo nhưng không có thứ tự ưu tiên. Để redesign giống app thật mà không phá chức năng, tôi sẽ chỉ chạm lớp trình bày (className, layout, token), giữ nguyên logic, handler, data flow và test hiện có. Hướng làm: (1) Đặt hệ thống token: một font, thang chữ 4–5 cấp, thang spacing 4/8, màu trung tính làm nền, một màu accent, màu trạng thái chuẩn. (2) Xếp thứ tự ưu tiên: kho hàng thì thứ cần nhìn đầu tiên là tồn kho thấp/hết hàng và đơn cần xử lý — đưa lên trên, thu nhỏ các số liệu ít quan trọng. (3) Bảng làm mật độ cao hơn: hàng 40–44px, số căn phải với tabular-nums, cột cố định, có sort/filter thật. (4) Bỏ mô tả thừa, bỏ gradient, shadow nhẹ hoặc chỉ dùng border. (5) Sidebar và header gọn, active state rõ. (6) Bổ sung trạng thái trống/loading/lỗi nếu đang thiếu vì app thật luôn có. Tôi sẽ làm từng màn, chụp trước/sau để bạn duyệt, và chạy lại flow chính để chắc không đổi hành vi.

# ===== BẢN B =====
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
