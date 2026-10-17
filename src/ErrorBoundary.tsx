import { Component, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { hasError: boolean };

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          background: "#f7f9f7",
          color: "#283c35",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <section
          role="alert"
          aria-labelledby="recovery-title"
          style={{ maxWidth: 520, lineHeight: 1.7 }}
        >
          <h1 id="recovery-title" style={{ fontSize: 28, lineHeight: 1.3 }}>
            Jeongyeon chưa thể mở
          </h1>
          <p>Ứng dụng gặp lỗi khi hiển thị. Bạn hãy thử tải lại trang.</p>
          <p>
            Dữ liệu học đã lưu trên thiết bị vẫn được giữ nguyên. Nút tải lại
            không xóa kho từ hoặc tiến độ của bạn.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            style={{
              padding: "12px 20px",
              border: 0,
              borderRadius: 10,
              background: "#27644c",
              color: "white",
              font: "inherit",
              cursor: "pointer",
            }}
          >
            Tải lại trang
          </button>
          <p style={{ marginTop: 24 }}>
            Khi mở lại được ứng dụng, vào Cài đặt &amp; sao lưu để tải bản sao
            JSON. Nếu lỗi vẫn còn, hãy giữ nguyên dữ liệu trang web và gửi lại
            địa chỉ trang cùng ảnh thông báo này để được hỗ trợ.
          </p>
        </section>
      </main>
    );
  }
}
