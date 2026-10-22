# Đối chiếu ForumFlash với mục tiêu học từ vựng của Jeongyeon

Ngày kiểm tra: 21/10/2026, theo giờ người dùng Asia/Bangkok. Trang đã truy cập: <https://www.forumflashstudy.com/>. Kiểm tra bằng Chromium thật qua kết nối mạng bình thường, ở 1440 × 1000, 390 × 844 và 320 × 720. Không đăng ký tài khoản, không đăng nhập, không thanh toán và không vượt giới hạn đăng nhập.

Đây là đánh giá những gì quan sát và thao tác được ở chế độ khách. Không phải chứng nhận chất lượng toàn bộ nội dung hoặc thuật toán phía máy chủ của ForumFlash. Phần so sánh Jeongyeon dựa trên mã nguồn hiện có trong repository; không coi các thay đổi chưa triển khai là tính năng đang chạy trên bản công khai.

## Luồng đã thực hiện thật

1. Mở trang chủ, nhận HTTP 200, chuyển sang **Học từ vựng**.
2. Xem danh sách 25 chủ đề. Chủ đề đầu có 10 bài, bài đầu 10 mục; các bài sau có trạng thái khóa. Mục xem toàn bộ 200 thẻ của chủ đề yêu cầu đăng nhập.
3. Mở thông tin bài đầu: giao diện tách **Phần học** và **Bài kiểm tra**, nói rõ số thẻ và số câu kiểm tra.
4. Bắt đầu học mà không đăng nhập. Thẻ đầu là `early childhood education`; hai nút tự đánh giá chưa được bấm trước khi lật.
5. Lật thẻ: thấy nghĩa Việt, nhãn loại từ, ghi chú đếm được/không đếm được, mẫu kết hợp và hai ví dụ tiếng Anh. Dùng phím Space để lật các thẻ tiếp theo hoạt động.
6. Đánh dấu thẻ đầu **Cần ôn**; hệ thống chuyển sang thẻ khác và hiển thị một thẻ đang chờ ôn lại. Đánh dấu chín thẻ khác đã nhớ; thẻ đầu trở lại với nhãn **Ôn lại**. Chỉ sau khi đánh dấu thẻ này đã nhớ mới tới màn hình hoàn thành phần học.
7. Bấm **Làm bài kiểm tra**: xuất hiện yêu cầu đăng nhập Google để bắt đầu và lưu kết quả. Dừng tại đây. Chưa kiểm tra được câu hỏi thật, cách chấm câu sai, ngưỡng qua bài hoặc lịch sử lỗi sau tài khoản.
8. Tải lại ngay trong cùng tab: website trở lại màn hình hoàn thành phần học. Vì vậy, không có căn cứ nói phiên khách bị mất chỉ vì refresh.
9. Mở một tab mới trong cùng browser context: trở về trang chủ, không tiếp tục bài khách đang học trong tab cũ. Quan sát storage cho thấy khóa phiên nằm trong `sessionStorage`, không có khóa `localStorage` trong lần thử này.
10. Sau khi đã tải website và học một bài, đặt trình duyệt ngoại tuyến rồi reload: nhận `net::ERR_INTERNET_DISCONNECTED`. Không có service worker đã đăng ký trong context khách đã thử. Chưa thử trạng thái tài khoản hoặc cơ chế offline khác nếu có.

Trong các trạng thái trên, URL vẫn là `https://www.forumflashstudy.com/`. Cần dùng tên trạng thái và đường đi thao tác để tái hiện; URL riêng cho bài học chưa quan sát được.

## Những điểm ForumFlash làm rõ và đáng học hỏi

