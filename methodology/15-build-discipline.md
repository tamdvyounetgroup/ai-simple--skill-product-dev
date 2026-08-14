# 15 — Build Discipline: kỷ luật pha VIẾT CODE / Lazy-senior build

> **v1 (2026-08-14)** — nội hoá từ hội đồng 3 nguồn (`NOTICE.md` + `docs/adr/002`). Trước v1.9.0 pha
> BUILD không có nguyên tắc nào cai quản: AI viết THỪA (dep mới cho việc 3 dòng, abstraction đón tương
> lai) và cắt THIẾU (bỏ nhánh lỗi/trống vì "spec không ghi"). NT15 chặn cả hai chiều.
> **Bản hành động 7 điều sống ở `CLAUDE.md`** (tầng always-on); file này là tầng lý lẽ — luật
> load-bearing không được chỉ tồn tại ở đây.

## §1. Thang quyết định 7 bậc — dừng ở bậc đầu tiên đủ dùng *(nguồn ý tưởng PT-ladder · ép bởi /simplify + code review người)*

Trước khi viết, leo đúng thứ tự: **(1)** việc này có cần tồn tại không — không dòng spec nào đòi thì bỏ
→ **(2)** repo đã có helper/type/pattern làm việc này chưa → **(3)** thư viện chuẩn của ngôn ngữ
→ **(4)** nền tảng có sẵn (HTML/CSS/ràng buộc DB) — **trừ component đã chốt trong [STACK]: chúng thắng
bậc 4** (vd đã khoá shadcn thì dùng DatePicker shadcn, không `<input type="date">` trần) → **(5)** dependency
ĐÃ CÀI — cấm thêm dep mới cho việc vài dòng → **(6)** gói được 1 dòng thì 1 dòng → **(7)** code tối thiểu
chạy được. Hai bậc cùng thoả → bậc cao hơn thắng.

Hệ quả cấm: không interface cho 1 implementation, không factory cho 1 sản phẩm, không wrapper chỉ để
gọi tiếp, không tham số hoá thứ chỉ có 1 giá trị. "Để mở rộng sau" không phải lý do — mở rộng là việc
của commit tương lai, khi nhu cầu có thật. Leo thang **sau** khi đã đọc code bị chạm và lần đúng luồng
thật — diff nhỏ nhưng đặt sai chỗ vẫn là bug.

## §2. Ranh giới của YAGNI — bậc 1 chỉ áp cho thứ AI tự nghĩ thêm *(nguồn ý tưởng PT-not-lazy · ép bởi design-verify.sh + review)*

**"Được yêu cầu tường minh" có đúng một định nghĩa: có dòng trong ba-spec / AC / design-spec.**
Không phải "user nói trong chat", không phải "AI thấy hợp lý". CẤM dùng bậc 1 cắt thứ spec đã ghi —
ma trận trạng thái (chưa login / role / trống / đang tải / lỗi / dữ liệu cực đoan) là nạn nhân quen
thuộc nhất của YAGNI dùng sai chỗ.

Precedence một thứ tự duy nhất, mọi mâu thuẫn xử theo nó:
```
[INV] (ui-design-logic) → nội dung ba-spec/AC/design-spec → [STACK] → [DEF] → thang §1
```
Thang chỉ được quyết phần HOW mà 4 tầng trên chưa quy định.

## §3. Sửa gốc, không vá triệu chứng — và grep trước khi thêm *(nguồn ý tưởng PT-bugfix + PT-ladder-2 · ép bởi hook 1f-b WARN)*

Bug lộ ở caller nhưng sống ở hàm dùng chung → guard đặt ở hàm dùng chung, một chỗ; vá từng caller là
nhân bản bug chờ caller thứ N+1. Trước khi thêm hàm export mới: grep TÊN nó và grep VIỆC nó làm —
trùng nghĩa thì dùng lại hoặc gộp (đo thật ForFish: `haversineKm` và `nearestIndex` mỗi cái tồn tại
2 bản ở 2 file). Hook 1f-b WARN khi commit thêm export trùng tên với export sẵn có.

