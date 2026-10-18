# Bàn giao nâng cấp Jeongyeon — 19/10/2026

Mã gốc được nâng cấp: `be552c4`. Người dùng đã phê duyệt commit, push và phát hành các thay đổi qua GitHub Pages. Giữ thiết kế, sáu mục điều hướng, kho TXT, ID, dữ liệu học và các chức năng cũ. Không thêm dependency npm, API AI, khóa bí mật hoặc cơ chế thu phí.

## 1. Vấn đề phát hiện trong hệ thống cũ

- `sortForLearning` xếp CEFR trước, nên rất nhiều mục A1 đứng trước từ thông dụng ở mức cao hơn. Đây vẫn là cách sắp kho phù hợp để tra cứu, nhưng chưa đủ làm chiến lược chọn bài.
- `collectFresh` đã tách ghi danh với tiếp xúc tự do đúng cách; cần giữ quy tắc đó. `interleaveQueue` xen từ tốt, nhưng xen cả nhóm ôn lẫn từ mới có thể đưa từ mới lên trước khi hết lượt ôn.
- Các chỉ số cũ có nhiều thông tin hữu ích nhưng chưa phân tích độ tin cậy, nhóm lỗi và hành động tiếp theo. `gap` là khoảng cách giữa hai lượt cùng kỹ năng, không chứng minh bảy ngày không xem lại từ ở nơi khác.
- Câu tự viết chỉ lưu chưa phản hồi; chưa có hội thoại và chưa có kết nối đồng bộ giữa thiết bị. IndexedDB v2 và cơ chế nhiều tab đang hoạt động nên không thay database hoặc làm lại ứng dụng.
- Có thể học khi trang đã mở mà mất mạng, nhưng tải lại trang ngoại tuyến chưa có bộ nhớ ứng dụng.

## 2. Tính năng nâng cấp

| Khu vực hiện có      | Hành vi mới                                                                               |
| -------------------- | ----------------------------------------------------------------------------------------- |
| Hôm nay / Luyện tập  | Bốn chế độ chọn từ, lý do đề xuất; lượt đến hạn trước giới thiệu mới                      |
| Tiến độ              | Sáu trạng thái, phân tích kỹ năng, khoảng nghỉ, độ tin cậy, xu hướng và nút luyện phù hợp |
| Luyện tập            | Hội thoại thực tế trong cùng trang, không thêm mục điều hướng                             |
| Tự sử dụng / Tiến độ | Kiểm tra cấu trúc tại máy, tô lỗi, gợi ý, viết lại, lưu các phiên bản                     |
| Cài đặt              | Supabase Free tùy chọn, đăng nhập và trạng thái đồng bộ/xung đột                          |
| Bản production       | Lưu bộ ứng dụng và kho để tải lại ngoại tuyến sau khi chuẩn bị thành công                 |

Không bổ sung khóa học hay chế độ dành cho người mới. Kho 5.162 mục và giới hạn 674 mục đã rà được phép học vẫn giữ nguyên.

## 3. File thay đổi và lý do

| File / nhóm file                                                      | Mục đích                                                                                                             |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `src/core.ts`                                                         | Thêm trường dữ liệu tùy chọn, tính `exposureGap`, kiểm tra backup; tiêu chí nhớ vững dùng khoảng không tiếp xúc thật |
| `src/storage.ts`                                                      | Hợp nhất các bản ghi viết/hội thoại bất biến giữa tab; không cho thao tác lưu thường xóa chúng                       |
| `src/main.tsx`                                                        | Tích hợp vào giao diện cũ, chọn chế độ, giữ ranh giới ôn/từ mới, lưu/khôi phục dữ liệu mới, gắn đồng bộ              |
| `src/practice-data.ts`                                                | Kiểu dữ liệu và kiểm tra quan hệ bản gốc/bản sửa, lượt làm lại, vị trí lỗi, ID và kết luận phản hồi                  |
| `src/recommendations.ts`                                              | Xếp ứng viên và giải thích riêng với thứ tự Kho từ                                                                   |
| `src/analytics.ts`, `src/LearningInsights.tsx`, CSS tương ứng         | Phân tích bằng chứng và trình bày trong Tiến độ                                                                      |
| `src/conversations.ts`, `src/ConversationPractice.tsx`, CSS tương ứng | Nội dung biên soạn, chọn hội thoại, nghe, bài tập, nháp và lịch sử                                                   |
| `src/writing.ts`, `src/WritingFeedback.tsx`, CSS tương ứng            | Quy tắc cấu trúc tại máy, tô lỗi, gợi ý và các lần viết lại                                                          |
| `src/sync.ts`, `src/SyncSettings.tsx`, CSS tương ứng                  | Xác thực, giao tiếp REST, nén, hợp nhất, CAS, xung đột và trạng thái                                                 |
| `supabase/schema.sql`                                                 | Bảng theo tài khoản, RLS đọc và RPC ghi có điều kiện                                                                 |
| `src/offline.ts`, `public/sw.js`                                      | Đăng ký và kiểm tra bộ nhớ ứng dụng; không đụng dữ liệu người học                                                    |
| Các `*.test.ts`, bốn E2E mới và hai E2E cũ                            | Kiểm tra thuật toán, dữ liệu, luồng mới và hồi quy; cập nhật nhãn ô nhập viết và kỳ vọng chọn từ mới                 |
| `scripts/check-production.mjs`                                        | Kiểm tra production cả gốc/đường dẫn con và tải lại offline                                                          |
| `README.md`, báo cáo này, `docs/services-setup.md`                    | Hướng dẫn sử dụng, bằng chứng kiểm thử và cấu hình dịch vụ còn thiếu                                                 |

