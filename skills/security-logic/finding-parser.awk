# finding-parser.awk — v1.21.0. STATE MACHINE fence-aware cho khối Findings của security-review.
#
# Vì sao viết lại (audit độc lập 2026-08-17/18): bản regex-nối-thêm bị bypass bằng 7 biến thể tầm
# thường — `## Vulnerabilities` (tên vùng khác), heading trong code-fence, heading thụt lề, `<h3>`,
# finding trong bảng markdown, ID trùng khác hoa/thường, placeholder `{{...}}`/`TBD`/`_____`.
# Mỗi lần vá thêm một khuôn lại lòi khuôn mới ⇒ đổi cách: quét CÓ TRẠNG THÁI, và fail-CLOSED với
# dạng chưa hỗ trợ thay vì im lặng cho qua.
#
# Vào: 1 file security-review. Ra: các dòng "  BLOCK: ..." (rỗng = đạt). Không tự quyết exit code.
#
# TRẠNG THÁI theo dõi:
#   fence     — trong ``` hoặc ~~~ (mọi thứ bên trong là VÍ DỤ, không phải cấu trúc tài liệu)
#   infind    — đang trong vùng Findings (heading cấp 2 có từ khoá) cho tới heading cấp 2 kế tiếp
#   fid       — finding đang mở; MỌI heading đều đóng finding trước đó (hết "mượn trường chéo block")
#
# LÀ FINDING khi: (a) heading bất kỳ cấp mang dạng ID `F-<gì đó>`, HOẶC (b) mọi heading con (cấp ≥3)
# nằm trong vùng Findings — dù đặt tên gì. Heading nhận cả: `#` markdown (thụt 0-3 space theo
# CommonMark), setext (`===`/`---` dưới dòng chữ), và `<hN>` HTML.

function norm(s) { gsub(/^[ \t]+|[ \t]+$/, "", s); return s }
function lower(s) { return tolower(s) }

