# Bối cảnh dự án

## Mô tả bài toán

Dự án xây dựng một hệ thống web quản trị và giám sát Windows Server 2016 phục vụ bài tập lớn môn Quản trị mạng. Hệ thống giúp quản trị viên quan sát tình trạng server, phát hiện sớm sự cố mạng hoặc dịch vụ, ghi nhận log và đưa ra gợi ý xử lý cơ bản.

Vấn đề chính cần giải quyết:

- Quản trị viên khó theo dõi liên tục CPU, RAM, disk, network và trạng thái dịch vụ nếu chỉ kiểm tra thủ công trên server.
- Khi xảy ra sự cố như IIS down, SQL Server down, firewall chặn port hoặc CPU quá tải, cần có cảnh báo rõ ràng.
- Sinh viên cần mô phỏng được sự cố mạng thực tế và trình bày được quy trình phát hiện, xử lý, bảo mật lại hệ thống.

## Phạm vi hệ thống

Hệ thống tập trung vào một hoặc một vài Windows Server 2016 trong môi trường lab.

Trong phạm vi:

- Web dashboard hiển thị chỉ số server.
- Theo dõi trạng thái dịch vụ quan trọng như IIS và SQL Server.
- Thu thập metrics bằng PowerShell hoặc agent nội bộ.
- Tạo cảnh báo dựa trên ngưỡng cấu hình.
- Lưu log hệ thống và log cảnh báo.
- Quản lý tài khoản admin/viewer.
- Gợi ý xử lý sự cố bằng rule đơn giản hoặc AI suggestion panel.
- Triển khai thử nghiệm public dashboard qua HTTPS hoặc trong mạng nội bộ.

Ngoài phạm vi:

- Không xây dựng SIEM đầy đủ.
- Không thay thế các công cụ enterprise như Zabbix, Grafana, Prometheus, Splunk.
- Không tự động sửa lỗi hệ thống khi chưa có xác nhận của admin.
- Không quản lý hạ tầng cloud phức tạp.
- Không làm chatbot AI tổng quát.

## Người dùng chính

### Admin

Quản trị toàn bộ dashboard, cấu hình server, rule cảnh báo, người dùng và xem log bảo mật.

### Viewer

Chỉ xem dashboard, trạng thái dịch vụ, cảnh báo và log cơ bản. Không được chỉnh cấu hình hoặc thao tác hệ thống.

### Giảng viên/người chấm demo

Quan sát luồng demo: hệ thống bình thường, mô phỏng sự cố, dashboard phát hiện, cảnh báo hiển thị, hệ thống đề xuất xử lý.

## Use case chính

- Admin đăng nhập dashboard.
- Admin xem tổng quan CPU, RAM, disk, network và uptime.
- Admin xem trạng thái IIS/SQL Server.
- Hệ thống phát hiện IIS bị stop và tạo alert.
- Hệ thống phát hiện SQL Server không chạy và tạo alert.
- Hệ thống phát hiện CPU vượt ngưỡng.
- Hệ thống phát hiện disk gần đầy.
- Admin xem log sự cố.
- Admin xem gợi ý xử lý cho từng alert.
- Admin cấu hình ngưỡng cảnh báo.
- Viewer xem trạng thái hệ thống nhưng không chỉnh sửa được.

## Ràng buộc kỹ thuật

- Ưu tiên triển khai trên Windows Server 2016.
- Collector nên dùng PowerShell vì phù hợp Windows Server.
- Backend nên chạy được trên Windows, ví dụ Node.js runtime.
- Database có thể dùng SQL Server hoặc MySQL.
- Dashboard có thể host qua IIS reverse proxy hoặc chạy trực tiếp bằng Node.js trong môi trường lab.
- Giao diện cần đơn giản, rõ trạng thái, dễ demo.
- API phải có xác thực và phân quyền.
- Khi public dashboard, bắt buộc có HTTPS, firewall rule và giới hạn truy cập hợp lý.

## Giới hạn đồ án sinh viên

Dự án cần vừa sức, ưu tiên tính hoàn chỉnh và demo được hơn là quá nhiều tính năng.

Giới hạn đề xuất:

- Theo dõi 1 server chính trong bản demo.
- Theo dõi 2-5 dịch vụ quan trọng.
- Có 5-7 kịch bản sự cố mạng tiêu biểu.
- Alert rule dùng ngưỡng đơn giản.
- AI suggestion chỉ hỗ trợ phân tích alert, không điều khiển hệ thống tự động.
- Không yêu cầu realtime tuyệt đối; polling 5-30 giây là đủ cho demo.
- Không yêu cầu multi-tenant hoặc phân quyền enterprise.

