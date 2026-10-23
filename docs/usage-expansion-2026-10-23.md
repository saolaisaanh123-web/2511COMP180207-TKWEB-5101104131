# Mở rộng cách dùng và ngữ cảnh — 23/10/2026

## Phạm vi hiện tại

Đợt tiếp tục sau commit `8eac9c4` bổ sung **48 mục**, nâng tổng từ **96 lên 144 mục** có cấu trúc, giới từ, ghi chú, lỗi thường gặp và ví dụ Anh–Việt thứ hai. Có **40 mục** có ghi chú tính đếm được, gồm 16 danh từ mới. Nội dung ưu tiên Anh–Mỹ; không thêm trang, thư viện, API hoặc dịch vụ trả phí.

Kho vẫn **5.560 mục sẵn luyện**. Việc mở rộng giúp giảm tình trạng chỉ thuộc một câu và thiếu kiến thức sử dụng từ. Đây là chiều sâu bổ sung cho những mục đã có, không phải thêm 48 ID hoặc tuyên bố bao phủ mọi nghĩa.

| Nhóm mới | 16 mục |
| --- | --- |
| Động từ — group-f | spend, wait, permit, join, attend, reach, enter, visit, describe, mention, encourage, warn, convince, insist, concentrate, participate |
| Danh từ — group-g | job, task, business, service, room, space, time, paper, glass, chicken, hair, ability, attention, access, effect, success |
| Tính từ — group-h | different, similar, familiar, satisfied, disappointed, proud, pleased, worried, nervous, anxious, essential, necessary, ready, willing, sure, grateful |

Đợt trước 48→96 ở commit `8eac9c4` giữ nguyên dữ liệu group-a đến group-e. Có thể xem báo cáo và kiểm thử đợt đó trong lịch sử Git. Báo cáo này phản ánh bản tiếp tục 96→144.

## Nguồn và độ chính xác

- Đã đọc trực tiếp **65 URL Oxford Advanced American Dictionary được dẫn cho 48 mục mới**: 25 cho động từ, 24 cho danh từ, 16 cho tính từ. Có 62 URL chưa có ở 96 mục trước và 3 URL dùng lại. Mỗi nguồn lưu URL cuối thực tế, tiêu đề, thời điểm đọc và SHA256; không đưa toàn văn nhà xuất bản vào repository.
- Kiểm tra trực tuyến **65/65 đạt**: HTTP 200, có bài từ điển Mỹ và định nghĩa thực tế, tiêu đề/đầu từ/từ loại thống nhất. **65/65 hash biên soạn khớp HTML đã đọc**. Metadata toàn bộ **144 mục / 164 URL riêng biệt** đạt. Hash HTML tải lại tách khỏi hash lịch sử vì nội dung trang động có thể thay đổi.
- Nhận dạng nguồn không tự chứng nhận quy tắc hoặc bản dịch. Đã có lượt rà nội dung độc lập cho cả 48 mục: kiểm tra cấu trúc, nghĩa/từ loại, lỗi mẫu, ví dụ Anh–Việt và đáp án thay thế trong đúng câu.
- Phân biệt rõ nghĩa: `business` là doanh nghiệp, `room` là căn phòng, `glass` là cốc, `chicken` là con vật, `paper` là vật liệu giấy, `spend` là dành thời gian. Các nghĩa không đếm được/đếm được khác chỉ được giải thích để đối chiếu, không âm thầm đổi nghĩa bài luyện.
- Giữ các biến thể hợp lệ: `different from/than` trong phạm vi nguồn Mỹ; `familiar to/with` khác cách nhìn/chủ thể; `convince somebody to do` có trong nguồn Mỹ. `anxious` chỉ luyện nghĩa lo lắng, không dùng nghĩa rất muốn để kiểm tra cùng ID.
- Rà soát đã loại các lỗi mẫu mơ hồ với `attend to`, `enter into`, `grateful for`, `access at` và `insist that` có thể đọc hợp lệ theo nghĩa/ngữ cảnh khác. Thay bằng lỗi chia dạng từ, hòa hợp hoặc thiếu thành phần rõ ràng. Ghi chú `hair` tránh tuyệt đối hóa người thực hiện việc cắt tóc.
- Ví dụ và giải thích là nội dung Jeongyeon tự biên soạn. Mỗi câu mới có tình huống khác câu canonical. Những từ khác hợp lý trong đúng chỗ trống được giữ **chưa chấm**, không đánh sai hoặc cộng điểm nhớ từ đích; đây không phải bộ chấm mọi từ đồng nghĩa.

