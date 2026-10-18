# Nguồn và phạm vi kho từ Jeongyeon

Kho mặc định hiện chứa **toàn bộ phạm vi Oxford 3000 và phần bổ sung Oxford 5000 theo hai PDF đã đối chiếu**, cộng bộ **100 mục nghĩa cụm động từ (98 cụm)** và **107 mục Slang/thành ngữ/khẩu ngữ**, gồm 27 thành ngữ có ngữ cảnh báo chí. Tất cả nội dung học nằm trong file UTF-8 `vocabulary.txt`; không nhúng từ vựng vào mã giao diện.

## Đếm đúng phạm vi Oxford

- Hai PDF có **5.323 dòng đầu mục/từ loại/CEFR**.
- Gộp các từ trùng cách viết, giữ riêng May/may, March/march, IT/it: **4.955 đầu từ/cách viết**.
- Giữ toàn bộ 5.323 dòng nguồn trong `oxford-provenance.json`: 4.955 dòng gắn mục học chính và 368 dòng nguồn bổ sung. Một đầu từ có thể có nhiều loại từ hoặc nghĩa.
- `Oxford 5000` là tên danh sách; ứng dụng không nhân đôi thẻ để ép số đếm thành 5.000. Đây là phạm vi đầy đủ của **bản PDF lưu trữ cụ thể**, không tuyên bố đã xác minh phiên bản mới nhất trực tiếp từ nhà xuất bản.
- Phần Oxford 5000 bổ sung chủ yếu ở B2–C1, không phải toàn bộ là từ sơ cấp. Có thể lọc CEFR khi củng cố nền tảng.

## Ba mức nội dung

1. **Đã rà soát:** nội dung biên soạn và rà soát ngôn ngữ riêng, giữ các ID cũ. Không đồng nghĩa là Oxford chứng nhận nghĩa hoặc người học đã thuộc.
2. **Từ từ điển mở:** nghĩa Việt cùng từ loại được chọn từ FVDP/OVDP hoặc dữ liệu Wiktionary có nguồn. Chưa rà soát thủ công từng mục; nguồn lịch sử có thể có lỗi hoặc cách diễn đạt cũ. Bản dịch, ví dụ này **không phải định nghĩa/ví dụ Oxford**.
3. **Chỉ tra cứu:** dòng nguồn có xung đột hoặc thiếu nghĩa cùng từ loại đáng tin cậy. Không tạo bài kiểm tra cho mục này. Hiện có `diplomatic`: bản PDF lưu ghi `n.`, trong khi nguồn nghĩa phổ biến ghi tính từ. Ứng dụng không sửa âm thầm hoặc dạy một từ loại chưa đối chiếu.

Một mục học một nghĩa chính; các nghĩa Oxford khác vẫn có dấu vết dòng nguồn, không được tuyên bố đã cung cấp đầy đủ mọi nghĩa của mỗi từ.

Nếu nguồn không có ví dụ, để trống và ghi rõ. Không dựng câu ví dụ giả để đủ số lượng. Bài điền ngữ cảnh chỉ tạo khi có ngữ liệu Anh–Việt và đáp án mục tiêu có thể che đúng; cụm trích từ từ điển được ghi là ngữ liệu, không giả là câu mới biên soạn. Các mục có nghĩa vẫn hỗ trợ nhớ nghĩa, nhớ để viết, nghe và tự viết câu. Không đồng nhất nội dung đã xem với bằng chứng đã nhớ.

## Nguồn đầu từ/loại từ/CEFR

PDF có thương hiệu và © Oxford University Press, lấy qua mirror khóa theo commit. Đã kiểm tra SHA256 của bản lưu. Yêu cầu tải PDF trực tiếp từ Oxford trả HTTP403; chưa so sánh byte với bản hiện tại trên host nhà xuất bản. CEFR là dữ kiện đầu từ/loại từ, không chứng thực mọi nghĩa, cụm từ hoặc ví dụ ghép với đầu từ.

### Oxford 3000

