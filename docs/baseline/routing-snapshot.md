# Routing snapshot — bộ prompt đóng băng Wave 0 (Nhóm A′)

> Load khi: chuẩn bị rút metadata frontmatter (Wave 3) hoặc nghi routing skill đổi hành vi.
> Mục đích: lưới chống routing-regression — description frontmatter chính là trigger routing;
> cắt 4-7 lần khối lượng có thể đổi hành vi kích hoạt. **Điều kiện merge phần rút của TỪNG skill**:
> chạy bộ prompt này trước/sau, lệch bất kỳ prompt nào → không merge phần cắt của skill đó.

## Giao thức đo (chốt cùng file — không đổi khi đo)

- Mỗi prompt chạy **k≥3 lần**, mỗi lần trên **session Claude Code sạch** (không context cũ).
- Ghi skill được load theo transcript/tool-log, thành bảng `prompt → skill kích hoạt (đa số của k lần)`.
- **"Lệch"** = bất kỳ prompt nào đổi KẾT QUẢ ĐA SỐ so với snapshot trước.
- Phần ĐO (≈75+ lượt, có LLM — không deterministic) có mốc riêng: xong TRƯỚC khi merge phần rút
  metadata đầu tiên của Wave 3; kết quả commit vào PR. Nhãn: DETECTED (máy/checklist phát hiện, người quyết).

## Bộ prompt (mỗi skill ≥3 dương + ≥2 vùng-biên âm)

### root SKILL.md (ai-simple-product-dev — operating layer)
| # | Prompt | Kỳ vọng |
|---|---|---|
| R1 | "dự án mới bắt đầu làm với AI, setup thế nào cho chuẩn" | KÍCH HOẠT root |
| R2 | "AI đọc sai file, bịa tên hàm, context quá dài" | KÍCH HOẠT root |
| R3 | "docs cũ không biết còn đúng không, hai AI session giẫm nhau" | KÍCH HOẠT root |
| R4 | "làm BA giúp tôi, phân tích nghiệp vụ tính năng đặt hàng" | KHÔNG (→ ba-flow-logic; root 0 câu 'KHÔNG kích hoạt cho' — prompt âm lấy từ trigger dương skill lân cận) |
| R5 | "màn này hiển thị sai, sửa giúp" | KHÔNG (→ ui-ux-triage) |

### ba-flow-logic
| # | Prompt | Kỳ vọng |
|---|---|---|
| B1 | "làm BA: viết yêu cầu cho tính năng quản lý kho" | KÍCH HOẠT |
| B2 | "vẽ và tối ưu flow nghiệp vụ duyệt đơn" | KÍCH HOẠT |
| B3 | "nhu cầu còn mơ hồ: user muốn 'quản lý được thành viên'" | KÍCH HOẠT |
| B4 | "thiết kế giao diện màn dashboard" | KHÔNG (→ ui-design-logic — theo câu 'KHÔNG kích hoạt cho thiết kế UI') |
| B5 | "sửa nút bị lệch trên màn login" | KHÔNG (→ ui-ux-triage) |

### ui-design-logic
| # | Prompt | Kỳ vọng |
|---|---|---|
| D1 | "thiết kế UI màn danh sách đơn hàng theo design system" | KÍCH HOẠT |
| D2 | "viết design-spec cho flow onboarding" | KÍCH HOẠT |
| D3 | "build UI theo design-spec đã có" | KÍCH HOẠT (Execution mode) |
| D4 | "phân tích nghiệp vụ: ai là user, flow ra sao" | KHÔNG (→ ba-flow-logic) |
| D5 | "app đang chạy bị lỗi hiển thị, reproduce và fix" | KHÔNG (→ ui-ux-triage) |

### ui-ux-triage
| # | Prompt | Kỳ vọng |
|---|---|---|
| T1 | "màn này sai rồi, sửa đi" + screenshot | KÍCH HOẠT |
| T2 | "test + fix flow đăng ký trên app đang chạy" | KÍCH HOẠT |
| T3 | "nút Duyệt bấm không ăn, defect P1" | KÍCH HOẠT |
| T4 | "tôi muốn thêm tính năng mới xuất báo cáo" | KHÔNG (→ BA — theo 'KHÔNG kích hoạt cho nhu cầu mới') |
| T5 | "thiết kế lại màn settings cho đẹp" | KHÔNG (→ ui-design-logic) |

### security-logic
| # | Prompt | Kỳ vọng |
|---|---|---|
| S1 | "review bảo mật code thanh toán này" | KÍCH HOẠT |
| S2 | "doc này có bị prompt injection không" | KÍCH HOẠT |
| S3 | "kiểm secret trước khi merge nhánh auth" | KÍCH HOẠT |
| S4 | "pentest app production giúp tôi" | KHÔNG (ngoài scope — chỉ sinh runbook NT11) |
| S5 | "nút login bị lỗi hiển thị" | KHÔNG (→ ui-ux-triage — defect chức năng không liên quan bảo mật) |

## Snapshot kết quả

| Ngày đo | Người/agent đo | Kết quả | Ghi chú |
|---|---|---|---|
| (chưa đo — mốc riêng Nhóm A′, xong trước phần rút metadata đầu tiên của Wave 3) | | | |
