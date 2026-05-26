import { useState } from "react";
import {
  AlertTriangle,
  Beaker,
  Bell,
  Clock,
  Cpu,
  Database,
  Globe2,
  HardDrive,
  KeyRound,
  Network,
  RotateCcw,
  Save,
  Search,
  Send,
  ServerCrash,
  Settings,
  ShieldAlert,
  SlidersHorizontal,
  ToggleLeft,
  ToggleRight,
  UserRoundX,
  X
} from "lucide-react";
import { formatTime } from "../utils.js";

const SENSITIVITY_COPY = {
  strict: "Nghiêm ngặt: trừ 5% khỏi ngưỡng CPU/RAM/Ổ đĩa và cảnh báo brute-force từ 3 lần sai mật khẩu.",
  standard: "Tiêu chuẩn: dùng đúng các ngưỡng đã cấu hình và cảnh báo brute-force từ 5 lần sai mật khẩu.",
  relaxed: "Nới lỏng: cộng 5% vào ngưỡng CPU/RAM/Ổ đĩa và cảnh báo brute-force từ 8 lần sai mật khẩu."
};

const LAB_SCENARIOS = [
  { key: "cpu_overload", group: "Tài nguyên", title: "CPU quá tải", detail: "CPU vượt ngưỡng khẩn cấp.", icon: Cpu, tone: "danger" },
  { key: "ram_pressure", group: "Tài nguyên", title: "RAM gần cạn", detail: "RAM tăng cao và tạo warning.", icon: AlertTriangle, tone: "warning" },
  { key: "disk_full", group: "Tài nguyên", title: "Ổ đĩa đầy", detail: "Disk vượt ngưỡng critical.", icon: HardDrive, tone: "danger" },
  { key: "iis_down", group: "Dịch vụ", title: "IIS dừng", detail: "W3SVC chuyển sang stopped.", icon: ServerCrash, tone: "danger" },
  { key: "sql_down", group: "Dịch vụ", title: "SQL Server dừng", detail: "MSSQLSERVER chuyển sang stopped.", icon: Database, tone: "danger" },
  { key: "network_timeout", group: "Hạ tầng", title: "Mất heartbeat", detail: "Server offline, RX/TX về 0.", icon: Network, tone: "danger" },
  { key: "firewall_block", group: "Hạ tầng", title: "Firewall chặn cổng", detail: "Web port bị policy chặn.", icon: ShieldAlert, tone: "warning" },
  { key: "failed_login_burst", group: "Bảo mật", title: "Sai mật khẩu liên tiếp", detail: "Nhiều login failed vào admin.", icon: KeyRound, tone: "warning" },
  { key: "unusual_login_ip", group: "Bảo mật", title: "Đăng nhập IP lạ", detail: "Login thành công từ IP khác thường.", icon: UserRoundX, tone: "warning" },
  { key: "botnet_scan", group: "Bảo mật", title: "Botnet quét cổng", detail: "Nhiều IP quét 22/80/443/3389.", icon: Globe2, tone: "danger" }
];

const ALERT_RULE_FIELDS = [
  { key: "cpuHigh", label: "CPU cao" },
  { key: "ramHigh", label: "RAM cao" },
  { key: "diskFull", label: "O dia day" },
  { key: "iisDown", label: "IIS dung" },
  { key: "sqlDown", label: "SQL Server dung" },
  { key: "networkTimeout", label: "Mat heartbeat" },
  { key: "firewallBlock", label: "Firewall chan port" },
  { key: "failedLoginBurst", label: "Sai mat khau lien tiep" },
  { key: "unusualLoginIp", label: "Dang nhap IP la" },
  { key: "botnetScan", label: "Scan port / botnet" }
];

function defaultAlertRules(monitoring) {
  return ALERT_RULE_FIELDS.reduce((rules, field) => {
    rules[field.key] = monitoring?.alertRules?.[field.key] ?? true;
    return rules;
  }, {});
}

