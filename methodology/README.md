# Methodology — 13 nguyên tắc / 13 principles

> 13 nguyên tắc cốt lõi, 5 lớp: **Core** (01–07) cho mọi project; **Scale** (08–10); **Ops** (11); **Optimization & Learning** (12 — ba vòng tự tiến hóa); **Collaboration** (13 — nhiều session song song trên nền Git). Composable — kích hoạt theo profile + trigger, không ép project nào dùng cả 13.
> *(EN: 13 core principles in 5 layers: Core 01–07 for every project; Scale 08–10; Ops 11; Optimization & Learning 12 — the three self-evolution loops; Collaboration 13 — Git-native parallel sessions. Composable — activated per profile and trigger.)*

---

## Index

| # | File | Tóm tắt |
|---|---|---|
| 01 | [hierarchical-context.md](01-hierarchical-context.md) | Root mỏng, link sang module |
| 02 | [app-map-pattern.md](02-app-map-pattern.md) | Doc đánh số, 1 chủ đề/file; > 20 file → phân cấp domain |
| 03 | [context-routing.md](03-context-routing.md) | Slash command + sub-agent |
| 04 | [doc-test-sync.md](04-doc-test-sync.md) | Code = Doc = Test (cùng commit) |
| 05 | [logic-vs-request.md](05-logic-vs-request.md) | Phân loại utterance |
| 06 | [pre-flight-checklist.md](06-pre-flight-checklist.md) | **v3** — Risk tier GREEN/YELLOW/RED: tự chạy với default an toàn, confirm chỉ khi không thể quay đầu |
| 07 | [memory-as-feedback.md](07-memory-as-feedback.md) | Persist preference cross-session |
| 08 | [automated-enforcement.md](08-automated-enforcement.md) | **v2** — Hook chặn, lint cảnh báo, report đo doc-lag |
| 09 | [generated-vs-authored-docs.md](09-generated-vs-authored-docs.md) | **v2** — Người viết "tại sao", máy sinh "cái gì" |
| 10 | [cross-repo-contract.md](10-cross-repo-contract.md) | **v2** — Schema dùng chung = contract đánh version |
| 11 | [ops-layer.md](11-ops-layer.md) | **v2.2** — Runbook per service, state registry, routing sự cố |
| 12 | [self-optimization.md](12-self-optimization.md) | **v3** — 3 vòng: A coupling map + 2 cổng; B học từ accepted diffs (evidence enum, survival/correction rate); C skill evolution qua branch + regression + rollback |
| 13 | [parallel-sessions.md](13-parallel-sessions.md) | **v1 (shipped)** — Lot MECE theo entity + DAG/waves + claim atomic có lease + worktree per lot + integration branch + merge queue (CLI `ai-simple parallel` + hook gate + bộ test nghiệm thu — số hiện hành xem CHANGELOG); dirty work user bất khả xâm phạm |

---

## Triết lý chung

**KHÔNG** làm:
- ❌ Không ép AI thông minh hơn (model bạn dùng vẫn vậy)
- ❌ Không thay thế code review của con người
- ❌ Không loại bỏ hoàn toàn hallucination (chỉ giảm ~80%)

**CÓ** làm:
- ✅ Giảm cold-start cost session mới — onboard chỉ tốn root CLAUDE.md (≤ 6K tokens) + đúng các file được route, thay vì AI tự explore toàn codebase (thường 3–10x tốn hơn)
- ✅ Force tài liệu update đồng bộ với code (invariant cứng — và từ v2: **hook enforce, không tự giác**)
- ✅ Tách câu chuyện (LOGIC) với hành động (REQUEST) → giảm commit nhầm
- ✅ **v2**: Sống sót khi project phình to — docs máy sinh, app-map phân cấp, contract liên repo

---

## Profiles — kích hoạt theo tải, không theo đức tin

Bảng chọn profile (tiny/core/scale/contracts/ops/optimization/parallel → nguyên tắc nào bật) nằm ở `SKILL.md` §Bước 0 — nguồn duy nhất, không lặp ở đây. Nguyên tắc chung: bắt đầu NHỎ NHẤT có thể (project < 10 file → tiny = 01+06), để trigger scale-up (bảng dưới) mở dần các lớp sau. Audit chấm theo applicability — profile chưa bật thì NOT_APPLICABLE, không trừ oan.

---

## Thứ tự áp dụng đề xuất

### Project mới (greenfield)
1. Copy `templates/CLAUDE.md.template` → root, fill placeholder
2. Commit đầu: setup `docs/app-map/README.md` + 2-3 file canonical đầu (pages, db, flows)
3. Commit 5–10: bật Doc+Test sync invariant + **cài pre-commit hook ngay** (nguyên tắc 08 — retrofit hook muộn khó gấp 10 lần)
4. Khi > 5 module: setup `/fl` + `context-router` sub-agent
5. Khi user feedback lặp lại: persist vào memory (nguyên tắc 07)

