# Gói chấm MÙ — skill ba-flow-logic

## RUBRIC (tiêu chí chấm từng case)

## case 0
# rubric cho ba-flow-logic id=0 (new-need-multi-user)
Kích ba-flow-logic. Sinh ba-spec.md TRƯỚC mọi thứ khác: User registry ≥3 user (chủ/nhân viên/kế toán, + có thể cron nhắc hạn). User×Nghiệp vụ matrix với mỗi nghiệp vụ có đúng 1 owner-user. Cross-user handoff map cho Tạo→Duyệt→Công nợ, mỗi handoff có điều kiện + điểm kết khi treo. Mỗi flow có Input/Output + start/end. Tối ưu flow qua agent (nghiệp vụ công nợ → gọi Domain-Specialist kế toán). AC dạng Given/When/Then, KHÔNG chứa từ UI. KHÔNG vẽ màn/chọn màu (đó là ui-design-logic).

## case 1
# rubric cho ba-flow-logic id=1 (optimize-existing-flow)
Kích ba-flow-logic (tối ưu flow, không phải UI defect). Suggester đề biến thể; Optimizer chấm theo rubric → bắt đúng 2 bệnh: 'đơn nằm im' = handoff treo (thiếu điểm-kết-khi-treo → thêm nhắc/cron/quá-hạn), 'trừ kho 2 lần' = invariant vỡ (R: kho không trừ 2 lần/đơn). Domain-Specialist kho xác nhận giữ-tạm vs trừ-thật. Ghi candidate bị loại vào Flow optimization log. Output là AC + flow sửa trong ba-spec, KHÔNG sửa code.

## case 2
# rubric cho ba-flow-logic id=2 (not-trigger-ui-design)
KHÔNG kích ba-flow-logic. Đây là HOW-nhìn (giao diện) → ui-design-logic (hoặc ui-ux-triage nếu là defect trên màn đã chạy). BA chỉ vào khi là WHAT/WHY (user/nghiệp vụ/flow/acceptance), không phải 'làm đẹp'.

## case 3
# rubric cho ba-flow-logic id=3 (reverse-handoff-from-triage)
Nhận reverse handoff: code khớp spec mà vẫn sai → spec THIẾU (nhu cầu thiếu), KHÔNG sửa code. Thêm AC/flow cho 'duyệt đơn → sinh công nợ' (handoff H sang kế toán). Domain-Specialist kế toán soi bút toán cân. Tier: thêm AC mới = GREEN/YELLOW; nếu đổi AC duyệt đang chạy = RED → 1 ASK. Bump last_verified + ghi History.

## case 4
# rubric cho ba-flow-logic id=4 (not-trigger-small-clear-change)
KHÔNG kích ba-flow-logic (và không cần BA). Đổi nhỏ đã rõ, không đổi hành vi/nghiệp vụ → build thẳng (đổi text/i18n). BA chỉ cho nhu cầu mơ hồ/mới hoặc thay đổi hành vi.

## case 5
# rubric cho ba-flow-logic id=5 (defer-db-migration-not-spec)
BA phân tích nghiệp vụ công nợ (flow/AC) thì được, NHƯNG phần migration (thêm bảng, drop/đổi cột mất dữ liệu) KHÔNG phải việc BA định nghĩa hay tự làm → defer ai-simple #06 (RED: irreversible) → 1 ASK gộp + đẩy việc schema sang đúng cổng. BA dừng ở WHAT (cần lưu công nợ, trạng thái nào), không quyết HOW-DB (DROP/ALTER). Không tự chế risk-tier.

## case 6
# rubric cho ba-flow-logic id=6 (tiebreaker-display-is-design-not-ba)
Tie-breaker WHAT/HOW: đây là cách HIỂN THỊ/truy cập dữ liệu ĐÃ CÓ (lọc/sắp xếp) — không có nghiệp vụ/rule/hành vi mới → KHÔNG kích ba-flow-logic, mà → ui-design-logic (screen/filter/density) hoặc build. BA chỉ vào nếu lọc kéo theo rule mới (vd 'kế toán chỉ được xem đơn đã chốt sổ' = quyền/rule → BA). Pin ranh giới: trình bày dữ liệu = design; rule/hành vi = BA.

