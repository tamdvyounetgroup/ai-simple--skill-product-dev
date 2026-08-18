## case 0
Với repo mới, việc quan trọng nhất là dựng "bộ nhớ ngoài" cho AI ngay từ đầu, trước khi viết dòng code nào. Tôi khuyên làm theo thứ tự:

1. **Tạo file hướng dẫn gốc** (CLAUDE.md, AGENTS.md hoặc .cursorrules tuỳ công cụ) ở root: mô tả stack (Next.js App Router, Supabase, TypeScript), cấu trúc thư mục dự kiến, quy ước đặt tên, cách chạy test/lint, và các điều cấm (không hardcode key, không dùng service role ở client). Giữ ngắn, dưới 1–2 trang.
2. **Scaffold cấu trúc thư mục rõ ràng** rồi ghi vào file hướng dẫn: `app/`, `components/`, `lib/supabase/`, `db/migrations/`. AI lạc chủ yếu vì không biết "thứ này nên nằm ở đâu".
3. **Định nghĩa schema DB trước** bằng migration SQL và sinh type từ Supabase (`supabase gen types`). Type là rào chắn hiệu quả nhất chống bịa: AI bịa cột thì TypeScript báo ngay.
4. **Bật lint + typecheck + test chạy trong pre-commit** (husky/lint-staged). Máy kiểm chứ đừng tin AI tự nói "đã test".
5. **Mỗi tính năng: viết spec ngắn trước** (mục tiêu, màn hình, dữ liệu, tiêu chí chấp nhận) trong `docs/`, rồi mới bảo AI code theo spec.
6. Kết thúc mỗi phiên, yêu cầu AI cập nhật file hướng dẫn nếu quy ước thay đổi.

Nguyên tắc chung: những gì AI cần biết phải nằm trong repo, ở dạng máy đọc được, và được kiểm bằng công cụ, không dựa vào lời AI.

## case 1
Ba triệu chứng này có cùng gốc: AI đang phải đoán vì không có bản đồ repo và không được ép kiểm chứng. Cách xử lý:

**Chống bịa tên hàm**: yêu cầu AI luôn grep/đọc file trước khi gọi hàm, và ghi rõ luật đó vào file hướng dẫn ("trước khi dùng hàm/type nào, phải mở file định nghĩa"). Bật typecheck nghiêm (`tsc --noEmit`, `strict: true`) và chạy sau mỗi thay đổi; hàm bịa sẽ lộ ngay. Nếu ngôn ngữ động, thêm linter bắt tên chưa định nghĩa.

**Chống đọc nhầm file**: với ~300 file, viết một file bản đồ (`docs/app-map.md` hoặc phần "Cấu trúc" trong CLAUDE.md) liệt kê module chính, file vào của mỗi luồng, và những file dễ nhầm tên nhau. Đặt tên file phân biệt rõ, tránh nhiều `utils.ts`, `index.ts` giống nhau. Nếu công cụ hỗ trợ, thêm CLAUDE.md con ở từng thư mục lớn.

**Chống hỏi lại từ đầu mỗi phiên**: dồn các quyết định đã chốt vào repo, không để trong chat. Cụ thể: file hướng dẫn gốc, thư mục `docs/adr/` cho các quyết định kiến trúc, và mục "trạng thái hiện tại / việc đang dở" cập nhật cuối mỗi phiên. Bắt đầu phiên mới bằng câu "đọc CLAUDE.md và docs/app-map.md trước".

Sau 1–2 tuần, xem log xem AI còn hỏi gì lặp lại thì bổ sung đúng thứ đó vào docs. Đừng cố viết đủ từ đầu.

## case 2
Hiểu cảm giác đó, nhưng "tự làm hết" thường đổi mệt vì hỏi thành mệt vì dọn hậu quả. Cách hợp lý là phân loại theo mức rủi ro thay vì bật/tắt toàn bộ:

- **Việc đảo ngược được bằng git** (sửa code, test, doc, refactor trong nhánh): cho AI đi thẳng, không hỏi. Đây là đa số việc và là nơi hỏi xác nhận gây phiền vô ích.
- **Việc đổi hành vi nhìn thấy được với người dùng hoặc đội** (đổi API công khai, đổi schema DB có migration, đổi config CI): cho AI tự làm nhưng phải để lại ghi chú "giả định" và test kèm, bạn review sau.
- **Việc không hoàn tác được** (xoá dữ liệu, chạy migration lên production, push force, gửi mail, thanh toán, đổi secret): bắt buộc hỏi, gộp thành một câu xác nhận duy nhất thay vì hỏi từng bước.

Cách thực hiện: ghi phân loại này vào file hướng dẫn cho AI (CLAUDE.md/AGENTS.md), đồng thời điều chỉnh permission của công cụ: allowlist các lệnh an toàn (lint, test, git status/diff/commit), giữ prompt cho lệnh phá huỷ. Kèm theo đó là lưới an toàn để bạn yên tâm buông tay: làm việc trên nhánh riêng, pre-commit chạy test, và review diff trước khi merge.

Kết quả thường thấy: số lần hỏi giảm 80–90% mà bạn vẫn giữ quyền với 10% việc thật sự nguy hiểm.

## case 3
Đây là bài toán điều phối, không phải bài toán AI. Hai phiên cùng sửa một working tree thì chắc chắn đè nhau. Sửa theo ba lớp:

1. **Tách không gian làm việc**: mỗi phiên AI làm trên một `git worktree` riêng (`git worktree add ../repo-feat-a feat/a`) hoặc ít nhất một nhánh riêng, không bao giờ hai phiên cùng checkout một thư mục. Đây là bước quan trọng nhất.
2. **Tách phạm vi file**: trước khi giao việc, chia rõ phiên A đụng thư mục/module nào, phiên B đụng gì. Ghi phạm vi này vào prompt của từng phiên và bảo chúng không sửa ngoài phạm vi; nếu bắt buộc phải sửa file dùng chung (types, config, schema), dừng và báo lại thay vì tự sửa.
3. **Merge có kiểm soát**: merge từng nhánh vào main tuần tự, chạy test sau mỗi lần merge. Nếu có conflict, để người hoặc một phiên duy nhất giải quyết, không để cả hai cùng "sửa cho hết conflict". Kiểm tra `git log -p` xem thay đổi có bị mất không trước khi xoá nhánh.

Nguyên nhân "merge xong mất thay đổi" thường là một phiên đã `git checkout -- file` hoặc `reset --hard` để "làm sạch", đè lên việc của phiên kia. Hãy cấm tường minh các lệnh đó trong hướng dẫn cho AI, và cho AI commit nhỏ, thường xuyên để mọi thứ đều truy được trong reflog.

Nếu việc song song là thường xuyên, cân nhắc thêm một file khoá đơn giản hoặc quy ước "một phiên một module".

## case 4
Không nên xoá hết viết lại. Xoá sạch làm mất cả phần vẫn đúng lẫn lý do đằng sau các quyết định cũ, còn viết lại từ đầu thì cũng sẽ mục sau 6 tháng nữa vì gốc rễ (không có cơ chế giữ docs đúng) chưa được xử lý.

Cách tôi đề xuất:

1. **Phân loại nhanh** từng file: (a) mô tả thứ code đang làm và có thể kiểm bằng cách đọc code hoặc chạy lệnh; (b) quyết định/lý do (ADR, why); (c) hướng dẫn thao tác (setup, deploy). Loại (b) hiếm khi sai vì là lịch sử; loại (a) và (c) mới hay mục.
2. **Kiểm bằng máy đến mức có thể**: link chết, lệnh trong docs chạy còn được không, tên file/hàm được nhắc còn tồn tại không (grep). Việc này AI làm tốt và nhanh.
3. **Đánh dấu thay vì xoá**: file nào chưa kiểm được thì thêm dòng đầu "Chưa xác nhận từ 2026-02, đọc với sự dè dặt". File nào chắc sai thì sửa hoặc chuyển vào `docs/archive/`.
4. **Giảm số docs load-bearing**: chỉ giữ một số ít file mà người/AI thật sự phải đọc trước khi làm việc (hướng dẫn gốc, bản đồ repo, cách chạy). Những file này phải có chủ và có ngày cập nhật.
5. **Cài cơ chế chống mục**: quy ước "đổi hành vi thì sửa docs cùng commit", và một kiểm tra định kỳ (mỗi quý) chạy lại bước 2.

