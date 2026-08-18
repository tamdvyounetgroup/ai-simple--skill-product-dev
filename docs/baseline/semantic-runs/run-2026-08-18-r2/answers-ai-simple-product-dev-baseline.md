## case 0
Đây đúng scope skill `ai-simple-product-dev` (dựng project mới với AI). Làm theo Bước 0 — chọn profile: app quản lý kho Next.js + Supabase là project nghiêm túc, chạm auth và dữ liệu (Supabase/RLS) → **profile core (NT01–07) + bật NT14 security** (vì có auth/migration/dependency ngoài); chưa cần scale/parallel cho tới khi `doctor` báo trigger.

Việc cụ thể (đều GREEN — tạo file/doc, git undo được, không hỏi):
1. `npx ai-simple init --profile core` → cài CLAUDE.md gốc mỏng (< 6K token, chỉ link xuống module — NT01), router `/fl` (NT03), pre-commit hook (NT08: covers-sync, secret-scan, encoding, budget), template commands.
2. Dựng **app-map** đánh số theo domain (NT02): 01-kho, 02-phiếu nhập/xuất, 03-tồn kho…; app-map là doc canonical, code feature-sliced theo rule ở `08`. Đây là thứ chống "bịa" — AI đọc map trước khi đụng code.
3. Khai báo risk tier trong CLAUDE.md (NT06): GREEN đi thẳng, YELLOW tự làm + default an toàn + `## Assumptions`, RED (DROP table, nới RLS, mutate prod) mới confirm đúng 1 câu.
4. Doc + test sync (NT04): behavior change ↔ test, documented change ↔ doc, cùng commit.
5. Với Supabase: secret-scan trong hook chặn key hardcode; production data là **L2 — mặc định CẤM**, làm trên project staging/synthetic.

Sau khi init, chạy `npx ai-simple doctor` để kiểm tra setup và xem gợi ý profile kế tiếp. Nếu bạn muốn AI phân tích nghiệp vụ kho trước khi code, phần đó thuộc `ba-flow-logic`, không phải skill này.

## case 1
Triệu chứng "bịa tên hàm / đọc nhầm file / mỗi phiên hỏi lại" là đúng trigger của skill này (retrofit docs + onboard agent vào repo có sẵn). 300 file, không hỏi thêm — chẩn đoán theo 3 nguyên tắc:

- **Bịa tên hàm** = thiếu app-map (NT02). AI không có doc canonical chỉ "domain X nằm ở đâu, export gì" nên đoán. Việc: dựng `docs/app-map/` đánh số theo domain, coupling doc↔code (NT12 vòng A: coupling map + 2 cổng doc-status/conflict để phát hiện lệch).
- **Đọc nhầm file** = thiếu context routing (NT03). Cài `/fl` + router: deterministic (glob/keyword → file) trước, LLM fallback sau; đầu ra là danh sách CHÍNH XÁC file .md cần đọc trước khi code.
- **Mỗi phiên hỏi lại** = thiếu hierarchical context + memory (NT01, NT07). Root CLAUDE.md < 6K token, link xuống CLAUDE.md từng module; preference explicit của user ghi vào memory (fast-path vòng B), không lặp lại hỏi.

Profile: 300 file → **core**; nếu app-map vượt 20 file hoặc root chạm 6K → `doctor` sẽ đề xuất **scale** (NT08 hook enforce, NT09 `_generated/` máy sinh "cái gì", người viết "tại sao").

Risk tier: retrofit docs/CLAUDE.md/router là GREEN (reversible bằng git) → làm thẳng. Thứ tự làm: `npx ai-simple init` (không đè file có sẵn) → viết app-map từ cấu trúc thư mục thật (đọc code trước, không suy đoán) → chạy `doctor`. Không viết lại code; chỉ thêm lớp context.

## case 2
Câu này thuộc skill này (NT06 Risk Tiers + AUTHORITY CONTRACT). Trả lời thẳng: **được, và đó chính là mặc định của hệ — nhưng không phải "tự làm hết".**

