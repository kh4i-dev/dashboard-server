import { Activity, Gauge, Network, HardDrive } from "lucide-react";
import { numericHistory, latestValue, averageValue, trendPolyline } from "../utils.js";

export function CPUDetailChart({ history }) {
  const points = numericHistory(history, "cpu_percent");
  const current = Math.round(latestValue(history, "cpu_percent"));
  const avg = Math.round(averageValue(points));
  const peak = Math.round(Math.max(0, ...points));
  const polyline = trendPolyline(points, 100, 10, 90);
  const area = `0,100 ${polyline} 100,100`;

  return (
    <div className="chart-panel">
      <div className="section-heading">
        <div>
          <h2>CPU detail</h2>
          <p>Collector samples with baseline, average and peak</p>
        </div>
        <Activity size={20} />
      </div>
      <div className="chart-stats">
        <span>Current <strong>{current}%</strong></span>
        <span>Avg <strong>{avg}%</strong></span>
        <span>Peak <strong>{peak}%</strong></span>
      </div>
      <div className="chart-frame">
        <div className="axis-labels">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="line-chart">
          <line x1="0" y1="10" x2="100" y2="10" className="chart-grid-line" />
          <line x1="0" y1="50" x2="100" y2="50" className="chart-grid-line" />
          <line x1="0" y1="90" x2="100" y2="90" className="chart-grid-line" />
          <polygon points={area} className="cpu-area" />
          <polyline points={polyline} fill="none" stroke="currentColor" strokeWidth="3" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
    </div>
  );
}

export function DualTrendChart({ history }) {
  const cpuLine = trendPolyline(numericHistory(history, "cpu_percent"), 100, 10, 90);
  const ramLine = trendPolyline(numericHistory(history, "ram_percent"), 100, 10, 90);
  const ramArea = `0,100 ${ramLine} 100,100`;

  return (
    <section id="metrics" className="chart-panel">
      <div className="section-heading">
        <div>
          <h2>Metrics trend</h2>
          <p>CPU/RAM dual trend from latest samples</p>
        </div>
        <Gauge size={20} />
      </div>
      <div className="chart-frame compact">
        <div className="axis-labels">
          <span>100</span>
          <span>50</span>
          <span>0</span>
        </div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="dual-chart">
          <line x1="0" y1="10" x2="100" y2="10" className="chart-grid-line" />
          <line x1="0" y1="50" x2="100" y2="50" className="chart-grid-line" />
          <line x1="0" y1="90" x2="100" y2="90" className="chart-grid-line" />
          <polygon points={ramArea} className="ram-area" />
          <polyline points={ramLine} className="ram-line" fill="none" vectorEffect="non-scaling-stroke" />
          <polyline points={cpuLine} className="cpu-line" fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="chart-legend dense">
        <span><i className="legend-dot cpu"></i> CPU {Math.round(latestValue(history, "cpu_percent"))}%</span>
        <span><i className="legend-dot ram"></i> RAM {Math.round(latestValue(history, "ram_percent"))}%</span>
        <span>Last {history.length} samples</span>
      </div>
    </section>
  );
}

export function NetworkThroughputChart({ history }) {
  const rxValues = numericHistory(history, "network_rx_kbps");
  const txValues = numericHistory(history, "network_tx_kbps");
  const maxTraffic = Math.max(100, ...rxValues, ...txValues);
  const rxLine = trendPolyline(rxValues, maxTraffic, 10, 90);
  const txLine = trendPolyline(txValues, maxTraffic, 10, 90);
  const rxArea = `0,100 ${rxLine} 100,100`;

  return (
    <section className="chart-panel">
      <div className="section-heading">
        <div>
          <h2>Network throughput</h2>
          <p>RX/TX trend from collector samples</p>
        </div>
        <Network size={20} />
      </div>
      <div className="chart-stats">
        <span>RX <strong>{Math.round(latestValue(history, "network_rx_kbps"))} Kbps</strong></span>
        <span>TX <strong>{Math.round(latestValue(history, "network_tx_kbps"))} Kbps</strong></span>
        <span>Scale <strong>{Math.round(maxTraffic)} Kbps</strong></span>
      </div>
      <div className="chart-frame compact">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="network-chart">
          <line x1="0" y1="10" x2="100" y2="10" className="chart-grid-line" />
          <line x1="0" y1="50" x2="100" y2="50" className="chart-grid-line" />
          <line x1="0" y1="90" x2="100" y2="90" className="chart-grid-line" />
          <polygon points={rxArea} className="network-area" />
          <polyline points={rxLine} className="rx-line" fill="none" vectorEffect="non-scaling-stroke" />
          <polyline points={txLine} className="tx-line" fill="none" vectorEffect="non-scaling-stroke" />
        </svg>
      </div>
      <div className="chart-legend dense">
        <span><i className="legend-dot rx"></i> RX</span>
        <span><i className="legend-dot tx"></i> TX</span>
      </div>
    </section>
  );
}

export function DiskDonut({ value }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const dash = (Math.min(value, 100) / 100) * circumference;

  return (
    <div className={`disk-donut ${value >= 95 ? "critical" : ""}`}>
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={radius} className="donut-track" />
        <circle cx="50" cy="50" r={radius} className="donut-value" strokeDasharray={`${dash} ${circumference - dash}`} />
      </svg>
      <strong>{Math.round(value)}%</strong>
    </div>
  );
}

export function UptimeMap({ services }) {
  const criticalDown = services.some((service) => ["W3SVC", "MSSQLSERVER"].includes(service.service_name) && service.status !== "running");
  const cells = Array.from({ length: 24 }, (_, index) => {
    if (criticalDown && index > 18) return "critical";
    if (index % 9 === 0) return "stale";
    return "success";
  });

  return (
    <div className="uptime-map">
      {cells.map((tone, index) => (
        <span key={index} className={tone} title={`Cycle ${index + 1}`} />
      ))}
    </div>
  );
}