function SntpForm({ sntp, isAdmin, onSave, onSync }) {
  const [sntpServer, setSntpServer] = useState(sntp?.server ?? "pool.ntp.org");
  const [intervalHours, setIntervalHours] = useState(sntp?.intervalHours ?? 24);

  return (
    <form
      className="settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ server: sntpServer, intervalHours });
      }}
    >
      <h3>Đồng bộ thời gian SNTP</h3>
      <label htmlFor="sntp-server">
        Máy chủ NTP
        <input id="sntp-server" aria-label="NTP Server Hostname" disabled={!isAdmin} value={sntpServer} onChange={(event) => setSntpServer(event.target.value)} />
      </label>
      <label htmlFor="sntp-interval">
        Khoảng thời gian đồng bộ (Giờ)
        <input id="sntp-interval" aria-label="NTP Sync Interval in Hours" disabled={!isAdmin} type="number" min="1" max="168" value={intervalHours} onChange={(event) => setIntervalHours(event.target.value)} />
      </label>
      <p className="settings-meta">
        Trạng thái: {sntp?.status === "success" ? "Thành công" : "Chưa rõ"} · Độ lệch: {sntp?.offsetMs ?? 0}ms · Đồng bộ cuối: {sntp?.lastSync ? formatTime(sntp.lastSync) : "N/A"}
      </p>
      {isAdmin && (
        <div className="settings-actions">
          <button type="submit" aria-label="Lưu cấu hình SNTP"><Save size={16} /> Lưu cài đặt</button>
          <button type="button" aria-label="Đồng bộ thời gian ngay lập tức" onClick={onSync}><Clock size={16} /> Đồng bộ ngay</button>
        </div>
      )}
    </form>
  );
}

function MonitoringForm({ monitoring, isAdmin, onSave }) {
  const [sensitivity, setSensitivity] = useState(monitoring?.alertSensitivity ?? "standard");
  const [alertRules, setAlertRules] = useState(() => defaultAlertRules(monitoring));

  function setAlertRule(key, enabled) {
    setAlertRules((current) => ({ ...current, [key]: enabled }));
  }

  return (
    <form
      className="settings-form"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        onSave({
          cpuCritical: formData.get("cpuCritical"),
          ramWarning: formData.get("ramWarning"),
          diskCritical: formData.get("diskCritical"),
          pollingIntervalSeconds: formData.get("pollingIntervalSeconds"),
          alertSensitivity: formData.get("alertSensitivity"),
          alertRules
        });
      }}
    >
      <h3>Quy tắc giám sát</h3>
      <label htmlFor="cpu-critical">
        Ngưỡng khẩn cấp CPU (%)
        <input id="cpu-critical" name="cpuCritical" aria-label="CPU Critical Threshold" disabled={!isAdmin} type="number" min="1" max="100" defaultValue={monitoring?.cpuCritical ?? 90} />
      </label>
      <label htmlFor="ram-warning">
        Ngưỡng cảnh báo RAM (%)
        <input id="ram-warning" name="ramWarning" aria-label="RAM Warning Threshold" disabled={!isAdmin} type="number" min="1" max="100" defaultValue={monitoring?.ramWarning ?? 85} />
      </label>
      <label htmlFor="disk-critical">
        Ngưỡng khẩn cấp Ổ đĩa (%)
        <input id="disk-critical" name="diskCritical" aria-label="Disk Critical Threshold" disabled={!isAdmin} type="number" min="1" max="100" defaultValue={monitoring?.diskCritical ?? 95} />
      </label>
      <label htmlFor="polling-interval">
        Tần suất quét dữ liệu (Giây)
        <input id="polling-interval" name="pollingIntervalSeconds" aria-label="Dashboard Polling Interval in Seconds" disabled={!isAdmin} type="number" min="3" max="60" defaultValue={monitoring?.pollingIntervalSeconds ?? 3} />
      </label>
      <label htmlFor="alert-sensitivity">
        Độ nhạy cảnh báo
        <select id="alert-sensitivity" name="alertSensitivity" aria-label="Alert Sensitivity Level" disabled={!isAdmin} value={sensitivity} onChange={(event) => setSensitivity(event.target.value)}>
          <option value="standard">Tiêu chuẩn</option>
          <option value="strict">Nghiêm ngặt</option>
          <option value="relaxed">Nới lỏng</option>
        </select>
      </label>
      <p className="settings-hint">{SENSITIVITY_COPY[sensitivity]}</p>
      <div className="alert-rule-panel">
        <div>
          <h4>Loai canh bao</h4>
          <p className="settings-meta">Tat rule nao thi backend khong tao alert moi cho rule do.</p>
        </div>
        <div className="alert-rule-list">
          {ALERT_RULE_FIELDS.map((field) => (
            <label key={field.key} className="alert-rule-row" htmlFor={`alert-rule-${field.key}`}>
              <span>{field.label}</span>
              <input
                id={`alert-rule-${field.key}`}
                type="checkbox"
                disabled={!isAdmin}
                checked={Boolean(alertRules[field.key])}
                onChange={(event) => setAlertRule(field.key, event.target.checked)}
              />
            </label>
          ))}
        </div>
      </div>
      {isAdmin && (
        <div className="settings-actions">
          <button type="submit" aria-label="Lưu quy tắc giám sát"><Save size={16} /> Lưu cài đặt</button>
        </div>
      )}
    </form>
  );
}

