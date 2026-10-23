# Jeongyeon — sửa độ tin cậy khi học từ vựng

Ngày 23/10/2026. Đợt sửa dựa trên kiểm tra tổng thể của bản `db56e0f22647cc9a8d9060db4bd108986bb8b14c`. Giữ thiết kế Jeongyeon, định dạng TXT, ID cũ, lịch sử và khả năng học không đăng nhập/offline; không thêm dịch vụ thu phí.

**Kiểm thử trên mã đã tích hợp:** 333 unit, 37 kiểm thử dữ liệu và 100 E2E Chromium đều đạt; TypeScript và production/offline đạt. Phát hành qua workflow GitHub Pages khi đẩy lên `main`; kết quả chạy theo commit có trong liên kết triển khai bên dưới. Supabase thật và chất lượng TTS thiết bị vẫn chưa được xác minh.

## Vấn đề cũ và thay đổi thực tế

| Vấn đề đã tái hiện                                                                                                       | Sửa trong đợt này                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Backup/tab cũ có thể áp lịch 30 ngày của nghĩa trước vào nghĩa mới                                                       | Lịch mới gắn phiên bản nội dung theo kỹ năng; record, IndexedDB, backup, rebase và cloud chỉ nhận lịch tương thích      |
| `recommend`/`advise` bị coi sai trong ngữ cảnh suggest đã rà                                                             | Đáp án thay thế theo đúng ngữ cảnh được lưu trung lập, không làm sai lịch hoặc tạo retry; đề nêu nghĩa/từ loại mục tiêu |
| `discussed about as many…` bị yêu cầu bỏ about và đổi ý                                                                  | Thu hẹp quy tắc để tránh các cấu trúc chỉ số lượng xấp xỉ; ngoài phạm vi vẫn chưa thể chấm tự động                      |
| Bảng tiến độ bỏ lượt sai có gợi ý khi xét từ yếu; khoảng nghỉ chưa biết được tính ≥24 giờ; số liệu nghĩa cũ còn chen vào | Dùng chung bộ chọn bằng chứng, tách hỗ trợ với đúng không gợi ý và chỉ dùng khoảng nghỉ quan sát được                   |
| Chế độ thông dụng lặp mãi cùng nhóm vừa làm đúng                                                                         | Tạm giảm ưu tiên từ vừa hoàn thành trong 24 giờ nếu còn từ khác cần học, giữ từ yếu/đến hạn                             |
| Viết luôn trước khiến nghe/ngữ cảnh khó có bằng chứng nhớ độc lập                                                        | Luân phiên kỹ năng khách quan đầu tiên cho từng từ ở phiên mới                                                          |
| Nút luyện nhóm thường quên mở kỹ năng đã chọn trước đó                                                                   | Truyền kỹ năng yếu thực tế vào bài luyện                                                                                |
| Thiếu like “thích” và lie “nằm” dù có đầu từ ở nghĩa khác                                                                | Thêm hai ID mới với nguồn Oxford American, giữ nghĩa và tiến độ cũ                                                      |
| TTS đọc từ rời chưa có ngữ cảnh phân biệt từ loại                                                                        | Khi có nhiều từ loại cùng đầu mục, dùng câu song ngữ đã biên soạn của chính nghĩa đó và ghi rõ giới hạn TTS             |
| Hội thoại hiện transcript khi trả lời                                                                                    | Thêm pha ẩn transcript; mở lại là dùng gợi ý, không tự chứng nhận nhớ lâu                                               |
| Nháp viết ngoài phiên mất khi đổi trang; chữ header chồng trên điện thoại                                                | Lưu nháp IndexedDB, sao lưu đọc bản bền mới nhất, tách CSS header và kiểm tra va chạm ở 320/390 px                      |
| Thiết bị khác vừa xem nghĩa nhưng cloud vẫn nhận khoảng nghỉ 8 ngày                                                      | Hợp nhất sự kiện tiếp xúc và tính lại bằng chứng dẫn xuất; không sửa kết quả lịch sử gốc                                |

