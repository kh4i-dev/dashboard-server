import { useState } from "react";
import { Mail, Save, Send, CheckCircle2, AlertCircle, Bell } from "lucide-react";

function SmtpForm({ smtp, isAdmin, onSaveSmtp }) {
  const [fromEmail, setFromEmail] = useState(smtp?.fromEmail ?? "");
  const [fromName, setFromName] = useState(smtp?.fromName ?? "");
  const [host, setHost] = useState(smtp?.host ?? "");
  const [security, setSecurity] = useState(smtp?.security ?? "tls");
  const [port, setPort] = useState(smtp?.port ?? 587);
  const [auth, setAuth] = useState(smtp?.auth ?? true);
  const [username, setUsername] = useState(smtp?.username ?? "");
  const [password, setPassword] = useState(smtp?.passwordConfigured ? "••••••••••••••••" : "");
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error'

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaveStatus(null);
    try {
      await onSaveSmtp({
        fromEmail,
        fromName,
        host,
        security,
        port: Number(port),
        auth,
        username,
        password: password === "••••••••••••••••" ? undefined : password,
      });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus("error");
    }
  };

  return (
    <form className="settings-form" onSubmit={handleSave}>
      <h3>Thông số cấu hình SMTP</h3>
      
      <label htmlFor="smtp-from-email">
        Từ (Email gửi)
        <input
          id="smtp-from-email"
          aria-label="From Email Address"
          type="email"
          required
          disabled={!isAdmin}
          value={fromEmail}
          onChange={(e) => setFromEmail(e.target.value)}
          placeholder="vi-du@domain.com"
        />
      </label>

      <label htmlFor="smtp-from-name">
        Từ tên (Tên hiển thị)
        <input
          id="smtp-from-name"
          aria-label="From Email Name"
          type="text"
          required
          disabled={!isAdmin}
          value={fromName}
          onChange={(e) => setFromName(e.target.value)}
          placeholder="Tên hiển thị người gửi"
        />
      </label>

      <label htmlFor="smtp-host">
        Máy chủ SMTP
        <input
          id="smtp-host"
          aria-label="SMTP Server Hostname"
          type="text"
          required
          disabled={!isAdmin}
          value={host}
          onChange={(e) => setHost(e.target.value)}
          placeholder="smtp.domain.com"
        />
      </label>

      <div className="radio-group-container">
        <span className="radio-group-label">Bảo mật SMTP</span>
        <div className="radio-options">
          <label className="checkbox-row" style={{ gap: "6px" }}>
            <input
              type="radio"
              aria-label="SMTP Security: None"
              name="smtp-security"
              disabled={!isAdmin}
              checked={security === "none"}
              onChange={() => {
                setSecurity("none");
                setPort(25);
              }}
            />
            None
          </label>
          <label className="checkbox-row" style={{ gap: "6px" }}>
            <input
              type="radio"
              aria-label="SMTP Security: SSL"
              name="smtp-security"
              disabled={!isAdmin}
              checked={security === "ssl"}
              onChange={() => {
                setSecurity("ssl");
                setPort(465);
              }}
            />
            SSL
          </label>
          <label className="checkbox-row" style={{ gap: "6px" }}>
            <input
              type="radio"
              aria-label="SMTP Security: TLS"
              name="smtp-security"
              disabled={!isAdmin}
              checked={security === "tls"}
              onChange={() => {
                setSecurity("tls");
                setPort(587);
              }}
            />
            TLS
          </label>
        </div>
      </div>

      <label htmlFor="smtp-port">
        Cổng SMTP
        <input
          id="smtp-port"
          aria-label="SMTP Server Port Number"
          type="number"
          required
          disabled={!isAdmin}
          value={port}
          onChange={(e) => setPort(Number(e.target.value))}
        />
      </label>

      <div className="radio-group-container">
        <span className="radio-group-label">Xác thực SMTP</span>
        <div className="radio-options">
          <label className="checkbox-row" style={{ gap: "6px" }}>
            <input
              type="radio"
              aria-label="SMTP Authentication: No"
              name="smtp-auth"
              disabled={!isAdmin}
              checked={auth === false}
              onChange={() => setAuth(false)}
            />
            Không
          </label>
          <label className="checkbox-row" style={{ gap: "6px" }}>
            <input
              type="radio"
              aria-label="SMTP Authentication: Yes"
              name="smtp-auth"
              disabled={!isAdmin}
              checked={auth === true}
              onChange={() => setAuth(true)}
            />
            Có
          </label>
        </div>
      </div>

      {auth && (
        <>
          <label htmlFor="smtp-username">
            Tên người dùng (Tài khoản)
            <input
              id="smtp-username"
              aria-label="SMTP Username"
              type="text"
              required
              disabled={!isAdmin}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="tên đăng nhập tài khoản"
              autoComplete="new-password"
            />
          </label>

          <label htmlFor="smtp-password">
            Mật khẩu
            <input
              id="smtp-password"
              aria-label="SMTP Password"
              type="password"
              required={!smtp?.passwordConfigured}
              disabled={!isAdmin}
              value={password}
              onFocus={() => {
                if (password === "••••••••••••••••") {
                  setPassword("");
                }
              }}
              onBlur={() => {
                if (password === "") {
                  setPassword("••••••••••••••••");
                }
              }}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
            />
          </label>
        </>
      )}

      {isAdmin && (
        <div className="settings-actions" style={{ marginTop: "12px" }}>
          <button type="submit" className="save-btn" aria-label="Save SMTP Configuration">
            <Save size={16} /> Lưu cấu hình
          </button>
          {saveStatus === "success" && (
            <span style={{ color: "#22c55e", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
              <CheckCircle2 size={16} /> Lưu thành công!
            </span>
          )}
          {saveStatus === "error" && (
            <span style={{ color: "#ef4444", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
              <AlertCircle size={16} /> Lỗi lưu cài đặt!
            </span>
          )}
        </div>
      )}
    </form>
  );
}

function SmtpTestForm({ onTestSmtp }) {
  const [testTo, setTestTo] = useState("");
  const [testSubject, setTestSubject] = useState("Thư thử nghiệm từ GrafOps Node");
  const [testStatus, setTestStatus] = useState(null); // 'loading' | 'success' | 'error'
  const [testMessage, setTestMessage] = useState("");

  const handleTest = async (e) => {
    e.preventDefault();
    if (!testTo) {
      setTestStatus("error");
      setTestMessage("Vui lòng nhập địa chỉ email nhận!");
      return;
    }
    setTestStatus("loading");
    setTestMessage("");
    try {
      const res = await onTestSmtp({ to: testTo, subject: testSubject });
      setTestStatus("success");
      setTestMessage(res.message || "Gửi email thử nghiệm thành công!");
    } catch (err) {
      setTestStatus("error");
      setTestMessage(err.message || "Gửi email thử nghiệm thất bại!");
    }
  };

  return (
    <form className="settings-form" onSubmit={handleTest}>
      <h3>Kiểm tra cài đặt SMTP của bạn</h3>
      
      <label htmlFor="smtp-test-to">
        Đến (Địa chỉ nhận)
        <input
          id="smtp-test-to"
          aria-label="Test Recipient Email"
          type="email"
          required
          placeholder="nhap.email.nhan@gmail.com"
          value={testTo}
          onChange={(e) => setTestTo(e.target.value)}
        />
      </label>

      <label htmlFor="smtp-test-subject">
        Chủ đề
        <input
          id="smtp-test-subject"
          aria-label="Test Email Subject"
          type="text"
          required
          value={testSubject}
          onChange={(e) => setTestSubject(e.target.value)}
        />
      </label>

      <div className="settings-actions" style={{ marginTop: "12px" }}>
        <button type="submit" className="test-btn" disabled={testStatus === "loading"} aria-label="Send SMTP Test Email">
          <Send size={16} /> {testStatus === "loading" ? "Đang gửi..." : "Gửi Email Thử"}
        </button>
      </div>

      {testStatus && testStatus !== "loading" && (
        <div className={`smtp-test-alert ${testStatus === "success" ? "success" : "error"}`}>
          {testStatus === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{testMessage}</span>
        </div>
      )}
    </form>
  );
}

function TelegramForm({ telegram, isAdmin, onSave, onTest }) {
  const [telegramEnabled, setTelegramEnabled] = useState(telegram?.enabled ?? false);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState(telegram?.chatId ?? "");
  const [saveStatus, setSaveStatus] = useState(null); // 'success' | 'error'
  const [testStatus, setTestStatus] = useState(null); // 'loading' | 'success' | 'error'
  const [testMessage, setTestMessage] = useState("");

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    setSaveStatus(null);
    try {
      await onSave({ enabled: telegramEnabled, botToken, chatId });
      setSaveStatus("success");
      setTimeout(() => setSaveStatus(null), 3000);
    } catch (err) {
      setSaveStatus("error");
    }
  };

  const handleTest = async () => {
    setTestStatus("loading");
    setTestMessage("");
    try {
      await onTest();
      setTestStatus("success");
      setTestMessage("Gửi tin nhắn thử nghiệm Telegram thành công!");
    } catch (err) {
      setTestStatus("error");
      setTestMessage(err.message || "Gửi tin nhắn thử nghiệm thất bại!");
    }
  };

  return (
    <form className="settings-form" onSubmit={handleSave}>
      <h3>Kênh cảnh báo Telegram</h3>
      <label className="checkbox-row" htmlFor="telegram-enabled">
        <input id="telegram-enabled" aria-label="Kích hoạt kênh thông báo Telegram" disabled={!isAdmin} type="checkbox" checked={telegramEnabled} onChange={(e) => setTelegramEnabled(e.target.checked)} />
        Kích hoạt gửi cảnh báo
      </label>
      <label htmlFor="telegram-token">
        Mã định danh Bot (Token)
        <input id="telegram-token" aria-label="Telegram Bot API Token" disabled={!isAdmin} value={botToken} placeholder={telegram?.botTokenConfigured ? telegram.botToken : "Nhập token bot của bạn"} onChange={(e) => setBotToken(e.target.value)} />
      </label>
      <label htmlFor="telegram-chat">
        ID nhóm/kênh chat (Chat ID)
        <input id="telegram-chat" aria-label="Telegram Chat ID" disabled={!isAdmin} value={chatId} onChange={(e) => setChatId(e.target.value)} />
      </label>
      {isAdmin && (
        <div className="settings-actions" style={{ marginTop: "12px" }}>
          <button type="submit" aria-label="Lưu cấu hình Telegram"><Save size={16} /> Lưu cấu hình</button>
          <button type="button" aria-label="Gửi tin nhắn kiểm tra Telegram" onClick={handleTest} disabled={testStatus === "loading"}><Send size={16} /> {testStatus === "loading" ? "Đang gửi..." : "Gửi tin thử"}</button>
          {saveStatus === "success" && (
            <span style={{ color: "#22c55e", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
              <CheckCircle2 size={16} /> Lưu thành công!
            </span>
          )}
          {saveStatus === "error" && (
            <span style={{ color: "#ef4444", fontSize: "14px", display: "flex", alignItems: "center", gap: "4px" }}>
              <AlertCircle size={16} /> Lỗi lưu cài đặt!
            </span>
          )}
        </div>
      )}

      {testStatus && testStatus !== "loading" && (
        <div className={`smtp-test-alert ${testStatus === "success" ? "success" : "error"}`}>
          {testStatus === "success" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          <span>{testMessage}</span>
        </div>
      )}
    </form>
  );
}

export function SmtpView({ user, smtp, telegram, onSaveSmtp, onTestSmtp, onSaveTelegram, onTestTelegram }) {
  const isAdmin = user.role === "admin";
  return (
    <div className="view-fade-in content-grid">
      <div className="left-column" style={{ gridColumn: "1 / -1" }}>
        <section className="table-panel">
          <div className="section-heading">
            <div>
              <h2>Cấu hình cảnh báo</h2>
              <p>Thiết lập và kiểm tra đường truyền gửi thư SMTP cũng như kênh tin nhắn Telegram khi xảy ra sự cố</p>
            </div>
            <Bell size={20} className="glow-icon-cyan" />
          </div>

          <div className="settings-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "24px", marginTop: "20px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <SmtpForm key={smtp ? "loaded" : "loading"} smtp={smtp} isAdmin={isAdmin} onSaveSmtp={onSaveSmtp} />
              <SmtpTestForm onTestSmtp={onTestSmtp} />
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
              <TelegramForm key={telegram ? "loaded" : "loading"} telegram={telegram} isAdmin={isAdmin} onSave={onSaveTelegram} onTest={onTestTelegram} />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
