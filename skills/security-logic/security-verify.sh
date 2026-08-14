#!/bin/sh
# security-verify.sh — CONG MAY cho security-logic (anh em voi ba-verify.sh / triage-verify.sh).
# Co gioi hoa luat "khong co 'da bao mat ✓' — chi co 'phu A/B, KHONG phu C'" (methodology/14).
#
# BLOCK (exit 1) khi security-review:
#   - thieu frontmatter coupling: Load khi / covers / last_verified / ttl_days
#   - thieu 'declared-coverage:' tren frontmatter (khai 3 vung A/B/C)
#   - khong map khung nao (khong co ma OWASP LLM01-10 HOAC A01-10) -> finding "cam giac", khong hanh dong duoc
#   - thieu dong out-of-scope nhac 'pentest' (contract "KHONG thay the pentest production")
# WARN (khong chan): cau over-claim ("da bao mat ✓" / "100% an toan" / "khong co lo hong").
#
# DUNG:
#   bash security-verify.sh            # lint moi security-review trong docs/app-map (doc tren dia)
#   bash security-verify.sh --staged   # lint NOI DUNG DA STAGE (git show :file) — cho pre-commit
#   bash security-verify.sh --self-test
#
# WIRE VAO PRE-COMMIT (chan that) — them vao .githooks/pre-commit cua project:
#   if ! sh .claude/skills/security-logic/security-verify.sh --staged; then FAIL=1; fi
# (qua junction -> ban global moi nhat; KHONG copy thu muc -> tranh drift, bai hoc #08/#10.)

set -u
APP_MAP_DIR="${APP_MAP_DIR:-docs/app-map}"
MODE="${1:-all}"

# Vung frontmatter = tu dau file toi HEADING '## ' dau tien (max 30 dong)
frontmatter_region() { awk 'NR<=30 && /^## /{exit} NR<=30{print}' "$1"; }

# Cau over-claim -> WARN (khong chan). Tach 2 phep de tranh phu thuoc dau tieng Viet trong regex:
# (a) dau tick ✓ tren CUNG dong voi tu bao-mat; (b) cac cum tuyet-doi ASCII-safe.
# Loai NGU CANH PHU DINH khoi (a): dong nhac LUAT VANG "KHONG 'da bao mat ✓'" la menh lenh CAM, khong phai
# tuyen bo -> khong duoc WARN oan. (b) van bat "khong co lo hong" vi do LA cau over-claim tuyet-doi.
# LUU Y case-fold: grep -i o C-locale KHONG fold chu cai co dau tieng Viet (Ô != ô). Nen phai liet ke
# CA bien the HOA co dau ('BẢO MẬT'/'AN TOÀN' cho phat hien; 'KHÔNG'/'LUẬT VÀNG' cho loai tru) — neu khong,
# over-claim VIET HOA co dau se LOT phat hien, va dong LUAT VANG VIET HOA se bi WARN oan (fixture case 8/9).
overclaim_hits() {
  grep -nE '✓' "$1" 2>/dev/null \
    | grep -iE 'bao mat|bảo mật|BẢO MẬT|secure|an toàn|an toan|AN TOÀN' \
    | grep -viE 'khong|không|KHÔNG|cấm|CẤM|cam |never|đừng|ĐỪNG|dung |luật vàng|luat vang|LUẬT VÀNG'
  grep -niE '100%|zero.?vuln|no.?vuln|(khong|không|KHÔNG) c(o|ó|Ó) (lo hong|lỗ hổng|LỖ HỔNG)' "$1" 2>/dev/null
}

lint_one() {
  f="$1"; label="${2:-$1}"; [ -f "$f" ] || return 0
  echo "── lint $label"
  rc=0
  FM=$(frontmatter_region "$f")
  echo "$FM" | grep -qiE 'load (khi|when)'   || { echo "  BLOCK: thieu 'Load khi/Load when'"; rc=1; }
  echo "$FM" | grep -qiE '^covers:'           || { echo "  BLOCK: thieu 'covers:'"; rc=1; }
  echo "$FM" | grep -qiE '^last_verified:'    || { echo "  BLOCK: thieu 'last_verified:'"; rc=1; }
  echo "$FM" | grep -qiE '^ttl_days:'         || { echo "  BLOCK: thieu 'ttl_days:'"; rc=1; }
  echo "$FM" | grep -qiE '^declared.coverage:' || { echo "  BLOCK: thieu 'declared-coverage:' -> phai khai 3 vung A(git)/B(CI)/C(NON-GOAL) (methodology/14)"; rc=1; }

  # Map khung chuan: it nhat 1 ma OWASP LLM (LLM01-LLM10) HOAC web (A01-A10) trong toan file.
  # Phai match CA ma 2-chu-so LLM10 (Unbounded Consumption) + A10 (SSRF) — methodology/14 hang 10 map toi.
  if ! grep -qE 'LLM(0[1-9]|10)|A(0[1-9]|10)' "$f"; then
    echo "  BLOCK: khong co ma OWASP nao (LLM0x/A0x) -> finding 'cam giac', khong phan loai/hanh dong duoc"; rc=1
  fi

  # Contract out-of-scope: phai nhac 'pentest' (dong "KHONG thay the pentest production")
  if ! grep -qi 'pentest' "$f"; then
    echo "  BLOCK: thieu contract out-of-scope nhac 'pentest' -> phai khai C=NON-GOAL (khong thay the pentest production)"; rc=1
  fi

  # Over-claim -> WARN
  overclaim_hits "$f" | grep -v '^$' | sed 's/^/  WARN: cau over-claim (cam "da bao mat ✓" — khai vung phu thay vi tick) -> /' || true

  return $rc
}

