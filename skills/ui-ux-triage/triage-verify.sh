#!/usr/bin/env bash
# triage-verify.sh — cổng THẬT, REPO-AGNOSTIC, cho skill ui-ux-triage (verify-on-use, không honor-system).
# Đọc .claude/triage.config nếu có; KHÔNG có → auto-discover docs/app-map. Chạy từ repo root.
#   bash triage-verify.sh              # gate trước spawn: exit 0 mới chạy (exit 2 = sai cwd)
#   bash triage-verify.sh --lint-log <file>
#   bash triage-verify.sh --lint-patterns <file>
#   bash triage-verify.sh --config-check   # ghi trạng thái consent NOTIFY (DETECTED, luôn exit 0)
#   bash triage-verify.sh --self-test
set -u

# ---- config (parse an toàn KEY=value, KHÔNG source để khỏi chạy code lạ) ----
# Strip "KEY=", inline comment ( #...), rồi trim 2 đầu. KHÔNG source (chống chạy code lạ).
cfg() { [ -f .claude/triage.config ] && grep -E "^$1=" .claude/triage.config 2>/dev/null | head -1 | sed -E "s/^$1=//; s/[[:space:]]+#.*$//; s/^[[:space:]]+//; s/[[:space:]]+$//"; }
APP_MAP_DIR=$(cfg APP_MAP_DIR); APP_MAP_DIR=${APP_MAP_DIR:-docs/app-map}
# Script telegram sống ở TẦNG USER ngoài repo (v1.11.0) — token qua env user, project không tự chế bản riêng.
TELEGRAM=$(cfg TELEGRAM); TELEGRAM=${TELEGRAM:-$HOME/.ai-simple/notify-telegram.sh}
TRIAGE_LOG=$(cfg TRIAGE_LOG); TRIAGE_LOG=${TRIAGE_LOG:-test-reports/triage/triage-log.md}
READ_REFS_CFG=$(cfg READ_REFS)   # danh sách explicit, phẩy ngăn; rỗng → auto-discover

# ---- consent NOTIFY — tri-state {on, off, unset}, hợp nhất 3 nguồn (v1.11.0, mục Authority 1) ----
# off tường minh ở BẤT KỲ nguồn nào → off; on đòi ≥1 nguồn NGOÀI-repo (user-config/env) on VÀ không nguồn nào off.
# "Mặc định off" là KẾT QUẢ hợp nhất khi không nguồn ngoài-repo nào on — KHÔNG phải giá trị ghi sẵn trong template.
# Kênh env AI_SIMPLE_NOTIFY là per-session — consent bền qua verify-time dùng ~/.ai-simple/config.
# Agent bị CẤM set env này / ghi ~/.ai-simple/config thay user (ADVISORY — SKILL.md §8).
norm_notify() { case "${1:-}" in on|ON|On) echo on;; off|OFF|Off) echo off;; *) echo unset;; esac; }
raw_key() { [ -f "$1" ] && grep -E "^$2=" "$1" 2>/dev/null | head -1 | sed -E "s/^$2=//; s/[[:space:]]+#.*$//; s/^[[:space:]]+//; s/[[:space:]]+$//"; }
consent_resolve() { # $1=root (mặc định .) → on|off
  local root="${1:-.}" r u e
  r=$(norm_notify "$(raw_key "$root/.claude/triage.config" NOTIFY)")
  u=$(norm_notify "$(raw_key "$HOME/.ai-simple/config" NOTIFY)")
  e=$(norm_notify "${AI_SIMPLE_NOTIFY:-}")
  if [ "$r" = off ] || [ "$u" = off ] || [ "$e" = off ]; then echo off; return 0; fi
  if [ "$u" = on ] || [ "$e" = on ]; then echo on; return 0; fi
  echo off
}
# TELEGRAM có thể là path tuyệt đối (tầng user) hoặc tương đối repo.
tg_path() { case "$TELEGRAM" in /*|[A-Za-z]:*|"$HOME"*) echo "$TELEGRAM";; *) echo "$1/$TELEGRAM";; esac; }

# Repo-root thật = .claude/ CỘNG dấu hiệu repo (app-map HOẶC package.json). Repo-agnostic, không hardcode tên doc.
is_repo_root() { [ -d "$1/.claude" ] && { [ -d "$1/$APP_MAP_DIR" ] || [ -f "$1/package.json" ]; }; }

# Resolve read-refs cho 1 root: explicit từ config, hoặc auto-discover *.md trong app-map (bỏ _generated).
resolve_reads() {
  local root="$1"
  if [ -n "$READ_REFS_CFG" ]; then printf '%s\n' "$READ_REFS_CFG" | tr ',' '\n' | sed 's/^ *//; s/ *$//'
  elif [ -d "$root/$APP_MAP_DIR" ]; then ( cd "$root" && find "$APP_MAP_DIR" -maxdepth 2 -name '*.md' 2>/dev/null | grep -v '_generated/' )
  fi
}

