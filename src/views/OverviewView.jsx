import { Cpu, MemoryStick, HardDrive, Network, Clock, Shield, Activity } from "lucide-react";
import { formatTime, formatUptime, percentStatus, serviceHealth, numericHistory } from "../utils.js";
import { MetricCard } from "../components/MetricCard.jsx";
import { CPUDetailChart, DualTrendChart, NetworkThroughputChart, UptimeMap } from "../components/MetricCharts.jsx";
import { QuickAlerts } from "../components/QuickAlerts.jsx";
import { QuickServices } from "../components/QuickServices.jsx";
import { QuickLogs } from "../components/QuickLogs.jsx";

export function OverviewView({ overview, onSelectAlert }) {
  const { metric, history, services, alerts, logs } = overview;
  const health = serviceHealth(services);
  const openAlerts = alerts.filter((a) => a.status !== "resolved");

  return (
    <div className="view-fade-in">
      {/* 1. Header Row (Stat Panels) - The "At-a-Glance" Section */}
      <section className="overview-grid">
        <MetricCard icon={Cpu} label="CPU" value={Math.round(metric.cpu_percent)} status={percentStatus(metric.cpu_percent, 75, 90)} detail={`Cập nhật lúc ${formatTime(metric.collected_at)}`} history={history} historyKey="cpu_percent" />
        <MetricCard icon={MemoryStick} label="RAM" value={Math.round(metric.ram_percent)} status={percentStatus(metric.ram_percent, 85, 95)} detail={`${metric.ram_used_mb ?? "?"} / ${metric.ram_total_mb ?? "?"} MB`} history={history} historyKey="ram_percent" />
        <MetricCard icon={HardDrive} label="Ổ đĩa" value={Math.round(metric.disk_percent)} status={percentStatus(metric.disk_percent, 85, 95)} detail="Ổ đĩa giám sát chính" history={history} historyKey="disk_percent" />
        <MetricCard icon={Network} label="Băng thông" value={Math.round(metric.network_rx_kbps ?? 0)} suffix=" Kbps" status="normal" detail={`Gửi: ${Math.round(metric.network_tx_kbps ?? 0)} Kbps`} history={history} historyKey="network_rx_kbps" maxValue={Math.max(100, ...numericHistory(history, "network_rx_kbps"))} />
        <MetricCard icon={Clock} label="Uptime" value={formatUptime(metric.uptime_seconds)} suffix="" status="normal" detail="Nhịp quét máy chủ trực tuyến" />
        <MetricCard icon={Shield} label="Trạng thái" value={health} status={health < 80 ? "critical" : health < 100 ? "warning" : "normal"} detail={`${services.filter((s) => s.status === "running").length}/${services.length} dịch vụ đang chạy`} />
      </section>

      {/* 2. Main Body (Trends Section) - Structured into expandable/logical rows */}
      <section className="overview-workspace">
        <div className="overview-charts">
          <CPUDetailChart history={history} />
          <DualTrendChart history={history} />
          <NetworkThroughputChart history={history} />
        </div>
        
        {/* Footer/Drill-downs sidebar section */}
        <aside className="overview-quick">
          <QuickAlerts alerts={openAlerts} onSelect={onSelectAlert} />
          <QuickServices services={services} />
          <section className="chart-panel compact-panel">
            <div className="section-heading">
              <div>
                <h2>Bản đồ hoạt động</h2>
                <p>24 chu kỳ hoạt động gần nhất</p>
              </div>
              <Activity size={20} />
            </div>
            <UptimeMap services={services} />
          </section>
          <QuickLogs logs={logs} />
        </aside>
      </section>
    </div>
  );
}
