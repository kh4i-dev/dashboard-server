import { DatabaseSync } from "node:sqlite";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { hashPassword } from "./security.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, "..", "data");
const dbPath = join(dataDir, "dashboard.sqlite");

if (!existsSync(dataDir)) {
  mkdirSync(dataDir, { recursive: true });
}

export const db = new DatabaseSync(dbPath);
db.exec("PRAGMA foreign_keys = ON;");

export function now() {
  return new Date().toISOString();
}

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      email TEXT UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('admin', 'viewer')),
      status TEXT NOT NULL DEFAULT 'active',
      last_login_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      hostname TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      os_version TEXT NOT NULL,
      environment TEXT NOT NULL DEFAULT 'lab',
      status TEXT NOT NULL DEFAULT 'unknown',
      last_seen_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      cpu_percent REAL NOT NULL,
      ram_percent REAL NOT NULL,
      ram_used_mb INTEGER,
      ram_total_mb INTEGER,
      disk_percent REAL NOT NULL,
      network_rx_kbps REAL,
      network_tx_kbps REAL,
      uptime_seconds INTEGER,
      collected_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      service_name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      status TEXT NOT NULL,
      startup_type TEXT,
      last_checked_at TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      UNIQUE(server_id, service_name)
    );

    CREATE TABLE IF NOT EXISTS alerts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      severity TEXT NOT NULL,
      status TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      source TEXT NOT NULL,
      source_ref TEXT,
      opened_at TEXT NOT NULL,
      acknowledged_at TEXT,
      acknowledged_by INTEGER REFERENCES users(id),
      resolved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER REFERENCES servers(id) ON DELETE SET NULL,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      level TEXT NOT NULL,
      source TEXT NOT NULL,
      event_type TEXT NOT NULL,
      message TEXT NOT NULL,
      ip_address TEXT,
      metadata_json TEXT,
      occurred_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS incidents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER NOT NULL REFERENCES servers(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      status TEXT NOT NULL,
      severity TEXT NOT NULL,
      summary TEXT NOT NULL,
      root_cause TEXT,
      resolution TEXT,
      started_at TEXT NOT NULL,
      resolved_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT NOT NULL UNIQUE,
      value TEXT NOT NULL,
      value_type TEXT NOT NULL,
      description TEXT,
      updated_by INTEGER REFERENCES users(id),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
    CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
    CREATE INDEX IF NOT EXISTS idx_servers_status ON servers(status);
    CREATE INDEX IF NOT EXISTS idx_metrics_server_collected ON metrics(server_id, collected_at);
    CREATE INDEX IF NOT EXISTS idx_metrics_collected ON metrics(collected_at);
    CREATE INDEX IF NOT EXISTS idx_services_server_status ON services(server_id, status);
    CREATE INDEX IF NOT EXISTS idx_alerts_server_status_severity ON alerts(server_id, status, severity);
    CREATE INDEX IF NOT EXISTS idx_alerts_type_status ON alerts(type, status);
    CREATE INDEX IF NOT EXISTS idx_alerts_opened ON alerts(opened_at);
    CREATE INDEX IF NOT EXISTS idx_logs_source_occurred ON logs(source, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_logs_level_occurred ON logs(level, occurred_at);
    CREATE INDEX IF NOT EXISTS idx_logs_user ON logs(user_id);
    CREATE INDEX IF NOT EXISTS idx_logs_ip ON logs(ip_address);
    CREATE INDEX IF NOT EXISTS idx_incidents_server_status ON incidents(server_id, status);
  `);
}

export function seed() {
  const timestamp = now();
  const userCount = db.prepare("SELECT COUNT(*) AS count FROM users").get().count;
  if (userCount === 0) {
    if (!process.env.DASHBOARD_ADMIN_PASSWORD) {
      console.warn("[seed] DASHBOARD_ADMIN_PASSWORD is not set. Generated a one-time admin password; set the env var before first production run.");
    }
    const adminPassword = process.env.DASHBOARD_ADMIN_PASSWORD || randomBytes(18).toString("base64url");
    const viewerPassword = process.env.DASHBOARD_VIEWER_PASSWORD || randomBytes(18).toString("base64url");
    const passwordHash = hashPassword(adminPassword);
    const viewerHash = hashPassword(viewerPassword);
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).run("admin", "admin@example.local", passwordHash, "admin", timestamp, timestamp);
    db.prepare(`
      INSERT INTO users (username, email, password_hash, role, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'active', ?, ?)
    `).run("viewer", "viewer@example.local", viewerHash, "viewer", timestamp, timestamp);
  }

  const serverCount = db.prepare("SELECT COUNT(*) AS count FROM servers").get().count;
  if (serverCount === 0) {
    db.prepare(`
      INSERT INTO servers (name, hostname, ip_address, os_version, environment, status, last_seen_at, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run("Windows Server Lab", "WIN-SRV2016-LAB", "192.168.1.10", "Windows Server 2016", "lab", "online", timestamp, timestamp, timestamp);
  }

  seedSettings(timestamp);
  seedMetrics(timestamp);
  seedServices(timestamp);
  seedLogs(timestamp);
}

function seedSettings(timestamp) {
  const defaults = [
    ["threshold.cpu.critical", "90", "number", "CPU critical threshold"],
    ["threshold.ram.warning", "85", "number", "RAM warning threshold"],
    ["threshold.disk.critical", "95", "number", "Disk critical threshold"],
    ["collector.stale_minutes", "2", "number", "Collector stale heartbeat threshold"],
    ["sntp.server", "pool.ntp.org", "string", "SNTP/NTP server hostname"],
    ["sntp.interval_hours", "24", "number", "Automatic SNTP sync interval"],
    ["sntp.last_sync", "", "string", "Last successful SNTP sync timestamp"],
    ["sntp.offset_ms", "0", "number", "Last measured clock offset in milliseconds"],
    ["sntp.status", "unknown", "string", "Last SNTP sync status"],
    ["telegram.enabled", "false", "boolean", "Telegram alert channel enabled"],
    ["telegram.bot_token", "", "string", "Telegram Bot API token"],
    ["telegram.chat_id", "", "string", "Telegram chat id"],
    ["polling.interval_seconds", "3", "number", "Dashboard polling interval"],
    ["alert.sensitivity", "standard", "string", "Alert rule sensitivity"],
    ["alert.cpu.enabled", "true", "boolean", "CPU high alert enabled"],
    ["alert.ram.enabled", "true", "boolean", "RAM high alert enabled"],
    ["alert.disk.enabled", "true", "boolean", "Disk full alert enabled"],
    ["alert.service.iis.enabled", "true", "boolean", "IIS service down alert enabled"],
    ["alert.service.sql.enabled", "true", "boolean", "SQL Server service down alert enabled"],
    ["alert.network.timeout.enabled", "true", "boolean", "Network timeout alert enabled"],
    ["alert.firewall.enabled", "true", "boolean", "Firewall block alert enabled"],
    ["alert.auth.bruteforce.enabled", "true", "boolean", "Failed login burst alert enabled"],
    ["alert.auth.unusual_ip.enabled", "true", "boolean", "Unusual login IP alert enabled"],
    ["alert.security.botnet_scan.enabled", "true", "boolean", "Botnet scan alert enabled"],
    ["demo.mode", "false", "boolean", "Lab demo simulation mode"],
    ["demo.scenario", "normal", "string", "Active lab demo scenario"],
    ["security.firewall_posture", "Restricted", "string", "Firewall posture summary"],
    ["security.https_status", "Lab mode", "string", "HTTPS posture summary"],
    ["security.suspicious_ips", "0", "number", "Suspicious IP count"],
    ["security.account_lockout", "Enabled", "string", "Account lockout posture"],
    ["smtp.from_email", "", "string", "SMTP Sender Email"],
    ["smtp.from_name", "", "string", "SMTP Sender Name"],
    ["smtp.host", "", "string", "SMTP Hostname"],
    ["smtp.security", "tls", "string", "SMTP Security (none, ssl, tls)"],
    ["smtp.port", "587", "number", "SMTP Port"],
    ["smtp.auth", "true", "boolean", "SMTP Authentication enabled"],
    ["smtp.username", "", "string", "SMTP Username"],
    ["smtp.password", "", "string", "SMTP Password"]
  ];
  const insert = db.prepare(`
    INSERT OR IGNORE INTO settings (key, value, value_type, description, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  for (const setting of defaults) {
    insert.run(...setting, timestamp, timestamp);
  }
}

function seedMetrics(timestamp) {
  const metricCount = db.prepare("SELECT COUNT(*) AS count FROM metrics").get().count;
  if (metricCount > 0) return;

  const insert = db.prepare(`
    INSERT INTO metrics (
      server_id, cpu_percent, ram_percent, ram_used_mb, ram_total_mb, disk_percent,
      network_rx_kbps, network_tx_kbps, uptime_seconds, collected_at, created_at
    )
    VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (let i = 11; i >= 0; i -= 1) {
    const collectedAt = new Date(Date.now() - i * 60_000).toISOString();
    const ramPercent = 54 + Math.round(Math.random() * 16);
    insert.run(
      28 + Math.round(Math.random() * 20),
      ramPercent,
      Math.round((ramPercent / 100) * 16384),
      16384,
      62 + Math.round(Math.random() * 8),
      120 + Math.round(Math.random() * 80),
      90 + Math.round(Math.random() * 70),
      172800 + (11 - i) * 60,
      collectedAt,
      timestamp
    );
  }
}

function seedServices(timestamp) {
  const serviceCount = db.prepare("SELECT COUNT(*) AS count FROM services").get().count;
  if (serviceCount > 0) return;

  const insert = db.prepare(`
    INSERT INTO services (server_id, service_name, display_name, status, startup_type, last_checked_at, created_at, updated_at)
    VALUES (1, ?, ?, ?, ?, ?, ?, ?)
  `);
  insert.run("W3SVC", "World Wide Web Publishing Service", "running", "automatic", timestamp, timestamp, timestamp);
  insert.run("MSSQLSERVER", "SQL Server", "running", "automatic", timestamp, timestamp, timestamp);
  insert.run("FTPSVC", "Microsoft FTP Service", "running", "manual", timestamp, timestamp, timestamp);
}

function seedLogs(timestamp) {
  const logCount = db.prepare("SELECT COUNT(*) AS count FROM logs").get().count;
  if (logCount > 0) return;

  db.prepare(`
    INSERT INTO logs (server_id, user_id, level, source, event_type, message, ip_address, metadata_json, occurred_at, created_at)
    VALUES (1, NULL, 'info', 'system', 'seed', 'Khởi tạo dữ liệu giám sát phòng lab thành công.', NULL, NULL, ?, ?)
  `).run(timestamp, timestamp);
}

export function insertLog({ serverId = null, userId = null, level = "info", source, eventType, message, ipAddress = null, metadata = null }) {
  const timestamp = now();
  db.prepare(`
    INSERT INTO logs (server_id, user_id, level, source, event_type, message, ip_address, metadata_json, occurred_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(serverId, userId, level, source, eventType, message, ipAddress, metadata ? JSON.stringify(metadata) : null, timestamp, timestamp);
}
