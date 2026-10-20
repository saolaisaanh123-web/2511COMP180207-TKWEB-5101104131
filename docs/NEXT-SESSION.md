# Jeongyeon — ghi nhớ cho phiên sửa tiếp theo

Cập nhật 20/10/2026. Nhóm sửa 1 và mục Tra cứu ngữ pháp đã hoàn thành. Các nhóm sửa 2–5 bên dưới vẫn là việc tiếp theo; không cần rà lại toàn bộ từ đầu. Người dùng đã cho phép commit/push sau khi nguồn và kiểm thử đạt.

## Mục tiêu và giới hạn phải giữ

- Ưu tiên học từ vựng đúng và hiệu quả; không mở rộng tính năng chỉ để tăng số lượng.
- Giữ giao diện/bản sắc Jeongyeon, ID từ, dữ liệu TXT, lịch sử, lịch ôn, phiên học và khả năng học offline. Không xây lại website.
- Người học đã có nền tảng; không cần khóa học cho người mới. Không dùng dịch vụ phát sinh phí. Chấm ngữ pháp toàn diện có thể bỏ; ngoài phạm vi phải ghi chưa thể chấm tự động.
- Người dùng đã đồng ý commit/push khi mục ngữ pháp có nguồn đã đọc và kiểm thử đạt. Chưa thỏa điều kiện thì không xuất bản phần đang dở; không hỏi lại việc đã được ủy quyền khi điều kiện đã đáp ứng.
- Chưa có dự án Supabase thật; chỉ có mã và cấu hình chuẩn bị. Không tuyên bố đã kiểm thử cloud thực tế.

## Tra cứu ngữ pháp — đã hoàn thành