function demoPayload(monitoring, demoMode) {
  return {
    cpuCritical: monitoring?.cpuCritical ?? 90,
    ramWarning: monitoring?.ramWarning ?? 85,
    diskCritical: monitoring?.diskCritical ?? 95,
    pollingIntervalSeconds: monitoring?.pollingIntervalSeconds ?? 3,
    alertSensitivity: monitoring?.alertSensitivity ?? "standard",
    alertRules: defaultAlertRules(monitoring),
    demoMode
  };
}

function DemoModeForm({ monitoring, isAdmin, onSaveMonitoring }) {
  const demoMode = Boolean(monitoring?.demoMode);
  const Icon = demoMode ? ToggleRight : ToggleLeft;

  return (
    <section className="settings-form demo-mode-form" aria-label="Cai dat che do demo">
      <div className="demo-mode-row">
        <div className="demo-mode-title">
          <Icon size={18} />
          <div>
            <h3>Che do demo/lab</h3>
            <p className="settings-meta">
              {demoMode
                ? `Dang bat demo${monitoring?.demoScenario && monitoring.demoScenario !== "normal" ? `: ${monitoring.demoScenario}` : ""}.`
                : "Dang tat demo. Dashboard dung du lieu live/local va an cac kich ban demo."}
            </p>
          </div>
        </div>
        <button
          type="button"
          className={`demo-switch ${demoMode ? "active" : ""}`}
          aria-pressed={demoMode}
          aria-label="Bat tat che do demo"
          disabled={!isAdmin}
          onClick={() => onSaveMonitoring(demoPayload(monitoring, !demoMode))}
        >
          <span className="demo-switch-track">
            <span className="demo-switch-thumb" />
          </span>
          <span>{demoMode ? "Bat" : "Tat"}</span>
        </button>
      </div>
    </section>
  );
}