if [ "$MODE" = "--self-test" ]; then
  RC=0; T=$(mktemp -d)
  FM='> Load khi: review bao mat orders\ncovers: src/orders\nlast_verified: 2026-01-01\nttl_days: 90\ndeclared-coverage: A=secret+injection | B=SCA(npm audit) | C=NON-GOAL(pentest/DAST)\n'
  # 1) review hop le -> PASS
  printf "# sec\n${FM}## Findings\n- F1 (LLM01/A03): input chua escape -> exploit: SQLi qua orderId. tier=RED\n> KHONG thay the pentest production.\n" > "$T/ok.md"
  R=$(lint_one "$T/ok.md")
  echo "$R" | grep -q BLOCK && { echo "FAIL: review hop le bi BLOCK oan:"; echo "$R"; RC=1; } || echo "PASS: review hop le qua"
  # 2) thieu declared-coverage -> BLOCK
  FM2='> Load khi: t\ncovers: src/x\nlast_verified: 2026-01-01\nttl_days: 90\n'
  printf "# sec\n${FM2}## Findings\n- F1 (LLM01): x\n> KHONG thay the pentest.\n" > "$T/nocov.md"
  R=$(lint_one "$T/nocov.md"); echo "$R" | grep -q "declared-coverage" && echo "PASS: bat thieu declared-coverage" || { echo "FAIL: thieu declared-coverage LOT"; RC=1; }
  # 3) thieu ma OWASP -> BLOCK
  printf "# sec\n${FM}## Findings\n- F1: co ve nguy hiem\n> KHONG thay the pentest.\n" > "$T/noowasp.md"
  R=$(lint_one "$T/noowasp.md"); echo "$R" | grep -q "OWASP" && echo "PASS: bat thieu ma OWASP" || { echo "FAIL: thieu OWASP LOT"; RC=1; }
  # 4) thieu contract pentest -> BLOCK
  printf "# sec\n${FM}## Findings\n- F1 (LLM01/A03): x\n" > "$T/nopentest.md"
  R=$(lint_one "$T/nopentest.md"); echo "$R" | grep -q "pentest" && echo "PASS: bat thieu contract out-of-scope" || { echo "FAIL: thieu pentest contract LOT"; RC=1; }
  # 5) over-claim -> WARN (khong BLOCK)
  printf "# sec\n${FM}## Findings\n- F1 (A02): da bao mat ✓, khong co lỗ hổng\n> KHONG thay the pentest.\n" > "$T/over.md"
  R=$(lint_one "$T/over.md")
  echo "$R" | grep -q "over-claim" && echo "PASS: WARN over-claim" || { echo "FAIL: over-claim khong WARN"; RC=1; }
  echo "$R" | grep -q BLOCK && { echo "FAIL: over-claim khong duoc BLOCK (chi WARN)"; RC=1; } || echo "PASS: over-claim chi WARN khong BLOCK"
  # 6) review chi co LLM10/A10 (ma 2 chu so) -> phai QUA, chong regex bo sot LLM10/A10 (blocker cu)
  printf "# sec\n${FM}## Findings\n- F1 (LLM10/A10): endpoint khong rate-limit -> exploit: DoS + SSRF qua fetch noi bo. tier=RED\n> KHONG thay the pentest production.\n" > "$T/tens.md"
  R=$(lint_one "$T/tens.md")
  echo "$R" | grep -q BLOCK && { echo "FAIL: review chi LLM10/A10 bi BLOCK oan (regex bo sot ma 2 chu so):"; echo "$R"; RC=1; } || echo "PASS: review chi LLM10/A10 qua (regex match ma 2 chu so)"
  # 7) dong PHU DINH luat vang (KHONG "da bao mat ✓") -> KHONG duoc WARN over-claim (false-positive noise)
  printf "# sec\n${FM}<!-- LUAT VANG: KHONG \"da bao mat ✓\", khai vung phu thay vi tick -->\n## Findings\n- F1 (LLM01/A03): input chua escape -> SQLi qua orderId. tier=RED\n> KHONG thay the pentest production.\n" > "$T/negrule.md"
  R=$(lint_one "$T/negrule.md")
  echo "$R" | grep -q "over-claim" && { echo "FAIL: dong phu dinh luat vang bi WARN over-claim oan:"; echo "$R"; RC=1; } || echo "PASS: dong phu dinh luat vang KHONG bi WARN over-claim oan"
  echo "$R" | grep -q BLOCK && { echo "FAIL: negrule bi BLOCK oan:"; echo "$R"; RC=1; } || echo "PASS: negrule hop le qua (khong BLOCK)"
  # 8) dong LUAT VANG VIET HOA CO DAU (dung chuoi THAT tren security-review.md.template dong 12:
  #    'LUẬT VÀNG: KHÔNG "đã bảo mật ✓"') -> KHONG duoc WARN oan. Case 7 chi dung ASCII 'KHONG'/'LUAT VANG'
  #    nen PASS oan; case nay bao dung dieu kien diacritic HOA de bat regression case-fold.
  printf "# sec\n${FM}<!-- LUẬT VÀNG: KHÔNG \"đã bảo mật ✓\", khai vùng phủ thay vì tick -->\n## Findings\n- F1 (LLM01/A03): input chua escape -> SQLi qua orderId. tier=RED\n> KHÔNG thay the pentest production.\n" > "$T/negrulehoa.md"
  R=$(lint_one "$T/negrulehoa.md")
  echo "$R" | grep -q "over-claim" && { echo "FAIL: dong LUAT VANG HOA co dau bi WARN over-claim oan (case-fold C-locale bo sot):"; echo "$R"; RC=1; } || echo "PASS: dong LUAT VANG HOA co dau KHONG bi WARN over-claim oan"
  echo "$R" | grep -q BLOCK && { echo "FAIL: negrulehoa bi BLOCK oan:"; echo "$R"; RC=1; } || echo "PASS: negrulehoa hop le qua (khong BLOCK)"
  # 9) over-claim VIET HOA CO DAU ('ĐÃ BẢO MẬT ✓') KHONG kem phu dinh -> PHAI WARN (chong LOT phat hien HOA co dau)
  printf "# sec\n${FM}## Findings\n- F1 (A02): ĐÃ BẢO MẬT ✓, hệ thống an toàn\n> KHONG thay the pentest.\n" > "$T/overhoa.md"
  R=$(lint_one "$T/overhoa.md")
  echo "$R" | grep -q "over-claim" && echo "PASS: WARN over-claim VIET HOA co dau (ĐÃ BẢO MẬT ✓)" || { echo "FAIL: over-claim VIET HOA co dau LOT phat hien:"; echo "$R"; RC=1; }
  rm -rf "$T"
  [ "$RC" -eq 0 ] && echo "security-verify self-test: ALL PASS" || echo "security-verify self-test: CO FAIL"
  exit $RC
