export type OfflineStatus = {
  available: boolean;
  status: "preparing" | "ready" | "unavailable" | "update-waiting";
  message: string;
};
export const offlineStatusEvent = "jeongyeon-offline-status";
let currentStatus: OfflineStatus = {
  available: false,
  status: "preparing",
  message:
    "Đang chuẩn bị tải lại ngoại tuyến; hãy giữ kết nối trong lần mở đầu.",
};
let registered = false;
export const getOfflineStatus = (): OfflineStatus => ({ ...currentStatus });
function publish(status: OfflineStatus) {
  currentStatus = status;
  window.dispatchEvent(
    new CustomEvent(offlineStatusEvent, { detail: getOfflineStatus() }),
  );
}

/** Production only: a relative scope works at both / and a GitHub Pages path. */
export function registerOffline(): void {
  if (!import.meta.env.PROD || registered) return;
  registered = true;
  if (!("serviceWorker" in navigator) || !window.isSecureContext) {
    publish({
      available: false,
      status: "unavailable",
      message:
        "Trình duyệt chưa hỗ trợ tải lại ngoại tuyến. Dữ liệu học vẫn lưu tại máy.",
    });
    return;
  }
  const base = new URL(import.meta.env.BASE_URL, document.baseURI);
  const script = new URL("sw.js", base);
  navigator.serviceWorker.addEventListener("message", (event) => {
    const source = event.source as ServiceWorker | null;
    if (
      source?.scriptURL !== script.href ||
      event.data?.type !== offlineStatusEvent ||
      typeof event.data.available !== "boolean"
    )
      return;
    const available = event.data.available;
    publish({
      available,
      status:
        currentStatus.status === "update-waiting"
          ? "update-waiting"
          : available
            ? "ready"
            : "unavailable",
      message:
        currentStatus.status === "update-waiting"
          ? "Có bản ngoại tuyến mới đang chờ. Đóng các tab Jeongyeon rồi mở lại khi thuận tiện."
          : available
            ? "Đã lưu ứng dụng và kho từ để tải lại ngoại tuyến. Đồng bộ giữa thiết bị vẫn cần Internet."
            : "Chưa lưu đủ ứng dụng và kho từ để tải lại ngoại tuyến. Hãy giữ kết nối rồi mở lại trang.",
    });
  });
  const start = async () => {
    try {
      const registration = await navigator.serviceWorker.register(script.href, {
        scope: base.pathname,
        updateViaCache: "none",
      });
      const ask = () =>
        registration.active?.postMessage({ type: offlineStatusEvent });
      const waiting = () => {
        if (registration.waiting)
          publish({
            ...currentStatus,
            status: "update-waiting",
            message:
              "Có bản ngoại tuyến mới đang chờ. Đóng các tab Jeongyeon rồi mở lại khi thuận tiện.",
          });
      };
      navigator.serviceWorker.addEventListener("controllerchange", ask);
      const observe = (worker: ServiceWorker | null) => {
        worker?.addEventListener("statechange", () => {
          if (worker.state === "activated") ask();
          if (worker.state === "installed") waiting();
          if (worker.state === "redundant" && !registration.active)
            publish({
              available: false,
              status: "unavailable",
              message:
                "Chưa lưu được bản ngoại tuyến. Dữ liệu học vẫn an toàn tại máy; hãy thử mở lại khi có mạng.",
            });
        });
      };
      observe(registration.installing);
      registration.addEventListener("updatefound", () =>
        observe(registration.installing),
      );
      ask();
      waiting();
    } catch {
      publish({
        available: false,
        status: "unavailable",
        message:
          "Không chuẩn bị được tải lại ngoại tuyến. Dữ liệu học vẫn lưu tại máy; hãy kiểm tra kết nối hoặc dung lượng trình duyệt.",
      });
    }
  };
  if (document.readyState === "complete") void start();
  else window.addEventListener("load", () => void start(), { once: true });
}
