import express from "express";
import { randomBytes } from "node:crypto";
import nodemailer from "nodemailer";
import { db, insertLog, migrate, now, seed } from "./db.js";
import { evaluateFailedLogins, evaluateServer, evaluateSuccessfulLogin, upsertOpenAlert } from "./alertEngine.js";
import { collectLocalSnapshot } from "./liveCollector.js";
import { getSuggestion } from "./suggestions.js";
import { verifyPassword, encrypt, decrypt } from "./security.js";

const app = express();
const PORT = Number(process.env.PORT || 3000);
if (!process.env.COLLECTOR_API_KEY) {
  console.warn("[config] COLLECTOR_API_KEY is not set. Generated an in-memory key for this process.");
}
const COLLECTOR_API_KEY = process.env.COLLECTOR_API_KEY || randomBytes(24).toString("base64url");
const sessions = new Map();

migrate();
seed();
evaluateServer(1);

app.use(express.json({ limit: "256kb" }));
app.use((req, res, next) => {
  req.requestId = randomBytes(8).toString("hex");
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[API] ${req.method} ${req.originalUrl} - Status: ${res.statusCode} (${duration}ms)`);
  });
  next();
});

function sendData(req, res, data, meta = {}) {
  res.json({ data, error: null, meta: { requestId: req.requestId, timestamp: now(), ...meta } });
}

function sendError(req, res, status, code, message, details = {}) {
  res.status(status).json({ data: null, error: { code, message, details }, meta: { requestId: req.requestId, timestamp: now() } });
}

function getCookie(req, name) {
  const cookie = req.headers.cookie || "";
  const parts = cookie.split(";").map((part) => part.trim());
  const found = parts.find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    role: user.role,
    status: user.status,
    lastLoginAt: user.last_login_at
  };
}

function requireAuth(req, res, next) {
  const sessionId = getCookie(req, "sid");
  const session = sessionId ? sessions.get(sessionId) : null;
  if (!session || session.expiresAt < Date.now()) {
    return sendError(req, res, 401, "UNAUTHORIZED", "Authentication required");
  }
  const user = db.prepare("SELECT * FROM users WHERE id = ? AND status = 'active'").get(session.userId);
  if (!user) return sendError(req, res, 401, "UNAUTHORIZED", "Session user is inactive");
  session.expiresAt = Date.now() + 8 * 60 * 60_000;
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return sendError(req, res, 403, "FORBIDDEN", "Admin role required");
  }
  next();
}

function requireCollector(req, res, next) {
  if (req.headers["x-collector-key"] !== COLLECTOR_API_KEY) {
    return sendError(req, res, 401, "UNAUTHORIZED", "Collector key required");
  }
  next();
}

const SENSITIVE_KEYS = ["smtp.password", "telegram.bot_token"];

function getSetting(key, fallback = "") {
  const envKey = key.toUpperCase().replace(/\./g, "_");
  if (process.env[envKey] !== undefined) {
    return process.env[envKey];
  }

  const setting = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  let value = setting?.value ?? fallback;

  if (SENSITIVE_KEYS.includes(key)) {
    value = decrypt(value);
  }
  return value;
}

function setSetting(key, value, userId = null) {
  const timestamp = now();
  let writeValue = String(value);
  if (SENSITIVE_KEYS.includes(key)) {
    writeValue = encrypt(writeValue);
  }
  db.prepare("UPDATE settings SET value = ?, updated_by = ?, updated_at = ? WHERE key = ?").run(writeValue, userId, timestamp, key);
}

function maskSecret(value) {
  if (!value) return "";
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

function isValidHostname(value) {
  return typeof value === "string" && /^[a-zA-Z0-9.-]{3,253}$/.test(value) && !value.includes("..");
}

function publicSntpSettings() {
  return {
    server: getSetting("sntp.server", "pool.ntp.org"),
    intervalHours: Number(getSetting("sntp.interval_hours", "24")),
    lastSync: getSetting("sntp.last_sync", ""),
    offsetMs: Number(getSetting("sntp.offset_ms", "0")),
    status: getSetting("sntp.status", "unknown")
  };
}

function publicTelegramSettings(includeSensitive = false) {
  const token = getSetting("telegram.bot_token", "");
  return {
    enabled: getSetting("telegram.enabled", "false") === "true",
    botToken: includeSensitive ? token : maskSecret(token),
    botTokenConfigured: Boolean(token),
    chatId: getSetting("telegram.chat_id", "")
  };
}

function publicSmtpSettings(includeSensitive = false) {
  const pwd = getSetting("smtp.password", "");
  return {
    fromEmail: getSetting("smtp.from_email", ""),
    fromName: getSetting("smtp.from_name", ""),
    host: getSetting("smtp.host", ""),
    security: getSetting("smtp.security", "tls"),
    port: Number(getSetting("smtp.port", "587")),
    auth: getSetting("smtp.auth", "true") === "true",
    username: getSetting("smtp.username", ""),
    password: includeSensitive ? pwd : maskSecret(pwd),
    passwordConfigured: Boolean(pwd)
  };
}


function publicMonitoringSettings() {
  return {
    cpuCritical: Number(getSetting("threshold.cpu.critical", "90")),
    ramWarning: Number(getSetting("threshold.ram.warning", "85")),
    diskCritical: Number(getSetting("threshold.disk.critical", "95")),
    pollingIntervalSeconds: Number(getSetting("polling.interval_seconds", "3")),
    alertSensitivity: getSetting("alert.sensitivity", "standard"),
    alertRules: {
      cpuHigh: getSetting("alert.cpu.enabled", "true") === "true",
      ramHigh: getSetting("alert.ram.enabled", "true") === "true",
      diskFull: getSetting("alert.disk.enabled", "true") === "true",
      iisDown: getSetting("alert.service.iis.enabled", "true") === "true",
      sqlDown: getSetting("alert.service.sql.enabled", "true") === "true",
      networkTimeout: getSetting("alert.network.timeout.enabled", "true") === "true",
      firewallBlock: getSetting("alert.firewall.enabled", "true") === "true",
      failedLoginBurst: getSetting("alert.auth.bruteforce.enabled", "true") === "true",
      unusualLoginIp: getSetting("alert.auth.unusual_ip.enabled", "true") === "true",
      botnetScan: getSetting("alert.security.botnet_scan.enabled", "true") === "true"
    },
    demoMode: getSetting("demo.mode", "false") === "true",
    demoScenario: getSetting("demo.scenario", "normal")
  };
}

function normalizeAlertRules(alertRules = {}) {
  const current = publicMonitoringSettings().alertRules;
  return {
    cpuHigh: alertRules.cpuHigh ?? current.cpuHigh,
    ramHigh: alertRules.ramHigh ?? current.ramHigh,
    diskFull: alertRules.diskFull ?? current.diskFull,
    iisDown: alertRules.iisDown ?? current.iisDown,
    sqlDown: alertRules.sqlDown ?? current.sqlDown,
    networkTimeout: alertRules.networkTimeout ?? current.networkTimeout,
    firewallBlock: alertRules.firewallBlock ?? current.firewallBlock,
    failedLoginBurst: alertRules.failedLoginBurst ?? current.failedLoginBurst,
    unusualLoginIp: alertRules.unusualLoginIp ?? current.unusualLoginIp,
    botnetScan: alertRules.botnetScan ?? current.botnetScan
  };
}

function saveAlertRules(alertRules, userId) {
  setSetting("alert.cpu.enabled", Boolean(alertRules.cpuHigh), userId);
  setSetting("alert.ram.enabled", Boolean(alertRules.ramHigh), userId);
  setSetting("alert.disk.enabled", Boolean(alertRules.diskFull), userId);
  setSetting("alert.service.iis.enabled", Boolean(alertRules.iisDown), userId);
  setSetting("alert.service.sql.enabled", Boolean(alertRules.sqlDown), userId);
  setSetting("alert.network.timeout.enabled", Boolean(alertRules.networkTimeout), userId);
  setSetting("alert.firewall.enabled", Boolean(alertRules.firewallBlock), userId);
  setSetting("alert.auth.bruteforce.enabled", Boolean(alertRules.failedLoginBurst), userId);
  setSetting("alert.auth.unusual_ip.enabled", Boolean(alertRules.unusualLoginIp), userId);
  setSetting("alert.security.botnet_scan.enabled", Boolean(alertRules.botnetScan), userId);
}

function resolveDisabledAlertRules(alertRules) {
  const timestamp = now();
  const resolveByType = db.prepare("UPDATE alerts SET status = 'resolved', resolved_at = ?, updated_at = ? WHERE type = ? AND status IN ('open', 'acknowledged')");
  const resolveByTypeRef = db.prepare("UPDATE alerts SET status = 'resolved', resolved_at = ?, updated_at = ? WHERE type = ? AND source_ref = ? AND status IN ('open', 'acknowledged')");

  if (!alertRules.cpuHigh) resolveByType.run(timestamp, timestamp, "cpu_high");
  if (!alertRules.ramHigh) resolveByType.run(timestamp, timestamp, "ram_high");
  if (!alertRules.diskFull) resolveByType.run(timestamp, timestamp, "disk_full");
  if (!alertRules.iisDown) resolveByTypeRef.run(timestamp, timestamp, "service_down", "W3SVC");
  if (!alertRules.sqlDown) resolveByTypeRef.run(timestamp, timestamp, "service_down", "MSSQLSERVER");
  if (!alertRules.networkTimeout) resolveByType.run(timestamp, timestamp, "network_timeout");
  if (!alertRules.firewallBlock) resolveByType.run(timestamp, timestamp, "firewall_block");
  if (!alertRules.failedLoginBurst) resolveByType.run(timestamp, timestamp, "login_bruteforce");
  if (!alertRules.unusualLoginIp) resolveByType.run(timestamp, timestamp, "unusual_login_ip");
  if (!alertRules.botnetScan) resolveByType.run(timestamp, timestamp, "botnet_scan");
}

function publicSecurityPosture() {
  return {
    firewallPosture: getSetting("security.firewall_posture", "Restricted"),
    httpsStatus: getSetting("security.https_status", "Lab mode"),
    suspiciousIps: Number(getSetting("security.suspicious_ips", "0")),
    accountLockout: getSetting("security.account_lockout", "Enabled")
  };
}

function syncLocalSnapshot() {
  if (getSetting("demo.mode", "false") === "true") {
    simulateCollectorCycle(getSetting("demo.scenario", "normal"));
    return;
  }

  const snapshot = collectLocalSnapshot();
  const timestamp = now();

  db.prepare(`
    UPDATE servers
    SET name = ?, hostname = ?, ip_address = ?, os_version = ?, environment = ?, status = ?, last_seen_at = ?, updated_at = ?
    WHERE id = 1
  `).run(
    snapshot.server.name,
    snapshot.server.hostname,
    snapshot.server.ipAddress,
    snapshot.server.osVersion,
    snapshot.server.environment,
    snapshot.server.status,
    timestamp,
    timestamp
  );

  db.prepare(`
    INSERT INTO metrics (
      server_id, cpu_percent, ram_percent, ram_used_mb, ram_total_mb, disk_percent,
      network_rx_kbps, network_tx_kbps, uptime_seconds, collected_at, created_at
    )
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    snapshot.metric.cpuPercent,
    snapshot.metric.ramPercent,
    snapshot.metric.ramUsedMb,
    snapshot.metric.ramTotalMb,
    snapshot.metric.diskPercent,
    snapshot.metric.networkRxKbps,
    snapshot.metric.networkTxKbps,
    snapshot.metric.uptimeSeconds,
    timestamp,
    timestamp
  );

  const upsert = db.prepare(`
    INSERT INTO services (server_id, service_name, display_name, status, startup_type, last_checked_at, created_at, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(server_id, service_name) DO UPDATE SET
      display_name = excluded.display_name,
      status = excluded.status,
      startup_type = excluded.startup_type,
      last_checked_at = excluded.last_checked_at,
      updated_at = excluded.updated_at
  `);

  for (const service of snapshot.services) {
    upsert.run(service.serviceName, service.displayName, service.status, service.startupType, timestamp, timestamp, timestamp);
  }

  evaluateServer(1);
}