fi

if [ "$MODE" = "--staged" ]; then
  FILES=$(git diff --cached --name-only 2>/dev/null | grep -iE 'security-review.*\.md$' || true)
  [ -z "$FILES" ] && { echo "security-verify: khong co security-review staged -> skip (exit 0)"; exit 0; }
  FAIL=0; TMP=$(mktemp)
  for f in $FILES; do
    git show ":$f" > "$TMP" 2>/dev/null || continue
    lint_one "$TMP" "$f" || FAIL=1
  done
  rm -f "$TMP"
  [ "$FAIL" -eq 1 ] && { echo "security-verify: FAIL -> security-review staged thieu declared-coverage/OWASP/contract, KHONG cho commit"; exit 1; }
  echo "security-verify: PASS"; exit 0
fi

FILES=$(find "$APP_MAP_DIR" -maxdepth 2 -name '*.md' 2>/dev/null | grep -iE 'security-review' || true)
[ -z "$FILES" ] && { echo "security-verify: khong thay security-review (mode=$MODE) -> skip (exit 0)"; exit 0; }
FAIL=0
for f in $FILES; do lint_one "$f" || FAIL=1; done
[ "$FAIL" -eq 1 ] && { echo "security-verify: FAIL -> security-review thieu khai bao phu song, KHONG cho qua"; exit 1; }
echo "security-verify: PASS"
exit 0
