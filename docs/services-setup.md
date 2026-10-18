# Đồng bộ miễn phí với Supabase

## Trạng thái thực tế

Adapter REST, đăng nhập email/Google, kiểm tra phiên, hợp nhất ba chiều, CAS chống ghi đè, lưu mốc IndexedDB và giao diện trạng thái đã có trong mã. Chưa có project Supabase hoặc thông tin kết nối trong repository. Không tuyên bố đã chạy đồng bộ giữa hai thiết bị thật khi chưa cấu hình. Học, hội thoại biên soạn sẵn, kiểm tra cấu trúc viết tại máy và xuất/nhập JSON không cần Supabase.

Chỉ dùng **Supabase Free**. Không bật gói Pro, tự nâng gói, dịch vụ AI trả phí hoặc yêu cầu thẻ thanh toán. Kiểm tra giới hạn Free hiện hành trong dashboard: project có thể tạm dừng, email có giới hạn gửi, database/bandwidth có hạn. Khi hết hạn mức, website báo lỗi và giữ tiến độ trên máy. Không có cơ chế tự chuyển sang gói mất phí.

## Thiết lập một lần

1. Tạo project Free tại Supabase; giữ mật khẩu database ở nơi riêng. Áp dụng toàn bộ [schema.sql](../supabase/schema.sql) bằng SQL editor. Không đặt mật khẩu hoặc service_role key vào website.
2. Trong Project settings lấy URL dạng `https://PROJECT.supabase.co` và publishable key (hoặc legacy anon key). Đây là thông tin công khai; RLS và JWT xác thực bảo vệ dữ liệu. Website từ chối secret/service_role key.
3. Trong Authentication → URL configuration, đặt Site URL và thêm Redirect URL **đúng cả đường dẫn con và dấu `/` cuối**: `https://saolaisaanh123-web.github.io/2511COMP180207-TKWEB-5101104131/`. Để thử cục bộ, thêm URL tương ứng `http://localhost:5173/`. Không mở wildcard cho mọi domain.
4. Vì đây là website cá nhân, tạo/mời tài khoản email của chính bạn trong Authentication → Users, rồi **tắt cho phép đăng ký tài khoản mới** trong cấu hình Auth. Public key công khai không phải cơ chế hạn chế người đăng ký; việc này giúp tránh người lạ sử dụng hạn mức Free của project. Bật email provider. Để dùng ô nhập mã, template Magic Link phải có `{{ .Token }}`; có thể giữ liên kết xác thực cùng mã. Nếu dùng link, đặt mẫu URL theo tài liệu Supabase để quay lại đúng Site URL. Không dùng email thật cho kiểm thử tự động. Dịch vụ gửi mail mặc định của Supabase có giới hạn và có thể chỉ gửi cho thành viên project; kiểm tra dashboard và chính sách hiện tại trước khi kết luận email lỗi.
5. Google là tùy chọn: bật provider, tạo OAuth client miễn phí, đặt callback của Supabase `https://PROJECT.supabase.co/auth/v1/callback`, nhập client ID và client secret **chỉ ở dashboard Supabase**. Website dùng PKCE; verifier chỉ nằm trong sessionStorage của tab bắt đầu đăng nhập. Nếu chưa bật Google, dùng email.
6. Trên mỗi thiết bị mở Cài đặt → Đồng bộ → Cấu hình, nhập cùng URL/public key. Có thể cấu hình build bằng `VITE_SUPABASE_URL` và `VITE_SUPABASE_ANON_KEY`, nhưng không cần build hoặc push chỉ để nhập cấu hình tại máy.
7. Xuất JSON dự phòng trước. Đăng nhập, kiểm tra đúng email, rồi bấm **Liên kết và hợp nhất dữ liệu của tôi**. Đăng nhập đơn thuần chưa cho phép tải kho trên máy lên tài khoản. Thiết bị khác làm tương tự. Nếu máy từng liên kết tài khoản khác, giao diện cảnh báo và cần bấm lại rõ ràng.

## Hợp nhất và bảo vệ dữ liệu