- Người dùng đã cho phép British Council LearnEnglish làm nguồn chính sau khi Cambridge English Grammar Today trả HTTP 403/Cloudflare. Không có bài nào được ghi là đã đọc hoặc đối chiếu Cambridge; không tắt kiểm tra TLS hoặc vượt challenge.
- 52 bài thực tế trong 8 nhóm, 5 tệp JSON tại data/grammar. Phủ cấu trúc câu/từ loại, danh từ/đại từ/hòa hợp, mạo từ/lượng từ, thì/thể, động từ khuyết thiếu/bị động/V-ing/nguyên mẫu, gián tiếp/điều kiện/ước/quan hệ, so sánh, giới từ/liên từ và các chủ điểm liên quan.
- Mỗi bài có tóm tắt, cách dùng, cấu trúc, ví dụ Anh–Việt tự viết, lưu ý, lỗi thường gặp, phần chi tiết mở rộng và nguồn đúng trang. Trường mistakes.context phân biệt lỗi phụ thuộc ý định diễn đạt với lỗi ngữ pháp chung. Đã rà chéo để loại ví dụ vẫn đúng trong ngữ cảnh khác và các quy tắc tuyệt đối hóa.
- Đã đọc trực tiếp 80 trang nguồn chính thức; kiểm tra live toàn bộ trả HTTP 200 và có nội dung bài. research/*-sources.json chỉ lưu URL/tiêu đề/ngày/hash, không lưu bản sao toàn văn nguồn. Có scripts/check-grammar-sources.py để kiểm tra lại. Bình luận của người học không được dùng làm quy tắc.
- src/grammar-data.ts nạp JSON tĩnh, src/grammar-reference.ts xử lý schema/tìm kiếm, src/GrammarReference.tsx và grammar-reference.css hiển thị. Đã nối menu/breadcrumb trong main.tsx. Mobile có 7 nút điều hướng tối thiểu 44 px, không thêm hàng đè nội dung.
- Tìm Việt/Anh/không dấu/aliases, xếp ổn định. Ranh giới từ tránh bi dong khớp nhầm biệt+dòng; prefix tiêu đề/aliases từ 3 ký tự hỗ trợ pass→passive. Danh mục nhóm, trạng thái không có kết quả, quay lại giữ bộ lọc/focus.
- Không bài tập, điểm số, AI, dịch vụ trả phí hoặc thay đổi IndexedDB. Đọc/tìm kiếm offline sau khi đã tải bản production; mở website nguồn cần Internet. Không thêm trường hay thay ID trong kho từ cho phần ngữ pháp.
- Kiểm thử mới: 13 tìm kiếm/schema + 10 dữ liệu; 3 UI độc lập + 5 tích hợp. Tích hợp kiểm tra toàn bộ 52 bài/chi tiết/nguồn, dữ liệu học và phiên/nháp không đổi, offline và 320/390/768/1440 px. Kiểm tra production có mở/tìm bài tại đường dẫn gốc và đường dẫn con cả online/offline.
- Nguồn được người dùng chấp thuận và ủy quyền xuất bản đã có; không hỏi lại. Báo cáo bàn giao và kết quả cuối ở docs/grammar-reference-2026-10-20.md.

## Cập nhật nguồn từ vựng Anh–Mỹ — đã hoàn thành

- Yêu cầu: Oxford 3000/5000 cho nền tảng, Cambridge/Oxford cho nghĩa, Cambridge Blog cho cách dùng hiện đại, YouGlish cho phát âm/giao tiếp và OPAL cho học thuật; ưu tiên Anh–Mỹ. Đã hoàn tất sau bản ngữ pháp 73a85dc. Báo cáo: docs/vocabulary-sources-2026-10-20.md.
- Có 5.558 mục, 1.061 ready/4.497 lookup. Thêm 396 mục: 57 American Oxford, 316 OPAL theo từ loại, 23 Blog. Giữ 5.162 ID/thứ tự cũ. Bốn nghĩa sửa có chủ đích: hardly, sensible, execution, pants. 61 cách viết Mỹ cho mục cũ lưu preferred_us_spelling, không đổi contentKey/lịch; nội dung học khác có hash bảo vệ.
- Hai PDF American Oxford chính thức đã đọc trực tiếp và bao phủ toàn bộ đầu từ. Bằng chứng Anh–Anh 5.323 dòng/4.955 cách viết giữ nguyên, không đổi CEFR/ID âm thầm. OPAL có 1.339 nhãn đầu từ/1.511 dòng từ loại: bổ sung phần thiếu, không coi khác POS là nghĩa cũ sai. OPAL spoken là ngữ liệu văn nói học thuật Anh–Anh, không phải tần suất Mỹ.
- Có 454 URL với metadata phạm vi/ngày/HTTP/hash; raw HTML chỉ ở /tmp. Cambridge Dictionary còn 403, không tự nhận đã xác minh; Blog/Oxford/YouGlish đọc được. Thêm 316 IPA Mỹ trực tiếp từ nguồn. 12 thuật ngữ Blog mới/chuyên biệt và practical noun Anh–Anh giữ lookup. Ghi đúng nguồn ví dụ biên soạn; giữ ghi nguồn OVDP của a, an no-cloze.
- Hồ sơ mới dùng en-US, giữ lựa chọn đã lưu. Hồ sơ cũ có thể chọn Anh–Mỹ trong Cài đặt. Tìm kiếm, hiển thị và TTS dùng cách viết ưu tiên; chấm nhận hai dạng. YouGlish là liên kết ngoài chọn giọng Mỹ, không embed/cache/chấm. Giữ ví dụ, IPA và audio theo dữ liệu nguồn.
- Pipeline: data/authoring/source-update-2026-10.json và scripts/apply-source-update.py; preview mặc định, --write mới cập nhật. apply-content-review.py tương thích giữ overlay/cảnh báo mới. data/lexicons chứa dữ kiện PDF/OPAL. Không đổi IndexedDB hoặc dependency.
- Kiểm thử cuối: 242 unit, 20 data, 75 E2E đạt; TypeScript/build, production root/subpath/offline tải 5.558 mục và 52 bài ngữ pháp đạt. SHA256 TXT: 19fb2f4dd2ffab355ac9fe59abf1442bfad79fbe036e7262d90197132667d004.
- Chưa công bố toàn bộ nghĩa Việt cũ được rà. Chưa nhập toàn bộ mẫu cụm OPAL; chưa có tần suất đo cho mục mới; chưa xác minh từng video YouGlish, Safari hoặc Supabase thật. Giữ các nhóm sửa 2–5 bên dưới để tiếp tục.

## Thứ tự thực hiện

### 1. Chấm bài và lịch ôn — đã sửa, có hồi quy

- core.record đã tách lịch khỏi independent cho cả self/rule: đúng lần đầu, không hint và đến hạn tăng bậc 1/3/7/14/30; đúng trước hạn giữ lịch; đúng có hint giữ bậc, hẹn ngày mai; sai thật về một ngày. Duplicate review, free practice và ungraded không sửa lịch. Quy tắc chứng nhận nhớ vững vẫn cần bằng chứng độc lập, không cấp bằng lịch ôn.
- Đã kiểm tra ba phiên đủ sáu kỹ năng qua ngày 0/1/4: các kỹ năng có lịch tăng bình thường dù kỹ năng trước đó làm exposure gần. Không còn vòng kẹt một ngày do dùng điều kiện quiet gap toàn từ để quyết định lịch.
- useVisibleExposure áp dụng Kho từ, bộ sưu tập và thẻ trang chủ: chính đoạn nghĩa hiện ít nhất 60% liên tục 700 ms, tab đang hiển thị/không bị che; không ghi toàn trang 60/24 mục, không ghi lại liên tục khi rerender. Kỹ năng 0 chỉ thấy từ chưa ghi exposure; mở đáp án/chi tiết vẫn ghi.
- Thêm trường TXT tùy chọn spelling_variants cho 10 mục được rà (gồm practice/practise động từ, neighbor/neighbour, characterise/characterize). grade/cloze dùng chung answerForms; không fuzzy, không thêm synonym. accepted_answers và contentKey cũ giữ nguyên nên thêm cách viết tương đương không reset lịch/kết quả. Danh từ practice không nhận practise. Policy ở scripts/corpus_policy.py; xem public/data/SOURCES.md.
- assessment.ts dùng outcome correct/incorrect/ungraded. Một số đáp án khác cùng nghĩa Việt+POS ready, ba ngữ cảnh cloze đã rà và 10 nhóm đồng âm được giữ trung lập: lưu lý do assessmentNote, không tính đúng/sai, không retry/reset/mastery. Mục đã archive vẫn được xét làm đáp án thay thế hợp lệ, không được đưa lại vào queue. Đây không phải bộ chấm mọi từ đồng nghĩa.
- Bài nhớ để viết có từ loại/giải nghĩa (che mục từ nếu xuất hiện). Nghe chính tả nghe cả câu và điền phần thiếu khi có context; chỉ nhận sau playback thành công. Giữ tương thích từ cá nhân thiếu context bằng nghe từ, nhóm đồng âm vẫn có phản hồi trung lập. Kết quả mới là nghe/viết có ngữ cảnh, không tuyên bố nghe từ rời.

### 2. Thống nhất bằng chứng và bảo vệ dữ liệu — việc tiếp theo

- analytics bỏ kết quả có gợi ý trước khi xét yếu; có trường hợp vẫn báo nhớ vững sau lần sai có gợi ý. Các bảng cũ/mới còn khác bộ lọc phiên bản nghĩa và thời gian. Không gọi nhớ sau ≥24 giờ khi chưa có khoảng cách thời gian quan sát được. Dùng bộ chọn bằng chứng chung. Xem analytics.ts:106,147; core.ts:497; main.tsx:999.
- Nhập backup cũ hoặc tab cũ lưu kết quả có thể giữ nghĩa mới nhưng phục hồi lịch của nghĩa cũ. Gắn/kiểm tra contentVersion cho lịch theo kỹ năng. Xem main.tsx:2897; storage.ts:209.
- Merge cloud giữ nhãn độc lập cũ dù thiết bị khác đã xem nghĩa gần thời điểm kiểm tra. Cần sự kiện exposure có ID và tính lại bằng chứng dẫn xuất, giữ kết quả gốc. Xem sync.ts:453.
- Nhóm1 chỉ sửa chấm các lượt mới; khi thống nhất bằng chứng cần xem cách phản ánh những lượt cũ bị chấm sai do biến thể hiện đã chấp nhận, không ghi đè/xóa lịch sử bất biến.

### 3. Nội dung chính xác và phù hợp trình độ

- Sau đợt nguồn Mỹ/OPAL: 5.558 mục, 1.061 ready/4.497 lookup. Giữ hàng rào chất lượng; còn nhiều nghĩa Việt nguồn mở lịch sử chưa rà. Ưu tiên tiếp tục những mục B1–C1 hữu ích thay vì đánh dấu toàn kho ready.
- Đã sửa hardly, sensible, execution và nghĩa Mỹ của pants trong đợt nguồn20/10. Tiếp tục rà các nghĩa nguồn mở khác; danh sách Oxford không đồng nghĩa mọi giải nghĩa Việt được Oxford xác nhận.
- Mỗi mục luyện hiện chỉ một ví dụ. Bổ sung 2–3 ngữ cảnh cho mục ưu tiên, kiểm tra bằng câu chưa gặp. Nghĩa mới dùng ID liên kết ổn định, không ghi đè lịch sử nghĩa cũ. Chưa đối chiếu độc lập từng nghĩa trong toàn kho.
- Có 316 IPA Mỹ được đối chiếu cho mục mới; phần lớn mục cũ vẫn chưa có IPA/audio. TTS cần tham chiếu cho từ đa cách phát âm. Không chế IPA hoặc tự nhận audio Oxford.

### 4. Năng suất và đề xuất đúng bài

- Chế độ thông dụng khi luyện có thể lặp cùng 20 mục dù đã trả lời đúng; chế độ smart không có cùng lỗi trong phép thử. Thêm yếu tố cần học/lần luyện gần nhất. Xem recommendations.ts:317.
- Cold start smart ưu tiên từ chức năng A1; 5 từ mới tạo 30 lượt. Cho đánh dấu nhanh từ đã biết, chia phiên theo thời gian/lượt và phân bổ kỹ năng theo nhu cầu; không xóa backlog hay đổi hàng đợi phiên đang học.
- Luyện ngay có thể lấy kỹ năng đã chọn trước đó thay vì điểm yếu. Gửi rõ wordId/skill/dialogueId/attemptId; thay đổi mục tiêu phải được tôn trọng ở phiên mới. Xem main.tsx:2438,676; analytics.ts:563.

### 5. Hội thoại, viết câu, mobile và cloud dài hạn

- 12 hội thoại chỉ có 48 từ mục tiêu; đang nhìn transcript khi trả lời. Mở rộng có biên tập, thêm pha truy hồi ẩn đáp án; đọc/nghe không tự tính thành thạo.
- Quy tắc discuss báo nhầm câu đúng: We discussed about as many cases as we did last week. Giữ phản hồi ngữ pháp hẹp, miễn phí và không chắc thì không kết luận đúng/sai. Xem writing.ts:75.
- Nháp ở phần phản hồi viết trong Tiến độ mất khi chuyển trang; nháp hội thoại chỉ theo tab. Dùng IndexedDB; phản hồi cũ cần hiện phiên bản nghĩa. Nháp trong phiên học đã có lưu, không làm hỏng.
- Mobile 320/390 px: header phần viết bị chồng chữ do CSS header toàn cục. Scope style.css:247, sửa writing-feedback.css:10. Ghi chú quan trọng có chỗ 7–10 px, tương phản thấp; nâng độ đọc được mà giữ phong cách.
- Cloud snapshot ban đầu khoảng 9 MB, raw giới hạn 20 MiB. Trước khi lịch sử lớn cần đồng bộ thay đổi cá nhân/sự kiện tăng dần, không gửi lại toàn bộ corpus và không tự xóa lịch sử.

## Bằng chứng và kiểm thử

- Baseline đã kiểm tra: 8c013e95cb39948cdbab5f53b6fafb40ee442a8c, repo saolaisaanh123-web/WebHocTuVungTiengAnh.
- Sau sửa nhóm 1 và thêm ngữ pháp: `npm test`: 219 đạt (15 file); `npm run test:data`: 12 đạt; Playwright: 67 đạt; `npm run test:production`: TypeScript/build, đường dẫn gốc/con và reload offline gồm tra cứu ngữ pháp đạt. Sau bổ sung citation đã chạy lại 23 unit ngữ pháp, 8 E2E ngữ pháp và production đều đạt. Test bảo toàn trạng thái giữ sourceVersion từ lần nạp đầu để tránh nhầm cập nhật metadata nền với thay đổi do đọc bài.
- Regression mới: src/scheduling-regression.test.ts (13), src/assessment.test.ts (26), src/spelling-variants.test.ts (14), e2e/phase-one-learning.spec.ts (6), e2e/visible-exposure.spec.ts (8); cập nhật assertion lịch cũ và nhãn nút nghe câu ở hai E2E cũ. Data thêm2 tests, kiểm tra pipeline preview giữ nguyên corpus.
- Đã xác nhận update chỉ thêm spelling_variants cho 10 mục; vẫn 5.162 ID/thứ tự/nghĩa, 674 ready/4.488 lookup, không đổi immutable seed. Hash TXT mới b6f7f03d076425de1763975835266588780ab34032ca1c9148ab8f98594ee9a6.
- Các phản ví dụ nêu trên dùng hàm thật/trình duyệt riêng. Test có sẵn chưa bảo vệ đủ tính đúng ngôn ngữ và chuỗi học nhiều tuần. Khi sửa, thêm kiểm thử hồi quy đúng lỗi, không chỉ chạy lại bộ đang đạt.
- Đã kiểm tra UI tại 320×568, 390×844, 844×390, 1440×1000; chưa thử Safari/iPhone thật hay TTS thiết bị người dùng. Chưa thử auth/RLS/merge trên Supabase thật.
- Báo cáo chi tiết trong cùng workspace: /workspace/JEONGYEON-DANH-GIA-HOC-TU-VUNG-2026-10-19.md. Nếu file ngoài checkout không còn ở phiên sau, nội dung ưu tiên trong ghi nhớ này vẫn đủ để bắt đầu.

## Tiêu chí cho đợt tiếp theo

Nhóm1 đã kiểm tra lịch không kẹt một ngày, exposure ngoài màn hình, biến thể hợp lệ và các đề mơ hồ đã xác nhận; giữ lịch sử/lịch/phiên/nháp sau update chính tả. Còn phải thống nhất mọi thống kê cùng nghĩa/phạm vi dùng chung bằng chứng, và bảo đảm sửa nghĩa rồi merge backup/tab cũ không hồi sinh lịch cũ (nhóm2). Không đánh dấu các nhóm2–5 đã hoàn thành; giữ dữ liệu và chạy hồi quy phù hợp trước bàn giao.
