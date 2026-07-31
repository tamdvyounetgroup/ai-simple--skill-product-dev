# 13 — Git-Native Parallel Sessions (điều phối đa session)

> Chia task thành các **LOT MECE** theo business entity, xếp lot thành **wave** theo dependency-DAG; mỗi session giữ đúng 1 lot qua **claim có lease** + 1 branch/worktree riêng; hợp nhất qua **integration branch + merge queue tuần tự**. Contract đóng băng TRƯỚC — song song SAU. Git lưu sự thật; claim chỉ bổ sung điều Git không có: *session nào đang định sửa path nào*.
> *(EN: Split work into MECE lots by business entity, order lots into waves via a dependency DAG; each session holds exactly one lot via a leased claim + its own branch/worktree; integrate through an integration branch + serial merge queue. Freeze contracts FIRST, parallelize AFTER.)*

> **STATUS: OPERATIONAL (Phase 2 shipped — xem CHANGELOG cho version).** CLI `ai-simple parallel plan|claim|extend|renew|status|ready|merge|recover|release|self-test` (lib/parallel.js) + claim fast gate trong pre-commit hook (`CLAIMS_CHECK=auto`) đã tồn tại và có test nghiệm thu (race atomic 100 lượt, concurrent-merge, crash-resume, dirty-protection — chạy `ai-simple parallel self-test`, ~2–4 phút trên Windows, không phải treo). Quy tắc không đổi: **CẤM tự tạo/sửa claim file bằng tay** — chỉ qua CLI. Phần nào còn advisory: xem bảng Enforced vs Advisory bên dưới.

---

## Vấn đề / The problem

Bốn failure mode khi ≥ 2 session cùng đụng một codebase — cũng là bốn câu hỏi vận hành:

1. **Giẫm chân**: 2 session sửa cùng file → merge conflict, lost work.
2. **Mù lẫn nhau**: session A không có cách nào biết session B đang/sẽ đụng gì.
3. **Nổ chéo ở vùng chung**: schema, `shared/`, contracts, config — một bên đổi, mọi bên vỡ.
4. **Chia sai → pending**: lot chờ nhau vô hạn (dependency ngầm), hoặc session chết ôm claim mãi mãi.

---

## Giải pháp — 4 tầng / The four-tier solution

### Tầng 0 — Bảo vệ repo hiện hữu (ÁP DỤNG NGAY, kể cả single-session)

Trước khi sửa code hoặc tạo worktree, ĐỌC đủ: current branch, HEAD SHA, target branch, `git status` (staged / dirty / untracked), worktrees hiện có, lot branches hiện có, active claims (nếu registry tồn tại).

**Cấm tuyệt đối** (hành vi RED theo NT06):
- Tự stash thay đổi của user.
- `reset` / `checkout` đè lên thay đổi chưa commit.
- Di chuyển dirty changes sang worktree khác.
- Xóa branch/worktree không rõ owner.
- Claim (hoặc sửa) path user đang có dirty work.

Dirty paths của user = **synthetic claim PROTECTED** (owner `user-existing-worktree`) — vùng bất khả xâm phạm; phần còn lại của repo vẫn parallelize được. PROTECTED là snapshot có TOCTOU: phải **re-scan dirty/staged tại mỗi lần merge queue nhận lot và trước khi update target branch**; dirty mới giao với claim ACTIVE → CONFLICT nổi lên cho user quyết, không tự xử.

### Tầng 1 — Admission gate + chia lot MECE + DAG/waves

**Admission gate** — chỉ chạy song song khi đủ:
- ≥ 2 lot độc lập, mỗi lot đủ lớn để bù chi phí session (heuristic cấu trúc — KHÔNG dùng "speedup dự kiến ≥ X" tự ước, LLM ước = số bịa; speedup ĐO ex-post và feed về NT12).
- Write-set tách được MECE; shared boundary đã nhận diện; base branch + `base_sha` rõ.
- Không overlap với dirty/PROTECTED paths.
- Task 1-file, task nhỏ, dependency tuyến tính → **single-session**, không nghi thức.

