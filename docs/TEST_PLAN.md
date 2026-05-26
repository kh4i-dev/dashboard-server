# Test Plan

## [MODIFY] NOC UI refactor tests

- Sidebar phải có đúng thứ tự: Overview, Servers, Metrics, Services, Alerts, Incidents, Logs, Security, Lab, Settings.
- Overview không hiển thị Settings hoặc Lab controls trực tiếp.
- Lab section chứa các nút mô phỏng sự cố.
- Settings section chứa SNTP/Telegram config.
- Incidents section hiển thị selected incident/playbook và action acknowledge/resolve.

## [NEW] Runtime Windows snapshot test

Dashboard overview test should confirm hostname/IP/OS and metrics match the local Windows host instead of demo values such as `WIN-SRV2016-LAB` or `192.168.1.10`.

## [MODIFY] Current MVP test notes

- SNTP sync test passes when `lastSync`, `offsetMs`, and `status=success` are updated through `/api/v1/settings/sntp/sync`.
- Telegram test requires a real Bot Token, Chat ID, and outbound HTTPS access to `api.telegram.org`. If the network blocks Telegram, local dashboard alerts must still work.

## [NEW] Advanced feature manual tests

### Sidebar navigation

- Bước 1: Đăng nhập admin.
- Bước 2: Kiểm tra sidebar có đủ các mục chính theo roadmap dài hạn.
- Kết quả mong đợi: Overview, Servers, Services, Metrics, Alerts, Logs, Security, Backup, Settings hiển thị nhất quán hoặc có placeholder rõ nếu chưa implement.

### Incident detail playbook

- Bước 1: Mô phỏng `iis_down`.
- Bước 2: Mở alert IIS down.
- Bước 3: Kiểm tra panel gợi ý.
- Kết quả mong đợi: Có root causes, symptoms/checks, actions và preventions.

### SNTP settings

- Bước 1: Đăng nhập admin.
- Bước 2: Cấu hình NTP server hợp lệ.
- Bước 3: Thực hiện sync hoặc test kết nối.
- Kết quả mong đợi: Hệ thống ghi audit log, cập nhật trạng thái sync, không lộ command hoặc secret.

### Telegram alerts

- Bước 1: Cấu hình Bot Token và Chat ID.
- Bước 2: Gửi test message.
- Bước 3: Mô phỏng alert critical.
- Kết quả mong đợi: Telegram nhận message nếu internet/API hoạt động; nếu lỗi, dashboard vẫn tạo alert local và ghi log lỗi an toàn.

## Unit test

Mục tiêu: kiểm tra logic nhỏ, đặc biệt là rule cảnh báo và phân quyền.

Checklist:

- [ ] Test hàm tính severity CPU/RAM/disk.
- [ ] Test rule service stopped tạo alert.
- [ ] Test không tạo alert trùng khi alert đang open.
- [ ] Test chuyển alert sang resolved.
- [ ] Test validation input API.
- [ ] Test RBAC middleware Admin/Viewer.
- [ ] Test suggestion rule cho các alert phổ biến.

Tiêu chí đạt:

- Logic alert chính có test.
- Test chạy tự động bằng lệnh đơn giản.
- Test fail khi rule bị thay đổi sai.

## Integration test

Mục tiêu: kiểm tra API, database và flow chính.

Checklist:

- [ ] Login thành công.
- [ ] Login sai ghi auth log.
- [ ] Viewer không gọi được endpoint admin.
- [ ] Collector gửi metrics thành công.
- [ ] Collector gửi service status thành công.
- [ ] Alert engine tạo alert từ metrics.
- [ ] Dashboard overview trả dữ liệu mới nhất.
- [ ] Acknowledge alert chỉ admin thực hiện được.

Tiêu chí đạt:

- Flow API chính chạy được với database test.
- Response giữ format `{ data, error, meta }`.
- Error code đúng với tình huống.

## Manual test case

### Test dashboard overview

- Bước 1: Đăng nhập admin.
- Bước 2: Mở dashboard overview.
- Bước 3: Kiểm tra CPU/RAM/disk/network hiển thị.
- Kết quả mong đợi: số liệu có timestamp và không lỗi giao diện.

### Test service down

- Bước 1: Stop IIS.
- Bước 2: Chờ collector chạy.
- Bước 3: Mở trang services.
- Kết quả mong đợi: IIS chuyển stopped và alert critical được tạo.

### Test alert acknowledge

- Bước 1: Mở alert đang open.
- Bước 2: Bấm acknowledge bằng admin.
- Kết quả mong đợi: alert chuyển acknowledged, audit log được ghi.

### Test viewer permission

- Bước 1: Đăng nhập viewer.
- Bước 2: Truy cập trang users hoặc threshold settings.
- Kết quả mong đợi: bị chặn hoặc không thấy chức năng.

## Security test

Checklist:

- [ ] Đăng nhập sai nhiều lần bị rate limit hoặc tạo warning.
- [ ] Password không xuất hiện trong API response.
- [ ] Viewer không gọi được endpoint admin bằng Postman/curl.
- [ ] Input lạ không gây SQL injection.
- [ ] Log HTML/script được escape khi hiển thị.
- [ ] Dashboard public dùng HTTPS nếu demo public.
- [ ] Database port không public ra internet.
- [ ] Debug mode tắt khi demo.

## Demo test checklist

Trước ngày demo:

- [ ] Windows Server 2016 khởi động ổn định.
- [ ] Database chạy.
- [ ] Backend API chạy.
- [ ] Dashboard truy cập được.
- [ ] Collector chạy định kỳ.
- [ ] IIS service có trong danh sách monitoring.
- [ ] SQL Server service có trong danh sách monitoring.
- [ ] Có user admin và viewer.
- [ ] Có dữ liệu metrics mới.
- [ ] Có thể stop/start IIS để demo.
- [ ] Có thể mô phỏng CPU overload.
- [ ] Có thể mô phỏng firewall block port 80.
- [ ] Có sẵn screenshot dự phòng nếu demo live lỗi.
- [ ] [NEW] Có thể dùng endpoint/UI demo scenario để mô phỏng nhanh `iis_down`, `sql_down`, `cpu_overload`, `disk_full`, `normal`.

Tiêu chí demo đạt:

- Người xem thấy được trạng thái bình thường.
- Người xem thấy được sự cố được mô phỏng.
- Dashboard phát hiện sự cố.
- Alert xuất hiện đúng mức độ.
- Suggestion panel đưa ra hướng xử lý hợp lý.
- Sau khi xử lý, trạng thái quay lại bình thường.
