# Gói chấm MÙ — skill ba-flow-logic (vòng 2)

## RUBRIC

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
Trước hết cần làm rõ ba nhóm người dùng và mục tiêu của từng người: nhân viên bán hàng muốn tạo đơn nhanh, ít lỗi; chủ shop muốn kiểm soát đơn trước khi xuất kho và nắm doanh thu; kế toán muốn công nợ đúng, đối soát được với đơn đã duyệt. Từ đó tôi đề xuất phân tích theo các bước sau.

Thứ nhất, xác định vòng đời đơn hàng: Nháp → Chờ duyệt → Đã duyệt → Đã giao/Hoàn thành → Hủy. Mỗi trạng thái ghi rõ ai được chuyển, điều kiện chuyển và hành động phát sinh (ví dụ Đã duyệt thì trừ tồn kho và ghi công nợ khách).

Thứ hai, ma trận quyền: nhân viên chỉ tạo/sửa đơn nháp của mình; chủ shop duyệt, từ chối, hủy; kế toán xem toàn bộ, ghi nhận thanh toán, không sửa đơn.

Thứ ba, đối tượng dữ liệu chính: Khách hàng, Sản phẩm/Tồn kho, Đơn hàng, Dòng đơn, Thanh toán, Công nợ.

Thứ tư, các luồng chính và ngoại lệ: tạo đơn, duyệt, từ chối kèm lý do, hủy sau khi duyệt (phải hoàn kho, đảo công nợ), thanh toán một phần, khách trả hàng.

Cuối cùng, tôi sẽ đặt câu hỏi mở còn thiếu: có cần hạn mức công nợ theo khách không, đơn có sửa được sau khi duyệt không, ai được xóa đơn, báo cáo cần theo ngày hay theo nhân viên. Trả lời xong các câu này mới chốt được spec và tiêu chí nghiệm thu.

## case 1
Hai triệu chứng bạn nêu là hai lỗi thiết kế quy trình khác nhau, cần xử lý riêng.

Đơn nằm im không ai duyệt là lỗi thiếu chủ sở hữu và thiếu tín hiệu. Cách sửa: khi đơn chuyển sang Chờ duyệt phải gán rõ người duyệt (chủ shop hoặc người được ủy quyền), có thông báo tức thời và có hàng đợi "Cần tôi duyệt" hiển thị ngay khi đăng nhập. Đặt SLA, ví dụ 4 giờ, quá hạn thì nhắc lại và cho phép ủy quyền dự phòng. Ngoài ra nên xét ngưỡng tự duyệt cho đơn nhỏ, đúng giá niêm yết, còn hàng, để chủ chỉ phải nhìn đơn bất thường.

Đơn duyệt hai lần và trừ kho hai lần là lỗi thiếu tính bất biến của hành động. Sửa gốc bằng máy trạng thái chặt: chỉ cho phép duyệt khi trạng thái hiện tại là Chờ duyệt, thao tác đổi trạng thái và trừ kho nằm trong cùng một giao dịch, dùng khóa lạc quan hoặc điều kiện cập nhật kiểu "chỉ đổi nếu vẫn đang Chờ duyệt". Nút Duyệt trên giao diện phải vô hiệu sau lần bấm đầu và làm mới trạng thái. Việc trừ kho nên gắn với mã đơn để trùng lặp bị từ chối ở tầng dữ liệu.

Kèm theo cần nhật ký ai duyệt lúc nào, và một báo cáo đơn quá hạn duyệt để đo được flow mới có hiệu quả không.

## case 2
Yêu cầu này thuộc thiết kế giao diện, không phải phân tích nghiệp vụ, nên trước khi sửa tôi cần hai điều: ảnh chụp dashboard hiện tại và mục đích của nó, tức là người dùng vào đây để trả lời câu hỏi gì trong 5 giây đầu. Nếu chưa rõ mục đích thì "đẹp" chỉ là trang trí và sẽ lại rối theo cách khác.

