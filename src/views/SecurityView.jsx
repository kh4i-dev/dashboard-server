import { Shield } from "lucide-react";

function StatusTile({ label, value, tone }) {
  return (
    <div className={`status-tile ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

const translateValue = (val) => {
  if (typeof val === "string") {
    const v = val.toLowerCase();
    if (v === "restricted") return "Bị giới hạn";
    if (v === "lab mode") return "Chế độ Lab";
    if (v === "enabled") return "Đang bật";
    if (v === "disabled") return "Vô hiệu hóa";
    if (v === "blocked") return "Bị chặn";
  }
  return val;
};

export function SecurityView({ overview, security }) {
  const { alerts } = overview;
  const openCritical = alerts.filter((a) => a.status !== "resolved" && a.severity === "critical").length;
  const bruteForceCount = alerts.filter((a) => a.type === "login_bruteforce").length;

  return (
    <div className="view-fade-in content-grid">
      <div className="left-column" style={{ gridColumn: "1 / -1" }}>
        <section className="table-panel">
          <div className="section-heading">
            <div>
              <h2>Trạng thái bảo mật</h2>
              <p>Lịch sử đăng nhập thất bại, tường lửa và trạng thái HTTPS</p>
            </div>
            <Shield size={20} />
          </div>
          <div className="security-grid">
            <StatusTile label="Cảnh báo đăng nhập thất bại" value={bruteForceCount} tone="warning" />
            <StatusTile label="Trạng thái tường lửa" value={translateValue(security?.firewallPosture ?? "Restricted")} tone={(security?.firewallPosture ?? "").includes("blocked") ? "critical" : "success"} />
            <StatusTile label="Giao thức HTTPS Dashboard" value={translateValue(security?.httpsStatus ?? "Lab mode")} tone="warning" />
            <StatusTile label="Địa chỉ IP khả nghi" value={security?.suspiciousIps ?? 0} tone={(security?.suspiciousIps ?? 0) > 0 ? "warning" : "success"} />
            <StatusTile label="Khóa tài khoản" value={translateValue(security?.accountLockout ?? "Enabled")} tone="success" />
            <StatusTile label="Cảnh báo khẩn cấp đang mở" value={openCritical} tone={openCritical > 0 ? "critical" : "success"} />
          </div>
        </section>
      </div>
    </div>
  );
}

