import { db, insertLog, now } from "./db.js";
import nodemailer from "nodemailer";
import { decrypt } from "./security.js";

function getNumberSetting(key, fallback) {
  const setting = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  const value = Number(setting?.value);
  return Number.isFinite(value) ? value : fallback;
}

function getBooleanSetting(key, fallback = true) {
  const setting = db.prepare("SELECT value FROM settings WHERE key = ?").get(key);
  if (!setting) return fallback;
  return setting.value === "true";
}

function alertRuleKey(type, sourceRef = "") {
  if (type === "cpu_high") return "alert.cpu.enabled";
  if (type === "ram_high") return "alert.ram.enabled";
  if (type === "disk_full") return "alert.disk.enabled";
  if (type === "network_timeout") return "alert.network.timeout.enabled";
  if (type === "firewall_block") return "alert.firewall.enabled";
  if (type === "login_bruteforce") return "alert.auth.bruteforce.enabled";
  if (type === "unusual_login_ip") return "alert.auth.unusual_ip.enabled";
  if (type === "botnet_scan") return "alert.security.botnet_scan.enabled";
  if (type === "service_down" && sourceRef === "W3SVC") return "alert.service.iis.enabled";
  if (type === "service_down" && sourceRef === "MSSQLSERVER") return "alert.service.sql.enabled";
  return null;
}

function isAlertRuleEnabled(type, sourceRef) {
  const key = alertRuleKey(type, sourceRef);
  return key ? getBooleanSetting(key, true) : true;
}

function getSensitivity() {
  const value = db.prepare("SELECT value FROM settings WHERE key = 'alert.sensitivity'").get()?.value;
  return ["strict", "standard", "relaxed"].includes(value) ? value : "standard";
}

function applySensitivityThreshold(value) {
  const sensitivity = getSensitivity();
  if (sensitivity === "strict") return Math.max(1, value - 5);
  if (sensitivity === "relaxed") return Math.min(100, value + 5);
  return value;
}

function failedLoginLimit() {
  const sensitivity = getSensitivity();
  if (sensitivity === "strict") return 3;
  if (sensitivity === "relaxed") return 8;
  return 5;
}

export function evaluateServer(serverId) {
  const latestMetric = db
    .prepare("SELECT * FROM metrics WHERE server_id = ? ORDER BY collected_at DESC LIMIT 1")
    .get(serverId);
  if (latestMetric) {
    evaluateMetric(serverId, latestMetric);
  }

  const services = db.prepare("SELECT * FROM services WHERE server_id = ?").all(serverId);
  for (const service of services) {
    evaluateService(serverId, service);
  }
}

function evaluateMetric(serverId, metric) {
  const cpuCritical = applySensitivityThreshold(getNumberSetting("threshold.cpu.critical", 90));
  const ramWarning = applySensitivityThreshold(getNumberSetting("threshold.ram.warning", 85));
  const diskCritical = applySensitivityThreshold(getNumberSetting("threshold.disk.critical", 95));

  if (metric.cpu_percent > cpuCritical) {
    upsertOpenAlert({
      serverId,
      type: "cpu_high",
      severity: "critical",
      title: "Mức sử dụng CPU cao",
      message: `Mức sử dụng CPU là ${metric.cpu_percent}% và đã vượt quá ${cpuCritical}%.`,
      source: "metric",
      sourceRef: "cpu"
    });
  } else {
    resolveAlert(serverId, "cpu_high", "cpu");
  }

  if (metric.ram_percent > ramWarning) {
    upsertOpenAlert({
      serverId,
      type: "ram_high",
      severity: "warning",
      title: "Mức sử dụng RAM cao",
      message: `Mức sử dụng RAM là ${metric.ram_percent}% và đã vượt quá ${ramWarning}%.`,
      source: "metric",
      sourceRef: "ram"
    });
  } else {
    resolveAlert(serverId, "ram_high", "ram");
  }

  if (metric.disk_percent > diskCritical) {
    upsertOpenAlert({
      serverId,
      type: "disk_full",
      severity: "critical",
      title: "Dung lượng đĩa gần đầy",
      message: `Dung lượng sử dụng đĩa là ${metric.disk_percent}% và đã vượt quá ${diskCritical}%.`,
      source: "metric",
      sourceRef: "disk"
    });
  } else {
    resolveAlert(serverId, "disk_full", "disk");
  }
}