- IndexedDB `lexi-learning` tiếp tục là nơi học/lưu chính; không xóa khi đăng nhập/đăng xuất. IndexedDB `jeongyeon-sync` chỉ giữ bản mốc hợp nhất của từng cặp **URL project + tài khoản**; đổi project không tái sử dụng mốc dù trùng UUID. Snapshot và revision được đọc/ghi cùng một giao dịch IndexedDB, tránh trộn hai phiên bản khi có nhiều tab. Xóa dữ liệu trình duyệt vẫn có thể xóa dữ liệu chưa tải lên: giữ xuất JSON dự phòng.
- Bản đám mây không chứa phiên đang mở/nháp hoặc hash cập nhật kho mặc định của thiết bị. Mọi ID từ, lịch sử và lịch ôn giữ nguyên.
- Lịch sử học, viết, hội thoại cộng dồn bằng ID; cùng ID khác nội dung bị chặn như lỗi toàn vẹn. Không tự sửa bằng chứng hoặc nhân đôi kết quả. Xung đột sửa nghĩa/ghi chú/cài đặt phải tải hai bản JSON và chọn từng trường trước khi ghi. Nếu dữ liệu cạnh tranh thay đổi tiếp, lựa chọn cũ không tự áp dụng.
- Lịch ôn khác nhau cùng lúc giữ hạn sớm hơn và bước thấp hơn; không kéo dài khoảng ôn khiến từ yếu bị trì hoãn. Tiếp xúc giữ thời điểm mới nhất. Thay đổi một phía so với bản mốc giữ được thao tác đặt lại lịch do sửa nội dung.
- Server dùng một hàng theo `auth.uid()`. Chỉ chủ tài khoản đọc được. Client không có quyền INSERT/UPDATE trực tiếp; RPC CAS gắn `user_id` từ JWT, không nhận ID tài khoản từ client. CAS thất bại trả null, client đọc lại và hợp nhất tối đa ba lần thay vì ghi đè.
- Local save không chờ mạng. Gom thay đổi trong 15 giây, thử lại giới hạn, thử khi online/tab visible, kiểm tra số phiên bản mỗi phút khi đang mở. Khi phiên bản không đổi chỉ tải vài byte metadata; không tải lại kho từ. Bấm “Đồng bộ ngay” không chờ 15 giây. Mất kết nối có thể đóng tab; lần sau đọc trạng thái IndexedDB và mốc để tiếp tục. Tài khoản thay đổi/đăng xuất hủy phản hồi đang bay; token phiên nằm trong trình duyệt như cơ chế đăng nhập thông thường. Dùng thiết bị tin cậy, đăng xuất trên máy dùng chung.
- Snapshot được kiểm tra định dạng trước khi nén gzip bằng CompressionStream chuẩn của trình duyệt, đóng gói base64 trong JSON; đọc được cả snapshot JSON chưa nén của phiên bản cũ. Sau khi nén, kiểm tra lại đúng tài khoản/project/phiên thao tác rồi mới gửi, nên đổi tài khoản hoặc khôi phục dữ liệu giữa lúc nén không tải bản cũ lên phiên mới. Giải nén có giới hạn đầu ra để tránh nén phình quá mức. Không tải lại/ghi lại khi chỉ kiểm tra mà nội dung không đổi. Trình duyệt thiếu nén chỉ dùng JSON với bản nhỏ dưới 512 KiB; bản lớn báo cần cập nhật trình duyệt, không lén tiêu tốn băng thông Free.
- Giới hạn mỗi snapshot 20 MiB để tránh tải vô hạn. Không có lưu trữ audio trong backend. Khi vượt giới hạn, dữ liệu cục bộ không bị xóa; xuất JSON và xem dung lượng trước khi tiếp tục.

## Kiểm tra sau khi tự cấu hình

Đăng nhập hai trình duyệt/thiết bị cùng tài khoản; học các từ khác nhau khi offline rồi nối mạng; kiểm tra hợp nhất đủ lịch sử, lịch ôn không lùi muộn hơn khi có lỗi. Sửa cùng nghĩa trên hai máy để kiểm tra xung đột, tải hai bản dự phòng và chọn. Tài khoản B phải không đọc được hàng của A qua REST ngay cả khi biết UUID. Đăng xuất giữa một yêu cầu đồng bộ để xác nhận phản hồi cũ không áp dụng. Thử mất mạng/hết hạn JWT và giữ phiên học đang mở. Kiểm thử protocol với phản hồi giả không thay thế kiểm tra RLS/Google/email trên project thật.

Không cần API AI trả phí. Phần viết tại máy có giới hạn và phải ghi rõ “Chưa thể chấm tự động” khi không đủ cơ sở; xem báo cáo bàn giao để biết phạm vi các mẫu đã kiểm tra.
