import { FileText, Database } from "lucide-react";
import { formatTime } from "../utils.js";

export function LogsView({ overview }) {
  const { logs } = overview;

  return (
    <div className="view-fade-in content-grid">
      <div className="left-column" style={{ gridColumn: "1 / -1" }}>
        <section className="logs-panel">
          <div className="section-heading">
            <div>
              <h2>Nhật ký hệ thống</h2>
              <p>Nhật ký kiểm tra và khắc phục sự cố hệ thống</p>
            </div>
            <FileText size={20} className="glow-icon-cyan" />
          </div>
          <div className="log-list">
            {logs.map((log) => (
              <div className="log-row" key={log.id}>
                <Database size={14} />
                <span>{log.message}</span>
                <small>{formatTime(log.occurred_at)}</small>
              </div>
            ))}
            {!logs.length ? <p className="empty-state">Không có nhật ký khả dụng.</p> : null}
          </div>
        </section>
      </div>
    </div>
  );
}