Về hướng xử lý chung, dashboard rối thường do bốn nguyên nhân: quá nhiều số liệu ngang hàng nhau không có thứ bậc; màu sắc và kiểu chữ không thống nhất; khoảng cách, căn lề lộn xộn; và các thẻ không cùng cấu trúc. Cách sửa tương ứng là chọn 3 đến 5 chỉ số quan trọng nhất đưa lên trên, gộp phần còn lại xuống dưới hoặc vào tab; định nghĩa một bảng màu ngữ nghĩa nhỏ (trung tính, nhấn, cảnh báo, lỗi); dùng lưới cột cố định và một thang khoảng cách duy nhất; chuẩn hóa thẻ chỉ số thành một mẫu chung có tiêu đề, con số, xu hướng.

Ngoài ra vẫn phải giữ các ràng buộc cơ bản: tương phản chữ đủ đọc, hoạt động tốt ở màn hình hẹp, có trạng thái đang tải và trống. Nếu bạn gửi ảnh và cho biết vai trò người xem chính, tôi sẽ đề xuất bố cục cụ thể.

## case 3
Đây là tình huống code đúng spec nhưng spec sai, tức khoảng trống nằm ở khâu phân tích nghiệp vụ chứ không phải ở lập trình. Không nên xử lý bằng cách vá thêm code cho "hợp lý" rồi thôi, vì như vậy hành vi thật sẽ lệch khỏi tài liệu và lần sau lại có người sửa ngược.

Việc cần làm theo thứ tự: một là ghi nhận đây là thiếu sót của spec, không phải lỗi triển khai, để tránh quy trách nhiệm sai. Hai là quay lại với chủ shop và kế toán để chốt luật nghiệp vụ còn thiếu: đơn duyệt xong sinh bút toán công nợ ở thời điểm nào (khi duyệt hay khi giao hàng), số tiền tính thế nào, đơn hủy sau duyệt thì đảo bút toán ra sao, thanh toán một phần ghi nhận thế nào. Ba là bổ sung vào spec một tiêu chí nghiệm thu rõ ràng, ví dụ "sau khi duyệt, tài khoản công nợ của khách tăng đúng bằng tổng đơn và tra được theo mã đơn". Bốn là mới đến bước sửa code, kèm test cho tiêu chí đó và xử lý dữ liệu cũ: các đơn đã duyệt trước đây phải được sinh bút toán bù để kế toán đối soát được quá khứ.

Bài học chung là mỗi luồng nghiệp vụ nên có câu hỏi "ai dùng kết quả đầu ra của bước này" khi viết spec.

## case 4
Đây là thay đổi nhỏ nhưng tôi vẫn kiểm tra vài điểm trước khi làm, vì nhãn trạng thái thường không chỉ xuất hiện ở một chỗ.

Trước hết cần phân biệt nhãn hiển thị và giá trị lưu trong dữ liệu. Chỉ nên đổi chữ hiển thị, không đổi mã trạng thái trong cơ sở dữ liệu hay API, vì đổi mã sẽ ảnh hưởng đến báo cáo, bộ lọc và tích hợp bên ngoài. Nếu ứng dụng đã có một chỗ tập trung ánh xạ mã sang nhãn thì sửa đúng ở đó; nếu chuỗi "Chờ duyệt" đang bị viết rải rác thì đây là dịp gom về một nơi.

Tiếp theo, tìm mọi vị trí dùng nhãn này: danh sách đơn, chi tiết đơn, bộ lọc, thông báo, email, file xuất, tài liệu hướng dẫn và test. Đổi thiếu một chỗ sẽ khiến người dùng thấy hai tên cho cùng một trạng thái.

Cuối cùng, tôi sẽ hỏi lại một ý nhỏ về nghĩa: "Đang chờ" chung chung hơn "Chờ duyệt", người dùng có thể hiểu là chờ giao hay chờ thanh toán. Nếu hệ thống có nhiều trạng thái chờ khác nhau thì nên giữ vế "duyệt" hoặc chọn từ khác rõ hơn. Nếu bạn xác nhận vẫn muốn "Đang chờ", tôi sửa ngay và cập nhật test tương ứng.