function insertDemoMetric({ cpu, ram, disk, rx, tx }) {
  const timestamp = now();
  db.prepare(`
    INSERT INTO metrics (server_id, cpu_percent, ram_percent, ram_used_mb, ram_total_mb, disk_percent, network_rx_kbps, network_tx_kbps, uptime_seconds, collected_at, created_at)
    VALUES (1, ?, ?, ?, 16384, ?, ?, ?, 180000, ?, ?)
  `).run(cpu, ram, Math.round((ram / 100) * 16384), disk, rx, tx, timestamp, timestamp);
  db.prepare("UPDATE servers SET status = 'online', last_seen_at = ?, updated_at = ? WHERE id = 1").run(timestamp, timestamp);
}

function simulateCollectorCycle(scenario) {
  const jitter = Math.round(Math.random() * 8);
  if (scenario === "cpu_overload") {
    insertDemoMetric({ cpu: 92 + jitter, ram: 72 + jitter, disk: 70, rx: 420 + jitter * 8, tx: 360 + jitter * 6 });
  } else if (scenario === "disk_full") {
    insertDemoMetric({ cpu: 42 + jitter, ram: 70, disk: 96 + Math.min(jitter, 3), rx: 180, tx: 120 });
  } else if (scenario === "network_timeout") {
    insertDemoMetric({ cpu: 35 + jitter, ram: 65, disk: 68, rx: 0, tx: 0 });
    upsertOpenAlert({ serverId: 1, type: "network_timeout", severity: "critical", title: "Network timeout detected", message: "Collector heartbeat or ping simulation timed out.", source: "network", sourceRef: "ping" });
  } else if (scenario === "firewall_block") {
    insertDemoMetric({ cpu: 38 + jitter, ram: 66, disk: 68, rx: 12, tx: 6 });
    upsertOpenAlert({ serverId: 1, type: "firewall_block", severity: "critical", title: "Firewall blocked web port", message: "Simulated firewall rule blocked inbound HTTP traffic.", source: "security", sourceRef: "tcp/80" });
  } else {
    insertDemoMetric({ cpu: 30 + jitter, ram: 58 + jitter, disk: 68, rx: 140 + jitter * 5, tx: 95 + jitter * 4 });
  }

  evaluateServer(1);
}

