#!/bin/sh
# ai-simple-version: 1.11.0
# pretooluse-git-guard.sh — PreToolUse guard cho Claude Code (v1.11.0, OPT-IN — user tự bật,
# `ai-simple init` chỉ IN hướng dẫn, KHÔNG tự cài; xem skills/ui-ux-triage/SKILL.md §12 mục 2).
#
# Nhãn: ENFORCED phạm-vi-hẹp — match pattern chuỗi lệnh: RÀO VÔ Ý, KHÔNG chặn biến thể lách
# chủ đích (biến shell, `command git`, alias, script trung gian). Chặn lệnh phá dirty của user
# (NT13/ADR-001): git reset / git stash / git restore ở vị trí SUBCOMMAND · git checkout -- <path>.
# `git checkout -b` / `git log --grep reset` / `git commit -m "reset ..."` là hợp lệ — KHÔNG chặn
# (fixture chống-BLOCK-oan bắt buộc bên dưới).
#
# Contract stdin: JSON PreToolUse — đọc tool_input.command. Exit 2 = DENY (stderr hiện cho agent),
# exit 0 = allow. Không parse được stdin → allow (fail-open: guard vô ý không được khoá tool).
# LƯU Ý đo-trước-tin: mẫu JSON trong fixture viết theo docs public của Claude Code; lần đầu bật
# thật hãy chụp 1 mẫu stdin thật (thêm `tee /tmp/pretooluse-sample.json` vào command) để đối chiếu.
#
# Wiring — user tự thêm vào .claude/settings.json của repo:
#   {"hooks":{"PreToolUse":[{"matcher":"Bash","hooks":[{"type":"command","command":"sh .claude/pretooluse-git-guard.sh"}]}]}}
set -u

scan_cmd() { # $1 = chuỗi lệnh; in "deny:<lý do>" nếu phạm luật, im lặng nếu hợp lệ
  printf '%s\n' "$1" | awk '
    {
      n = split($0, t, /[[:space:]]+/)
      for (i = 1; i <= n; i++) {
        w = t[i]; gsub(/^[(;]+|[);]+$/, "", w)
        if (w == "git") {
          j = i + 1
          while (j <= n) {
            if (t[j] == "-C" || t[j] == "-c") { j += 2; continue }
            if (t[j] ~ /^--(git-dir|work-tree|namespace)=/ || t[j] == "--no-pager" || t[j] == "-P") { j++; continue }
            break
          }
          sc = t[j]
          if (sc == "reset" || sc == "stash" || sc == "restore") { print "deny:" sc; exit }
          if (sc == "checkout") { for (k = j + 1; k <= n; k++) if (t[k] == "--") { print "deny:checkout--"; exit } }
        }
      }
    }'
}

if [ "${1:-}" != "--self-test" ]; then
  IN=$(cat 2>/dev/null || true)
  CMD=$(printf '%s' "$IN" | tr '\n' ' ' | sed -nE 's/.*"command"[[:space:]]*:[[:space:]]*"((\\.|[^"\\])*)".*/\1/p' | sed 's/\\"/"/g; s/\\\\/\\/g')
  [ -z "$CMD" ] && exit 0
  V=$(scan_cmd "$CMD")
  if [ -n "$V" ]; then
    echo "ai-simple git-guard DENY ($V): lệnh phá dirty user bị chặn — revert chỉ qua patch-file của chính loop (git apply -R), xem skills/ui-ux-triage/SKILL.md §4.4 (NT13/ADR-001)." >&2
    exit 2
  fi
  exit 0
fi

# ---- --self-test: fixture chạy STANDALONE (stdin JSON theo contract), không cần Claude Code runtime ----
SELF="$0"; case "$SELF" in /*|[A-Za-z]:*) ;; *) SELF="$(pwd)/$SELF";; esac
RC=0
run_case() { # $1=mô tả  $2=command-string  $3=expect (deny|allow)
  printf '{"tool_name":"Bash","tool_input":{"command":"%s"}}' "$2" | sh "$SELF" >/dev/null 2>&1
  got=$?
  if [ "$3" = deny ]; then
    [ "$got" -eq 2 ] && echo "PASS: deny  — $1" || { echo "FAIL: '$1' phải DENY (exit=$got)"; RC=1; }
  else
    [ "$got" -eq 0 ] && echo "PASS: allow — $1" || { echo "FAIL: '$1' bị DENY oan (exit=$got)"; RC=1; }
  fi
}
run_case 'git reset --hard' 'git reset --hard' deny
run_case 'git -C . reset --hard (near-miss global-opt)' 'git -C . reset --hard' deny
run_case 'git checkout -- . (đè dirty)' 'git checkout -- .' deny
run_case 'git stash' 'git stash' deny
run_case 'git restore x' 'git restore x' deny
run_case 'git status' 'git status' allow
run_case 'git checkout -b lot/x (kỷ luật branch riêng CẦN lệnh này)' 'git checkout -b lot/x' allow
run_case 'git log --grep reset (từ cấm làm DỮ LIỆU)' 'git log --grep reset' allow
run_case 'git commit -m reset-counters (từ cấm trong message)' 'git commit -m \"reset counters\"' allow
run_case 'lệnh không phải git' 'npm test' allow
printf 'khong phai json' | sh "$SELF" >/dev/null 2>&1
[ $? -eq 0 ] && echo "PASS: allow — stdin không parse được (fail-open, không khoá tool)" || { echo "FAIL: stdin rác bị deny"; RC=1; }
[ "$RC" -eq 0 ] && echo "pretooluse-git-guard self-test: ALL PASS" || echo "pretooluse-git-guard self-test: CO FAIL"
exit $RC