| Điểm quan sát được | Lợi ích cho việc học | Cách áp dụng phù hợp với Jeongyeon |
| --- | --- | --- |
| Một bài có phạm vi nhỏ, bước học và bước kiểm tra tách rõ | Người học biết sắp làm gì và khi nào xong phần hiện tại | Làm rõ mục tiêu của phiên cá nhân: bao nhiêu từ đến hạn, bao nhiêu từ mới, kỹ năng đang luyện. Không cần xây khóa học cho người mới. |
| Mặt sau đưa mẫu dùng, loại từ và tính đếm được cạnh nghĩa | Dễ chuyển từ biết nghĩa sang đặt câu đúng | Ưu tiên dữ liệu cấu trúc/cách dùng đã đối chiếu nguồn cho các từ dễ dùng sai; hiển thị ngắn ngay trên thẻ. |
| Hai ví dụ khác nhau cho một cụm | Cho thấy cụm xuất hiện trong nhiều câu, giảm học thuộc duy nhất một câu | Bổ sung một ví dụ thứ hai có kiểm tra cho những từ đa nghĩa hoặc dễ nhầm, thay vì tăng số thẻ vì số lượng. |
| Thẻ tự đánh giá yếu được đưa trở lại sau các thẻ khác | Người học nhận ra rõ mình chưa nhớ và được thử lại | Làm rõ hàng đợi sửa sai trong phiên. Bằng chứng đúng ngay sau khi nhìn đáp án phải tách khỏi khả năng nhớ sau nhiều ngày. |
| Nút đánh giá bị vô hiệu hóa trước khi lật | Quy trình thao tác rõ, tránh bỏ qua nội dung mặt sau | Chỉ coi đây là tín hiệu đã xem; không suy ra đã thành thạo. Jeongyeon đã có cơ chế exposure riêng, nên phát triển trên cơ chế đó. |
| Mặt thẻ tập trung vào một nội dung, chi tiết không trải thành dashboard | Dễ đọc, ít phân tán trong lúc học | Giữ thẻ học gọn và nguồn có thể mở rộng; không sao chép bố cục hoặc nhận diện của website khác. |
| Phím Space được thử thành công | Học trên máy tính ít cần chuột | Giữ phím tắt ở các thao tác lặp lại; tránh kích hoạt khi người học đang nhập câu trả lời. |

Các điểm trên chủ yếu là **cách tổ chức phiên và trình bày cách dùng**. Chưa có bằng chứng rằng mô hình khóa bài, XP hay cây tiến độ làm người học nhớ lâu hơn thuật toán hiện có của Jeongyeon.

## Các giới hạn và điểm cần thận trọng

### Chưa xác minh được toàn bộ 5.000 mục của ForumFlash

Trang giới thiệu con số 5.000 và cho thấy cấu trúc 25 chủ đề/250 bài. Kiểm tra này đã đọc và thao tác một bài khách với 10 mục; chưa truy cập hết kho. Không thể dùng con số trên giao diện để kết luận 5.000 mục đều khác nhau, đúng từng nghĩa, có nguồn đối chiếu hoặc phù hợp Anh–Mỹ.

Trong 10 thẻ đã xem, chưa thấy liên kết từ điển/ngày đối chiếu ở nội dung thẻ. Đây là điều không quan sát được trong phạm vi đó, không phải khẳng định toàn website không có nguồn ở bất kỳ vị trí nào. Đối với Jeongyeon, nguồn theo đúng nghĩa và từ loại vẫn quan trọng hơn việc chỉ có nhãn IELTS hoặc số lượng lớn.

### Nội dung mẫu thiên về Anh–Anh

Đã thấy `state school`, `private tuition`, cách viết `programme` và IPA không có /r/ trong từ `early`. Các cách dùng này hợp lệ trong Anh–Anh, nhưng cần nhãn vùng và đối chiếu khi người học ưu tiên Anh–Mỹ. Ví dụ, `private tuition` có thể nói việc dạy thêm trong Anh–Anh; người học Mỹ thường gặp `tuition` theo nghĩa học phí. Không nên chuyển nguyên cách dạy đó sang Jeongyeon mà bỏ thông tin vùng.

Không nghe và đánh giá được chất lượng âm thanh thực trên thiết bị người dùng. Có hướng dẫn phím A phát âm, nhưng sự xuất hiện của nút hoặc hướng dẫn không chứng minh giọng đọc tự nhiên hay chính xác theo vùng.

### Tiến độ hoàn thành khác với bằng chứng ghi nhớ

