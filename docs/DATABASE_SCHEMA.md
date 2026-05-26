# Database Schema

## [MODIFY] Runtime data source

Trong MVP hiện tại, bảng `servers`, `metrics` và `services` được cập nhật từ local Windows snapshot khi gọi dashboard overview. Dữ liệu seed chỉ là fallback ban đầu, không còn là nguồn hiển thị chính.

## Nguyên tắc

Dự án nên dùng migration-first mindset: mọi thay đổi database phải được mô tả bằng migration thay vì chỉnh tay trực tiếp trên database.

Nguyên tắc thiết kế:

- Mỗi bảng có khóa chính rõ ràng.
- Các bản ghi quan trọng có `created_at`, `updated_at`.
- Dữ liệu metrics có timestamp để vẽ biểu đồ.
- Alert có trạng thái để tránh tạo trùng.
- Log không lưu password, token hoặc secret.

## Bảng `users`

Lưu tài khoản dashboard.

| Cột | Kiểu gợi ý | Ghi chú |
|---|---|---|
| id | bigint/identity | Primary key |
| username | varchar(100) | Unique |
| email | varchar(255) | Nullable, unique nếu dùng |
| password_hash | varchar(255) | Không lưu plain text |
| role | varchar(20) | admin, viewer |
| status | varchar(20) | active, disabled |
| last_login_at | datetime | Nullable |
| created_at | datetime |  |
| updated_at | datetime |  |

Index đề xuất:

- Unique index `username`.
- Index `role`.
- Index `status`.

## Bảng `servers`

Lưu thông tin server được giám sát.

| Cột | Kiểu gợi ý | Ghi chú |
|---|---|---|
| id | bigint/identity | Primary key |
| name | varchar(100) | Tên hiển thị |
| hostname | varchar(255) | Hostname Windows |
| ip_address | varchar(45) | IPv4/IPv6 |
| os_version | varchar(100) | Windows Server 2016 |
| environment | varchar(50) | lab, demo, production |
| status | varchar(20) | online, offline, unknown |
| last_seen_at | datetime | Lần cuối collector gửi dữ liệu |
| created_at | datetime |  |
| updated_at | datetime |  |

Index đề xuất:

- Index `hostname`.
- Index `ip_address`.
- Index `status`.

## Bảng `metrics`

Lưu dữ liệu tài nguyên server.

| Cột | Kiểu gợi ý | Ghi chú |
|---|---|---|
| id | bigint/identity | Primary key |
| server_id | bigint | Foreign key `servers.id` |
| cpu_percent | decimal(5,2) | 0-100 |
| ram_percent | decimal(5,2) | 0-100 |
| ram_used_mb | bigint | Nullable |
| ram_total_mb | bigint | Nullable |
| disk_percent | decimal(5,2) | Tổng quan hoặc ổ chính |
| network_rx_kbps | decimal(12,2) | Nullable |
| network_tx_kbps | decimal(12,2) | Nullable |
| uptime_seconds | bigint | Nullable |
| collected_at | datetime | Timestamp metric |
| created_at | datetime |  |

Index đề xuất:

- Composite index `(server_id, collected_at)`.
- Index `collected_at`.

Ghi chú: nếu cần theo dõi nhiều ổ đĩa chi tiết, có thể tách bảng `disk_metrics`.

## Bảng `services`

Lưu trạng thái dịch vụ Windows.

| Cột | Kiểu gợi ý | Ghi chú |
|---|---|---|
| id | bigint/identity | Primary key |
| server_id | bigint | Foreign key |
| service_name | varchar(100) | Ví dụ W3SVC |
| display_name | varchar(255) | IIS Admin Service |
| status | varchar(30) | running, stopped, paused, unknown |
| startup_type | varchar(50) | Nullable |
| last_checked_at | datetime |  |
| created_at | datetime |  |
| updated_at | datetime |  |

Index đề xuất:

- Unique index `(server_id, service_name)`.
- Index `(server_id, status)`.

## Bảng `alerts`

Lưu cảnh báo.