`search` trong kho hiện chỉ có danh từ nên đợt này dùng `permit`; bài `rely` chính là trang điều hướng sang cụm động từ nên chọn `concentrate`. Không sửa ID/từ loại canonical hoặc nới kiểm tra nguồn để ép đủ nhóm.

## Cách sử dụng

Vào **Kho từ → Trạng thái → Có cách dùng đã đối chiếu**. Mở chi tiết để đọc mẫu dùng, ghi chú, câu thứ hai, lỗi thường gặp và nguồn. Bộ lọc cũng áp dụng khi chuyển sang **Luyện tập → Dùng trong ngữ cảnh**. Không đổi cách sắp xếp Kho từ hoặc thứ tự phiên ôn đang làm.

Bài ngữ cảnh của phiên mới luân phiên câu gốc/câu bổ sung dựa trên lần làm đầu gần nhất. Đề và nháp đã tạo giữ nguyên qua tải lại hoặc sao lưu. Lượt sửa sai không thành bằng chứng nhớ lâu. Ghi chú chỉ gắn khi ID, đầu từ, từ loại và nghĩa Việt khớp; bản sửa cá nhân đổi nghĩa/từ loại không nhận nhầm quy tắc nguồn.

## Sửa thêm lỗi đọc nội dung dài

Kiểm tra trực tiếp bản Pages đầu đợt phát hiện nút Đóng dạng sticky có thể che một phần chữ khi cuộn từ điển trên điện thoại và máy tính. Đã tái hiện bằng đo vùng chữ thực tế giao với nút, trước khi sửa.

Nút Đóng nay có hàng riêng; phần nội dung cuộn độc lập, có thể nhận focus và cuộn bằng bàn phím. Giữ màu sắc, kích thước nút và thiết kế chủ đạo. Cài đặt, biên tập, xem trước cập nhật và khôi phục dùng chung bố cục này.

Rà bàn phím còn phát hiện phần cấu hình Supabase thu gọn bị bỏ qua khi Tab, và Chromium có thể trả layout box cho input đã ẩn sau khi đóng disclosure. Bộ giữ focus nay nhận summary/vùng cuộn và loại phần bị thu gọn, giữ vòng Tab/Shift+Tab trong cửa sổ. Đây là kiểm tra bố cục và thao tác cấu hình, không phải đồng bộ Supabase thật.

## Tệp thay đổi và bảo toàn dữ liệu

| Tệp | Mục đích |
| --- | --- |
| `data/usage/group-f.json` | 16 động từ và ngữ cảnh theo nghĩa |
| `data/usage/group-g.json` | 16 danh từ, tính đếm được và đối chiếu nghĩa |
| `data/usage/group-h.json` | 16 tính từ, giới từ và cấu trúc |
| `src/usage.test.ts` | Kiểm tra đủ 144 mục, 32 danh từ mới qua hai đợt, câu luyện và đáp án trung tính |
| `e2e/usage-expansion.spec.ts` | Hai ca nội dung mới 320/390 px; ba hồi quy che chữ, cuộn và focus ở 320×568, 844×320, 1440×1000 |
| `src/main.tsx`, `src/style.css` | Tách vùng đóng/vùng cuộn, giữ focus cho phần đọc và disclosure, không che chữ |
| `scripts/check-production.mjs` | Kiểm bộ lọc toàn kho và cả ba nhóm mới ở gốc/con, online/offline, cùng mục suggest cũ |
| `README.md`, `docs/NEXT-SESSION.md`, báo cáo này | Phạm vi hiện tại và bàn giao |