function AlertChannelModal({ telegram, isAdmin, onClose, onSaveTelegram, onTestTelegram, onFetchTelegramChatId }) {
  const [enabled, setEnabled] = useState(Boolean(telegram?.enabled));
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState(telegram?.chatId ?? "");
  const [status, setStatus] = useState(null);

  async function saveTelegram(event) {
    event.preventDefault();
    setStatus({ type: "loading", message: "Dang luu cau hinh canh bao..." });
    try {
      await onSaveTelegram({ enabled, botToken, chatId });
      setStatus({ type: "success", message: "Da luu cau hinh canh bao Telegram." });
    } catch (err) {
      setStatus({ type: "error", message: `Loi luu cau hinh: ${err.message}` });
    }
  }

  async function testTelegram() {
    setStatus({ type: "loading", message: "Dang gui tin thu Telegram..." });
    try {
      await onTestTelegram();
      setStatus({ type: "success", message: "Da gui tin thu Telegram thanh cong." });
    } catch (err) {
      setStatus({ type: "error", message: `Loi gui tin thu: ${err.message}` });
    }
  }

  async function fetchChatId() {
    setStatus({ type: "loading", message: "Dang lay Chat ID tu Telegram..." });
    try {
      const data = await onFetchTelegramChatId({ botToken });
      setChatId(data.chatId);
      setStatus({ type: "success", message: `Da lay Chat ID: ${data.chatId}` });
    } catch (err) {
      setStatus({ type: "error", message: `Khong lay duoc Chat ID: ${err.message}` });
    }
  }

  return (
    <div className="settings-modal-backdrop" role="presentation">
      <section className="settings-modal" role="dialog" aria-modal="true" aria-label="Cau hinh canh bao Telegram">
        <div className="settings-modal-heading">
          <div>
            <p className="eyebrow">Kenh canh bao</p>
            <h3>Canh bao Telegram</h3>
          </div>
          <button type="button" className="icon-button" aria-label="Dong modal cau hinh canh bao" onClick={onClose}>
            <X size={16} />
          </button>
        </div>

        <form className="settings-modal-body" onSubmit={saveTelegram}>
          <label className="checkbox-row" htmlFor="settings-alert-enabled">
            <input
              id="settings-alert-enabled"
              type="checkbox"
              disabled={!isAdmin}
              checked={enabled}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            Bat gui canh bao qua Telegram
          </label>

          <label htmlFor="settings-alert-token">
            Bot token
            <input
              id="settings-alert-token"
              disabled={!isAdmin}
              value={botToken}
              placeholder={telegram?.botTokenConfigured ? telegram.botToken : "Nhap token bot Telegram"}
              onChange={(event) => setBotToken(event.target.value)}
              autoComplete="new-password"
            />
          </label>

          <label htmlFor="settings-alert-chat-id">
            Telegram Chat ID
            <div className="telegram-chat-row">
              <input
                id="settings-alert-chat-id"
                disabled={!isAdmin}
                value={chatId}
                placeholder="VD: -1001234567890"
                onChange={(event) => setChatId(event.target.value)}
              />
              <button type="button" disabled={!isAdmin || status?.type === "loading"} onClick={fetchChatId}>
                <Search size={16} /> Lay ID
              </button>
            </div>
          </label>

          <p className="settings-hint">
            De lay ID: nhan Start hoac gui mot tin nhan vao bot/nhom Telegram truoc, sau do bam Lay ID.
          </p>

          <div className="settings-actions">
            <button type="submit" disabled={!isAdmin || status?.type === "loading"}><Save size={16} /> Luu canh bao</button>
            <button type="button" disabled={!isAdmin || status?.type === "loading"} onClick={testTelegram}><Send size={16} /> Gui tin thu</button>
          </div>
        </form>

        {status && (
          <div className={`alert-lab-status ${status.type}`}>
            <AlertTriangle size={16} />
            <span>{status.message}</span>
          </div>
        )}
      </section>
    </div>
  );
}

function AlertSettingsCard({ telegram, isAdmin, onOpen }) {
  const enabled = Boolean(telegram?.enabled);

  return (
    <section className="settings-form demo-mode-form" aria-label="Cai dat canh bao">
      <div className="demo-mode-row">
        <div className="demo-mode-title">
          <Bell size={18} />
          <div>
            <h3>Canh bao</h3>
            <p className="settings-meta">
              {enabled ? `Telegram dang bat${telegram?.chatId ? ` - ID ${telegram.chatId}` : ""}.` : "Telegram dang tat. Bam cau hinh de bat va lay Chat ID."}
            </p>
          </div>
        </div>
        <button type="button" className="settings-open-modal-button" disabled={!isAdmin} onClick={onOpen}>
          Cau hinh
        </button>
      </div>
    </section>
  );
}

function AlertStatusCard({ overview, monitoring, telegram }) {
  const openAlerts = overview?.alerts?.filter((alert) => alert.status !== "resolved").length ?? 0;
  const telegramStatus = telegram?.enabled ? "Telegram bat" : "Telegram tat";
  const liveStatus = `Live ${monitoring?.pollingIntervalSeconds ?? 3}s`;

  return (
    <section className="settings-summary-card" aria-label="Trang thai canh bao">
      <div className="settings-summary-title">
        <AlertTriangle size={18} />
        <div>
          <h3>Trang thai</h3>
          <p className="settings-meta">{openAlerts} alert dang mo</p>
        </div>
      </div>
      <div className="settings-summary-pills">
        <span className={openAlerts > 0 ? "warning" : "success"}>{openAlerts} alerts</span>
        <span>{telegramStatus}</span>
        <span>{liveStatus}</span>
      </div>
    </section>
  );
}