**Lot = vertical slice theo business entity** (đúng rule feature-sliced NT02 §08): code + entity docs + entity tests + acceptance criteria đi cùng lot (NT04). KHÔNG chia theo technical layer (lot-FE/lot-BE) — mọi lot sẽ đụng mọi feature.

Mỗi lot khai: `intent`, `write_paths`, `read_paths`, `depends_on`, `acceptance_tests`, `shared_change_policy`.

**MECE test 3 câu** (trên write-set):
1. *Exclusive* — không path nào thuộc 2 lot? (ancestor/child path cũng là overlap: `src/shop` vs `src/shop/cart` = trùng)
2. *Exhaustive* — hợp các lot phủ hết deliverables?
3. Phát hiện overlap → KHÔNG chia đôi file; extract phần chung thành lot wave-0 hoặc giao orchestrator.

Read/write overlap giữa 2 lot (A đọc P, B ghi P) → **WARN tại claim time** + gợi ý `depends_on` (đẩy A sang wave sau B) — write-set disjoint không chặn được semantic coupling, phát hiện sớm rẻ hơn compile-fail lúc rebase.

**DAG → waves**: wave 0 = shared contract lot (CHỈ khi các lot dùng chung boundary — không ép mọi task có wave 0) → wave 1 = các lot độc lập → wave 2 = integration/e2e. Song song TRONG wave, tuần tự GIỮA wave. Song song không có contract = song song giả: mọi lot sẽ đợi nhau ở chính các file chung.

**Orchestrator–worker (khi ≥ 3 session)**: 1 session điều phối — chia lot, giữ claims sạch, chạy merge queue, là single-writer của shared zones; worker chỉ code trong lot của mình; worker cần đổi shared → dừng, gửi **shared-change request** cho orchestrator (đúng 1 câu).

### Tầng 2 — Claim registry (SHIPPED — lib/parallel.js)

Registry: `<GIT_COMMON_DIR>/ai-simple/claims/` — ephemeral coordination state, KHÔNG commit vào Git (commit claim lên branch tạo chính conflict mà cơ chế này tồn tại để tránh). Worktree tìm registry qua `git rev-parse --git-common-dir`. Claim là JSON **do CLI quản lý** — agent không bao giờ viết tay:

```json
{
  "schema_version": 1,
  "session": "worker-shop-01",
  "run": "hp-rewards",
  "lot": "shop",
  "wave": 1,
  "base_branch": "main",
  "base_sha": "abc123",
  "branch": "lot/hp-rewards/shop",
  "worktree": "C:/work/repo-wt-shop",
  "intent": "Implement rewards shop",
  "write_paths": ["src/features/rewards/shop", "tests/rewards/shop"],
  "read_paths": ["src/features/rewards/types", "docs/contracts/rewards.md"],
  "declared_deps": ["date-fns"],
  "depends_on": ["contract-rewards-v1"],
  "status": "ACTIVE",
  "claimed_at": "2026-07-28T10:00:00Z",
  "renewed_at": "2026-07-28T10:20:00Z",
  "lease_until_epoch": 1785212400,
  "original_head_sha": "def456",
  "head_sha": "def456"
}
```

- **Atomic acquire**: acquire registry lock → đọc live claims → normalize paths → check overlap → check PROTECTED → ghi temp file → atomic rename → release lock.
- **Overlap luật**: read/read OK; write/write, write/PROTECTED, ancestor/child → block.
- **Claim ĐỘNG** — write-set khai trước của LLM sẽ sai thường xuyên, coi là chuyện thường: `claim --extend` đi qua đúng lock + overlap check; first-extend-wins, bên thua → `depends_on` hoặc shared-change request. Tạo file MỚI ngoài write_paths: PHẢI extend trước (quy tắc cứng 4) — máy chỉ chặn được khi path đó nằm trong claim của lot khác; ngoài mọi claim thì đây là kỷ luật ADVISORY (bảng dưới). Rename có đích ra ngoài write_paths = extend BẮT BUỘC; rename file ngoài lot mình = cấm (đó là refactor cross-lot → lot riêng).
- **Lease + renew**: `renewed_at` bump mỗi commit; hết lease = STALE, **không silent takeover** — thu hồi phải qua recovery checklist (dưới).
- **Windows/NTFS spec (Phase 2 bắt buộc)**: lock = mkdir-based (atomic cả 2 OS) + owner/epoch + stale threshold; update claim = write-temp-rename KHÔNG đè + retry backoff EPERM/EBUSY (antivirus giữ handle); normalize path repo-relative, forward-slash, **case-fold trên win32/macOS** (`src/User` ≡ `src/user`).
- **Target-branch lease**: 1 target branch chỉ 1 run ACTIVE (claim run-level trong cùng registry) — chặn 2 run song song cùng nhắm main làm base_sha của nhau stale.

