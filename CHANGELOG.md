# Changelog

Toàn bộ lịch sử tiến hóa của phương pháp. README/methodology dùng tên LỚP (Core / Scale / Ops / Optimization & Learning / Collaboration); version chỉ sống ở đây.

## v1.3.1 — 2026-07-28 (hardening vòng 2+3 theo hội đồng tái chấm — 42 test nghiệm thu)

Hội đồng 3 reviewer tái chấm v1.3.0 (67/77/82 trên 100) và tìm ra 1 CRITICAL bằng thí nghiệm thật: **2 merge đồng thời làm mất lot khỏi integration 8/8 lần** (rebase→ff chạy ngoài lock, `branch -f` đè nhau, cả hai báo OK). Fix + toàn bộ MAJOR:

- **C1 — merge queue TUẦN TỰ bằng máy**: merge-lock per-run (mkdir, stale 15 phút) giữ suốt `cmdMerge` + bước ff chuyển sang **CAS `git update-ref <ref> <new> <expected-old>`** (compare-and-swap của git — hai bên không thể cùng thắng); thua CAS/ancestry → **eject về READY có báo** (branch đã rebase, head cập nhật, chạy lại merge là tiếp); tạo integration branch idempotent. Test mới: 4 vòng concurrent-merge — không silent-loss, integration đủ lot sau retry.
- **M1 — FAIL-CLOSED claim hỏng**: JSON không parse được → chặn mọi claim/status (trước đây bị filter im lặng = claim tàng hình); dọn qua `release --force` sau khi người xác minh.
- **M2 — run-lease sống theo hoạt động**: renew/extend/ready/merge đều bump; STALE ≠ tự lấy — run khác takeover cần `--force-run` SAU recover.
- **M3 — path space/quote/control bị reject tại CLI** (normPath) — non-goal được enforce thay vì lời hứa; hook comment sửa lại cho đúng.
- **M5 — registry lock release kiểm owner** (victim bị cướp lock không xóa nhầm lock người khác); NFC normalize + unquote octal porcelain (tên file tiếng Việt); `git worktree prune` tự động ở ready/merge/recover; doctor quét journal mồ côi.
- **Race test nâng lên 100 lượt** (20 vòng × 5 process concurrent — khớp điều kiện nghiệm thu ADR §13). Sau vòng 2: 40 test; sau vòng 3 (dưới): **42 test, 0 FAIL**.
- **Pragmatics**: doctor nhận diện profile tiny (hết cảnh repo tiny lành mạnh bị phán "FAIL 5 mục") + in trigger scale-up; `init --profile` nhận đủ 8 tên (SKILL.md ghi rõ mapping bộ file); **`CLAUDE.tiny.md.template` mới** — tiny không còn nhận CLAUDE.md đầy tham chiếu ma; cổng conflict chuyển về MAIN agent chạy `parallel status --check` (router chỉ có Read/Glob/Grep — spec cũ bất khả thi); doc 13 thêm walkthrough 2-session end-to-end + bảng Enforced vs Advisory đối chiếu lại từng dòng với code; README hết drift (SPEC→shipped, CLI hết "đang cân nhắc", quick start có `parallel`).
- **Learning (12 v3)**: N định nghĩa = 5 session/14 ngày; survival/correction có LỆNH đo trong audit row 12 + spot-check 3 event chống SHA bịa; `/learn` thêm bước verify `git cat-file -e` + dán `git diff --name-only`; aggregation events per-lot có chủ ([ACTIVE thủ công] trong end-of-run checklist); residue ladder cũ dọn sạch; đặc cách security cần rủi ro cụ thể + strong-accepted; hòa giải scope-vs-evidence; survival sau release chỉ giữ/rollback.
- **Vòng 3 (hội đồng tái chấm lần 2: 90/91/93)**: merge-lock có owner-check khi release + heartbeat `touchMergeLock()` qua rebase/test dài (serialization không rơi sau phút 15); EEXIST tử tế ở nhánh stale-takeover; bump run-lease vào trong withLock; dọn tmp dir ở mọi đường fail của merge; **doctor chống false-PASS tiny** (repo có dấu vết core mà mất `.githooks` → FAIL "hook đang không chạy im lặng", không được nhận nhầm là tiny); **REMAP SHA khi gom learning events cấp run** (lot branch bị rebase → `accepted_sha` per-lot thành orphan; gom = ghi integration SHA, giữ `lot_sha_pre_rebase`, audit không false-positive "SHA ma"); vá lỗ "repo im ắng" (survival cần ≥ 2 session hoạt động trong cửa sổ N); sweep số test hard-code khỏi docs (con số sống ở CHANGELOG — hiện hành: **42 test**, thêm assert bên-thua-CAS giữ claim READY + test merge-lock stale takeover 16 phút); ghi runtime self-test ~2–4 phút Windows.

## v1.3.0 — 2026-07-28 (Phase 2: NT13 chạy thật — CLI parallel + claim gate + 26 test nghiệm thu)