Các module tách theo trách nhiệm để tránh dồn thêm toàn bộ logic vào `main.tsx`; không tạo thêm trang hoặc thư viện frontend. Corpus, parser/serializer TXT, lockfile và workflow GitHub Pages không bị thay đổi.

## 4. Thuật toán chọn từ mới

`sortForLearning` tiếp tục giữ CEFR → tần suất → chữ cái trong Kho từ. Engine đề xuất mới đọc lịch sử một lần, chỉ lấy nội dung đủ điều kiện, sau đó xếp điểm và giảm lặp trong cửa sổ 12 ứng viên.

- **Thông minh:** tần suất Zipf có trọng số chính, CEFR chỉ điều chỉnh nhẹ; tăng ưu tiên chưa luyện/từ yếu, giảm từ có bằng chứng nhớ ổn và từ vừa tiếp xúc khi luyện tự do. B1 chỉ là giả định để chọn tài liệu cho ứng dụng cá nhân này, không phải kết luận trình độ. Chỉ nâng giả định khi nhiều từ khác nhau có kết quả độc lập lặp lại ở cùng kỹ năng.
- **Ưu tiên thông dụng:** tần suất chi phối mạnh hơn; mục không có điểm được ghi rõ, không gọi là hiếm. Số liệu vẫn là tần suất cách viết, không khẳng định tần suất từng nghĩa.
- **Củng cố từ yếu:** chỉ chọn mục có lỗi/gợi ý trong kết quả chấm hợp lệ hiện tại. Nếu không có, báo thiếu ứng viên; không giả gọi từ chưa học là yếu. Ở nhóm từ mới, chỉ từ từng luyện tự do nhưng chưa ghi danh mới có thể đáp ứng đồng thời hai điều kiện này.
- **Trộn từ:** dùng hash ngày địa phương + ID, kết hợp tần suất và bằng chứng; cùng dữ liệu trong ngày cho cùng kết quả, không dùng ngẫu nhiên hoàn toàn.

Giảm liên tiếp các dạng chữ giống nhau, cùng từ loại hoặc nhãn ngữ cảnh cụ thể. Đây là heuristic, không khẳng định máy hiểu mọi quan hệ đồng nghĩa. Mỗi đề xuất có lý do từ dữ liệu thực. Chế độ không viết lịch sử, thay ngày đến hạn hoặc sắp lại phiên đã lưu.

Khi tạo phiên theo lịch: nhóm đến hạn và phần giới thiệu đang dở được xếp trước; chỉ sau đó mới thêm từ mới qua `collectFresh`. Mỗi nhóm xen kẽ từ riêng, tránh trộn từ mới vượt lên nhóm ôn. Luyện tự do vẫn không dời SRS.

## 5. Đánh giá tiến độ và đề xuất

Giữ nguyên thống kê cũ. Bổ sung trạng thái chưa học, mới tiếp xúc, đang ghi nhớ, cần củng cố, nhớ khá vững và bằng chứng dùng chủ động với tiêu chí hiện ngay trong giao diện.

- Mẫu kiểm tra hợp lệ tách tự đánh giá, lượt có gợi ý/làm lại, lỗi âm thanh và nội dung nghĩa cũ. Không tự đổi dấu “Đã biết” thành thành thạo.
- Nhớ khá vững cần ít nhất ba ngày đúng độc lập ở cùng kỹ năng và có một lần không tiếp xúc đã ghi nhận từ bảy ngày; lỗi gần đây khiến ưu tiên củng cố. `exposureGap` mới dựa trên mọi tiếp xúc/lượt học đã biết. Không thể biết việc học bên ngoài website.
- Tỷ lệ sau khoảng nghỉ dùng ba nhóm không chồng lấn: từ 1 đến dưới 7 ngày, từ 7 đến dưới 30 ngày, từ 30 ngày. Luôn có tử/mẫu; mẫu ít được ghi rõ, kèm khoảng ước lượng Wilson, không diễn giải như độ tin cậy trình độ chuẩn hóa.
- Kết quả cũ thiếu `exposureGap` vẫn được giữ; không suy diễn thành nhớ sau 7/30 ngày từ `gap` cùng kỹ năng.
- Chỉ ra từ thường quên, tiến bộ hoặc luyện nhiều còn yếu; biểu đồ tuần/tháng tách hoạt động học với kiểm tra hợp lệ. Kỳ đang diễn ra có nhãn riêng.
- Gợi ý “Hôm nay tôi nên tập trung vào đâu?” xuất phát từ kỹ năng có mẫu yếu hoặc nhóm lỗi viết thật; nút luyện chuyển đúng bài. Lượt ôn đến hạn vẫn được nhắc ưu tiên.