Phần khách dùng hai nút tự đánh giá để đi qua phần học. Thao tác này tốt cho điều khiển phiên nhưng chưa kiểm tra khách quan việc nhớ từ. Chỉ dẫn trước kiểm tra đề cập 16 câu, 15 giây/câu và ngưỡng 80%; các thông số này **mới được quan sát trên màn hướng dẫn**, chưa được chạy kiểm chứng do yêu cầu đăng nhập.

Không quan sát được cách đo nhớ sau 1/7/30 ngày, cách xử lý đáp án đồng nghĩa hoặc cách tách kết quả có gợi ý trong tài khoản. Không có cơ sở để nói ForumFlash không có những chức năng đó, cũng không có cơ sở để nói chúng tốt hơn Jeongyeon.

Đối với Jeongyeon, không nên thay lịch ôn theo từng từ/kỹ năng bằng việc qua bài 80%. Nếu thêm giới hạn thời gian, nên tùy chọn; sự chậm khi gõ hoặc khi nghe chưa chắc là không biết từ.

### Phạm vi lưu phiên khách và ngoại tuyến

Cùng tab có thể tải lại và tiếp tục, nhưng tab mới không tự nối lại phiên khách. Đây là khác biệt về phạm vi lưu phiên quan sát được, không phải lỗi đồng bộ tài khoản đã được xác nhận. Với thử nghiệm offline sau khi đã tải và học, reload thất bại; Jeongyeon nên giữ mục tiêu tải lại và tiếp tục học tại máy khi mất mạng, cùng sao lưu dữ liệu độc lập với một tab trình duyệt.

### Màn hình hẹp 320 px có va chạm ở đầu trang

Đã quan sát và đo được logo chiếm vùng x = 12 đến 130 px, trong khi nút **Trang chủ** chiếm x ≈ 84,8 đến 171,3 px. Hai vùng giao nhau, phù hợp với ảnh chụp thấy chữ chồng lên nhau. Tổng chiều rộng tài liệu vẫn bằng viewport, nên chỉ kiểm tra `scrollWidth <= innerWidth` sẽ bỏ sót lỗi này.

Ở 390 px, thẻ sau lật nhìn rõ: mẫu dùng và hai ví dụ tách khối, nút đánh giá nằm phía dưới. Chưa thử trên Safari/iPhone thật. Không suy ra mọi trang hoặc mọi cỡ chữ đều ổn từ một viewport.

## Những phần Jeongyeon nên giữ

- Học tại máy không bắt buộc đăng nhập; lưu IndexedDB và sao lưu JSON. Không thêm một cổng đăng nhập vào trước chức năng ôn cơ bản chỉ vì website tham khảo có cổng đó.
- Lịch ôn theo từng từ và kỹ năng, với lịch sử riêng. `collectFresh` tránh đưa từ đã có lịch vào nhóm từ mới; `pendingScheduledTasks` và `interleaveQueue` xử lý các kỹ năng còn thiếu.
- Kiểm tra nghĩa theo từ loại, chấm biến thể cách viết và xử lý trung lập khi chưa đủ căn cứ kết luận một đáp án khác là sai (`assessment.ts`).
- Phân biệt tiếp xúc, tự đánh giá, trả lời độc lập và bằng chứng giữ từ sau nhiều ngày (`core.ts`, `analytics.ts`). Không đổi sang XP hoặc tỷ lệ hoàn thành làm chỉ số thành thạo chính.
- Dấu vết nguồn theo mục và nghĩa, cùng ưu tiên Anh–Mỹ đã được xác minh. Các nhãn CEFR/danh sách Oxford không được dùng thay bằng chứng đúng nghĩa.
- Ngữ pháp phục vụ tra cứu và hội thoại phục vụ sử dụng từ theo mục tiêu cá nhân. Không cần chuyển thành lộ trình A1–C2 bắt buộc hoặc khóa 25 chủ đề.

## Thứ tự đề xuất cho lần nâng cấp sau

