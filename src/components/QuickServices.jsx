import { Server } from "lucide-react";
import { StatusPill } from "./Topbar.jsx";

export function QuickServices({ services }) {
  return (
    <section className="table-panel compact-panel">
      <div className="section-heading">
        <div>
          <h2>Sức khỏe dịch vụ nhanh</h2>
          <p>{services.filter((service) => service.status === "running").length}/{services.length} đang chạy</p>
        </div>
        <Server size={20} className="glow-icon-cyan" />
      </div>
      <div className="quick-service-list">
        {services.map((service) => (
          <div key={service.id}>
            <span>{service.service_name}</span>
            <StatusPill tone={service.status === "running" ? "success" : "critical"}>
              {service.status === "running" ? "Đang chạy" : "Đã dừng"}
            </StatusPill>
          </div>
        ))}
      </div>
    </section>
  );
}