## case 5
Tôi sẽ không làm luôn phần đổi cột và drop cột cũ mà đề nghị tách thành hai việc, vì hai việc này có mức rủi ro rất khác nhau.

Thêm bảng công nợ là thay đổi bổ sung, an toàn, có thể làm ngay: khóa chính, liên kết đến đơn và khách hàng, số tiền, loại bút toán (ghi nợ/ghi có), thời điểm, người tạo, và ràng buộc để một đơn không sinh trùng bút toán.

Đổi kiểu cột trạng thái sang enum mới và xóa cột cũ là thay đổi phá vỡ, không hoàn tác được nếu đã mất dữ liệu, và có thể làm hỏng mọi truy vấn, báo cáo, code cũ đang đọc cột đó. Cách an toàn là làm theo kiểu mở rộng rồi thu hẹp: thêm cột mới, viết script chuyển đổi giá trị cũ sang enum mới kèm bảng ánh xạ rõ ràng, chạy song song ghi cả hai cột một thời gian, chuyển toàn bộ code sang đọc cột mới, kiểm tra không còn nơi nào đọc cột cũ, rồi mới xóa cột cũ ở một lần triển khai sau, sau khi đã sao lưu.

Trước khi làm tôi cần bạn xác nhận: danh sách giá trị enum mới, cách ánh xạ từng trạng thái cũ, và có được phép xóa cột cũ ngay hay giữ lại một thời gian. Có xác nhận rồi tôi làm phần bảng công nợ và cột mới trước.

## case 6
Yêu cầu khá rõ, tôi triển khai với các điểm sau để tránh phải làm lại.

Bộ lọc trạng thái: cho chọn nhiều trạng thái cùng lúc, mặc định là tất cả; nhãn hiển thị lấy từ cùng nguồn với danh sách đơn để không lệch tên. Bộ lọc khoảng ngày: cần chốt là lọc theo ngày tạo hay ngày duyệt hay ngày giao, tôi mặc định là ngày tạo và ghi rõ trong tài liệu; ngày kết thúc bao gồm cả ngày đó (đến hết 23:59); có vài lựa chọn nhanh như hôm nay, 7 ngày, tháng này; kiểm tra ngày bắt đầu không lớn hơn ngày kết thúc và múi giờ nhất quán giữa giao diện và máy chủ.

Sắp xếp mặc định theo mới nhất tức là theo thời gian tạo giảm dần, có khóa phụ theo mã đơn để thứ tự ổn định khi phân trang. Bộ lọc và sắp xếp nên nằm trên tham số URL để người dùng tải lại trang hoặc gửi link vẫn giữ nguyên, và phải reset về trang 1 khi đổi bộ lọc.

Về trạng thái giao diện: có nút xóa bộ lọc, có trạng thái đang tải, trạng thái không có kết quả kèm gợi ý nới lọc, và bộ lọc phải kết hợp đúng với phân quyền hiện có (nhân viên chỉ thấy đơn của mình). Về hiệu năng, cần chỉ mục trên cột trạng thái và ngày tạo. Kèm test cho biên ngày và kết hợp nhiều điều kiện.

## case 7
Dưới đây là ba-spec rút gọn cho tính năng đặt lịch hẹn.

Người dùng và mục tiêu: Khách muốn chọn dịch vụ, ngày giờ trống và nhận xác nhận nhanh. Lễ tân muốn thấy các yêu cầu mới, xác nhận hoặc từ chối, tránh trùng giờ.

Đối tượng dữ liệu: Lịch hẹn (khách, dịch vụ, nhân viên phục vụ nếu có, thời gian bắt đầu và kết thúc, trạng thái, ghi chú, lý do từ chối), Khung giờ làm việc, Dịch vụ.

Vòng đời trạng thái: Chờ xác nhận → Đã xác nhận → Hoàn thành; các nhánh Từ chối, Khách hủy, Không đến. Chỉ lễ tân được chuyển sang Đã xác nhận hoặc Từ chối; khách chỉ được hủy trước giờ hẹn một khoảng quy định.

