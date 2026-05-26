export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    },
    ...options
  });

  const body = await response.json();
  if (!response.ok) {
    const message = body?.error?.message || "Request failed";
    throw new Error(message);
  }
  return body.data;
}

export const api = {
  me: () => apiRequest("/api/v1/auth/me"),
  login: (payload) => apiRequest("/api/v1/auth/login", { method: "POST", body: JSON.stringify(payload) }),
  logout: () => apiRequest("/api/v1/auth/logout", { method: "POST" }),
  overview: () => apiRequest("/api/v1/dashboard/overview"),
  alerts: (status = "") => apiRequest(`/api/v1/alerts${status ? `?status=${status}` : ""}`),
  logs: () => apiRequest("/api/v1/logs"),
  acknowledgeAlert: (id) => apiRequest(`/api/v1/alerts/${id}/acknowledge`, { method: "POST" }),
  resolveAlert: (id) => apiRequest(`/api/v1/alerts/${id}/resolve`, { method: "POST" }),
  reopenAlert: (id) => apiRequest(`/api/v1/alerts/${id}/reopen`, { method: "POST" }),
  closeAlert: (id) => apiRequest(`/api/v1/alerts/${id}/close`, { method: "POST" }),
  suggestion: (id) => apiRequest(`/api/v1/alerts/${id}/suggestion`),
  sntpSettings: () => apiRequest("/api/v1/settings/sntp"),
  saveSntpSettings: (payload) => apiRequest("/api/v1/settings/sntp", { method: "POST", body: JSON.stringify(payload) }),
  syncSntp: () => apiRequest("/api/v1/settings/sntp/sync", { method: "POST" }),
  smtpSettings: () => apiRequest("/api/v1/settings/smtp"),
  saveSmtpSettings: (payload) => apiRequest("/api/v1/settings/smtp", { method: "POST", body: JSON.stringify(payload) }),
  testSmtpSettings: (payload) => apiRequest("/api/v1/settings/smtp/test", { method: "POST", body: JSON.stringify(payload) }),
  telegramSettings: () => apiRequest("/api/v1/settings/telegram"),
  saveTelegramSettings: (payload) => apiRequest("/api/v1/settings/telegram", { method: "POST", body: JSON.stringify(payload) }),
  fetchTelegramChatId: (payload = {}) => apiRequest("/api/v1/settings/telegram/chat-id", { method: "POST", body: JSON.stringify(payload) }),
  testTelegram: () => apiRequest("/api/v1/settings/telegram/test", { method: "POST" }),
  monitoringSettings: () => apiRequest("/api/v1/settings/monitoring"),
  saveMonitoringSettings: (payload) => apiRequest("/api/v1/settings/monitoring", { method: "POST", body: JSON.stringify(payload) }),
  runAlertLabScenario: (scenario) => apiRequest("/api/v1/lab/alert-scenario", { method: "POST", body: JSON.stringify({ scenario }) })
};