function evaluateService(serverId, service) {
  const normalized = service.status.toLowerCase();
  if (normalized === "running") {
    resolveAlert(serverId, "service_down", service.service_name);
    return;
  }

  upsertOpenAlert({
    serverId,
    type: "service_down",
    severity: "critical",
    title: `Dịch vụ ${service.display_name} dừng`,
    message: `Dịch vụ ${service.service_name} hiện ở trạng thái ${service.status === "stopped" ? "dừng" : service.status}.`,
    source: "service",
    sourceRef: service.service_name
  });
}


export function upsertOpenAlert({ serverId, type, severity, title, message, source, sourceRef }) {
  if (!isAlertRuleEnabled(type, sourceRef)) {
    resolveAlert(serverId, type, sourceRef);
    return null;
  }

  const existing = db
    .prepare("SELECT id FROM alerts WHERE server_id = ? AND type = ? AND source_ref = ? AND status IN ('open', 'acknowledged') LIMIT 1")
    .get(serverId, type, sourceRef);
  const timestamp = now();

  if (existing) {
    db.prepare("UPDATE alerts SET severity = ?, title = ?, message = ?, updated_at = ? WHERE id = ?")
      .run(severity, title, message, timestamp, existing.id);
    return existing.id;
  }

  const result = db.prepare(`
    INSERT INTO alerts (server_id, type, severity, status, title, message, source, source_ref, opened_at, created_at, updated_at)
    VALUES (?, ?, ?, 'open', ?, ?, ?, ?, ?, ?, ?)
  `).run(serverId, type, severity, title, message, source, sourceRef, timestamp, timestamp, timestamp);

  insertLog({
    serverId,
    level: severity === "critical" ? "error" : "warning",
    source: "alert",
    eventType: "alert_opened",
    message: title,
    metadata: { alertId: result.lastInsertRowid, type, sourceRef }
  });

  // Gửi thông báo thực tế qua Email và Telegram khi sự cố mới được kích hoạt
  sendAlertNotification({
    id: result.lastInsertRowid,
    type,
    severity,
    title,
    message,
    source,
    sourceRef,
    openedAt: timestamp
  });

  return result.lastInsertRowid;
}