Nguyên tắc 06: GREEN (undo được bằng git: code/doc/test/config) và YELLOW (đổi hành vi nhưng có default an toàn) → AI **tự làm, không hỏi**; YELLOW chỉ thêm `## Assumptions` ghi lại giả định. Chỉ RED (không quay đầu: DROP table, mutate dữ liệu prod, nới RLS, xoá branch) mới dừng, và cũng chỉ **đúng 1 câu confirm gộp** kèm phương án khuyến nghị — không hỏi từng việc nhỏ. Confirm là ngoại lệ đắt giá, không phải nghi thức. Nếu AI đang hỏi từng việc nhỏ thì CLAUDE.md của bạn chưa khai báo tier — thêm bảng GREEN/YELLOW/RED (`init` có sẵn template) là hết.

Nhưng có 2 trục AI **không được** tự cấp cho mình dù bạn nói "tự làm hết":
- **Authority contract** (độc lập với risk tier): L1 (gửi tin, cài dep/tool ngoài, publish, deploy) và L2 (dữ liệu production) cần bạn cho phép tường minh cho từng việc; L3 (`rm -rf`, rewrite history) phải resolve target → kiểm owner → backup → confirm. "User từng đồng ý lần trước" không phải quyền, và AI cấm tự set env/file consent để mở khoá.
- **Hard safety rules**: không stash/reset/checkout đè dirty work của bạn.

Tóm lại: giảm hỏi = khai tier rõ; phần còn lại hỏi ít nhưng đúng chỗ.

## case 3
Đúng trigger "hai phiên AI giẫm nhau" → NT13 Git-Native Parallel Sessions, profile **parallel** (bật thêm khi ≥ 2 session thường trực). Trước hết, việc bảo vệ Git state hiện hữu là bước 7 của workflow, áp cho **mọi** profile: đọc đủ branch/HEAD/status/dirty/untracked/worktrees trước khi sửa; cấm stash/reset/checkout đè dirty của phiên khác — đây thường là lý do "merge xong mất thay đổi".

Cách chạy song song đúng (guard NT13, ADVISORY nhưng bắt buộc về hành vi):
1. Đọc `methodology/13`, chạy `ai-simple parallel plan` để chia **lot MECE theo entity** (mỗi lot = tập file/domain không giao nhau). Không đủ 2 lot độc lập → quay về single-session, không cố ép.
2. Admission gate: mỗi phiên **claim lot qua CLI** `ai-simple parallel claim/extend` (có lease). CẤM tự tạo/sửa claim JSON tay trong `GIT_COMMON_DIR` — state rác đầu độc orchestrator.
3. **Worktree per lot**, mỗi phiên làm trên branch riêng, không đụng working tree của nhau.
4. Tích hợp qua **integration branch + merge queue tuần tự**, không merge chéo trực tiếp vào main.
5. Không silent takeover claim/lot/branch của session khác — chạy recovery checklist trước.

Risk tier: tạo worktree/branch là L0 + GREEN; xoá branch/worktree của phiên khác là L3 → resolve owner + confirm. Với thay đổi đã "mất": kiểm `git reflog` trước khi làm gì khác — history còn thì phục hồi được, và làm việc này trước khi bật song song lại.

## case 4
Thuộc scope skill này ("docs lệch code", "docs nghi ngờ cũ"). Trả lời ngắn: **không xoá hết viết lại** — đó là quyết định RED-ish về mặt thông tin (mất "tại sao" mà không doc mới nào tái tạo được) và không có bằng chứng docs sai. Hệ này làm ngược lại: đo trước, sửa theo bằng chứng.

Đường đi theo NT12 vòng A + NT03 cổng doc-status:
1. Chạy `/audit` (chấm project theo 15 nguyên tắc theo applicability) → ra bảng doc nào còn coupling với code, doc nào mồ côi, backlog xếp hạng.
2. Gắn **doc-status** cho từng doc (canonical / stale / deprecated) — cổng doc-status của router sẽ chặn AI đọc doc stale làm nguồn sự thật, cổng conflict báo khi doc và code mâu thuẫn.
3. Chỉ viết lại doc nào audit chỉ ra lệch; giữ nguyên doc còn đúng. Áp NT09: phần "cái gì" (API list, cấu trúc, schema) để máy sinh vào `_generated/` — không bao giờ mục nữa; người chỉ viết "tại sao" (ADR).
4. Ràng buộc để không tái diễn: NT04 doc + test sync cùng commit, hook covers-sync ở pre-commit (NT08).