Luồng chính: Khách chọn dịch vụ, hệ thống chỉ hiện khung giờ còn trống, khách gửi yêu cầu, nhận thông báo đã tiếp nhận. Lễ tân thấy yêu cầu trong hàng đợi, xác nhận, khách nhận thông báo xác nhận kèm chi tiết.

Ngoại lệ: hai khách cùng chọn một khung giờ thì người gửi sau bị báo hết chỗ; lễ tân không xử lý quá hạn thì nhắc; khách đổi giờ thì tạo yêu cầu mới thay vì sửa lịch đã xác nhận.

Tiêu chí nghiệm thu: không tồn tại hai lịch Đã xác nhận trùng khung giờ cùng nhân viên; mọi thay đổi trạng thái đều thông báo cho khách và ghi nhật ký; khách không thấy khung giờ đã kín.

Câu hỏi còn mở: có cần đặt cọc, có giới hạn số lịch mỗi khách, thời hạn hủy là bao lâu.

# ===== BẢN B =====
# ans-ba-flow-logic-B

## case 0
Đây đúng trigger của ba-flow-logic (nhu cầu MỚI còn mơ hồ, "phân tích nghiệp vụ") → chạy pipeline 7 bước, không nhảy cóc. **B0:** LOGIC — cần BA. **B1 User registry:** Chủ shop, Nhân viên bán hàng, Kế toán; bổ sung actor thường bị quên: Khách hàng (đối tượng nợ, không thao tác hệ thống — ghi Assumptions), Hệ thống/cron (nhắc đơn treo, tính hạn nợ). **B2 User×Nghiệp vụ, mỗi nghiệp vụ đúng 1 owner:** Nhân viên → Tạo đơn, Sửa đơn chưa duyệt; Chủ → Duyệt/Từ chối đơn, Xem tổng quan; Kế toán → Theo dõi công nợ, Ghi nhận thanh toán, Đối soát. **B3 Cross-user:** Nhân viên→Chủ (đơn ở trạng thái Chờ duyệt), Chủ→Kế toán (đơn Đã duyệt → sinh bút toán nợ), Chủ→Nhân viên (Từ chối, kèm lý do — không dead-end). **B4 Flow I/O** cho từng nghiệp vụ, START/END rõ (vd Duyệt đơn: Input = đơn Chờ duyệt + quyền chủ; Output = trạng thái Đã duyệt|Từ chối + sự kiện cho kế toán). **B5:** vì ≥3 nghiệp vụ, có cross-user, có nghiệp vụ CHUYÊN (công nợ) → spawn team `ba-flow-1`: Suggester ≥2 biến thể, Domain-Specialist kế toán làm cổng hợp-lệ (veto), Optimizer chấm rubric 6 tiêu chí, Cross-User-Integrity soi map. **B6:** AC Given/When/Then, mỗi AC có `Test:` + `Assert` định lượng, không từ UI; xuất `docs/app-map/ba-spec.md` đủ frontmatter covers/last_verified/ttl_days. Chưa có ba-spec thì chưa sang design. Tôi hỏi đúng 1 lượt gộp (hạn nợ tính từ đâu, có huỷ đơn sau duyệt không, ai được sửa đơn đã duyệt) — thiếu trả lời thì chọn giả định an toàn + ghi Assumptions.