async function sendAlertNotification(alert) {
  const { title, message, severity, openedAt } = alert;
  
  // 1. Gửi qua kênh Telegram nếu được kích hoạt
  try {
    const telegramEnabled = db.prepare("SELECT value FROM settings WHERE key = 'telegram.enabled'").get()?.value === "true";
    if (telegramEnabled) {
      const tokenEnc = db.prepare("SELECT value FROM settings WHERE key = 'telegram.bot_token'").get()?.value || "";
      const chatId = db.prepare("SELECT value FROM settings WHERE key = 'telegram.chat_id'").get()?.value || "";
      const token = decrypt(tokenEnc);
      
      if (token && chatId) {
        const isCritical = severity.toUpperCase() === "CRITICAL";
        const text = `⚠️ *GRAFOPS - CẢNH BÁO SỰ CỐ PHÒNG LAB*\n\n` +
                     `🚨 *Mức độ:* ${isCritical ? "🔴 NGUY HIỂM (CRITICAL)" : "🟡 CẢNH BÁO (WARNING)"}\n` +
                     `📌 *Sự cố:* ${title}\n` +
                     `📝 *Chi tiết:* ${message}\n` +
                     `🖥️ *Máy chủ:* WIN-SRV2016-LAB\n` +
                     `🕒 *Thời gian:* ${new Date(openedAt).toLocaleString("vi-VN")}`;
                     
        fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text,
            parse_mode: "Markdown"
          })
        }).catch(err => console.error("[Alert Notification] Telegram send failed:", err.message));
      }
    }
  } catch (err) {
    console.error("[Alert Notification] Telegram processing failed:", err.message);
  }

  // 2. Gửi qua kênh SMTP Email nếu được kích hoạt
  try {
    const fromEmail = db.prepare("SELECT value FROM settings WHERE key = 'smtp.from_email'").get()?.value || "";
    const host = db.prepare("SELECT value FROM settings WHERE key = 'smtp.host'").get()?.value || "";
    
    if (fromEmail && host) {
      const smtpAuth = db.prepare("SELECT value FROM settings WHERE key = 'smtp.auth'").get()?.value === "true";
      const username = db.prepare("SELECT value FROM settings WHERE key = 'smtp.username'").get()?.value || "";
      const fromName = db.prepare("SELECT value FROM settings WHERE key = 'smtp.from_name'").get()?.value || "GrafOps";
      const security = db.prepare("SELECT value FROM settings WHERE key = 'smtp.security'").get()?.value || "tls";
      const port = Number(db.prepare("SELECT value FROM settings WHERE key = 'smtp.port'").get()?.value || "587");
      const passwordEnc = db.prepare("SELECT value FROM settings WHERE key = 'smtp.password'").get()?.value || "";
      const password = decrypt(passwordEnc);
      
      const transporter = nodemailer.createTransport({
        host,
        port,
        secure: security === "ssl",
        auth: smtpAuth ? {
          user: username,
          pass: password
        } : undefined,
        tls: {
          rejectUnauthorized: false
        }
      });
      
      const formattedTime = new Date(openedAt).toLocaleString("vi-VN");
      const isCritical = severity.toUpperCase() === "CRITICAL";
      const badgeColor = isCritical ? "#ef4444" : "#f59e0b";
      const badgeText = isCritical ? "NGUY HIỂM (CRITICAL)" : "CẢNH BÁO (WARNING)";

      transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: fromEmail, // Gửi về hòm thư admin (fromEmail)
        subject: `[GrafOps Alert] ${severity.toUpperCase()}: ${title}`,
        text: `CẢNH BÁO SỰ CỐ HỆ THỐNG - GRAFOPS\n\nMức độ: ${badgeText}\nSự cố: ${title}\nChi tiết: ${message}\nMáy chủ: WIN-SRV2016-LAB\nThời gian: ${formattedTime}`,
        html: `
          <div style="font-family: Arial, sans-serif; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; max-width: 600px; background-color: #fcfcfc;">
            <div style="background-color: ${badgeColor}; color: white; padding: 12px; border-radius: 6px; font-weight: bold; font-size: 16px; text-align: center;">
              🚨 PHÁT HIỆN SỰ CỐ: ${badgeText}
            </div>
            <p style="margin-top: 20px; font-size: 15px; color: #1f2937;">Kính gửi Quản trị viên,</p>
            <p style="font-size: 15px; color: #1f2937;">Hệ thống giám sát tự động <strong>GrafOps Node</strong> đã phát hiện sự cố khẩn cấp trên máy chủ phòng Lab:</p>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; background-color: #f9fafb; border-radius: 6px; border: 1px solid #f3f4f6;">
              <tr>
                <td style="padding: 10px; color: #6b7280; font-weight: bold; border-bottom: 1px solid #f3f4f6;">Sự cố:</td>
                <td style="padding: 10px; color: #1f2937; font-weight: bold; border-bottom: 1px solid #f3f4f6;">${title}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #6b7280; font-weight: bold; border-bottom: 1px solid #f3f4f6;">Chi tiết:</td>
                <td style="padding: 10px; color: #1f2937; border-bottom: 1px solid #f3f4f6;">${message}</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #6b7280; font-weight: bold; border-bottom: 1px solid #f3f4f6;">Máy chủ:</td>
                <td style="padding: 10px; color: #1f2937; border-bottom: 1px solid #f3f4f6;">WIN-SRV2016-LAB</td>
              </tr>
              <tr>
                <td style="padding: 10px; color: #6b7280; font-weight: bold;">Thời gian phát hiện:</td>
                <td style="padding: 10px; color: #1f2937;">${formattedTime}</td>
              </tr>
            </table>
            <p style="font-size: 14px; color: #4b5563;">Vui lòng truy cập ngay vào trang Quản trị hệ thống tại <a href="http://localhost:5173" style="color: #2563eb; font-weight: bold; text-decoration: none;">GrafOps Dashboard</a> để kiểm tra và tiến hành khắc phục.</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 11px; color: #9ca3af; text-align: center; margin-bottom: 0;">Email này được gửi tự động bởi hệ thống giám sát hệ thống phòng Lab GrafOps Node.</p>
          </div>
        `
      }).catch(err => console.error("[Alert Notification] SMTP send failed:", err.message));
    }
  } catch (err) {
    console.error("[Alert Notification] SMTP processing failed:", err.message);
  }
}

