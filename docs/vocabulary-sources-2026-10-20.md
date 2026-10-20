# Cập nhật nguồn từ vựng, ưu tiên Anh–Mỹ

Ngày rà: 20/10/2026. Bản nền: `73a85dccf1eee22b40ec928c8f083d5e073c397e` (đã triển khai mục ngữ pháp).

## Kết quả và phạm vi

| Chỉ số | Kết quả |
| --- | --- |
| Tổng mục theo nghĩa/từ loại | 5.558 |
| Mục cũ giữ nguyên ID/thứ tự | 5.162 |
| Mục mới | 396: 57 American Oxford, 316 OPAL, 23 Cambridge Blog |
| Đủ điều kiện luyện | 1.061 |
| Chỉ tra cứu | 4.497 |
| Cách viết Mỹ bổ sung cho mục cũ | 61 |
| Nghĩa cũ sửa có chủ đích | 4 |
| IPA North American mới đối chiếu trực tiếp | 316 |
| URL có metadata HTTP/ngày/hash/phạm vi | 454, gồm một số tiểu mục cùng trang |

Đã đọc trực tiếp hai PDF American Oxford 3000/5000 chính thức (5.325 dòng dữ kiện, 4.954 cách viết khác nhau). Mọi đầu từ trong hai PDF này đều có mặt qua đầu từ hiện có, biến thể xác minh hoặc mục bổ sung. Giữ nguyên 4.955 cách viết/5.323 dòng bằng chứng Anh–Anh đã nhập trước đây; không xóa từ do khác phiên bản, không ép số đếm thành 5.000 thẻ và không đổi CEFR cũ âm thầm.

Đã đối chiếu danh sách OPAL và các mục còn thiếu: cả đầu từ chưa có lẫn từ loại khác của đầu từ đang có. Không coi nghĩa cũ là sai chỉ vì OPAL dùng từ loại khác. Danh sách từ đơn OPAL có 1.511 dòng từ loại/1.339 nhãn đầu từ; tất cả đầu từ đều hiện diện. Nhãn từ loại khác nhau giữa danh sách và bài chi tiết được ghi rõ, không tạo loại từ thiếu căn cứ để khớp một bảng. Mục `module` đã bổ sung từ American Oxford không bị nhân đôi khi cũng thuộc OPAL.

Tổng 5.558 là số **mục học theo nghĩa/từ loại**, gồm từ, cụm động từ, thành ngữ và cách nói; không phải 5.558 từ đơn Oxford khác nhau. Việc bao phủ đầu từ không có nghĩa mọi giải nghĩa cũ đã được rà lại. Các nghĩa lịch sử chưa kiểm tra tiếp tục chỉ tra cứu.

## Nguồn ưu tiên được áp dụng

- **A1–C1:** American Oxford 3000/5000, PDF lấy theo liên kết thật trên trang danh sách Oxford. Giữ URL/POS/CEFR/trang/dòng/hash. Bằng chứng Anh–Anh cũ vẫn tồn tại riêng.
- **Nghĩa và cách dùng:** đọc bài Oxford Advanced American Dictionary/Oxford Academic cho phần bổ sung và mục sửa. Giải thích Việt, định nghĩa diễn giải và ví dụ song ngữ là nội dung Jeongyeon biên soạn; không sao chép hàng loạt định nghĩa hoặc ví dụ của nhà xuất bản.
- **Cambridge Dictionary:** các bài đã thử vẫn trả HTTP 403/Cloudflare. Không có nhãn giả “đã xác minh Cambridge” cho các nghĩa chưa đọc được.
- **Cambridge Dictionary Blog:** sáu bài thực tế, 23 mục có sắc thái và nguồn. 11 cụm hữu ích đã có cách dùng rõ; 12 từ mới/chuyên biệt giữ tra cứu. Word Watcher/New words ghi nhận cách dùng, không chứng minh đã vào từ điển, tần suất cao hoặc độc quyền tiếng Mỹ.
- **YouGlish:** liên kết ngoài với bộ lọc Mỹ. Đã kiểm tra trang thật `/pronounce/power/english/us`; tạo URL theo từ bằng mã hóa an toàn. Chưa kiểm tra từng video hoặc xác nhận phát trên mọi thiết bị. Không lấy YouGlish làm nguồn nghĩa hoặc kết quả chấm.
- **Oxford OPAL:** nguồn danh sách và nghĩa học thuật. OPAL spoken dựa trên ngữ liệu nói học thuật Anh–Anh; không quảng bá là tần suất Mỹ hoặc thước đo band IELTS. Không nhập hàng loạt mẫu cụm OPAL chưa biên tập.