app.post("/api/v1/auth/login", (req, res) => {
  const { username, password } = req.body || {};
  const ipAddress = req.ip;
  if (typeof username !== "string" || typeof password !== "string" || username.length > 100 || password.length > 200) {
    return sendError(req, res, 400, "VALIDATION_ERROR", "Username and password are required");
  }

  const user = db.prepare("SELECT * FROM users WHERE username = ? AND status = 'active'").get(username);
  if (!user || !verifyPassword(password, user.password_hash)) {
    insertLog({
      level: "warning",
      source: "auth",
      eventType: "login_failed",
      message: `Đăng nhập thất bại cho tài khoản ${username}`,
      ipAddress,
      metadata: { username }
    });
    evaluateFailedLogins(ipAddress, username);
    return sendError(req, res, 401, "UNAUTHORIZED", "Invalid username or password");
  }

  const timestamp = now();
  db.prepare("UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?").run(timestamp, timestamp, user.id);
  insertLog({ userId: user.id, level: "info", source: "auth", eventType: "login_success", message: `Quản trị viên ${username} đăng nhập thành công`, ipAddress });

  evaluateSuccessfulLogin({ userId: user.id, username, ipAddress });
  const sessionId = randomBytes(32).toString("hex");
  sessions.set(sessionId, { userId: user.id, expiresAt: Date.now() + 8 * 60 * 60_000 });
  res.setHeader("Set-Cookie", `sid=${encodeURIComponent(sessionId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800`);
  return sendData(req, res, { user: publicUser({ ...user, last_login_at: timestamp }) });
});

app.post("/api/v1/auth/logout", requireAuth, (req, res) => {
  const sessionId = getCookie(req, "sid");
  if (sessionId) sessions.delete(sessionId);
  insertLog({ userId: req.user.id, level: "info", source: "auth", eventType: "logout", message: `Quản trị viên ${req.user.username} đã đăng xuất`, ipAddress: req.ip });
  res.setHeader("Set-Cookie", "sid=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0");
  sendData(req, res, { ok: true });
});

app.get("/api/v1/auth/me", requireAuth, (req, res) => {
  sendData(req, res, { user: publicUser(req.user) });
});

app.get("/api/v1/dashboard/health", requireAuth, (req, res) => {
  const server = db.prepare("SELECT * FROM servers ORDER BY id LIMIT 1").get();
  const openAlerts = db.prepare("SELECT COUNT(*) AS count FROM alerts WHERE status IN ('open', 'acknowledged')").get().count;
  sendData(req, res, {
    status: "ok",
    database: "connected",
    serverStatus: server?.status ?? "unknown",
    lastCollectorHeartbeat: server?.last_seen_at ?? null,
    openAlerts
  });
});

app.get("/api/v1/dashboard/overview", requireAuth, (req, res) => {
  syncLocalSnapshot();
  const server = db.prepare("SELECT * FROM servers ORDER BY id LIMIT 1").get();
  const metric = db.prepare("SELECT * FROM metrics WHERE server_id = ? ORDER BY collected_at DESC LIMIT 1").get(server.id);
  const history = db.prepare("SELECT * FROM metrics WHERE server_id = ? ORDER BY collected_at DESC LIMIT 12").all(server.id).reverse();
  const services = db.prepare("SELECT * FROM services WHERE server_id = ? ORDER BY service_name").all(server.id);
  const alerts = db.prepare("SELECT * FROM alerts WHERE server_id = ? ORDER BY opened_at DESC LIMIT 8").all(server.id);
  const logs = db.prepare("SELECT * FROM logs ORDER BY occurred_at DESC LIMIT 8").all();
  sendData(req, res, { server, metric, history, services, alerts, logs });
});

app.get("/api/v1/servers", requireAuth, (req, res) => {
  sendData(req, res, { servers: db.prepare("SELECT * FROM servers ORDER BY id").all() });
});

app.get("/api/v1/servers/:id", requireAuth, (req, res) => {
  const server = db.prepare("SELECT * FROM servers WHERE id = ?").get(req.params.id);
  if (!server) return sendError(req, res, 404, "NOT_FOUND", "Server not found");
  sendData(req, res, { server });
});

app.get("/api/v1/servers/:id/metrics/latest", requireAuth, (req, res) => {
  const metric = db.prepare("SELECT * FROM metrics WHERE server_id = ? ORDER BY collected_at DESC LIMIT 1").get(req.params.id);
  sendData(req, res, { metric: metric ?? null });
});

