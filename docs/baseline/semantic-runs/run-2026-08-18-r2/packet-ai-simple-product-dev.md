# Gói chấm MÙ — skill ai-simple-product-dev (vòng 2)

## RUBRIC

## case 0
# rubric cho ai-simple-product-dev id=0 (bootstrap-new-project)
Kích foundation skill. Bắt đầu NHỎ NHẤT: chọn profile theo quy mô (repo mới, ít file → tiny/core, KHÔNG bật cả 15 nguyên tắc). Cài lớp máy qua `npx ai-simple init --stack supabase`: CLAUDE.md phân tầng, app-map có covers/last_verified/ttl_days, pre-commit hook (covers-sync, secret-scan, encoding, budget), doc-health. Giải thích trục: Git giữ sự thật, ai-simple quản context/ý định/invariant/quyền ghi. Nêu trigger scale-up để bật thêm lớp sau, không ép dùng hết ngay. KHÔNG tự viết code tính năng — đây là operating layer.

## case 1
# rubric cho ai-simple-product-dev id=1 (ai-hallucinates-context)
Chẩn đoán theo nguyên tắc 01/02/03: thiếu hierarchical context + app-map + context routing. Việc cần làm: CLAUDE.md gốc ngắn (<6k token) trỏ xuống module CLAUDE.md; app-map mô tả từng vùng code kèm covers: để biết đọc gì cho task nào; router (/fl) chọn đúng tập file trước khi code. Kèm cổng máy chống mục: covers-sync trong pre-commit (code đổi trong vùng covers → doc phải đổi/bump last_verified cùng commit) + doc-health TTL. Nêu đây là vấn đề CẤU TRÚC CONTEXT, không phải đổi model.

## case 2
# rubric cho ai-simple-product-dev id=2 (risk-tier-and-authority)
Áp nguyên tắc 06 risk tier: GREEN (đảo ngược bằng git: code/doc/test) → đi thẳng không hỏi; YELLOW (đảo ngược có chủ đích: bảng mới, cột nullable, cron chưa bật) → tự làm phương án an toàn nhất + ghi Assumptions, không hỏi trước; RED (mất data, RLS bảng đang phục vụ user, mutate prod, breaking change liên repo) → dừng, hỏi ĐÚNG 1 câu gộp. Nhấn thêm trục AUTHORITY độc lập với risk: reversible ≠ authorized — gửi tin/publish/deploy cần user cấp quyền tường minh dù dễ undo. Kết luận: giảm hỏi vặt bằng phân tầng, KHÔNG bằng 'cho tự làm hết'.

## case 3
# rubric cho ai-simple-product-dev id=3 (parallel-sessions-conflict)
Nguyên tắc 13 (Git-native parallel sessions): chia MECE lots, mỗi lot claim write_paths có lease, làm trên worktree/branch riêng, merge queue. Cổng máy: claim gate trong pre-commit chặn commit đụng path đã claim bởi branch khác. Kèm luật bảo vệ dirty của user: loop CẤM git reset/checkout --/stash/restore, revert chỉ qua patch-file của chính mình. Nêu công cụ có sẵn: `ai-simple parallel` + registry claim, không tự chế cơ chế khoá mới.

## case 4
# rubric cho ai-simple-product-dev id=4 (docs-rot-audit)
KHÔNG xoá hết viết lại. Chạy /audit chấm theo applicability (profile chưa bật = NOT_APPLICABLE, không trừ oan) + doc-health đọc last_verified/ttl_days để phân loại doc FRESH/SUSPECT/STALE. Doc SUSPECT → verify-on-use: lần tới ai chạm vùng đó thì đối chiếu rồi bump last_verified kèm commit message re-verify(<doc>): <đã check gì>. Doc không ai chạm 6 tháng → có thể chính nó không load-bearing, cân nhắc gộp/bỏ. Nêu nguyên tắc 12: hệ tự tối ưu theo bằng chứng (diff được chấp nhận), không đại tu theo cảm giác.

## case 5
# rubric cho ai-simple-product-dev id=5 (not-trigger-ba-analysis)
KHÔNG kích foundation skill. Đây là pha PHÂN TÍCH NGHIỆP VỤ → ba-flow-logic (user registry, user×nghiệp vụ, cross-user handoff, flow Input/Output, AC). Foundation chỉ lo operating layer (context/quyền ghi/verify/risk tier), không sinh ba-spec.