function AlertLabPanel({ monitoring, isAdmin, onSaveMonitoring, onRunAlertLabScenario }) {
  const normalThreshold = 95;
  const values = [monitoring?.cpuCritical, monitoring?.ramWarning, monitoring?.diskCritical].map(Number);
  const currentSharedValue = values.every((value) => Number.isFinite(value) && value === values[0]) ? values[0] : 80;
  const [status, setStatus] = useState(null);
  const [activeScenario, setActiveScenario] = useState("");

  async function applySharedThreshold(nextThreshold, message) {
    setStatus({ type: "loading", message: "Đang áp dụng ngưỡng kiểm thử..." });
    try {
      await onSaveMonitoring({
        cpuCritical: nextThreshold,
        ramWarning: nextThreshold,
        diskCritical: nextThreshold,
        pollingIntervalSeconds: monitoring?.pollingIntervalSeconds ?? 3,
        alertSensitivity: monitoring?.alertSensitivity ?? "standard"
      });
      setStatus({ type: "success", message });
    } catch (err) {
      setStatus({ type: "error", message: `Lỗi kiểm thử: ${err.message}` });
    }
  }

  async function runScenario(scenario, title) {
    setActiveScenario(scenario);
    setStatus({ type: "loading", message: `Đang kích hoạt: ${title}...` });
    try {
      await onRunAlertLabScenario(scenario);
      setStatus({ type: "success", message: `Đã kích hoạt "${title}". Alert/log đã đi qua pipeline thật để kiểm thử Email/Telegram.` });
    } catch (err) {
      setStatus({ type: "error", message: `Lỗi kích hoạt: ${err.message}` });
    }
  }

  return (
    <section className="alert-lab-panel" aria-label="Lab kiểm thử cảnh báo">
      <div className="alert-lab-heading">
        <div className="alert-lab-icon"><Beaker size={20} /></div>
        <div>
          <p className="eyebrow">Lab nội bộ</p>
          <h3>Kiểm thử cảnh báo thật và demo tình huống</h3>
        </div>
      </div>
      <p className="alert-lab-copy">
        Khu này dành cho vận hành/lab. Khi public có thể ẩn riêng, còn các rule thật như ngưỡng tài nguyên, sai mật khẩu, IP lạ vẫn chạy trong backend.
      </p>

      <div className="alert-lab-testbar">
        <label className="alert-lab-threshold" htmlFor="shared-alert-threshold">
          Ngưỡng kiểm thử chung (%)
          <div className="alert-lab-control">
            <input id="shared-alert-threshold" aria-label="Ngưỡng kiểm thử chung cho CPU RAM và ổ đĩa" disabled={!isAdmin} type="number" min="1" max="100" defaultValue={currentSharedValue} />
            <span>%</span>
          </div>
        </label>
        {isAdmin && (
          <div className="alert-lab-actions compact">
            <button
              type="button"
              onClick={(event) => {
                const panel = event.currentTarget.closest(".alert-lab-panel");
                const nextThreshold = panel.querySelector("#shared-alert-threshold").value;
                applySharedThreshold(nextThreshold, `Đã đặt ngưỡng kiểm thử chung ${nextThreshold}%. Dashboard sẽ đánh giá lại alert ngay.`);
              }}
            >
              <SlidersHorizontal size={16} /> Áp dụng test
            </button>
            <button type="button" className="secondary" onClick={() => applySharedThreshold(normalThreshold, `Đã trả ngưỡng chung về ${normalThreshold}%.`)}>
              <RotateCcw size={16} /> Khôi phục ngưỡng
            </button>
            <button type="button" className="success" onClick={() => runScenario("normal", "Khôi phục trạng thái bình thường")}>
              <RotateCcw size={16} /> Reset lab
            </button>
          </div>
        )}
      </div>

      <div className="scenario-grid">
        {LAB_SCENARIOS.map((scenario) => {
          const Icon = scenario.icon;
          return (
            <button
              key={scenario.key}
              type="button"
              className={`scenario-card ${scenario.tone} ${activeScenario === scenario.key ? "active" : ""}`}
              disabled={!isAdmin || status?.type === "loading"}
              onClick={() => runScenario(scenario.key, scenario.title)}
            >
              <span className="scenario-icon"><Icon size={18} /></span>
              <span className="scenario-body">
                <span className="scenario-group">{scenario.group}</span>
                <strong>{scenario.title}</strong>
                <small>{scenario.detail}</small>
              </span>
            </button>
          );
        })}
      </div>

      {status && (
        <div className={`alert-lab-status ${status.type}`}>
          <AlertTriangle size={16} />
          <span>{status.message}</span>
        </div>
      )}
    </section>
  );
}