check_reads() {
  local root="${1:-.}" rc=0 f
  local refs; refs=$(resolve_reads "$root")
  if [ -z "$refs" ]; then echo "  WARN  không tìm thấy app-map ($APP_MAP_DIR) — repo chưa có doc? (degrade, không stop)"; fi
  # while-read + here-string: chịu được tên file có dấu cách + rc propagate (KHÔNG pipe → khỏi subshell nuốt rc).
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    if [ -f "$root/$f" ]; then echo "  OK   read   $f"
    else echo "  DEAD read   $f  <-- ref chết, HARD STOP"; rc=1; fi
  done <<< "$refs"
  # oracle presence (INFO, KHÔNG gate — repo chưa chạy BA/design vẫn chạy degrade [no-oracle]):
  if [ -d "$root/$APP_MAP_DIR" ]; then
    local oracle; oracle=$( cd "$root" && find "$APP_MAP_DIR" -maxdepth 2 -name '*.md' 2>/dev/null | grep -iE 'ba-spec|design-spec|design-system' | head -1 )
    [ -n "$oracle" ] && echo "  INFO oracle: '$oracle' → composition mode" || echo "  INFO oracle: chưa thấy ba-spec/design-spec → DEGRADE ([no-oracle] trên finding)"
  fi
  # config (telegram) + consent NOTIFY (v1.11.0): degrade là HÀNH VI MẶC ĐỊNH — luôn tạo local report trước;
  # chỉ gửi khi consent hội đủ. Script tồn tại KHÔNG đồng nghĩa user đã consent.
  local consent; consent=$(consent_resolve "$root")
  if [ "$consent" != on ]; then
    echo "  INFO consent NOTIFY=off (hợp nhất 3 nguồn) → DEGRADE: ghi report ra file + PENDING-ASK trong report, KHÔNG gửi telegram"
  elif [ -f "$(tg_path "$root")" ]; then echo "  OK   config $TELEGRAM (consent=on)"
  else echo "  WARN config $TELEGRAM thiếu → DEGRADE: ghi report ra file thay telegram (không stop)"; fi
  # Hậu-kiểm consent [ENFORCED hậu-kiểm — tin đã đi trước khi máy phản ứng]: dòng loop MỚI NHẤT mang telegram=ok
  # với timestamp HÔM NAY mà consent hiện không hội đủ → FAIL. Dòng cũ hơn → không FAIL (chống-oan log lịch sử).
  if [ -f "$root/$TRIAGE_LOG" ]; then
    local lastloop; lastloop=$(grep -E '^[0-9]{4}-[0-9]{2}-[0-9]{2}' "$root/$TRIAGE_LOG" 2>/dev/null | tail -1)
    if [ -n "$lastloop" ] && echo "$lastloop" | grep -q 'telegram=ok' && [ "$consent" != on ]; then
      if [ "${lastloop%% *}" = "$(date +%Y-%m-%d)" ]; then
        echo "  FAIL log hôm nay có telegram=ok nhưng consent NOTIFY không hội đủ tại verify-time (env là per-session — consent bền dùng ~/.ai-simple/config)"; rc=1
      else
        echo "  INFO log cũ có telegram=ok, consent hiện off — không FAIL (hậu-kiểm chỉ xét dòng hôm nay)"
      fi
    fi
  fi
  # E2E harness có nhưng thiếu test-data tracker/cleanup → WARN (cơ-chế-hóa luật 3; KHÔNG block, giữ degrade).
  if [ -d "$root/tests/e2e" ]; then
    local trk="" cln=""
    ( cd "$root" && grep -rq 'trackAccount' tests/e2e 2>/dev/null ) && trk=1
    ( cd "$root" && grep -q 'cleanup' package.json 2>/dev/null ) && cln=1
    if [ -n "$trk" ] && [ -n "$cln" ]; then echo "  OK   e2e-tracker + cleanup cmd"
    else echo "  WARN E2E harness có nhưng THIẾU test-data tracker/cleanup → flow-tester PHẢI degrade, CẤM chạm prod data"; fi
  fi
  # write-target: tự mkdir -p parent
  local d; d=$(dirname "$root/$TRIAGE_LOG")
  mkdir -p "$d" 2>/dev/null && echo "  OK   write   $d/ (đã đảm bảo tồn tại)" || { echo "  FAIL không tạo được $d/"; rc=1; }
  return $rc
}

