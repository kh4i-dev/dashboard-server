import { LogOut, RefreshCcw, Users } from "lucide-react";

export function StatusPill({ children, tone = "normal" }) {
  return <span className={`status-pill ${tone}`}>{children}</span>;
}

export function Topbar({ server, openAlerts, monitoring, user, loading, onRefresh, onLogout }) {
  return (
    <header className="topbar">
      <div>
        <p className="eyebrow">{server.os_version || "System Info"}</p>
        <h1>{server.name}</h1>
      </div>
      <div className="topbar-actions">
        <span className="sync-badge">
          <span className="heartbeat-dot"></span>
          Live ({monitoring?.pollingIntervalSeconds ?? 3}s)
        </span>
        <StatusPill tone={openAlerts.some((a) => a.severity === "critical") ? "critical" : openAlerts.length ? "warning" : "success"}>
          {openAlerts.length} alerts
        </StatusPill>
        <StatusPill tone="normal">{server.environment}</StatusPill>
        <StatusPill tone={server.status === "online" ? "success" : "critical"}>
          {server.status}
        </StatusPill>
        <span className="user-chip">
          <Users size={16} />
          {user.username} · {user.role}
        </span>
        <button type="button" className={`icon-button ${loading ? "spinning" : ""}`} onClick={onRefresh} title="Refresh" disabled={loading}>
          <RefreshCcw size={18} />
        </button>
        <button type="button" className="icon-button" onClick={onLogout} title="Logout">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}