## case 7
# rubric cho ba-flow-logic id=7 (ba-spec-must-pass-gate)
ba-spec sinh ra phải: có frontmatter covers/last_verified/ttl_days + 'Load khi'; mỗi nghiệp vụ có owner-user; mỗi AC dạng G/W/T có `Test:` (e2e cho flow đặt-xác nhận) + `Assert` ĐỊNH LƯỢNG (vd status=="đã xác nhận", count slot>=1); không AC nào chứa từ UI. Chạy `bash ba-verify.sh` trên file output phải PASS exit 0. Nếu thiếu Test/Assert hoặc 0 AC → cổng BLOCK, coi như chưa xong.

# ===== BẢN A =====
## case 0
Đúng trigger BA (nhu cầu mới còn mơ hồ). Chạy đủ pipeline 7 bước, không nhảy cóc. B0: đây là LOGIC/need mới → nhận. B1 User registry: chủ shop (power, desktop), nhân viên bán (quen, mobile tại quầy), kế toán (quen, desktop), và bắt buộc kê cả actor phi người — cron nhắc đơn tồn đọng, webhook/cổng thanh toán nếu có. B2: mỗi nghiệp vụ đúng 1 owner-user — NV1 Tạo đơn (nhân viên), NV2 Duyệt đơn (chủ shop, depends NV1), NV3 Đối soát công nợ (kế toán, depends NV2); gắn tần suất + MoSCoW. B3 Cross-user map: H1 nhân viên→chủ shop (điều kiện: đơn "chờ duyệt"; điểm kết khi treo: >24h → cron nhắc/tự huỷ), H2 chủ shop→kế toán (điều kiện: đơn "đã duyệt" + phát sinh công nợ). Cấm cross ngầm. B4: mỗi nghiệp vụ 1 flow Start/Input/Steps/Output/End, Output quan sát được (trạng thái dữ liệu + side-effect kho/bút toán), mọi nhánh có end riêng.

B5 spawn team `ba-flow-<n>` (thoả cả 3 điều kiện: ≥3 nghiệp vụ, có cross-user, có nghiệp vụ CHUYÊN): Flow-Suggester ≥2 biến thể/nghiệp vụ; Domain-Specialist kế toán/công nợ + kho chạy TRƯỚC Optimizer làm cổng hợp-lệ (có quyền veto: bút toán cân, không trừ kho 2 lần); Optimizer chấm rubric 6 tiêu chí; Cross-User-Integrity soi handoff orphan. B6: AC Given/When/Then, mỗi AC có `Test:` + `Assert` định lượng → ba-spec ở `docs/app-map/`. Tôi làm WHAT+WHY, không đụng màn hình, không viết code.

## case 1
Đây là "tối ưu flow/quy trình" — đúng trigger, nhưng KHÔNG nhảy thẳng B5. Phải tái chạy B1–B4 cho riêng nghiệp vụ Duyệt đơn (không làm lại cả spec), vì hai triệu chứng bạn mô tả map thẳng vào hai bệnh trong rubric:

(1) "Đơn nằm im không ai duyệt" = bệnh *treo/bỏ dở* — handoff H1 thiếu **điểm kết khi KHÔNG ai nhận**. Sửa ở B3: khai người nhận + điều kiện chuyển + điểm kết (đơn chờ >N giờ → cron nhắc chủ shop, quá hạn cứng → tự huỷ giữ-tạm và trả về người tạo). Owner của nghiệp vụ tự động này là system-actor, không phải nghiệp vụ mồ côi.

(2) "Duyệt 2 lần trừ kho 2 lần" = vỡ **invariant**, không phải bug UI. Đây là nghiệp vụ CHUYÊN (kho/tồn) → bắt buộc gọi Domain-Specialist kho ở bước 2, TRƯỚC Optimizer, với quyền veto mọi biến thể cho phép trừ kho không idempotent. Ghi thành R: "Kho không bị trừ 2 lần cho 1 đơn" + edge case duyệt→từ chối→duyệt lại; phân biệt giữ-tạm vs trừ-thật.