### Project cũ (retrofit)
1. Đọc 13 nguyên tắc, score project hiện tại từng cái (theo applicability — cái không applicable thì NOT_APPLICABLE, không trừ oan)
2. Pick 2 cái yếu nhất → retrofit trước (thường 02 + 04)
3. Đừng cố retrofit hết 1 lần — chia 5 PR, mỗi PR 1 nguyên tắc

### Khi project phình to (scale-up triggers)
| Trigger | Hành động |
|---|---|
| Root CLAUDE.md chạm 6K tokens | Root diet (nguyên tắc 01 §diet) + hook chặn (08) |
| App-map > 20 file | Phân cấp domain 2 tầng (02 §scaling) |
| DB > 15 migrations / app > 50 routes / content hàng nghìn item | Tách docs máy sinh `_generated/` (09) |
| > 1 repo chia sẻ schema/file/utility | Contract + bảng SYNC (10) |
| Nhiều người/agent commit song song | Hook trên MỌI máy + CI lint (08) + admission gate, lot MECE, claim, integration branch (13) |
| ≥ 1 process chạy nền (cron, agent, pipeline) | Domain `ops/` + runbook per service (11) |
| User phàn nàn "phải confirm lặt vặt" | Re-calibrate tier theo 06 v3 — confirm chỉ cho RED |
| User chỉnh sửa lặp lại cùng pattern qua nhiều bản AI làm | Vòng B learning — learning event từ accepted diff (12 v3 §B) |
| Hệ chạy > 3 tháng chưa từng audit | `/audit` + bật nhịp tháng/quý (12) — detect không có heal thì điểm chỉ đi xuống |

---

## Anti-patterns chung

| Anti-pattern | Hậu quả |
|---|---|
| Root CLAUDE.md > 10K tokens | AI bỏ qua phần cuối |
| Doc viết 1 lần, không update | AI đề xuất sai sau 5 commit |
| Để AI tự explore source code | Token cost ×3, hallucination ×2 |
| Trộn LOGIC + REQUEST | AI commit khi user chỉ hỏi |
| Không có pre-flight | DB prod bị touch nhầm |
| Không có memory | User phải re-explain preference mỗi session |
| Invariant chỉ dựa kỷ luật tay | Drift chắc chắn xảy ra khi scale — phải hook (08) |
| Viết tay doc inventory (schema/routes) | Stale sau 1 tuần — máy sinh (09) |
| Schema chung giữa repo không có contract | Silent break chéo repo (10) |
| Confirm cho việc reversible | User thành nút OK lặt vặt — confirm mất giá trị khi RED thật đến (06 v3) |
| Hệ thống chạy nền không có runbook | Sự cố = đoán mò + bus factor 1 (11) |
| 2 session sửa cùng vùng không claim/không worktree | Merge conflict + lost work (13) |
| Học preference từ 1 lần user im lặng | Rule không stable + echo chamber (12 v3) |

---

## Templates (drop-in, cài qua `ai-simple init`)

| Template | Dùng cho |
|---|---|
| `CLAUDE.md.template` | Root project guide (01) |
| `app-map-README.md.template` / `app-map-doc.md.template` | App-map index + canonical doc (02) |
| `ADR.md.template` | Architecture decision record |
| `context-router.agent.md.template` / `fl.command.md.template` | Routing (03) — kèm cổng doc-status (12) + cổng conflict (13) |
| `pre-commit.hook.template` | Enforcement hook, versioned `.githooks/` + `core.hooksPath`, `--self-test` (08) |
| `doc-health-report.sh.template` | Doc-lag + symbol chết + broken ref + budget; `--status` sinh doc-status.md; `--ci` fail PR (08/12) |
| `runbook.md.template` / `state-registry.md.template` / `ops-schedules.md.template` / `ops-external-services.md.template` | Ops layer (11) |
| `audit.command.md.template` | `/audit` — chấm theo applicability, neo metric (12) |
| `learn.command.md.template` | `/learn` — ghi learning event từ accepted diff, cầu vòng B (12 v3) |
| `contract-doc.md.template` | Cross-repo contract (10) |

---

## Đo lường

Cách biết phương pháp đang work:
- Session mới onboard < 1 phút (từ "session start" đến "AI hỏi clarify đầu tiên")
- Doc-lag = 0 (không doc nào SUSPECT — code trong covers không đổi sau last_verified; đo bằng doc-health-report)
- AI hallucinate file/function < 1 lần / 10 turn
- Commit nhầm khi user chỉ discuss = 0

**v2 — thu thập tự động, không đo tay** (chi tiết: [08-automated-enforcement.md](08-automated-enforcement.md) §Đo lường):
- Doc-lag + ORPHANED + symbol chết: doc-health-report (--ci fail PR; --status sinh doc-status.md cho cổng đọc)
- Token budget trend: hook ghi size CLAUDE.md mỗi commit
- Hallucination rate: bot triage đếm report "AI chẩn đoán sai do doc cũ"
