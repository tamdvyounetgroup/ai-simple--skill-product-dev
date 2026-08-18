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