export function SettingsView({ user, overview, sntp, telegram, monitoring, onSaveSntp, onSyncSntp, onSaveTelegram, onTestTelegram, onFetchTelegramChatId, onSaveMonitoring, onRunAlertLabScenario }) {
  const isAdmin = user.role === "admin";
  const [alertModalOpen, setAlertModalOpen] = useState(false);

  return (
    <div className="view-fade-in content-grid">
      <div className="left-column" style={{ gridColumn: "1 / -1" }}>
        <section id="settings" className="table-panel">
          <div className="section-heading">
            <div>
              <h2>Cài đặt hệ thống</h2>
              <p>Đồng bộ thời gian SNTP và cấu hình quy tắc quét dữ liệu giám sát</p>
            </div>
            <Settings size={20} className="glow-icon-cyan" />
          </div>

          <div className="settings-summary-row">
            <DemoModeForm monitoring={monitoring} isAdmin={isAdmin} onSaveMonitoring={onSaveMonitoring} />
            <AlertSettingsCard telegram={telegram} isAdmin={isAdmin} onOpen={() => setAlertModalOpen(true)} />
            <AlertStatusCard overview={overview} monitoring={monitoring} telegram={telegram} />
          </div>

          <div className="settings-main-layout">
            <MonitoringForm key={`monitoring-${monitoring?.cpuCritical}-${monitoring?.ramWarning}-${monitoring?.diskCritical}-${monitoring?.pollingIntervalSeconds}-${monitoring?.alertSensitivity}-${JSON.stringify(monitoring?.alertRules ?? {})}`} monitoring={monitoring} isAdmin={isAdmin} onSave={onSaveMonitoring} />
            <div className="settings-side-stack">
              <SntpForm key={sntp?.server + sntp?.intervalHours} sntp={sntp} isAdmin={isAdmin} onSave={onSaveSntp} onSync={onSyncSntp} />
              <section className="settings-form notification-summary-card">
                <h3>Kenh thong bao</h3>
                <div className="notification-summary-row">
                  <span>Telegram</span>
                  <strong>{telegram?.enabled ? "Bat" : "Tat"}</strong>
                </div>
                <div className="notification-summary-row">
                  <span>Chat ID</span>
                  <strong>{telegram?.chatId || "Chua co"}</strong>
                </div>
                <button type="button" className="settings-open-modal-button" disabled={!isAdmin} onClick={() => setAlertModalOpen(true)}>
                  Cau hinh Telegram
                </button>
              </section>
            </div>
          </div>

          {isAdmin && monitoring?.demoMode && (
            <AlertLabPanel monitoring={monitoring} isAdmin={isAdmin} onSaveMonitoring={onSaveMonitoring} onRunAlertLabScenario={onRunAlertLabScenario} />
          )}

          {alertModalOpen && (
            <AlertChannelModal
              telegram={telegram}
              isAdmin={isAdmin}
              onClose={() => setAlertModalOpen(false)}
              onSaveTelegram={onSaveTelegram}
              onTestTelegram={onTestTelegram}
              onFetchTelegramChatId={onFetchTelegramChatId}
            />
          )}
        </section>
      </div>
    </div>
  );
}
