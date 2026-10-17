# Lexi IELTS — Góc học từ vựng IELTS cá nhân

Ứng dụng React + TypeScript + Vite, giao diện tiếng Việt, không cần tài khoản/backend/API trả phí. Thay thế trang ảnh cũ; Git vẫn giữ lịch sử cũ.

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

Kiểm thử trình duyệt: `npm run test:e2e`. Cấu hình mặc định sử dụng `/usr/bin/chromium` trong môi trường đám mây. Trên máy khác, cài Chromium rồi đặt `CHROMIUM_PATH` thành đường dẫn trình duyệt. Có thể dùng Playwright Chromium sau khi `npx playwright install chromium` và chỉ định đường dẫn tương ứng. Không cần trình duyệt để chạy unit test/build.

## Thêm và sửa từ mà không sửa code

Sửa file UTF-8 `public/data/vocabulary.txt`. Mỗi mục cách nhau bởi một dòng `---`; mỗi trường trên một dòng `tên_trường: nội dung`. Hỗ trợ CRLF của Windows, BOM và tiếng Việt. Không dùng dòng xuống hàng bên trong giá trị trường.

Các trường bắt buộc: `id`, `word`, `meaning_vi`, `example_en`, `example_vi`. Những trường khác xem trong file mẫu. `topics` và `collections` dùng dấu phẩy; `accepted_answers` dùng dấu `|` giữa các đáp án hợp lệ. Không tự chấp nhận từ đồng nghĩa ngoài danh sách này. `audio_word` và `audio_example` nhận URL HTTP/HTTPS; hãy chỉ dùng nội dung có quyền sử dụng.

- Giữ nguyên ID khi sửa cách diễn đạt để giữ lịch sử. Một nghĩa mới nên có ID mới.
- Bộ từ: `foundation`, `ielts`, `personal`; một mục có thể có nhiều nhãn.
- Trình độ CEFR và IPA chỉ điền khi có căn cứ. Mẫu gồm 20 mục nghĩa với ví dụ tự biên soạn, không phải Oxford/Cambridge chính thức; chưa gán CEFR/IPA.
- Sửa file repository rồi triển khai lại. Chọn **Kho từ → Cập nhật kho mặc định** để xem trước và áp dụng phiên bản mới. Tải lại trang không tự thay thế bản chỉnh sửa cá nhân.
- Hoặc chọn **Nhập .txt**, kiểm tra số thêm/sửa/lưu trữ rồi xác nhận. File lỗi bị từ chối toàn bộ với số dòng/mục; không ghi đè im lặng.
- Mỗi nguồn cập nhật lưu trữ những mục không còn xuất hiện trong cùng nguồn; lịch sử và lịch ôn vẫn còn. File cá nhân có ưu tiên so với mặc định khi trùng ID. Phần xem trước liệt kê thay đổi nội dung, những xung đột mặc định/cá nhân được giữ bản cá nhân.
- Sửa qua giao diện lưu tại trình duyệt, không sửa repository. **Tải kho .txt** xuất các mục đang hoạt động theo cùng định dạng. Trình duyệt không tự ghi đè file gốc.

## Cách học và đánh giá

**Hôm nay** ưu tiên lượt kỹ năng đến hạn trước các mục mới. Mặc định 5 mục mới/ngày, chỉnh được trong cài đặt; giảm đề xuất còn 2 khi tồn hơn 20 lượt ôn. Số mục đến hạn được đếm theo ID, khác số lượt kỹ năng.

Mỗi kỹ năng có lịch riêng: 1–3–7–14–30 ngày, sai quay về 1 ngày. Lượt dùng hỗ trợ không tăng bậc. Quên được hỏi lại sau tối đa ba câu xen kẽ nếu hàng đợi đủ dài; nếu không đủ thì nằm cuối hàng đợi. Ôn quá hạn không tự tính là quên. Ngày dùng múi giờ địa phương của trình duyệt.

Phiên học và các lượt đã gửi được lưu trong IndexedDB. Tải lại và tiếp tục không gửi lại kết quả đã lưu. Một lần ôn chỉ cập nhật lịch một lần; lượt luyện tự do lưu bằng chứng nhưng không thay đổi lịch. Mục tự đánh dấu đã biết được bỏ khỏi danh sách từ mới, không coi là đã kiểm tra.

Sáu kỹ năng được lưu riêng. Hiểu nghĩa và nghe nhớ nghĩa dùng tự đánh giá **Quên / Nhớ khó / Nhớ rõ**; tự đánh giá không được xem như kiểm tra khách quan. Nhớ để viết, nghe chính tả, điền ngữ cảnh được chấm theo đáp án khai báo, bỏ khoảng trắng thừa và không phân biệt hoa thường. Câu tự viết chỉ được lưu, **chưa được chấm**; ứng dụng không đánh giá ngữ pháp/phát âm hoặc giả lập AI.

