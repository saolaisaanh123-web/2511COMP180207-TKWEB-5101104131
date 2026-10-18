import { useEffect, useRef, useState } from "react";
import type { State } from "./core";
import {
  bindSyncAccount,
  cloudPayload,
  compareAndSwapCloud,
  completeAuthRedirect,
  fetchCloud,
  getAuthSession,
  getServiceConfig,
  getSyncEpoch,
  isOnline,
  loadSyncCheckpoint,
  mergeCloudState,
  requestEmailCode,
  saveSyncBase,
  setServiceConfig,
  signOut,
  startGoogleLogin,
  subscribeAuth,
  syncAccount,
  verifyEmailCode,
  type SyncConflict,
} from "./sync";
import "./sync-settings.css";

type Props = {
  state: State;
  onMerge: (state: State, expectedBase?: State) => Promise<void>;
};
type Status = "local" | "dirty" | "syncing" | "synced" | "error" | "conflict";
const fingerprint = (state: State) => JSON.stringify(cloudPayload(state));
const message = (error: unknown) =>
  error instanceof Error ? error.message : String(error);
const display = (value: unknown) =>
  typeof value === "string" ? value : JSON.stringify(value);
function download(value: unknown, name: string) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Keep mounted while navigating: learning stays local, sync follows successful local saves. */
export default function SyncSettings({ state, onMerge }: Props) {
  const [, authChanged] = useState(0);
  const [status, setStatus] = useState<Status>("local");
  const [notice, setNotice] = useState("");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [busyAuth, setBusyAuth] = useState(false);
  const [url, setUrl] = useState(getServiceConfig()?.url || "");
  const [key, setKey] = useState("");
  const [lastSuccess, setLastSuccess] = useState<number>();
  const [conflicts, setConflicts] = useState<SyncConflict[]>([]);
  const [choices, setChoices] = useState<Record<string, "local" | "remote">>(
    {},
  );
  const [backedUp, setBackedUp] = useState(false);
  const current = useRef(state);
  const mergeCallback = useRef(onMerge);
  const inFlight = useRef(false);
  const mounted = useRef(true);
  const lastFingerprint = useRef("");
  const lastIdentity = useRef(
    `${getAuthSession()?.user.id || ""}|${syncAccount() || ""}|${getServiceConfig()?.url || ""}`,
  );
  const retries = useRef(0);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );
  const conflictSnapshot = useRef<
    { local: State; remote: State; conflicts: SyncConflict[] } | undefined
  >(undefined);
  const runRef = useRef<
    (
      explicit?: boolean,
      resolutions?: Record<string, "local" | "remote">,
    ) => Promise<void>
  >(async () => {});
  current.current = state;
  mergeCallback.current = onMerge;
  const config = getServiceConfig();
  const auth = getAuthSession();
  const bound = !!auth && syncAccount() === auth.user.id;

  useEffect(() => {
    mounted.current = true;
    const unsubscribe = subscribeAuth(() => {
      const identity = `${getAuthSession()?.user.id || ""}|${syncAccount() || ""}|${getServiceConfig()?.url || ""}`;
      if (identity !== lastIdentity.current) {
        lastIdentity.current = identity;
        lastFingerprint.current = "";
        conflictSnapshot.current = undefined;
        setConflicts([]);
        setChoices({});
        setBackedUp(false);
        setStatus("local");
      }
      authChanged((n) => n + 1);
    });
    completeAuthRedirect().catch((error) => setNotice(message(error)));
    return () => {
      mounted.current = false;
      unsubscribe();
      clearTimeout(retryTimer.current);
    };
  }, []);

  runRef.current = async (explicit = false, resolutions = {}) => {
    const account = getAuthSession()?.user.id;
    if (!account || !getServiceConfig() || inFlight.current) return;
    if (!explicit && syncAccount() !== account) return;
    if (!explicit && conflictSnapshot.current) return;
    const startedEpoch = getSyncEpoch();
    const ensureAccount = () => {
      if (
        !mounted.current ||
        getAuthSession()?.user.id !== account ||
        getSyncEpoch() !== startedEpoch
      )
        throw Error(
          "Tài khoản đã thay đổi; không áp dụng dữ liệu từ phiên cũ.",
        );
    };
    inFlight.current = true;
    setStatus("syncing");
    setNotice("");
    clearTimeout(retryTimer.current);
    try {
      if (!isOnline())
        throw Error(
          "Đang ngoại tuyến. Tiến độ đã lưu tại máy; sẽ thử lại khi có mạng.",
        );
      const checkpoint = await loadSyncCheckpoint(account);
      const base = checkpoint?.payload;
      const knownRevision = checkpoint?.revision;
      ensureAccount();
      // A concurrent device may win CAS. Refetch and merge up to three times, never overwrite.
      for (let attempt = 0; attempt < 3; attempt++) {
        const remote = await fetchCloud(
          base && knownRevision
            ? { payload: base, revision: knownRevision }
            : undefined,
        );
        ensureAccount();
        const local = current.current;
        let result = remote
          ? mergeCloudState(base, local, remote.payload, resolutions)
          : { state: local, conflicts: [] };
        // Choices are valid only for the exact competing values that were shown to the user.
        if (
          Object.keys(resolutions).length &&
          remote &&
          conflictSnapshot.current
        ) {
          const fresh = mergeCloudState(base, local, remote.payload);
          for (const conflict of fresh.conflicts) {
            const previous = conflictSnapshot.current.conflicts.find(
              (item) => item.path === conflict.path,
            );
            if (
              resolutions[conflict.path] &&
              (!previous ||
                JSON.stringify(previous) !== JSON.stringify(conflict))
            ) {
              result = fresh;
              break;
            }
          }
        }
        if (result.conflicts.length) {
          conflictSnapshot.current = {
            local,
            remote: remote!.payload,
            conflicts: result.conflicts,
          };
          setConflicts(result.conflicts);
          setChoices({});
          setBackedUp(false);
          setStatus("conflict");
          setNotice(
            "Có thay đổi khác nhau trên hai thiết bị. Chưa tải lên hoặc thay thế dữ liệu cục bộ.",
          );
          return;
        }
        // Check the local reference again after networking; subsequent writes are handled by the parent's transactional merge.
        if (current.current !== local) {
          const rebased = mergeCloudState(local, current.current, result.state);
          if (rebased.conflicts.length) continue;
          result = rebased;
        }
        const unchanged =
          remote && fingerprint(remote.payload) === fingerprint(result.state);
        const revision = unchanged
          ? remote.revision
          : await compareAndSwapCloud(remote?.revision || 0, result.state);
        ensureAccount();
        if (!revision) continue;
        // Do not replace edits made while uploading. Merge them with the successfully uploaded snapshot.
        const latest = mergeCloudState(local, current.current, result.state);
        if (latest.conflicts.length) {
          setStatus("dirty");
          setNotice(
            "Dữ liệu trên máy vừa thay đổi. Đã giữ nguyên trên máy; hãy đồng bộ lại để hợp nhất.",
          );
          return;
        }
        if (fingerprint(current.current) !== fingerprint(latest.state))
          await mergeCallback.current(latest.state, current.current);
        ensureAccount();
        await saveSyncBase(account, result.state, revision);
        ensureAccount();
        bindSyncAccount(account);
        lastFingerprint.current = fingerprint(result.state);
        conflictSnapshot.current = undefined;
        retries.current = 0;
        setConflicts([]);
        setChoices({});
        setBackedUp(false);
        setLastSuccess(Date.now());
        const dirty = fingerprint(latest.state) !== lastFingerprint.current;
        setStatus(dirty ? "dirty" : "synced");
        setNotice(
          dirty
            ? "Đã hợp nhất; thay đổi mới hơn đang chờ lượt đồng bộ tiếp theo."
            : "Đã hợp nhất an toàn. Phiên học đang mở vẫn thuộc thiết bị này.",
        );
        if (dirty)
          retryTimer.current = setTimeout(() => void runRef.current(), 15_000);
        return;
      }
      throw Error(
        "Thiết bị khác đang cập nhật cùng lúc. Dữ liệu trên máy vẫn an toàn; thử lại sau.",
      );
    } catch (error) {
      if (mounted.current && getAuthSession()?.user.id === account) {
        setStatus("error");
        setNotice(message(error));
        if (syncAccount() === account && isOnline() && retries.current < 3) {
          const delay = [3000, 10_000, 30_000][retries.current++];
          retryTimer.current = setTimeout(() => void runRef.current(), delay);
        }
      }
    } finally {
      inFlight.current = false;
    }
  };

  useEffect(() => {
    if (!bound) return;
    const timer = setTimeout(() => {
      if (fingerprint(current.current) === lastFingerprint.current) return;
      setStatus("dirty");
      void runRef.current();
    }, 15_000);
    return () => clearTimeout(timer);
  }, [state, bound]);
  useEffect(() => {
    const resume = () => {
      if (document.visibilityState === "hidden") return;
      retries.current = 0;
      void runRef.current();
    };
    window.addEventListener("online", resume);
    document.addEventListener("visibilitychange", resume);
    // Pull remote changes while idle without continuously retrying failures or offline requests.
    const timer = setInterval(() => {
      if (
        isOnline() &&
        document.visibilityState === "visible" &&
        retries.current === 0
      )
        void runRef.current();
    }, 60_000);
    return () => {
      window.removeEventListener("online", resume);
      document.removeEventListener("visibilitychange", resume);
      clearInterval(timer);
    };
  }, []);
  const authAction = async (action: () => Promise<unknown>) => {
    setBusyAuth(true);
    setNotice("");
    try {
      await action();
    } catch (error) {
      setNotice(message(error));
    } finally {
      setBusyAuth(false);
    }
  };
  const labels: Record<Status, string> = {
    local: "Lưu trên thiết bị",
    dirty: "Có thay đổi chưa đồng bộ",
    syncing: "Đang hợp nhất dữ liệu…",
    synced: "Đã đồng bộ",
    error: "Chưa đồng bộ được",
    conflict: "Cần xử lý xung đột",
  };
  return (
    <section className="panel sync-settings" aria-labelledby="sync-heading">
      <h3 id="sync-heading">Đồng bộ giữa các thiết bị</h3>
      <p>
        Học và lưu trên máy luôn hoạt động khi không đăng nhập. Đám mây là bản
        hợp nhất bổ sung; đăng xuất giữ nguyên dữ liệu trên máy.
      </p>
      <p className={`sync-status sync-${status}`} role="status">
        {labels[status]}
        {lastSuccess
          ? ` · ${new Date(lastSuccess).toLocaleString("vi-VN")}`
          : ""}
      </p>
      {notice && (
        <p className="sync-notice" role="alert">
          {notice}
        </p>
      )}
      {!config && (
        <p>
          Chưa cấu hình dịch vụ. Cần một project <strong>Supabase Free</strong>{" "}
          và áp dụng schema được cung cấp. Không cần dịch vụ AI hoặc đăng ký trả
          phí.
        </p>
      )}
      <details>
        <summary>Cấu hình Supabase công khai trên thiết bị này</summary>
        <p className="fineprint">
          Cùng một URL và publishable key trên laptop, điện thoại. Không nhập
          secret key. Cấu hình build có ưu tiên cao hơn cấu hình tại máy.
        </p>
        <label>
          URL project
          <input
            inputMode="url"
            autoComplete="url"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://project.supabase.co"
          />
        </label>
        <label>
          Publishable key / anon key
          <input
            value={key}
            onChange={(event) => setKey(event.target.value)}
            autoComplete="off"
            placeholder="sb_publishable_…"
          />
        </label>
        <button
          type="button"
          disabled={!url || !key || status === "syncing"}
          onClick={() => {
            try {
              setServiceConfig({ url, anonKey: key });
              setKey("");
              setNotice("Đã lưu cấu hình công khai trên thiết bị này.");
              authChanged((n) => n + 1);
            } catch (error) {
              setNotice(message(error));
            }
          }}
        >
          Lưu cấu hình
        </button>
      </details>
      {config && !auth && (
        <div className="sync-login">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
          <button
            type="button"
            disabled={busyAuth || !email}
            onClick={() =>
              void authAction(async () => {
                await requestEmailCode(email);
                setCodeSent(true);
                setNotice(
                  "Đã yêu cầu mã email. Nếu không nhận được, kiểm tra thư rác và cấu hình email của project.",
                );
              })
            }
          >
            Gửi mã đăng nhập
          </button>
          {codeSent && (
            <>
              <label>
                Mã trong email
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(event) => setCode(event.target.value)}
                />
              </label>
              <button
                type="button"
                disabled={busyAuth || !code}
                onClick={() =>
                  void authAction(() => verifyEmailCode(email, code))
                }
              >
                Xác nhận mã
              </button>
            </>
          )}
          <button
            type="button"
            disabled={busyAuth}
            onClick={() => void authAction(startGoogleLogin)}
          >
            Đăng nhập Google
          </button>
          <p className="fineprint">
            Google cần được bật trong Supabase. Email dùng mã OTP hoặc liên kết
            xác thực; xem hướng dẫn cấu hình dịch vụ.
          </p>
        </div>
      )}
      {auth && (
        <>
          <p>
            Đăng nhập: <strong>{auth.user.email || auth.user.id}</strong>
          </p>
          {!bound && (
            <p className="sync-notice">
              Dữ liệu trên máy chưa liên kết với tài khoản này
              {syncAccount() ? " (đã từng liên kết với tài khoản khác)" : ""}.
              Chỉ nút bên dưới mới cho phép đọc và hợp nhất lên tài khoản này.
              Hãy sao lưu JSON trước nếu dùng máy chung.
            </p>
          )}
          <div className="sync-actions">
            <button
              className="primary"
              type="button"
              disabled={status === "syncing"}
              onClick={() => {
                retries.current = 0;
                void runRef.current(true);
              }}
            >
              {bound ? "Đồng bộ ngay" : "Liên kết và hợp nhất dữ liệu của tôi"}
            </button>
            <button
              type="button"
              disabled={busyAuth}
              onClick={() => void authAction(signOut)}
            >
              Đăng xuất
            </button>
          </div>
        </>
      )}
      {!!conflicts.length && (
        <div className="sync-conflicts">
          <h4>Giữ dữ liệu trước khi chọn</h4>
          <p>
            Lịch sử luôn được cộng dồn. Các trường bị sửa khác nhau cần bạn
            chọn. Chưa có dữ liệu nào bị thay thế.
          </p>
          <button
            type="button"
            onClick={() => {
              const snapshot = conflictSnapshot.current;
              if (!snapshot) return;
              download(snapshot.local, "Jeongyeon-xung-dot-tren-may.json");
              download(snapshot.remote, "Jeongyeon-xung-dot-dam-may.json");
              setBackedUp(true);
            }}
          >
            Tải hai bản JSON dự phòng
          </button>
          {conflicts.map((conflict) => (
            <article key={conflict.path}>
              <strong>{conflict.path}</strong>
              <p>
                Trên máy: <span>{display(conflict.local)}</span>
              </p>
              <p>
                Đám mây: <span>{display(conflict.remote)}</span>
              </p>
              {conflict.immutable ? (
                <p>
                  Lịch sử cùng ID khác nội dung: không tự động chọn hoặc tạo
                  bằng chứng mới. Giữ hai bản sao và kiểm tra JSON trước khi thử
                  lại.
                </p>
              ) : (
                <label>
                  Giá trị sẽ dùng
                  <select
                    aria-label={`Xử lý ${conflict.path}`}
                    value={choices[conflict.path] || ""}
                    onChange={(event) =>
                      setChoices({
                        ...choices,
                        [conflict.path]: event.target.value as
                          "local" | "remote",
                      })
                    }
                  >
                    <option value="">Chọn sau khi xem hai bản</option>
                    <option value="local">Giữ trên máy</option>
                    <option value="remote">Giữ từ đám mây</option>
                  </select>
                </label>
              )}
            </article>
          ))}
          <button
            type="button"
            disabled={
              !backedUp ||
              conflicts.some((item) => item.immutable || !choices[item.path]) ||
              status === "syncing"
            }
            onClick={() => void runRef.current(true, choices)}
          >
            Áp dụng lựa chọn và hợp nhất
          </button>
        </div>
      )}
      <p className="fineprint">
        Giới hạn dung lượng, tốc độ và chính sách của gói Free có thể tạm dừng
        đồng bộ. Không tự nâng gói; bạn vẫn tiếp tục học và xuất JSON tại máy.
        Phiên học đang diễn ra giữ riêng ở từng thiết bị.
      </p>
    </section>
  );
}
