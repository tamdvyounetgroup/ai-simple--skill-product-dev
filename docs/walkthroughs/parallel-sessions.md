# Walkthrough — 2 AI session cùng sửa 1 repo, không đụng nhau (NT13)

Đi tay từng bước với 1 ví dụ thật: build màn dashboard mới trong khi session khác viết test E2E.
Mọi lệnh chạy từ repo đã `ai-simple init`. Toàn bộ state nằm trong `<GIT_COMMON_DIR>/ai-simple/`
(claim JSON + journal) — không server, không DB, chỉ Git.

## 0. Chia lot (MECE) — 1 lần, do orchestrator/người

Tạo `lots.json` — mỗi lot một vùng ghi, không giẫm nhau, phụ thuộc khai tường minh:

```json
{
  "run": "dashboard-v2",
  "lots": [
    { "lot": "ba-spec",   "write_paths": ["docs/app-map/05-ba-spec.md"],                          "depends_on": [] },
    { "lot": "ui-design", "write_paths": ["docs/app-map/06-design-spec.md", "src/app/dashboard"], "depends_on": ["ba-spec"] },
    { "lot": "e2e",       "write_paths": ["tests/e2e"], "read_paths": ["src/app/dashboard"],      "depends_on": ["ui-design"] }
  ]
}
```

```bash
npx ai-simple parallel plan --file lots.json
```

`plan` chạy MECE test (2 lot ghi chồng path → từ chối), topo-sort thành waves
(ba-spec → wave 1; ui-design → wave 2; e2e → wave 3) và admission gate: không đủ 2 lot
độc lập cùng wave thì nó nói thẳng "single-session nhanh hơn" — đừng song song lấy được.

## 1. Mỗi session CLAIM lot của mình

Session A (sau khi ba-spec đã merge):

```bash
npx ai-simple parallel claim --run dashboard-v2 --lot ui-design --paths "docs/app-map/06-design-spec.md,src/app/dashboard" --intent "build màn dashboard theo ba-spec" --lease-hours 8
```

Claim là file JSON atomic (mkdir-lock + write-temp-rename): 2 session cùng claim 1 lot →
đúng 1 bên thắng. Claim thành công tự tạo **worktree riêng** + branch `lot/dashboard-v2/ui-design`
— session làm việc trong worktree đó, không đụng working tree chính.

Session B claim `e2e` cùng cách. Nếu B lỡ sửa file thuộc write-set của A → **pre-commit hook
chặn ngay tại commit** (claim gate 1c, `CLAIMS_CHECK=auto`) — lease có fencing bằng máy,
không phải lời hứa.

## 2. Trong lúc làm

```bash
npx ai-simple parallel renew  --run dashboard-v2 --lot ui-design   # mỗi commit — bump lease
npx ai-simple parallel extend --run dashboard-v2 --lot ui-design --paths "src/components/kpi"  # cần thêm vùng ghi → qua overlap check, first-wins
npx ai-simple parallel status                                       # ai đang giữ gì, lot nào STALE
```

## 3. Xong → READY → MERGE (queue tuần tự, không silent-loss)

```bash
npx ai-simple parallel ready --run dashboard-v2 --lot ui-design    # verify clean + NHẢ worktree + ghi head
npx ai-simple parallel merge --run dashboard-v2 --lot ui-design --test-cmd "npm test"
```

`merge` cầm merge-lock per-run, rebase lot lên integration branch trong worktree tạm, chạy
`--test-cmd`, rồi fast-forward bằng CAS `git update-ref` — 2 merge đồng thời không thể cùng
thắng; bên thua bị eject về READY (đã rebase sẵn, chạy merge lại là tiếp). Từng bước ghi
journal → crash giữa chừng thì:

```bash
npx ai-simple parallel recover --run dashboard-v2 --lot ui-design  # checklist resume từ journal, không bao giờ silent takeover
```

## 4. Kết thúc

```bash
npx ai-simple parallel release --run dashboard-v2 --lot ui-design   # trả claim (worktree dirty thì từ chối, --abandon để bỏ)
```

## Luật sống còn (guard trong skills/ai-simple-product-dev/SKILL.md)

- Claim CHỈ qua CLI — cấm tự tạo/sửa JSON trong `GIT_COMMON_DIR` tay (state rác đầu độc orchestrator).
- STALE ≠ tự lấy: lot của session chết phải qua `recover`, muốn takeover phải `--force-run` SAU recover.
- Không đủ 2 lot độc lập → đừng song song. Admission gate của `plan` nói không là không.

Cơ chế chi tiết + bộ test nghiệm thu (số hiện hành xem CHANGELOG): `methodology/13-parallel-sessions.md` + `npx ai-simple parallel self-test`.