Mọi nội dung học cơ bản vẫn chạy tại máy, không thêm API trả phí/tài khoản hoặc dịch vụ AI.

## Những lỗi và điểm dễ gây hiểu nhầm đã sửa

| Mục | Nghĩa được chọn sau rà |
| --- | --- |
| `hardly` | Hầu như không; phân biệt với `hard`, không dùng nghĩa cổ “khắc nghiệt” làm nghĩa luyện chính. |
| `sensible` | Hợp lý/biết suy xét; phân biệt với `sensitive`. |
| `execution` | Sự thực hiện/triển khai trong ví dụ đang luyện; ghi riêng nghĩa thi hành án tử hình, không trộn đáp án. |
| `pants` | Quần dài theo cách dùng Mỹ; ghi rõ cách dùng Anh–Anh thường chỉ quần lót. |

Các ví dụ mới không còn dùng ngữ liệu cổ hoặc nghĩa sai với từ loại đang hiển thị. Những trường nội dung học khác của 5.162 mục cũ được kiểm tra bằng hash bảo vệ; chỉ bốn mục nêu trên thay nội dung có chủ đích. Kho chưa được công bố là đúng tuyệt đối hoặc bao quát mọi nghĩa.

OPAL liên kết `latter` noun nhầm sang `become`: đã tìm theo chuỗi href thực và đọc đúng `/definition/english/latter_2`. Danh sách gắn `many` adjective trong khi bài Oxford dùng determiner/pronoun: giữ phân loại phù hợp với cách dùng, không thêm tính từ giả. Danh từ `practical` nguồn ghi Anh–Anh/thân mật nên có nhãn rõ và chỉ tra cứu. `per cent` có dạng Mỹ `percent` được nguồn xác nhận.

Rà chéo phát hiện mười hash của snapshot lô OPAL khác HTML cache đang giữ. Đã đọc lại đối chiếu nội dung/IPA và dùng hash đúng cache đã rà. Đây là metadata của snapshot; HTML quảng cáo động của nhà xuất bản có thể thay byte ở lần lấy sau.

## Cách hoạt động và bảo toàn dữ liệu

`preferred_us_spelling` là trường TXT tùy chọn. Khi ưu tiên Anh–Mỹ, giao diện/giọng tổng hợp dùng cách viết Mỹ đã khai báo; vẫn nhận cả cách viết nguồn. ID, đầu từ nguồn, khóa nội dung học, lịch sử và lịch ôn không đổi chỉ vì thêm cách viết tương đương. Không đổi hàng loạt ví dụ, phiên âm hoặc audio sang Mỹ mà thiếu bằng chứng.

Hồ sơ mới dùng `en-US`; lựa chọn đã lưu được giữ. Người có hồ sơ cũ đang dùng Anh–Anh đổi **Cài đặt → Giọng đọc → Anh–Mỹ** nếu muốn dùng ưu tiên mới. Thiết bị thiếu giọng Mỹ hiển thị giọng tiếng Anh dự phòng thực tế.

Thực sự sửa nghĩa vẫn giữ lịch sử cũ nhưng không tái sử dụng bằng chứng/lịch không còn phù hợp cho nghĩa mới, theo cơ chế phiên bản nội dung đang có. Kho từ được cập nhật qua luồng xem trước và áp dụng; bản sửa cá nhân tiếp tục có ưu tiên. Không ghi trực tiếp vào IndexedDB, không đổi tên database, không xóa dữ liệu hoặc thay định dạng sao lưu.

Các mục Word Watcher/BrE chỉ tra cứu bị chặn ở cả sáu kỹ năng cho đến khi người học chủ động xác nhận. Ví dụ của chúng vẫn ghi “Jeongyeon biên soạn”; không bị gán nhầm là trích từ điển mở. Xác nhận cá nhân không tự mở rộng phạm vi chứng thực của nguồn.

