import { FileText, Database } from "lucide-react";
import { formatTime } from "../utils.js";

export function QuickLogs({ logs }) {
  return (
    <section className="logs-panel compact-panel">
      <div className="section-heading">
        <div>
          <h2>Nhật ký gần đây</h2>
          <p>Theo vết sự kiện mới nhất</p>
        </div>
        <FileText size={20} className="glow-icon-cyan" />
      </div>
      <div className="log-list">
        {logs.slice(0, 4).map((log) => (
          <div className="log-row" key={log.id}>
            <Database size={14} />
            <span>{log.message}</span>
            <small>{formatTime(log.occurred_at)}</small>
          </div>
        ))}
      </div>
    </section>
  );
}