CLI (shipped): `ai-simple parallel plan | claim | extend | renew | status | ready | merge | recover | release | self-test`.

**Coordination states** — KHÔNG mượn RED (RED chỉ dành cho destructive/prod của NT06):

| State | Nghĩa | Hành xử |
|---|---|---|
| CLEAR | Không giao với claim nào | Làm |
| CONFLICT | Session khác giữ write-set giao nhau | Dừng — đợi / đổi ranh giới / depends_on |
| STALE | Lease hết nhưng branch/worktree chưa xác minh | Recovery checklist, không takeover |
| PROTECTED | Dirty work của user hoặc shared single-writer | Bất khả xâm phạm — hỏi user/orchestrator |

### Tầng 3 — Integration branch + merge queue (giao thức đúng Git-reality)

```text
target branch  : main / develop / branch user đang dùng  ← KHÔNG merge thẳng
integration    : integrate/<run-id>                       ← merge queue vận hành ở đây
worker branch  : lot/<run-id>/<lot-name>                  ← mỗi branch 1 worktree riêng
```

Integration branch: bảo vệ working tree hiện tại; nơi test trạng thái tích hợp; giữ bằng chứng nếu run fail; bàn giao cho user review mà chưa đụng target. Target chỉ update khi integration xanh + target không diverge bất ngờ + đúng quyền user cấp.

**Lifecycle lot** (có đường thất bại — fail-eject, 1 lot hỏng không đóng băng wave):

```text
PLANNED → CLAIMED → ACTIVE → READY → MERGING → MERGED → RELEASED
                       ↑         │        │
                       └─ FAILED ┘        └→ ABANDONED (release claim, giữ branch forensics)
                       (về ACTIVE kèm lý do, giữ claim)
```

**READY nghĩa là "worker đã NHẢ worktree"** — không chỉ "worker nói xong". Lý do cứng: Git TỪ CHỐI rebase/checkout một branch đang checked-out ở worktree khác; và worker process còn sống ghi vào worktree trong lúc queue thao tác = 2 writer 1 worktree.

**Merge queue** (tuần tự, 1 lot/lần — không bao giờ merge 2 lot song song):

1. Verify claim + `head_sha` (bằng **ancestry check** `git merge-base --is-ancestor`, không so SHA bằng nhau — rebase hợp lệ đổi SHA).
2. Verify worker worktree clean → **detach/remove worktree** của lot.
3. Ghi **journal** `<claims>/merging-<lot>.json` ({step, original_head_sha, post_rebase_sha}) TRƯỚC mỗi bước — crash giữa queue → recovery đọc journal, phân biệt được "rebase hợp lệ của queue" với "ai đó sửa bậy branch".
4. Rebase lot branch lên integration HEAD (trong workspace của queue).
5. Targeted tests + contract tests. Fail → **FAILED**, eject, queue tiếp lot kế.
6. Fast-forward merge vào integration.
7. Regenerate global outputs (generated docs, **lockfile** — xem dưới).
8. Affected gates → MERGED → release claim (xóa claim cùng lúc).

Cuối wave: relevant suite. Cuối run: full suite + handoff cho user.