| Cột | Kiểu gợi ý | Ghi chú |
|---|---|---|
| id | bigint/identity | Primary key |
| server_id | bigint | Foreign key |
| type | varchar(50) | cpu_high, service_down |
| severity | varchar(20) | info, warning, critical |
| status | varchar(20) | open, acknowledged, resolved |
| title | varchar(255) | Tiêu đề |
| message | text | Mô tả |
| source | varchar(100) | metric, service, security |
| source_ref | varchar(100) | Tên service hoặc metric |
| opened_at | datetime |  |
| acknowledged_at | datetime | Nullable |
| acknowledged_by | bigint | Nullable user id |
| resolved_at | datetime | Nullable |
| created_at | datetime |  |
| updated_at | datetime |  |

Index đề xuất:

- Index `(server_id, status, severity)`.
- Index `(type, status)`.
- Index `opened_at`.

## Bảng `logs`

Lưu log ứng dụng và log hệ thống rút gọn.

| Cột | Kiểu gợi ý | Ghi chú |
|---|---|---|
| id | bigint/identity | Primary key |
| server_id | bigint | Nullable |
| user_id | bigint | Nullable |
| level | varchar(20) | info, warning, error |
| source | varchar(100) | auth, service, windows_event, alert |
| event_type | varchar(100) | login_failed, service_crash |
| message | text | Nội dung |
| ip_address | varchar(45) | Nullable |
| metadata_json | text | Nullable |
| occurred_at | datetime |  |
| created_at | datetime |  |

Index đề xuất:

- Index `(source, occurred_at)`.
- Index `(level, occurred_at)`.
- Index `user_id`.
- Index `ip_address`.

## Bảng `incidents`

Nhóm nhiều alert/log thành một sự cố phục vụ báo cáo và demo.

| Cột | Kiểu gợi ý | Ghi chú |
|---|---|---|
| id | bigint/identity | Primary key |
| server_id | bigint | Foreign key |
| title | varchar(255) |  |
| status | varchar(20) | open, investigating, resolved |
| severity | varchar(20) | warning, critical |
| summary | text | Mô tả |
| root_cause | text | Nullable |
| resolution | text | Nullable |
| started_at | datetime |  |
| resolved_at | datetime | Nullable |
| created_at | datetime |  |
| updated_at | datetime |  |

Index đề xuất:

- Index `(server_id, status)`.
- Index `started_at`.

## Bảng `settings`

Lưu cấu hình hệ thống, threshold cảnh báo, thông số SNTP và Telegram Alerts.

| Cột | Kiểu gợi ý | Ghi chú |
|---|---|---|
| id | bigint/identity | Primary key |
| key | varchar(100) | Unique |
| value | text | Giá trị |
| value_type | varchar(20) | string, number, boolean, json |
| description | varchar(255) | Nullable |
| updated_by | bigint | Nullable user id |
| created_at | datetime |  |
| updated_at | datetime |  |

Các khóa cấu hình mặc định bổ sung [NEW]:
- `sntp.server`: Tên máy chủ SNTP (`string`, ví dụ `pool.ntp.org`).
- `sntp.interval_hours`: Chu kỳ đồng bộ tự động (`number`, tính bằng giờ).
- `sntp.last_sync`: Thời điểm đồng bộ thành công gần nhất (`string`, ISO 8601).
- `sntp.offset_ms`: Độ lệch đồng hồ đo được (`number`, mili-giây).
- `sntp.status`: Trạng thái đồng bộ gần nhất (`string`, `success`, `failed`, `unknown`).
- `telegram.enabled`: Trạng thái kích hoạt kênh Telegram (`boolean`, `true` hoặc `false`).
- `telegram.bot_token`: Token xác thực Telegram Bot API (`string`, bảo mật).
- `telegram.chat_id`: ID cuộc trò chuyện hoặc Group nhận tin (`string`).

Index đề xuất:

- Unique index `key`.


## Migration-first checklist

- [ ] Không chỉnh schema thủ công ngoài migration.
- [ ] Mỗi migration có tên rõ ràng.
- [ ] Có migration tạo index.
- [ ] Có seed user admin ban đầu.
- [ ] Có seed threshold mặc định.
- [ ] Có rollback migration nếu framework hỗ trợ.
