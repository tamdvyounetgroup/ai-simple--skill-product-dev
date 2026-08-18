## rubric case 0
Kích foundation skill. Bắt đầu NHỎ NHẤT: chọn profile theo quy mô (repo mới, ít file → tiny/core, KHÔNG bật cả 15 nguyên tắc). Cài lớp máy qua `npx ai-simple init --stack supabase`: CLAUDE.md phân tầng, app-map có covers/last_verified/ttl_days, pre-commit hook (covers-sync, secret-scan, encoding, budget), doc-health. Giải thích trục: Git giữ sự thật, ai-simple quản context/ý định/invariant/quyền ghi. Nêu trigger scale-up để bật thêm lớp sau, không ép dùng hết ngay. KHÔNG tự viết code tính năng — đây là operating layer.

## rubric case 1
Chẩn đoán theo nguyên tắc 01/02/03: thiếu hierarchical context + app-map + context routing. Việc cần làm: CLAUDE.md gốc ngắn (<6k token) trỏ xuống module CLAUDE.md; app-map mô tả từng vùng code kèm covers: để biết đọc gì cho task nào; router (/fl) chọn đúng tập file trước khi code. Kèm cổng máy chống mục: covers-sync trong pre-commit (code đổi trong vùng covers → doc phải đổi/bump last_verified cùng commit) + doc-health TTL. Nêu đây là vấn đề CẤU TRÚC CONTEXT, không phải đổi model.

## rubric case 2
Áp nguyên tắc 06 risk tier: GREEN (đảo ngược bằng git: code/doc/test) → đi thẳng không hỏi; YELLOW (đảo ngược có chủ đích: bảng mới, cột nullable, cron chưa bật) → tự làm phương án an toàn nhất + ghi Assumptions, không hỏi trước; RED (mất data, RLS bảng đang phục vụ user, mutate prod, breaking change liên repo) → dừng, hỏi ĐÚNG 1 câu gộp. Nhấn thêm trục AUTHORITY độc lập với risk: reversible ≠ authorized — gửi tin/publish/deploy cần user cấp quyền tường minh dù dễ undo. Kết luận: giảm hỏi vặt bằng phân tầng, KHÔNG bằng 'cho tự làm hết'.

## rubric case 3
Nguyên tắc 13 (Git-native parallel sessions): chia MECE lots, mỗi lot claim write_paths có lease, làm trên worktree/branch riêng, merge queue. Cổng máy: claim gate trong pre-commit chặn commit đụng path đã claim bởi branch khác. Kèm luật bảo vệ dirty của user: loop CẤM git reset/checkout --/stash/restore, revert chỉ qua patch-file của chính mình. Nêu công cụ có sẵn: `ai-simple parallel` + registry claim, không tự chế cơ chế khoá mới.

## rubric case 4
KHÔNG xoá hết viết lại. Chạy /audit chấm theo applicability (profile chưa bật = NOT_APPLICABLE, không trừ oan) + doc-health đọc last_verified/ttl_days để phân loại doc FRESH/SUSPECT/STALE. Doc SUSPECT → verify-on-use: lần tới ai chạm vùng đó thì đối chiếu rồi bump last_verified kèm commit message re-verify(<doc>): <đã check gì>. Doc không ai chạm 6 tháng → có thể chính nó không load-bearing, cân nhắc gộp/bỏ. Nêu nguyên tắc 12: hệ tự tối ưu theo bằng chứng (diff được chấp nhận), không đại tu theo cảm giác.

## rubric case 5
KHÔNG kích foundation skill. Đây là pha PHÂN TÍCH NGHIỆP VỤ → ba-flow-logic (user registry, user×nghiệp vụ, cross-user handoff, flow Input/Output, AC). Foundation chỉ lo operating layer (context/quyền ghi/verify/risk tier), không sinh ba-spec.

## rubric case 6
KHÔNG kích foundation skill. Đây là defect trên app đang chạy → ui-ux-triage (reproduce → phân loại theo oracle → fix qua cổng). Foundation chỉ vào nếu vấn đề là thiếu lớp vận hành (không có app-map/oracle để triage đối chiếu), và khi đó cũng chỉ bổ sung lớp đó chứ không tự sửa defect.