**Shared zones single-writer** (chỉ lot wave-0 / orchestrator được ghi): root CLAUDE.md, `shared/`, `common/`, schema/migrations, `docs/contracts/`, app-map README, global config, global generated docs, global telemetry. **Lockfile KHÔNG thuộc shared zone** — nó là generated artifact: worker khai `declared_deps` trong claim, KHÔNG commit lockfile; integrator install + regenerate ở bước 7. Barrel/registry file (`index.ts`, route registry): append-only region hoặc giao integrator.

**Crash recovery** (lease hết ≠ được takeover) — doctor checklist:

```text
branch còn không? → worktree còn không? → worktree dirty không? →
branch ahead base bao nhiêu commit? → head_sha là ancestor của claim ghi nhận? →
đã merge chưa? → có untracked artifacts không? → có journal MERGING dở không?
```

Dirty hoặc unmerged work LUÔN được bảo vệ — chỉ release claim khi branch đã merge hoặc user/orchestrator quyết định ABANDON.

---

## Quy tắc cứng / Hard rules

1. **Chưa claim thì chưa gõ phím** — claim TRƯỚC edit đầu tiên; 1 lot = 1 branch = 1 worktree = 1 claim.
2. **Claim do CLI tạo, không viết tay** — agent tự chế claim JSON = state rác đầu độc orchestrator.
3. **Worker không đụng shared zone** — cần đổi → dừng, shared-change request, đợi orchestrator.
4. **Write-set đổi thì extend trước khi ghi** — file mới/rename ngoài write_paths chưa extend = CONFLICT.
5. **STALE không bao giờ bị silent takeover** — recovery checklist trước, dirty/unmerged bất khả xâm phạm.
6. **READY = đã nhả worktree** — worker còn giữ worktree thì queue không được nhận lot.
7. **Merge queue tuần tự tuyệt đối** — 1 lot/lần; fail thì eject (FAILED/ABANDONED), không block wave.
8. **Target branch thiêng liêng** — chỉ update từ integration xanh, sau re-scan PROTECTED, đúng quyền user cấp.

---

## Enforced vs Advisory (trung thực về cái gì đang được máy chặn — đối chiếu lại mỗi khi đổi code)

| Quy tắc | Cơ chế | Trạng thái |
|---|---|---|
| Claim atomic, overlap block (write/write, ancestor/child, casefold NTFS) | CLI `parallel claim/extend` — mkdir lock + write-temp-rename; **claim JSON hỏng → FAIL-CLOSED** (chặn mọi claim/status, dọn qua `release --force`) | ✅ ENFORCED (self-test: race 100 lượt 1-winner/vòng, corrupt-claim) |
| Dirty work của user = PROTECTED | CLI chặn claim/merge đụng dirty + re-scan tại merge (R4). Phạm vi scan: worktree HIỆN TẠI — dirty ở worktree khác được che bởi branch-exclusivity của git + quy tắc "không đụng worktree lạ" (tầng 0) | ✅ ENFORCED (+ prompt-level ngoài CLI) |
| Staged path ∩ claim branch khác → BLOCK tại commit | Hook `CLAIMS_CHECK=auto` (fencing cho lease); path space bị CLI reject từ lúc claim nên không lọt gate | ✅ ENFORCED (fixture hook self-test) |
| STALE không silent takeover (cả lot claim lẫn run-lease) | CLI chặn cả STALE; run-lease STALE cần `--force-run` SAU recover; recover checklist; doctor WARN | ✅ ENFORCED |
| Target-branch lease — 1 run/target (R3); lease SỐNG theo hoạt động (renew/extend/ready/merge đều bump) | CLI run-lease trong registry | ✅ ENFORCED |
| **Merge queue TUẦN TỰ** — merge-lock per-run giữ suốt + **CAS `git update-ref <new> <expected>`** tại bước ff (2 merge đồng thời: bên thua bị eject READY có báo, không silent-loss) | CLI `parallel merge` | ✅ ENFORCED (self-test: 4 vòng concurrent-merge) |
| Merge queue: READY = nhả worktree, journal, ancestry, resume sau crash | CLI `parallel merge/recover` (+ `git worktree prune` tự động) | ✅ ENFORCED (self-test: crash-resume) |
| File MỚI/write-set đổi phải `extend` TRƯỚC khi ghi (quy tắc cứng 4) | Máy chỉ chặn khi path thuộc claim lot khác; ngoài mọi claim = kỷ luật | ⚠️ ADVISORY |
| Shared zone single-writer / worker không commit global generated | Prompt-level (quy tắc cứng 3) — hook chỉ chặn khi shared path nằm trong claim khác | ⚠️ ADVISORY |
| Targeted tests trong queue; regenerate global outputs + affected gates (bước 7–8) | `--test-cmd` tùy chọn; regenerate/gates = việc integrator sau merge (CLI in nhắc) | ⚠️ ADVISORY (khuyến nghị luôn truyền --test-cmd) |
| `renew` mỗi commit của worker | Không có cơ chế nhắc — worker tự kỷ luật (lease hết thì thành STALE, hệ vẫn an toàn) | ⚠️ ADVISORY |
| MECE khi chia lot | `parallel plan` kiểm Exclusive + DAG; **Exhaustive do NGƯỜI kiểm** (máy không biết deliverables đủ chưa) | ⚠️ Máy verify E-xclusive, người kiểm E-xhaustive |

