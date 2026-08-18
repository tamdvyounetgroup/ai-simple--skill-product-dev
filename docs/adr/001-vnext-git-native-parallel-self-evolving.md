# ADR-001 — AI Simple vNext: Git-Native, Parallel, Self-Evolving

- **Status**: Accepted (docs-first; cơ chế deterministic theo Lộ trình §14)
- **Date**: 2026-07-28
- **Deciders**: Long (owner)
- **Nguồn**: bản tổng hợp thiết kế của owner + hội đồng phản biện 3 reviewer độc lập (concurrency / pragmatics / learning-loop). Bản gốc là INPUT; **contract chính thức = `methodology/13-parallel-sessions.md` + `methodology/12-self-optimization.md` v3** (đã hấp thụ Amendments bên dưới). Khi bản gốc trong ADR này mâu thuẫn với methodology docs → methodology docs thắng.
- **Status note (2026-08-12)**: ADR này viết ở thời điểm hệ có 13 nguyên tắc / 5 lớp — các con số trong thân ADR là lịch sử, KHÔNG cập nhật theo release. Hiện hành: **15 nguyên tắc / 6 lớp** (nguồn sự thật về số = `system-manifest.json`, ép bởi identity-manifest guard).
<!-- identity-exempt: THÂN ADR là lịch sử (viết khi hệ có 13 nguyên tắc / 5 lớp) — số trong đó KHÔNG cập nhật theo release. Dòng "Hiện hành" ở trên thì PHẢI đúng và được guard soi trước khi miễn trừ áp dụng. -->

---

## Amendments từ hội đồng phản biện (R1–R19) — BẮT BUỘC với Phase 2+

Bản thiết kế gốc (phần sau ADR này) được hội đồng chấm ~6/10 với các lỗi phải sửa trước khi build. Các amendment sau đã được hấp thụ vào methodology docs và ràng buộc mọi phase triển khai:

**Concurrency / Git-reality:**
- **R1 — Giao thức MERGING viết lại đúng Git**: Git từ chối rebase branch đang checked-out ở worktree khác → READY := "worker đã nhả worktree"; queue detach/remove worktree trước rebase; queue ghi journal file (`merging-<lot>.json`: step, original_head_sha, post_rebase_sha) trước mỗi bước; claim lưu `original_head_sha`; recovery dùng ancestry check (`git merge-base --is-ancestor`) thay so-sánh-SHA; thêm trạng thái FAILED (về ACTIVE kèm lý do) + ABANDONED (release claim, giữ branch) với fail-eject — 1 lot hỏng không đóng băng wave.
- **R2 — Claim động**: LLM khai write-set trước sẽ sai thường xuyên → `claim --extend` (qua đúng lock + overlap check, first-extend-wins); file mới ngoài write_paths chưa extend = CONFLICT; rename đích ra ngoài write_paths = extend bắt buộc; rename file ngoài lot mình = cấm. Lockfile (`package-lock.json`…) RÚT KHỎI shared zone → generated-at-integration: worker khai `declared_deps`, KHÔNG commit lockfile; integrator regenerate.
- **R3 — Target-branch lease**: 1 target branch chỉ 1 run ACTIVE (claim run-level cùng registry).
- **R4 — PROTECTED chống TOCTOU**: re-scan dirty/staged của user tại mỗi queue entry + trước target update; dirty mới giao claim ACTIVE → CONFLICT nổi lên cho user.
- **R5 — Read/write overlap giữa lot** → WARN tại claim time + gợi ý `depends_on`.
- **R6 — Spec NTFS/Windows**: mkdir-based lock (atomic 2 OS) + owner/epoch + stale threshold; update claim = write-temp-rename không đè + retry EPERM/EBUSY; path normalize repo-relative, forward-slash, case-fold win32/macOS.
- **R7 — Bỏ số bịa**: admission không dùng "speedup ≥1,5× ex-ante" (LLM ước = bịa) → heuristic cấu trúc + đo ex-post feed NT12; target claim ≤100ms không tính process spawn; overhead <25% phải tính node_modules per worktree (khuyến nghị pnpm/shared store).
- **R8 — Non-goals**: submodules không hỗ trợ; single-machine only; queue serial không batching (đủ cho N=2–4).
- **R9 — Bảng Enforced vs Advisory per phase** trong doc 13.