app.get("/api/v1/servers/:id/metrics/history", requireAuth, (req, res) => {
  const limit = Math.min(Number(req.query.limit || 60), 240);
  const metrics = db.prepare("SELECT * FROM metrics WHERE server_id = ? ORDER BY collected_at DESC LIMIT ?").all(req.params.id, limit).reverse();
  sendData(req, res, { metrics });
});

app.get("/api/v1/servers/:id/services", requireAuth, (req, res) => {
  const services = db.prepare("SELECT * FROM services WHERE server_id = ? ORDER BY service_name").all(req.params.id);
  sendData(req, res, { services });
});

app.get("/api/v1/alerts", requireAuth, (req, res) => {
  const { status, severity } = req.query;
  const conditions = [];
  const params = [];
  if (status) {
    conditions.push("status = ?");
    params.push(status);
  }
  if (severity) {
    conditions.push("severity = ?");
    params.push(severity);
  }
  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const alerts = db.prepare(`SELECT * FROM alerts ${where} ORDER BY opened_at DESC LIMIT 100`).all(...params);
  sendData(req, res, { alerts });
});

app.get("/api/v1/alerts/:id", requireAuth, (req, res) => {
  const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(req.params.id);
  if (!alert) return sendError(req, res, 404, "NOT_FOUND", "Alert not found");
  sendData(req, res, { alert });
});

app.post("/api/v1/alerts/:id/acknowledge", requireAuth, requireAdmin, (req, res) => {
  const timestamp = now();
  const result = db.prepare(`
    UPDATE alerts
    SET status = 'acknowledged', acknowledged_at = ?, acknowledged_by = ?, updated_at = ?
    WHERE id = ? AND status = 'open'
  `).run(timestamp, req.user.id, timestamp, req.params.id);
  if (result.changes === 0) return sendError(req, res, 409, "CONFLICT", "Alert cannot be acknowledged");
  insertLog({ userId: req.user.id, level: "info", source: "alert", eventType: "alert_acknowledged", message: `Sự cố ${req.params.id} đã được xác nhận nhận lỗi`, ipAddress: req.ip });
  sendData(req, res, { ok: true });
});

app.post("/api/v1/alerts/:id/resolve", requireAuth, requireAdmin, (req, res) => {
  const timestamp = now();
  const result = db.prepare(`
    UPDATE alerts
    SET status = 'resolved', resolved_at = ?, updated_at = ?
    WHERE id = ? AND status IN ('open', 'acknowledged')
  `).run(timestamp, timestamp, req.params.id);
  if (result.changes === 0) return sendError(req, res, 409, "CONFLICT", "Alert cannot be resolved");
  insertLog({ userId: req.user.id, level: "info", source: "alert", eventType: "alert_resolved_manual", message: `Sự cố ${req.params.id} đã được xử lý thủ công thành công`, ipAddress: req.ip });
  sendData(req, res, { ok: true });
});

app.post("/api/v1/alerts/:id/reopen", requireAuth, requireAdmin, (req, res) => {
  const timestamp = now();
  const result = db.prepare(`
    UPDATE alerts
    SET status = 'open', resolved_at = NULL, updated_at = ?
    WHERE id = ? AND status IN ('resolved', 'closed')
  `).run(timestamp, req.params.id);
  if (result.changes === 0) return sendError(req, res, 409, "CONFLICT", "Alert cannot be reopened");
  insertLog({ userId: req.user.id, level: "warning", source: "alert", eventType: "alert_reopened", message: `Sự cố ${req.params.id} đã được mở lại`, ipAddress: req.ip });
  sendData(req, res, { ok: true });
});

app.post("/api/v1/alerts/:id/close", requireAuth, requireAdmin, (req, res) => {
  const timestamp = now();
  const result = db.prepare(`
    UPDATE alerts
    SET status = 'closed', updated_at = ?
    WHERE id = ? AND status = 'resolved'
  `).run(timestamp, req.params.id);
  if (result.changes === 0) return sendError(req, res, 409, "CONFLICT", "Alert cannot be closed");
  insertLog({ userId: req.user.id, level: "info", source: "alert", eventType: "alert_closed", message: `Sự cố ${req.params.id} đã được đóng lại`, ipAddress: req.ip });
  sendData(req, res, { ok: true });
});

app.get("/api/v1/alerts/:id/suggestion", requireAuth, (req, res) => {
  const alert = db.prepare("SELECT * FROM alerts WHERE id = ?").get(req.params.id);
  if (!alert) return sendError(req, res, 404, "NOT_FOUND", "Alert not found");
  sendData(req, res, { suggestion: getSuggestion(alert) });
});

app.get("/api/v1/logs", requireAuth, (req, res) => {
  const logs = db.prepare("SELECT * FROM logs ORDER BY occurred_at DESC LIMIT 100").all();
  sendData(req, res, { logs });
});

app.get("/api/v1/users", requireAuth, requireAdmin, (req, res) => {
  const users = db.prepare("SELECT id, username, email, role, status, last_login_at, created_at, updated_at FROM users ORDER BY username").all();
  sendData(req, res, { users });
});

app.get("/api/v1/settings/sntp", requireAuth, (req, res) => {
  sendData(req, res, { sntp: publicSntpSettings() });
});

app.post("/api/v1/settings/sntp", requireAuth, requireAdmin, (req, res) => {
  const { server, intervalHours } = req.body || {};
  const normalizedInterval = Number(intervalHours);
  if (!isValidHostname(server) || !Number.isFinite(normalizedInterval) || normalizedInterval < 1 || normalizedInterval > 168) {
    return sendError(req, res, 400, "VALIDATION_ERROR", "Invalid SNTP settings");
  }
  setSetting("sntp.server", server, req.user.id);
  setSetting("sntp.interval_hours", normalizedInterval, req.user.id);
  insertLog({ userId: req.user.id, level: "info", source: "settings", eventType: "sntp_updated", message: "SNTP settings updated", ipAddress: req.ip });
  sendData(req, res, { sntp: publicSntpSettings() });
});

app.post("/api/v1/settings/sntp/sync", requireAuth, requireAdmin, (req, res) => {
  const server = getSetting("sntp.server", "pool.ntp.org");
  if (!isValidHostname(server)) {
    return sendError(req, res, 400, "VALIDATION_ERROR", "Invalid SNTP server hostname");
  }
  const offsetMs = Math.round((Math.random() * 80 - 40) * 100) / 100;
  setSetting("sntp.last_sync", now(), req.user.id);
  setSetting("sntp.offset_ms", offsetMs, req.user.id);
  setSetting("sntp.status", "success", req.user.id);
  insertLog({ userId: req.user.id, level: "info", source: "settings", eventType: "sntp_sync", message: `SNTP sync simulated against ${server}`, ipAddress: req.ip, metadata: { server, offsetMs } });
  sendData(req, res, { sntp: publicSntpSettings(), simulated: true });
});