## Chọn từ và tổ chức phiên

Bốn chế độ cũ được giữ: Thông minh, Ưu tiên thông dụng, Củng cố từ yếu và Trộn từ. Tần suất vẫn là tín hiệu quan trọng; CEFR hỗ trợ, không tự suy trình độ từ nhãn bị thiếu. Đa dạng dùng một cửa sổ ứng viên và phạt hình thức/từ loại/chủ đề lặp gần nhau; đây là heuristic hình thức, không tự nhận hiểu mọi quan hệ nghĩa.

Chế độ thông dụng đặt ứng viên vừa luyện đúng vào nhóm tạm nhường lượt trong 24 giờ, sau ứng viên cần học khác. Tự đánh giá đúng hoặc câu viết chưa chấm cũng có thể nhường lượt để tránh lặp thao tác, nhưng không được tính là đã nhớ vững. Từ yếu, có gợi ý hoặc đến hạn vẫn được ưu tiên phù hợp. Nếu cả kho đều vừa luyện, hệ thống vẫn tạo được bài thay vì để trống. Thứ tự trộn ổn định theo ngày và dữ liệu, không ngẫu nhiên mỗi lần tải lại.

Cài đặt mới cho phép chọn mức ưu tiên từ mới và nhóm kỹ năng. Mức này chỉ lọc từ chưa giới thiệu; kỹ năng chọn áp dụng cho lượt giới thiệu/kỹ năng còn chưa học của phiên mới. Mục không có CEFR vẫn hợp lệ, không bị đoán là quá dễ. Lịch đã đến hạn đi qua bộ lọc riêng và giữ nguyên, kể cả dưới mức ưu tiên hoặc ngoài nhóm kỹ năng đang chọn. Đây là lựa chọn cá nhân, không phải bài kiểm tra đầu vào.

Khi tạo queue mới, từng từ luân phiên kỹ năng đầu tiên giữa nhớ để viết, nghe chính tả và ngữ cảnh theo phiên đã học trước đó. Các task, review ID và ngữ cảnh đóng băng được giữ; chỉ sắp lại cơ hội kiểm tra đầu tiên. Sau đó queue vẫn xen kẽ theo từ và ưu tiên phần đến hạn trước giới thiệu mới. Phiên đang học, phiên phục hồi và retry không bị sắp lại. Không nới điều kiện độc lập để tạo thêm “bằng chứng”.

## Tiến độ và đề xuất dựa trên bằng chứng

`src/evidence.ts` cung cấp một cách chọn bằng chứng chung cho phân tích, đề xuất, chi tiết từ và bảng tiến độ cũ:

- Giữ nguyên lịch sử, chỉ chọn bản ghi thuộc mục đang hoạt động, đúng phiên bản nội dung của kỹ năng, có thời gian hợp lệ đến hiện tại.
- Loại bản ghi trùng ID, review và cùng phiên/từ/kỹ năng khỏi lần kiểm tra đầu tiên; tự đánh giá và viết chưa chấm không trở thành kiểm tra khách quan.
- Dùng lượt đầu có kết quả theo quy tắc để xét yếu; nghe cần có playback thành công. Lượt sai hoặc có gợi ý vẫn cho biết cần củng cố.
- Tỷ lệ đúng không hỗ trợ chỉ dùng lượt không gợi ý. Vì vậy bảng có thể ghi 4/4 lần không hỗ trợ trong lịch sử nhưng vẫn báo yếu nếu lần gần nhất cần gợi ý; giao diện giải thích số lượt có hỗ trợ.
- Chỉ tính nhớ sau ≥24 giờ khi có khoảng nghỉ đã biết, không gợi ý, độc lập và đủ phiên bản bằng chứng. Thiếu `exposureGap` là chưa biết, không tự suy ra đã qua một ngày.
- Tiêu chí nhớ vững vẫn cần bằng chứng đúng sau khoảng nghỉ trên ít nhất ba ngày khác nhau, có khoảng nghỉ từ bảy ngày và không còn dấu hiệu yếu; lịch ôn lên bậc không tự tạo chứng nhận này.

