# Trả lời bộ đề ui-ux-triage (bản B)

## case 0

Đây đúng trigger triage (screenshot + câu than ngắn), nhưng "nhìn sai sai" chưa phải defect — tôi triage trước, không sửa gì.

Trình tự: (1) chạy `bash <skill-dir>/triage-verify.sh`, exit 0 mới được spawn team; mở phiên `--session-audit` lấy `<id>` để cuối phiên `--close <id>` (exit gate §9 đòi đủ 2 pha, có record `test-reports/triage/audit-<stamp>.txt`, không tự tick). (2) Auto-discover ref theo §2: app-map, ba-spec/design-spec, test cmd, E2E harness — không hardcode. (3) `TeamCreate ui-triage-<n>`: Lead ra test plan (màn danh sách đơn × từng vai trò trong account-matrix × đúng viewport thiết bị thật, hành trình đầy đủ chứ không soi một màn cô lập); Tester tái dùng helper E2E của repo, bấm UI thật, chụp mọi bước vào `test-reports/triage/<iter>/`.

Observer mới là người phán, và phán bằng oracle (§3): lệch AC/invariant trong ba-spec → LOGIC/FLOW; lệch screen map/state matrix/token trong design-spec → DESIGN; sai thuật ngữ/copy → TEXT. Cấm kết luận "xấu/không đồng bộ" theo cảm tính. Repo chưa có spec → vẫn chạy nhưng mọi finding gắn `[no-oracle, confidence thấp]`.

Có defect thật mới sang Fixer; nếu ảnh chỉ cho thấy khác ý user mà code khớp spec thì đó là spec sai → §4c handoff, không fix.

## case 1

Sửa được, nhưng KHÔNG bằng cách bạn nói. Luật §4.4 cấm tuyệt đối `git reset`, `git checkout --`, `git stash`, `git restore` trên working tree — chúng phục hồi cả file theo HEAD, nên sẽ nuốt luôn phần dirty bạn đang có sẵn ngoài 3 file kia (NT13/ADR-001). Rollback hợp lệ chỉ có một đường: reverse đúng patch do chính loop tạo.

Cụ thể: trước khi apply, Fixer bắt buộc đã lưu `git diff > <patch-của-loop>`. Typecheck fail → `git apply -R <patch-của-loop>`, rồi báo Lead + escalate theo §5 bước 6. Reverse xong chạy lại test cmd và capture exit code thật, không tuyên "chắc pass".