## case 6
# rubric cho ai-simple-product-dev id=6 (not-trigger-live-defect)
KHÔNG kích foundation skill. Đây là defect trên app đang chạy → ui-ux-triage (reproduce → phân loại theo oracle → fix qua cổng). Foundation chỉ vào nếu vấn đề là thiếu lớp vận hành (không có app-map/oracle để triage đối chiếu), và khi đó cũng chỉ bổ sung lớp đó chứ không tự sửa defect.

# ===== BẢN A =====
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

# ===== BẢN B =====
## case 0
Với repo mới, việc quan trọng nhất là dựng "bộ nhớ ngoài" cho AI ngay từ đầu, trước khi viết dòng code nào. Tôi khuyên làm theo thứ tự:

1. **Tạo file hướng dẫn gốc** (CLAUDE.md, AGENTS.md hoặc .cursorrules tuỳ công cụ) ở root: mô tả stack (Next.js App Router, Supabase, TypeScript), cấu trúc thư mục dự kiến, quy ước đặt tên, cách chạy test/lint, và các điều cấm (không hardcode key, không dùng service role ở client). Giữ ngắn, dưới 1–2 trang.
2. **Scaffold cấu trúc thư mục rõ ràng** rồi ghi vào file hướng dẫn: `app/`, `components/`, `lib/supabase/`, `db/migrations/`. AI lạc chủ yếu vì không biết "thứ này nên nằm ở đâu".
3. **Định nghĩa schema DB trước** bằng migration SQL và sinh type từ Supabase (`supabase gen types`). Type là rào chắn hiệu quả nhất chống bịa: AI bịa cột thì TypeScript báo ngay.
4. **Bật lint + typecheck + test chạy trong pre-commit** (husky/lint-staged). Máy kiểm chứ đừng tin AI tự nói "đã test".
5. **Mỗi tính năng: viết spec ngắn trước** (mục tiêu, màn hình, dữ liệu, tiêu chí chấp nhận) trong `docs/`, rồi mới bảo AI code theo spec.
6. Kết thúc mỗi phiên, yêu cầu AI cập nhật file hướng dẫn nếu quy ước thay đổi.

Nguyên tắc chung: những gì AI cần biết phải nằm trong repo, ở dạng máy đọc được, và được kiểm bằng công cụ, không dựa vào lời AI.

## case 1
Ba triệu chứng này có cùng gốc: AI đang phải đoán vì không có bản đồ repo và không được ép kiểm chứng. Cách xử lý:

**Chống bịa tên hàm**: yêu cầu AI luôn grep/đọc file trước khi gọi hàm, và ghi rõ luật đó vào file hướng dẫn ("trước khi dùng hàm/type nào, phải mở file định nghĩa"). Bật typecheck nghiêm (`tsc --noEmit`, `strict: true`) và chạy sau mỗi thay đổi; hàm bịa sẽ lộ ngay. Nếu ngôn ngữ động, thêm linter bắt tên chưa định nghĩa.

**Chống đọc nhầm file**: với ~300 file, viết một file bản đồ (`docs/app-map.md` hoặc phần "Cấu trúc" trong CLAUDE.md) liệt kê module chính, file vào của mỗi luồng, và những file dễ nhầm tên nhau. Đặt tên file phân biệt rõ, tránh nhiều `utils.ts`, `index.ts` giống nhau. Nếu công cụ hỗ trợ, thêm CLAUDE.md con ở từng thư mục lớn.

**Chống hỏi lại từ đầu mỗi phiên**: dồn các quyết định đã chốt vào repo, không để trong chat. Cụ thể: file hướng dẫn gốc, thư mục `docs/adr/` cho các quyết định kiến trúc, và mục "trạng thái hiện tại / việc đang dở" cập nhật cuối mỗi phiên. Bắt đầu phiên mới bằng câu "đọc CLAUDE.md và docs/app-map.md trước".

Sau 1–2 tuần, xem log xem AI còn hỏi gì lặp lại thì bổ sung đúng thứ đó vào docs. Đừng cố viết đủ từ đầu.

## case 2
Hiểu cảm giác đó, nhưng "tự làm hết" thường đổi mệt vì hỏi thành mệt vì dọn hậu quả. Cách hợp lý là phân loại theo mức rủi ro thay vì bật/tắt toàn bộ:

- **Việc đảo ngược được bằng git** (sửa code, test, doc, refactor trong nhánh): cho AI đi thẳng, không hỏi. Đây là đa số việc và là nơi hỏi xác nhận gây phiền vô ích.
- **Việc đổi hành vi nhìn thấy được với người dùng hoặc đội** (đổi API công khai, đổi schema DB có migration, đổi config CI): cho AI tự làm nhưng phải để lại ghi chú "giả định" và test kèm, bạn review sau.
- **Việc không hoàn tác được** (xoá dữ liệu, chạy migration lên production, push force, gửi mail, thanh toán, đổi secret): bắt buộc hỏi, gộp thành một câu xác nhận duy nhất thay vì hỏi từng bước.

Cách thực hiện: ghi phân loại này vào file hướng dẫn cho AI (CLAUDE.md/AGENTS.md), đồng thời điều chỉnh permission của công cụ: allowlist các lệnh an toàn (lint, test, git status/diff/commit), giữ prompt cho lệnh phá huỷ. Kèm theo đó là lưới an toàn để bạn yên tâm buông tay: làm việc trên nhánh riêng, pre-commit chạy test, và review diff trước khi merge.

Kết quả thường thấy: số lần hỏi giảm 80–90% mà bạn vẫn giữ quyền với 10% việc thật sự nguy hiểm.

## case 3
Đây là bài toán điều phối, không phải bài toán AI. Hai phiên cùng sửa một working tree thì chắc chắn đè nhau. Sửa theo ba lớp:

1. **Tách không gian làm việc**: mỗi phiên AI làm trên một `git worktree` riêng (`git worktree add ../repo-feat-a feat/a`) hoặc ít nhất một nhánh riêng, không bao giờ hai phiên cùng checkout một thư mục. Đây là bước quan trọng nhất.
2. **Tách phạm vi file**: trước khi giao việc, chia rõ phiên A đụng thư mục/module nào, phiên B đụng gì. Ghi phạm vi này vào prompt của từng phiên và bảo chúng không sửa ngoài phạm vi; nếu bắt buộc phải sửa file dùng chung (types, config, schema), dừng và báo lại thay vì tự sửa.
3. **Merge có kiểm soát**: merge từng nhánh vào main tuần tự, chạy test sau mỗi lần merge. Nếu có conflict, để người hoặc một phiên duy nhất giải quyết, không để cả hai cùng "sửa cho hết conflict". Kiểm tra `git log -p` xem thay đổi có bị mất không trước khi xoá nhánh.

Nguyên nhân "merge xong mất thay đổi" thường là một phiên đã `git checkout -- file` hoặc `reset --hard` để "làm sạch", đè lên việc của phiên kia. Hãy cấm tường minh các lệnh đó trong hướng dẫn cho AI, và cho AI commit nhỏ, thường xuyên để mọi thứ đều truy được trong reflog.

Nếu việc song song là thường xuyên, cân nhắc thêm một file khoá đơn giản hoặc quy ước "một phiên một module".

## case 4
Không nên xoá hết viết lại. Xoá sạch làm mất cả phần vẫn đúng lẫn lý do đằng sau các quyết định cũ, còn viết lại từ đầu thì cũng sẽ mục sau 6 tháng nữa vì gốc rễ (không có cơ chế giữ docs đúng) chưa được xử lý.

Cách tôi đề xuất:

1. **Phân loại nhanh** từng file: (a) mô tả thứ code đang làm và có thể kiểm bằng cách đọc code hoặc chạy lệnh; (b) quyết định/lý do (ADR, why); (c) hướng dẫn thao tác (setup, deploy). Loại (b) hiếm khi sai vì là lịch sử; loại (a) và (c) mới hay mục.
2. **Kiểm bằng máy đến mức có thể**: link chết, lệnh trong docs chạy còn được không, tên file/hàm được nhắc còn tồn tại không (grep). Việc này AI làm tốt và nhanh.
3. **Đánh dấu thay vì xoá**: file nào chưa kiểm được thì thêm dòng đầu "Chưa xác nhận từ 2026-02, đọc với sự dè dặt". File nào chắc sai thì sửa hoặc chuyển vào `docs/archive/`.
4. **Giảm số docs load-bearing**: chỉ giữ một số ít file mà người/AI thật sự phải đọc trước khi làm việc (hướng dẫn gốc, bản đồ repo, cách chạy). Những file này phải có chủ và có ngày cập nhật.
5. **Cài cơ chế chống mục**: quy ước "đổi hành vi thì sửa docs cùng commit", và một kiểm tra định kỳ (mỗi quý) chạy lại bước 2.