Tìm kiếm nhận đầu từ, cách viết Mỹ và biến thể. Lọc Bộ từ có nhãn rõ cho American Oxford, OPAL văn viết/hội thoại và Cambridge Blog. Đọc các dữ liệu đã tải dùng được offline; mở nhà xuất bản/YouGlish cần Internet. Từ mới chưa có phép đo wordfreq giữ điểm trống, không bịa tần suất hoặc suy ra chúng hiếm chỉ vì thiếu điểm.

## Tệp chính

- `data/authoring/source-update-2026-10.json`: nội dung nguyên gốc, các sửa đổi cụ thể, cách viết và liên kết danh sách theo ID/POS; metadata nguồn và giới hạn.
- `data/lexicons/american-oxford-2026-10.json`, `opal-2026-10.json`: dữ kiện danh sách đã đọc; không chứa định nghĩa toàn văn nguồn.
- `scripts/apply-source-update.py`: xem trước mặc định, chỉ ghi canonical với `--write`, kiểm tra prefix ID/POS/xung đột/trường TXT; cập nhật hash và số đếm provenance.
- `scripts/apply-content-review.py`, `test-content-quality.py`: giữ sửa đổi mới khi chạy lại overlay cũ, không mất cảnh báo tra cứu; kiểm tra bảo toàn và tái lập.
- `public/data/vocabulary.txt`, manifest và bốn provenance JSON: dữ liệu cập nhật thực tế, cùng giấy phép và dấu vết nguồn cũ được giữ.
- `src/american-english.ts`, `core.ts`, `main.tsx`, `DictionaryEntry.tsx`, `WritingFeedback.tsx`, `dictionary.css`: ưu tiên cách viết/giọng Mỹ và ghi nguồn đúng phạm vi trong giao diện hiện có.
- Các test American/source-update, kiểm thử dữ liệu và assertion hồi quy tương ứng: bảo vệ dữ liệu cũ, chấm biến thể, nguồn, tra cứu và phiên bản production.

Không thêm dependency hoặc sửa lockfile, không thêm trang điều hướng.

## Kết quả kiểm thử

- **242 unit tests** đạt, gồm kiểm tra toàn bộ đầu từ hai PDF Mỹ và OPAL, prefix ID, nội dung cũ, cách viết, nghĩa sửa và hàng rào lookup.
- **20 kiểm thử dữ liệu** đạt: hash/count khớp, pipeline preview chỉ đọc và idempotent, xung đột/đổi ID/POS bị chặn, giữ nguồn Anh–Anh và dữ liệu thủ công ngoài phạm vi.
- **75 E2E Chromium** đạt: toàn bộ chức năng cũ và ngữ pháp; giọng/cách viết Mỹ, giữ lựa chọn Anh–Anh đã lưu, chấm dưới ID/lịch cũ, ghi nguồn biên soạn/OVDP, bộ lọc; dữ liệu thật American Oxford/OPAL/Blog ở 320 px và khi mất mạng.
- **TypeScript/build production** đạt; root và đường dẫn con tải đủ 5.558 mục, ngữ pháp và reload offline hoạt động, lỗi thiếu JS có thông báo, request riêng/API không bị cache.
- Vòng nội dung đối chiếu đủ 124 mục OPAL đầu từ mới, 194 mục từ loại còn thiếu và 57 mục Mỹ; dữ liệu sau loại trùng gồm 316 mục OPAL mới. IPA Mỹ đối chiếu literal từ nguồn, không sinh tự động.

Chưa kiểm tra Safari/iPhone thật, chất lượng TTS trên thiết bị người dùng hoặc Supabase thật (chưa có project). Build còn cảnh báo bundle JavaScript trên 500 kB, khoảng 202 kB gzip; không phải lỗi build. Các nhóm sửa bằng chứng/merge/analytics dài hạn của lần audit trước vẫn còn trong `NEXT-SESSION.md`.

SHA256 canonical TXT sau cập nhật: `19fb2f4dd2ffab355ac9fe59abf1442bfad79fbe036e7262d90197132667d004`.
