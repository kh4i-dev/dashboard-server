import { numericHistory, trendPolyline } from "../utils.js";

function MetricSparkline({ history, dataKey, maxValue = 100 }) {
  const values = numericHistory(history, dataKey);
  const polyline = trendPolyline(values, maxValue, 4, 32);

  return (
    <svg viewBox="0 0 100 36" preserveAspectRatio="none" className="metric-sparkline" aria-hidden="true">
      <line x1="0" y1="18" x2="100" y2="18" />
      <polyline points={polyline} fill="none" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

const EMPTY_HISTORY = [];

export function MetricCard({ icon: Icon, label, value, suffix = "%", status = "normal", detail, history = EMPTY_HISTORY, historyKey, maxValue = 100 }) {
  return (
    <article className={`metric-card ${status}`}>
      <div className="card-topline">
        <span className="metric-icon">
          <Icon size={22} />
        </span>
        <span>{label}</span>
      </div>
      <strong>
        {value}
        {suffix}
      </strong>
      <p>{detail}</p>
      {historyKey ? <MetricSparkline history={history} dataKey={historyKey} maxValue={maxValue} /> : null}
    </article>
  );
}
