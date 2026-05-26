# API Spec

## [MODIFY] Runtime overview behavior

- `GET /api/v1/dashboard/overview` refreshes a local Windows snapshot before returning data. It updates server name, hostname, IP address, OS version, CPU/RAM/disk metrics, uptime and monitored service status.

## [MODIFY] Current MVP behavior notes

- `/api/v1/settings/sntp/sync` currently simulates a safe lab sync result and updates `sntp.last_sync`, `sntp.offset_ms`, and `sntp.status`. The real Windows Server implementation can later call `w32tm`.
- Telegram settings API masks Bot Token in responses. `chatId` is returned to admin for configuration, while Bot Token is only replaced when admin submits a new non-masked token.

## [MODIFY] Page refactor API additions

Alert lifecycle endpoints:

| Method | Endpoint | Role | Description |
|---|---|---|---|
| POST | `/api/v1/alerts/:id/reopen` | admin | Reopen a resolved or closed alert |
| POST | `/api/v1/alerts/:id/close` | admin | Close a resolved alert |

Monitoring settings endpoints:

| Method | Endpoint | Role | Description |
|---|---|---|---|
| GET | `/api/v1/settings/monitoring` | admin/viewer | Return threshold, polling interval, demo mode, alert sensitivity and security posture |
| POST | `/api/v1/settings/monitoring` | admin | Save threshold, polling interval, demo mode and alert sensitivity |

Demo scenario values now include:

- `iis_down`
- `sql_down`
- `cpu_overload`
- `disk_full`
- `firewall_block`
- `network_timeout`
- `normal`

## Nguyên tắc chung

API dùng prefix:

```text
/api/v1
```

Response chuẩn:

```json
{
  "data": {},
  "error": null,
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-25T21:00:00Z"
  }
}
```

Khi lỗi:

```json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid input",
    "details": {}
  },
  "meta": {
    "requestId": "req_123",
    "timestamp": "2026-05-25T21:00:00Z"
  }
}
```

## Auth

Phiên bản đầu nên dùng session cookie hoặc JWT tùy stack.

Yêu cầu:

- Password không bao giờ trả về API.
- Cookie session cần `HttpOnly`, `Secure`, `SameSite=Lax` hoặc `Strict` nếu dùng cookie.
- Token cần có thời hạn nếu dùng JWT.
- Logout phải hủy session/token phía server nếu có thể.

Endpoint auth:

| Method | Endpoint | Mô tả |
|---|---|---|
| POST | `/api/v1/auth/login` | Đăng nhập |
| POST | `/api/v1/auth/logout` | Đăng xuất |
| GET | `/api/v1/auth/me` | Lấy user hiện tại |

## Validation

Nguyên tắc:

- Validate body, query và params.
- Không tin dữ liệu từ frontend.
- Chuẩn hóa kiểu dữ liệu số, ngày giờ, enum.
- Giới hạn độ dài chuỗi.
- Chặn input có định dạng nguy hiểm nếu được dùng trong shell command hoặc query.

Ví dụ enum:

- `role`: admin, viewer.
- `severity`: info, warning, critical.
- `alert_status`: open, acknowledged, resolved.

## Error code

| Code | HTTP | Ý nghĩa |
|---|---:|---|
| UNAUTHORIZED | 401 | Chưa đăng nhập |
| FORBIDDEN | 403 | Không đủ quyền |
| NOT_FOUND | 404 | Không tìm thấy |
| VALIDATION_ERROR | 400 | Dữ liệu không hợp lệ |
| CONFLICT | 409 | Trùng dữ liệu hoặc trạng thái xung đột |
| RATE_LIMITED | 429 | Vượt giới hạn request |
| INTERNAL_ERROR | 500 | Lỗi hệ thống |
| SERVICE_UNAVAILABLE | 503 | Backend/collector/database không sẵn sàng |

## Rate limit

Đề xuất:

- Login: tối đa 5 lần sai trong 10 phút theo IP và username.
- API dashboard: 60 request/phút/user.
- Collector ingest: giới hạn theo API key hoặc server id.
- Public endpoint không có auth nên hạn chế tối đa, tốt nhất không có.

## Endpoint list

### Dashboard

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/dashboard/overview` | admin/viewer | Tổng quan server mới nhất |
| GET | `/api/v1/dashboard/health` | admin/viewer | Health tổng quan dashboard |

### Servers

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/servers` | admin/viewer | Danh sách server |
| GET | `/api/v1/servers/:id` | admin/viewer | Chi tiết server |
| POST | `/api/v1/servers` | admin | Thêm server |
| PATCH | `/api/v1/servers/:id` | admin | Cập nhật server |

### Metrics

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/servers/:id/metrics/latest` | admin/viewer | Metrics mới nhất |
| GET | `/api/v1/servers/:id/metrics/history` | admin/viewer | Metrics theo thời gian |
| POST | `/api/v1/metrics/batch` | collector | Collector gửi metrics |

Query gợi ý cho history:

- `from`
- `to`
- `interval`

### Services

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/servers/:id/services` | admin/viewer | Trạng thái dịch vụ |
| POST | `/api/v1/services/status/batch` | collector | Collector gửi trạng thái service |

### Alerts

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/alerts` | admin/viewer | Danh sách alert |
| GET | `/api/v1/alerts/:id` | admin/viewer | Chi tiết alert |
| POST | `/api/v1/alerts/:id/acknowledge` | admin | Xác nhận đã biết alert |
| POST | `/api/v1/alerts/:id/resolve` | admin | Đánh dấu đã xử lý |

### Logs

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/logs` | admin/viewer | Xem log |
| POST | `/api/v1/logs/batch` | collector | Collector gửi log |

### Suggestions

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/alerts/:id/suggestion` | admin/viewer | Gợi ý xử lý alert |
| POST | `/api/v1/alerts/:id/suggestion/regenerate` | admin | Tạo lại gợi ý nếu dùng AI |

### Users

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/users` | admin | Danh sách user |
| POST | `/api/v1/users` | admin | Tạo user |
| PATCH | `/api/v1/users/:id` | admin | Cập nhật user |
| POST | `/api/v1/users/:id/disable` | admin | Khóa user |

### Settings (SNTP & Telegram Alerts) [NEW]

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| GET | `/api/v1/settings/sntp` | admin/viewer | Lấy cấu hình & trạng thái đồng bộ SNTP |
| POST | `/api/v1/settings/sntp` | admin | Lưu cấu hình SNTP (NTP Server, chu kỳ) |
| POST | `/api/v1/settings/sntp/sync` | admin | Kích hoạt đồng bộ thời gian máy chủ vật lý |
| GET | `/api/v1/settings/telegram` | admin | Lấy cấu hình kênh Telegram (Bot Token, Chat ID) |
| POST | `/api/v1/settings/telegram` | admin | Lưu cấu hình kênh Telegram Alerts |
| POST | `/api/v1/settings/telegram/test` | admin | Gửi tin nhắn test tới Telegram chat |

### Demo


[NEW] Endpoint demo dùng cho môi trường lab để mô phỏng sự cố khi chưa có collector Windows thật hoặc khi cần trình bày nhanh trước giảng viên.

| Method | Endpoint | Role | Mô tả |
|---|---|---|---|
| POST | `/api/v1/demo/scenario` | admin | Áp dụng kịch bản mô phỏng sự cố |

Payload:

```json
{
  "scenario": "iis_down"
}
```

Giá trị `scenario` hỗ trợ trong MVP:

- `iis_down`
- `sql_down`
- `cpu_overload`
- `disk_full`
- `normal`

Nguyên tắc:

- Chỉ admin được gọi endpoint này.
- Chỉ dùng cho lab/demo.
- Không chạy lệnh thật trên Windows Server.
- Khi có PowerShell collector thật, endpoint này vẫn có thể giữ lại như chế độ demo.