**Learning loop (NT12 v3):**
- **R10 — Hợp nhất NT07 vào vòng B**: NT07 = fast-path `explicit-instruction` (lặp 2 lần → CANDIDATE), một ladder, một destination, một nơi ghi.
- **R11 — Metric git-đo-được**: bỏ confidence thập phân → enum bằng chứng `explicit-instruction > strong-accepted > weak-inferred`; bỏ "precision ≥90%" và "false promotion = 0" → survival rate + correction rate.
- **R12 — Acceptance có tầng**: im lặng+merge = TRUNG BÌNH (candidate scope nhỏ nhất); survival qua thời gian = vé promote; bậc "nhiều user độc lập" := "≥3 project khác domain cùng user, cách nhau thời gian" HOẶC quyết định thủ công của owner.
- **R13 — Chống học sai bổ sung**: filter defect-vs-preference (revision vi phạm ba-spec/design-spec = defect, không sinh learning event); yêu cầu độc lập giữa case; MONITORED chỉ đếm bằng chứng NGOÀI vòng (chống echo-chamber); learned rule cũng là doc — evidence links + `last_verified` + rollback condition + SUSPECT khi nền đổi; ladder 8 tên gập về 3 mức vận hành.
- **R14 — Nhãn ACTIVE vs CONTRACT từng bước** vòng B/C + lệnh `/learn` thủ công làm cầu; forward-test = INACTIVE Phase 4–5, gate thay thế = assertion kiểm chứng được + user duyệt.

**Pragmatics / guard:**
- **R15 — Status banner máy-nhìn-thấy** cho mọi cơ chế chưa vận hành (doc 13, vòng B/C doc 12): `SPEC — NOT OPERATIONAL... CẤM gọi ai-simple parallel *, CẤM tạo claim tay`; SKILL.md route trigger parallel qua guard.
- **R16 — Đường tắt tường minh**: "Core profile + GREEN = bước 1→4→5→8→9→13"; frontmatter description không dài thêm.
- **R17 — NT04 sửa đủ 3 chỗ** (bảng + blockquote + slogan) sang behavior↔test / documented-change↔doc; doc shared-zone theo cơ chế deferred-doc-at-integration.

**Hệ điều hành cho codebase (bổ sung theo tầm nhìn owner):**
- **R18 — `init` auto-detect profile**: detect repo size / UI / đa-repo / process nền → đề xuất profile, placeholder tự điền tối đa; mục tiêu init < 5 phút.
- **R19 — Profile `tiny` + scale-down**: chỉ CLAUDE.md + risk tier, chi phí ≈ 0 để "mọi project dùng từ đầu" là hợp lý; `doctor` phát hiện trigger scale-up và đề xuất bật profile kế tiếp — hệ tự mở rộng theo tải.

---

# Bản thiết kế gốc — AI Simple vNext

## 1. Mục tiêu

AI Simple là hệ phương pháp giúp AI coding agent:

- Nắm đúng context với chi phí thấp.
- Hiểu đúng yêu cầu và mức quyền tự hành.
- Giữ code, tài liệu và test đồng bộ.
- Làm việc an toàn trên repository Git hiện hữu.
- Điều phối nhiều session song song mà không giẫm code.
- Học từ các bản chỉnh sửa được user chấp nhận.
- Nâng cấp project, skill chuyên môn và chính AI Simple bằng bằng chứng, test và Git history.

Nguyên lý trung tâm:

> Git quản lý sự thật và lịch sử. AI Simple quản lý context, ý định, invariants, quyền ghi, quá trình tích hợp và khả năng học từ lịch sử đó.

---

## 2. Kiến trúc 5 lớp, 13 nguyên tắc

### Lớp Core

| # | Nguyên tắc | Trách nhiệm |
|---|---|---|
| 01 | Hierarchical Context | Root context mỏng, phân cấp theo module |
| 02 | App-map Pattern | Tri thức canonical theo domain/business entity |
| 03 | Context Routing | Route đúng tài liệu; deterministic trước, LLM fallback |
| 04 | Doc + Test Sync | Behavior change ↔ test; documented change ↔ doc |
| 05 | LOGIC vs REQUEST | Phân loại câu hỏi, yêu cầu và hybrid |
| 06 | Risk Tiers | GREEN/YELLOW tự làm; RED mới confirm |
| 07 | Memory as Feedback | Persist preference đủ bằng chứng |

### Lớp Scale

| # | Nguyên tắc | Trách nhiệm |
|---|---|---|
| 08 | Automated Enforcement | Hook, doctor, CI và deterministic gates |
| 09 | Generated vs Authored | Máy sinh "cái gì"; người viết "tại sao" |
| 10 | Cross-Repo Contract | Versioned contract cho shared boundary |

### Lớp Ops

| # | Nguyên tắc | Trách nhiệm |
|---|---|---|
| 11 | Ops Layer | Runbook, schedules, runtime state, external services |

### Lớp Optimization và Learning

| # | Nguyên tắc | Trách nhiệm |
|---|---|---|
| 12 | Evidence-Driven Self-Evolution | Doc health, interaction learning, skill evolution |

### Lớp Collaboration

| # | Nguyên tắc | Trách nhiệm |
|---|---|---|
| 13 | Git-Native Parallel Sessions | Lot, DAG, claim, worktree, integration branch, merge queue |

Không phải cả 13 nguyên tắc đều áp dụng cho mọi project. Chúng là các nguyên tắc composable, kích hoạt theo profile và trigger.

---

## 3. Luồng thực thi chung

```text
1. Nhận yêu cầu
2. Phân loại LOGIC / REQUEST / HYBRID
3. Xác định profile applicable
4. Route minimal context
5. Đánh giá GREEN / YELLOW / RED
6. Chạy parallel admission gate nếu có nhiều session
7. Bảo vệ trạng thái Git hiện hữu
8. Implement trong đúng scope
9. Validate code, test, doc và contract
10. Quan sát các revision của user
11. Extract accepted decisions
12. Persist đúng phạm vi
13. Commit hoặc tích hợp theo quyền được cấp
14. Cập nhật metric
15. Review learning candidates
16. Promote, release và monitor skill update
```

---

## 4. Git là nền móng

### Source of truth

| Dữ liệu | Source of truth |
|---|---|
| Code đã tích hợp | Git commit |
| Lịch sử thay đổi | Git DAG |
| Lot đang triển khai | Git branch |
| Workspace session | Git worktree |
| Mốc bắt đầu | `base_sha` |
| Kết quả worker | `head_sha` |
| Trạng thái tích hợp | Integration branch |
| Quyền ghi tạm thời | Registry trong `GIT_COMMON_DIR` |
| Learning evidence | Git diff + accepted SHA |

Claim không thay Git. Claim chỉ bổ sung thông tin mà Git không có:

> Session nào đang dự định sửa path nào?

### Bảo vệ repo hiện hữu

Trước khi sửa code hoặc tạo worktree, phải đọc: current branch, HEAD SHA, target branch, git status, staged paths, dirty paths, untracked paths, existing worktrees, existing lot branches, active claims.

Không được: tự stash thay đổi của user; reset hoặc checkout đè; di chuyển dirty changes sang worktree khác; xóa branch/worktree không rõ owner; cho worker claim path user đang sửa.

Dirty paths được chuyển thành synthetic claim:

```json
{
  "owner": "user-existing-worktree",
  "status": "PROTECTED",
  "write_paths": ["src/features/profile"]
}
```

Nhờ đó vẫn parallelize được phần khác mà không ảnh hưởng công việc đang dở.

---

## 5. NT13 — Git-Native Parallel Sessions

(Chi tiết chuẩn hóa + amendments R1–R9: xem `methodology/13-parallel-sessions.md` — đó là contract. Tóm tắt gốc:)

- **Admission gate**: chỉ song song khi ≥2 lot độc lập, mỗi lot đủ lớn, write-set MECE, shared boundary nhận diện xong, base_sha rõ, không overlap protected. *(R7: bỏ tiêu chí speedup ex-ante.)*
- **Lot MECE**: vertical slice theo business entity (code + docs + tests + AC); khai intent, write_paths, read_paths, depends_on, acceptance_tests, shared_change_policy; MECE trên write-set, ancestor/child = overlap.
- **DAG/waves**: wave 0 shared contract (chỉ khi cần) → wave 1 lot độc lập → wave 2 integration/e2e. Song song trong wave, tuần tự giữa wave.
- **Integration branch** `integrate/<run-id>`, worker branch `lot/<run-id>/<lot-name>`, mỗi branch một worktree; không merge thẳng vào target branch user đang dùng.
- **Claim registry** JSON tại `<GIT_COMMON_DIR>/ai-simple/claims/`, CLI quản lý, atomic (lock → đọc live claims → normalize → check overlap/protected → temp → rename → release). Read/read OK; write/write, write/protected, ancestor/child block. *(R2: + claim --extend, declared_deps; R6: NTFS spec.)*
- **CLI**: `ai-simple parallel plan|claim|renew|status|ready|merge|recover|release`.
- **Coordination states**: CLEAR / CONFLICT / STALE / PROTECTED — không dùng RED (RED = destructive/prod của NT06). *(R1: + FAILED/ABANDONED trong lifecycle.)*
- **Lifecycle**: PLANNED→CLAIMED→ACTIVE→READY→MERGING→MERGED→RELEASED.
- **Shared zones single-writer**: root CLAUDE.md, shared/, common/, schema/migrations, docs/contracts/, app-map README, global config, global generated docs, global telemetry. *(R2: lockfile chuyển sang generated-at-integration.)* Worker cần đổi → shared-change request.
- **Merge queue**: verify claim+head_sha → worktree clean → rebase lên integration HEAD → targeted tests → ff-merge → regenerate global outputs → affected gates → MERGED → release. *(R1: giao thức viết lại — worker nhả worktree, journal, ancestry check.)*
- **Crash recovery**: lease hết không silent takeover; doctor checklist; dirty/unmerged luôn được bảo vệ.

---

## 6. NT12 v3 — Evidence-Driven Self-Evolution

Không tạo NT14. Khả năng học là phần mở rộng của NT12. (Contract: `methodology/12-self-optimization.md` v3, amendments R10–R14.)

- **Vòng A — Project health**: code đổi → drift? → đo → verify/update/rebuild/retire.
- **Vòng B — Interaction learning**: AI tạo bản đầu → user chỉnh → revision → chấp nhận → extract accepted diff → decision candidate.
- **Vòng C — Skill evolution**: candidate lặp lại → owner logic → regression test → forward-test → proposal → Git branch → review → release → monitor → retain/rollback.

### Học từ accepted diffs

Evidence chain: `base_sha → initial_sha → revisions → accepted_sha`. Learning event ghi run/lot/SHA/user_revisions/changed_paths/inferred_decisions *(R11: kèm enum bằng chứng thay confidence số)*. Không copy code vào memory — SHA và diff là evidence.