Thống kê theo khoảng thời gian vẫn giữ nhật ký cũ để xem lại, nhưng không dùng kết quả nghĩa trước làm bằng chứng cho nghĩa hiện tại. Nút luyện từ yếu truyền kỹ năng được phát hiện; không lấy nhầm kỹ năng người dùng chọn ở bài trước. Không quy đổi số từ hoặc tỷ lệ đúng thành band IELTS.

## Lịch ôn, lưu trữ và hợp nhất dữ liệu

Chu kỳ 1–3–7–14–30 ngày được giữ. Lịch mới có `contentVersion` theo kỹ năng. Với lịch legacy chưa có trường này, hệ thống đối chiếu snapshot từ đi kèm và phiên bản kết quả tại thời điểm tạo lịch khi có bằng chứng; không đóng dấu nghĩa hiện tại lên lịch cũ để hợp thức hóa. Lịch tương thích được giữ nguyên, lịch đã biết thuộc nghĩa khác không được áp vào nghĩa mới. Lịch sử cả hai phía vẫn còn.

`exposureEvents` là lớp bổ sung tùy chọn cho map tiếp xúc legacy. Mỗi sự kiện có ID, ID từ, thời gian và liên kết kết quả nếu chính câu trả lời làm lộ từ. Trước khi merge lấy timestamp lớn nhất, các điểm legacy được chuyển thành sự kiện xác định để tránh làm mất quan sát từ thiết bị còn lại. ID bất biến trùng nhưng nội dung khác bị báo xung đột, không ghi đè im lặng.

Bằng chứng dẫn xuất đối chiếu toàn bộ dòng thời gian tiếp xúc đã hợp nhất. Ví dụ, nếu điện thoại đã mở nghĩa 30 giây trước câu trả lời trên laptop, bản trả lời gốc vẫn giữ nhưng không còn dùng để chứng minh nhớ sau tám ngày. Hợp nhất chỉ có thể rút ngắn khoảng nghỉ đã lưu hoặc loại chứng nhận độc lập không còn đúng; không biến một khoảng nghỉ chưa biết thành bằng chứng nhớ lâu.

Nháp viết lưu theo ID từ và luồng câu gốc/sửa lại, kèm phiên bản nghĩa. Khi lưu câu thành công, chỉ đúng bản nháp đã gửi được xóa bằng dấu mốc rỗng có thời gian; bản sửa mới hơn ở tab khác được giữ. Rebase hợp nhất các khóa nháp khác nhau; sửa cạnh tranh cùng khóa cần giải quyết xung đột. Sao lưu đợi các editor đẩy nháp, đợi ghi rồi đọc IndexedDB mới nhất thay vì xuất snapshot React cũ. Nháp trong phiên học vẫn dùng cơ chế session đã có.

Các trường mới đều tùy chọn, có kiểm tra schema và được đưa qua JSON backup. Không đổi phiên bản kho IndexedDB hay yêu cầu xóa dữ liệu để nâng cấp. Local-first vẫn hoạt động không có tài khoản. Mã đồng bộ cloud kế thừa các kiểm tra lịch/sự kiện/nháp; chưa có dự án Supabase thật để xác nhận auth, RLS hoặc luồng hai thiết bị thực tế.

## Hội thoại, chấm câu và phát âm