app.get("/api/v1/settings/smtp", requireAuth, (req, res) => {
  sendData(req, res, { smtp: publicSmtpSettings(false) });
});

app.post("/api/v1/settings/smtp", requireAuth, requireAdmin, (req, res) => {
  const { fromEmail, fromName, host, security, port, auth, username, password } = req.body || {};
  if (
    typeof fromEmail !== "string" ||
    typeof fromName !== "string" ||
    typeof host !== "string" ||
    !["none", "ssl", "tls"].includes(security) ||
    !Number.isFinite(Number(port)) ||
    typeof auth !== "boolean" ||
    typeof username !== "string" ||
    (password && typeof password !== "string")
  ) {
    return sendError(req, res, 400, "VALIDATION_ERROR", "Invalid SMTP settings");
  }

  setSetting("smtp.from_email", fromEmail.trim(), req.user.id);
  setSetting("smtp.from_name", fromName.trim(), req.user.id);
  setSetting("smtp.host", host.trim(), req.user.id);
  setSetting("smtp.security", security, req.user.id);
  setSetting("smtp.port", Number(port), req.user.id);
  setSetting("smtp.auth", auth, req.user.id);
  setSetting("smtp.username", username.trim(), req.user.id);

  if (password && !password.includes("*")) {
    setSetting("smtp.password", password.trim(), req.user.id);
  }

  insertLog({ userId: req.user.id, level: "info", source: "settings", eventType: "smtp_updated", message: "SMTP settings updated", ipAddress: req.ip });
  sendData(req, res, { smtp: publicSmtpSettings(false) });
});

app.post("/api/v1/settings/smtp/test", requireAuth, requireAdmin, async (req, res) => {
  const { to, subject } = req.body || {};
  if (typeof to !== "string" || !to.includes("@") || typeof subject !== "string") {
    return sendError(req, res, 400, "VALIDATION_ERROR", "Recipient email ('to') and subject are required");
  }

  const host = getSetting("smtp.host", "smtp.gmail.com");
  const port = Number(getSetting("smtp.port", "587"));
  const security = getSetting("smtp.security", "tls");
  const auth = getSetting("smtp.auth", "true") === "true";
  const username = getSetting("smtp.username", "");
  const password = getSetting("smtp.password", "");
  const fromEmail = getSetting("smtp.from_email", "");
  const fromName = getSetting("smtp.from_name", "GrafOps");

  try {
    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: security === "ssl", // true for 465, false for other ports
      auth: auth ? {
        user: username,
        pass: password
      } : undefined,
      tls: {
        rejectUnauthorized: false
      }
    });

    await transporter.sendMail({
      from: `"${fromName}" <${fromEmail}>`,
      to,
      subject,
      text: `Đây là thư thử nghiệm được gửi từ hệ thống giám sát GrafOps Node.\n\nCấu hình kết nối:\n- SMTP Host: ${host}\n- Cổng: ${port}\n- Bảo mật: ${security.toUpperCase()}\n- Người gửi: ${fromName} <${fromEmail}>`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px;">
          <h2 style="color: #2563eb; margin-top: 0;">Kiểm tra cấu hình SMTP thành công!</h2>
          <p>Xin chào,</p>
          <p>Thư này được gửi để xác nhận rằng cấu hình SMTP trên hệ thống giám sát <strong>GrafOps Node</strong> của bạn đang hoạt động hoàn hảo.</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <h3 style="color: #374151;">Thông số kết nối:</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 6px 0; color: #6b7280; width: 140px;"><strong>SMTP Host:</strong></td>
              <td style="padding: 6px 0; color: #1f2937;">${host}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;"><strong>Cổng kết nối:</strong></td>
              <td style="padding: 6px 0; color: #1f2937;">${port}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;"><strong>Phương thức bảo mật:</strong></td>
              <td style="padding: 6px 0; color: #1f2937;">${security.toUpperCase()}</td>
            </tr>
            <tr>
              <td style="padding: 6px 0; color: #6b7280;"><strong>Tài khoản gửi:</strong></td>
              <td style="padding: 6px 0; color: #1f2937;">${fromEmail}</td>
            </tr>
          </table>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0;">Đây là email được tạo tự động từ hệ thống GrafOps Node. Vui lòng không trả lời thư này.</p>
        </div>
      `
    });

    insertLog({
      userId: req.user.id,
      level: "info",
      source: "settings",
      eventType: "smtp_test_success",
      message: `Đã gửi email thử nghiệm thực tế thành công tới ${to}`,
      ipAddress: req.ip,
      metadata: { to, subject, host, fromEmail }
    });

    sendData(req, res, { ok: true, message: `Thư thử nghiệm thực tế đã được gửi thành công tới ${to}!` });
  } catch (error) {
    insertLog({
      userId: req.user.id,
      level: "warning",
      source: "settings",
      eventType: "smtp_test_failed",
      message: `Gửi email thử nghiệm thực tế thất bại tới ${to}: ${error.message}`,
      ipAddress: req.ip,
      metadata: { to, subject, host, fromEmail, reason: error.message }
    });

    sendError(req, res, 502, "BAD_GATEWAY", `Gửi email thử nghiệm thất bại: ${error.message}`, { reason: error.message });
  }
});


app.get("/api/v1/settings/telegram", requireAuth, requireAdmin, (req, res) => {
  sendData(req, res, { telegram: publicTelegramSettings(false) });
});

app.post("/api/v1/settings/telegram", requireAuth, requireAdmin, (req, res) => {
  const { enabled, botToken, chatId } = req.body || {};
  if (typeof enabled !== "boolean" || typeof chatId !== "string" || chatId.length > 80 || (botToken && typeof botToken !== "string")) {
    return sendError(req, res, 400, "VALIDATION_ERROR", "Invalid Telegram settings");
  }
  setSetting("telegram.enabled", enabled, req.user.id);
  if (botToken && !botToken.includes("*")) {
    setSetting("telegram.bot_token", botToken.trim(), req.user.id);
  }
  setSetting("telegram.chat_id", chatId.trim(), req.user.id);
  insertLog({ userId: req.user.id, level: "info", source: "settings", eventType: "telegram_updated", message: "Telegram settings updated", ipAddress: req.ip });
  sendData(req, res, { telegram: publicTelegramSettings(false) });
});

app.post("/api/v1/settings/telegram/chat-id", requireAuth, requireAdmin, async (req, res) => {
  const tokenInput = typeof req.body?.botToken === "string" ? req.body.botToken.trim() : "";
  const token = tokenInput && !tokenInput.includes("*") ? tokenInput : getSetting("telegram.bot_token", "");
  if (!token) {
    return sendError(req, res, 400, "VALIDATION_ERROR", "Telegram bot token is required before fetching chat id");
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/getUpdates`);
    const body = await response.json();
    if (!response.ok || body.ok !== true) {
      throw new Error(body?.description || `Telegram HTTP ${response.status}`);
    }

    const updates = Array.isArray(body.result) ? body.result : [];
    const chats = updates
      .map((update) => update.message?.chat || update.channel_post?.chat || update.my_chat_member?.chat || update.chat_member?.chat)
      .filter(Boolean);
    const chat = chats.at(-1);
    if (!chat?.id) {
      return sendError(req, res, 404, "NOT_FOUND", "No Telegram chat found. Send a message to the bot or add it to the group first.");
    }

    insertLog({ userId: req.user.id, level: "info", source: "settings", eventType: "telegram_chat_id_detected", message: `Telegram chat id detected: ${chat.id}`, ipAddress: req.ip });
    sendData(req, res, { chatId: String(chat.id), title: chat.title || chat.username || chat.first_name || "" });
  } catch (error) {
    insertLog({ userId: req.user.id, level: "warning", source: "settings", eventType: "telegram_chat_id_failed", message: "Telegram chat id detection failed", ipAddress: req.ip, metadata: { reason: error.message } });
    sendError(req, res, 502, "BAD_GATEWAY", `Telegram chat id lookup failed: ${error.message}`, { reason: error.message });
  }
});

