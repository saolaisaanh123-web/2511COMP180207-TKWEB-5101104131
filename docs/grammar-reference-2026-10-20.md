# Tra cứu ngữ pháp và sửa độ chính xác khi ôn từ

Ngày kiểm tra: 20/10/2026 (Asia/Bangkok). Repository: `saolaisaanh123-web/WebHocTuVungTiengAnh`. Bản nền trước thay đổi: `8c013e95cb39948cdbab5f53b6fafb40ee442a8c`.

## Kết quả

Mục **Ngữ pháp → Tra cứu ngữ pháp** có 52 bài hoàn chỉnh trong 8 nhóm, gồm 207 ví dụ Anh–Việt được biên soạn mới. Có danh mục nhóm, tìm Việt có/không dấu, tên tiếng Anh và tên tương đương. Bài mở bằng tóm tắt, cách dùng, cấu trúc và ví dụ; lưu ý, lỗi thường gặp, so sánh và giải thích sâu có thể mở rộng. Nguồn tham khảo luôn hiện cuối bài.

Phạm vi gồm cấu trúc câu/từ loại; danh từ/đại từ/hòa hợp; mạo từ/lượng từ; thì/thể và tương lai; động từ khuyết thiếu/bị động/V-ing/nguyên mẫu; gián tiếp/điều kiện/ước/quan hệ/phân từ; tính từ/trạng từ/so sánh; giới từ/liên từ. Không có nhóm rỗng hoặc bài mẫu chờ bổ sung. Mục này chỉ phục vụ tra cứu, không thêm bài tập hay điểm số.

## Nguồn và giới hạn biên tập

Người dùng đã cho phép **British Council LearnEnglish làm nguồn chính**. Cambridge English Grammar Today trả HTTP 403/Cloudflare và chưa đọc được; không trình bày là đã đối chiếu Cambridge. Các URL British Council được tìm từ liên kết chính thức ở danh mục `/free-resources/grammar/`, không suy đoán đường dẫn.

Đã đọc trực tiếp 80 trang bài và đối chiếu nội dung khi biên soạn. Kiểm tra lại toàn bộ 80 URL: HTTP 200, có nội dung bài, không phải trang chặn hoặc trang lỗi. Chỉ phần bài của nhà xuất bản được dùng làm căn cứ; bình luận của người học không được coi là quy tắc. Giải thích và ví dụ trong ứng dụng là nội dung biên soạn lại, không phải bản dịch được British Council chứng nhận.

Metadata URL, tiêu đề, ngày kiểm tra và SHA256 lưu trong `data/grammar/research/*-sources.json`; không đưa bản sao toàn văn nguồn vào repository. Hash ghi nhận lần truy cập, không giả định HTML của nhà xuất bản bất biến. Công cụ `python3 scripts/check-grammar-sources.py --report /tmp/grammar-source-check.json` cho phép kiểm tra trực tiếp lại sau này; CI kiểm tra tính đầy đủ và metadata đã lưu để không phụ thuộc mạng bên ngoài.

Rà chéo nội dung đã sửa các trường hợp dễ gây hiểu nhầm: không lùi thì/thay từ thời gian máy móc trong câu gián tiếp; không coi mọi cách dùng trạng thái với tiếp diễn là sai; tránh dùng ví dụ hợp lệ như `time enough` làm lỗi; nêu ngữ cảnh khi `remember buying` khác ý định nhắc mua trong tương lai. Dấu hiệu nhận biết được trình bày theo ngữ cảnh, không dùng làm quy tắc tuyệt đối. Đây là lần biên tập và kiểm tra có nguồn, không phải chứng nhận rằng mọi vấn đề ngữ pháp tiếng Anh đều đã được bao quát.

## Tệp chính và lý do thay đổi

| Tệp/nhóm tệp | Vai trò |
| --- | --- |
| `data/grammar/{nouns-determiners,tenses,verbs,clauses,structure-modifiers}.json` | Nội dung ngữ pháp tách khỏi giao diện, có cấu trúc nhất quán để bổ sung/sửa bài. |
| `data/grammar/README.md`, `research/*-sources.json` | Quy trình biên tập và bằng chứng nguồn. |
| `src/grammar-reference.ts`, `src/grammar-data.ts` | Kiểu dữ liệu, tìm kiếm và nạp dữ liệu tĩnh. |
| `src/GrammarReference.tsx`, `src/grammar-reference.css` | Danh mục, bài xem nhanh, chi tiết mở rộng, focus bàn phím và nguồn. |
| `src/main.tsx`, `src/style.css` | Tích hợp menu/breadcrumb; giữ bảy nút điều hướng mobile dùng được từ 320 px. |
| `src/grammar-{reference,data}.test.ts`, `e2e/grammar-reference*.spec.ts` | Kiểm tra phạm vi, dữ liệu, tìm kiếm, tất cả bài, bảo toàn trạng thái, offline và kích cỡ màn hình. |
| `scripts/check-grammar-sources.py`, `scripts/check-production.mjs` | Kiểm tra nguồn thật; mở và tra cứu ngữ pháp trong bản build tại đường dẫn gốc/con cả khi offline. |
| `README.md`, `docs/NEXT-SESSION.md` | Cách dùng, kết quả và công việc còn lại. |

Tìm kiếm chuẩn hóa dấu tiếng Việt, `đ`, chữ hoa/thường và khoảng trắng. Tiêu đề/aliases được ưu tiên; tìm trong nội dung dùng ranh giới từ để `bi dong` không khớp nhầm với các từ như “biệt” và “dòng”. Thứ tự ổn định, giữ nhóm liên quan và bộ lọc khi quay về danh mục. Không dùng ngẫu nhiên hoặc dịch vụ mạng.