Docs mục vì không có vòng bảo trì, không phải vì viết dở.

## case 5
Tôi sẽ đi theo bốn phần: vai trò, luồng, ngoại lệ, và tiêu chí chấp nhận. Vì chưa có chi tiết nghiệp vụ của bạn, phần dưới là khung để bạn điền và các câu hỏi cần trả lời trước.

**Vai trò**: Người tạo đơn (nộp, sửa khi bị trả về, huỷ trước khi duyệt xong); Người duyệt các cấp (duyệt, từ chối kèm lý do, trả về để bổ sung); Người quản trị (cấu hình chuỗi duyệt, uỷ quyền, xem toàn bộ). Cần chốt: chuỗi duyệt cố định theo loại đơn hay theo điều kiện (giá trị, phòng ban)?

**Luồng chính**: Nháp → Đã nộp → Chờ duyệt cấp 1 → ... → Chờ duyệt cấp N → Đã duyệt. Mỗi bước ghi log ai, lúc nào, quyết định gì. Từ chối ở bất kỳ cấp nào → Bị từ chối (kết thúc) hoặc Trả về (quay về người tạo, nộp lại thì bắt đầu từ cấp 1 hay từ cấp đã trả?).

**Ngoại lệ phải hỏi bạn**: người duyệt vắng mặt (uỷ quyền, hết hạn tự leo cấp?); người duyệt trùng người tạo; đơn bị sửa sau khi đã có cấp duyệt (huỷ các duyệt trước?); song song hay tuần tự trong cùng cấp; thu hồi đơn giữa chừng.

**Tiêu chí chấp nhận mẫu** (viết dạng Given/When/Then): đơn ở cấp 2 thì cấp 1 không thể duyệt lại; từ chối bắt buộc có lý do; người tạo thấy đúng trạng thái và người đang giữ đơn; mọi thay đổi trạng thái có trong lịch sử; người không thuộc chuỗi không thấy nút duyệt.

Bạn trả lời các câu hỏi ngoại lệ, tôi sẽ viết thành spec đầy đủ kèm bảng ma trận trạng thái × vai trò.

## case 6
Triệu chứng "có dữ liệu nhưng lọc theo tháng ra trống" gần như luôn nằm ở một trong bốn chỗ. Tôi sẽ đi lần lượt để khoanh vùng thay vì đoán:

1. **Xem query thực tế được gửi đi**: mở Network tab (hoặc log server) khi bấm lọc, xem tham số tháng có đúng không. Lỗi thường gặp: tháng gửi dạng 0-based từ JS (`getMonth()` trả 0–11) trong khi backend/SQL hiểu 1–12; hoặc gửi cả `from/to` nhưng `to` bằng đầu tháng thay vì cuối tháng nên khoảng rỗng.
2. **Múi giờ**: dữ liệu lưu UTC, người dùng ở UTC+7, ngày cuối tháng bị lệch sang tháng sau hoặc ngược lại. Kiểm bằng cách so `created_at` thô của vài dòng với điều kiện lọc.
3. **So sánh sai kiểu**: cột dạng timestamp nhưng lọc bằng chuỗi `"2026-08"`, hoặc so `=` với ngày thay vì khoảng `>= đầu tháng AND < đầu tháng sau`.
4. **State phía client**: bảng nhận kết quả nhưng render dựa trên biến cũ, hoặc filter chạy hai lần và lần sau ghi đè bằng mảng rỗng; xem thứ tự setState/effect và điều kiện loading.

Cách làm nhanh: chạy tay query với đúng tham số đang gửi lên; nếu ra dữ liệu thì lỗi ở client, nếu trống thì lỗi ở tham số hoặc query. Sau khi tìm ra, sửa ở hàm dựng khoảng thời gian dùng chung (không vá riêng dashboard), thêm test cho ranh giới đầu/cuối tháng và tháng 12 → tháng 1. Nếu bạn gửi đoạn code lọc và query, tôi chỉ đúng dòng.
