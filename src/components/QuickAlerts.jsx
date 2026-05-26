import { TriangleAlert } from "lucide-react";
import { formatTime, severityClass } from "../utils.js";

export function QuickAlerts({ alerts, onSelect }) {
  const criticalAlerts = alerts.filter((alert) => alert.severity === "critical").slice(0, 3);
  const displayAlerts = criticalAlerts.length ? criticalAlerts : alerts.slice(0, 3);

  const severityMap = { critical: "Khẩn cấp", warning: "Cảnh báo" };
  const statusMap = { open: "Mở", acknowledged: "Đã xác nhận", resolved: "Đã xử lý", closed: "Đóng" };

  return (
    <section className="alerts-panel compact-panel">
      <div className="section-heading">
        <div>
          <h2>Cảnh báo khẩn cấp hoạt động</h2>
          <p>{criticalAlerts.length} khẩn cấp hiện tại</p>
        </div>
        <TriangleAlert size={20} className="glow-icon-cyan" />
      </div>
      <div className="alert-list compact-list">
        {displayAlerts.map((alert) => (
          <button type="button" className="alert-item" key={alert.id} onClick={() => onSelect(alert.id)}>
            <span className={`alert-icon ${severityClass(alert.severity)}`}>
              <TriangleAlert size={16} />
            </span>
            <span>
              <strong>{alert.title}</strong>
              <small>{severityMap[alert.severity] ?? alert.severity} / {statusMap[alert.status] ?? alert.status} - {formatTime(alert.opened_at)}</small>
            </span>
          </button>
        ))}
        {!alerts.length ? <p className="empty-state">Không có cảnh báo hoạt động.</p> : null}
      </div>
    </section>
  );
}
