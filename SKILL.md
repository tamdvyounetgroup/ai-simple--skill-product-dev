---
name: ai-simple-product-dev
description: Methodology for organizing software projects to be AI-agent-friendly — an operating layer for codebases. Use when bootstrapping a new project, retrofitting docs for AI pair-programming, onboarding an AI agent to an existing codebase, or on symptoms like "AI hallucinates", "context too long", "docs out of sync with code", "schema change broke another repo", "AI asks me to confirm every little thing", "nobody knows how to restart the bot", "two AI sessions stepping on each other", "AI repeats mistakes I already corrected", "what should we optimize next". Provides 13 composable principles in 5 layers — hierarchical context, app-map, context routing, doc+test sync, LOGIC vs REQUEST, risk-tiered pre-flight, memory, enforcement hooks, generated-vs-authored docs, cross-repo contracts, ops runbooks, evidence-driven self-evolution (learning from accepted diffs), and Git-native parallel sessions (MECE lots, leased claims, worktrees, merge queue) — profile-gated so small projects pay near zero.
---

# AI-Simple Product Dev

> Hệ điều hành cho codebase: **Git lưu sự thật; AI Simple quản context, ý định, invariants, quyền ghi, tích hợp và học từ lịch sử đó.** 13 nguyên tắc composable — kích hoạt theo profile, KHÔNG ép project nào dùng cả 13. Index chi tiết: `methodology/README.md`. Thiết kế + roadmap: `docs/adr/001`.

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

`doctor` phát hiện trigger scale-up và đề xuất profile kế tiếp — hệ mở rộng theo tải, không theo trí nhớ người dùng.

## Workflow 16 bước (danh mục — chi tiết ở doc từng nguyên tắc)

1 Nhận yêu cầu → 2 Phân loại LOGIC/REQUEST/HYBRID (05) → 3 Xác định profile applicable → 4 Route minimal context (03) → 5 GREEN/YELLOW/RED (06) → 6 Parallel admission gate nếu nhiều session (13) → 7 Bảo vệ Git state hiện hữu (13 §tầng-0 — MỌI profile) → 8 Implement đúng scope → 9 Validate code/test/doc/contract (04, 10) → 10 Quan sát revisions của user → 11 Extract accepted decisions (12 §B) → 12 Persist đúng scope (07/12) → 13 Commit/tích hợp theo quyền được cấp → 14 Cập nhật metric → 15 Review learning candidates → 16 Promote/release/monitor (12 §C).

**Đường tắt: Core profile + task GREEN = bước 1→2→4→5→8→9→13** (bước 2 LOGIC/REQUEST luôn chạy — nó quyết định có commit hay không). Các bước còn lại chỉ tồn tại khi profile tương ứng bật — không phải nghi thức phải đi đủ. Lưu ý CLI: `init --profile` nhận đủ 8 tên nhưng về BỘ FILE chỉ có 2 mức (tiny / còn-lại-như-core) — khác biệt giữa scale/ops/parallel... là nguyên tắc nào BẬT, sống ở đây và methodology.

## 13 nguyên tắc / 5 lớp

**Core (01–07):**
1. **Hierarchical Context** — root CLAUDE.md < 6K token, link xuống module → `methodology/01`
2. **App-map** — doc canonical đánh số theo domain; `08` giữ RULE kiến trúc code feature-sliced → `methodology/02`
3. **Context Routing** — `/fl` + router: deterministic trước, LLM fallback; kèm cổng doc-status + cổng conflict → `methodology/03`
4. **Doc + Test Sync** — behavior change ↔ test; documented change ↔ doc; cùng commit → `methodology/04`
5. **LOGIC vs REQUEST** — hỏi ≠ yêu cầu; hybrid tách đôi → `methodology/05`
6. **Risk Tiers** — GREEN/YELLOW tự làm với default an toàn; RED mới confirm (đúng 1 câu gộp) → `methodology/06`
7. **Memory** — preference explicit của user = fast-path vòng B → `methodology/07`

**Scale (08–10):**
8. **Automated Enforcement** — fast gates ở pre-commit (≤ 500ms), việc nặng về pre-push/CI/doctor → `methodology/08`
9. **Generated vs Authored** — máy sinh "cái gì" (`_generated/`), người viết "tại sao" → `methodology/09`
10. **Cross-Repo Contract** — shared boundary = contract đánh version + bảng SYNC → `methodology/10`

**Ops (11):** 11. **Ops Layer** — runbook/state-registry/schedules per service nền; sự cố → runbook trước code → `methodology/11`

**Optimization & Learning (12):** 12. **Evidence-Driven Self-Evolution** — vòng A coupling map doc↔code + 2 cổng; vòng B học từ accepted diffs (SHA là evidence); vòng C nâng skill qua branch + regression + rollback → `methodology/12`

**Collaboration (13):** 13. **Git-Native Parallel Sessions** — lot MECE theo entity, claim có lease, worktree per lot, integration branch, merge queue tuần tự → `methodology/13`

## Hard safety rules (mọi profile, mọi lúc)

- ĐỌC đủ Git state (branch/HEAD/status/dirty/untracked/worktrees) trước khi sửa code hay tạo worktree.
- CẤM: tự stash thay đổi của user; reset/checkout đè; di chuyển dirty changes; xóa branch/worktree không rõ owner. **Dirty work của user là bất khả xâm phạm.**
- RED (không quay đầu: DROP, mutate prod, RLS nới) = dừng, đúng 1 câu confirm kèm phương án khuyến nghị. Confirm là ngoại lệ đắt giá, không phải nghi thức.
- Không silent takeover claim/lot/branch của session khác — recovery checklist trước.
- **Guard NT13:** claim CHỈ qua CLI `ai-simple parallel claim/extend` — CẤM tự tạo/sửa claim JSON tay trong `GIT_COMMON_DIR` (state rác đầu độc orchestrator). Trước khi song song: đọc `methodology/13` + chạy `parallel plan` (MECE) + admission gate; không đủ 2 lot độc lập thì single-session.

## Routing

- Index nguyên tắc + templates + anti-patterns + triggers scale-up: `methodology/README.md`
- Thiết kế vNext, amendments hội đồng phản biện, roadmap 5 phase: `docs/adr/001-vnext-git-native-parallel-self-evolving.md`
- Skill chuyên môn: UI → `ui-design-logic`; BA → `ba-flow-logic`; triage defect → `ui-ux-triage`. Điểm móc 2 chiều định nghĩa tại file `references/*-integration*.md` của TỪNG skill — nguồn sự thật duy nhất, không lặp ở đây.
