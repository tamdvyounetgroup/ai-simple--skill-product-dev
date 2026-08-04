# 06 — QA & Acceptance: chưa nhìn thấy bằng mắt = chưa xong

Code UI viết xong mới đi được nửa đường. Lovable đẹp ổn định vì có vòng lặp render-nhìn-sửa;
skill này bắt buộc vòng lặp đó. **Cấm tuyên bố "xong" khi chưa screenshot.**

## 1. Quy trình screenshot loop

```
1. Chạy app (dev server / preview tool có sẵn trong môi trường)
2. Với MỖI màn hình trong screen map: screenshot ở 1440×900, 768×1024, 375×812
   + dark mode ở viewport chính (nếu app có dark mode)
   + SPOT-CHECK 320×568 (không cần đủ ma trận): chỉ soi scroll ngang, label wrap 2 dòng,
   heading tràn — 3 lỗi chỉ lộ ở bề rộng hẹp nhất
3. Tự chấm theo checklist mục 2 — nhìn ảnh thật, không nhìn code mà đoán
4. Có lỗi BLOCK/MAJOR → sửa → screenshot lại vùng đã sửa → chấm lại
5. Lặp đến khi hết BLOCK/MAJOR (thường 2–3 vòng). MINOR còn lại: liệt kê cho user quyết
```

Task nhỏ (sửa 1 component): chỉ cần screenshot màn hình chứa nó ở viewport chính + mobile.
Task mới cả app: đủ ma trận màn hình × viewport.

## 2. Checklist nghiệm thu

**BLOCK — phá chức năng hoặc phá tin cậy, sửa ngay:**
- [ ] Text tràn/đè lên nhau, element vỡ khỏi container ở bất kỳ viewport nào
- [ ] Contrast text < 4.5:1 (kiểm tra cả badge, placeholder, text trên ảnh)
- [ ] Touch target < 44px trên mobile cho action chính
- [ ] Dark mode: text tàng hình, nền trắng chói trong dark, border biến mất
- [ ] Hover-only action không có đường thay thế trên touch
- [ ] Primary action nằm dưới fold hoặc trong vùng collapse
- [ ] Scroll ngang trên mobile ở bất kỳ viewport nào, kể cả 320px (Hallmark gate 34)
- [ ] Số liệu/metric/testimonial BỊA trên UI — "+47% conversion", "10.000+ khách" không có nguồn:
      dùng số thật, "—" kèm nhãn "chờ số liệu", hoặc bỏ khối đó (Hallmark gate 46)

**MAJOR — vi phạm spec/budget, sửa trước khi giao:**
- [ ] Màn hình vượt density budget đã khai trong DESIGN-SPEC (đếm khối, không cảm tính)
- [ ] Step tiếp theo mong muốn (theo screen map) KHÔNG phải element nổi bật nhất màn hình
- [ ] Màn hình phục vụ ≥ 2 loại user nhưng chỉ có 1 bản "trung bình cộng" (user mới và power user thấy y hệt nhau)
- [ ] Vị trí/cỡ element không khớp bảng trọng số (item W3 nằm dưới fold; item W1 chiếm chỗ to bậc 0; item W0 vẫn hiện); hoặc > 2 item W3/màn hình
- [ ] Quá 1 nudge thăng cấp/màn hình, hoặc upsell chen lên trên job chính của user
- [ ] Thiếu trạng thái: empty không CTA, không skeleton, lỗi không lối thoát, chưa-login chưa quyết định
- [ ] Sau hành động chính, màn hình hiện ra KHÔNG khớp bảng action → expectation (tạo xong không thấy cái vừa tạo)
- [ ] Demo bằng lorem ipsum/dữ liệu đẹp thay vì dữ liệu thật cực đoan (tên dài, số 0, list dài)
- [ ] Spacing ngoài thang 4/8/12/16/24/32/48/64/80/96 (grep `[..px]` arbitrary trong code Tailwind)
- [ ] Cột số trong table thiếu `tabular-nums` hoặc không căn phải; hero KPI không đạt 2–3× cỡ label
- [ ] 2 primary button trong 1 màn hình; hàng > 3 button
- [ ] Title cùng cấp lệch ngữ pháp / có cái 2 dòng / lệch casing
- [ ] Nhóm ngang hàng (1 hàng tab/button, menu, lưới card) lệch hình dạng label: trộn 1 dòng với 2 dòng, lệch > 1 từ giữa label dài nhất và ngắn nhất — check ở 375px trong ma trận VÀ spot-check 320px (§1; fail ở 320 cũng là MAJOR), sửa bằng ĐỔI TỪ NGỮ theo budget nhóm (03 §4)
- [ ] Badge sai bảng màu trạng thái đã chốt, hoặc badge > 2 từ
- [ ] Card cùng hàng lệch chiều cao; cột số không căn phải; lệch trục căn trái
- [ ] Số/ngày chưa format locale hoặc format lẫn lộn 2 kiểu
- [ ] Logo vi phạm quy tắc 04 (trên nền accent, thiếu khoảng thở, bị đổi màu)
- [ ] Mobile: table scroll ngang thay vì biến thành list card; form 2 cột
- [ ] Empty state trống trơn không có hành động; ô table trống không có "—"
- [ ] Button/nav link/breadcrumb/CTA wrap 2 dòng ở bất kỳ viewport nào — clickable text
      luôn 1 dòng, sửa bằng đổi từ ngữ theo budget nhóm (03 §4; Hallmark gate 49)
