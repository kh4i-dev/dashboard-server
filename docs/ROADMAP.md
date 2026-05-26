# Roadmap

## [MODIFY] NOC UI refactor

Checklist:

- [ ] Đổi sidebar sang: Overview, Servers, Metrics, Services, Alerts, Incidents, Logs, Security, Lab, Settings.
- [ ] Rút gọn Overview thành health summary và active incident queue.
- [ ] Chuyển demo scenarios khỏi Overview sang Lab.
- [ ] Chuyển SNTP/Telegram khỏi monitoring flow sang Settings.
- [ ] Tách Alerts và Incidents về mặt UI: Alerts là tín hiệu, Incidents là workflow xử lý.
- [ ] Giữ scope sinh viên: single-page anchors vẫn chấp nhận được, chưa cần router nhiều trang.

## Phase 1: Core Dashboard

Mục tiêu: tạo nền web dashboard có đăng nhập, layout chính và dữ liệu mẫu.

Checklist:

- [ ] Tạo cấu trúc frontend dashboard.
- [ ] Cài package icon chính `lucide-react`.
- [ ] Áp dụng quy chuẩn icon trong `docs/UI_ICON_RULES.md`.
- [ ] Tạo trang đăng nhập.
- [ ] Tạo layout chính gồm sidebar/topbar/content.
- [ ] Tạo trang Overview.
- [ ] Tạo card hiển thị CPU, RAM, disk, network, uptime.
- [ ] Tạo bảng trạng thái dịch vụ.
- [ ] Tạo dữ liệu mock để kiểm tra giao diện.
- [ ] Tạo role cơ bản: Admin và Viewer.

Tiêu chí hoàn thành:

- Người dùng đăng nhập được.
- Dashboard hiển thị được dữ liệu mẫu.
- UI đủ rõ để demo luồng chính.
- Viewer không thấy các nút cấu hình hoặc thao tác quản trị.

## Phase 2: Server Metrics

Mục tiêu: lấy dữ liệu thật từ Windows Server 2016.

Checklist:

- [ ] Viết PowerShell collector lấy CPU usage.
- [ ] Lấy RAM usage.
- [ ] Lấy disk usage.
- [ ] Lấy network throughput hoặc network status.
- [ ] Lấy uptime.
- [ ] Lấy hostname và địa chỉ IP.
- [ ] Tạo API nhận hoặc đọc metrics.
- [ ] Lưu metrics vào database.
- [ ] Cập nhật dashboard bằng dữ liệu thật.

Tiêu chí hoàn thành:

- Dashboard hiển thị metrics thật từ server.
- Metrics được lưu có timestamp.
- Có thể refresh hoặc polling định kỳ.

## Phase 3: Alert System

Mục tiêu: phát hiện sự cố dựa trên rule đơn giản.

Checklist:

- [ ] Định nghĩa alert rule cho CPU, RAM, disk.
- [ ] Định nghĩa alert rule cho service stopped.
- [ ] Định nghĩa mức độ: info, warning, critical.
- [ ] Tạo bảng alerts.
- [ ] Tạo alert engine chạy định kỳ.
- [ ] Tạo trang danh sách alerts.
- [ ] Tạo trạng thái alert: open, acknowledged, resolved.
- [ ] Cho phép admin acknowledge alert.

Tiêu chí hoàn thành:

- Khi CPU/RAM/disk vượt ngưỡng, hệ thống tạo alert.
- Khi IIS hoặc SQL Server bị stop, hệ thống tạo alert.
- Alert không bị tạo trùng liên tục cho cùng một sự cố đang mở.

## Phase 4: Logs & Security

Mục tiêu: theo dõi log hệ thống và các dấu hiệu bảo mật cơ bản.

Checklist:

- [ ] Đọc Windows Event Log liên quan đến service crash.
- [ ] Ghi log đăng nhập dashboard.
- [ ] Ghi log đăng nhập thất bại.
- [ ] Tạo trang log viewer.
- [ ] Thêm bộ lọc theo loại log, mức độ và thời gian.
- [ ] Tạo cảnh báo brute force login cơ bản.
- [ ] Tạo audit log cho thao tác admin.
- [ ] Kiểm tra firewall status hoặc port quan trọng.

Tiêu chí hoàn thành:

- Admin xem được log quan trọng trong dashboard.
- Failed login được ghi nhận.
- Có cảnh báo khi đăng nhập sai nhiều lần.

## Phase 5: AI Suggestion

Mục tiêu: hỗ trợ phân tích sự cố và đề xuất xử lý.

Checklist:

- [ ] Tạo panel gợi ý trong chi tiết alert.
- [ ] Tạo rule-based suggestion cho các sự cố phổ biến.
- [ ] Chuẩn hóa input gồm alert type, service, metric, log liên quan.
- [ ] Nếu dùng AI API, chỉ gửi dữ liệu cần thiết.
- [ ] Hiển thị nguyên nhân có thể.
- [ ] Hiển thị bước xử lý đề xuất.
- [ ] Hiển thị biện pháp phòng tránh.

Tiêu chí hoàn thành:

- Mỗi alert phổ biến có gợi ý xử lý.
- AI/rule suggestion không tự động thực thi lệnh.
- Nội dung gợi ý phù hợp quản trị mạng và troubleshooting.

## Phase 6: Report & Demo

Mục tiêu: chuẩn bị báo cáo, kịch bản demo và kiểm thử cuối.

Checklist:

- [ ] Viết mô tả kiến trúc hệ thống.
- [ ] Chụp màn hình dashboard.
- [ ] Chuẩn bị kịch bản demo IIS down.
- [ ] Chuẩn bị kịch bản demo SQL Server down.
- [ ] Chuẩn bị kịch bản demo CPU overload.
- [ ] Chuẩn bị kịch bản demo firewall block port 80.
- [ ] Chuẩn bị dữ liệu log mẫu.
- [ ] Kiểm tra toàn bộ demo trên Windows Server 2016.
- [ ] Viết phần hạn chế và hướng phát triển.

Tiêu chí hoàn thành:

- Demo chạy được từ đầu đến cuối.
- Có báo cáo giải thích đúng trọng tâm Quản trị mạng.
- Có bằng chứng dashboard phát hiện sự cố và đề xuất xử lý.

## Phase 7: Advanced Visuals & Alert Channels

Mục tiêu: Nâng cấp toàn diện trực quan hóa dữ liệu và bổ sung các kênh cảnh báo, quản trị đồng hồ thời gian chuẩn. Thiết kế giao diện tối giản hiện đại (Dark Mode) học hỏi UX từ Grafana, Netdata, Zabbix và Windows Admin Center.

Checklist:

- [ ] Cấu hình mặc định SNTP và Telegram Alerts trong database seed.
- [ ] Thiết kế và tích hợp module SNTP client UDP (cổng 123) đo chênh lệch clock.
- [ ] Tích hợp lệnh PowerShell `w32tm` để đồng bộ giờ máy chủ vật lý Windows Server 2016.
- [ ] Bổ sung các endpoint API `/settings/sntp` và `/settings/sntp/sync`.
- [ ] Bổ sung các endpoint API `/settings/telegram` và `/settings/telegram/test`.
- [ ] Tích hợp tính năng tự động gửi thông báo Telegram định dạng Markdown khi có sự cố mới trong `alertEngine.js`.
- [ ] Xây dựng khung Sidebar điều hướng 9 trang đầy đủ: Overview, Servers, Services, Metrics, Alerts, Logs, Security, Backup, Settings.
- [ ] Nâng cấp thẻ Overview gồm 6 bộ chỉ số chính: CPU, RAM, Disk, Network, Uptime, Services Health có đổi màu động theo trạng thái.
- [ ] Thiết kế trang Chi tiết Sự cố (Incident Detail Playbook) gồm 4 phần: Nguyên nhân, Dấu hiệu, Xử lý đề xuất, Phòng tránh.
- [ ] Nâng cấp biểu đồ CPU hiện có lấy 60 mẫu lịch sử đầy đủ.
- [ ] Thiết kế và vẽ 3 biểu đồ SVG động mới: RAM/CPU Dual Trend, Disk Gauge Radial Donut, và Network Throughput Area Chart.
- [ ] Bổ sung biểu đồ lưới Availability Uptime Map (24 chu kỳ gần nhất).

Tiêu chí hoàn thành:

- Giao diện tối giản hiện đại đạt chuẩn bài tập lớn Quản trị mạng, không copy sao chép nguyên mẫu nhưng tối ưu hóa bố cục từ Grafana/Netdata.
- Khung Sidebar điều hướng hoạt động mượt mà giữa các trang chỉ số và quản trị.
- Giao diện Admin cấu hình được SNTP và Telegram.
- Gửi tin nhắn test Telegram thành công và tự động bắn cảnh báo khi mô phỏng sự cố.
- Kích hoạt đồng bộ thời gian hệ thống thật trên Windows Server thông qua PowerShell.
- Hiển thị đầy đủ 4 bộ biểu đồ SVG động tuyệt đẹp, responsive tốt và load đầy đủ dữ liệu lịch sử.
