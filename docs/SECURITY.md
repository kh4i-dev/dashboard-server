# Security

## [MODIFY] Current MVP safety note

The current MVP does not execute PowerShell `w32tm` for SNTP sync. The sync endpoint validates the hostname, writes audit log data, and simulates clock offset/status so development and demo remain safe before enabling real command execution on Windows Server 2016.

## [NEW] SNTP and Telegram security

SNTP và Telegram là phần mở rộng có rủi ro bảo mật riêng.

Yêu cầu:

- Chỉ admin được cấu hình SNTP server, Telegram Bot Token và Chat ID.
- Không trả Telegram Bot Token đầy đủ về frontend; chỉ hiển thị trạng thái đã cấu hình hoặc masked value.
- Không ghi Bot Token, Chat ID nhạy cảm hoặc response Telegram đầy đủ vào log.
- Validate SNTP server hostname để tránh command injection khi gọi PowerShell.
- Khi gọi `w32tm`, không nối chuỗi shell từ input thô; dùng allowlist hoặc validate chặt.
- Telegram test message phải rate limit để tránh spam.
- Nếu dashboard public, settings page phải bắt buộc HTTPS và session hợp lệ.

Checklist:

- [ ] Telegram token được mask trong API response.
- [ ] SNTP hostname được validate.
- [ ] Endpoint sync/test chỉ cho admin.
- [ ] Audit log ghi hành động cấu hình nhưng không ghi secret.
- [ ] Có rate limit cho Telegram test endpoint.

## Threat model cơ bản

Tài sản cần bảo vệ:

- Tài khoản admin dashboard.
- Dữ liệu metrics/logs.
- Cấu hình server và threshold.
- API collector.
- Dashboard public qua mạng.

Tác nhân đe dọa:

- Người dùng không đăng nhập.
- Người dùng viewer cố truy cập quyền admin.
- Kẻ tấn công brute force login.
- Kẻ tấn công gửi dữ liệu giả vào collector API.
- Lỗi cấu hình firewall/IIS làm lộ dashboard hoặc port nhạy cảm.

Rủi ro chính:

- Mất tài khoản admin.
- Lộ log nhạy cảm.
- API bị spam request.
- Dashboard public không có HTTPS.
- SQL injection/XSS do input không được validate.

## OWASP Top 10 checklist

- [ ] Broken Access Control: backend kiểm tra role cho mọi endpoint admin.
- [ ] Cryptographic Failures: dùng HTTPS, không lưu password plain text.
- [ ] Injection: dùng parameterized query/ORM, không nối chuỗi SQL.
- [ ] Insecure Design: không cho AI hoặc dashboard tự động chạy lệnh nguy hiểm.
- [ ] Security Misconfiguration: tắt debug mode khi demo public.
- [ ] Vulnerable Components: dùng package ổn định, cập nhật dependency.
- [ ] Authentication Failures: rate limit login, session timeout.
- [ ] Software/Data Integrity Failures: kiểm soát migration và deployment.
- [ ] Logging/Monitoring Failures: ghi audit log đăng nhập và thao tác admin.
- [ ] SSRF: nếu có gọi URL ngoài, giới hạn domain và không cho nhập URL tùy ý.

## Auth/session

Yêu cầu:

- Bắt buộc đăng nhập để xem dashboard.
- Session có thời hạn.
- Logout xóa session.
- Cookie dùng `HttpOnly`, `Secure`, `SameSite`.
- Không lưu token trong localStorage nếu không cần.
- Failed login phải được log.

Checklist:

- [ ] Có login page.
- [ ] Có logout.
- [ ] Có middleware auth.
- [ ] Có timeout session.
- [ ] Có rate limit login.

## Password hashing

Yêu cầu:

- [MODIFY] Dùng bcrypt, argon2, scrypt hoặc cơ chế hash mật khẩu đáng tin cậy.
- Không tự viết thuật toán hash.
- Không lưu password plain text.
- Không log password.

Checklist:

- [ ] `password_hash` không bao giờ trả về API.
- [ ] [NEW] MVP hiện dùng `scrypt` từ Node.js `crypto` để tránh phụ thuộc native package trong môi trường Windows lab.
- [ ] Seed admin ban đầu bắt buộc đổi mật khẩu nếu có thể.
- [ ] Password tối thiểu 8 ký tự cho đồ án.

## RBAC

Role tối thiểu:

- Admin.
- Viewer.

Quyền:

| Tính năng | Admin | Viewer |
|---|---:|---:|
| Xem dashboard | Có | Có |
| Xem alert/log | Có | Có |
| Acknowledge/resolve alert | Có | Không |
| Quản lý user | Có | Không |
| Cấu hình threshold | Có | Không |

Checklist:

- [ ] Kiểm tra quyền ở backend.
- [ ] Frontend chỉ hỗ trợ trải nghiệm, không thay thế backend authorization.
- [ ] Mọi thao tác admin được ghi audit log.

## Audit log

Sự kiện cần ghi:

- Login thành công.
- Login thất bại.
- Logout.
- Tạo/sửa/xóa user.
- Đổi threshold.
- Acknowledge/resolve alert.
- Collector gửi dữ liệu lỗi hoặc không hợp lệ.

Checklist:

- [ ] Log có user id nếu có.
- [ ] Log có IP nếu có.
- [ ] Log có timestamp.
- [ ] Log không chứa secret.

## Rate limit

Áp dụng cho:

- Login.
- API dashboard.
- Collector ingest.
- Suggestion regenerate.

Checklist:

- [ ] Login sai nhiều lần tạo security alert.
- [ ] Request quá nhiều trả về 429.
- [ ] Rate limit không khóa nhầm toàn bộ hệ thống trong demo.

## Input validation

Yêu cầu:

- Validate tất cả body/query/params.
- Dùng enum cho role, status, severity.
- Giới hạn độ dài chuỗi.
- Không truyền trực tiếp input vào PowerShell command.
- Escape output log khi hiển thị HTML để tránh XSS.

Checklist:

- [ ] Validation middleware.
- [ ] Sanitization khi hiển thị log.
- [ ] Parameterized query.

## Backup

Tối thiểu cần backup:

- Database.
- File cấu hình `.env` hoặc config tương đương.
- Script collector.
- Tài liệu demo.

Checklist:

- [ ] Có lịch backup database.
- [ ] Có thư mục backup không public qua web.
- [ ] Có kiểm tra restore ít nhất một lần.
- [ ] Không đưa secret vào repository.

## Firewall/IIS hardening

Khuyến nghị cho dashboard public:

- Chỉ mở port cần thiết: 80/443 cho web, database không public.
- Ưu tiên HTTPS.
- Giới hạn IP truy cập dashboard nếu có thể.
- Không public RDP trực tiếp nếu không cần.
- Nếu cần RDP, giới hạn IP hoặc dùng VPN.
- Tắt directory browsing trong IIS.
- Không bật debug mode.
- Reverse proxy tới backend nội bộ thay vì expose nhiều port.

Checklist:

- [ ] Firewall chỉ mở port cần thiết.
- [ ] HTTPS hoạt động.
- [ ] Database chỉ listen local/internal.
- [ ] IIS không hiển thị directory listing.
- [ ] Header bảo mật cơ bản nếu cấu hình được.