Docs mục vì không có vòng bảo trì, không phải vì viết dở.

## case 5
Tôi sẽ đi theo bốn phần: vai trò, luồng, ngoại lệ, và tiêu chí chấp nhận. Vì chưa có chi tiết nghiệp vụ của bạn, phần dưới là khung để bạn điền và các câu hỏi cần trả lời trước.

**Vai trò**: Người tạo đơn (nộp, sửa khi bị trả về, huỷ trước khi duyệt xong); Người duyệt các cấp (duyệt, từ chối kèm lý do, trả về để bổ sung); Người quản trị (cấu hình chuỗi duyệt, uỷ quyền, xem toàn bộ). Cần chốt: chuỗi duyệt cố định theo loại đơn hay theo điều kiện (giá trị, phòng ban)?

**Luồng chính**: Nháp → Đã nộp → Chờ duyệt cấp 1 → ... → Chờ duyệt cấp N → Đã duyệt. Mỗi bước ghi log ai, lúc nào, quyết định gì. Từ chối ở bất kỳ cấp nào → Bị từ chối (kết thúc) hoặc Trả về (quay về người tạo, nộp lại thì bắt đầu từ cấp 1 hay từ cấp đã trả?).

**Ngoại lệ phải hỏi bạn**: người duyệt vắng mặt (uỷ quyền, hết hạn tự leo cấp?); người duyệt trùng người tạo; đơn bị sửa sau khi đã có cấp duyệt (huỷ các duyệt trước?); song song hay tuần tự trong cùng cấp; thu hồi đơn giữa chừng.

**Tiêu chí chấp nhận mẫu** (viết dạng Given/When/Then): đơn ở cấp 2 thì cấp 1 không thể duyệt lại; từ chối bắt buộc có lý do; người tạo thấy đúng trạng thái và người đang giữ đơn; mọi thay đổi trạng thái có trong lịch sử; người không thuộc chuỗi không thấy nút duyệt.

Bạn trả lời các câu hỏi ngoại lệ, tôi sẽ viết thành spec đầy đủ kèm bảng ma trận trạng thái × vai trò.

## case 6
Triệu chứng "có dữ liệu nhưng lọc theo tháng ra trống" gần như luôn nằm ở một trong bốn chỗ. Tôi sẽ đi lần lượt để khoanh vùng thay vì đoán:

1. **Xem query thực tế được gửi đi**: mở Network tab (hoặc log server) khi bấm lọc, xem tham số tháng có đúng không. Lỗi thường gặp: tháng gửi dạng 0-based từ JS (`getMonth()` trả 0–11) trong khi backend/SQL hiểu 1–12; hoặc gửi cả `from/to` nhưng `to` bằng đầu tháng thay vì cuối tháng nên khoảng rỗng.
2. **Múi giờ**: dữ liệu lưu UTC, người dùng ở UTC+7, ngày cuối tháng bị lệch sang tháng sau hoặc ngược lại. Kiểm bằng cách so `created_at` thô của vài dòng với điều kiện lọc.
3. **So sánh sai kiểu**: cột dạng timestamp nhưng lọc bằng chuỗi `"2026-08"`, hoặc so `=` với ngày thay vì khoảng `>= đầu tháng AND < đầu tháng sau`.
4. **State phía client**: bảng nhận kết quả nhưng render dựa trên biến cũ, hoặc filter chạy hai lần và lần sau ghi đè bằng mảng rỗng; xem thứ tự setState/effect và điều kiện loading.

Cách làm nhanh: chạy tay query với đúng tham số đang gửi lên; nếu ra dữ liệu thì lỗi ở client, nếu trống thì lỗi ở tham số hoặc query. Sau khi tìm ra, sửa ở hàm dựng khoảng thời gian dùng chung (không vá riêng dashboard), thêm test cho ranh giới đầu/cuối tháng và tháng 12 → tháng 1. Nếu bạn gửi đoạn code lọc và query, tôi chỉ đúng dòng.