# ---- lint triage-log (field non-empty; telegram ok|fail|degraded|off) ----
lint_log_line() {
  echo "$1" | grep -qE '^[0-9]{4}-[0-9]{2}-[0-9]{2}[^|]*\| *[^| ][^|]*\| *iter=[0-9]+ *\| *buckets=[^| ][^|]*\| *decided=[^| ][^|]*\| *verify=[^| ][^|]*\| *telegram=(ok|fail|degraded|off)'
}
# Dòng consent do --config-check ghi — prefix máy-đọc RIÊNG `consent |`, KHÁC format loop;
# sai format consent vẫn bị --lint-log bắt (không phải vùng miễn lint).
lint_consent_line() {
  echo "$1" | grep -qE '^consent \| committed=(on|off|unset) \| staged=(on|off|unset) \| worktree=(on|off|unset) \| mismatch=(yes|no)$'
}

# ---- lint feedback_triage_decisions.md (data rows sau separator phải có ×N, last <date>) ----
lint_patterns_file() {
  local f="$1" bad=0 n=0 line seen_sep=0 saw_pipe=0
  [ -f "$f" ] || { echo "lint-patterns: file chưa có (OK nếu chưa học pattern)"; return 0; }
  while IFS= read -r line; do
    case "$line" in "|"*) saw_pipe=1;; esac
    case "$line" in *"---"*) seen_sep=1; continue;; esac
    [ "$seen_sep" -eq 1 ] || continue
    case "$line" in "|"*) ;; *) continue;; esac
    n=$((n+1))
    echo "$line" | grep -qE '×[0-9]+, *[0-9]{4}-[0-9]{2}-[0-9]{2}' || { echo "PATTERN THIẾU Tần suất: $line"; bad=$((bad+1)); }
  done < "$f"
  if [ "$saw_pipe" -eq 1 ] && [ "$seen_sep" -eq 0 ]; then echo "MALFORMED: bảng thiếu separator '---'"; return 1; fi
  echo "lint-patterns: $n dòng, $bad thiếu"; [ "$bad" -eq 0 ]
}

