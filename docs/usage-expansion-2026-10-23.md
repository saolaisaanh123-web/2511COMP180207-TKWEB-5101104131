# Mở rộng cách dùng và ngữ cảnh — 23/10/2026

## Vấn đề và phạm vi sửa

Kho có 5.560 mục sẵn luyện nhưng trước đợt này chỉ 48 mục có mẫu dùng và câu ví dụ thứ hai. Học một câu quen thuộc có thể giúp nhớ câu mà chưa đủ để sử dụng từ trong tình huống khác. Từ dễ sai giới từ, cấu trúc hoặc tính đếm được cần giải thích theo đúng nghĩa đang học, không chỉ thêm công thức chung cho cả đầu từ.

Đợt này bổ sung **48 mục**, nâng tổng lên **96 mục** có cấu trúc, ghi chú, lỗi thường gặp và ngữ cảnh thứ hai. Có **24 mục** có ghi chú tính đếm được, gồm 16 danh từ mới. Nội dung ưu tiên Anh–Mỹ; không thêm trang học, dịch vụ trả phí hoặc phụ thuộc mới.

| Nhóm mới | 16 mục |
| --- | --- |
| Động từ | ask, tell, say, speak, talk, learn, teach, borrow, lend, promise, offer, expect, refuse, deny, manage, afford |
| Danh từ | evidence, knowledge, progress, homework, permission, employment, clothing, money, traffic, weather, damage, behaviour, opportunity, health, education, transport |
| Tính từ | interested, interesting, bored, boring, excited, exciting, tired, afraid, aware, responsible, capable, suitable, likely, worth, able, confident |

## Nguồn và độ chính xác

- Đã đọc trực tiếp **52 URL mới của Oxford Advanced American Dictionary**, gồm bài chính và bài đối chiếu cần thiết. Mỗi mục lưu URL thật, tiêu đề, thời điểm và SHA256 của nội dung nguồn được đọc; không đưa toàn văn nguồn vào ứng dụng. Ví dụ Anh–Việt và phần giải thích là nội dung Jeongyeon tự biên soạn.
- Kiểm tra trực tuyến lại cả 52 URL: HTTP 200, có nội dung bài từ điển Mỹ, tiêu đề/đầu từ/từ loại thống nhất và có định nghĩa thực tế. Kiểm tra metadata toàn bộ 96 mục có **102 URL riêng biệt**. Bộ kiểm tra nhận dạng nguồn không tự chứng nhận quy tắc hoặc bản dịch; đã có lượt đọc và rà nội dung độc lập cho cả 48 mục mới.
- Ghi chú bám đúng nghĩa được chọn: `manage` là quản lý, `tired` là mệt và `worth` là có giá trị tiền. Không dùng bài `manage to do`, `tired of` hoặc `worth doing` để kiểm tra một nghĩa khác. Các cấu trúc khác nghĩa chỉ được nhắc để phân biệt khi cần.
- Không biến xu hướng thành quy tắc tuyệt đối. Ví dụ, không coi mọi câu “I am boring” là sai; phân biệt ý nghĩa với lỗi cấu trúc. Danh từ không đếm được có phạm vi rõ và nhắc cách dùng đặc biệt liên quan, như `a college education` hoặc `damages` trong pháp lý.
- Giữ ID `behaviour` và chấp nhận cách viết Mỹ `behavior` đã xác minh. Câu bổ sung dùng cách viết Mỹ, không đổi ID hoặc lịch.
- Các đáp án thay thế chỉ áp dụng trong đúng ví dụ đã rà: ghi **chưa chấm** thay vì đánh sai hoặc cộng điểm nhớ từ đích. Đây không phải bộ chấm mọi từ đồng nghĩa.

## Cách sử dụng

Trong **Kho từ → Trạng thái → Có cách dùng đã đối chiếu**, tìm các mục có nội dung bổ sung. Mở chi tiết để đọc mẫu dùng, ghi chú, câu thứ hai, lỗi thường gặp và link nguồn. Bộ lọc cũng áp dụng khi chuyển sang **Luyện tập**; chọn **Dùng trong ngữ cảnh** để luyện nhóm đã lọc. Phần mô tả bộ lọc hiển thị tiếng Việt thay cho mã trạng thái nội bộ.

Bài ngữ cảnh của phiên mới luân phiên câu gốc/câu bổ sung dựa trên lần làm đầu gần nhất, không xáo trộn theo mỗi lần tải lại. Đề và nháp đang làm vẫn giữ nguyên. Lượt sửa sai không được đổi thành bằng chứng nhớ lâu. Ghi chú chỉ gắn khi ID, đầu từ, từ loại và nghĩa Việt khớp; bản cá nhân đổi nghĩa/từ loại không nhận nhầm quy tắc nguồn.

## Tệp thay đổi và bảo toàn dữ liệu

