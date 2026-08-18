
## case 0
# rubric cho ui-design-logic id=0 (new-app-from-scratch)
DESIGN-SPEC.md được tạo TRƯỚC khi code (screen map có cột 'user đến để làm gì', density, flows). Mobile-first vì chủ trại dùng điện thoại ngoài ao. Accent là bản trầm của cam neon (không lấy nguyên màu logo), neutral ramp stone. Bottom tabs trên mobile, table ao biến thành list card trên mobile. Có screenshot QA loop trước khi tuyên bố xong.

## case 1
# rubric cho ui-design-logic id=1 (add-screen-to-existing-app)
Nhận ra nav đã chạm budget 5 mục — KHÔNG thêm mục thứ 6 một cách vô tư; đề xuất phương án có lý do (gom vào mục có sẵn, hoặc tái cấu trúc nav, hoặc tab trong page liên quan). Tạo/sửa mã (form đơn giản ≤5 field) dùng drawer chứ không page riêng. Cập nhật screen map trước khi code.

## case 2
# rubric cho ui-design-logic id=2 (diagnose-ugly-ui)
Chạy diagnose theo 06: screenshot hiện trạng trước, liệt kê vi phạm phân cấp BLOCK/MAJOR/MINOR (spacing ngoài thang, title lệch ngữ pháp, 2 primary button, vượt density budget...), sửa theo thứ tự hình học trước màu sau, screenshot before/after. KHÔNG nhảy vào đổi màu/đổi font đầu tiên.

## case 3
# rubric cho ui-design-logic id=3 (font-ban-and-ai-text)
Giữ system font stack theo rule FONT [DEF] (SKILL.md): 'trendy chút' KHÔNG phải lý do hợp lệ — [DEF] chỉ mở khi user chỉ đích danh font, hoặc có dòng '## Ngoại lệ đã duyệt' trong design-spec với lý do audience/kỹ thuật (vd chữ to cho user lớn tuổi, subset tiếng Việt). Nêu rõ đường ngoại lệ đó cho user thay vì cấm suông. Không viết subtitle/văn thuyết minh dưới mỗi mục — UI chỉ có nhãn chức năng ngắn; giải thích nếu thật cần thì tooltip. Nêu rõ 2 quyết định này với user thay vì im lặng làm theo.

## case 4
# rubric cho ui-design-logic id=4 (redesign-admin-4case-routing)
Phân loại theo 06 §3 trước khi sửa: đây là case A/B (nghiệp vụ đúng, giao diện rối/AI-looking) → chạy ngược checklist 06 §2 + gate anti-slop. KHÔNG mở Hallmark cho màn admin (contract 08: admin cấm Hallmark, không macrostructure/theme). Guardrail: đổi HOW nhìn giữ WHAT chạy — không đổi AC/permission/flow; đổi token toàn cục nếu cần là RED phải confirm 1 câu. Kết quả có screenshot before/after.