export function resolveAlert(serverId, type, sourceRef) {
  const timestamp = now();
  const result = db.prepare(`
    UPDATE alerts
    SET status = 'resolved', resolved_at = ?, updated_at = ?
    WHERE server_id = ? AND type = ? AND source_ref = ? AND status IN ('open', 'acknowledged')
  `).run(timestamp, timestamp, serverId, type, sourceRef);

  if (result.changes > 0) {
    insertLog({
      serverId,
      level: "info",
      source: "alert",
      eventType: "alert_resolved",
      message: `Sự cố ${type} đã được khắc phục cho ${sourceRef}.`
    });
  }
}

export function evaluateFailedLogins(ipAddress, username) {
  const tenMinutesAgo = new Date(Date.now() - 10 * 60_000).toISOString();
  const limit = failedLoginLimit();
  const failedCount = db.prepare(`
    SELECT COUNT(*) AS count
    FROM logs
    WHERE source = 'auth'
      AND event_type = 'login_failed'
      AND occurred_at >= ?
      AND (ip_address = ? OR json_extract(metadata_json, '$.username') = ?)
  `).get(tenMinutesAgo, ipAddress, username).count;

  if (failedCount >= limit) {
    upsertOpenAlert({
      serverId: 1,
      type: "login_bruteforce",
      severity: "warning",
      title: "Phát hiện nhiều nỗ lực đăng nhập thất bại",
      message: `Phát hiện ${failedCount} lần đăng nhập thất bại liên tiếp trong 10 phút qua.`,
      source: "security",
      sourceRef: ipAddress || username || "unknown"
    });
  }
}

export function evaluateSuccessfulLogin({ userId, username, ipAddress }) {
  if (!ipAddress) return;
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60_000).toISOString();
  const previousLogin = db.prepare(`
    SELECT ip_address
    FROM logs
    WHERE source = 'auth'
      AND event_type = 'login_success'
      AND user_id = ?
      AND occurred_at >= ?
      AND ip_address IS NOT NULL
      AND ip_address <> ?
    ORDER BY occurred_at DESC
    LIMIT 1
  `).get(userId, thirtyDaysAgo, ipAddress);

  if (previousLogin) {
    upsertOpenAlert({
      serverId: 1,
      type: "unusual_login_ip",
      severity: "warning",
      title: "Đăng nhập từ IP lạ",
      message: `Tài khoản ${username} vừa đăng nhập từ ${ipAddress}, khác IP thường dùng gần đây (${previousLogin.ip_address}).`,
      source: "security",
      sourceRef: `${username}:${ipAddress}`
    });
  }
}