Acceptance strength *(R12: có tầng — im lặng+merge = trung bình; survival = vé promote)*. Scope: component → domain/screen → project → user → domain skill → AI Simple core — lưu ở scope nhỏ nhất phù hợp. Destination: component→code/spec; domain→app-map; project→design system/CLAUDE; user→memory; UI/domain pattern→skill chuyên môn; workflow xuyên domain→AI Simple; deterministic→script.

Promotion ladder: OBSERVED→CLASSIFIED→CANDIDATE→VALIDATED→PROPOSED→ACCEPTED→RELEASED→MONITORED *(R13: 3 mức vận hành)*. Security/data-loss: candidate ngay từ 1 case.

Chống học sai: yêu cầu hiện tại > canonical spec > domain rule > user preference > inferred pattern > skill default; hẹp thắng rộng; explicit thắng inference; không biến preference 1 user thành default toàn cầu; core không tự merge từ 1 case; mọi promotion có regression test + rollback condition. *(R13: + defect-vs-preference filter, độc lập giữa case, chống echo-chamber, learned rule có TTL/SUSPECT.)*

---

## 7. NT12 và NT13 phối hợp

Trong parallel mode, worker KHÔNG cùng commit: `docs/app-map/_generated/doc-status.md`, `docs/.fl-routing-log`, `docs/.escaped-drift.log`, `docs/audit-history.md`, global generated files.

| Dữ liệu | Worker | Integrator |
|---|---|---|
| Entity code/doc/test | Commit trong lot | Review |
| Local doc status | Tính on-demand | Regenerate canonical |
| Routing telemetry | Per-session | Aggregate |
| Learning events | Per-session/lot | Aggregate sau accepted merge |
| Escaped drift | Per-session | Aggregate |
| Audit history | Không sửa | Single writer |
| Global generated files | Không commit | Regenerate |

Accepted integration SHA là mốc để tổng hợp learning events của toàn run.

---

## 8. State taxonomy

| Loại state | Ví dụ | Nơi lưu |
|---|---|---|
| Canonical authored | CLAUDE, app-map, ADR, contract | Git |
| Generated cache | schema, routes, doc-status | Integrator/CI |
| Telemetry | routing, drift, learning events | Per-session rồi aggregate |
| Ephemeral coordination | claims, lease, locks | `GIT_COMMON_DIR` |
| Active learned rules | project/user/domain profile | Canonical scoped file |
| Raw evidence | before/after/diffs | Archive, không auto-load |

---

## 9. Context và token

Progressive disclosure: metadata chỉ chứa trigger ngắn; `SKILL.md` chỉ chứa profile selection + core workflow + pointer + hard safety rules (~1.500–2.000 token); references đọc khi trigger; việc deterministic đi vào scripts (claim, path overlap, lease, merge queue, doc status, decision extraction, candidate clustering, benchmark); active learned rules compile gọn; raw evidence không nạp context.

Mục tiêu: regular task context tăng <10%; parallel worker envelope ≤2.000 token trước code; worker handoff ≤200 token; conflict output ≤100 token.

---

## 10. Runtime performance

Pre-commit chỉ chạy fast hard gates (staged paths, migration/contract invariant, covers overlap, active claim conflict, encoding/budget). Việc nặng chạy ở pre-push, merge queue, CI, doctor, audit, learning review.

Mục tiêu: pre-commit p95 Windows ≤500 ms; claim acquisition ≤100 ms *(R7: không tính process spawn)*; claim check 10 claims ≤100 ms; doctor cơ bản ≤2 giây; không model call bổ sung khi deterministic router giải được; coordination overhead <25% *(R7: tính cả node_modules per worktree)*.

---

## 11. Profiles và audit

Profiles: core, scale, contracts, ops, optimization, parallel *(R19: + tiny)*.

```bash
ai-simple init --profile core
ai-simple init --scale --optimization
ai-simple init --scale --ops --parallel
```

Audit không dùng điểm trần cố định: `score = earned / applicable_max × 100`; mỗi nguyên tắc APPLICABLE / NOT_APPLICABLE / DEFERRED.

---