## case 1
Trigger "tối ưu flow/quy trình" → thuộc ba-flow-logic, chạy lại đúng nghiệp vụ Duyệt đơn (B3–B6), không làm lại cả spec. Chẩn theo rubric §4: "đơn nằm im" = **dead-end/handoff treo** (Nhân viên→Chủ không có điều kiện + thời hạn + người nhận dự phòng); "duyệt 2 lần trừ kho 2 lần" = **thiếu invariant trạng thái** (Output không tường minh, cho phép chuyển Chờ duyệt→Đã duyệt lặp). **B3 sửa cross-user:** handoff Nhân viên→Chủ ghi rõ điều kiện (đơn đủ trường bắt buộc), SLA (vd 24h), quá hạn → hệ thống nhắc + escalate người duyệt thay (owner: Chủ chỉ định) — không nhánh nào kết thúc lơ lửng. **B4 flow mới:** Input = đơn ở trạng thái Chờ duyệt (đúng 1 lần), Output = Đã duyệt XOR Từ chối; trừ kho là hệ quả của chuyển trạng thái, xảy ra tối đa 1 lần/đơn (idempotent theo mã đơn). **B5:** spawn team (có cross-user + kho là nghiệp vụ chuyên): Suggester đề xuất biến thể "ngắn nhất / an toàn nhất / ít cross nhất"; Optimizer chấm; loại biến thể cũ và ghi vào Flow optimization log (lý do: dead-end + không idempotent). **B6 AC ví dụ:** Given đơn Chờ duyệt, When duyệt 2 lần liên tiếp, Then tồn kho giảm đúng 1 lần — `Test: integration`, `Assert: stock_delta == -qty, số bút toán trừ kho == 1`. Given đơn Chờ duyệt quá 24h, Then có nhắc/escalate — `Test: e2e`, `Assert: reminder_count >= 1, đơn không còn ở Chờ duyệt sau 48h hoặc có người duyệt thay được gán`. Sửa AC cũ mà build đang dựa = RED → 1 câu ASK gộp kèm phương án khuyến nghị.

## case 2
**Không thuộc skill này → định tuyến sang `ui-design-logic`.** Đề bài là "nhìn rối và xấu, cho đẹp và đồng bộ" = HOW-nhìn (layout, màu, component, token) — SKILL §1 ghi rõ non-trigger: "thiết kế màn, layout, 'làm đẹp' → ui-design-logic". Luật vàng §5: BA chỉ nói WHAT+WHY, không nói màn/màu/nút; nếu tôi nhận case này là sai tầng. Trước khi chuyển, tôi làm đúng phần BA có thể đóng góp: kiểm tra dashboard đã có ba-spec chưa (dashboard phục vụ USER nào — chủ shop? kế toán? — nghiệp vụ "Xem tổng quan" có Input/Output gì, success metric gì). Nếu chưa có → đó là điểm gãy: design không thể "đồng bộ" khi chưa biết màn phục vụ nghiệp vụ nào; tôi đề nghị bổ sung ba-spec ngắn (owner-user + flow Xem tổng quan + 2–3 AC hành vi) làm input cho design — nhưng chỉ khi user đồng ý, không tự mở rộng scope. Nếu ba-spec đã có → gửi thẳng user-ladder + flow sang ui-design-logic, tôi không định nghĩa UI. Lưu ý: nếu "rối" là do dashboard hiển thị sai số/sai nghiệp vụ (WHAT) thì đó mới là việc của BA hoặc ui-ux-triage (defect); tie-breaker §1: nghi ngờ WHAT hay HOW → "đẹp/đồng bộ" là HOW → design.

## case 3
Đây là **reverse handoff từ triage** (§7 + ref 04): code KHỚP spec mà hành vi vẫn sai → lỗi ở SPEC, BA **sửa spec, không sửa code, không tự triage**. Phân loại: có ca thật (đơn duyệt xong phải sinh bút toán công nợ) mà không AC nào phủ → **"Nhu cầu thiếu"**, tier GREEN/YELLOW (thêm AC/flow mới, không đụng AC cũ) → làm thẳng, không cần ASK. Hành động: quay lại B3–B6 đúng nghiệp vụ liên quan. **B3:** bổ sung cross-user handoff Chủ→Kế toán còn ngầm: điều kiện = đơn chuyển sang Đã duyệt; người nhận = Kế toán; artefact bàn giao = bút toán công nợ. **B4:** flow "Duyệt đơn" Output thêm "1 bút toán nợ được sinh"; flow "Theo dõi công nợ" (owner Kế toán) Input = bút toán đó. **B5:** nghiệp vụ CHUYÊN kế toán → Domain-Specialist làm cổng hợp-lệ (bút toán ghi gì: mã đơn, số tiền, hạn nợ, đối tượng nợ; xử lý khi đơn bị huỷ sau duyệt = bút toán đảo, không xoá). **B6 AC mới:** Given đơn Chờ duyệt, When Chủ duyệt, Then tồn tại đúng 1 bút toán công nợ tham chiếu mã đơn — `Test: integration`, `Assert: count(debt_entry where order_id==X) == 1, amount == tổng đơn`. Given đơn Đã duyệt bị huỷ, Then có bút toán đảo — `Assert: net_debt(order X) == 0`. Sau đó bump `last_verified`, ghi 1 dòng History, kích lại design/build vì hành vi đổi. Ghi Assumptions cho phần chưa rõ (thời điểm ghi nhận nợ: lúc duyệt hay lúc giao).