B5: Suggester đề ≥2 biến thể (ngắn nhất / an toàn nhất / ít cross nhất), Optimizer chấm trong các biến thể đã hợp-chuẩn, ghi candidate bị loại + lý do vào Flow optimization log. B6: thêm AC nhánh (từ chối hoàn kho, duyệt lần 2 bị chặn) với `Assert` định lượng: `stock_reserved==0`, `stock_deducted==số lượng` đúng 1 lần. Sửa AC cũ mà build/triage đang dựa = RED → 1 câu ASK gộp.

## case 2
Case này KHÔNG thuộc ba-flow-logic. "Nhìn rối và xấu", "cho đẹp và đồng bộ hơn" là HOW-nhìn: layout, hệ thống phân cấp thị giác, token màu/spacing, chọn component. Luật vàng của skill là BA chỉ nói WHAT + WHY (user, nghiệp vụ, flow, input/output, rule, acceptance) và bị CẤM chạm màn/layout/màu/nút. Tie-breaker: nghi ngờ "WHAT hay HOW?" → WHAT là BA, HOW (screen/pixel) là design. Ở đây không có chút mơ hồ nào về WHAT, nên tôi từ chối và định tuyến.

Định tuyến đúng phụ thuộc một điều: dashboard này **đã chạy** hay chưa. Nếu đây là màn đã build và bạn đang thấy nó xấu/rối trên bản chạy thật, đó là defect giao diện → **ui-ux-triage** (nó test + fix, và nếu "code khớp design-spec mà giao diện vẫn sai" thì nó đẩy thẳng sang ui-design-logic, không qua tôi). Nếu bạn muốn thiết kế lại có chủ đích — hệ thống hoá token, chọn component, quyết density và thứ tự thông tin → **ui-design-logic**, nó nhận ba-spec làm input (user-ladder + flow) rồi ra design-spec.

Việc duy nhất tôi làm được ở đây, và chỉ khi bạn xác nhận: nếu "rối" thực ra là *dashboard đang hiển thị sai thứ so với nghiệp vụ* — sai người dùng, sai chỉ số, thiếu nghiệp vụ — thì đó là WHAT thiếu, quay lại B1–B6 để bổ sung. Bạn xác nhận giúp là ca nào, tôi không tự đoán rồi lấn sân.

## case 3
Đây là **reverse handoff từ triage**, đúng đường nhận của skill này: "code khớp ba-spec mà hành vi vẫn sai". Luật cứng: **sửa SPEC, không sửa code**, và không tự triage.

Phân loại 3 ca: bạn nói "spec không hề nhắc tới chuyện đó" → đây là ca **Nhu cầu thiếu** (có ca thật chưa AC nào phủ), không phải Spec sai. Tier: GREEN/YELLOW — thêm AC/flow mới thì làm thẳng, không cần ASK; chỉ khi buộc phải sửa/xoá AC duyệt đơn hiện có (mà design/build/triage đang dựa) mới nhảy lên RED và hỏi đúng 1 câu gộp.

Quy trình: quay B4–B6 cho riêng nghiệp vụ liên quan, không làm lại cả spec. B3 bổ sung handoff H2 chủ shop→kế toán với điều kiện chuyển "đơn đã duyệt + phát sinh công nợ" và điểm kết khi không ai nhận. B4: Output của flow Duyệt đơn phải kê side-effect còn thiếu — sinh bút toán công nợ — vì Output "đơn đã duyệt" suông là kiểu mơ hồ mà rubric #2 loại. Công nợ là nghiệp vụ CHUYÊN → Domain-Specialist kế toán soi đủ-đúng (bút toán cân, không ghi 2 lần, kỳ chốt sổ) → thành Rules/Invariants §9.

