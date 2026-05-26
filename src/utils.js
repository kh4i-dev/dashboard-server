const viDateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  day: "2-digit",
  month: "2-digit"
});

export function formatTime(value) {
  if (!value) return "N/A";
  return viDateTimeFormatter.format(new Date(value));
}

export function formatUptime(seconds) {
  if (!Number.isFinite(seconds)) return "N/A";
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  return `${days}d ${hours}h`;
}

export function severityClass(severity) {
  if (severity === "critical") return "critical";
  if (severity === "warning") return "warning";
  if (severity === "info") return "info";
  return "normal";
}

export function percentStatus(value, warning, critical) {
  if (value >= critical) return "critical";
  if (value >= warning) return "warning";
  return "normal";
}

export function serviceHealth(services) {
  if (!services.length) return 0;
  const running = services.filter((service) => service.status === "running").length;
  return Math.round((running / services.length) * 100);
}

export function numericHistory(history, key) {
  return history.map((item) => Number(item[key]) || 0);
}

export function latestValue(history, key, fallback = 0) {
  if (!history.length) return fallback;
  return Number(history.at(-1)?.[key]) || fallback;
}

export function averageValue(values) {
  if (!values.length) return 0;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

export function trendPolyline(values, maxValue = 100, topPadding = 8, bottomPadding = 92) {
  const range = Math.max(maxValue, 1);
  return values
    .map((value, index) => {
      const x = (index / Math.max(values.length - 1, 1)) * 100;
      const y = bottomPadding - (Math.min(value, range) / range) * (bottomPadding - topPadding);
      return `${x},${y}`;
    })
    .join(" ");
}