- Tham chiếu nhà xuất bản: https://www.oxfordlearnersdictionaries.com/external/pdf/wordlists/oxford-3000-5000/The_Oxford_3000_by_CEFR_level.pdf
- Bản lưu thực tế: https://raw.githubusercontent.com/ittuann/The-Oxford-5000-Word-Lists/7dc22b8ff8e5cb3410e962b0511d22cdf74b120c/The_Oxford_3000_by_CEFR_level.pdf
- SHA256: `b81e3f65c976fc93eb342ba34c40f0ff8c3a59646312d09ac50f9c648e461cd3`

### Oxford 5000

- Tham chiếu nhà xuất bản: https://www.oxfordlearnersdictionaries.com/external/pdf/wordlists/oxford-3000-5000/The_Oxford_5000_by_CEFR_level.pdf
- Bản lưu thực tế: https://raw.githubusercontent.com/ittuann/The-Oxford-5000-Word-Lists/7dc22b8ff8e5cb3410e962b0511d22cdf74b120c/The_Oxford_5000_by_CEFR_level.pdf
- SHA256: `6577e6eb8745226ab7ab80912e83d285cf421ec70e61c92d74d5fef5f2c99570`

## Nguồn nghĩa Việt và giấy phép

- **Free Vietnamese Dictionary Project (FVDP):** Hồ Ngọc Đức và cộng tác viên, ©1997–2003, bản cập nhật 2004-07-01. Nguồn GPL, đối chiếu bản text tại `robert-strandh/VietAnh`, commit `7ed4138b1698dd5b8c3170ff7a33a640f81b6f22`, file `anhviet.dict`. Phần nghĩa/ngữ liệu nhập và lọc lại vẫn tuân theo GPL; xem `licenses/GPL-2.0.txt`.
- **Open Vietnamese Dictionary Project (OVDP):** GPL-2.0, bản StarDict lưu tại `dynamotn/stardict-vi`, commit `0f0b46997db2305ccd0cb9e161f25ac73988b0a9`. Chỉ dùng phần từ điển tổng quát, không lấy phụ lục chuyên ngành để ghi đè nghĩa phổ thông.
- **Wiktionary qua MinhQND dictionary:** chỉ chọn đúng đầu từ tiếng Anh, định nghĩa tiếng Việt, nhãn nguồn Wiktionary và từ loại phù hợp. Đóng góp của Wiktionary contributors/MinhQND, CC BY-SA 4.0, release v2.0.0 của `minhqnd/dictionary`, commit `f11b18fcc12dc291eff91dbebbd1f7ffac17aa5b`. Không nhập IPA hoặc ví dụ sinh tự động. Xem `licenses/CC-BY-SA-4.0.txt`.

`oxford-provenance.json` lưu tác giả, bản quyền, commit, URL và hash các nguồn, cùng phạm vi nhập thực tế. Bản TXT là nội dung có thể sửa trực tiếp; khi phân phối lại phần nhập cần giữ ghi nguồn và giấy phép tương ứng. Giấy phép của dữ liệu nhập không được trình bày là giấy phép cho toàn bộ mã ứng dụng hoặc PDF OUP.

Không sao chép định nghĩa, bản dịch hoặc âm thanh có bản quyền của từ điển Oxford. Không gán IPA/URL phát âm Oxford khi chưa đối chiếu. Nút nghe dùng giọng tổng hợp của thiết bị nếu không có URL âm thanh và ghi rõ điều đó.

## Slang và cụm động từ

Hai bộ này được biên soạn riêng, không tự nhận là danh sách Oxford hoặc gán CEFR. Slang bao gồm tiếng lóng, khẩu ngữ và một số thuật ngữ/viết tắt mạng có giải thích rõ. Các nghĩa có thể gây chê bai hoặc thân mật đều có ghi chú; không khuyến khích đưa slang thân mật vào IELTS Writing trang trọng. Thuật ngữ như DM, troll, FOMO cần đánh giá theo chủ đề và văn cảnh, không bị gọi sai là luôn luôn tiếng lóng.