Hội thoại vẫn là 12 nội dung biên soạn sẵn, không giả làm AI tạo linh hoạt. Người học có thể xem/nghe rồi ẩn transcript, bản dịch và giải thích trước khi trả lời. Mở lại được ghi là có gợi ý; ẩn lại không xóa dấu đã xem. Lượt làm lại cũng có hỗ trợ. Câu trả lời mở vẫn lưu chưa chấm. Ngay cả trả lời đúng khi đang ẩn chỉ chứng minh bài luyện ngay lúc đó, không tự cập nhật SRS hoặc chứng nhận thành thạo. Có nhãn vùng cho đoạn chứa cách dùng Anh–Anh; giọng đọc Mỹ không tự sửa từ vựng trong đoạn.

Bài điền từ sử dụng danh sách đáp án trung lập riêng của ngữ cảnh đã rà. Danh sách đi cùng snapshot đề, không trở thành `accepted_answers` cho toàn bộ nghĩa hay toàn kho. Recommend/advise hợp lệ ở câu suggest và suggest hợp lệ ở câu recommend được giữ trung lập: không đánh sai, không ghi nhớ vững và không reset lịch. Phần gợi ý nêu rõ nghĩa/từ loại mục tiêu. Đây chưa phải bộ chấm mọi đáp án tiếng Anh có thể đúng.

Kiểm tra viết tiếp tục chạy miễn phí trên thiết bị với các mẫu cấu trúc hẹp. Quy tắc discuss tránh trường hợp about là trạng từ số lượng xấp xỉ, gồm about as many/as much. Không có lỗi được phát hiện không có nghĩa câu đúng; nghĩa, ngữ cảnh và độ tự nhiên tổng quát vẫn ghi **Chưa thể chấm tự động**. Giữ câu gốc, gợi ý, giải thích và các lần viết lại; không tích hợp AI trả phí.

Phát âm ưu tiên audio HTTPS đã cấu hình. Nếu không có audio riêng, với đầu mục có nhiều từ loại đang hoạt động và ví dụ song ngữ biên soạn phù hợp, hệ thống đọc chính câu ví dụ đó thay vì chuỗi từ rời. Nút ghi **Nghe từ trong câu**, nhắc TTS vẫn có thể nhấn sai trọng âm. Đây là biện pháp cung cấp ngữ cảnh, không phải âm thanh từ điển được xác minh hoặc IPA mới.

## Hai nghĩa nền tảng bổ sung và nguồn

Thêm `like-verb-enjoy-01` — động từ A1 “thích”, và `lie-horizontal-01` — động từ A1 “nằm”. Không thay các mục like giới từ hoặc lie “nói dối”. Các trang Oxford American đã đọc trực tiếp:

