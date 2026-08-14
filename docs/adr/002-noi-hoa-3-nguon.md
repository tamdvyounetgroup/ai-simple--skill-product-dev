# ADR 002 — Nội hoá logic 3 nguồn ngoài (Ponytail / Hallmark / Impeccable), không cài cái nào

- **Ngày**: 2026-08-14 · **Trạng thái**: ACCEPTED (user quyết "lấy logic viết lại vào logic của mình,
  làm chủ toàn bộ tương thích và đồng bộ") · **Thi công**: v1.9.0
- **Quy trình**: 3 hội đồng team-agent (Impeccable 14 agent 2026-08-13 · Ponytail 14 agent 2026-08-14 ·
  Nội-hoá 9 agent 2026-08-14: 3 test máy → 3 bản trích → synthesizer + red-skeptic → judge).
  Mọi claim quyết định đều chạy máy; bản trích bị cắt 42% (43 luật → 25) trước khi vào repo.

## Quyết định

Không cài plugin/skill nào của 3 nguồn. Nội hoá ý tưởng thành luật first-party: nguyên tắc 15
(`methodology/15` + block CLAUDE.md), 18 luật UI (skills/ui-design-logic), cổng máy hook 1d-e..1d-p +
1f + lane gates. Nguồn ý tưởng theo dõi ở `NOTICE.md`; enforcer của từng luật bị `scripts/rule-enforcer-gate.js` kiểm.

## Lý do — RIÊNG từng nguồn (judge cấm gộp)

- **Hallmark** (`13ac0ec`): KHÔNG có cách ghim — 0 tag, `npx skills add nutlope/hallmark#<sha>` fail
  khi chạy thật ("Remote branch not found"), chuỗi version trong repo họ đứng yên qua ~20 commit,
  số gate tự khai lệch nhau giữa 2 file cùng cây tại đúng commit đối chiếu. Contract v1 của ta trỏ
  vào thứ không định danh được — ĐÃ hỏng, không phải nguy cơ. → Nội hoá gate phổ quát, file 08
  chuyển thành route-theo-Type + cửa tuỳ chọn.
- **Ponytail** (`2ed6c52`, plugin 4.9.0): **PIN ĐƯỢC THẬT** (`#v4.9.0` chạy được — ADR này cấm
  viết "không pin được"). Lý do loại là NỘI DUNG + CƠ CHẾ, đo bằng máy (test B1): mode là biến
  toàn cục cấp máy (`~/.claude/.ponytail-active` + `%APPDATA%/ponytail/config.json`, 0 dòng đọc
  `process.cwd()` — repo B đổi mode là repo A đổi theo); hook SubagentStart bơm ~1.307 token vào
  MỌI subagent, allowlist miễn trừ fail-open 5/6 nhánh; payload lite↔ultra chỉ khác 3 dòng/~5.200
  ký tự. Pha BUILD của ta trống là bệnh THẬT — thuốc là nguyên tắc 15 tự viết, không phải plugin.
- **Impeccable** (`ddd23b18`): án lệ hội đồng 2026-08-13 — engine chỉ còn 1 rule chạy được trên
  stack đích (regex Tailwind duy nhất là font-size), advisory 1/59 nên không bật mềm, 137/162
  finding trên prerender là FP tầng parse. Ý tưởng tốt (token-ngoài-hệ, mode, browser surfaces,
  semantic HTML) — nội hoá, tự viết grep.

## Kết quả test máy quyết định

- **B1** (mode per-repo): FAIL về phía plugin — xem trên. Điều kiện cài không thoả → không cài.
- **B2** (subagent có nhận CLAUDE.md?): đo trong session 2026-08-14 tại repo dev — **KHÔNG**:
  khối `claudeMd` cấp cho subagent chỉ chứa auto-memory (MEMORY.md), không chứa CLAUDE.md project.
  *Caveat trung thực: CLAUDE.md được tạo GIỮA session đo — snapshot có thể lấy lúc session start;
  cần đo lại 1 lần ở session mới trước khi coi là chung cuộc.* Hệ quả kiến trúc KHÔNG đổi theo B2
  (thiết kế 3 tầng đã phòng sẵn): luật máy-hoá được sống ở **hook** (phủ mọi agent, mọi context);
  CLAUDE.md là tầng 2 cho agent chính; references là tầng tra cứu — cấm cất luật load-bearing ở đó.
- **B3** (pin/license/độ sống): bảng trong NOTICE.md. Cả 3 nguồn commit rất nhanh (hàng trăm/quý)
  → phụ thuộc là gánh re-verify vô hạn; nội hoá đổi gánh đó lấy nghĩa vụ chống-mục nội bộ
  (rule-enforcer + nhịp soát quý — NOTICE.md).

## Cái bị loại (để lần sau khỏi đề xuất lại)

Mode lite/full/ultra + 5 command Ponytail (flag toàn cục; "lite" không tiết kiệm token thật);
/ponytail-review (5/5 tag ⊂ /simplify); dep-gate (1 WARN/quý, mù trước bệnh thật); catalog
macrostructure/theme + PRODUCT.md/DESIGN.md thành file (nguồn sự thật thứ hai); 2 luật a11y
đúng-nhưng-chưa-dọn (disabled 3 kênh: 48 vi phạm sẵn; svg aria: 51) → backlog dọn trước, luật sau;
grep `opacity-0`/`animate-pulse`/`border-l-4`/blanket-px (đo oan 100%/skeleton hợp lệ/banner hợp lệ/
chặn touch-target hợp lệ); 12 ca luật nguồn đá luật ta (giữ ta hết — số của ta có nguồn đo).

## Đánh đổi chấp nhận có ghi nhận

1. **Có SÀN anti-slop cho landing, không có TRẦN visual craft** — landing của ta "đúng, không sai
   gì", chưa "có cá tính". Cửa công cụ ngoài có điều kiện ở 08 §4. ~5% khối lượng màn hình, đổi lấy
   làm chủ 100% luật cho 95% còn lại.
2. **Tụt sau upstream vĩnh viễn** — chấp nhận, soát nhịp quý ra 1 dòng kết luận (NOTICE.md).
3. **Hook ForFish ~10s/commit Windows** — 8,1s là nợ covers-sync CÓ TRƯỚC đợt này (19 doc, spawn
   per-doc); gate mới thêm +2,3s sau khi gộp vòng lặp + awk-hoá ramp. Nợ ghi trong hook (marker
   `nợ:` 2 vế), awk-hoá covers khi có thêm phàn nàn.
4. **Copy-check ĐÃ CHẠY 2026-08-14** (corpus 3 nguồn tại commit đối chiếu, không commit vào repo):
   quét 6 file luật mới/sửa (CLAUDE.md.template, methodology/15, 02, 03, 04, 08) so với toàn bộ
   .md của 3 nguồn — **chuỗi trùng dài nhất = 0 từ** (ngưỡng fail: ≥15 từ liên tiếp). Ba mục
   red-skeptic nghi dịch-nguyên-văn đã được viết lại từ đầu trước khi vào repo.

## Tiêu chí rút lui

- Gate 1d/1f WARN oan >20% trong 1 tháng (đo: với mỗi commit bị WARN, tái chạy
  `git show <c> --name-status | sh .claude/skills/ui-design-logic/ui-lane.sh --stdin` + đọc diff
  xem WARN có chỉ đúng bệnh không) → nâng ngưỡng hoặc gỡ gate đó.
- Marker `nợ:` = 0 sau 1 tháng dùng thật → gỡ gate 1f-a, xoá luật 15.7 khỏi CLAUDE.md template.
- Tỷ lệ luật chỉ-người-ép (rule-enforcer in mỗi lần chạy) vượt 40% → dừng nhập luật mới, đưa vào /audit.
- Xuất hiện `DESIGN.md`/`PRODUCT.md`/`.ponytail*`/`.impeccable*` viết tay trong repo tiêu thụ →
  vi phạm ADR này, gỡ ngay.