Phản hồi cấu trúc tại máy không xác minh nghĩa/ngữ cảnh của câu tự viết. Vì vậy hiện không tự chứng nhận “sử dụng chủ động” từ việc viết câu hoặc không phát hiện lỗi. Không quy đổi sang band IELTS.

## 6. Hội thoại và sửa câu

Có 12 tình huống biên soạn sẵn B1/B2, mỗi đoạn hai người nói, bốn mục từ và 6 hoặc 8 lượt lời. Chọn theo ít nhất ba từ đã học thực tế hoặc cần củng cố có nghĩa khớp. Nếu chưa đủ, ghi rõ bài mẫu; chỉ nhìn thấy từ không làm bài mẫu tự biến thành bài cá nhân hóa. Từ chưa rà, lưu trữ, thiếu hoặc đã đổi nghĩa không bị gắn sai vào hội thoại cũ.

Có tô từ, nghĩa trong ngữ cảnh, dịch Việt bật/tắt, nghe từng câu/toàn đoạn bằng giọng tổng hợp thiết bị, câu hỏi hiểu–điền–nghĩa và trả lời mở. Câu đóng được chấm theo bài tập cụ thể; câu mở chưa chấm. Bài đang hiện văn bản được đánh dấu hỗ trợ, không trở thành kết quả nhớ độc lập. Lưu nháp, kết quả, trạng thái nghe thật, lỗi và lượt làm lại; không sửa lịch SRS.

Theo lựa chọn không phát sinh phí và cho phép tự kiểm tra của bạn, bỏ kết nối AI/dịch vụ ngữ pháp ngoài. Phần viết có bảy nhóm quy tắc giới hạn: `suggest + người + to V`, `discuss about`, `look forward to + V`, `enjoy to V`, `despite of`, `chủ ngữ đại từ + modal + to V`, `I am agree`. Có kiểm tra giảm chấm nhầm số lượng xấp xỉ (“discussed about twenty cases”), danh từ (“a can to make…”, “a must to visit…”) và trích dẫn đang bàn về cấu trúc.

Ví dụ yêu cầu `He suggested me to study English.` được tô cấu trúc và gợi `He suggested that I study English.`, kèm giải thích Việt và ví dụ. Mỗi lần kiểm tra/làm lại là bản ghi mới liên kết bản gốc. Không so sánh với một câu mẫu để chấm cả câu; không phát hiện cấu trúc lỗi thì vẫn **Chưa thể chấm tự động** về tính đúng toàn diện, cách dùng từ và độ tự nhiên.

## 7. Lưu trữ, đồng bộ và bảo vệ dữ liệu

IndexedDB `lexi-learning` giữ tên, phiên bản 2 và ID cũ. Các mảng viết/hội thoại là trường tùy chọn nên JSON cũ vẫn đọc được. Bản ghi được hợp nhất theo UUID, không cho thay bằng chứng dưới cùng ID hoặc âm thầm xóa bằng một lần lưu thường. Xuất JSON gồm dữ liệu mới nhưng không chứa token; TXT vẫn chỉ là nội dung.

Adapter Supabase tương thích frontend GitHub Pages. Có email OTP, Google PKCE tùy chọn, phiên đăng nhập và trạng thái đồng bộ. Đăng nhập chưa tự cho phép tải dữ liệu lên: cần liên kết/hợp nhất rõ ràng. Đăng xuất giữ dữ liệu tại máy; thay toàn bộ JSON hủy liên kết để xác nhận lại.

Hợp nhất ba chiều theo mốc, cộng dồn lịch sử, xử lý xung đột trường thay vì chọn toàn bộ bản mới nhất. Lịch ôn cạnh tranh được giữ hợp lệ và bảo thủ; thay nghĩa đặt lại kỹ năng bị ảnh hưởng. CAS dùng revision để phát hiện thiết bị khác vừa ghi. Mốc và revision đọc/ghi nguyên tử; bộ đệm phân biệt project + tài khoản. Hủy hoặc chặn yêu cầu nếu đổi tài khoản/project hay thay backup trong lúc nén/gửi. Token không xuất JSON và không đưa secret key vào frontend.