---

## Chạy 2 session end-to-end — chuỗi lệnh làm theo được / Two-session walkthrough

```bash
# 0) Orchestrator: chia lot + verify MECE (lots.json: {"lots":[{"lot":"shop","write_paths":["src/shop"],
#    "read_paths":["src/types"],"depends_on":[]},{"lot":"scoring","write_paths":["src/scoring"],"depends_on":[]}]})
npx ai-simple parallel plan --file lots.json          # ME: PASS + Wave 1: shop ∥ scoring → đáng song song

# 1) Claim từng lot (atomic — thua overlap là dừng ngay tại đây, không phải lúc merge)
npx ai-simple parallel claim --run hp --lot shop    --paths src/shop,tests/shop --base-branch main
npx ai-simple parallel claim --run hp --lot scoring --paths src/scoring         --base-branch main

# 2) Mỗi session một branch + worktree riêng (claim KHÔNG tự tạo — bạn tạo, tên khớp claim)
git branch lot/hp/shop main && git worktree add ../repo-wt-shop lot/hp/shop
git branch lot/hp/scoring main && git worktree add ../repo-wt-scoring lot/hp/scoring

# 3) Worker code trong worktree của mình; MỖI COMMIT kèm renew (giữ lease sống)
cd ../repo-wt-shop && ...code... && git commit -m "feat: shop"
npx ai-simple parallel renew --run hp --lot shop

# 4) Lot xong → READY (tự verify clean + NHẢ worktree + ghi head)
npx ai-simple parallel ready --run hp --lot shop

# 5) Orchestrator merge TUẦN TỰ từng lot READY (luôn truyền test)
npx ai-simple parallel merge --run hp --lot shop    --test-cmd "npm test"
npx ai-simple parallel merge --run hp --lot scoring --test-cmd "npm test"

# 6) Cuối run: full suite trên integrate/hp → bàn giao cho user review → USER quyết merge vào main
git checkout integrate/hp && npm test
# (worker chết giữa chừng? → npx ai-simple parallel recover --run hp --lot <lot> — đọc checklist, không takeover)
```

---

## Bốn câu hỏi vận hành / The four operational questions

| Câu hỏi | Trả lời |
|---|---|
| Chia lot thế nào cho tối ưu? | Vertical slice theo business entity (NT02) + MECE test 3 câu trên write-set + DAG→waves; overlap → extract lot wave-0 |
| Làm sao không pending? | Contract-first wave 0; lot nhỏ (≤ 1 ngày công); lease + STALE + recovery; fail-eject không block wave |
| Làm sao không giẫm chân? | Claim atomic + PROTECTED cho dirty user + worktree cách ly + shared zone single-writer + merge queue tuần tự |
| Session này biết session kia sửa gì bằng cách nào? | Đọc claim registry trong pre-flight (NT06) + `/fl` cổng conflict (NT03) trả CLEAR/CONFLICT/PROTECTED ≤ 100 token |

---

## Móc vào nguyên tắc khác

