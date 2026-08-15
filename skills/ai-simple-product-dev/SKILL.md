---
name: ai-simple-product-dev
description: Operating layer cho codebase làm việc với AI — 15 nguyên tắc composable trong 6 lớp (context phân tầng, app-map + coupling doc↔code, context routing, doc+test sync, risk tier, memory, hook enforcement, cross-repo contract, ops runbook, parallel sessions, security gate), bật theo profile nên project nhỏ trả phí gần bằng không. Kích hoạt khi: dựng project mới làm với AI, retrofit docs cho AI pair-programming, onboard agent vào codebase có sẵn, hoặc triệu chứng 'AI bịa tên hàm/đọc sai file', 'context quá dài', 'docs lệch code', 'đổi schema vỡ repo khác', 'AI hỏi xác nhận từng việc nhỏ', 'hai phiên AI giẫm chân nhau', 'AI lặp lại lỗi đã sửa', 'nên tối ưu gì tiếp', 'lộ secret vào git', 'doc này có bị tiêm lệnh không'. KHÔNG kích hoạt cho: phân tích nghiệp vụ (→ba-flow-logic), thiết kế/build UI (→ui-design-logic), defect app đang chạy (→ui-ux-triage), review bảo mật một thay đổi cụ thể (→security-logic).
---

# AI-Simple Product Dev

> Hệ điều hành cho codebase: **Git lưu sự thật; AI Simple quản context, ý định, invariants, quyền ghi, tích hợp, bảo mật và học từ lịch sử đó.** 15 nguyên tắc composable — kích hoạt theo profile, KHÔNG ép project nào dùng cả 15. Index chi tiết: `methodology/README.md`. Thiết kế + roadmap: `docs/adr/001`.

## Bước 0 — chọn profile

| Profile | Khi nào | Nguyên tắc |
|---|---|---|
| tiny | Project < 10 file / thử nghiệm vứt đi | 01 + 06 (CLAUDE.md mỏng + risk tier) |
| core | Mọi project nghiêm túc | 01–07 |
| scale | Root chạm 6K token / app-map > 20 file / cần docs máy sinh | + 08, 09 |
| contracts | ≥ 2 repo chia sẻ schema/utility | + 10 |
| ops | Có process chạy nền (cron/agent/pipeline) | + 11 |
| optimization | Hệ chạy > 3 tháng / muốn học từ revisions | + 12 |
| parallel | ≥ 2 session thường trực trên 1 repo | + 13 (CLI `ai-simple parallel` — đọc guard dưới) |
| security | Code chạm auth/payment/crypto/migration / có dependency ngoài / docs từ nhiều nguồn | + 14 (secret-scan + doc-injection lint máy; skill `security-logic`) |
| full | Bật tất cả không cần nghĩ (repo lớn, đội quen hệ) | 01–14 (về bộ file = core; khác biệt là nguyên tắc nào BẬT) |

`doctor` phát hiện trigger scale-up và đề xuất profile kế tiếp — hệ mở rộng theo tải, không theo trí nhớ người dùng.

## Workflow 16 bước (danh mục — chi tiết ở doc từng nguyên tắc)

1 Nhận yêu cầu → 2 Phân loại LOGIC/REQUEST/HYBRID (05) → 3 Xác định profile applicable → 4 Route minimal context (03) → 5 GREEN/YELLOW/RED (06) → 6 Parallel admission gate nếu nhiều session (13) → 7 Bảo vệ Git state hiện hữu (13 §tầng-0 — MỌI profile) → 8 Implement đúng scope → 9 Validate code/test/doc/contract (04, 10) → 10 Quan sát revisions của user → 11 Extract accepted decisions (12 §B) → 12 Persist đúng scope (07/12) → 13 Commit/tích hợp theo quyền được cấp → 14 Cập nhật metric → 15 Review learning candidates → 16 Promote/release/monitor (12 §C).

**Đường tắt: Core profile + task GREEN = bước 1→2→4→5→8→9→13** (bước 2 LOGIC/REQUEST luôn chạy — nó quyết định có commit hay không). Các bước còn lại chỉ tồn tại khi profile tương ứng bật — không phải nghi thức phải đi đủ. Lưu ý CLI: `init --profile` nhận đủ 9 tên nhưng về BỘ FILE chỉ có 2 mức (tiny / còn-lại-như-core) — khác biệt giữa scale/ops/parallel... là nguyên tắc nào BẬT, sống ở đây và methodology.

## 15 nguyên tắc / 6 lớp

**Core (01–07 + 15):**
1. **Hierarchical Context** — root CLAUDE.md < 6K token, link xuống module → `methodology/01`
2. **App-map** — doc canonical đánh số theo domain; `08` giữ RULE kiến trúc code feature-sliced → `methodology/02`
3. **Context Routing** — `/fl` + router: deterministic trước, LLM fallback; kèm cổng doc-status + cổng conflict → `methodology/03`
4. **Doc + Test Sync** — behavior change ↔ test; documented change ↔ doc; cùng commit → `methodology/04`
5. **LOGIC vs REQUEST** — hỏi ≠ yêu cầu; hybrid tách đôi → `methodology/05`
6. **Risk Tiers** — GREEN/YELLOW tự làm với default an toàn; RED mới confirm (đúng 1 câu gộp) → `methodology/06`
7. **Memory** — preference explicit của user = fast-path vòng B → `methodology/07`

