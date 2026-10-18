# Sửa các vấn đề học tập và điện thoại — 18/10/2026

Đợt sửa này xử lý các lỗi đã tái hiện trong báo cáo rà soát commit `939bcb1`. Lịch sử học và ID được giữ lại; khi nghĩa hoặc đáp án nguồn thay đổi, chỉ lịch của kỹ năng bị ảnh hưởng được đặt lại để không dùng kết quả cũ làm bằng chứng cho nội dung mới.

## Nội dung và điều kiện đưa vào bài học

- Sửa 38 mục có nghĩa, ví dụ, bản dịch hoặc nhãn nguồn cần điều chỉnh, gồm `should`, `yesterday`, `will`, `jail`, `consist`, `characterize`, các nghĩa chính hiện đại và CEFR của `lie` nghĩa “nói dối”. Chi tiết và nguồn nằm trong `public/data/content-review-provenance.json`.
- Giữ đủ 5.162 mục để tra cứu: 4.955 cách viết Oxford, 100 nghĩa cụm động từ, 107 cách nói/tiếng lóng/thành ngữ. Có 674 mục được phép vào bài học; 4.488 mục còn lại chỉ tra cứu, cần rà tiếp trước khi mở học. Đây không phải tuyên bố đã kiểm chứng thủ công toàn bộ kho.
- Chặn nghĩa chỉ có dấu câu/dẫn chiếu và ngữ cảnh không che được đáp án. Cho phép người dùng rà và xác nhận mục cá nhân, giữ lựa chọn này khi cập nhật nguồn.
- Giải thích giới hạn của tần suất theo cách viết; bỏ điểm ở các trường hợp đồng hình đã nhận diện (`IT`, `May`, `March`, `found`).
- Tách trích đoạn báo chí khỏi ví dụ luyện tập. Bổ sung chín liên kết video do bài PBS công bố; chưa xác minh phát trực tiếp hoặc mốc xuất hiện thành ngữ, nên không ghi timestamp suy đoán.

## Học tập và tiến độ

- Theo dõi tiếp xúc đáp án trên mọi kỹ năng, xen kẽ từ, phân biệt lượt vừa học với kiểm tra độc lập. Bằng chứng nhớ lâu yêu cầu lượt kiểm tra hợp lệ với nội dung hiện tại; kết quả cũ vẫn được lưu.
- Bài nghe chỉ được chấm khi âm thanh của đúng câu đã phát xong. Lỗi phát hoặc bỏ qua không tạo bằng chứng nghe.
- Tách tiếp xúc tự do với việc đưa vào lịch; giữ phiên học theo lịch khi mở luyện tự do; xoay vòng từ chưa luyện/từ yếu.
- Bài viết chỉ gợi nghĩa Việt; bài ngữ cảnh dùng câu che từ. Câu tự viết được lưu để xem lại và vẫn ghi rõ chưa chấm.
- Tự lưu nháp; khôi phục phiên và câu đang gõ khi tải lại hoặc tạm dừng.
- IndexedDB `lexi-learning` được nâng lên phiên bản 2, tách nội dung và tiến độ. Ghi giao dịch theo thay đổi, hợp nhất nhiều tab, đồng bộ tab và báo xung đột phiên thay vì âm thầm ghi đè. Dữ liệu phiên bản 1 được chuyển khi lưu.
- Giữ lựa chọn lưu trữ của người dùng; xem trước việc khôi phục mục biến mất khỏi nguồn. Báo lỗi câu hỏi được lưu riêng với nội dung nguồn.
- Chuẩn hóa số từ/ngày thành số nguyên; khôi phục JSON đưa về trang Hôm nay. Thay thế toàn bộ dữ liệu vẫn là thao tác riêng có cảnh báo.
- Kiểm tra manifest nhỏ trước khi tải lại toàn bộ TXT; tác vụ lưu tiến độ không ghi lại toàn bộ kho.

## Điện thoại và điều hướng

- Sửa tràn ngang ở 320 px, cho thanh bên cuộn khi xoay ngang, bổ sung tên truy cập và trạng thái điều hướng.
- Tăng chữ ví dụ, độ tương phản, vùng bấm; giữ nút đóng hộp thoại dài trong tầm bấm và dùng vùng an toàn màn hình.
- Đổi trang/phân trang đưa vị trí cuộn và tiêu điểm về nơi phù hợp. Lối tắt xóa bộ lọc cũ; trang luyện hiển thị phạm vi và cách xóa lọc.
- Đã kiểm tra 80 trạng thái trên tám kích thước: 320×568, 360×800, 375×812, 390×844, 414×896, 430×932, 768×1024, 844×390. Đo so với chiều rộng viewport cấu hình và `clientWidth`; thao tác bấm thật vào đủ sáu mục khi xoay ngang. Chưa kiểm tra Safari iOS và bàn phím trên điện thoại thật.

## Phát hành và phần cần mở rộng tiếp

CI chạy 36 kiểm thử logic/lưu trữ, 10 kiểm thử dữ liệu, 26 kiểm thử trình duyệt và kiểm tra bản build tại đường dẫn gốc/đường dẫn con trước khi triển khai. Script dựng lại corpus mặc định chỉ xuất bản xem trước và giữ sửa tay trong TXT; ghi nguồn cần `--write`. Manifest được tạo lại khi build.

Việc rà từng nghĩa còn lại, viết ngữ cảnh hiện đại, phân chủ đề IELTS đầy đủ, bổ sung IPA/âm thanh có giấy phép và đoạn nghe báo chí có timestamp vẫn cần biên soạn/đối chiếu tiếp. Không sinh dữ liệu giả để đủ số lượng, không coi TTS là giọng Oxford, không coi câu tự viết là đã được giáo viên chấm.
