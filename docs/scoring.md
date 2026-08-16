# Chấm điểm SẢN PHẨM ai-simple (cho maintainer)

> Khác `/audit` (chấm 1 **project áp dụng** ai-simple theo applicability). Đây chấm **chính sản phẩm** — 15 nguyên tắc + CLI + 5 skill — trả lời "ai-simple đang tốt tới đâu, chỗ nào yếu nhất, sửa gì trước". Thiết kế qua hội đồng team-agent (3 đề xuất → 6 phản biện → judge → synthesize → Red-Skeptic; winner: **machine-first**).

## Triết lý

Điểm = **số GATE máy chạy lại được đang xanh** — mỗi gate tự bào chữa bằng một class bug ĐÃ TỪNG xảy ra (tarball vỡ v1.4.1, Windows vỡ v1.5.0, First-win fail B1 v1.6.0), không gate nào tồn tại vì "nghe có vẻ nên đo". **Không trọng số, không /100**: báo cáo là bảng gate đỏ/xanh + đếm thô — danh sách gate đỏ CHÍNH LÀ "sửa gì trước". Điểm LLM (eval hành vi, benchmark onboard/hallucinate) **không bao giờ vào mẫu số** — chỉ ADVISORY có trend (repo tự ghi: "điểm LLM dao động giữa các lần chạy").

## 5 GATE máy + 2 lớp ADVISORY

| # | Gate | Đo gì | Lệnh | Trạng thái |
|---|------|-------|------|-----------|
| **G1** | Self-test hợp nhất | hook 21 fixture + report + **4/4** skill-verifier + identity-numbers + cross-cut + NT13 42 test | `npm test` + `node bin/ai-simple.js parallel self-test` | ✅ implemented |
| **G2** | Stranger-path E2E | pack→cài tarball→CLI sống→init→doctor→First-win CHẶN + **10 commit sạch 0 chặn oan** + secret/injection chặn + update giữ CONFIG | `npm run stranger-path` (`scripts/stranger-path.js`) | ✅ implemented (11/11) |
| **G3** | Ship-gate | require-coverage + template-coverage + link-check trên tarball (`npm pack`) | `npm run ship-gate` (`prepublishOnly`) | ✅ implemented |
| **G4** | Docs-lint + Dogfood | hook tự cài + đồng bộ template + docs sống không over-claim "đã bảo mật ✓" | `npm run dogfood-gate` | ✅ implemented |
| **G5** | CI matrix 2 OS | G1–G4 xanh trên ubuntu + windows (W1 v1.5.0 là bug chỉ-Windows) | `.github/workflows/gates.yml` | ✅ implemented |
| A1 | Security-mutation | recall secret-scan/injection-lint trước biến thể lạ | (chưa) — nhét payload vào chính fixture `--self-test` của hook | ⏳ ADVISORY, chưa build |
| A2 | Eval skill + benchmark quý | 4 skill làm đúng việc; onboard/hallucinate | (chưa) — evals qua checklist hội đồng + context-benchmark answer-key, pin model | ⏳ ADVISORY, chưa build |

## Cách chạy + ngưỡng hành động

- **Local trước publish**: `npm run gates` (G1+G3+G4, ~vài phút) → `npm run stranger-path` (G2, ~2–4 phút). `prepublishOnly` tự chạy cả hai khi `npm publish`.
- **Mỗi push**: CI matrix chạy toàn bộ trên 2 OS.
- **Bất kỳ GATE đỏ → KHÔNG publish.** Nhiều gate đỏ → sửa theo chi-phí-thấp-nhất.
- **Chống bão hoà**: mỗi **lời hứa MỚI** trong README/SKILL phải kèm 1 kịch bản mới trong G2 (mẫu số promises tăng theo sản phẩm — thêm hứa không kèm kịch bản = G2 tụt).
- Ghi vào CHANGELOG mỗi release: **"N/5 gate xanh + tên gate đỏ"** cạnh điểm hội đồng.

## Backlog (còn lại theo thứ tự tác động/effort)

1. **A1 mutation** — ~10 payload biến thể vào fixture hook, tier ADVISORY.
2. **Evals tối thiểu cho ui-ux-triage + security-logic** (2/4 skill chưa có) → cả 4 vào checklist hội đồng.
3. **Runner tự động cho skill-evals** — chỉ khi hội đồng-chạy-tay thành nút cổ chai.
4. **Context-benchmark quý** — đắt nhất, ADVISORY; fixture repo dựng bằng `ai-simple init`, answer-key máy, pin model.
