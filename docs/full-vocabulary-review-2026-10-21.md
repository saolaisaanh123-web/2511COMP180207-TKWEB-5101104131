# Rà toàn bộ kho từ Jeongyeon

Nội dung và đối chiếu nguồn ngày 20–21/10/2026; tích hợp và kiểm thử bàn giao ngày 22/10/2026 (giờ người dùng). Bản nền: `0b51239d01bb0e7fd90e82aa025ee62e89ddb098`. Đây là đợt hoàn thiện nội dung hiện có, không xây lại ứng dụng hoặc thay thuật toán ôn tập.

## Kết quả

| Chỉ số | Trước | Sau |
| --- | ---: | ---: |
| Tổng mục theo nghĩa/từ loại | 5.558 | 5.558 |
| Đủ nội dung để luyện | 1.061 | 5.558 |
| Chỉ tra cứu | 4.497 | 0 |
| Có ví dụ Anh–Việt | 4.028 | 5.558 |
| Có giải nghĩa tiếng Anh | 904 | 5.558 |
| Có IPA trong dữ liệu | 316 | 344 |

Tổng 5.558 gồm từ đơn theo nghĩa/từ loại, cụm động từ, thành ngữ, khẩu ngữ và thuật ngữ mới; không phải 5.558 từ đơn Oxford khác nhau. Giữ đầy đủ phạm vi Oxford 3000/5000 đã nhập, các bổ sung American Oxford và OPAL. Mỗi mục vẫn dạy một nghĩa được chọn, không phải mọi nghĩa của đầu từ.

Sáu mục không tạo bài điền từ do dạng gộp hoặc cấu trúc biến đổi, gồm `a, an` và năm thành ngữ; vẫn dùng được ở những kỹ năng khác. Không mở bài điền với câu không che được đáp án phù hợp. `lookup` tiếp tục có hiệu lực cho từ tự nhập/chưa rà hoặc mục cá nhân được tạm ngưng; không bỏ hàng rào chất lượng trong mã ứng dụng.

## Những vấn đề được phát hiện và sửa

- 4.484 mục tra cứu thiếu giải nghĩa Anh; 1.530 mục thiếu cặp ví dụ; phần lớn ngữ liệu cũ là cụm rời. Một số mục chỉ dẫn sang đầu từ khác, không cung cấp nghĩa để học.
- `bee` bị ghi thành “nhà thơ”; `classroom` thành “phòng đọc”; `clock` chọn nghĩa trang trí bít tất. Đã sửa lần lượt thành con ong, phòng học và đồng hồ chỉ giờ theo nguồn ngữ nghĩa phù hợp.
- Các mục như `cast`, `flow`, `advertise`, `file` có nghĩa hiếm, cũ hoặc không phù hợp làm nghĩa luyện chính. Chọn dàn diễn viên, chảy, quảng cáo và hồ sơ/tập tài liệu. Không kết luận mọi nghĩa phụ trước đây đều sai.
- `globalization`, `suddenly` không còn là chỉ dẫn “xem …”, mà có nghĩa thực, định nghĩa và câu luyện.
- `diplomatic` được sửa công khai từ noun thành adjective. Bài Oxford American và danh sách Oxford trực tuyến hiện hành xác nhận adjective/C1; giữ dòng PDF cũ ghi noun như dấu vết lịch sử.
- Các khác biệt vùng được kiểm tra riêng: nghĩa Mỹ của `biscuit`, `football`; nghĩa Anh–Anh của `flat`, `revision` và `practical` noun có nhãn/ghi chú. Không biến mọi từ tìm thấy trong WordNet thành từ “đặc trưng Mỹ”.

## Cách đối chiếu nguồn

1. Khóa Open English WordNet tại commit `45fdb60396dc804526b85f21a23c59983c2c396a`; lấy các tệp trực tiếp từ kho chính thức. Đối chiếu lemma, từ loại và synset cụ thể, xét cách viết/biến tố có căn cứ; không tự lấy nghĩa đầu tiên.
2. Đọc Oxford American/Academic/Learner’s cho từ chức năng, nghĩa hiện đại, điểm khác biệt Anh–Mỹ và các trường hợp WordNet chưa đủ phù hợp. Với slang/nghĩa mới, đọc thêm Merriam-Webster và một số mục American Heritage/Collins.
3. Cambridge Dictionary Blog giữ vai trò nguồn ghi nhận thuật ngữ đương đại; phân biệt cách dùng mới/chuyên biệt với từ đã ổn định hoặc có tần suất cao. Cambridge Dictionary còn bị chặn, không được khai là nguồn đã đọc.
4. Chọn nghĩa để dạy, biên soạn nghĩa Việt và ví dụ hoàn chỉnh Anh–Việt, kiểm tra cùng nghĩa/từ loại. Rà lại 1.061 mục đã sẵn sàng, giữ nội dung tốt thay vì viết lại tất cả.
5. Kiểm tra độc lập bản ghép: 5.558 ID riêng biệt; 4.777 liên kết WordNet khớp đúng ID/synset/URL/hash; 4.205 giải nghĩa Anh dùng theo giấy phép khớp nguyên bản nghĩa nguồn; 1.353 giải nghĩa Anh còn lại là diễn giải biên soạn. Toàn bộ 75 tệp nguồn WordNet (gồm tệp đầu từ, định nghĩa và giấy phép) khớp hash đã khóa.