## case 4
**Đổi nhỏ ĐÃ RÕ (đổi text) → build thẳng, không cần BA** (SKILL §1 non-trigger, B0 sàng: REQUEST, không phải LOGIC). Không có user mới, không có nghiệp vụ mới, flow/Input/Output không đổi, chỉ đổi nhãn hiển thị của một trạng thái đã tồn tại. Tôi không mở pipeline, không spawn team, không viết ba-spec — làm vậy là over-engineer trái tinh thần "Spec nhỏ cho việc nhỏ" và anti-pattern "hỏi lặt vặt". Điều duy nhất BA nhắc để build không phá contract: (1) chỉ đổi **nhãn hiển thị**, KHÔNG đổi **tên trạng thái/enum trong ba-spec và code** (`Chờ duyệt` là trạng-thái-đặt-tên đang được AC dùng làm `Assert`, đổi tên định danh = sửa AC downstream phụ thuộc = RED); (2) nếu ba-spec có chỗ ghi nhãn hiển thị thì sửa cùng commit theo #04 doc+test sync — đây là "làm rõ wording không đổi nghĩa" = GREEN; (3) đây là pure UI tweak/text-only nên thuộc vùng miễn test theo nguyên tắc 04, nhưng nếu có test e2e đang match text "Chờ duyệt" thì test đó đổi cùng commit. Chuyển sang build; nếu người dùng thực ra muốn đổi cả NGHĨA của trạng thái (vd tách "Đang chờ" thành trạng thái mới) thì mới quay về BA vì khi đó flow đổi.

## case 5
**Từ chối làm thẳng — định tuyến ASK + gate (RED).** SKILL §1: "DB migration / schema → ASK + gate (ai-simple #06 RED)"; §8 exit gate: BA "KHÔNG viết code · KHÔNG đụng DB". Thêm bảng, đổi cột status thành enum mới, **drop cột cũ** là thay đổi không đảo ngược bằng git, ảnh hưởng dữ liệu thật và mọi AC đang dùng trạng-thái-đặt-tên của `status` làm oracle. Tôi không tự chế risk-tier — defer ai-simple #06 → dừng, **1 câu ASK gộp** kèm phương án khuyến nghị, đợi user trả lời. Phần BA làm được ngay không cần hỏi: tách WHAT khỏi HOW — "làm nghiệp vụ công nợ" là WHAT (thuộc BA: user Kế toán, flow Theo dõi/Ghi nhận thanh toán, AC), còn "bảng debt/enum/drop cột" là HOW-chạy (schema) thuộc build sau khi có ba-spec. Đúng thứ tự: (1) chốt ba-spec công nợ (B1–B6, Domain-Specialist kế toán); (2) map trạng thái cũ→enum mới phải giữ nguyên nghĩa của mọi AC hiện có, nếu đổi nghĩa = sửa AC downstream = RED; (3) migration khuyến nghị an toàn: thêm cột/bảng mới, backfill, chạy song song, chỉ drop cột cũ sau khi verify — không drop trong cùng bước. Câu ASK gộp: "Xác nhận (a) đổi enum status giữ nguyên nghĩa các trạng thái cũ, (b) drop cột cũ để bước sau có backup, (c) chốt ba-spec công nợ trước migration — đồng ý theo cả 3?"