1. **Độ chính xác của nội dung và cách dùng:** sau đợt rà toàn bộ 5.558 mục (bàn giao 22/10), tiếp tục bổ sung mẫu kết hợp/giới từ/tính đếm được cho nhóm rủi ro cao. Phân biệt từng nghĩa và vùng Anh–Mỹ. Đây là phần ảnh hưởng trực tiếp nhất tới việc học đúng.
2. **Sửa sai trong phiên:** đưa từ vừa sai trở lại sau một khoảng đệm, nói rõ vì sao lặp, và yêu cầu tự trả lời. Lượt sửa ngay trong phiên không được tự nâng kết luận nhớ lâu hay đẩy lịch ôn quá xa.
3. **Thẻ tóm tắt dùng nhanh:** một nghĩa được chọn, một mẫu dùng có nguồn, ví dụ song ngữ và nút nghe; nguồn/chi tiết mở rộng vẫn có thể xem. Giữ bản sắc Jeongyeon.
4. **Đích đến rõ cho phiên học:** tóm tắt số từ đến hạn, từ mới và kỹ năng yếu; cuối phiên nói rõ từ nào cần ôn tiếp, không chỉ số câu đúng.
5. **Kiểm tra di động theo va chạm thực:** thêm kiểm tra khung của logo/menu, nút bị che, chiều cao thẻ và thao tác khi bàn phím mở. Kiểm tra ngang trang là cần thiết nhưng chưa đủ.

Không đề xuất thêm khóa học nhập môn, hệ thống XP hoặc bài tập ngữ pháp. Không đề xuất thay toàn bộ thuật toán Jeongyeon theo website tham khảo khi chưa có dữ liệu chứng minh hiệu quả.

## Bằng chứng và khả năng tái hiện

Các tệp riêng phục vụ kiểm tra được giữ ngoài mã giao diện, tại `/workspace/scratch/forumflashstudy-review-2026-10-21/`:

| Tệp | Trạng thái |
| --- | --- |
| `home.json`, `home-desktop.png` | Trang chủ, HTTP 200 và các điều khiển thấy được |
| `deep-vocabulary.json/png` | Lộ trình từ vựng và trạng thái khóa bài |
| `deep-lesson-info.json/png` | Hộp thông tin bài đầu |
| `deep-lesson-start.json/png` | Mặt trước thẻ đầu, nút đánh giá chưa được bấm |
| `deep-card-back.json/png` | Nghĩa, mẫu dùng và ví dụ thật của thẻ đầu |
| `deep-learning-states.json` | Các thẻ đã xem và thẻ cần ôn quay lại cuối lượt |
| `deep-after-need-review.json/png` | Trạng thái một thẻ đang chờ ôn |
| `deep-learning-finished.json/png` | Hoàn thành phần học, hướng dẫn trước kiểm tra |
| `deep-quiz-first-question.json/png` | Yêu cầu đăng nhập khi bấm kiểm tra; tên tệp lịch sử, không phải ảnh câu hỏi đã mở |
| `deep-lesson-start-mobile320.png`, `deep-mobile-rects.json` | Va chạm logo/menu ở 320 px |
| `deep-card-back-mobile390.png` | Độ thoáng của mặt sau ở cỡ điện thoại 390 px |
| `deep-reload-after-guest-learning.json/png` | Tải lại cùng tab vẫn tiếp tục phiên khách |
| `deep-newtab-guest.json`, `deep-browser-storage-summary.json` | Tab mới về trang chủ; phạm vi lưu phiên khách đã quan sát |
| `deep-offline.json`, `deep-serviceworkers.json` | Reload ngoại tuyến thất bại và chưa có service worker đăng ký trong context đã thử |
| `deep-inspect.mjs` | Kịch bản thao tác bằng trình duyệt |

Không có lỗi JavaScript chưa bắt được trong các trạng thái đã thử. Không có kết quả chấm bài hoặc đồng bộ tài khoản thật để báo cáo. Tài liệu này đưa ra đề xuất, chưa triển khai thêm tính năng hoặc thay giao diện Jeongyeon.

Theo yêu cầu tiếp theo của người dùng, ngày 22/10 đã triển khai cách dùng/ví dụ thứ hai cho 48 mục và làm rõ mục tiêu/sửa sai của phiên Jeongyeon. Phạm vi, nguồn và kiểm thử nằm trong [báo cáo nâng cấp](usage-and-session-upgrade-2026-10-22.md); các quan sát về ForumFlash ở trên giữ nguyên theo thời điểm kiểm tra.
