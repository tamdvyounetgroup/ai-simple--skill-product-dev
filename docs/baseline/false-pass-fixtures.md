# False-pass baseline — 3 ca ĐÃ TÁI HIỆN tại HEAD 2dd42a8 (Wave 0 Nhóm A)

> Load khi: cần đối chiếu trước/sau khi sửa gate (Wave 1/2a) hoặc nghi false-pass mới.
> Ba ca dưới đây là false-pass CÓ THẬT đo được trước v1.11.0 — mỗi ca kèm lệnh tái hiện.
> Sau Wave 1, các lệnh này phải cho kết quả AN TOÀN (exit 1 / bị chặn) — fixture tương ứng
> đã nằm trong `--self-test` của từng script (chạy trong `npm test`).

## Ca 1 — space-filename: verifier SKIP im lặng file có dấu cách → PASS giả

Tại baseline, `for f in $FILES` word-split tên file `ba-spec my feature.md` → từng mảnh không
tồn tại → skip → verifier PASS dù nội dung sai.

```bash
T=$(mktemp -d) && cd "$T" && git init -q . && git config user.email t@t.t && git config user.name t && mkdir -p docs/app-map && printf 'sai\n' > "docs/app-map/ba-spec my feature.md" && git add -A && sh /c/Code/ai-simple--skill-product-dev/skills/ba-flow-logic/ba-verify.sh --staged; echo "exit=$?"
```

- Baseline 2dd42a8: `PASS` (exit 0) — **false-pass**.
- Vá triệt để: Wave 2a mục NUL/space-safe (`find -print0`/`while read`). Wave 1 chưa đổi hành vi ca này.

## Ca 2 — mktemp-fail nhánh `--staged` (production-facing): PASS giả ngay tại gate

`TMP=$(mktemp)` fail → `TMP` rỗng → `git show ":$f" > "$TMP"` fail → `|| continue` → mọi file
staged bị skip im lặng → verifier báo PASS.

```bash
T=$(mktemp -d) && mkdir -p "$T/stub" "$T/r/docs/app-map" && printf '#!/bin/sh\nexit 1\n' > "$T/stub/mktemp" && chmod +x "$T/stub/mktemp" && cd "$T/r" && git init -q . && git config user.email t@t.t && git config user.name t && printf 'sai\n' > docs/app-map/ba-spec-x.md && git add -A && PATH="$T/stub:$PATH" sh /c/Code/ai-simple--skill-product-dev/skills/ba-flow-logic/ba-verify.sh --staged; echo "exit=$?"
```

- Baseline 2dd42a8: `PASS` (exit 0) — **false-pass**.
- Từ v1.11.0: guard `TMP=$(mktemp) || exit 1` → exit 1; fixture "mktemp fail nhanh --staged" trong
  `--self-test` của CẢ BA verifier ba/security/design.

## Ca 3 — hook mktemp-fail: self-test chạy tiếp NGAY TRONG repo thật

`TW=$(mktemp -d); cd "$TW"` — mktemp fail → cd fail → các lệnh sau (git init/commit/checkout branch
fixture) chạy trong repo HIỆN TẠI: ~40 commit lạ, fixture ghi vào working tree, branch bị chuyển.

```bash
# CHỈ chạy trong repo nháp — đây là ca phá repo:
T=$(mktemp -d) && mkdir -p "$T/stub" "$T/r" && printf '#!/bin/sh\nexit 1\n' > "$T/stub/mktemp" && chmod +x "$T/stub/mktemp" && cd "$T/r" && git init -q . && git config user.email t@t.t && git config user.name t && git commit -qm init --allow-empty && cp /c/Code/ai-simple--skill-product-dev/templates/pre-commit.hook.template hook.sh && PATH="$T/stub:$PATH" sh hook.sh --self-test >/dev/null 2>&1; git log --oneline | head -3; git branch --show-current
```

- Baseline 2dd42a8: repo nháp nhận commit lạ / đổi branch — **ghi bẩn ngoài temp**.
- Từ v1.11.0: 7/7 điểm mktemp trong hook template có `|| exit 1` cùng dòng → script dừng ngay,
  `git status` repo sạch; assertion mktemp-guard tập-quét-động trong `npm test` giữ bất biến.

## Máy đếm PASS-sai

Bộ mutation suite đầy đủ + script đếm = chặng (1) của Wave 2a (owner Gate Engineer, KHÔNG chặn Wave 1).
Ba ca trên là hạt giống của suite đó.
