# Troubleshooting Scenarios

## 1. IIS down

Mô tả:

- Dịch vụ IIS/W3SVC bị dừng khiến website không truy cập được.

Dấu hiệu:

- Dashboard báo service IIS stopped.
- Website trả lỗi không kết nối được.
- Alert `IIS down` mức critical.

Nguyên nhân:

- Admin stop service thủ công.
- Application pool crash.
- Lỗi cấu hình website.
- Port 80/443 bị chiếm hoặc bị chặn.

Cách phát hiện:

- Kiểm tra service `W3SVC`.
- Kiểm tra HTTP request tới website.
- Xem Windows Event Log.
- Kiểm tra binding IIS.

Cách xử lý:

- Start lại service IIS.
- Restart application pool.
- Kiểm tra file cấu hình website.
- Kiểm tra port 80/443.

Giải pháp phòng tránh:

- Theo dõi trạng thái IIS định kỳ.
- Cảnh báo khi service stopped.
- Ghi log thay đổi service.
- Backup cấu hình IIS.

## 2. SQL Server down

Mô tả:

- SQL Server bị dừng làm ứng dụng không truy cập được database.

Dấu hiệu:

- Service SQL Server stopped.
- API trả lỗi database unavailable.
- Dashboard có alert critical.

Nguyên nhân:

- Service bị stop.
- Database lỗi cấu hình.
- Thiếu RAM/disk.
- Tài khoản service không đủ quyền.

Cách phát hiện:

- Kiểm tra service `MSSQLSERVER` hoặc `SQLEXPRESS`.
- Kiểm tra connection từ backend.
- Xem SQL Server logs.
- Kiểm tra disk còn trống.

Cách xử lý:

- Start lại SQL Server service.
- Kiểm tra connection string.
- Kiểm tra dung lượng disk.
- Kiểm tra log lỗi SQL Server.

Giải pháp phòng tránh:

- Theo dõi SQL service.
- Backup database định kỳ.
- Cảnh báo disk gần đầy.
- Giới hạn quyền tài khoản service.

## 3. Firewall block port 80

Mô tả:

- Firewall chặn port 80 khiến HTTP không truy cập được.

Dấu hiệu:

- Ping server có thể vẫn thành công.
- Website không mở được qua HTTP.
- Dashboard báo web check failed.

Nguyên nhân:

- Rule firewall mới chặn inbound port 80.
- IIS binding đúng nhưng traffic không đến được.
- Network ACL bên ngoài chặn port.

Cách phát hiện:

- Kiểm tra Windows Defender Firewall rule.
- Dùng `Test-NetConnection -Port 80`.
- Kiểm tra IIS vẫn running.

Cách xử lý:

- Mở lại inbound port 80 nếu cần.
- Ưu tiên chuyển sang HTTPS port 443.
- Kiểm tra rule trùng hoặc rule deny ưu tiên cao hơn.

Giải pháp phòng tránh:

- Ghi nhận thay đổi firewall.
- Chỉ cho admin thay đổi firewall.
- Có checklist firewall trước khi public dashboard.

## 4. CPU overload

Mô tả:

- CPU usage vượt ngưỡng trong một khoảng thời gian.

Dấu hiệu:

- Dashboard CPU đỏ.
- Server phản hồi chậm.
- Alert `CPU high`.

Nguyên nhân:

- Request tăng bất thường.
- Process lỗi hoặc vòng lặp.
- Malware hoặc script lạ.
- Tác vụ backup/scan chạy cùng lúc.

Cách phát hiện:

- Kiểm tra CPU metric.
- Dùng Task Manager/Resource Monitor.
- Kiểm tra process đang dùng CPU cao.
- Xem log request nếu liên quan web.

Cách xử lý:

- Xác định process gây tải.
- Restart service nếu phù hợp.
- Giới hạn hoặc dừng tác vụ bất thường.
- Kiểm tra traffic nếu nghi ngờ tấn công.

Giải pháp phòng tránh:

- Cảnh báo CPU theo ngưỡng.
- Theo dõi lịch sử CPU.
- Lập lịch backup/scan ngoài giờ cao điểm.
- Giới hạn request hoặc cấu hình rate limit cho web.

## 5. Disk full

Mô tả:

- Ổ đĩa gần đầy làm service lỗi hoặc không ghi log/database được.

Dấu hiệu:

- Dashboard disk critical.
- SQL hoặc IIS có thể lỗi.
- Log ghi lỗi thiếu dung lượng.

Nguyên nhân:

- Log tăng quá nhanh.
- Backup cũ không được dọn.
- File tạm hoặc upload lớn.
- Database log file phình to.

Cách phát hiện:

- Kiểm tra disk usage theo ổ đĩa.
- Tìm thư mục chiếm dung lượng lớn.
- Kiểm tra log/backup/database file.

Cách xử lý:

- Xóa file tạm không cần thiết.
- Di chuyển hoặc nén backup cũ.
- Dọn log cũ theo chính sách.
- Mở rộng disk nếu lab hỗ trợ.

Giải pháp phòng tránh:

- Cảnh báo disk > 85% và critical > 95%.
- Có lịch dọn log.
- Không lưu backup trong thư mục public web.
- Theo dõi tăng trưởng dung lượng.

## 6. Brute force login

Mô tả:

- Có nhiều lần đăng nhập sai vào dashboard hoặc Windows server.

Dấu hiệu:

- Nhiều failed login trong thời gian ngắn.
- Cùng một IP thử nhiều username.
- Dashboard tạo security alert.

Nguyên nhân:

- Password yếu.
- Dashboard public không giới hạn IP.
- Không có rate limit login.

Cách phát hiện:

- Kiểm tra auth log.
- Đếm failed login theo IP và username.
- Kiểm tra Windows Security Event nếu áp dụng.

Cách xử lý:

- Khóa tạm IP hoặc tài khoản nghi vấn.
- Đổi mật khẩu admin nếu cần.
- Bật rate limit.
- Kiểm tra tài khoản lạ.

Giải pháp phòng tránh:

- Mật khẩu mạnh.
- Rate limit login.
- Audit log.
- Giới hạn IP truy cập dashboard.
- Không public RDP trực tiếp.

## 7. Network unreachable

Mô tả:

- Server hoặc dịch vụ không thể truy cập từ dashboard/client.

Dấu hiệu:

- Ping timeout.
- Collector không gửi dữ liệu.
- Dashboard báo server offline hoặc stale data.

Nguyên nhân:

- Server tắt hoặc mất mạng.
- Firewall chặn ICMP/API.
- Sai IP/DNS.
- Dịch vụ backend/collector dừng.

Cách phát hiện:

- Kiểm tra `last_seen_at`.
- Ping hoặc `Test-NetConnection`.
- Kiểm tra firewall.
- Kiểm tra collector task/service.

Cách xử lý:

- Kiểm tra kết nối mạng.
- Kiểm tra IP/DNS.
- Start lại collector.
- Mở port API nếu bị chặn.

Giải pháp phòng tránh:

- Health check định kỳ.
- Alert khi server mất heartbeat.
- Ghi log collector.
- Có checklist firewall/network trước demo.

