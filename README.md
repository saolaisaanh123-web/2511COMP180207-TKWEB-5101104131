# Jeongyeon — Góc học từ vựng IELTS cá nhân

Website: [Jeongyeon](https://saolaisaanh123-web.github.io/WebHocTuVungTiengAnh/).

Ứng dụng React + TypeScript + Vite, giao diện tiếng Việt. Các phần học, hội thoại và phản hồi cấu trúc viết chạy tại máy, không cần tài khoản hoặc API trả phí. Đồng bộ tùy chọn dùng Supabase Free sau khi tự cấu hình.

Nâng cấp hiện tại: bốn chế độ chọn từ, phân tích bằng chứng ghi nhớ, 12 hội thoại biên soạn sẵn, kiểm tra cấu trúc viết ngoại tuyến, tải lại offline và đồng bộ có xử lý xung đột. Xem [báo cáo chi tiết](docs/nang-cap-jeongyeon-2026-10-19.md) và [thiết lập Supabase Free](docs/services-setup.md). Không có AI chấm câu tổng quát hoặc cơ chế phát sinh phí.

## Chạy trên máy

Cần Node.js 22 trở lên và npm:

```sh
npm ci
npm run dev
npm test
npm run build
npm run test:production
npm run preview
```

Kiểm thử trình duyệt: `npm run test:e2e`. Cấu hình ưu tiên `CHROMIUM_PATH`, sau đó Chromium hệ thống `/usr/bin/chromium`, cuối cùng trình duyệt đã cài bằng Playwright. Trên máy khác, cài Chromium rồi đặt `CHROMIUM_PATH` thành đường dẫn trình duyệt. Có thể dùng Playwright Chromium sau khi `npx playwright install chromium` và chỉ định đường dẫn tương ứng. Không cần trình duyệt để chạy unit test/build.

## Thêm và sửa từ mà không sửa code

Sửa file UTF-8 `public/data/vocabulary.txt`. Mỗi mục cách nhau bởi một dòng `---`; mỗi trường trên một dòng `tên_trường: nội dung`. Hỗ trợ CRLF của Windows, BOM và tiếng Việt. Không dùng dòng xuống hàng bên trong giá trị trường.

Các trường bắt buộc: `id`, `word`, `meaning_vi`, `example_en`, `example_vi`. Những trường khác xem trong file mẫu. `topics` và `collections` dùng dấu phẩy; `accepted_answers` dùng dấu `|` giữa các đáp án hợp lệ. Không tự chấp nhận từ đồng nghĩa ngoài danh sách này. `audio_word` và `audio_example` nhận URL HTTP/HTTPS; hãy chỉ dùng nội dung có quyền sử dụng.

- Giữ nguyên ID khi sửa cách diễn đạt để giữ lịch sử. Một nghĩa mới nên có ID mới.
- Bộ từ: `foundation`, `ielts`, `personal`; một mục có thể có nhiều nhãn.
- Kho mặc định gồm **toàn bộ 4.955 đầu từ/cách viết trong hai PDF Oxford 3000/5000** (5.323 dòng nguồn/từ loại/CEFR), cộng **100 mục nghĩa cụm động từ** và **107 mục Slang/thành ngữ/khẩu ngữ**; tổng 5.162 bản ghi. Có 27 thành ngữ đối chiếu với bài báo/chương trình Mỹ. Phân biệt nội dung đã rà soát, nghĩa nhập từ từ điển mở chưa rà soát từng mục, và 1 mục chỉ tra cứu có xung đột nguồn. Không gán mọi nghĩa/âm thanh cho Oxford. Xem [SOURCES.md](public/data/SOURCES.md) và giấy phép dữ liệu nhập.
- Các trường mở rộng: `content_status` (`reviewed`, `dictionary`, `reference`), `example_type`, `register`, `region`, `case_sensitive`. Mục nhập thông thường vẫn bắt buộc nghĩa và ví dụ. `dictionary` cho phép thiếu ví dụ khi nguồn không cung cấp, phải có nghĩa và nguồn; `reference` chỉ tra cứu và bắt buộc ID/từ/nguồn, không tạo bài kiểm tra. Không dùng giá trị giả để qua kiểm tra.
- Mặc định **674 mục được phép học**; **4.488 mục chỉ tra cứu** vẫn được giữ trong Kho từ. `learning_status: ready` cho phép dùng trong bài học; `lookup` chặn bài học. Không tự coi toàn bộ danh sách Oxford là nội dung đã rà. Người dùng có thể đối chiếu, bổ sung ví dụ, xác nhận để học và lưu bản cá nhân trong trang chi tiết.
- Kho từ phân trang 60 mục, Slang/cụm động từ phân trang 24 mục. Slang có trang riêng và không tự chen vào kế hoạch từ mới Oxford. Cụm từ không được gán CEFR khi chưa có căn cứ.
- Kho từ giữ thứ tự CEFR A1–C2, rồi tần suất giảm dần trong cùng trình độ, rồi A–Z. Việc chọn từ cho phiên mới có bốn chế độ riêng: Thông minh, Ưu tiên thông dụng, Củng cố từ yếu và Trộn từ. CEFR chỉ hỗ trợ chọn; từ đến hạn và phiên đang học không bị chế độ mới xáo trộn. Mục chưa có CEFR/tần suất được ghi rõ, không bị coi là bằng chứng ít dùng. `frequency_zipf` và `frequency_source` ghi ước lượng cách viết tổng hợp từ wordfreq 3.1.1 cho 4.921 mục; không phân biệt nghĩa/từ loại/chữ hoa, không phải điểm Oxford hay tần suất riêng của thời sự Mỹ. Xem [phương pháp và giấy phép](data/frequency/README.md).
- Trong Slang, lọc **Loại cách nói → Thành ngữ** và **Nguồn ngữ cảnh → Bản tin / phỏng vấn** để tìm các cụm dài. `expression_type` phân biệt `idiom`, `slang`, `colloquialism`, `abbreviation`, `term`. Các trường `news_source`, `news_title`, `news_url`, `news_date`, `news_excerpt`, `news_context_vi`, `news_source_type` lưu ngữ cảnh có nguồn; `news_source_type` là `reporting` hoặc `language-lesson`, không gộp bài dạy tiếng Anh thành tin thời sự. Trích dẫn và ví dụ luyện tập được trình bày riêng. Xem [dấu vết đối chiếu 27 bài nguồn](public/data/news-provenance.json). Không tự tải tin mới khi người học mở web.
- Sửa file repository rồi triển khai lại. Chọn **Kho từ → Cập nhật kho mặc định** để xem trước và áp dụng phiên bản mới. Khi tải lại, ứng dụng báo nếu có bản mới và cho xem trước; không tự thay thế bản chỉnh sửa cá nhân.
- Hoặc chọn **Nhập .txt**, kiểm tra số thêm/sửa/lưu trữ rồi xác nhận. File lỗi bị từ chối toàn bộ với số dòng/mục; không ghi đè im lặng.
- Mỗi nguồn cập nhật lưu trữ những mục không còn xuất hiện trong cùng nguồn; lịch sử và lịch ôn vẫn còn. File cá nhân có ưu tiên so với mặc định khi trùng ID. Phần xem trước liệt kê thay đổi nội dung, những xung đột mặc định/cá nhân được giữ bản cá nhân.
- Sửa qua giao diện lưu tại trình duyệt, không sửa repository. **Tải kho .txt** xuất các mục đang hoạt động theo cùng định dạng. Trình duyệt không tự ghi đè file gốc.

## Cách học và đánh giá

**Hôm nay** ưu tiên lượt kỹ năng đến hạn trước các mục mới. Mặc định 5 mục mới/ngày, chỉnh được trong cài đặt; giảm đề xuất còn 2 khi tồn hơn 20 lượt ôn. Số mục đến hạn được đếm theo ID, khác số lượt kỹ năng.

Mỗi kỹ năng có lịch riêng: 1–3–7–14–30 ngày, sai quay về 1 ngày. Lượt dùng hỗ trợ không tăng bậc. Quên được hỏi lại sau tối đa ba câu xen kẽ nếu hàng đợi đủ dài; nếu không đủ thì nằm cuối hàng đợi. Ôn quá hạn không tự tính là quên. Ngày dùng múi giờ địa phương của trình duyệt.

Phiên học và các lượt đã gửi được lưu trong IndexedDB. Tải lại và tiếp tục không gửi lại kết quả đã lưu. Một lần ôn chỉ cập nhật lịch một lần; lượt luyện tự do lưu bằng chứng nhưng không thay đổi lịch. Mục tự đánh dấu đã biết được bỏ khỏi danh sách từ mới, không coi là đã kiểm tra. Luyện tự do không loại từ khỏi lần giới thiệu theo lịch; các phiên ôn đang dở được giữ riêng khi chuyển sang luyện tự do. Câu đang gõ được lưu nháp và phục hồi; kết quả đã gửi không bị gửi trùng.

Sáu kỹ năng được lưu riêng. Hiểu nghĩa và nghe nhớ nghĩa dùng tự đánh giá **Quên / Nhớ khó / Nhớ rõ**; tự đánh giá không được xem như kiểm tra khách quan. Nhớ để viết, nghe chính tả, điền ngữ cảnh được chấm theo đáp án khai báo, bỏ khoảng trắng thừa và không phân biệt hoa thường. Câu tự viết được lưu như trước, có thêm phản hồi về bảy nhóm cấu trúc giới hạn với tô lỗi, giải thích, gợi ý và lưu các bản sửa. Không phát hiện mẫu sai không có nghĩa câu đúng; nghĩa/ngữ cảnh/độ tự nhiên ghi rõ **Chưa thể chấm tự động**. Không có yêu cầu đến dịch vụ ngữ pháp hoặc AI.

Trong **Luyện tập → Hội thoại thực tế**, chọn nội dung B1/B2, dài 6 hoặc 8 lượt lời. Mỗi đoạn có hai nhân vật và bốn mục từ, bản dịch tùy chọn, nghe từng câu/toàn đoạn, câu hỏi hiểu–điền–nghĩa và trả lời mở chưa chấm. Chỉ ghi “phù hợp từ đã học” khi có ít nhất ba từ khớp dữ liệu học thực tế; trường hợp khác là bài mẫu, không giả cá nhân hóa. Ngữ cảnh đang hiện là hỗ trợ, không được gán bằng chứng nhớ độc lập.

“Nhớ khá vững” cho từng kỹ năng cần ít nhất 3 lần kiểm tra đúng lần đầu, không hỗ trợ, ở 3 ngày khác nhau, có một lần sau ít nhất 7 ngày không tiếp xúc đã ghi nhận, và chưa tiếp xúc lại đáp án ở bất kỳ kỹ năng nào trong 24 giờ trước. `exposureGap` đo từ mọi tiếp xúc đã biết, khác `gap` chỉ đo giữa hai lượt cùng kỹ năng. Dữ liệu cũ thiếu trường mới vẫn giữ nguyên, chưa đủ để suy diễn khoảng nghỉ 7/30 ngày. Kết quả phải khớp nghĩa hiện tại. Kỹ năng chỉ tự đánh giá chưa đủ điều kiện này. Đây là quy tắc của ứng dụng, không phải chứng nhận ngôn ngữ; không quy đổi số từ thành band IELTS. Chỉ số luôn kèm số lượt làm cơ sở; chưa có dữ liệu không tạo kết quả giả.

Bài nghe chỉ cho ghi nhận sau khi âm thanh kết thúc thành công; lỗi hoặc chưa phát không tạo điểm nghe. Phát âm dùng URL nếu có, giọng tổng hợp tiếng Anh của thiết bị là dự phòng, chỉ phát khi bấm. Có ưu tiên Anh–Anh/Anh–Mỹ và tốc độ. Giọng thật phụ thuộc hệ điều hành; không có giọng sẽ thông báo và cho bỏ qua bài nghe mà không lưu điểm.

## Sao lưu

**Cài đặt & sao lưu → Sao lưu toàn bộ JSON** để xuất kho từ (kể cả lưu trữ), bản sửa, câu tự viết và các phản hồi/phiên bản, kết quả hội thoại, tiến độ, lịch ôn, lịch sử, cài đặt và phiên học. JSON không chứa token đăng nhập. JSON khác file TXT chỉ chứa nội dung học.

Khôi phục JSON có xem trước và hai cách:

- **Hợp nhất**: lịch sử gộp theo ID lượt, không cộng trùng; mục và lịch trùng ID giữ bản hiện tại; giữ phiên hiện tại.
- **Thay thế**: ghi đè toàn bộ sau xác nhận rõ ràng. Hãy tải bản sao hiện tại trước.

IndexedDB v2 tách nội dung từ vựng khỏi tiến độ, nâng cấp từ dữ liệu v1 mà không xóa lịch sử. Các tab cùng thiết bị đồng bộ thay đổi; giao dịch phát hiện xung đột cùng phiên và từ chối ghi đè thay vì mất tiến độ. Nếu còn tab chạy bản rất cũ giữ kết nối v1, đóng tab đó rồi tải lại để nâng cấp nơi lưu.

Sau khi cấu hình Supabase Free, đăng nhập và chủ động liên kết, dữ liệu có thể đồng bộ giữa thiết bị bằng hợp nhất ba chiều và ghi có điều kiện theo revision; lịch sử viết/hội thoại/học cộng dồn bằng ID. Xung đột nội dung được chặn và yêu cầu chọn sau khi tải hai bản dự phòng. Không xóa dữ liệu khi đăng xuất; thay toàn bộ JSON hủy liên kết đồng bộ để cần xác nhận lại. Chưa có project nên đồng bộ thật/email/Google/RLS chưa được xác minh. Xem [hướng dẫn cấu hình và giới hạn](docs/services-setup.md).

Service worker bản production lưu ứng dụng và TXT đã đối chiếu hash để tải lại khi offline sau một lần chuẩn bị thành công. Không cache auth/API hoặc dữ liệu riêng. Giọng TTS ngoại tuyến tùy giọng đã cài của thiết bị. Dữ liệu vẫn có thể mất khi xóa dữ liệu trình duyệt, dùng chế độ riêng tư hoặc thay đổi địa chỉ website. Nên sao lưu thường xuyên và trước khi đổi miền. Font được đóng gói cục bộ, không yêu cầu Google Fonts.

## GitHub Pages

Đã có workflow `.github/workflows/pages.yml`, build/test và triển khai khi push lên `main`.

1. Trong repository, vào **Settings → Pages → Build and deployment → Source**, chọn **GitHub Actions** (cần quyền quản trị repository).
2. Push lên `main`, hoặc chạy workflow **Deploy Jeongyeon to GitHub Pages** thủ công từ Actions.
3. Khi job deploy thành công, lấy địa chỉ thật tại **Settings → Pages** hoặc kết quả workflow.

Vite dùng `base: './'`; nội dung lấy theo `import.meta.env.BASE_URL`. Điều hướng nội bộ không thêm đường dẫn nên tải lại trên GitHub Pages không gây 404. Không đưa thư mục `dist` hoặc `node_modules` lên Git.

## Cấu trúc

- `public/data/vocabulary.txt`: toàn bộ dữ liệu từ vựng mẫu, độc lập mã nguồn.
- `src/core.ts`: parser/serializer, hợp nhất, chấm đáp án, lịch ôn, đánh giá bằng chứng và kiểm tra backup.
- `src/storage.ts`: giao dịch IndexedDB v2, nâng cấp v1, tách nội dung/tiến độ và chống ghi đè giữa tab.
- `src/main.tsx`: sáu mục điều hướng hiện có, phiên học, âm thanh, nhập/xuất và tích hợp các nâng cấp.
- `src/recommendations.ts`, `src/analytics.ts`: chọn từ và phân tích bằng chứng riêng với thứ tự Kho từ.
- `src/conversations.ts`, `src/ConversationPractice.tsx`: nội dung hội thoại và bài luyện có kết quả thật.
- `src/writing.ts`, `src/WritingFeedback.tsx`: kiểm tra cấu trúc tại máy, phản hồi và các bản sửa.
- `src/practice-data.ts`: kiểu và kiểm tra dữ liệu bổ sung tương thích sao lưu cũ.
- `src/sync.ts`, `src/SyncSettings.tsx`, `supabase/schema.sql`: kết nối tùy chọn, hợp nhất, xác thực và quyền dữ liệu.
- `src/offline.ts`, `public/sw.js`: tải lại ngoại tuyến cho bản production.
- `src/DictionaryEntry.tsx`: trình bày mục từ kiểu từ điển, phân biệt nguồn Oxford và phần biên soạn.
- `src/style.css`: thiết kế responsive, thanh bên desktop/thanh dưới mobile.
- `src/core.test.ts`: kiểm thử quy tắc dữ liệu và bằng chứng.
- `e2e/app.spec.ts`: luồng Chromium, lưu bền, nhập kho, phục hồi, âm thanh không khả dụng, bố cục điện thoại.

## Giới hạn được biết

- Không chấm tổng quát ngữ nghĩa, độ tự nhiên hoặc phát âm; phản hồi viết chỉ nhận diện các cấu trúc đã hỗ trợ. Đồng bộ cần project Supabase Free; nghe nhớ nghĩa là tự đánh giá. Nội dung từ điển mở lịch sử chưa được rà soát thủ công toàn bộ; luôn xem nhãn nguồn trước khi học chuyên sâu.
- CEFR của kho mặc định đối chiếu đầu từ/loại từ trong bản lưu PDF Oxford, không xác nhận riêng mọi nghĩa. Chưa đối chiếu byte với PDF hiện tại trên host nhà xuất bản. Xem nguồn, commit, SHA256 và từng dòng đối chiếu trong `public/data/oxford-provenance.json`.
- Trong cùng một phiên và lần ôn, thử lại không được tính như bằng chứng lần đầu. Nên dùng bài ngữ cảnh có đáp án duy nhất; dùng nút báo câu hỏi nếu ví dụ chưa đủ rõ.
- Kiểm thử trình duyệt kiểm tra đường đi giọng đọc không khả dụng, không xác nhận chất lượng âm thanh thực tế hoặc giọng của mọi thiết bị. Thử phát từ/câu trên thiết bị cá nhân trước bài nghe.
- Việc push mã nguồn không tự chứng minh GitHub Pages đã triển khai; cần Source GitHub Actions và workflow thành công.

`npm run test:production` kiểm tra bản `dist` bằng Chromium trên máy chủ tĩnh ở cả đường dẫn gốc và đường dẫn con tương tự GitHub Pages; kiểm tra kho từ, tải lại và thông báo khi JavaScript không tải được. Workflow chạy kiểm tra này trước khi xuất bản. Nếu gặp lỗi ứng dụng, trang hiện thông báo khôi phục thay vì khoảng trắng và không xóa dữ liệu học.

`npm run test:e2e` bao gồm phân trang kho hơn 5.000 mục, trang Slang/cụm động từ, cập nhật giữ tiến độ và bản sửa cá nhân. Các mục không có ngữ liệu không được tạo bài điền câu; mạo từ gộp a/an không tạo bài điền thiếu ngữ cảnh. Những từ phân biệt hoa/thường như May/may dùng quy tắc riêng khi chấm.

## Kiểm tra và tạo lại dữ liệu

`public/data/vocabulary.txt` là bản nội dung chuẩn có thể sửa trực tiếp. Build và dev tự tạo `vocabulary-version.json`; trình duyệt kiểm tra hash nhỏ trước khi tải lại toàn bộ kho. Tải lại hoặc cập nhật có xem trước, không áp dụng nguồn mới lên bản cá nhân im lặng.

`npm run test:data` dùng Python 3 thư viện chuẩn để kiểm tra các lỗi dữ liệu đã sửa, phạm vi và hash nguồn. CI chạy kiểm tra này, unit, toàn bộ E2E và production trước triển khai. Python không cần để chạy ứng dụng hoặc build thông thường.

38 mục đã được sửa bằng `data/authoring/content-review-2026-10.txt`, gồm nghĩa cơ bản, bản dịch/ví dụ và ghép đúng homograph `lie` (nói dối, B1). Xem `public/data/content-review-provenance.json`; không tuyên bố đã rà thủ công toàn bộ 5.162 mục.

Các lệnh tạo dữ liệu mặc định chỉ xuất xem trước ra `/tmp`, không ghi đè TXT:

```sh
python3 scripts/apply-content-review.py
python3 scripts/build-full-corpus.py /workspace/scratch
```

Chỉ thêm `--write` sau khi duyệt diff. Công cụ giữ nội dung, ID, trường bổ sung và sửa tay của mọi mục hiện có. Full rebuild cần các extract nguồn đã đối chiếu ngoài checkout; phát triển/build web thông thường chỉ cần TXT đã commit.

Chín mục thành ngữ có liên kết video PBS do bài nguồn khai báo. Chưa xác minh phát trực tiếp hoặc timestamp của cụm từ, nên không tự tạo mốc thời gian hay biến liên kết đó thành âm thanh bài kiểm tra. Giao diện đã kiểm tra 320–430 px, 768 px và xoay ngang 844×390 bằng Chromium; chưa chứng nhận mọi thiết bị hay Safari iOS thật.