**Scale (08–10):**
8. **Automated Enforcement** — fast gates ở pre-commit (mục tiêu ≤ 500ms POSIX; Windows đo thật ~3s do chi phí spawn `sh` — vẫn dưới ngưỡng `--no-verify`, đang tối ưu), việc nặng về pre-push/CI/doctor → `methodology/08`
9. **Generated vs Authored** — máy sinh "cái gì" (`_generated/`), người viết "tại sao" → `methodology/09`
10. **Cross-Repo Contract** — shared boundary = contract đánh version + bảng SYNC → `methodology/10`

**Ops (11):** 11. **Ops Layer** — runbook/state-registry/schedules per service nền; sự cố → runbook trước code → `methodology/11`

**Optimization & Learning (12):** 12. **Evidence-Driven Self-Evolution** — vòng A coupling map doc↔code + 2 cổng; vòng B học từ accepted diffs (SHA là evidence); vòng C nâng skill qua branch + regression + rollback → `methodology/12`

**Collaboration (13):** 13. **Git-Native Parallel Sessions** — lot MECE theo entity, claim có lease, worktree per lot, integration branch, merge queue tuần tự → `methodology/13`

**Security (14):** 14. **Security as a Declared Gate** — cổng shift-left có KHAI BÁO phủ sóng (3 vùng A git-time / B CI point-to-tool / C production=NON-GOAL); secret-scan + doc prompt-injection lint (LLM01) enforced ở pre-commit; mọi finding map OWASP LLM Top-10 + OWASP Top-10 web (ngang hàng); KHÔNG "đã bảo mật ✓", KHÔNG thay pentest → `methodology/14`

**Core (tiếp) — 15:** 15. **Build Discipline** — kỷ luật pha VIẾT CODE: thang 7 bậc dừng-ở-bậc-đủ (chống viết thừa); YAGNI chỉ áp cho thứ AI tự nghĩ thêm — spec/AC là định nghĩa duy nhất của "được yêu cầu tường minh", precedence [INV] → spec → [STACK] → [DEF] → thang; 8 guardrail không được cắt (kéo [INV] thiết kế xuống build); thiếu-spec → handoff ngược, cấm im lặng; vùng miễn test giữ đúng 3 ca NT04; marker `nợ:` 2 vế. Bản hành động 7 điều nằm trong CLAUDE.md template; ép bởi hook 1f + gate lane → `methodology/15`

## Hard safety rules (mọi profile, mọi lúc)

- ĐỌC đủ Git state (branch/HEAD/status/dirty/untracked/worktrees) trước khi sửa code hay tạo worktree.
- CẤM: tự stash thay đổi của user; reset/checkout đè; di chuyển dirty changes; xóa branch/worktree không rõ owner. **Dirty work của user là bất khả xâm phạm.**
- RED (không quay đầu: DROP, mutate prod, RLS nới) = dừng, đúng 1 câu confirm kèm phương án khuyến nghị. Confirm là ngoại lệ đắt giá, không phải nghi thức.
- Không silent takeover claim/lot/branch của session khác — recovery checklist trước.
- **Guard NT13:** claim CHỈ qua CLI `ai-simple parallel claim/extend` — CẤM tự tạo/sửa claim JSON tay trong `GIT_COMMON_DIR` (state rác đầu độc orchestrator). Trước khi song song: đọc `methodology/13` + chạy `parallel plan` (MECE) + admission gate; không đủ 2 lot độc lập thì single-session.

## Routing

- Index nguyên tắc + templates + anti-patterns + triggers scale-up: `methodology/README.md`
- Thiết kế vNext, amendments hội đồng phản biện, roadmap 5 phase: `docs/adr/001-vnext-git-native-parallel-self-evolving.md`
- **Zero-command**: user nói tự nhiên là đủ — skill tự kích hoạt theo description, KHÔNG bắt user
  chọn skill/command. Bảng pointer triệu chứng → đích (chỉ trỏ, nguồn sự thật ở references TỪNG skill):
  - Nhu cầu/tính năng mới còn mơ hồ, "phân tích nghiệp vụ" → `ba-flow-logic`
  - Build/design UI, "thêm màn hình", "make it pretty" → `ui-design-logic`
  - UI "xấu/rối/nhìn như AI" → `ui-design-logic` 06 §3 (phân loại 4-case, có đường handoff BA)
  - "Màn này sai/lệch", screenshot + câu than, app thật lỗi → `ui-ux-triage`
  - Sự cố production/process nền, "bot chết", cron/log → nguyên tắc 11: runbook TRƯỚC code (`methodology/11`)
  - Nhiều session cùng sửa repo → NT13 `ai-simple parallel`; docs nghi ngờ cũ → doc-status/`/audit`
  - "Có lỗ hổng không / review bảo mật / kiểm secret / doc này có bị inject không" → `security-logic` (NT14 — khai vùng phủ, KHÔNG "đã bảo mật ✓"); pentest production → runbook NT11 (ngoài scope)
- Điểm móc 2 chiều định nghĩa tại file `references/*-integration*.md` của TỪNG skill — nguồn sự thật duy nhất, không lặp ở đây.