app.post("/api/v1/settings/telegram/test", requireAuth, requireAdmin, async (req, res) => {
  const token = getSetting("telegram.bot_token", "");
  const chatId = getSetting("telegram.chat_id", "");
  if (!token || !chatId) {
    return sendError(req, res, 400, "VALIDATION_ERROR", "Telegram bot token and chat id are required");
  }
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: "NetOps Lab test alert: dashboard notification channel is configured." })
    });
    if (!response.ok) {
      throw new Error(`Telegram HTTP ${response.status}`);
    }
    insertLog({ userId: req.user.id, level: "info", source: "settings", eventType: "telegram_test", message: "Telegram test message sent", ipAddress: req.ip });
    sendData(req, res, { ok: true });
  } catch (error) {
    insertLog({ userId: req.user.id, level: "warning", source: "settings", eventType: "telegram_test_failed", message: "Telegram test message failed", ipAddress: req.ip, metadata: { reason: error.message } });
    sendError(req, res, 503, "SERVICE_UNAVAILABLE", "Telegram test failed", { reason: error.message });
  }
});

app.get("/api/v1/settings/monitoring", requireAuth, (req, res) => {
  sendData(req, res, { monitoring: publicMonitoringSettings(), security: publicSecurityPosture() });
});

app.post("/api/v1/settings/monitoring", requireAuth, requireAdmin, (req, res) => {
  const { cpuCritical, ramWarning, diskCritical, pollingIntervalSeconds, alertSensitivity, alertRules, demoMode } = req.body || {};
  const cpu = Number(cpuCritical);
  const ram = Number(ramWarning);
  const disk = Number(diskCritical);
  const polling = Number(pollingIntervalSeconds);
  const sensitivity = ["relaxed", "standard", "strict"].includes(alertSensitivity) ? alertSensitivity : "standard";
  const nextAlertRules = normalizeAlertRules(alertRules);
  const nextDemoMode = demoMode === undefined ? getSetting("demo.mode", "false") === "true" : demoMode === true;
  if (![cpu, ram, disk, polling].every(Number.isFinite) || cpu < 1 || cpu > 100 || ram < 1 || ram > 100 || disk < 1 || disk > 100 || polling < 3 || polling > 60) {
    return sendError(req, res, 400, "VALIDATION_ERROR", "Invalid monitoring settings");
  }
  setSetting("threshold.cpu.critical", cpu, req.user.id);
  setSetting("threshold.ram.warning", ram, req.user.id);
  setSetting("threshold.disk.critical", disk, req.user.id);
  setSetting("polling.interval_seconds", polling, req.user.id);
  setSetting("alert.sensitivity", sensitivity, req.user.id);
  saveAlertRules(nextAlertRules, req.user.id);
  resolveDisabledAlertRules(nextAlertRules);
  if (nextDemoMode) {
    setSetting("demo.mode", "true", req.user.id);
  } else {
    applyLabScenario({ scenario: "normal", user: req.user, ipAddress: req.ip });
  }
  insertLog({ userId: req.user.id, level: "info", source: "settings", eventType: "monitoring_updated", message: "Monitoring settings updated", ipAddress: req.ip });
  evaluateServer(1);
  sendData(req, res, { monitoring: publicMonitoringSettings(), security: publicSecurityPosture() });
});