TXT giữ nguyên từng byte, SHA256 `10392288d69ba11cc6e5fc74e02e0cc3654bea50cda229254236848d2d3a87f4`, 8.878.717 byte. Giữ thiết kế chủ đạo; phần giao diện chỉ sửa bố cục/cuộn/focus của cửa sổ dùng chung. Không thay schema IndexedDB, ID, contentKey, lịch sử, lịch ôn, thuật toán chọn từ hoặc định dạng sao lưu. Nội dung mới được đóng gói cùng ứng dụng để đọc offline sau khi tải cập nhật; mở trang nguồn cần Internet.

## Kiểm chứng nguồn

```sh
python3 scripts/check-usage-sources.py --offline
python3 scripts/check-usage-sources.py --files data/usage/group-f.json data/usage/group-g.json data/usage/group-h.json --report /tmp/usage-sources.json
```

Chế độ offline chỉ kiểm tra khai báo/liên kết với canonical, không giả lượt tải mới. Chế độ live xác nhận đúng bài có định nghĩa, không chỉ mã HTTP. Chỉ metadata được đưa vào báo cáo; HTML nguồn dùng khi biên soạn nằm ngoài repository.

## Kết quả kiểm thử bản đã chốt

- **335/335 unit**, 27 tệp; toàn bộ 144 mục khớp canonical, có câu thứ hai tạo chỗ trống được, nguồn đầy đủ và đáp án thay thế không cộng điểm nhớ từ đích. Kiểm tra tính đếm được bao gồm đủ 32 danh từ mới qua hai đợt.
- **37/37 kiểm thử dữ liệu**: 20 kiểm tra chất lượng + 17 kiểm tra rà toàn kho; TXT không đổi.
- **109/109 E2E Chromium**. Hai ca mới ở 320/390 px mở đúng nội dung/nguồn, không tràn ngang; tạo phiên thật với câu thứ hai của spend/paper/familiar từ lịch sử câu gốc, giữ nháp qua tải lại, tải JSON thật và kiểm tra hợp lệ mà không thay lịch sử/lịch ôn. Sáu ca cách dùng qua hai đợt và các luồng học cũ vẫn đạt. Ba hồi quy bổ sung ở 320×568, 844×320 và 1440×1000 xác nhận chữ không bị nút Đóng che, cuộn nội dung riêng, Tab tới nguồn và mở/đóng cấu hình thu gọn không thoát focus.
- **TypeScript và build production đạt**. Ở cả gốc và đường dẫn con, online/offline đều tải 5.560 mục, 52 bài ngữ pháp, bộ lọc 144 mục cách dùng và nội dung mới đủ ba nhóm. Kiểm tra cả suggest cũ và spend/paper/familiar mới. Trạng thái thiếu JavaScript đạt; không cache request riêng tư/API.
- **Nguồn live 65/65, receipt 65/65, metadata 164/164** đạt. Có lượt rà nội dung độc lập cho 48 mục mới; không có kiểm thử Supabase thật.

CI chạy lại unit/data/metadata/E2E/production trước khi triển khai GitHub Pages. Lượt kiểm tra nguồn live phục vụ biên soạn; CI không phụ thuộc khả năng truy cập Oxford.

## Giới hạn còn lại

- **5.416 mục còn lại vẫn chỉ có ví dụ gốc**; 144/5.560 là khoảng 2,6%. Chưa mở rộng cách dùng cho toàn kho hoặc mọi nghĩa của mỗi đầu từ.
- Vẫn có 12 hội thoại/48 ID mục tiêu và 346 IPA; phần lớn nghe dựa TTS, chưa có audio nguồn mặc định. Thêm mẫu dùng không tự mở rộng hội thoại hoặc chấm phát âm.
- Chưa có Supabase thật để kiểm thử đồng bộ trực tuyến; vẫn cần cấu hình tài khoản. Snapshot cloud chứa toàn kho và giới hạn 20 MiB. Không có chấm ngữ pháp tổng quát hoặc AI trả phí.
- Kiểm tra trình duyệt dùng Chromium; chưa kiểm tra trực tiếp Safari/iPhone thật.
- Nội dung bổ sung vẫn đóng gói trong bundle chính (bản này khoảng 958 kB, gzip 272 kB). Trước khi tăng quy mô lớn cần cân nhắc tách gói dữ liệu cùng cơ chế cache offline; đợt này chưa thay kiến trúc nạp dữ liệu.
