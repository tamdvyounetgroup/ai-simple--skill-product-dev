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

### Lần đo 1 — 2026-08-15, metadata 840 từ (HEAD 9dae97b, TRƯỚC khi rút)

| Hạng mục | Kết quả |
|---|---|
| Giao thức | k=3 lượt độc lập, mỗi lượt một **agent context sạch**, chấm mù (agent chỉ được đọc cột Prompt + 5 description, cấm đọc cột Kỳ vọng) |
| Đồng thuận giữa 3 lượt | **25/25 dòng giống hệt nhau** ở cả 3 lượt (không dòng nào dao động) |
| Khớp kỳ vọng | **25/25** — gồm 13 case dương đúng skill + 12 case vùng-biên định tuyến sang đúng skill lân cận |

**Bảng đa số (dùng làm mốc so sánh SAU khi rút metadata):**

| # | skill được kích hoạt | # | skill được kích hoạt |
|---|---|---|---|
| R1 | ai-simple-product-dev | T1 | ui-ux-triage |
| R2 | ai-simple-product-dev | T2 | ui-ux-triage |
| R3 | ai-simple-product-dev | T3 | ui-ux-triage |
| R4 | ba-flow-logic | T4 | ba-flow-logic |
| R5 | ui-ux-triage | T5 | ui-design-logic |
| B1 | ba-flow-logic | S1 | security-logic |
| B2 | ba-flow-logic | S2 | security-logic |
| B3 | ba-flow-logic | S3 | security-logic |
| B4 | ui-design-logic | S4 | none (pentest production — ngoài scope, runbook NT11) |
| B5 | ui-ux-triage | S5 | ui-ux-triage |
| D1 | ui-design-logic | | |
| D2 | ui-design-logic | | |
| D3 | ui-design-logic | | |
| D4 | ba-flow-logic | | |
| D5 | ui-ux-triage | | |

**Ranh giới trung thực của phép đo**: đây là **routing THEO DESCRIPTION** (agent context sạch đọc 5 description
rồi quyết định) — proxy đúng cho thứ mà việc rút metadata làm thay đổi. Nó KHÔNG phải phép đo routing của
harness Claude Code trên session người dùng thật (thứ đó cần chạy 25 prompt trong 25 phiên thật). Vì mục tiêu
của lưới này là "cắt description có làm đổi hành vi kích hoạt không", proxy này đủ dùng; nếu sau này cần bảo
chứng mạnh hơn thì chạy lại trên phiên thật với cùng bảng.

**Điều kiện merge Wave 3 phần rút metadata**: đo lại đúng giao thức trên sau khi cắt; bất kỳ dòng nào đổi
kết quả đa số so với bảng trên → KHÔNG merge phần cắt của skill đó.