Nếu loop này lỡ không lưu patch trước khi apply thì đó đã là vi phạm quy trình, và tôi vẫn không được dùng lệnh cấm để chữa: tôi sẽ dựng patch nghịch từ đúng phạm vi mình đã chạm (3 file đó, theo hunk mình tạo), cho bạn xem diff trước khi áp, và ghi lại sự cố. Cũng lưu ý hai điều kèm theo: không `git commit` trong mọi trường hợp (gate ai-simple #08), và fail typecheck là tín hiệu quay lại vòng lặp — Lead brief lại Fixer với request hẹp hơn rồi Tester rerun từ bước hỏng, chứ không đi đường vòng.

## case 2

Tôi làm nửa đầu, dừng ở nửa sau: "cứ sửa cho khỏi trừ kho" là fix trước khi triage, mà chính bạn cũng đang nói "không rõ đúng hay sai" — sửa lúc này là đoán.

Việc đúng: Observer đối chiếu oracle. "Đơn ở trạng thái Chờ duyệt có trừ kho không" là câu hỏi HÀNH VI → oracle là ba-spec, cụ thể mục Rules/Invariants và AC (Given/When/Then) của luồng duyệt đơn, phụ trợ là flow trong app-map.

Ba nhánh:
- ba-spec ghi "Chờ duyệt KHÔNG trừ kho" → đây là defect LOGIC, severity cao (sai tồn kho là mất dữ liệu nghiệp vụ), ghi rõ `oracle vi phạm (spec:dòng)` + suspected file:line, rồi Fixer sửa gốc, Tester rerun regression.
- ba-spec ghi "trừ kho ngay khi tạo đơn" (giữ chỗ tồn) → code KHỚP spec, cấm fix. §4c: ghi một dòng `HANDOFF | to=BA | spec=... | ca=spec-sai|nhu-cầu-thiếu | bằng-chứng=... | đề-xuất=...` vào triage-log rồi exit. BA quyết, không phải triage.
- ba-spec im lặng về trạng thái này → `[no-oracle]`, gộp thành ASK cho bạn (telegram nếu consent hội đủ, không thì PENDING-ASK trong report) và pause.

Kèm ràng buộc: mọi kiểm chứng chạy trên env/DB test cô lập, cấm đụng DB production để "xem thử tồn kho".

## case 3

Ý định của bạn thì rõ, nhưng consent mà máy đọc thì chưa đủ, nên mặc định vẫn là degrade (§8, v1.11.0).

Hai điểm cần đính chính: (1) script telegram mà skill dùng nằm ở tầng user `~/.ai-simple/notify-telegram.sh`, không phải script trong repo — script repo không thay thế được nguồn này; (2) "có script" ≠ "đã consent". `consent_resolve` hợp nhất tri-state từ 3 nguồn: `~/.ai-simple/config` (NOTIFY=) hoặc env `AI_SIMPLE_NOTIFY` là nguồn ngoài-repo do chính bạn đặt, còn `.claude/triage.config` chỉ được thu hẹp — `NOTIFY=off` trong repo phủ quyết mọi override. Bật được đòi ≥1 nguồn ngoài-repo = on và không nguồn nào off.

Và tôi bị cấm tự bật hộ: cấm set env `AI_SIMPLE_NOTIFY`, cấm ghi `~/.ai-simple/config`, cấm tự thêm dòng token `# user-consent: notify-on` ([ADVISORY], cùng hạng luật cấm stash). Consent nằm ở hành vi user, vì máy không phân biệt được ai đã ghi.

Nên: bạn tự đặt `NOTIFY=on` trong `~/.ai-simple/config` (bền qua verify-time) rồi báo tôi. Trong lúc chưa có, triage vẫn chạy bình thường, kết quả ghi `test-reports/triage/report-<date>.txt`, câu hỏi treo vào mục PENDING-ASK, và dòng triage-log ghi đúng `telegram=off` hoặc `degraded` — cấm ghi `ok`. Khi gửi thật thì redact SĐT/email/token/PII, ≤2 ảnh.

## case 4

Chạy được, nhưng có một câu phải hỏi trước và vài luật không thương lượng.

Câu hỏi: "staging" của repo này là env/DB test cô lập, hay staging đang dùng dữ liệu thật/đang phục vụ người dùng? Mặc định của §4.2 luật 3 là env/DB test cô lập + synthetic identity. Nếu staging chạm dữ liệu thật thì đó là AUTHORITY L2: mặc định CẤM, chỉ làm khi bạn nêu đúng target và cấp quyền cho riêng lần này — "có đường cleanup đã verify" là điều kiện cần chứ không phải giấy phép. DB production thì cấm tuyệt đối, không có ngoại lệ.

Cách chạy: Tester tái dùng E2E harness của repo (helper auth/create-family/join/approve, account-matrix theo vai, dual-context) chứ không tự viết selector rời. Vài tài khoản test phải sinh ra bằng cách bấm UI thật từ màn ĐĂNG KÝ — cấm insert thẳng DB hay gọi API tắt, vì chính "nút đăng ký có ăn không" mới là thứ đang kiểm. Ngoại lệ seed chỉ khi tiền-điều-kiện không có helper UI và không phải thứ feedback nhắm tới.

Kèm theo: đúng viewport thiết bị thật (app mobile → profile iOS/Android), chụp mọi bước, mọi entity tạo ra ghi vào test-data tracker + biết đường `cleanup` trước production, action irreversible thì STOP chờ Lead. Repo không có harness → degrade thủ công + cờ `[no-harness]`.

## case 5

Cái này tôi không nhận — nó nằm ngoài trigger của ui-ux-triage.

"Thêm tính năng xuất báo cáo doanh thu theo tháng cho chủ shop" là NHU CẦU MỚI: chưa có code đang chạy để test, chưa có AC để đối chiếu, nên không có gì cho vòng test → quan sát → phân loại → fix. Skill này là pha VẬN HÀNH, và oracle của nó (ba-spec, design-spec) đến từ pha trên; ở đây oracle chưa tồn tại. Nếu tôi cứ làm, tôi sẽ vừa tự bịa acceptance criteria vừa tự chấm mình đúng — đúng kiểu "Observer phán cảm tính" mà §10 cấm.

Đường đi đúng theo §0/§11: chuyển sang **ba-flow-logic**. BA làm JTBD (chủ shop cần con số gì, để ra quyết định gì), scope, flow Input/Output, Rules/Invariants (doanh thu tính theo đơn hoàn tất hay đã thanh toán, xử lý hoàn/huỷ, múi giờ chốt tháng), quyền xem theo vai, rồi sinh ba-spec vào app-map. Sau đó ui-design-logic dựng design-spec cho màn báo cáo (screen map, state matrix: trống/đang tải/lỗi/dữ liệu cực đoan), rồi mới build.

Lúc tính năng đã chạy mà bạn thấy "số nhìn sai sai" hay nút xuất không ăn — quay lại tôi, khi đó đã có ba-spec/design-spec làm oracle và triage mới có nghĩa.

## case 6

Cũng không phải việc của tôi — đây là non-trigger tường minh của §1: "thiết kế màn mới, redesign, làm đẹp từ đầu" → **ui-design-logic**.

Phân ranh cho rõ, vì hai skill dễ đụng ở chữ "màn cài đặt nhìn không đồng bộ": nếu bạn báo một chỗ cụ thể lệch so với design-spec đang có (token sai, thiếu state, spacing lệch) thì đó là defect DESIGN và tôi triage được. Còn "thiết kế lại TOÀN BỘ cho hiện đại và đồng bộ design system hơn" là tạo ra oracle mới, không phải đối chiếu oracle cũ. Tôi mà nhận thì tôi đang tự định nghĩa "đúng là gì" — thứ §7 ghi rõ thuộc sở hữu ui-design-logic, triage chỉ đọc.

Thêm nữa: redesign toàn màn không có "bước hành trình hỏng" để Tester bấm lại, không có diff thực-tế-vs-spec để Observer chấm, và Fixer thì bị ràng "minimal diff" — sai công cụ cho việc này.

Đường đi: ui-design-logic dựng lại design-spec cho màn cài đặt (screen map, state matrix, density budget, component decision, token), có gì đụng hành vi/nghiệp vụ thì nó handoff ngược BA. Build xong, bạn gọi tôi chạy triage: lúc đó tôi có design-spec mới làm oracle, test đủ vai trò + viewport và bắt phần build lệch bản thiết kế.
