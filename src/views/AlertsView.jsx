import { Bell, TriangleAlert, Shield } from "lucide-react";
import { formatTime, severityClass, percentStatus } from "../utils.js";
import { useState, useEffect } from "react";

const statusTranslations = {
  open: "Mở",
  acknowledged: "Đã nhận lỗi",
  resolved: "Đã xử lý",
  closed: "Đã đóng"
};

function StatusTile({ label, value, tone }) {
  return (
    <div className={`status-tile ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SuggestionList({ title, items }) {
  return (
    <div className="suggestion-list">
      <h3>{title}</h3>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  );
}

function useSuggestion(api, alertId) {
  const [suggestion, setSuggestion] = useState(null);
  
  useEffect(() => {
    let ignore = false;
    async function loadSuggestion() {
      if (!alertId) {
        setSuggestion(null);
        return;
      }
      try {
        const data = await api.suggestion(alertId);
        if (!ignore) setSuggestion(data.suggestion);
      } catch {
        if (!ignore) setSuggestion(null);
      }
    }
    loadSuggestion();
    return () => { ignore = true; };
  }, [api, alertId]);

  return suggestion;
}

export function AlertsView({ overview, selectedAlertId, onSelectAlert, api, user, load }) {
  const { alerts, metric, logs } = overview;
  const openAlerts = alerts.filter((a) => a.status !== "resolved");
  const effectiveSelectedAlertId = selectedAlertId ?? openAlerts[0]?.id ?? null;
  const selectedAlert = alerts.find((a) => a.id === effectiveSelectedAlertId);
  const suggestion = useSuggestion(api, effectiveSelectedAlertId);

  return (
    <div className="view-fade-in content-grid">
      <div className="left-column">
        <section className="suggestion-panel">
          <div className="section-heading">
            <div>
              <h2>Kịch bản xử lý sự cố</h2>
              <p>Hướng dẫn khắc phục sự cố tự động</p>
            </div>
            <Shield size={20} />
          </div>
          {selectedAlert && suggestion ? (
            <div className="suggestion-body">
              <strong>{selectedAlert.title}</strong>
              <p>{suggestion.summary}</p>
              <SuggestionList title="Nguyên nhân gốc rễ" items={suggestion.causes} />
              <SuggestionList title="Triệu chứng / Kiểm tra" items={suggestion.checks} />
              <SuggestionList title="Hành động tức thời" items={suggestion.actions} />
              <SuggestionList title="Phòng ngừa dài hạn" items={suggestion.prevention} />
              <div className="incident-metrics">
                <StatusTile label="Chỉ số bị ảnh hưởng" value={selectedAlert.source_ref ?? selectedAlert.source} tone={severityClass(selectedAlert.severity)} />
                <StatusTile label="CPU" value={`${Math.round(metric.cpu_percent)}%`} tone={percentStatus(metric.cpu_percent, 75, 90)} />
                <StatusTile label="RAM" value={`${Math.round(metric.ram_percent)}%`} tone={percentStatus(metric.ram_percent, 85, 95)} />
              </div>
              <div className="suggestion-list">
                <h3>Nhật ký liên quan</h3>
                <ul>
                  {logs.slice(0, 3).map((log) => (
                    <li key={log.id}>{log.source}: {log.message}</li>
                  ))}
                </ul>
              </div>
              {user.role === "admin" ? (
                <div className="alert-actions">
                  {selectedAlert.status === "open" ? <button type="button" onClick={() => api.acknowledgeAlert(selectedAlert.id).then(load)}>Xác nhận</button> : null}
                  {["open", "acknowledged"].includes(selectedAlert.status) ? <button type="button" onClick={() => api.resolveAlert(selectedAlert.id).then(load)}>Xử lý</button> : null}
                  {["resolved", "closed"].includes(selectedAlert.status) ? <button type="button" onClick={() => api.reopenAlert(selectedAlert.id).then(load)}>Mở lại</button> : null}
                  {selectedAlert.status === "resolved" ? <button type="button" onClick={() => api.closeAlert(selectedAlert.id).then(load)}>Đóng</button> : null}
                </div>
              ) : null}
            </div>
          ) : (
            <p className="empty-state">Chưa chọn cảnh báo nào.</p>
          )}
        </section>
      </div>

      <aside className="right-column">
        <section className="alerts-panel">
          <div className="section-heading">
            <div>
              <h2>Hộp thư cảnh báo</h2>
              <p>{openAlerts.length} sự cố đang hoạt động</p>
            </div>
            <Bell size={20} />
          </div>
          <div className="alert-list">
            {alerts.map((alert) => (
              <button type="button" className={`alert-item ${effectiveSelectedAlertId === alert.id ? "selected" : ""}`} key={alert.id} onClick={() => onSelectAlert(alert.id)}>
                <span className={`alert-icon ${severityClass(alert.severity)}`}>
                  <TriangleAlert size={16} />
                </span>
                <span>
                  <strong>{alert.title}</strong>
                  <small>{statusTranslations[alert.status] || alert.status} · {formatTime(alert.opened_at)}</small>
                </span>
              </button>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}