Provenance có 816 URI nguồn khác nhau; một số cùng bài nhưng khác tiểu mục/anchor, không đồng nhất với 816 website hoặc lượt tải độc lập. Có 792 bản ghi bằng chứng từ các nhà xuất bản: 405 được kiểm tra lại bằng body cache và metadata còn giữ, 387 kế thừa phiếu đối chiếu thành công của đợt trước khi cache `/tmp` không còn sau thay môi trường. Các phiếu này giữ ngày và hash thật, không bị trình bày thành lượt tải mới. Bằng chứng theo từng ID nằm trong `public/data/full-review-provenance.json`.

Đây là đối chiếu ngữ nghĩa theo nguồn và biên tập bản dịch/ví dụ, không phải chứng nhận của nhà xuất bản hay bảo đảm đúng tuyệt đối. WordNet là mạng ngữ nghĩa, không tự xác nhận cách dùng tự nhiên, CEFR, tần suất hoặc giọng Mỹ. Những thuộc tính đó dùng bằng chứng riêng.

## Nội dung và giấy phép

Giải nghĩa Anh chép theo giấy phép Open English WordNet được đánh dấu `definition_source: oewn`, ghi CC BY 4.0 và Princeton WordNet. Phần diễn giải mới dùng `authored`. Nghĩa Việt và ví dụ song ngữ là nội dung Jeongyeon biên soạn; không giả là ví dụ nguyên văn của Oxford/Merriam-Webster.

Giữ `OEWN-NOTICE.txt`, `OEWN-CC-BY-4.0.txt`, `Princeton-WordNet.txt` cùng các giấy phép lịch sử. Không phân phối toàn bộ HTML nhà xuất bản. Không phát sinh API trả phí, không thêm thư viện chạy ứng dụng và không thêm khóa bí mật.

## Bảo toàn dữ liệu

- Giữ nguyên tất cả ID và thứ tự, đầu từ, đáp án, biến thể chính tả, CEFR, chủ đề/bộ từ, tần suất và `source_fact_index`. Các trường không được khai báo sửa có hash bảo vệ theo từng ID.
- Giữ nguyên nghĩa Việt của toàn bộ 1.061 mục vốn đủ điều kiện luyện. Chỉ hai cặp ví dụ cũ (`league`, `match`) được làm rõ môn thể thao; phần sửa này có thể làm lại lịch kỹ năng ngữ cảnh theo quy tắc phiên bản nội dung hiện có. Bổ sung 170 định nghĩa còn thiếu không tự thay lịch nghĩa.
- Không ghi trực tiếp vào IndexedDB, không đổi tên/version cơ sở dữ liệu, không xóa lịch sử, phiên, nháp hoặc bản sửa cá nhân. Cập nhật nguồn đi qua luồng xem trước/áp dụng hiện có.
- Với nghĩa thực sự đổi, giữ kết quả lịch sử nhưng không dùng kết quả của nghĩa cũ làm bằng chứng cho nghĩa mới. Các bản người học đã sửa hoặc tự xác nhận là cá nhân tiếp tục có ưu tiên.
- Metadata WordNet dùng URL raw đúng với bytes được hash; liên kết GitHub xem theo dòng được giữ riêng nếu có. Không gắn hash YAML vào HTTP body của trang HTML GitHub.

## Tệp và pipeline

