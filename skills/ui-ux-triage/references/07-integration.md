# 07 — Hợp đồng composition: ui-ux-triage trong hệ 5-skill

ui-ux-triage là **pha VẬN HÀNH**. Nó không đứng một mình — nó tiêu thụ output các pha trên làm oracle, và đẩy ngược việc không-thuộc-nó sang đúng skill. File này là nguồn sự thật cho cách ghép; SKILL.md chỉ tóm tắt.

## Vị trí
```
BA ──ba-spec──> ui-design-logic ──design-spec──> build ──> [ui-ux-triage]
            tất cả trên ai-simple (rail/truth/tier/memory/verify)
```

## Móc vào ai-simple (DEFER, không tự chế)
| Nguyên tắc ai-simple | ui-ux-triage dùng |
|---|---|
| #06 risk-tier | escalation = phân loại action GREEN/YELLOW/RED; chỉ RED → 1 ASK gộp |
| #07 memory | decision-pattern (§6) ghi theo format 07 + luật ≥2x; seed RỖNG mỗi repo |
| #08 enforcement | no-DB/no-commit là gate của 08; triage không tự định nghĩa |
| #12 verify-on-use | `triage-verify.sh` = cổng; `ba-spec`/`design-spec` đọc qua coupling map; triage-log để /audit verify |
| app-map | mọi spec + triage-log sống trong app-map, không root trần |

ai-simple vắng → áp tier cục bộ, vẫn chạy.

## Móc vào BA = skill `ba-flow-logic` (oracle hành vi)
- Đọc `ba-spec` (canonical app-map doc do `ba-flow-logic` sinh): acceptance criteria (Given/When/Then), JTBD, scope, flow (Input/Output), cross-user handoff, **Rules/Invariants (§9)** (defect LOGIC = vi phạm invariant này).
- Observer bucket LOGIC/FLOW/TEXT: defect = **lệch AC** của ba-spec; journey đứt = handoff treo trong cross-user map.
- **Handoff NGƯỢC**: code KHỚP ba-spec mà vẫn sai → spec sai/nhu cầu thiếu → KHÔNG fix, đẩy về `ba-flow-logic` (xem `04-reverse-handoff-risk.md` của nó: phân loại spec-sai/thiếu/mới + risk-tier). (§5 bước 4c.)
- ba-spec `covers` UI code → khi code đổi, ba-spec SUSPECT → Observer biết oracle có thể cũ.

## Móc vào ui-design-logic (oracle giao diện)
- Đọc `design-spec` (do ui-design-logic sinh): screen map, state matrix, density budget, component decision, token.
- Observer bucket DESIGN: defect = lệch design-spec. Fallback `design-system` doc nếu chưa có design-spec.
- Screenshot QA loop của ui-design-logic = cách Observer chụp/đối chiếu — chung một cơ chế "test = ảnh nghiệm thu 3 viewport".

## Khi spec vắng (repo chưa chạy BA/design)
Degrade: oracle = design-system doc + heuristics; MỌI finding gắn `[no-oracle, confidence thấp]` để Lead biết đang đoán. Không giả vờ chắc chắn.

## Phân ranh trigger (chống đụng)
| Tín hiệu | Skill |
|---|---|
| nhu cầu/tính năng mới, "tại sao cần", "phân tích nghiệp vụ", "tối ưu flow" | BA = `ba-flow-logic` |
| thiết kế màn mới, "làm đẹp từ đầu" | ui-design-logic |
| "màn này sai/lệch", screenshot lỗi, "test+fix flow" | ui-ux-triage |
| review tĩnh 1 màn | ui-design-logic 06 §3 |

## Cross-repo — INSTALL = JUNCTION, không copy (chống drift)
Skill global (junction `~/.claude/skills/ui-ux-triage` → repo này). Mỗi repo cấp ngữ cảnh riêng qua `.claude/triage.config` (hoặc auto-discover). ba-spec/design-spec ở repo nào thì triage repo đó đọc của repo đó.

**Cài per-repo (nếu repo cần bản project-scoped)**: PHẢI là junction, KHÔNG copy thư mục — copy = fork → drift (vá repo-agnostic không tới tay repo thật; hook gọi script cũ hardcode).
**Đường KHUYẾN NGHỊ (máy làm đủ 4 bước L3 hộ bạn)**: `npx ai-simple update --i-closed-sessions --replace-stale-skills`
— nó resolve target, phân biệt junction vs thư mục thật, **backup `<tên>.bak`** rồi mới thay, và không tự
xoá gì. Chỉ làm tay khi CLI không dùng được.

**Làm tay — AUTHORITY L3 (foundation §Authority contract), theo ĐÚNG thứ tự, không bỏ bước nào:**
```powershell
# từ repo root:
# 1. RESOLVE target thật + phân biệt junction vs thư mục thật (junction thì KHÔNG cần xoá):
Get-Item .claude\skills\ui-ux-triage | Select-Object FullName, LinkType, Target
# 2. KIỂM owner: có phải bản copy của ai-simple không, hay là thứ ai đó tự đặt vào?
Get-Content .claude\skills\ui-ux-triage\SKILL.md -TotalCount 5
# 3. BACKUP trước khi xoá (KHÔNG xoá thẳng — không có Undo cho -Recurse -Force):
Rename-Item .claude\skills\ui-ux-triage ui-ux-triage.bak
# 4. Chỉ khi 1-3 đã rõ và bạn xác nhận: tạo junction
New-Item -ItemType Junction -Path .claude\skills\ui-ux-triage -Target <đường-dẫn-clone>\ai-simple--skill-product-dev\skills\ui-ux-triage
# VERIFY là junction thật (không phải dir):
Get-Item .claude\skills\ui-ux-triage | Select-Object LinkType, Target   # LinkType phải = Junction
```
Hook `triage-gate.sh` gọi `.claude/skills/ui-ux-triage/triage-verify.sh` → qua junction tự trỏ về script global mới nhất, không cần sửa hook. Muốn giữ tập read-ref cốt lõi riêng cho repo → đặt `READ_REFS` trong `.claude/triage.config`, KHÔNG fork script.