B6 AC mới, ví dụ: Given đơn "chờ duyệt" có giá trị > 0 · When chủ shop duyệt · Then sinh đúng 1 bút toán công nợ khớp giá trị đơn · Test: integration · Assert: `count(bút toán theo order_id)==1` và `tổng nợ tăng == tổng tiền đơn`. Xong: bump `last_verified`, ghi 1 dòng History, kích lại build.

## case 4
Đây thuộc nhóm **không kích hoạt BA**: "đổi nhỏ ĐÃ RÕ (sửa 1 rule có sẵn, đổi text) → build thẳng". Dựng cả pipeline 7 bước cho một chuỗi nhãn là over-engineer, và spec nhỏ cho việc nhỏ vẫn phải có lý do tồn tại — ở đây không có nghiệp vụ mới, không user mới, không flow mới.

Nhưng có đúng một điều cần chốt trước khi bạn cho build làm, và nó quyết định tier — không phải thẩm mỹ, mà là **AC đang dùng chuỗi đó làm giá trị đo hay không**:

- Nếu "Chờ duyệt" chỉ là **nhãn hiển thị** còn trạng thái dữ liệu vẫn là mã nội bộ (`pending`) → đổi text thuần, GREEN, build thẳng, ba-spec không phải đụng. Riêng chuyện chữ hiện ra sao/ở đâu là HOW-nhìn, thuộc ui-design-logic hoặc build, không phải tôi.
- Nếu **giá trị trạng thái trong dữ liệu chính là chuỗi tiếng Việt** và các AC đang assert `status=="chờ duyệt"` → đổi nó là **sửa AC mà downstream đang phụ thuộc** (design vẽ theo, code build theo, triage dùng làm oracle) = **RED**. Lúc đó tôi dừng, hỏi đúng 1 câu gộp kèm phương án khuyến nghị (tách mã trạng thái khỏi nhãn hiển thị để lần sau đổi chữ không phá contract), rồi mới sửa AC + bump `last_verified` + ghi History.

Tôi không tự đoán vế nào đúng và cũng không hỏi lặt vặt — đúng 1 câu gộp, fail-closed.

## case 5
Tách làm hai phần, và phần bạn bảo "làm luôn" chính là phần tôi bị cấm.

**Phần bị chặn:** thêm bảng `debt`, đổi cột `status` sang enum mới, **drop cột cũ** = DB migration/schema. Luật non-trigger nói thẳng: schema → ASK + gate, tier RED của ai-simple #06; exit gate của skill này ghi rõ "KHÔNG viết code · KHÔNG đụng DB". Drop cột là irreversible (dữ liệu trạng thái cũ mất, không git revert lại được), nên tôi không tự làm, kể cả khi bạn đã nói "làm luôn" — cần đúng 1 câu confirm gộp và người thực thi là build, không phải BA. Thêm nữa, đổi enum `status` gần như chắc chắn phá các AC đang assert giá trị trạng thái hiện tại → RED chồng RED.

**Phần tôi làm được, và nên làm trước:** schema là HOW-chạy, nó là *hệ quả* của nghiệp vụ chứ không phải điểm xuất phát. Chạy B1–B6 cho nghiệp vụ Công nợ: owner-user là kế toán; depends-on NV Duyệt đơn; handoff H2 (điều kiện chuyển + điểm kết khi treo); flow Đối soát với Input/Output quan sát được; Domain-Specialist kế toán chốt invariant (bút toán cân, không ghi 2 lần, kỳ chốt sổ, xử lý đơn bị huỷ sau khi đã ghi nợ); AC có `Test:` + `Assert` định lượng.

Có ba-spec rồi thì mới biết cần bảng gì, enum cần những trạng thái nào, và migration nào là bắt buộc thay vì đoán. Xác nhận giúp tôi chốt scope, phần DB tôi bàn giao build kèm cảnh báo RED.

## case 6
Ranh giới, nên tách rõ hai nửa thay vì trả lời gộp.