# value rỗng nghĩa: placeholder mọi quy ước, hoặc quá ngắn để là mô tả thật
function is_empty_value(v,   t) {
  t = norm(v)
  if (t == "") return 1
  if (t ~ /\{\{/) return 1                       # {{ĐIỀN_SAU}} — quy ước "bắt buộc điền" của template
  if (t ~ /<[^>]*>/) return 1                    # <mô tả mẫu> — quy ước "ví dụ" của template
  if (t ~ /^[_\-.…]+$/) return 1                 # _____ / --- / ...
  if (lower(t) ~ /^\(?(tbd|todo|n\/a|na|chưa rõ|chua ro|chưa xác định|chua xac dinh|\?+)\)?$/) return 1
  gsub(/[^A-Za-zÀ-ỹ0-9]/, "", t)                 # đếm ký tự CÓ NGHĨA, không đếm dấu câu
  if (length(t) < 3) return 1                    # "x", "-", ": ?" → chưa điền
  return 0
}

function field_value(line,   v) {                # tách phần sau dấu ':' đầu tiên; không có ':' → rỗng
  if (line !~ /:/) return ""
  v = line; sub(/^[^:]*:/, "", v); return norm(v)
}

function close_finding(   miss) {
  if (fid == "") return
  if (!has_risk && !has_llm && !has_web && !has_gate && !has_tier) {
    print "  BLOCK: '" fid "' nam trong vung Findings nhung KHONG co truong nao -> parser coi la finding rong."
    print "         Neu day la ghi chu/khuon mau (khong phai finding): them '[non-finding]' vao heading, hoac dat ngoai vung Findings."
    fid = ""; return
  }
  if (seen[lower(fid)]++) print "  BLOCK: finding " fid " -> ID TRUNG voi finding truoc (khong phan biet hoa/thuong)"
  if (!has_risk)  print "  BLOCK: finding " fid " -> **Rui ro** thieu hoac chua dien (placeholder/TBD/qua ngan)"
  if (!has_llm)   print "  BLOCK: finding " fid " -> thieu ma OWASP LLM (LLM01-LLM10)"
  if (!has_web)   print "  BLOCK: finding " fid " -> thieu ma OWASP web (A01-A10) hoac khai N/A KEM ly do"
  if (!has_gate)  print "  BLOCK: finding " fid " -> **Vung / gate** thieu hoac chua dien"
  if (!has_tier)  print "  BLOCK: finding " fid " -> **Tier** thieu hoac ngoai enum GREEN|YELLOW|RED"
  fid = ""
}

function open_finding(title,   id) {
  close_finding()
  id = norm(title)
  # Cắt phần tiêu đề sau dấu gạch NGĂN CÁCH (em/en dash, hoặc "-" có space hai bên) — KHÔNG cắt
  # dấu gạch NẰM TRONG id: "F-1 — tiêu đề" phải ra "F-1", không phải "F" (lỗi này từng làm mọi
  # finding mang cùng id ⇒ báo ID TRÙNG oan; đã tái phát nên ghi lại tại chỗ).
  sub(/[ \t]*[—–].*$/, "", id)
  sub(/[ \t]+-[ \t]+.*$/, "", id)
  id = norm(id)
  if (id == "") id = "(khong ten)"
  fid = id; has_risk = 0; has_llm = 0; has_web = 0; has_gate = 0; has_tier = 0
}

function heading(level, text) {                  # xử lý MỌI heading, bất kể cú pháp
  # Đường thoát tường minh cho mục KHÔNG phải finding nằm trong vùng Findings (ghi chú, khuôn mẫu,
  # tổng kết). Không có nó thì review thật + mục "Khuôn mẫu cho lần sau" bị chặn oan — audit đã craft
  # ca này (A7). Có nó thì "### 2.2 Lỗ token" rỗng vẫn bị bắt: người viết phải NÓI RA đây không phải finding.
  if (lower(text) ~ /\[non-finding\]|\(non-finding\)/) { close_finding(); return }
  if (text ~ /(^|[^A-Za-z0-9])F-[A-Za-z0-9]/) { open_finding(text); return }
  if (level <= 2) {
    close_finding()
    infind = (lower(text) ~ /finding|vulnerab|phát hiện|phat hien|lỗ hổng|lo hong|issue/) ? 1 : 0
    return
  }
  if (infind) open_finding(text); else { close_finding(); }
}

{ raw = $0 }

# ── fence toggle: mọi thứ bên trong là ví dụ, KHÔNG phải cấu trúc ──
raw ~ /^[ \t]*(```|~~~)/ { fence = !fence; prev = ""; next }
fence { next }

# ── setext heading: dòng ===/--- ngay dưới một dòng chữ ──
raw ~ /^[ \t]*=+[ \t]*$/ && prev != "" { heading(1, prev); prev = ""; next }
raw ~ /^[ \t]*-{3,}[ \t]*$/ && prev != "" { heading(2, prev); prev = ""; next }

# ── ATX heading, cho phép thụt 0-3 space (CommonMark) ──
raw ~ /^[ ]{0,3}#{1,6}[ \t]/ {
  h = raw; sub(/^[ ]*/, "", h)
  n = 0; while (substr(h, n + 1, 1) == "#") n++
  sub(/^#+[ \t]*/, "", h)
  heading(n, h); prev = ""; next
}

# ── HTML heading ──
raw ~ /<[hH][1-6][^>]*>/ {
  h = raw
  match(h, /<[hH][1-6][^>]*>/); n = substr(h, RSTART + 2, 1) + 0
  sub(/.*<[hH][1-6][^>]*>/, "", h); sub(/<\/[hH][1-6]>.*/, "", h)
  heading(n, h); prev = ""; next
}

# ── bảng markdown trong vùng Findings: KHÔNG cố parse — fail-CLOSED có hướng dẫn ──
infind && raw ~ /^[ \t]*\|/ && raw ~ /(^|\|)[ \t]*F-[A-Za-z0-9]/ && !table_warned {
  print "  BLOCK: finding dat trong BANG markdown — parser khong doc dang nay. Dung heading (### F-1) + 5 truong."
  table_warned = 1; next
}

# ── các dòng trường của finding đang mở ──
{
  prev = raw
  if (fid == "") next
  low = lower(raw)
  if (index(low, "rủi ro") > 0 || index(low, "rui ro") > 0) { if (!is_empty_value(field_value(raw))) has_risk = 1 }
  if (raw ~ /LLM(0[1-9]|10)/) has_llm = 1
  if (raw ~ /(^|[^A-Za-z0-9])A(0[1-9]|10)([^0-9]|$)/) has_web = 1
  if (index(raw, "N/A") > 0 && (index(low, "vì") > 0 || index(low, "ly do") > 0 || index(low, "lý do") > 0)) has_web = 1
  if (index(low, "vùng") > 0 || index(low, "vung") > 0 || index(low, "gate") > 0) { if (!is_empty_value(field_value(raw))) has_gate = 1 }
  if (index(low, "tier") > 0 && raw ~ /(GREEN|YELLOW|RED)/) has_tier = 1
}

END { close_finding() }