Mỗi cụm động từ có một nghĩa/ID cụ thể, hướng dẫn tân ngữ, tính tách được/không tách và vị trí đại từ khi phù hợp. Những từ có hai nghĩa được đếm thành hai mục nghĩa, không thành hai từ khác nhau.

### Thành ngữ trong ngữ cảnh báo/đài Mỹ

Bổ sung **27 thành ngữ từ 27 bài tin, phỏng vấn, bài chuyên đề hoặc bản chép chương trình** của AP qua PBS, PBS NewsHour và VOA Learning English. Đây là các bài có nội dung tin/phỏng vấn, không lấy bài dạy thành ngữ rồi gọi là bản tin. Một trường hợp dùng trong tiêu đề được ghi rõ. Nguồn gồm bản lưu lịch sử; ngày đăng hiển thị là ngày bài nguồn, không phải lời khẳng định đây là tin mới hoặc các cụm đang thịnh hành.

Ví dụ `feel like a million bucks` được đối chiếu với lời nhân vật trong bài AP/PBS ngày 11/02/2025; `kick the can down the road`, `walk a tightrope`, `a double-edged sword` có ngữ cảnh nguồn riêng. Thành ngữ không đồng nghĩa với tiếng lóng: `expression_type` phân biệt thành ngữ, slang, khẩu ngữ, viết tắt và thuật ngữ; `register` mô tả sắc thái cụ thể.

Mỗi mục có trích đoạn ngắn nguyên văn, tác giả xuất bản, URL, tiêu đề và ngày đăng; phần giải thích/bản dịch/ví dụ luyện tập do Jeongyeon biên soạn nằm riêng. Trích nguồn giữ cách chia động từ, đại từ và mạo từ thực tế nên có thể khác dạng đầu mục học. Lời của người được phỏng vấn không phải sự xác nhận của tòa soạn. Một bài có dùng cụm từ không chứng minh tần suất sử dụng. Bản chép chương trình cũng có thể có lỗi phiên âm.

Xem `news-provenance.json` để biết từng nguồn, phạm vi đối chiếu, thời điểm truy xuất và SHA256 HTML. `scripts/audit-news-content.py` kiểm tra trích đoạn với HTML lưu cục bộ; không phân phối lại toàn bộ bài báo. Website đọc nội dung đã biên soạn trong TXT, không tự thu thập tin mới khi mở trang. Các 80 mục cũ chưa gắn bài nguồn được ghi riêng trong bộ lọc, không tự nhận đã được báo chí xác minh.

## Sắp xếp theo trình độ và tần suất

Kho từ xếp **A1 → A2 → B1 → B2 → C1 → C2**, rồi theo tần suất tiếng Anh giảm dần trong cùng trình độ; cùng điểm thì A–Z và ID ổn định. Mục chưa có CEFR nằm cuối; mục thiếu điểm nằm sau các mục có điểm trong cùng trình độ. Từ mới trong kế hoạch học dùng cùng thứ tự; lượt ôn đến hạn vẫn đi trước. Slang/cụm động từ ở trang riêng vẫn mặc định A–Z.

Điểm `frequency_zipf` lấy từ **wordfreq 3.1.1, bảng English large** của Robyn Speer và các nguồn được ghi công, gồm dữ liệu tổng hợp ở nhiều miền ngữ liệu. Đã kiểm tra hash gói và bảng nguồn. **4.921 đầu mục Oxford** có điểm trực tiếp; 34 đầu mục khác giữ trống vì thiếu cách viết chính xác hoặc là cụm/đầu mục gộp. Không ước lượng tần suất thành ngữ bằng tích tần suất các từ thành phần, và không gán điểm của nghĩa đen cho slang.