- [ ] Fake chrome vẽ tay: browser bar giả (URL pill + 3 chấm), khung điện thoại giả,
      cửa sổ code giả — dùng screenshot thật trong `<figure>` hoặc bỏ (Hallmark gate 47)
- [ ] Heading in nghiêng (italic) hoặc từ nhấn `<em>` nghiêng trong heading — nhấn bằng
      weight/màu accent, italic chỉ sống trong body text (Hallmark gate 38a)

**MINOR — ghi nhận, sửa nếu còn thời gian:**
- [ ] Transition giật/thiếu cho overlay; focus ring thiếu trên vài element
- [ ] Tooltip thiếu cho icon-only button phụ
- [ ] Cắt chuỗi truncate chưa có tooltip full text

## 3. Diagnose UI có sẵn (user chê "xấu", "rối", "chỏi")

**Phân loại NGUYÊN NHÂN trước khi sửa — "xấu" có 4 loại, mỗi loại một cửa:**

| Xấu vì gì | Dấu hiệu | Đi đâu |
|---|---|---|
| (A) Nghiệp vụ đúng, giao diện rối | Flow/AC chạy đúng; rối layout, density, component, title | Chạy ngược checklist §2 — chính mục này |
| (B) Nhìn như AI/slop/template | Metric bịa, fake chrome, hero+3-card generic, gradient vô cớ | §2 gate anti-slop; landing cần chấm sâu → contract 08 |
| (C) "Xấu" nhưng thật ra THIẾU hành vi | Màn thiếu trạng thái/nghiệp vụ mà spec cũng không có | KHÔNG sửa UI — handoff BA (ba-flow-logic), spec sai/thiếu |
| (D) App thật đang lỗi chức năng | Button không bấm được, sai dữ liệu, sai role, treo | ui-ux-triage (test như user thật, phân bucket) |

**Guardrail redesign (case A/B): đổi HOW nhìn, giữ WHAT chạy.** Được đổi: layout, spacing,
component, hierarchy, density, mobile adaptation. KHÔNG tự đổi: AC, permission, flow, dữ liệu,
trạng thái nghiệp vụ — muốn đổi là việc BA, handoff ngược. Đổi token toàn cục / tái cấu trúc nav
giữa chừng redesign vẫn là RED theo 07 §4 (1 câu confirm), không nằm trong "phạm vi redesign".
Đổi wording = sync design-spec cùng commit (oracle copy UI là design-spec; riêng THUẬT NGỮ
nghiệp vụ — tên đối tượng/trạng thái — phải khớp ba-spec, lệch thì hỏi BA chứ không tự đổi).

Chạy ngược checklist: screenshot hiện trạng → đánh dấu vi phạm theo 3 mức → báo cáo
"X BLOCK, Y MAJOR" kèm ảnh → đề xuất thứ tự sửa: BLOCK → căn hàng/spacing (mục MAJOR
hình học — rẻ mà hiệu quả nhất) → text/title → màu. Kinh nghiệm: 80% cảm giác "rối"
đến từ spacing ngoài thang + lệch trục + title lộn xộn, KHÔNG phải do màu. Đừng đổi màu trước.

## 4. Định nghĩa "xong"

1. DESIGN-SPEC.md tồn tại và khớp với cái đã build (screen map, density, quyết định đã chốt)
2. Ma trận screenshot đủ, không còn BLOCK/MAJOR
3. MINOR còn lại được liệt kê tường minh
4. Báo cáo cuối kèm screenshot before/after nếu là task sửa
