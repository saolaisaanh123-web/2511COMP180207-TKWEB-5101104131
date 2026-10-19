# Dữ liệu Tra cứu ngữ pháp

Kho tra cứu gồm 52 bài trong 8 nhóm. Người dùng đã chấp thuận British Council LearnEnglish làm nguồn chính ngày 20/10/2026, sau khi Cambridge English Grammar Today trả trang chặn Cloudflare/HTTP 403. Không có bài nào được gắn nhãn đã đối chiếu Cambridge.

Nguồn chính thức được tìm theo liên kết thật từ https://learnenglish.britishcouncil.org/free-resources/grammar/english-grammar-reference và các danh mục A1–A2, B1–B2, C1. Chỉ đọc nội dung bài của nhà xuất bản, không lấy bình luận của người học làm quy tắc. Giải thích tiếng Việt và ví dụ Anh–Việt do ứng dụng biên soạn, không phải bản dịch được British Council chứng nhận.

## Tệp nội dung

- nouns-determiners.json: danh từ, đại từ, sở hữu, hòa hợp, mạo từ và lượng từ.
- tenses.json: các dạng đơn/tiếp diễn/hoàn thành và cách diễn đạt tương lai.
- verbs.json: khuyết thiếu, bị động, V-ing/nguyên mẫu, động từ trạng thái, used to.
- clauses.json: gián tiếp, điều kiện, câu ước, quan hệ và phân từ.
- structure-modifiers.json: cấu trúc câu/từ loại, câu hỏi/phủ định, so sánh, giới từ và liên từ.
- research/*-sources.json: URL, tiêu đề, ngày đọc, mã HTTP và SHA256 của trang đã đọc; không chứa toàn văn nguồn. Hash ghi lại lần lấy trang, không hứa rằng HTML động của nhà xuất bản luôn giữ nguyên.

src/grammar-data.ts nạp các mảng JSON vào bundle tĩnh, định nghĩa thứ tự tám nhóm; không có truy vấn dịch vụ ngoài khi tra cứu. Bài đọc và tìm kiếm dùng được ngoại tuyến sau khi ứng dụng production đã được chuẩn bị; mở đường dẫn nguồn cần Internet.

## Cấu trúc dữ liệu khi biên soạn

Mỗi tệp JSON chứa một mảng bài theo nhóm; kiểu chính thức nằm ở src/grammar-reference.ts. Tách dữ liệu khỏi component src/GrammarReference.tsx, không thêm vào kho TXT hoặc IndexedDB của từ vựng.

Mỗi bài gồm:

- id và groupId ổn định; title tiếng Việt; aliases gồm tên tiếng Anh và các tên gọi tương đương.
- summary ngắn, whenToUse giải thích cách dùng, structures nếu chủ điểm có mẫu cấu trúc.
- examples tự viết, mỗi ví dụ có en và vi.
- notes về giới hạn/ngoại lệ; mistakes có wrong, correct, explanation và context tùy chọn. Dùng context khi khác biệt phụ thuộc ý muốn diễn đạt. Chỉ đánh dấu sai khi sai trong ngữ cảnh đã nêu, không phủ định cách dùng hợp lệ trong ngữ cảnh khác.
- comparisons để phân biệt cấu trúc khi cần; details cho phần giải thích mở rộng.
- sources có title, URL đúng bài đã đọc và accessedAt theo YYYY-MM-DD. Không dùng đường dẫn suy đoán hoặc trang bị chặn làm nguồn đã xác minh.

Phạm vi phải phủ đầy đủ các nhóm người dùng yêu cầu: cấu trúc câu/từ loại; danh từ/đại từ; mạo từ/lượng từ; thì/thể; động từ khuyết thiếu; bị động; gián tiếp; câu hỏi/phủ định; điều kiện/ước; quan hệ; so sánh; V-ing/to-infinitive; giới từ/liên từ; hòa hợp chủ ngữ–động từ và các chủ điểm liên quan thông dụng.

## Điều kiện bật và xuất bản

1. Đọc trực tiếp nguồn và ghi lại bằng chứng truy cập; chỉ lưu metadata trong repository, không sao chép hàng loạt bài nguồn.
2. Biên soạn tiếng Việt và ví dụ mới, đối chiếu từng quy tắc/ngoại lệ; dấu hiệu nhận biết chỉ là gợi ý phải được ghi rõ.
3. Kiểm tra dữ liệu không trùng ID, đủ trường/nội dung và mọi nguồn đều đúng trang đã đọc; không thêm nhóm/bài rỗng để đủ danh mục.
4. Tích hợp menu và loader dữ liệu; giữ bảy mục điều hướng mobile có thể thao tác được mà không đè nội dung.
5. Chạy kiểm tra tìm kiếm, mở bài/chi tiết/nguồn, mobile/desktop, hồi quy từ vựng, TypeScript và production/offline trước commit/push.

Kiểm tra dữ liệu và tìm kiếm nằm trong src/grammar-data.test.ts, src/grammar-reference.test.ts. Kiểm thử giao diện độc lập và tích hợp nằm trong e2e/grammar-reference-ui.spec.ts và e2e/grammar-reference.spec.ts. Kiểm tra liên kết trực tiếp theo yêu cầu: `python3 scripts/check-grammar-sources.py --report /tmp/grammar-source-check.json`. Lệnh này kiểm tra trang thật và chỉ lưu metadata; không tự chứng nhận chất lượng biên tập. CI dùng bằng chứng nguồn đã lưu để không phụ thuộc tình trạng mạng của nhà xuất bản.

Không có bài tập, điểm số, chấm câu, tài khoản mới hoặc dịch vụ trả phí trong mục tra cứu này.
