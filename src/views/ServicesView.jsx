import { Server, Activity } from "lucide-react";
import { formatTime } from "../utils.js";
import { StatusPill } from "../components/Topbar.jsx";
import { UptimeMap, DiskDonut } from "../components/MetricCharts.jsx";

export function ServicesView({ overview }) {
  const { services, metric } = overview;

  return (
    <div className="view-fade-in content-grid">
      <div className="left-column">
        <section className="table-panel">
          <div className="section-heading">
            <div>
              <h2>Trạng thái dịch vụ</h2>
              <p>Dịch vụ mạng, IIS và SQL Server</p>
            </div>
            <Server size={20} className="glow-icon-cyan" />
          </div>
          <div className="table-list">
            <div className="table-row service-header">
              <span>Dịch vụ</span>
              <span>Trạng thái</span>
              <span>Kiểm tra cuối</span>
            </div>
            {services.map((service) => (
              <div className="table-row service-row" key={service.id}>
                <div>
                  <strong>{service.display_name}</strong>
                  <span>{service.service_name}</span>
                </div>
                <StatusPill tone={service.status === "running" ? "success" : "critical"}>
                  {service.status === "running" ? "Đang chạy" : "Đã dừng"}
                </StatusPill>
                <small>{formatTime(service.last_checked_at ?? service.checked_at ?? metric.collected_at)}</small>
              </div>
            ))}
          </div>
        </section>
      </div>

      <aside className="right-column">
        <section className="chart-panel">
          <div className="section-heading">
            <div>
              <h2>Bản đồ hoạt động</h2>
              <p>24 chu kỳ hoạt động gần nhất</p>
            </div>
            <Activity size={20} className="glow-icon-cyan" />
          </div>
          <UptimeMap services={services} />
        </section>
        
        <section className="chart-panel">
          <div className="section-heading">
            <div>
              <h2>Tải lượng Ổ đĩa</h2>
              <p>Dung lượng lưu trữ chính</p>
            </div>
          </div>
          <DiskDonut value={metric.disk_percent} />
        </section>
      </aside>
    </div>
  );
}