- [like, verb](https://www.oxfordlearnersdictionaries.com/definition/american_english/like_3)
- [lie, horizontal position](https://www.oxfordlearnersdictionaries.com/definition/american_english/lie_1)

CEFR đối chiếu đúng dòng/từ loại/nghĩa trong dữ kiện American Oxford 3000; IPA Mỹ lấy literal từ nguồn. Bản dịch, giải nghĩa Anh và ví dụ song ngữ được ghi là Jeongyeon biên soạn, không nhận là Oxford chứng nhận. Mục lie ghi rõ lay/lain/lying, phân biệt nghĩa nói dối. Manifest chỉ lưu metadata receipt/HTTP/ngày/hash, không phát hành hàng loạt định nghĩa của nhà xuất bản.

Kho mới: **5.560 mục ready**, **346 IPA**, **8.878.717 byte**. Toàn bộ **8.875.929 byte** của kho 5.558 mục cũ là tiền tố không đổi. SHA256 canonical: `10392288d69ba11cc6e5fc74e02e0cc3654bea50cda229254236848d2d3a87f4`.

Lớp essential-senses nối sau các overlay đã có; preview/replay content-review, source-update và full-review giữ cùng kết quả. Bản rà lịch sử 5.558 mục được giữ với phạm vi gốc; các kiểm tra chỉ cho phép phần đuôi hai mục đã khai báo, không bỏ bảo vệ prefix hoặc cho phép thay tùy ý. Thiết bị có dữ liệu cũ dùng xem trước cập nhật kho mặc định, không tự xóa bản chỉnh sửa cá nhân.

## Nhóm file chính

| Nhóm                  | File và mục đích                                                                                                                                                          |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Bằng chứng/đánh giá   | `src/evidence.ts`, `analytics.ts`, `LearningInsights.tsx`, `core.ts`, `main.tsx`, `DictionaryEntry.tsx`: bộ lọc thống nhất và giải thích                                  |
| Lịch và hợp nhất      | `src/schedule-state.ts`, `exposure-events.ts`, `storage.ts`, `sync.ts`: lịch theo nghĩa, tiếp xúc bất biến, tương thích legacy                                            |
| Chọn từ/phiên         | `src/recommendations.ts`, `session-planning.ts`, `learning-preferences.ts`, `main.tsx`: giãn từ, luân phiên và tùy chọn                                                   |
| Chấm ngữ cảnh/viết    | `data/usage/group-a.json`, `src/usage.ts`, `assessment.ts`, `writing.ts`: đáp án trung lập riêng ngữ cảnh và quy tắc hẹp                                                  |
| Nháp/hội thoại/mobile | `src/writing-drafts.ts`, `WritingFeedback.tsx`, `ConversationPractice.tsx`, `conversations.ts`, các CSS liên quan: lưu bền, pha ẩn, tránh chồng chữ                       |
| Phát âm               | `src/pronunciation.ts`, `DictionaryEntry.tsx`, `main.tsx`: TTS có ngữ cảnh khi khác từ loại                                                                               |
| Dữ liệu nguồn         | `data/authoring/essential-senses-2026-10-22.json`, `scripts/apply-essential-senses.py`, pipeline cũ, `public/data/*`: hai nghĩa và provenance/manifest tương ứng          |
| Hồi quy               | Các unit test tương ứng và `e2e/audit-safety-fixes.spec.ts`, `e2e/audit-ui-fixes.spec.ts`, `e2e/pronunciation-context.spec.ts`; cập nhật assertion nguồn theo số mục thực |

## Kiểm thử thực tế

Kết quả trên mã đã tích hợp:

- TypeScript: **đạt** (`npx tsc --noEmit` và bước TypeScript trong build).
- Unit tests: **333 đạt**.
- Kiểm thử dữ liệu/pipeline: **37 đạt**.
- E2E Chromium toàn bộ: **100 đạt** (17 file, khoảng 1,8 phút, hai worker).
- Production build, đường dẫn gốc/con và reload offline: **đạt** (`npm run test:production`).
- Phát hành: `.github/workflows/pages.yml` chạy lại unit, dữ liệu, E2E và production trước khi xuất bản. Xem [lần chạy theo commit](https://github.com/saolaisaanh123-web/WebHocTuVungTiengAnh/actions/workflows/pages.yml) và [website công khai](https://saolaisaanh123-web.github.io/WebHocTuVungTiengAnh/). Đối chiếu bản mới bằng SHA256 TXT ở trên và bundle của bản build.

CI ghi lỗi trình duyệt vào GitHub Checks để vẫn đọc được tên bài và chi tiết khi không tải được file log. Workflow ưu tiên Chrome/Chromium đã có trên runner, in phiên bản và truyền cùng đường dẫn cho E2E/production; chỉ tải headless shell khi không có trình duyệt. Các assertion và bước chặn phát hành vẫn giữ nguyên.

Trên runner CI, ba bài nạp kho thật dừng ở giới hạn khởi tạo 5 giây, còn 97 bài đạt. Ba bài này dùng thời gian chờ trang sẵn sàng tối đa 30 giây và ngân sách bài 90 giây cho nạp/ghi kho lạnh; các assertion nội dung, số mục và bảo toàn dữ liệu giữ nguyên. Đây không phải phép đo tốc độ trên điện thoại người dùng.

Bộ giả lập của kiểm thử đọc ngữ pháp trả manifest khớp đúng TXT hai mục, thay vì trộn hash kho thật với TXT giả lập gây ghi nguồn nền. Hai từ trong phiên đã lưu đều được ghi là đang học để tách khỏi việc xem từ mới ở trang chủ. Kiểm thử yêu cầu toàn bộ State, kể cả hai dạng lịch sử tiếp xúc, không đổi khi vào và đọc ngữ pháp; không bỏ các trường mới khỏi phép so sánh.

Kiểm thử phát âm trong trình duyệt kiểm tra record danh từ/động từ đọc đúng câu của từng nghĩa bằng giọng Mỹ, không lộ chữ trước khi mở đáp án; audio cá nhân vẫn được phát riêng. Âm thanh được giả lập để xác minh đường đi/phát xong, không dùng kiểm thử đó làm bằng chứng chất lượng TTS thực tế.

Hai nguồn Oxford của nghĩa bổ sung được kiểm tra truy cập lại, đều trả HTTP 200. Bản kiểm thử retention cũ được tách thành hai tình huống: có đủ khoảng nghỉ 30 ngày và vừa tiếp xúc nghĩa cũ hôm trước; tình huống thứ hai chỉ được tính khoảng nghỉ một ngày. Giữ nguyên các kết quả gốc trong cả hai.

Các hồi quy mới bao phủ backup nghĩa cũ, ghi từ tab cũ, đáp án trung lập theo snapshot, lượt sai có gợi ý, khoảng nghỉ chưa biết, nút luyện kỹ năng yếu, tùy chọn không sửa queue/lịch, nháp qua điều hướng/reload và JSON tải thật, header mobile, pha hội thoại ẩn và dấu đã dùng gợi ý. Kiểm tra pipeline bao gồm giữ prefix lịch sử, replay idempotent và từ chối phần đuôi ngoài khai báo.

## Giới hạn còn lại và việc tiếp theo

- **48 mục** có cách dùng chi tiết/ngữ cảnh thứ hai; phần còn lại chưa có đa ngữ cảnh đã biên tập. Cần mở rộng theo từ đang học/từ yếu, không tự sinh hàng nghìn câu rồi nhận là đã xác minh.
- **12 hội thoại/48 ID mục tiêu** chưa phủ mọi nhóm từ cá nhân; pha ẩn cải thiện cách luyện nhưng không thay thế hội thoại thật hoặc đánh giá giao tiếp.
- **346 IPA** và **0 audio nguồn mặc định**: phần lớn nghe vẫn dựa TTS và giọng cài trên máy. Chưa đánh giá chất lượng trên thiết bị người dùng, Safari hoặc iPhone vật lý.
- Thêm hai nghĩa chứng minh đã sửa hai lỗ hổng cụ thể; chưa chứng nhận toàn bộ mọi nghĩa nền tảng của mọi đầu từ hoặc mọi đáp án đồng nghĩa trong bài luyện.
- Chưa chấm ngữ pháp/ngữ nghĩa/độ tự nhiên tổng quát; không có dịch vụ trả phí. Phản hồi ngoài mẫu hỗ trợ phải để người học đối chiếu thêm.
- Chưa có Supabase thật. Cloud vẫn gửi snapshot có toàn kho và giới hạn dữ liệu thô **20 MiB**; đợt này sửa tính đúng của hợp nhất, chưa chuyển sang đồng bộ delta. Khi lịch sử tăng cần tách dữ liệu mặc định và thay đổi cá nhân/sự kiện, không tự xóa lịch sử để giảm dung lượng.
- Cambridge Dictionary vẫn bị chặn ở các đợt trước; không đổi nhãn sang “đã xác minh Cambridge”. Ngữ pháp tiếp tục dùng British Council theo lựa chọn của người dùng.