## 12. Cấu trúc skill

```text
SKILL.md            — core workflow, profile selection, reference routing
methodology/        — 01..13
bin/ + lib/         — CLI zero-dep (thực tế thay cho scripts/ trong bản gốc:
                      parallel plan/claim/renew/merge/recover sống ở lib/parallel.js;
                      decision-extract/compile/benchmark là Phase 4–5)
references/         — evaluation-rubric, learning-scope, domain guidance
assets/             — approved reference artifacts khi thật sự cần
```

Không đưa history, raw evidence hoặc ví dụ dài vào `SKILL.md`.

---

## 13. Lộ trình triển khai

### Phase 1 — Giảm complexity hiện tại ✅ (docs-first, phiên 2026-07-28)
- Rút gọn `SKILL.md`; chuyển detail sang references; audit sang applicability; sửa NT04 thành behavior/documented-change invariant; hạ broad `covers` xuống warn (documented); tách fast hook / heavy CI (documented — mechanics Phase 2).

### Phase 2 — NT13 Git-native ✅ (shipped v1.3.0, phiên 2026-07-28)
- `lib/parallel.js` + `ai-simple parallel *`: atomic JSON claims (mkdir lock, write-temp-rename, casefold NTFS), PROTECTED cho dirty user work + re-scan R4, target-branch lease R3, claim --extend R2, DAG/waves qua `plan`, merge queue đúng giao thức R1 (READY = nhả worktree, journal, ancestry check, FAILED fail-eject, resume sau crash), recover checklist; claim fast gate trong pre-commit hook (`CLAIMS_CHECK=auto`) + fixtures; doctor claims checks; `init --profile tiny` + auto-detect (R18–R19); **bộ test nghiệm thu** (`parallel self-test` — số hiện hành xem CHANGELOG; v1.3.1: 42): race atomic 1-winner 100 lượt (20 vòng × 5 concurrent), concurrent-merge không silent-loss, crash-resume, dirty-protection, STALE-no-takeover, casefold, fail-closed corrupt claim, force-run, merge-lock stale takeover, target không bị đụng. Chưa làm: parallel benchmark đo speedup/overhead thật (cần run thật — đo ex-post theo R7).

### Phase 3 — Giải quyết NT12 ↔ NT13
- Per-session telemetry; integrator-generated global state; worker không ghi global logs/generated; canonical regeneration sau merge.

### Phase 4 — Interaction learning (partially shipped)
- ✅ Lệnh `/learn` (R14) — template ship v1.3.0, có bước verify SHA/diff deterministic chống evidence bịa (v1.3.1); metric survival/correction có lệnh đo trong audit template. Còn lại: decision scope classifier tự động, active rule compiler, contradiction resolution tự động — capture hiện là [ACTIVE thủ công].

### Phase 5 — Skill evolution
- Candidate branches; regression corpus; forward-tests bằng context sạch; token/runtime comparison; versioned release và rollback.

### Điều kiện nghiệm thu (mỗi mục = 1 test chạy được, không phải bullet trang trí)
- Dirty repo test không mất dữ liệu; atomic race test đúng 1 claimant thắng (lặp 100 lần trên NTFS); 4 worktree không conflict global state; crash recovery giữ dirty/unmerged; target diverge không bị ghi đè; pre-commit p95 Windows ≤500 ms; Linux + Windows self-tests xanh; speedup/overhead ĐO ex-post (không tự ước); mọi skill update có evidence + regression test + rollback.

---

## 14. Tuyên ngôn

> Git lưu sự thật.
> Context router chỉ tải điều cần biết.
> Invariants bảo vệ thay đổi.
> NT13 chia quyền ghi và tích hợp song song.
> NT12 học từ những diff được user chấp nhận.
> Mọi nâng cấp skill đều đi qua Git, evidence, test và rollback.
> Hệ chỉ phức tạp bên trong; trải nghiệm user phải vẫn đơn giản.