| Tệp/nhóm | Vai trò |
| --- | --- |
| `data/authoring/full-review-2026-10.json` | Manifest, baseline/hash và danh sách các phần rà theo ID |
| `data/authoring/full-review/*.json` | 13 phần nội dung và bằng chứng được khai báo rõ |
| `scripts/apply-full-review.py` | Preview mặc định; `--write` mới cập nhật canonical và provenance; từ chối ID/POS tùy tiện, nguồn thiếu bằng chứng và nội dung thiếu |
| `scripts/apply-source-update.py` | Phối hợp overlay lịch sử với đợt rà mới, chỉ chấp nhận thay đổi mới đã khai báo; replay giữ kết quả mới |
| `scripts/audit-wordnet.py`, `research-oxford-corpus.py` | Công cụ nghiên cứu tùy chọn, cache nguồn riêng; không tự đánh dấu nội dung đã xác minh |
| `public/data/vocabulary.txt`, các provenance/manifest | Nội dung tải thật của ứng dụng, hash và dấu vết kiểm tra |
| `src/core.ts`, `DictionaryEntry.tsx` | Trường nguồn định nghĩa tùy chọn và nhãn giải nghĩa WordNet chính xác; không thay hàng rào học/lịch ôn |
| Các unit/data/E2E tương ứng | Bảo vệ nội dung, nguồn, ID, replay, bản cá nhân, lịch sử và hiển thị thật |

Phát triển/build bình thường dùng TXT đã commit, không cần tải nguồn hoặc chạy công cụ nghiên cứu. Công cụ nghiên cứu WordNet/Oxford có phụ thuộc Python riêng trong môi trường nghiên cứu; CI và ứng dụng không cần chúng. Sửa nội dung rà phải cập nhật phần authoring tương ứng để việc replay không đưa bản cũ trở lại.

## Kiểm thử bàn giao

- **251 unit tests**, **30 kiểm thử dữ liệu** (20 hồi quy + 10 an toàn áp dụng review); TypeScript đạt. Bài kiểm tra toàn bộ 5.558 mục có thời gian riêng 30 giây cho máy CI dùng chung; giữ nguyên tất cả assertion. Các kiểm tra cũ được cập nhật đúng lớp nguồn mới, vẫn giữ bảo vệ ID/CEFR/POS và chỉ chấp nhận ngoại lệ diplomatic có bằng chứng.
- **76 E2E Chromium** đạt trên bản tích hợp: học/ôn, bốn chế độ chọn từ, giữ phiên/lịch sử, hai tab, nhập TXT, sao lưu, hội thoại/viết, ngữ pháp và mobile. Sau khi chuẩn hóa URL hash WordNet, chạy lại cả hai E2E dữ liệu thật/ghi nguồn và production đều đạt; thay đổi chuẩn hóa chỉ chạm nguồn, không chạm nghĩa/ví dụ.
- **Build production** đạt; đường dẫn gốc và đường dẫn con nạp 5.558 mục, tải lại ngoại tuyến kèm ngữ pháp hoạt động. Request riêng/API không bị cache; thiếu JavaScript hiện thông báo thay cho trang trắng. Còn cảnh báo bundle trên 500 kB (khoảng 202 kB gzip), không phải lỗi build.
- Preview chỉ đọc và replay các overlay giữ nguyên kết quả canonical; dữ liệu cá nhân giữ ưu tiên, lịch sử không bị xóa, các trường không được phép sửa khớp hash baseline. Kiểm tra riêng 28 IPA mới đều khớp literal NAmE trong HTML Oxford đã đọc.

SHA256 TXT bàn giao: `86a5b8d2a4a907b2ce7d3d8997972494ff35621dad870a765bc665dcee744eb4`; 5.558 mục, 8.875.929 byte. Manifest tự sinh ghi kích thước thực tế làm căn cứ khi kiểm tra tải file. Xem thêm báo cáo so sánh `forumflashstudy-comparison-2026-10-21.md` cho các luồng đã thao tác thật trên website tham khảo.

## Giới hạn còn lại

- Phần lớn mục mới có một câu ví dụ. Cần thêm ngữ cảnh khác và mẫu dùng có nguồn cho các nhóm dễ nhầm; thuộc một câu chưa chứng minh dùng được từ linh hoạt.
- 344 mục có IPA; không bịa IPA cho phần còn lại. Nghe vẫn dùng TTS hoặc URL có sẵn, không tự nhận là audio Oxford hay giọng người thật đã xác minh. YouGlish là liên kết ngoài.
- Chưa kiểm tra Safari/iPhone thật hoặc Supabase thật vì chưa có project. Các lỗi phân tích bằng chứng, merge lịch cũ và hướng luyện dài hạn đã ghi trong `NEXT-SESSION.md` không được coi là đã giải quyết chỉ nhờ cập nhật nội dung.
- Nhãn “ready” xác nhận nội dung đủ dùng để luyện, không xác nhận người học đã thành thạo hay tương đương band IELTS.