“Nhớ khá vững” cho từng kỹ năng cần ít nhất 3 lần kiểm tra đúng lần đầu, không hỗ trợ, ở 3 ngày khác nhau, có một lần cách lần trước ít nhất 7 ngày. Kỹ năng chỉ tự đánh giá chưa đủ điều kiện này. Đây là quy tắc của ứng dụng, không phải chứng nhận ngôn ngữ; không quy đổi số từ thành band IELTS. Chỉ số luôn kèm số lượt làm cơ sở; chưa có dữ liệu không tạo kết quả giả.

Phát âm dùng URL nếu có, giọng tổng hợp tiếng Anh của thiết bị là dự phòng, chỉ phát khi bấm. Có ưu tiên Anh–Anh/Anh–Mỹ và tốc độ. Giọng thật phụ thuộc hệ điều hành; không có giọng sẽ thông báo và cho bỏ qua bài nghe mà không lưu điểm.

## Sao lưu

**Cài đặt & sao lưu → Sao lưu toàn bộ JSON** để xuất kho từ (kể cả lưu trữ), bản sửa, câu tự viết, tiến độ, lịch ôn, lịch sử, cài đặt và phiên học. JSON khác file TXT chỉ chứa nội dung học.

Khôi phục JSON có xem trước và hai cách:

- **Hợp nhất**: lịch sử gộp theo ID lượt, không cộng trùng; mục và lịch trùng ID giữ bản hiện tại; giữ phiên hiện tại.
- **Thay thế**: ghi đè toàn bộ sau xác nhận rõ ràng. Hãy tải bản sao hiện tại trước.

Dữ liệu chưa tự đồng bộ giữa thiết bị và có thể mất khi xóa dữ liệu trình duyệt, dùng chế độ riêng tư hoặc thay đổi địa chỉ website. Nên sao lưu thường xuyên và trước khi đổi miền. Font được đóng gói cục bộ, không yêu cầu Google Fonts.

## GitHub Pages

Đã có workflow `.github/workflows/pages.yml`, build/test và triển khai khi push lên `main`.

1. Trong repository, vào **Settings → Pages → Build and deployment → Source**, chọn **GitHub Actions** (cần quyền quản trị repository).
2. Push lên `main`, hoặc chạy workflow **Deploy Lexi IELTS to GitHub Pages** thủ công từ Actions.
3. Khi job deploy thành công, lấy địa chỉ thật tại **Settings → Pages** hoặc kết quả workflow.

Vite dùng `base: './'`; nội dung lấy theo `import.meta.env.BASE_URL`. Điều hướng nội bộ không thêm đường dẫn nên tải lại trên GitHub Pages không gây 404. Không đưa thư mục `dist` hoặc `node_modules` lên Git.

## Cấu trúc

- `public/data/vocabulary.txt`: toàn bộ dữ liệu từ vựng mẫu, độc lập mã nguồn.
- `src/core.ts`: parser/serializer, hợp nhất, chấm đáp án, lịch ôn, đánh giá bằng chứng, kiểm tra backup và IndexedDB.
- `src/main.tsx`: bốn trang chính, phiên học, âm thanh, nhập/xuất, các hộp thoại.
- `src/style.css`: thiết kế responsive, thanh bên desktop/thanh dưới mobile.
- `src/core.test.ts`: kiểm thử quy tắc dữ liệu và bằng chứng.
- `e2e/app.spec.ts`: luồng Chromium, lưu bền, nhập kho, phục hồi, âm thanh không khả dụng, bố cục điện thoại.

## Giới hạn được biết

- Không có dịch vụ chấm ngữ nghĩa/câu viết hoặc đồng bộ; nghe nhớ nghĩa là tự đánh giá.
- Không có dữ liệu CEFR chính thức; lọc CEFR hoạt động khi bạn khai báo trường `level`.
- Trong cùng một phiên và lần ôn, thử lại không được tính như bằng chứng lần đầu. Nên dùng bài ngữ cảnh có đáp án duy nhất; dùng nút báo câu hỏi nếu ví dụ chưa đủ rõ.
- Kiểm thử trình duyệt kiểm tra đường đi giọng đọc không khả dụng, không xác nhận chất lượng âm thanh thực tế hoặc giọng của mọi thiết bị. Thử phát từ/câu trên thiết bị cá nhân trước bài nghe.
- Việc push mã nguồn không tự chứng minh GitHub Pages đã triển khai; cần Source GitHub Actions và workflow thành công.

`npm run test:production` kiểm tra bản `dist` bằng Chromium trên máy chủ tĩnh ở cả đường dẫn gốc và đường dẫn con tương tự GitHub Pages; kiểm tra kho từ, tải lại và thông báo khi JavaScript không tải được. Workflow chạy kiểm tra này trước khi xuất bản. Nếu gặp lỗi ứng dụng, trang hiện thông báo khôi phục thay vì khoảng trắng và không xóa dữ liệu học.