Risk tier: gắn status/viết lại doc là GREEN → làm thẳng; xoá hàng loạt là hành động không cần thiết và tự cắt thông tin — nếu vẫn muốn, đó là 1 câu confirm gộp và tôi khuyến nghị "không". Định kỳ: audit mỗi quý (bảng bảo trì NT12 v2).

## case 5
**Không thuộc skill này.** Description của `ai-simple-product-dev` ghi rõ KHÔNG: phân tích nghiệp vụ. Bảng routing zero-command: "nhu cầu/tính năng mới còn mơ hồ, phân tích nghiệp vụ" → **`ba-flow-logic`**. Tôi định tuyến sang đó, không tự làm BA ở đây, không bắt bạn gõ lệnh — nói tự nhiên là đủ, skill kia tự kích hoạt.

Những gì bạn nêu (ai làm gì, flow, acceptance) khớp đúng đầu ra của ba-flow-logic: actor/role, luồng chính + luồng ngoại lệ (từ chối, trả về cấp dưới, timeout, uỷ quyền), ma trận trạng thái đơn, acceptance criteria kiểm được. Điểm móc hai chiều nằm ở `references/*-integration*.md` của skill đó — nguồn sự thật duy nhất, tôi không lặp lại.

Phần skill này **vẫn** đóng góp sau khi BA xong, để bạn biết trước:
- Kết quả BA (ba-spec/AC) sẽ trở thành "định nghĩa duy nhất của được yêu cầu tường minh" (NT15) — lúc build, AI không được cắt bớt bằng lý do YAGNI.
- Spec đó vào app-map đúng domain (NT02), có doc-status, và ràng buộc doc+test sync (NT04).
- Duyệt nhiều cấp thường chạm quyền/role → khi code, ma trận trạng thái (chưa login/role/trống/lỗi) là guardrail không cắt; nếu chạm RLS/auth thì bật NT14 và `security-logic` review.
- Hành vi nào BA chưa chốt mà lúc build gặp → handoff ngược BA, cấm im lặng.

Vậy: bước kế tiếp là ba-flow-logic; khi có spec quay lại đây để route context và build.

## case 6
**Không thuộc skill này.** Đây là defect trên app đang chạy ("màn này sai/lệch, app thật lỗi") — description ghi rõ KHÔNG: defect app đang chạy; bảng routing chỉ sang **`ui-ux-triage`**. Tôi định tuyến sang đó, không debug ở đây. Nếu sau khi triage phát hiện lỗi nằm ở logic nghiệp vụ (ví dụ định nghĩa "tháng" theo múi giờ hay theo ngày chốt) thì ui-ux-triage có đường handoff BA; nếu là HOW-nhìn (empty state hiển thị sai) thì sang `ui-design-logic`.

Thứ skill này giữ vai trò khi bạn sửa lỗi này:
- **Route context trước khi sửa** (NT03): `/fl "dashboard lọc theo tháng bảng trống"` → danh sách file .md cần đọc (app-map domain báo cáo, module CLAUDE.md), tránh AI đọc nhầm file lần nữa.
- **LOGIC vs REQUEST** (NT05): câu của bạn hiện là mô tả triệu chứng — tôi coi là REQUEST sửa, nhưng nếu chỉ muốn biết nguyên nhân thì nói rõ, AI sẽ không commit.
- **Risk tier**: sửa gốc trong code + thêm test tái hiện là GREEN. Sửa bug = sửa gốc: grep mọi nơi gọi hàm lọc, đặt guard ở hàm dùng chung (NT15 điều 3), không vá từng caller. Bug "bảng trống dù có dữ liệu" gợi ý thiếu ma trận trạng thái trống/đang tải/lỗi — guardrail không được cắt.
- **NT04**: fix behavior ↔ test cùng commit; nếu doc app-map mô tả bộ lọc thì cập nhật cùng.
- **Authority**: tái hiện trên staging/dữ liệu synthetic; đọc dữ liệu production để debug là L2 → cần bạn nêu target và cho phép lần đó.