- **NEW: `lib/parallel.js` + `ai-simple parallel plan|claim|extend|renew|status|ready|merge|recover|release|self-test`** — toàn bộ cơ chế NT13 thành máy: claim JSON atomic trong `<GIT_COMMON_DIR>/ai-simple/` (mkdir lock + owner/epoch/stale 30s, write-temp-rename không đè + retry EPERM/EBUSY, casefold path trên win32/macOS), overlap block write/write + ancestor/child, PROTECTED từ `git status` + re-scan tại merge (R4), target-branch lease 1-run-1-target (R3), `extend` first-wins (R2), read/write → WARN + gợi ý depends_on (R5), `plan` = MECE test + topo-sort waves + admission, merge queue đúng Git-reality (READY tự nhả worktree, journal từng bước, ancestry check thay so-SHA, FAILED fail-eject, RESUME sau crash từ journal), recover checklist không-silent-takeover, release bảo vệ worktree dirty.
- **26 test nghiệm thu** (`parallel self-test`, sandbox temp repo): race atomic tuần tự + CONCURRENT đúng-1-thắng, crash giữa queue → resume, dirty-repo không mất dữ liệu, STALE vẫn chặn, target branch không bị đụng, integration nhận đủ 2 lot. Self-test bắt được 1 bug thật khi build: lock mồ côi do `process.exit` bỏ qua `finally` → fix bằng exit-handler.
- **Hook claim fast gate** (`CLAIMS_CHECK=auto` trong pre-commit template): staged path ∩ write_paths của claim thuộc branch khác → BLOCK tại commit-time (fencing cho lease) + 2 fixture self-test; chỉ chạy khi registry tồn tại — repo không parallel: 0 chi phí.
- **Doctor**: claims STALE/orphan/JSON-hỏng → WARN (guarded). **Init**: `--profile tiny` (chỉ CLAUDE.md — R19) + auto-detect repo < 10 file gợi ý tiny (R18).
- **NEW: `templates/learn.command.md.template`** (`/learn`) — cầu [ACTIVE] của NT12 v3 vòng B: dựng evidence chain từ git, filter defect-vs-preference, enum bằng chứng, promote 3 mức kèm last_verified + rollback condition.
- Doc 13 banner SPEC → OPERATIONAL; bảng Enforced vs Advisory cập nhật theo cái máy THẬT SỰ chặn.

## v1.2.0 — 2026-07-28 (vNext docs: 13 nguyên tắc, 5 lớp — Collaboration + Learning)

Docs-first release theo `docs/adr/001-vnext-git-native-parallel-self-evolving.md` (thiết kế qua hội đồng phản biện 3 reviewer, 19 amendments R1–R19). Cơ chế deterministic (CLI `parallel *`, claim gate trong hook, scripts learning) là roadmap Phase 2–5 — CHƯA ship trong bản này.

- **NEW: nguyên tắc 13 — Git-Native Parallel Sessions** (`methodology/13`, trạng thái SPEC có status banner): lot MECE theo business entity + DAG/waves, admission gate, claim JSON có lease trong `GIT_COMMON_DIR` (CLI-managed, contract cho Phase 2), worktree per lot, integration branch + merge queue viết đúng Git-reality (READY = nhả worktree, journal, ancestry check, FAILED/ABANDONED fail-eject), coordination states CLEAR/CONFLICT/STALE/PROTECTED tách khỏi RED, shared zones single-writer (lockfile = generated-at-integration), crash recovery, bảng Enforced vs Advisory, non-goals. Tầng 0 "bảo vệ repo hiện hữu" (cấm stash/reset đè, dirty work user = PROTECTED) áp dụng NGAY cả single-session.
- **Nguyên tắc 12 → v3** (3 vòng): giữ vòng A (coupling map); thêm vòng B học từ accepted diffs (evidence chain SHA, enum bằng chứng thay confidence số, acceptance có tầng — survival là vé promote, filter defect-vs-preference, chống echo-chamber, learned rule có last_verified/SUSPECT) + vòng C skill evolution (branch + regression + rollback; forward-test là CONTRACT Phase 5); metric = survival/correction rate đo từ git; nhãn ACTIVE vs CONTRACT từng bước; phối hợp NT12↔NT13 (worker không ghi global generated/telemetry); state taxonomy 6 loại.
- **Nguyên tắc 07 → v2**: hợp nhất vào vòng B làm fast-path `explicit-instruction` — một pipeline, một ladder, một nơi ghi; giữ format entry + lifecycle; explicit thắng inferred cùng scope.
- **Nguyên tắc 04**: phát biểu lại invariant — behavior↔test, documented-change↔doc (hợp thức hóa hook covers-based); deferred-doc-at-integration cho doc shared-zone trong parallel mode.
- **SKILL.md viết lại** theo progressive disclosure (~2K token): 7 profiles (thêm tiny), workflow 16 bước + đường tắt "Core + GREEN = 1→4→5→8→9→13", 13 nguyên tắc 1 dòng, hard safety rules, guard NT13 chống gọi CLI ma.
- **Audit đổi sang applicability**: bỏ điểm trần /120 → `earned/applicable_max × 100`, mỗi nguyên tắc APPLICABLE/NOT_APPLICABLE/DEFERRED; row 12 v3 + row 13.
- Router/fl template: thêm cổng conflict (NT13, chỉ hoạt động khi registry tồn tại, CLEAR = im lặng); 08 document fast/heavy gate split (p95 ≤ 500ms) + claim fast gate là hạng mục Phase 2 ưu tiên cao nhất.

