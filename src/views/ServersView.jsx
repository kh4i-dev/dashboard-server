import { Server, Wifi, Activity, Bell, Shield, Clock } from "lucide-react";
import { formatTime, formatUptime } from "../utils.js";

export function ServersView({ overview }) {
  const { server, metric, services, alerts } = overview;
  const openAlerts = alerts.filter((a) => a.status !== "resolved");
  const runningServices = services.filter((s) => s.status === "running").length;

  return (
    <div className="view-fade-in content-grid">
      <div className="left-column">
        <section className="server-strip">
          <div><Wifi size={18} /><span>IP {server.ip_address}</span></div>
          <div><Server size={18} /><span>Host {server.hostname}</span></div>
          <div><Activity size={18} /><span>Uptime {formatUptime(metric.uptime_seconds)}</span></div>
          <div><Bell size={18} /><span>{openAlerts.length} cảnh báo</span></div>
          <div><Shield size={18} /><span>{runningServices}/{services.length} dịch vụ</span></div>
          <div><Clock size={18} /><span>Quét cuối: {formatTime(metric.collected_at)}</span></div>
        </section>

        <section className="table-panel">
          <div className="section-heading">
            <div>
              <h2>Danh sách máy chủ</h2>
              <p>Máy chủ Windows Lab chính đang giám sát</p>
            </div>
            <Server size={20} className="glow-icon-cyan" />
          </div>
          <div className="server-inventory">
            <div><span>Tên máy chủ (Hostname)</span><strong>{server.hostname}</strong></div>
            <div><span>Địa chỉ IP</span><strong>{server.ip_address}</strong></div>
            <div><span>Hệ điều hành</span><strong>{server.os_version}</strong></div>
            <div><span>Môi trường</span><strong>{server.environment}</strong></div>
          </div>
        </section>
      </div>
      <aside className="right-column">
        <section className="chart-panel">
          <div className="section-heading">
            <div>
              <h2>Chi tiết hệ thống</h2>
              <p>Trạng thái tài nguyên hiện tại</p>
            </div>
            <Activity size={20} className="glow-icon-cyan" />
          </div>
          <p className="settings-meta">ID: {server.id}</p>
          <p className="settings-meta">Vai trò: Máy chủ ứng dụng & cơ sở dữ liệu chính</p>
        </section>
      </aside>
    </div>
  );
}