| NT | Quan hệ |
|---|---|
| 02 | Ranh giới lot = domain/feature-slice của app-map; skeleton `features/<entity>/` là việc của wave 0 |
| 03 | Router thêm cổng conflict: task paths ∩ active claims → CLEAR/CONFLICT/PROTECTED |
| 04 | Doc + test đi cùng lot; doc thuộc shared zone → deferred-doc-at-integration (integrator commit ở bước merge) |
| 06 | Pre-flight đọc Git state + claims; CONFLICT/PROTECTED ≠ RED — RED vẫn chỉ dành cho destructive/prod |
| 08 | Claim fast gate ở pre-commit (fast); merge queue gates (heavy) |
| 10 | Wave 0 = contract lot; shared boundary versioned theo NT10 |
| 11 | "1 writer / 1 state" mở rộng thành "1 writer / 1 write-set" |
| 12 | Worker không ghi global generated/telemetry — integrator aggregate (xem 12 §NT13); speedup/overhead đo ex-post feed vòng A/B |

---

## Non-goals (nói thẳng)

- **Single-machine only** — registry trong `GIT_COMMON_DIR`, không phối hợp cross-machine (team phân tán → escalate lên PR/branch protection của forge).
- **Không hỗ trợ git submodules** trong worktree per lot.
- **Queue serial, không batching/speculation** — đủ cho N = 2–4 session; đây không phải GitHub merge queue.
- **Không thay code review** — integration branch bàn giao cho user review trước khi vào target.
- **Path có space/quote/control** — CLI reject từ lúc claim (gate sh không word-split an toàn được).
- **Full Unicode casefold** — chỉ NFC + toLowerCase (đủ cho NTFS/APFS thông thường); İ/ß và các case đặc biệt không xử.

---

## Anti-patterns

| Anti-pattern | Hậu quả |
|---|---|
| Chia lot theo technical layer (lot-FE/lot-BE) | Mọi lot đụng mọi feature — MECE vỡ ngay wave 1 |
| Claim cả repo "cho chắc" | Giết song song; claim = write-set tối thiểu |
| Claim không lease / viết claim tay | Session chết ôm lot mãi mãi; state rác |
| Commit claim file lên branch | Tạo chính conflict mà claim sinh ra để tránh |
| Merge 2 lot song song / merge thẳng vào target | Mất khả năng bisect + phá working tree user |
| Worker "tiện tay" sửa shared/lockfile | Nổ chéo mọi lot; lockfile là generated — để integrator |
| Song song hóa task 1-file | Overhead > task — admission gate tồn tại để nói KHÔNG |
| So sánh head_sha bằng nhau sau rebase | Rebase hợp lệ đổi SHA — dùng ancestry check |

---

## Checklist áp dụng / Adoption checklist

- [ ] Đã đọc đủ Git state (tầng 0) trước mọi thao tác — kể cả single-session
- [ ] Admission gate pass (≥ 2 lot độc lập, MECE, base_sha rõ, không đụng PROTECTED)
- [ ] Wave 0 contract lot chạy xong TRƯỚC khi tách song song (nếu có shared boundary)
- [ ] Mỗi lot: claim CLI + branch `lot/<run>/<lot>` + worktree riêng
- [ ] Merge queue có journal; cuối run: full suite + handoff; claims released hết
- [ ] Cuối run (nếu có learning events per-lot): integrator chạy `/learn` cấp run — gom `docs/learning/events/<run>-*.jsonl` → `docs/learning/events.jsonl` (12 v3 §NT13)
- [ ] Doctor: không claim STALE/orphan; `_generated` do integrator regenerate
- [ ] `ai-simple parallel self-test` xanh trên máy này (race 100 lượt/concurrent-merge/crash/dirty — số test hiện hành xem CHANGELOG; ~2–4 phút trên Windows)
- [ ] Hook cài với `CLAIMS_CHECK=auto` (fencing tại commit-time)

---

## Câu khẩu hiệu / Slogan

> "Đóng băng contract trước — song song sau. Chưa claim thì chưa gõ phím. Dirty work của user là bất khả xâm phạm."
