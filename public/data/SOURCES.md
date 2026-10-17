# Nguồn và phạm vi kho từ Lexi IELTS

Kho mặc định hiện chứa **toàn bộ phạm vi Oxford 3000 và phần bổ sung Oxford 5000 theo hai PDF đã đối chiếu**, cộng bộ **100 mục nghĩa cụm động từ (98 cụm)** và **80 mục Slang/khẩu ngữ**. Tất cả nội dung học nằm trong file UTF-8 `vocabulary.txt`; không nhúng từ vựng vào mã giao diện.

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

## Cập nhật và giữ lịch sử

ID của 259 mục đã có được giữ nguyên. Bản sửa cá nhân không bị bản cập nhật mặc định ghi đè. Các mục mẫu không còn trong nguồn được lưu trữ, không xóa lịch sử. File `vocabulary.sample.txt` giữ 20 mục minh họa định dạng cũ; không phải kho chính.

`data/authoring/*.txt` lưu riêng nội dung biên soạn cho các mục bổ sung, cụm động từ và slang. `scripts/build-full-corpus.py` kết hợp chúng với dữ kiện/nguồn trích xuất có ghi provenance; Vite không cần chạy script này, chỉ đọc TXT đã lưu. Người dùng thêm/sửa từ trực tiếp trong `vocabulary.txt` hoặc giao diện như trước.

## Số lượng bản hiện tại

- oxfordHeadwords: 4955
- entryCount: 5135
- reviewed: 610
- dictionary: 4524
- reference: 1
- phrasalSenses: 100
- slangSenses: 80
- withBilingualContext: 3590
- missingContext: 1545