## §4. Guardrails — 8 thứ tối giản hoá KHÔNG được chạm *(nguồn ý tưởng PT-not-lazy · ép bởi hook 1f-c + 06 §2)*

Dù thang §1 bảo gì: **validate input ở ranh giới tin cậy** · **error handling chống mất dữ liệu**
(án lệ ForFish 2026-07-31: catch rỗng nuốt lỗi ghi → user mất sổ tay nhập liệu) · **bảo mật** ·
**ĐỦ ma trận trạng thái TRONG CODE** — spec đủ mà code cắt là lỗ design-verify không bắt được, hook 1f-c
canh · **touch target 44/48** · **contrast 4.5:1 + dark mode** · **focus ring không bị huỷ trắng** ·
**action → expectation** (tạo xong thấy cái vừa tạo, xoá xong có Undo).

Bảng này không đẻ invariant mới — nó kéo đúng nhóm [INV] của ui-design-logic xuống pha build, để
"lười" không bao giờ là lý do một nhánh lỗi biến mất.

## §5. Thiếu-spec → handoff ngược, cấm bỏ qua im lặng *(nguồn ý tưởng PT-ask-in-response · ép bởi hook 1f-c + 06 §2)*

Gặp hành vi chưa có trong spec khi đang build: **(a)** trạng thái thuộc ma trận §4 → làm mặc định
an toàn nhất + ghi `## Assumptions` + bổ sung 1 dòng vào design-spec CÙNG COMMIT; **(b)** hành vi
nghiệp vụ → handoff ngược BA (ba-flow-logic ref 04); **(c)** HOW-nhìn → handoff design (ui-design-logic).
Cấm nhánh trống + báo "xong". "Skip it, say so" phiên bản im lặng là cách các app mất dữ liệu người
dùng yếu thế.

## §6. Vùng miễn test không được mở rộng *(xử mâu thuẫn nhập khẩu · ép bởi bảng test NT04 + /audit)*

Nguồn gốc chủ trương "YAGNI áp cho cả test" — **từ chối nhập**. Trục CÓ/KHÔNG test thuộc NT04:
đúng 3 ca miễn (pure UI tweak / config-only / doc-only), ghi rõ trong commit message. "Sửa 1 dòng
nên khỏi test" không phải một ca. NT15 chỉ quyết test VIẾT THẾ NÀO cho gọn (bậc 6: 1 case đúng chỗ
thắng 10 case trang trí), không quyết có test hay không.

## §7. Nợ có hồ sơ — marker `nợ:` hai vế *(nguồn ý tưởng PT-marker · ép bởi hook 1f-a WARN + /audit quý)*

Cắt góc CÓ CHỦ ĐÍCH với trần biết trước → để lại đúng format:
```
// nợ: <trần là gì>, <điều kiện nâng cấp>
// nợ: chỉ đỡ 100 dòng đầu, phân trang khi list > 100
```
Thiếu vế hai thì nợ sẽ mục thành TODO vĩnh viễn — hook 1f-a WARN marker thiếu vế. Không dùng `TODO`
trần (không ai đo được). `/audit` quý đếm: tổng `nợ:`, số thiếu vế nâng cấp (số đáng lo), và export
trùng tên còn lại.

## Anti-patterns

- ❌ Cắt empty/loading/error rồi viện "spec không ghi" — spec THIẾU thì đi §5, không được tự cắt
- ❌ Dep mới cho việc vài dòng (`left-pad` syndrome) — bậc 5 cấm
- ❌ Refactor "tiện tay" ngoài phạm vi task — diff to thêm mà không ai yêu cầu; ui-lane.sh + gate
  diff-size-vs-lane WARN đúng ca này
- ❌ Viết luật/quy ước mới trong code mà không có người ép — luật không enforcer là chữ chờ mục
  (chính là tiêu chí `scripts/rule-enforcer-gate.js` áp cho file này)