case "${1:-}" in
  --lint-log)
    LOG="${2:?cần đường dẫn log}"; [ -f "$LOG" ] || { echo "log không tồn tại: $LOG"; exit 1; }
    n=0; bad=0
    while IFS= read -r line; do case "$line" in ""|\#*) continue;; esac
      n=$((n+1))
      case "$line" in
        "consent |"*) lint_consent_line "$line" || { echo "DÒNG SAI: $line"; bad=$((bad+1)); } ;;
        *) lint_log_line "$line" || { echo "DÒNG SAI: $line"; bad=$((bad+1)); } ;;
      esac; done < "$LOG"
    echo "lint-log: $n dòng, $bad sai"; [ "$bad" -eq 0 ]; exit $? ;;
  --lint-patterns)
    lint_patterns_file "${2:?cần đường dẫn feedback_triage_decisions.md}"; exit $? ;;
  --config-check)
    # DETECTED — LUÔN exit 0 (hook-mode: mọi phát hiện là cảnh báo, KHÔNG kéo FAIL hook).
    # Ghi BA giá trị NOTIFY: committed (HEAD), staged (:0:), worktree — làm dữ kiện cho hậu-kiểm.
    # Tri-state nguồn: MỌI trường hợp không đọc được (file vắng trong HEAD/index HOẶC unborn HEAD
    # 'fatal: invalid object name HEAD') đều := unset, KHÔNG phải lỗi, KHÔNG tính lệch.
    strip_notify() { grep -E '^NOTIFY=' 2>/dev/null | head -1 | sed -E 's/^NOTIFY=//; s/[[:space:]]+#.*$//; s/^[[:space:]]+//; s/[[:space:]]+$//'; }
    CV=$(norm_notify "$(git show HEAD:.claude/triage.config 2>/dev/null | strip_notify)")
    SV=$(norm_notify "$(git show :0:.claude/triage.config 2>/dev/null | strip_notify)")
    WV=$(norm_notify "$(raw_key .claude/triage.config NOTIFY)")
    # Phép so sinh cảnh báo lấy STAGED làm mốc phía-repo (không phải HEAD — chống warn-lệch oan
    # trên chính commit flip hợp lệ); HEAD vẫn ghi vào record làm vết.
    MM=no
    if [ "$SV" != unset ] && [ "$WV" != unset ] && [ "$SV" != "$WV" ]; then MM=yes; fi
    if [ "$SV" = off ] && [ "$WV" = unset ]; then MM=yes; fi
    LINE="consent | committed=$CV | staged=$SV | worktree=$WV | mismatch=$MM"
    echo "$LINE"
    # Kỷ luật side-effect hook-mode: chỉ APPEND khi trạng thái ĐỔI so với dòng consent gần nhất;
    # repo chưa từng chạy triage (chưa có thư mục log) → stdout only, KHÔNG tạo thư mục/file mới.
    LD=$(dirname "$TRIAGE_LOG")
    if [ -d "$LD" ]; then
      LASTC=$(grep '^consent |' "$TRIAGE_LOG" 2>/dev/null | tail -1)
      [ "$LASTC" != "$LINE" ] && echo "$LINE" >> "$TRIAGE_LOG"
    fi
    exit 0 ;;
  --self-test)
    SELF="$0"; case "$SELF" in /*|[A-Za-z]:*) ;; *) SELF="$(pwd)/$SELF";; esac
    T=$(mktemp -d) || exit 1; RC2=0
    mkdir -p "$T/.claude" "$T/$APP_MAP_DIR" "$T/scripts"
    echo a > "$T/$APP_MAP_DIR/01-x.md"; echo b > "$T/$APP_MAP_DIR/02-y.md"
    # 1) auto-discover + đủ ref → PASS
    if check_reads "$T" >/dev/null; then echo "PASS: auto-discover đủ ref → qua"; else echo "FAIL: chặn oan khi đủ ref"; RC2=1; fi
    # 2) thêm ref chết (config explicit trỏ file không có)? test bằng xoá 1 file đã discover:
    rm "$T/$APP_MAP_DIR/02-y.md"
    if check_reads "$T" >/dev/null; then echo "PASS: discover lại (file xoá không còn trong list) → vẫn qua"; else echo "INFO: (auto-discover tự bỏ file đã xoá — đúng)"; fi
    # 2b) ref chết THẬT qua config explicit
    printf 'READ_REFS=%s/01-x.md,%s/khong-ton-tai.md\n' "$APP_MAP_DIR" "$APP_MAP_DIR" > "$T/.claude/triage.config"
    READ_REFS_CFG="$APP_MAP_DIR/01-x.md,$APP_MAP_DIR/khong-ton-tai.md"
    if check_reads "$T" >/dev/null; then echo "FAIL: config ref chết KHÔNG bị bắt"; RC2=1; else echo "PASS: config ref chết → HARD STOP đúng"; fi
    READ_REFS_CFG=""
    # 3) lint-log
    lint_log_line '2026-06-15 | r | iter=1 | buckets=LOGIC:1 | decided=x | verify=tsc:pass | telegram=ok' && echo "PASS: log đúng" || { echo "FAIL: log đúng bị từ chối"; RC2=1; }
    lint_log_line 'rác' && { echo "FAIL: log sai lọt"; RC2=1; } || echo "PASS: log sai bị bắt"
    lint_log_line '2026-06-15 | r | iter=1 | buckets=D:1 | decided=x | verify=p | telegram=degraded' && echo "PASS: telegram=degraded hợp lệ" || { echo "FAIL: degraded bị từ chối"; RC2=1; }
    lint_log_line '2026-06-15 | r | iter=1 | buckets= | decided= | verify= | telegram=ok' && { echo "FAIL: field rỗng lọt"; RC2=1; } || echo "PASS: field rỗng bị bắt"
    # 4) lint-patterns (header+sep, prose-collision, malformed)
    PF="$T/p.md"; HDR='| Tình huống | pattern | heuristic | Tần suất |\n|---|---|---|---|\n'
    printf "$HDR"'| ok | x | y | ×2, 2026-06-15 |\n' > "$PF"
    lint_patterns_file "$PF" >/dev/null && echo "PASS: bảng thật data đủ → không false-fail header" || { echo "FAIL: false-fail header"; RC2=1; }
    printf "$HDR"'| Nói về Tần suất | x | y |\n' > "$PF"
    lint_patterns_file "$PF" >/dev/null && { echo "FAIL: data 'Tần suất' thiếu ×N lọt"; RC2=1; } || echo "PASS: prose chứa 'Tần suất' thiếu ×N → vẫn bắt"
    printf '| a | b | c | Tần suất |\n| data | x | y | ×1, 2026-06-15 |\n' > "$PF"
    lint_patterns_file "$PF" >/dev/null 2>&1 && { echo "FAIL: thiếu separator pass mù"; RC2=1; } || echo "PASS: thiếu separator → MALFORMED"
    # 5) tên file CÓ DẤU CÁCH không được false-DEAD (bug word-split unquoted refs)
    T2=$(mktemp -d) || exit 1; mkdir -p "$T2/.claude" "$T2/$APP_MAP_DIR" "$T2/scripts"
    echo a > "$T2/$APP_MAP_DIR/01 has space.md"; echo b > "$T2/$APP_MAP_DIR/02-y.md"
    if check_reads "$T2" >/dev/null; then echo "PASS: tên file có dấu cách → KHÔNG false-DEAD"; else echo "FAIL: tên file có dấu cách bị word-split → false HARD STOP"; RC2=1; fi
    # 6) config bẩn (trailing space + inline comment) phải parse trimmed, không degrade-blind
    printf 'APP_MAP_DIR=%s   # ghi chú inline\n' "$APP_MAP_DIR" > "$T2/.claude/triage.config"
    GOT=$(cd "$T2" && cfg APP_MAP_DIR)
    if [ "$GOT" = "$APP_MAP_DIR" ]; then echo "PASS: config bẩn (space+comment) → trim đúng '$GOT'"; else echo "FAIL: config bẩn parse sai → '$GOT'"; RC2=1; fi
    # 7) CWD-guard: dir CHỈ có .claude (không app-map, không package.json) → KHÔNG được nhận là repo root
    T3=$(mktemp -d) || exit 1; mkdir -p "$T3/.claude"
    if is_repo_root "$T3"; then echo "FAIL: dir chỉ-.claude bị nhận là repo root → spawn mù"; RC2=1; else echo "PASS: dir chỉ-.claude → guard từ chối (cần app-map/package.json)"; fi
    is_repo_root "$T" && echo "PASS: dir có .claude+app-map → guard nhận đúng" || { echo "FAIL: repo thật bị guard từ chối"; RC2=1; }
    # 8) E2E harness thiếu tracker/cleanup → WARN; có đủ → OK (cơ-chế-hóa luật 3)
    T4=$(mktemp -d) || exit 1; mkdir -p "$T4/.claude" "$T4/$APP_MAP_DIR" "$T4/tests/e2e/utils"; echo a > "$T4/$APP_MAP_DIR/01-x.md"
    check_reads "$T4" 2>&1 | grep -q 'THIẾU test-data tracker' && echo "PASS: E2E thiếu tracker → WARN" || { echo "FAIL: thiếu tracker không WARN"; RC2=1; }
    echo 'export function trackAccount(){}' > "$T4/tests/e2e/utils/account-tracker.ts"
    printf '{ "scripts": { "test:e2e:cleanup": "x" } }\n' > "$T4/package.json"
    check_reads "$T4" 2>&1 | grep -q 'e2e-tracker + cleanup' && echo "PASS: có tracker+cleanup → OK" || { echo "FAIL: có tracker+cleanup không nhận"; RC2=1; }
    # 9) consent tri-state — hợp nhất 3 nguồn (HOME cô lập, env kiểm soát; fixture 3 ca của kế hoạch v1.11.0)
    TH=$(mktemp -d) || exit 1
    C1=$(HOME="$TH" AI_SIMPLE_NOTIFY= consent_resolve "$T3")
    [ "$C1" = off ] && echo "PASS: consent (a) không nguồn ngoài-repo nào → off (mặc định là kết quả hợp nhất)" || { echo "FAIL: consent (a) → $C1"; RC2=1; }
    mkdir -p "$TH/.ai-simple"; echo 'NOTIFY=off' > "$TH/.ai-simple/config"
    C2=$(HOME="$TH" AI_SIMPLE_NOTIFY=on consent_resolve "$T3")
    [ "$C2" = off ] && echo "PASS: consent (b) env=on + user-config=off → off (off tường minh phủ quyết)" || { echo "FAIL: consent (b) → $C2"; RC2=1; }
    echo 'NOTIFY=on' > "$TH/.ai-simple/config"
    C3=$(HOME="$TH" AI_SIMPLE_NOTIFY= consent_resolve "$T3")
    [ "$C3" = on ] && echo "PASS: consent (c) repo unset + user-config=on → on (happy-path RE-APPLY ghim máy)" || { echo "FAIL: consent (c) → $C3"; RC2=1; }
    mkdir -p "$TH/repo-off/.claude"; echo 'NOTIFY=off' > "$TH/repo-off/.claude/triage.config"
    C4=$(HOME="$TH" AI_SIMPLE_NOTIFY=on consent_resolve "$TH/repo-off")
    [ "$C4" = off ] && echo "PASS: consent (d) repo-off phủ quyết mọi override ngoài-repo" || { echo "FAIL: consent (d) → $C4"; RC2=1; }
    # 10) lint dòng consent + lint-log hỗn hợp (consumer máy sẵn có không BLOCK oan)
    lint_consent_line 'consent | committed=off | staged=on | worktree=on | mismatch=no' && echo "PASS: dòng consent đúng format qua lint" || { echo "FAIL: dòng consent đúng bị chặn"; RC2=1; }
    lint_consent_line 'consent | committed=maybe | staged=off | worktree=off | mismatch=no' && { echo "FAIL: dòng consent sai format lọt"; RC2=1; } || echo "PASS: dòng consent sai format bị bắt"
    LG="$TH/log.md"
    printf '2026-06-15 | r | iter=1 | buckets=D:1 | decided=x | verify=p | telegram=off\nconsent | committed=off | staged=off | worktree=off | mismatch=no\n' > "$LG"
    sh "$SELF" --lint-log "$LG" >/dev/null && echo "PASS: --lint-log nhận dòng consent + telegram=off (chống-oan consumer sẵn có)" || { echo "FAIL: --lint-log chặn oan dòng consent/telegram=off"; RC2=1; }
    printf 'consent | rác không format\n' > "$LG"
    sh "$SELF" --lint-log "$LG" >/dev/null 2>&1 && { echo "FAIL: dòng consent sai format lọt --lint-log"; RC2=1; } || echo "PASS: dòng consent sai format bị --lint-log bắt"
    # 11) --config-check: unborn HEAD sạch (exit 0, committed=unset); append-khi-đổi; flip hợp lệ so mốc STAGED
    TU5=$(mktemp -d) || exit 1
    ( cd "$TU5" && git init -q . && git config user.email t@t.t && git config user.name t && mkdir -p .claude && printf 'NOTIFY=off\n' > .claude/triage.config )
    OUT5=$( cd "$TU5" && sh "$SELF" --config-check 2>&1 ); RC5=$?
    if [ $RC5 -eq 0 ] && echo "$OUT5" | grep -q 'committed=unset'; then echo "PASS: --config-check unborn HEAD → exit 0, committed=unset (không lỗi ở commit đầu)"; else echo "FAIL: unborn HEAD (exit=$RC5): $OUT5"; RC2=1; fi
    ( cd "$TU5" && mkdir -p test-reports/triage && sh "$SELF" --config-check >/dev/null && sh "$SELF" --config-check >/dev/null )
    N1=$(grep -c '^consent |' "$TU5/test-reports/triage/triage-log.md" 2>/dev/null)
    [ "$N1" = "1" ] && echo "PASS: append-khi-đổi (2 lần cùng trạng thái → log không phình)" || { echo "FAIL: append-khi-đổi ghi $N1 dòng"; RC2=1; }
    ( cd "$TU5" && git add -A >/dev/null 2>&1 && git commit -qm c1 >/dev/null 2>&1 \
      && printf '# user-consent: notify-on 2026-08-15\nNOTIFY=on\n' > .claude/triage.config \
      && git add .claude/triage.config && sh "$SELF" --config-check >/dev/null )
    LASTC5=$(grep '^consent |' "$TU5/test-reports/triage/triage-log.md" | tail -1)
    echo "$LASTC5" | grep -q 'mismatch=no' && echo "PASS: flip hợp lệ (mốc STAGED) → mismatch=no, không warn-lệch oan" || { echo "FAIL: flip hợp lệ warn oan: $LASTC5"; RC2=1; }
    # 12) hậu-kiểm consent: log HÔM NAY telegram=ok + consent off → FAIL; user-config=on → PASS; log CŨ → PASS
    TP=$(mktemp -d) || exit 1; mkdir -p "$TP/.claude" "$TP/$APP_MAP_DIR" "$TP/test-reports/triage"; echo a > "$TP/$APP_MAP_DIR/01-x.md"
    TH2=$(mktemp -d) || exit 1
    printf '%s | r | iter=1 | buckets=D:1 | decided=x | verify=p | telegram=ok\n' "$(date +%Y-%m-%d)" > "$TP/test-reports/triage/triage-log.md"
    if HOME="$TH2" AI_SIMPLE_NOTIFY= check_reads "$TP" >/dev/null; then echo "FAIL: telegram=ok hôm nay + consent off KHÔNG bị hậu-kiểm bắt"; RC2=1; else echo "PASS: hậu-kiểm bắt telegram=ok khi consent không hội đủ"; fi
    mkdir -p "$TH2/.ai-simple"; echo 'NOTIFY=on' > "$TH2/.ai-simple/config"
    if HOME="$TH2" AI_SIMPLE_NOTIFY= check_reads "$TP" >/dev/null; then echo "PASS: chống-oan env-ephemeral — user-config=on → hậu-kiểm không FAIL"; else echo "FAIL: user-config=on vẫn bị hậu-kiểm chặn oan"; RC2=1; fi
    rm "$TH2/.ai-simple/config"
    printf '2020-01-01 | r | iter=1 | buckets=D:1 | decided=x | verify=p | telegram=ok\n' > "$TP/test-reports/triage/triage-log.md"
    if HOME="$TH2" AI_SIMPLE_NOTIFY= check_reads "$TP" >/dev/null; then echo "PASS: chống-oan log lịch sử — telegram=ok cũ không FAIL"; else echo "FAIL: log lịch sử bị hậu-kiểm chặn oan"; RC2=1; fi
    rm -rf "$T" "$T2" "$T3" "$T4" "$TH" "$TH2" "$TU5" "$TP"
    echo "--- self-test: $([ $RC2 -eq 0 ] && echo ALL PASS || echo CÓ FAIL) ---"; exit $RC2 ;;
esac

# ---- gate mode ----
# CWD-root guard: chỉ .claude/ là chưa đủ — parent-dir tình cờ có .claude/ sẽ PASS mù trên repo rỗng.
if ! is_repo_root "."; then
  echo "FAIL: không giống repo root (cần .claude/ + $APP_MAP_DIR hoặc package.json). cwd: $(pwd)"; exit 2; fi
RC=0
echo "=== triage-verify (gate trước spawn, repo-agnostic) ==="
check_reads "." || RC=1
echo "=== $([ $RC -eq 0 ] && echo 'PASS — được spawn team' || echo 'FAIL — sửa ref chết trước khi spawn') ==="
exit $RC