Đây là ước lượng tần suất **cách viết không phân biệt hoa/thường**, gộp các nghĩa/từ loại; nguồn gốc gộp `May/may`, `March/march`, `IT/it`. Kho hiện giữ trống điểm của `May`, `March`, `IT` và `found` (thành lập), có ghi chú vì tần suất nghĩa khác sẽ gây hiểu nhầm. Không phải điểm Oxford, độ khó IELTS hay tần suất riêng trong thời sự Mỹ. Nguồn là bản chụp lịch sử, không phải đo lường thời gian thực. Điểm cao hơn chỉ biểu thị tần suất tổng hợp cao hơn; thiếu dữ liệu không có nghĩa là từ hiếm.

Các giá trị chọn lọc từ wordfreq theo **CC BY-SA 4.0**; giữ giấy phép, `licenses/wordfreq-NOTICE.txt` và `licenses/wordfreq-upstream-attribution.txt` khi phân phối lại. Xem `frequency-provenance.json` cho phương pháp, hash và phạm vi từng mục; `data/frequency/README.md` hướng dẫn tái tạo. Cài Python/wordfreq chỉ cần khi chủ ý tạo lại dữ liệu, không cần cho chạy/build web thông thường.

## Cập nhật và giữ lịch sử

ID của 259 mục đã có được giữ nguyên. Bản sửa cá nhân không bị bản cập nhật mặc định ghi đè. Các mục mẫu không còn trong nguồn được lưu trữ, không xóa lịch sử. File `vocabulary.sample.txt` giữ 20 mục minh họa định dạng cũ; không phải kho chính.

`data/authoring/*.txt` lưu riêng nội dung biên soạn cho các mục bổ sung, cụm động từ và slang. `scripts/build-full-corpus.py` kết hợp chúng với dữ kiện/nguồn trích xuất có ghi provenance; Vite không cần chạy script này, chỉ đọc TXT đã lưu. Người dùng thêm/sửa từ trực tiếp trong `vocabulary.txt` hoặc giao diện như trước.

## Số lượng bản hiện tại

- oxfordHeadwords: 4955
- entryCount: 5162
- reviewed: 674
- dictionary: 4487
- reference: 1
- phrasalSenses: 100
- slangSenses: 107
- newsIdioms: 27
- frequencyScored: 4921
- withBilingualContext: 3631
- missingContext: 1531

## Chất lượng bài học sau rà soát 2026-10

Giữ đủ 5.162 ID; **674 mục `learning_status: ready`** dùng được trong bài học và **4.488 mục `lookup`** giữ để tra cứu, không tự vào quiz. Nhãn `content_status` vẫn mô tả nguồn/độ rà nội dung, không đồng nhất với người học đã nhớ. Chỉ xác nhận cá nhân sau khi kiểm tra đúng nghĩa/từ loại và ví dụ Anh–Việt; bản cá nhân được giữ khi cập nhật mặc định.

Đã biên soạn lại 38 mục lỗi hoặc nghĩa chính không phù hợp, có nghĩa Việt, giải nghĩa Anh, ví dụ, collocation và chủ đề cụ thể. `lie` nghĩa nói dối được gắn đúng sourceFactIndex 2175, B1; dòng `lie1` A1 vẫn giữ trong dấu vết nguồn. Các nghĩa lịch sử chưa rà khác không bị giả thành nội dung đã kiểm chứng. Xem `content-review-provenance.json` và `data/authoring/content-review-2026-10.txt`.

Chín mục có `news_media_url` theo VideoObject của bài PBS đã đối chiếu. URL được ghi như liên kết nhà xuất bản khai báo, chưa chứng minh phát trực tiếp thành công và chưa xác minh thời điểm cụm từ; `news_media_start` để trống. Không sao chép video hoặc tự thêm timestamp.

TXT đã commit là nội dung chuẩn; sửa trực tiếp không cần viết lại ứng dụng. Các script tạo corpus/áp dụng review mặc định chỉ tạo bản xem trước, `--write` mới cập nhật; full builder bảo toàn mọi mục và trường đã có trong TXT. Kiểm tra `npm run test:data` bảo vệ các sửa lỗi, ID, phạm vi nguồn và hash. Không cần chạy full builder để dùng web.
