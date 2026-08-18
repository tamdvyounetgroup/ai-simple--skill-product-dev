
## case 0
# rubric cho ba-flow-logic id=0 (new-need-multi-user)
Kích ba-flow-logic. Sinh ba-spec.md TRƯỚC mọi thứ khác: User registry ≥3 user (chủ/nhân viên/kế toán, + có thể cron nhắc hạn). User×Nghiệp vụ matrix với mỗi nghiệp vụ có đúng 1 owner-user. Cross-user handoff map cho Tạo→Duyệt→Công nợ, mỗi handoff có điều kiện + điểm kết khi treo. Mỗi flow có Input/Output + start/end. Tối ưu flow qua agent (nghiệp vụ công nợ → gọi Domain-Specialist kế toán). AC dạng Given/When/Then, KHÔNG chứa từ UI. KHÔNG vẽ màn/chọn màu (đó là ui-design-logic).

## case 1
# rubric cho ba-flow-logic id=1 (optimize-existing-flow)
Kích ba-flow-logic (tối ưu flow, không phải UI defect). Suggester đề biến thể; Optimizer chấm theo rubric → bắt đúng 2 bệnh: 'đơn nằm im' = handoff treo (thiếu điểm-kết-khi-treo → thêm nhắc/cron/quá-hạn), 'trừ kho 2 lần' = invariant vỡ (R: kho không trừ 2 lần/đơn). Domain-Specialist kho xác nhận giữ-tạm vs trừ-thật. Ghi candidate bị loại vào Flow optimization log. Output là AC + flow sửa trong ba-spec, KHÔNG sửa code.

## case 2
# rubric cho ba-flow-logic id=2 (not-trigger-ui-design)
KHÔNG kích ba-flow-logic. Đây là HOW-nhìn (giao diện) → ui-design-logic (hoặc ui-ux-triage nếu là defect trên màn đã chạy). BA chỉ vào khi là WHAT/WHY (user/nghiệp vụ/flow/acceptance), không phải 'làm đẹp'.

## case 3
# rubric cho ba-flow-logic id=3 (reverse-handoff-from-triage)
Nhận reverse handoff: code khớp spec mà vẫn sai → spec THIẾU (nhu cầu thiếu), KHÔNG sửa code. Thêm AC/flow cho 'duyệt đơn → sinh công nợ' (handoff H sang kế toán). Domain-Specialist kế toán soi bút toán cân. Tier: thêm AC mới = GREEN/YELLOW; nếu đổi AC duyệt đang chạy = RED → 1 ASK. Bump last_verified + ghi History.

## case 4
# rubric cho ba-flow-logic id=4 (not-trigger-small-clear-change)
KHÔNG kích ba-flow-logic (và không cần BA). Đổi nhỏ đã rõ, không đổi hành vi/nghiệp vụ → build thẳng (đổi text/i18n). BA chỉ cho nhu cầu mơ hồ/mới hoặc thay đổi hành vi.

## case 5
# rubric cho ba-flow-logic id=5 (defer-db-migration-not-spec)
BA phân tích nghiệp vụ công nợ (flow/AC) thì được, NHƯNG phần migration (thêm bảng, drop/đổi cột mất dữ liệu) KHÔNG phải việc BA định nghĩa hay tự làm → defer ai-simple #06 (RED: irreversible) → 1 ASK gộp + đẩy việc schema sang đúng cổng. BA dừng ở WHAT (cần lưu công nợ, trạng thái nào), không quyết HOW-DB (DROP/ALTER). Không tự chế risk-tier.

## case 6
# rubric cho ba-flow-logic id=6 (tiebreaker-display-is-design-not-ba)
Tie-breaker WHAT/HOW: đây là cách HIỂN THỊ/truy cập dữ liệu ĐÃ CÓ (lọc/sắp xếp) — không có nghiệp vụ/rule/hành vi mới → KHÔNG kích ba-flow-logic, mà → ui-design-logic (screen/filter/density) hoặc build. BA chỉ vào nếu lọc kéo theo rule mới (vd 'kế toán chỉ được xem đơn đã chốt sổ' = quyền/rule → BA). Pin ranh giới: trình bày dữ liệu = design; rule/hành vi = BA.

## case 7
# rubric cho ba-flow-logic id=7 (ba-spec-must-pass-gate)
ba-spec sinh ra phải: có frontmatter covers/last_verified/ttl_days + 'Load khi'; mỗi nghiệp vụ có owner-user; mỗi AC dạng G/W/T có `Test:` (e2e cho flow đặt-xác nhận) + `Assert` ĐỊNH LƯỢNG (vd status=="đã xác nhận", count slot>=1); không AC nào chứa từ UI. Chạy `bash ba-verify.sh` trên file output phải PASS exit 0. Nếu thiếu Test/Assert hoặc 0 AC → cổng BLOCK, coi như chưa xong.
