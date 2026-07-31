# 04 — Doc + Test Sync Invariant

> **Behavior change ↔ test. Documented change ↔ doc. Cùng commit.** Code đổi HÀNH VI mà không có test = future bug; code đổi thứ ĐƯỢC DOCUMENT (nằm trong `covers:` của doc nào đó) mà không sửa/re-verify doc = doc sai ngay commit sau. Code ngoài cả hai vùng (pure UI tweak, config nhỏ) đi tự do — invariant cứng nhưng có ranh giới, không phải "mọi commit phải kèm đủ bộ ba".

**v2 — 2026-07-28 (ADR-001 Phase 1):** phát biểu lại invariant từ "mọi code change bắt buộc doc + test" thành cặp điều kiện behavior↔test / documented↔doc như trên — hợp thức hóa đúng cách hook đã enforce từ trước (covers-based, xem §Cách enforce). **Parallel mode (NT13):** doc + test của entity đi CÙNG LOT với code; riêng doc thuộc shared zone (`docs/contracts/`, app-map README) worker không được commit → **deferred-doc-at-integration**: integrator commit phần doc đó ở bước merge queue, cùng lần regenerate global outputs.

---

## Tại sao cứng / Why hard

Soft rule "nên update doc": sau 10 commit là doc lệch 30%. Sau 50 commit là doc vô dụng — AI đọc doc cũ → đề xuất sai → user mất niềm tin → không dùng AI nữa.

Hard invariant: code đổi mà không update doc/test = task chưa xong. Reviewer reject. CI fail (nếu setup được).

---

## Bảng mapping / Mapping table

Code change → doc update bắt buộc:

| Code change | Doc bắt buộc update |
|---|---|
| Thêm/xoá file trong `src/<module>/` | `src/<module>/CLAUDE.md` (count + entry) |
| Thêm route mới hoặc xoá route | `docs/app-map/01-pages-and-navigation.md` (+ regenerate `_generated/routes.md`) |
| Thêm/sửa Dialog/Sheet/Drawer | `docs/app-map/02-dialogs-and-forms.md` |
| Migration (table/column/RLS) | `docs/app-map/03-database-and-automation.md` + regenerate types + `_generated/schema.md` |
| Edge function mới / xoá | `docs/app-map/04-edge-functions.md` |
| Permission / role matrix change | `docs/app-map/05-permissions-and-gates.md` |
| User flow mới | `docs/app-map/06-user-flows.md` |
| Fix sự cố hệ thống chạy nền | `docs/app-map/ops/runbook-<service>.md` (mục lỗi thường gặp) |
| Tech stack / quy ước business mới | Root `CLAUDE.md` + `docs/decisions/` (ADR) |
| Feature mới chưa stable | `docs/app-map/20-recent-features.md` (buffer) |
| Quyết định kiến trúc | ADR mới `docs/decisions/NNNN-*.md` |

---

Code change → test bắt buộc:

| Code change | Test bắt buộc |
|---|---|
| Hook logic mới/sửa | Unit test (Jest/Vitest) HOẶC cover qua E2E |
| Util function | Unit test |
| Component có user interaction | Component test (RTL/Vitest) |
| Page mới / flow mới | E2E test (Playwright/Cypress) |
| Bug fix | Regression test (`bug-fix-<slug>-YYYY-MM-DD.spec.ts` — slug để 2 bug cùng ngày không đè tên) |
| Permission / RLS change | E2E với role matrix |
| Migration | DB integration test + manual verify |

---

## Khi nào skip test được / When skipping tests is OK

Skip test CHỈ cho phép khi:
- Pure UI tweak (color/spacing/copy đổi 1-2 từ)
- Config-only change
- Doc-only change

Phải note rõ trong commit message: `style(ui): đổi padding card — skip test vì pure UI tweak`

---

## Verify checklist trước khi commit / Pre-commit verify checklist

```
[ ] Code change → list file đã touch
[ ] Doc updates → đã update tất cả docs trong bảng trên?
[ ] Test updates → đã thêm/sửa test tương ứng?
[ ] Count consistency → CLAUDE.md count khớp với `ls` thực tế?
[ ] Cross-refs → link tới file mới có thêm vào index không?
[ ] Lint + test pass → `npm run lint` + `npm run test`?
```

→ Miss bất kỳ checkpoint nào = task chưa xong.

---

## Cách enforce / How to enforce

> **v2 — 2026-06-11**: enforcement chi tiết chuyển sang [08-automated-enforcement.md](08-automated-enforcement.md). Tóm tắt phân tầng:

1. **Pre-commit hook** (`templates/pre-commit.hook.template`): **BLOCK** cho invariant cốt tử — (a) migration đổi mà doc database không đổi (hoặc không regenerate `_generated/schema.md`, nguyên tắc 09); (b) **covers-sync** (nguyên tắc 12 v2): code đổi trong vùng `covers:` của doc nào thì doc đó phải được sửa hoặc bump `last_verified:` cùng commit — đây là phiên bản máy-enforce của chính invariant này. Code ngoài mọi vùng covers không bị chặn (pure UI tweak tự do)
2. **Pull request template**: checklist 6 ô trên, force tick
3. **AI agent rule**: rule trong `CLAUDE.md` — "Trước khi say done, verify checklist 6 ô"
4. **Code reviewer**: reject PR thiếu doc/test, không exception

---

## Anti-patterns

| Anti-pattern | Vấn đề |
|---|---|
| "Sẽ update doc sau" | Không bao giờ làm |
| Update doc sau 5 commit | Đã quên context |
| Skip test vì "khó setup" | Bug return sau 2 tuần |
| Doc + test ở 2 PR khác nhau | Race condition merge |
| Soft rule, không enforce | Mất hiệu lực sau 1 tháng |

---

## Câu khẩu hiệu / Slogan

> "Behavior without test = future bug. Documented change without doc update = lie in the making. Cả hai trong CÙNG commit — hoặc task chưa xong."