| Tệp | Mục đích |
| --- | --- |
| `data/usage/group-c.json` | 16 động từ, cấu trúc và ngữ cảnh theo nghĩa |
| `data/usage/group-d.json` | 16 danh từ, tính đếm được và ngoại lệ |
| `data/usage/group-e.json` | 16 tính từ, giới từ và phân biệt cấu trúc |
| `src/main.tsx` | Bộ lọc cách dùng trong Kho từ và nhãn bộ lọc tiếng Việt |
| `src/usage.test.ts` | Kiểm tra đủ 96 mục, tương thích canonical, đáp án trung tính và cách viết Mỹ |
| `e2e/usage-expansion.spec.ts` | Hiển thị, bộ lọc, bản sửa cá nhân, phiên luyện và bảo toàn lịch/nháp trên 320/390 px |
| `scripts/check-usage-sources.py` | Kiểm tra metadata offline và nhận dạng bài nguồn trực tuyến |
| `.github/workflows/pages.yml` | Chạy kiểm tra metadata cách dùng trong CI, không lệ thuộc mạng Oxford |
| `README.md`, `docs/NEXT-SESSION.md`, báo cáo này | Cập nhật phạm vi và hướng dẫn bàn giao |

TXT **không đổi từng byte**, vẫn 5.560 mục, SHA256 `10392288d69ba11cc6e5fc74e02e0cc3654bea50cda229254236848d2d3a87f4`. Không thay schema IndexedDB, ID, contentKey, lịch ôn, thuật toán chọn từ hoặc định dạng sao lưu. Dữ liệu bổ sung đóng gói cùng ứng dụng để đọc offline sau khi tải bản cập nhật; mở trang nguồn cần Internet.

## Kiểm chứng

Lệnh kiểm tra nguồn:

```sh
python3 scripts/check-usage-sources.py --offline
python3 scripts/check-usage-sources.py --files data/usage/group-c.json data/usage/group-d.json data/usage/group-e.json --report /tmp/usage-sources.json
```

Chế độ offline chỉ kiểm tra khai báo và liên kết với canonical, không giả lượt truy cập mới. Chế độ live kiểm tra đúng bài thay vì chỉ mã HTTP; báo cáo hash mới tách khỏi hash lịch sử vì HTML nhà xuất bản có thể thay đổi. Bộ đọc đã thử 57 HTML thực tế và bốn trường hợp chỉ số đồng âm/chữ số đầu từ, gồm `refuse` có chỉ số đồng âm của Oxford và chữ số thật trong `B2B`.

Kết quả thực tế trên bản nội dung đã đóng băng:

- **335/335 unit**, 27 tệp: gồm nhận đúng nghĩa, câu thứ hai hợp lệ để điền, đáp án thay thế không cộng điểm và biến thể Mỹ.
- **37/37 kiểm thử dữ liệu**: 20 kiểm tra chất lượng + 17 kiểm tra rà toàn kho; canonical TXT không đổi.
- **104/104 E2E Chromium**, gồm bốn ca mới: đọc động từ/danh từ/tính từ ở 320/390 px, không tràn ngang, link nguồn đúng, bản sửa cá nhân không nhận nhầm ghi chú, bộ lọc áp dụng cho luyện thật và phiên ôn được giữ qua tải lại. Những luồng cũ về học, nghe, hội thoại, viết, nhập TXT, sao lưu và hợp nhất vẫn đạt.
- **TypeScript và build production đạt**. Bản build tải 5.560 mục, 52 bài ngữ pháp và ghi chú cách dùng ở đường dẫn gốc/đường dẫn con; tải lại offline và trạng thái thiếu JavaScript đều đạt. Không cache request riêng tư/API.
- **Nguồn mới live 52/52**, metadata toàn bộ 102/102; có lượt rà nội dung độc lập cho 48 mục mới. Không có kiểm thử Supabase thật.

CI chạy lại unit/data/metadata/E2E/production trên GitHub trước khi triển khai Pages. Bản kiểm tra nguồn live chỉ phục vụ đợt biên soạn, không biến tính sẵn sàng của Oxford thành điều kiện mỗi lần triển khai.

## Giới hạn còn lại

- **5.464 mục còn lại vẫn chỉ có ví dụ gốc**; 96/5.560 là khoảng 1,7%. Không tuyên bố đã mở rộng cách dùng cho toàn kho hay bao phủ mọi nghĩa của một từ.
- Vẫn có 12 hội thoại/48 ID mục tiêu và 346 IPA; phần lớn nghe dựa vào TTS, chưa có audio nguồn mặc định. Việc thêm mẫu dùng không tự mở rộng hội thoại hoặc đánh giá phát âm.
- Chưa có Supabase thật để kiểm thử đồng bộ trực tuyến; vẫn cần cấu hình tài khoản. Snapshot cloud hiện chứa toàn kho và giới hạn 20 MiB. Không có chấm ngữ pháp tổng quát hoặc AI trả phí.
- Kiểm tra trình duyệt dùng Chromium; chưa kiểm tra trực tiếp Safari/iPhone thật.