SQL hạn chế đọc theo `auth.uid()`, cấm ghi bảng trực tiếp; RPC lấy chủ sở hữu từ JWT và kiểm tra revision. Snapshot được kiểm tra trước gửi, nén gzip có giới hạn; gom thay đổi 15 giây, chỉ kiểm tra revision nhẹ khi chưa có thay đổi. Giữ học tại máy khi mạng/API lỗi, không tự nâng gói trả phí.

Service worker chỉ cache ứng dụng, font và TXT/manifest có hash khớp. Không cache API/auth/POST. Không ép tải lại khi phiên đang mở. Trạng thái “sẵn sàng ngoại tuyến” chỉ hiện sau khi đủ tài nguyên. TTS offline phụ thuộc giọng đã cài trên thiết bị.

## 8. Kiểm thử thực tế

- `npm test`: **143 kiểm thử đạt**, không bỏ qua test.
- `npm run test:data`: **10 kiểm thử đạt**, corpus và dấu vết nguồn giữ nguyên.
- `npx playwright test --workers=2`: **45 kiểm thử đạt**, gồm luồng cũ và các phần chọn từ/tiến độ/hội thoại/viết/đồng bộ.
- TypeScript và build production đạt. Production kiểm tra tải mới, tải lại, đủ 5.162 mục, lỗi JavaScript có thông báo và tải lại khi offline tại `/` và đường dẫn con tương tự GitHub Pages.
- Luồng viết được kiểm tra tại 320, 390, 1280 px. Rà thêm **104 trạng thái trên tám kích thước**: 320×568, 360×800, 375×812, 390×844, 414×896, 430×932, 768×1024, 844×390; gồm sáu trang cũ, hội thoại/dịch Việt, phân tích mở rộng, phản hồi viết, cài đặt/cấu hình đồng bộ và Kho từ C1. Không phát hiện tràn ngang, hộp thoại vượt chiều rộng hoặc lỗi JavaScript. Đo với viewport cấu hình và `clientWidth`, không chỉ dựa `innerWidth`.
- Sao lưu/khôi phục dữ liệu cũ và mới, nhiều tab, giữ phiên dở, sửa nghĩa, tách tự do/SRS, âm thanh lỗi và kết quả chưa đủ bằng chứng đều có kiểm thử hồi quy.
- Đồng bộ dùng REST giả lập có giao thức thật để kiểm tra OTP, liên kết chủ động, hai nhánh lịch sử, xung đột, CAS, offline/reconnect, logout, nén, đổi project cùng UUID và mốc nguyên tử. Điều này **không thay thế kiểm thử Supabase thật**.

## 9. Hạn chế và cấu hình còn cần

1. **Supabase chưa hoạt động trên tài khoản thật:** bạn chưa có project. Cần tạo Supabase Free, áp dụng SQL, cấu hình URL/public key và Auth theo [hướng dẫn](services-setup.md). Email, Google OAuth, quyền RLS và đồng bộ hai thiết bị thật chưa được kiểm chứng. Không có project/khóa bí mật được tự tạo hoặc gói trả phí được bật.
2. **Chấm viết có giới hạn:** không có AI chấm toàn diện hoặc đánh giá tự nhiên/ngữ nghĩa. Bạn tự đối chiếu các trường hợp chưa chấm như đã thống nhất. Không bắt buộc dịch vụ trực tuyến để học cơ bản.
3. **Hội thoại hữu hạn:** 12 đoạn biên soạn sẵn, không sinh hội thoại linh hoạt cho mọi tập từ cá nhân. Không nhồi từ hoặc giả gọi nội dung cố định là AI.
4. **Bằng chứng ghi nhớ:** những khoảng nghỉ mới phải tích lũy theo thời gian; không tạo dữ liệu quá khứ. Không theo dõi việc học ngoài website.
5. **Thiết bị:** kiểm tra bằng Chromium mô phỏng và trình duyệt headless, chưa thử Safari iOS hay điện thoại thật. Chất lượng giọng đọc phụ thuộc hệ điều hành; kiểm thử mô phỏng TTS chỉ xác minh vòng đời thành công/lỗi.
6. **Free có hạn mức:** khi Supabase Free tạm dừng/hết hạn mức, đồng bộ có thể dừng nhưng dữ liệu học tại máy vẫn giữ. Không có cơ chế tự chuyển gói mất phí.
7. **Phát hành:** commit/push được người dùng phê duyệt sau khi nhận báo cáo. Kiểm tra trạng thái triển khai thực tế trong [GitHub Actions](https://github.com/saolaisaanh123-web/2511COMP180207-TKWEB-5101104131/actions/workflows/pages.yml). Phát hành frontend không tự tạo project hoặc bật đồng bộ Supabase.