## case 6
**B0 sàng: đây là REQUEST đã rõ, không phải nghiệp vụ mới → không mở pipeline đầy đủ.** Lọc theo trạng thái + khoảng ngày, sắp xếp mặc định mới nhất: không có user mới, không có cross-user, không đổi flow nghiệp vụ nào — chỉ là năng lực xem trên danh sách đơn đã tồn tại. Tuy nhiên nó KHÔNG phải "đổi text", nó thêm hành vi quan sát được, nên theo #04 doc+test sync tôi làm phần tối thiểu: nếu đã có ba-spec danh sách đơn thì thêm 2–3 AC hành vi vào flow "Xem danh sách đơn" **cùng commit với code** (GREEN — thêm AC mới, không đụng AC cũ), không hỏi. AC viết bằng hành vi, không từ UI: Given có đơn ở nhiều trạng thái, When lọc trạng thái = Đã duyệt, Then mọi phần tử trả về có status == Đã duyệt — `Test: integration`, `Assert: count(kết quả) == count(đơn Đã duyệt), 0 phần tử khác trạng thái`. Given lọc từ D1 đến D2, Then mọi phần tử có created_at trong [D1, D2] (bao gồm biên) — `Assert: 0 phần tử ngoài khoảng`. Given không lọc, Then phần tử đầu có created_at lớn nhất — `Assert: sorted desc == true`. Assumptions (fail-closed, không hỏi lặt vặt): "khoảng ngày" tính theo ngày tạo đơn; bao gồm cả 2 biên; lọc rỗng → trả tất cả; sắp theo thời điểm tạo, không phải thời điểm duyệt. Nếu user cho biết "khoảng ngày" phải theo ngày duyệt hay đổi nghĩa AC cũ thì mới nâng tier. Chuyển sang build; HOW-nhìn của bộ lọc (dropdown/date picker) là việc của design, BA không nói.

## case 7
Trigger đúng ("làm BA", "xuất ba-spec") → chạy 7 bước. **B0:** LOGIC. **B1 registry:** Khách hàng, Lễ tân, Hệ thống (nhắc lịch/hết hạn giữ chỗ); Assumptions: chưa có actor "người phục vụ/bác sĩ" vì đề không nêu — ghi để user bổ sung. **B2:** Khách → Đặt lịch, Huỷ/Đổi lịch của mình; Lễ tân → Xác nhận/Từ chối lịch, Xem lịch ngày; mỗi nghiệp vụ 1 owner. **B3 cross-user:** Khách→Lễ tân (lịch ở trạng thái Chờ xác nhận), Lễ tân→Khách (Đã xác nhận | Từ chối kèm lý do/đề xuất giờ khác), Hệ thống→Lễ tân (quá SLA chưa xử lý → nhắc) — không dead-end. **B4:** flow Đặt lịch: Input = định danh khách + dịch vụ + khung giờ trống; Output = lịch trạng-thái Chờ xác nhận + mã lịch. Flow Xác nhận: Input = lịch Chờ xác nhận; Output = Đã xác nhận XOR Từ chối, khách nhận thông báo. **B5:** có cross-user → spawn team `ba-flow-1`; Suggester biến thể (tự xác nhận nếu slot trống vs luôn qua lễ tân); Optimizer chấm rubric; log biến thể loại. **B6 AC (mẫu):** Given slot trống, When khách đặt, Then tồn tại lịch Chờ xác nhận — `Test: e2e`, `Assert: status == "Chờ xác nhận", count(lịch cùng slot) <= sức chứa`. Given lịch Chờ xác nhận, When lễ tân xác nhận, Then khách nhận thông báo — `Test: integration`, `Assert: notification_count == 1, status == "Đã xác nhận"`. Given lịch quá 2h chưa xử lý, Then có nhắc — `Assert: reminder_count >= 1`. Success metric: tỉ lệ lịch được xử lý trong SLA ≥ 95%. Xuất `docs/app-map/ba-spec-dat-lich.md` với frontmatter covers/last_verified/ttl_days, chạy `ba-verify.sh --staged` exit 0 mới coi là xong; TeamDelete sau khi user confirm; không viết code, không đụng DB. Một lượt hỏi gộp: SLA xác nhận, có cần cọc/không, khách được đổi lịch tới bao lâu trước giờ hẹn.