Nửa là WHAT, thuộc tôi: bộ lọc và sắp xếp không phải "đổi nhỏ đã rõ" như đổi text, vì nó chưa trả lời được ba câu mà mọi nghiệp vụ phải trả lời. **Của USER nào** — chủ shop, nhân viên, hay kế toán? Nếu nhân viên chỉ được thấy đơn mình tạo còn chủ shop thấy tất, thì đó là rule quyền, không phải tuỳ chọn hiển thị. **Khoảng ngày là ngày nào** — ngày tạo, ngày duyệt, hay ngày giao? Chọn sai là kế toán đối soát lệch kỳ. **Vào gì ra gì** — Input (bộ tiêu chí + phạm vi dữ liệu user được phép thấy), Output quan sát được (tập đơn thoả đồng thời mọi tiêu chí, mặc định mới-nhất-trước). Vậy tôi mở đúng một nghiệp vụ nhỏ "Tra cứu danh sách đơn", gán 1 owner-user, 1 flow, spec ngắn — nhỏ nhưng phải có, vì nó ép chốt quyền và định nghĩa ngày.

Nửa là HOW-nhìn, không thuộc tôi: bộ lọc nằm ở đâu, dạng chip hay dropdown, bao nhiêu dòng một trang, có sticky header không → **ui-design-logic**. AC của tôi cấm chứa các từ đó; tôi chỉ đảm bảo "user truy được toàn bộ đơn trong kỳ đã lọc".

AC mẫu: Given kế toán đã đăng nhập · When lọc trạng thái="đã duyệt" + khoảng ngày duyệt [D1,D2] · Then trả đúng tập đơn thoả cả hai, thứ tự giảm dần theo thời điểm tạo · Test: e2e · Assert: mọi bản ghi có `status=="đã duyệt"` và `D1<=approved_at<=D2`, `count` khớp truy vấn đối chứng, phần tử đầu có `created_at` lớn nhất.

## case 7
Nhận. B0 hợp lệ, chạy đủ B1–B6 rồi xuất `docs/app-map/0X-ba-spec-dat-lich.md` đủ frontmatter `covers/last_verified/ttl_days` (ttl 90 vì flow đặt lịch hay đổi).

B1 registry: **khách** (public/mới — mobile, có thể chưa có tài khoản), **lễ tân** (quen — desktop tại quầy), **cron** (actor tự động: nhắc lịch, tự huỷ giữ chỗ quá hạn; owner khi hỏng = admin, KHÔNG coi là mồ côi). B2: NV1 Đặt lịch (owner khách), NV2 Xác nhận lịch (owner lễ tân, depends NV1), NV3 Huỷ/đổi lịch (owner tuỳ ai khởi xướng → tách 2 nghiệp vụ nếu rule khác nhau). B3: H1 khách→lễ tân, điều kiện "yêu cầu ở trạng thái chờ xác nhận", **điểm kết khi treo**: quá N giờ chưa ai xác nhận → nhắc, quá hạn cứng → tự huỷ và thông báo khách. Không có cột này là flow treo — chính bệnh của case 1.

B5 spawn team (≥3 nghiệp vụ + có cross-user): Suggester ≥2 biến thể (xác nhận thủ công vs tự động theo slot trống); Domain-Specialist lịch hẹn/SLA làm cổng hợp-lệ trước Optimizer, veto mọi biến thể cho phép **double-booking** — đó là invariant, không phải tuỳ chọn. Ghi candidate bị loại vào Flow optimization log.

AC mẫu: Given slot còn trống · When khách gửi yêu cầu hợp lệ · Then tạo 1 lịch "chờ xác nhận", slot bị giữ tạm, lễ tân thấy trong hàng đợi · Test: e2e · Assert: `status=="chờ xác nhận"` + `slot_held==1` + hai yêu cầu đồng thời cùng slot chỉ 1 cái thành công. Thiếu info → ghi Assumptions fail-closed, chỉ RED mới hỏi 1 câu gộp. Chốt bằng `bash ba-verify.sh --staged` exit 0.

# ===== BẢN B =====
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