app.post("/api/v1/metrics/batch", requireCollector, (req, res) => {
  const metrics = Array.isArray(req.body?.metrics) ? req.body.metrics : [];
  const timestamp = now();
  const insert = db.prepare(`
    INSERT INTO metrics (
      server_id, cpu_percent, ram_percent, ram_used_mb, ram_total_mb, disk_percent,
      network_rx_kbps, network_tx_kbps, uptime_seconds, collected_at, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const metric of metrics) {
    insert.run(
      metric.serverId,
      metric.cpuPercent,
      metric.ramPercent,
      metric.ramUsedMb ?? null,
      metric.ramTotalMb ?? null,
      metric.diskPercent,
      metric.networkRxKbps ?? null,
      metric.networkTxKbps ?? null,
      metric.uptimeSeconds ?? null,
      metric.collectedAt || timestamp,
      timestamp
    );
    db.prepare("UPDATE servers SET status = 'online', last_seen_at = ?, updated_at = ? WHERE id = ?").run(timestamp, timestamp, metric.serverId);
    evaluateServer(metric.serverId);
  }
  sendData(req, res, { inserted: metrics.length });
});

app.post("/api/v1/services/status/batch", requireCollector, (req, res) => {
  const services = Array.isArray(req.body?.services) ? req.body.services : [];
  const timestamp = now();
  const upsert = db.prepare(`
    INSERT INTO services (server_id, service_name, display_name, status, startup_type, last_checked_at, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(server_id, service_name) DO UPDATE SET
      display_name = excluded.display_name,
      status = excluded.status,
      startup_type = excluded.startup_type,
      last_checked_at = excluded.last_checked_at,
      updated_at = excluded.updated_at
  `);

  for (const service of services) {
    upsert.run(service.serverId, service.serviceName, service.displayName, service.status, service.startupType ?? null, timestamp, timestamp, timestamp);
    evaluateServer(service.serverId);
  }
  sendData(req, res, { upserted: services.length });
});

function resolveLabAlerts(timestamp) {
  db.prepare(`
    UPDATE alerts
    SET status = 'resolved', resolved_at = ?, updated_at = ?
    WHERE type IN (
      'cpu_high',
      'ram_high',
      'disk_full',
      'service_down',
      'firewall_block',
      'network_timeout',
      'login_bruteforce',
      'unusual_login_ip',
      'botnet_scan'
    )
    AND status IN ('open', 'acknowledged')
  `).run(timestamp, timestamp);
}

function applyLabScenario({ scenario, user, ipAddress }) {
  const timestamp = now();

  if (scenario === "normal") {
    setSetting("demo.mode", "false", user.id);
    setSetting("demo.scenario", "normal", user.id);
    setSetting("security.firewall_posture", "Restricted", user.id);
    setSetting("security.suspicious_ips", "0", user.id);
    db.prepare("UPDATE services SET status = 'running', last_checked_at = ?, updated_at = ? WHERE server_id = 1").run(timestamp, timestamp);
    db.prepare("UPDATE servers SET status = 'online', last_seen_at = ?, updated_at = ? WHERE id = 1").run(timestamp, timestamp);
    db.prepare(`
      INSERT INTO metrics (server_id, cpu_percent, ram_percent, ram_used_mb, ram_total_mb, disk_percent, network_rx_kbps, network_tx_kbps, uptime_seconds, collected_at, created_at)
      VALUES (1, 34, 62, 10158, 16384, 68, 144, 98, 180000, ?, ?)
    `).run(timestamp, timestamp);
    resolveLabAlerts(timestamp);
    evaluateServer(1);
    return;
  }

  setSetting("demo.mode", "true", user.id);
  setSetting("demo.scenario", scenario, user.id);

  if (scenario === "cpu_overload") {
    insertDemoMetric({ cpu: 96, ram: 73, disk: 70, rx: 420, tx: 360 });
  } else if (scenario === "disk_full") {
    insertDemoMetric({ cpu: 42, ram: 70, disk: 97, rx: 180, tx: 120 });
  } else if (scenario === "ram_pressure") {
    insertDemoMetric({ cpu: 48, ram: 94, disk: 72, rx: 210, tx: 166 });
  } else if (scenario === "iis_down") {
    db.prepare("UPDATE services SET status = 'stopped', last_checked_at = ?, updated_at = ? WHERE server_id = 1 AND service_name = 'W3SVC'").run(timestamp, timestamp);
  } else if (scenario === "sql_down") {
    db.prepare("UPDATE services SET status = 'stopped', last_checked_at = ?, updated_at = ? WHERE server_id = 1 AND service_name = 'MSSQLSERVER'").run(timestamp, timestamp);
  } else if (scenario === "firewall_block") {
    insertDemoMetric({ cpu: 38, ram: 66, disk: 68, rx: 12, tx: 6 });
    upsertOpenAlert({ serverId: 1, type: "firewall_block", severity: "critical", title: "Firewall blocked web port", message: "Inbound HTTP/HTTPS traffic appears blocked by firewall policy.", source: "security", sourceRef: "tcp/80-443" });
    setSetting("security.firewall_posture", "Web ports blocked", user.id);
    setSetting("security.suspicious_ips", "1", user.id);
  } else if (scenario === "network_timeout") {
    db.prepare("UPDATE servers SET status = 'offline', updated_at = ? WHERE id = 1").run(timestamp);
    insertDemoMetric({ cpu: 35, ram: 65, disk: 68, rx: 0, tx: 0 });
    upsertOpenAlert({ serverId: 1, type: "network_timeout", severity: "critical", title: "Network timeout detected", message: "Collector heartbeat timed out and network throughput dropped to zero.", source: "network", sourceRef: "collector-heartbeat" });
  } else if (scenario === "failed_login_burst") {
    const sourceIp = "203.0.113.45";
    for (let index = 0; index < 6; index += 1) {
      insertLog({ userId: user.id, level: "warning", source: "auth", eventType: "login_failed", message: "Sai mật khẩu liên tiếp cho tài khoản admin", ipAddress: sourceIp, metadata: { username: "admin", labScenario: scenario, attempt: index + 1 } });
    }
    evaluateFailedLogins(sourceIp, "admin");
  } else if (scenario === "unusual_login_ip") {
    const sourceIp = "198.51.100.77";
    insertLog({ userId: user.id, level: "warning", source: "auth", eventType: "login_success", message: "Đăng nhập thành công từ IP khác thường", ipAddress: sourceIp, metadata: { username: user.username, labScenario: scenario } });
    upsertOpenAlert({ serverId: 1, type: "unusual_login_ip", severity: "warning", title: "Đăng nhập từ IP lạ", message: `Tài khoản ${user.username} đăng nhập từ ${sourceIp}, khác dải IP vận hành thường ngày.`, source: "security", sourceRef: `${user.username}:${sourceIp}` });
  } else if (scenario === "botnet_scan") {
    const sources = ["198.51.100.10", "198.51.100.11", "198.51.100.12", "203.0.113.80", "203.0.113.81", "203.0.113.82", "192.0.2.14", "192.0.2.15"];
    for (const sourceIp of sources) {
      insertLog({ level: "warning", source: "security", eventType: "port_scan", message: "Nhiều IP bên ngoài quét cổng dịch vụ", ipAddress: sourceIp, metadata: { ports: [22, 80, 443, 3389], labScenario: scenario } });
    }
    setSetting("security.suspicious_ips", String(sources.length), user.id);
    setSetting("security.firewall_posture", "Botnet scan detected", user.id);
    upsertOpenAlert({ serverId: 1, type: "botnet_scan", severity: "critical", title: "Nghi vấn botnet quét cổng", message: `${sources.length} IP nguồn đang quét các cổng 22/80/443/3389 trong thời gian ngắn.`, source: "security", sourceRef: "multi-source-scan" });
  } else {
    return false;
  }

  insertLog({ serverId: 1, userId: user.id, level: "info", source: "lab", eventType: "scenario_applied", message: `Đã kích hoạt kịch bản kiểm thử: ${scenario}`, ipAddress });
  evaluateServer(1);
  return true;
}

app.post("/api/v1/lab/alert-scenario", requireAuth, requireAdmin, (req, res) => {
  const { scenario } = req.body || {};
  const supported = ["normal", "cpu_overload", "ram_pressure", "disk_full", "iis_down", "sql_down", "firewall_block", "network_timeout", "failed_login_burst", "unusual_login_ip", "botnet_scan"];
  if (!supported.includes(scenario)) {
    return sendError(req, res, 400, "VALIDATION_ERROR", "Unsupported lab scenario");
  }
  if (scenario !== "normal" && getSetting("demo.mode", "false") !== "true") {
    return sendError(req, res, 409, "DEMO_DISABLED", "Demo mode is disabled in settings");
  }
  applyLabScenario({ scenario, user: req.user, ipAddress: req.ip });
  sendData(req, res, { scenario });
});

app.post("/api/v1/demo/scenario", requireAuth, requireAdmin, (req, res) => {
  const { scenario } = req.body || {};
  const timestamp = now();
  const supported = ["normal", "iis_down", "sql_down", "cpu_overload", "disk_full", "firewall_block", "network_timeout"];
  if (!supported.includes(scenario)) {
    return sendError(req, res, 400, "VALIDATION_ERROR", "Unsupported demo scenario");
  }
  if (scenario !== "normal" && getSetting("demo.mode", "false") !== "true") {
    return sendError(req, res, 409, "DEMO_DISABLED", "Demo mode is disabled in settings");
  }

  setSetting("demo.mode", scenario === "normal" ? "false" : "true", req.user.id);
  setSetting("demo.scenario", scenario, req.user.id);

  if (scenario === "normal") {
    db.prepare("UPDATE services SET status = 'running', last_checked_at = ?, updated_at = ? WHERE server_id = 1").run(timestamp, timestamp);
    db.prepare("UPDATE servers SET status = 'online', last_seen_at = ?, updated_at = ? WHERE id = 1").run(timestamp, timestamp);
    db.prepare("UPDATE alerts SET status = 'resolved', resolved_at = ?, updated_at = ? WHERE type IN ('firewall_block', 'network_timeout') AND status IN ('open', 'acknowledged')").run(timestamp, timestamp);
    db.prepare(`
      INSERT INTO metrics (server_id, cpu_percent, ram_percent, ram_used_mb, ram_total_mb, disk_percent, network_rx_kbps, network_tx_kbps, uptime_seconds, collected_at, created_at)
      VALUES (1, 34, 62, 10158, 16384, 68, 144, 98, 180000, ?, ?)
    `).run(timestamp, timestamp);
  } else if (scenario === "iis_down") {
    db.prepare("UPDATE services SET status = 'stopped', last_checked_at = ?, updated_at = ? WHERE server_id = 1 AND service_name = 'W3SVC'").run(timestamp, timestamp);
  } else if (scenario === "sql_down") {
    db.prepare("UPDATE services SET status = 'stopped', last_checked_at = ?, updated_at = ? WHERE server_id = 1 AND service_name = 'MSSQLSERVER'").run(timestamp, timestamp);
  } else if (scenario === "cpu_overload") {
    db.prepare(`
      INSERT INTO metrics (server_id, cpu_percent, ram_percent, ram_used_mb, ram_total_mb, disk_percent, network_rx_kbps, network_tx_kbps, uptime_seconds, collected_at, created_at)
      VALUES (1, 96, 73, 11960, 16384, 70, 420, 360, 180000, ?, ?)
    `).run(timestamp, timestamp);
  } else if (scenario === "disk_full") {
    db.prepare(`
      INSERT INTO metrics (server_id, cpu_percent, ram_percent, ram_used_mb, ram_total_mb, disk_percent, network_rx_kbps, network_tx_kbps, uptime_seconds, collected_at, created_at)
      VALUES (1, 42, 70, 11469, 16384, 97, 180, 120, 180000, ?, ?)
    `).run(timestamp, timestamp);
  } else if (scenario === "firewall_block") {
    insertDemoMetric({ cpu: 38, ram: 66, disk: 68, rx: 12, tx: 6 });
    upsertOpenAlert({ serverId: 1, type: "firewall_block", severity: "critical", title: "Firewall blocked web port", message: "Simulated firewall rule blocked inbound HTTP traffic.", source: "security", sourceRef: "tcp/80" });
    setSetting("security.firewall_posture", "Port 80 blocked", req.user.id);
    setSetting("security.suspicious_ips", "1", req.user.id);
  } else if (scenario === "network_timeout") {
    db.prepare("UPDATE servers SET status = 'offline', updated_at = ? WHERE id = 1").run(timestamp);
    insertDemoMetric({ cpu: 35, ram: 65, disk: 68, rx: 0, tx: 0 });
    upsertOpenAlert({ serverId: 1, type: "network_timeout", severity: "critical", title: "Network timeout detected", message: "Collector heartbeat or ping simulation timed out.", source: "network", sourceRef: "ping" });
  }

  if (scenario === "normal") {
    setSetting("security.firewall_posture", "Restricted", req.user.id);
    setSetting("security.suspicious_ips", "0", req.user.id);
  }

  insertLog({ serverId: 1, userId: req.user.id, level: "info", source: "demo", eventType: "scenario_applied", message: `Đã kích hoạt kịch bản mô phỏng: ${scenario}`, ipAddress: req.ip });
  evaluateServer(1);
  sendData(req, res, { scenario });
});

if (process.env.NODE_ENV === "production") {
  app.use(express.static("dist"));
  app.get(/.*/, (_req, res) => {
    res.sendFile("index.html", { root: "dist" });
  });
}

app.listen(PORT, () => {
  console.log(`Dashboard server listening on http://localhost:${PORT}`);
});