## Bảo toàn dữ liệu và hoạt động ngoại tuyến

Phần ngữ pháp không đọc/ghi IndexedDB, không đổi định dạng TXT, ID từ, lịch ôn, lịch sử hoặc cấu trúc sao lưu. Dữ liệu bài được đóng gói vào ứng dụng tĩnh, không cần API hay tài khoản và không phát sinh phí. Sau khi bản production đã tải và chuẩn bị offline, có thể mở lại, tìm và đọc ngữ pháp khi mất mạng; trang nguồn bên ngoài cần Internet.

Kiểm thử tích hợp nạp dữ liệu học có sẵn và so sánh toàn bộ trạng thái trước/sau khi đọc bài: kho từ, kết quả, lịch, phiên/nháp, bài viết và lịch sử hội thoại giữ nguyên. Việc đọc ngữ pháp không tính thành tích học từ vựng.

## Những sửa lỗi từ vựng đi kèm đã hoàn thành trước phần ngữ pháp

- Tách điều chỉnh lịch ôn khỏi điều kiện chứng nhận nhớ độc lập: lượt đến hạn đúng lần đầu/không gợi ý có thể tăng lịch, gồm tự đánh giá; không còn kẹt một ngày do vừa nhìn thấy từ ở kỹ năng khác. Lượt đúng trước hạn không dời lịch, đúng có gợi ý giữ bậc và hẹn ngày mai; sai thật về một ngày.
- Chỉ ghi việc tiếp xúc nghĩa khi phần nghĩa thực sự hiển thị đủ lâu, không ghi cả trang từ nằm ngoài màn hình hoặc tab ẩn. Mở câu hỏi chỉ thấy đầu từ không tự tính đã nhìn nghĩa.
- Bổ sung `spelling_variants` cho 10 mục đã rà; không đổi nghĩa, ID hoặc khóa nội dung nên không reset lịch/kết quả cũ. Chấm và tạo chỗ trống dùng cùng tập biến thể.
- Một số câu hỏi mơ hồ đã xác định được đáp án thay thế/đồng âm lưu kết quả trung lập kèm giải thích, không tạo lỗi sai, reset hoặc chứng nhận nhớ thiếu căn cứ. Đây không phải bộ chấm mọi từ đồng nghĩa.
- Bài nghe chính tả có ngữ cảnh phát cả câu khi có dữ liệu, chỉ nhận kết quả sau khi phát thành công; bài nhớ để viết có thêm từ loại/giải nghĩa.

Các phần này ở `src/core.ts`, `src/assessment.ts`, `src/useVisibleExposure.ts`, `src/CollectionBrowser.tsx`, `src/main.tsx`, các bài hồi quy tương ứng và policy/provenance corpus. TXT vẫn 5.162 ID theo thứ tự cũ, nghĩa không đổi, 674 mục đủ điều kiện luyện. Hash TXT: `b6f7f03d076425de1763975835266588780ab34032ca1c9148ab8f98594ee9a6`.

## Kiểm thử thực tế

- `npm test`: 219/219 đạt, 15 tệp; gồm 23 kiểm thử ngữ pháp.
- `npm run test:data`: 12/12 đạt.
- Playwright toàn bộ: 67/67 đạt; gồm 8 kiểm thử giao diện/luồng ngữ pháp, mở lần lượt đủ 52 bài và phần chi tiết/link nguồn.
- `npm run test:production`: TypeScript và build đạt; ứng dụng/kho 5.162 mục/tra cứu ngữ pháp mở được tại `/` và `/pages-test/`, tải lại offline đạt; thiếu JavaScript hiện thông báo lỗi thay vì trang trắng; không cache request API/dữ liệu riêng.
- Source checker trực tiếp: 80/80 trang nguồn đạt. Hai citation bổ sung cho phủ định sử dụng đúng các URL đã được đọc/kiểm tra, không thêm nguồn chưa xác minh.
- Kiểm tra responsive tại 320/390/768/1440 px: không tràn ngang; chữ nội dung chính ít nhất 14 px. Tại 320 px, cả bảy nút điều hướng nằm trong màn hình, mỗi nút rộng 44 px. Đã xem ảnh giao diện thật trên Chromium mobile và desktop.
- Hồi quy gồm học/ôn, TXT, phiên học/nháp, backup/restore, nhiều tab, hội thoại, viết câu, nghe không khả dụng và đồng bộ mô phỏng.

Chưa kiểm tra Safari/iPhone thật, chất lượng TTS trên thiết bị người dùng hoặc đăng nhập/RLS/merge với dự án Supabase thật vì chưa có project. Không có dịch vụ mới cần cấu hình cho mục ngữ pháp. Build có cảnh báo kích thước bundle JavaScript trên 500 kB (khoảng 201 kB gzip); không làm thất bại build hoặc kiểm thử, nhưng là hạng mục có thể tối ưu sau khi đo hiệu năng thiết bị thực tế.

## Công việc còn lại ngoài đợt này

Các nhóm 2–5 của lần đánh giá trước vẫn được giữ trong `docs/NEXT-SESSION.md`: thống nhất bằng chứng/thống kê, bảo vệ phiên bản nghĩa khi merge backup/cloud, mở rộng từ vựng có biên tập, cải thiện đề xuất và luồng hội thoại/viết/cloud dài hạn. Không đánh dấu những việc này đã hoàn thành chỉ vì bộ kiểm thử hiện tại đạt.