## v1.1.0 — 2026-06-13 (npm CLI)

- **NEW: npm package `ai-simple`** — CLI zero-dependency đóng gói lớp máy: `init` (cài
  hook + doc-health + templates + workflow theo stack supabase/prisma/custom, set hooksPath,
  self-test), `doctor` (khám setup + phát hiện version drift qua marker `ai-simple-version`),
  `update` (nâng cấp giữ nguyên CONFIG người dùng, backup .bak), `doc-status`, `doc-health --ci`.
  Giải bài toán template-drift: N repo copy tay = N bản drift; CLI = 1 nguồn + 1 lệnh sync.
- Version marker trong hook + report để doctor/update so drift
- Fix tự bắt khi test CLI: `$'` trong chuỗi replacement của String.replace() nhân bản file
  (dùng replacer function); index của app-map README template đổi sang plain text (link hóa
  khi file tồn tại) + ví dụ cross-ref tự tham chiếu — repo mới init không còn fail CI oan
- LICENSE (MIT), package.json, `npm test` chạy self-test 2 template từ package

## v1.0.0 — 2026-06-13 (release đầu tiên)

Trạng thái: 12 nguyên tắc, 15 templates, 2 script tự test (report 12 fixtures + hook 6 fixtures), đạt 99/100 sau 11 vòng adversarial review + 2 vòng đối chiếu nghiên cứu khoa học.

### Optimization layer — nguyên tắc 12 v2 (các commit v4.0–v4.3)
- Coupling map: mỗi doc gắn code khai `covers:` / `last_verified:` / `ttl_days:` → trạng thái VERIFIED/SUSPECT/ORPHANED máy tính từ git
- Cổng GHI: hook chặn commit đổi code trong covers mà doc không được sửa/re-verify cùng commit
- Cổng ĐỌC: doc-status.md regenerate mỗi commit, router gắn cờ (fail-closed), marker trong chính doc, agent phải đối chiếu code trước khi tin doc SUSPECT
- Chống laundering: commit chore chạm doc không rửa được SUSPECT (attestation phải gate-1-shaped hoặc `re-verify(...)`)
- Symbol-level rot: doc nhắc hàm đã xóa → SUSPECT (tìm toàn repo, loại *.md) → CI fail
- Doc-lag + escaped-drift thay drift% (proxy gameable); hotspot = route-freq × covers-churn
- Ranh giới lời bảo đảm nêu tường minh trong 12 §gates — mọi residual có tên + audit check

### Ops layer — nguyên tắc 11 (v2.2–v3.0)
- Runbook per service, state registry, schedules + external-services registry (4/4 templates)
- Routing "sự cố → runbook trước code"; fix sự cố → update runbook cùng commit

### Scale layer — nguyên tắc 08–10 (v2–v2.1)
- Pre-commit hook versioned (.githooks + core.hooksPath), --self-test, encoding guard (BOM/mojibake)
- Generated vs authored docs (`_generated/`), cross-repo contract + bảng SYNC + path convention
- doc-health-report: --ci fail PR, --status sinh doc-status, --self-test, --fast

### Core layer — nguyên tắc 01–07 (v1–v3)
- Hierarchical context (root <6K tokens + root diet), app-map pattern (>20 file → domain hóa)
- Context routing /fl + context-router; LOGIC vs REQUEST
- Risk tiers GREEN/YELLOW/RED (06 v3): reversible tự làm + Assumptions cuối task, RED mới hỏi 1 câu gộp
- Doc+Test sync invariant; memory as feedback

### Bài học được mã hóa thành cơ chế (lịch sử lỗi → fixture)
- Hook hỏng vì `{{X|default}}` bị sh hiểu là pipe → --self-test pattern-exercise
- PowerShell 5.1 phá UTF-8 tiếng Việt (BOM khi ghi, ANSI khi đọc) 2 lần → encoding guard trong hook
- Multi-covers parser mù, same-day false SUSPECT, sibling-path overmatch → 12 fixtures
- SUSPECT laundering qua commit chore → attestation semantics + fixture
- "Doc 90 ngày không ai đọc → khai tử" bị user veto đúng → RETIRE chỉ cho doc mồ côi; doc lạnh = check router + verify, không xóa
