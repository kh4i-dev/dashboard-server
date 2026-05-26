const suggestions = {
  cpu_high: {
    summary: "Mức sử dụng CPU vượt quá ngưỡng cấu hình.",
    causes: ["Lưu lượng yêu cầu (traffic) tăng đột ngột.", "Một tiến trình bị kẹt trong vòng lặp vô hạn.", "Tác vụ sao lưu, quét virus hoặc tác vụ lập lịch đang chạy.", "Có khả năng lưu lượng truy cập bất thường nhắm vào dịch vụ web."],
    checks: ["Mở Task Manager hoặc Resource Monitor.", "Sắp xếp các tiến trình theo mức sử dụng CPU.", "Kiểm tra nhật ký yêu cầu (request logs) của IIS nếu traffic web cao.", "So sánh với lịch sử cảnh báo gần đây."],
    actions: ["Xác định và dừng tiến trình bất thường nếu an toàn.", "Chỉ khởi động lại dịch vụ bị ảnh hưởng sau khi kiểm tra nhật ký.", "Di chuyển các tác vụ lập lịch nặng ra ngoài giờ làm việc.", "Thêm giới hạn tần suất yêu cầu (rate limiting) nếu traffic có vẻ khả nghi."],
    prevention: ["Luôn bật cảnh báo ngưỡng CPU.", "Theo dõi xu hướng CPU trong lịch sử.", "Tài liệu hóa các công việc bảo trì định kỳ."]
  },
  ram_high: {
    summary: "Mức sử dụng RAM cao và có thể ảnh hưởng đến sự ổn định của dịch vụ.",
    causes: ["Rò rỉ bộ nhớ (memory leak) của ứng dụng.", "Quá nhiều kết nối hoạt động cùng lúc.", "Bộ nhớ đệm cơ sở dữ liệu hoặc khối lượng truy vấn nặng.", "Các tác vụ nền sử dụng nhiều bộ nhớ."],
    checks: ["Kiểm tra các tiến trình sử dụng nhiều bộ nhớ nhất.", "Xem xét mức sử dụng bộ nhớ của application pool.", "Kiểm tra cấu hình bộ nhớ của SQL Server.", "Tìm kiếm các đợt triển khai hoặc tác vụ gần đây."],
    actions: ["Khởi động lại dịch vụ bị rò rỉ bộ nhớ nếu đã xác nhận.", "Giảm bớt các tác vụ nền không cần thiết.", "Xem lại các truy vấn cơ sở dữ liệu và việc sử dụng kết nối."],
    prevention: ["Thiết lập ngưỡng cảnh báo RAM.", "Theo dõi xu hướng sử dụng bộ nhớ.", "Lên lịch khởi động lại bảo trì chỉ khi thực sự cần thiết."]
  },
  disk_full: {
    summary: "Dung lượng đĩa sắp đầy, có thể làm gián đoạn nhật ký, cơ sở dữ liệu hoặc IIS.",
    causes: ["Các nhật ký cũ không được xoay vòng (rotated).", "Các tệp sao lưu (backup) bị tích tụ quá nhiều.", "Tệp nhật ký cơ sở dữ liệu tăng quá lớn.", "Các tệp tạm thời hoặc tệp tải lên gia tăng."],
    checks: ["Tìm kiếm các thư mục lớn nhất.", "Kiểm tra nhật ký IIS và thư mục sao lưu cơ sở dữ liệu.", "Kiểm tra mức tăng trưởng tệp nhật ký của SQL Server.", "Xác minh dung lượng trống của từng ổ đĩa."],
    actions: ["Dọn dẹp các tệp tạm thời.", "Lưu trữ hoặc xóa bỏ các bản sao lưu cũ.", "Xoay vòng hoặc nén các tệp nhật ký.", "Mở rộng đĩa nếu môi trường thử nghiệm hỗ trợ."],
    prevention: ["Bật cảnh báo đĩa ở mức cảnh cáo và khẩn cấp.", "Xây dựng chính sách dọn dẹp nhật ký.", "Lưu trữ các bản sao lưu bên ngoài thư mục web công cộng."]
  },
  service_down: {
    summary: "Một dịch vụ Windows đang được giám sát không hoạt động.",
    causes: ["Dịch vụ đã bị dừng thủ công.", "Application pool hoặc dịch vụ phụ thuộc bị lỗi (crash).", "Cấu hình không hợp lệ.", "Xung đột cổng (port) hoặc quy tắc tường lửa thay đổi."],
    checks: ["Kiểm tra trạng thái Windows Services.", "Mở Event Viewer xung quanh thời điểm xảy ra cảnh báo.", "Kiểm tra các dịch vụ phụ thuộc.", "Xác minh các cổng và quy tắc tường lửa."],
    actions: ["Khởi động lại dịch vụ.", "Khởi động lại IIS/Application Pool nếu ảnh hưởng đến W3SVC.", "Kiểm tra nhật ký SQL Server nếu dịch vụ cơ sở dữ liệu bị ảnh hưởng.", "Khôi phục lại các thay đổi cấu hình gần đây nếu cần."],
    prevention: ["Giám sát liên tục trạng thái dịch vụ.", "Ghi lại các hành động của admin vào nhật ký kiểm tra (audit log).", "Sao lưu cấu hình dịch vụ và ứng dụng."]
  },
  login_bruteforce: {
    summary: "Phát hiện nhiều nỗ lực đăng nhập thất bại liên tiếp.",
    causes: ["Mật khẩu yếu đang là mục tiêu tấn công.", "Dashboard bị lộ ra ngoài quá rộng rãi.", "Không có danh sách IP cho phép hoặc giới hạn tần suất.", "Tài khoản admin dùng chung đang bị dò mật khẩu."],
    checks: ["Xem lại IP đăng nhập thất bại và tên người dùng.", "Kiểm tra xem IP đó có phải là IP dự kiến hay không.", "Kiểm tra xem các tài khoản người dùng có thay đổi bất thường nào không.", "Xem xét cấu hình mở của tường lửa."],
    actions: ["Tạm thời chặn IP khả nghi.", "Thay đổi mật khẩu admin nếu cần.", "Luôn duy trì bật giới hạn tần suất (rate limit).", "Vô hiệu hóa các tài khoản không sử dụng."],
    prevention: ["Sử dụng mật khẩu mạnh.", "Giới hạn quyền truy cập dashboard bằng IP hoặc VPN.", "Không công khai cổng RDP ra Internet.", "Luôn bật nhật ký kiểm tra (audit log)."]
  },
  firewall_block: {
    summary: "Một quy tắc tường lửa có thể đang chặn cổng dịch vụ dự kiến.",
    causes: ["Cổng 80 hoặc 443 bị chặn.", "Quy tắc inbound mới làm thay đổi quyền truy cập dịch vụ.", "Hồ sơ mạng (network profile) thay đổi từ Private sang Public.", "Một bước thắt chặt bảo mật đã được áp dụng mà chưa qua xác minh."],
    checks: ["Xem lại các quy tắc inbound của Windows Defender Firewall.", "Kiểm tra cổng bị ảnh hưởng từ một máy chủ khác.", "Kiểm tra IIS binding và trạng thái dịch vụ.", "Xem xét nhật ký kiểm tra (audit logs) gần đây của quản trị viên."],
    actions: ["Chỉ cho phép cổng dịch vụ cần thiết từ các mạng đáng tin cậy.", "Khôi phục lại quy tắc tường lửa sai sót nếu đó là do vô tình.", "Duy trì giới hạn các cổng RDP và quản trị.", "Tài liệu hóa tập hợp quy tắc cuối cùng."],
    prevention: ["Sử dụng danh sách kiểm tra thay đổi trước khi chỉnh sửa tường lửa.", "Lưu trữ bản xuất cấu hình tường lửa làm mốc chuẩn.", "Giám sát tính sẵn sàng của cổng sau khi thay đổi."]
  },
  network_timeout: {
    summary: "Máy chủ hoặc dịch vụ đang giám sát bị hết thời gian chờ kết nối (timeout) từ đường truyền mạng.",
    causes: ["Sự cố bộ điều hợp mạng (network adapter).", "Sự cố cổng kết nối (gateway) hoặc DNS.", "Tường lửa đã loại bỏ (dropped) ICMP hoặc lưu lượng dịch vụ.", "Tín hiệu nhịp tim (heartbeat) của bộ thu thập dữ liệu bị cũ/mất."],
    checks: ["Thực hiện lệnh ping đến máy chủ từ máy giám sát.", "Kiểm tra cài đặt gateway và DNS.", "Xác minh trạng thái bộ điều hợp mạng.", "So sánh trạng thái dịch vụ với tỷ lệ mất gói tin (packet loss)."],
    actions: ["Khôi phục cấu hình bộ điều hợp mạng hoặc gateway.", "Kiểm tra phạm vi tường lửa cho traffic giám sát.", "Chỉ khởi động lại dịch vụ mạng bị ảnh hưởng nếu cần.", "Báo cáo cấp trên nếu toàn bộ mạng con (subnet) không thể truy cập."],
    prevention: ["Duy trì bật cảnh báo hết thời gian chờ heartbeat và ping.", "Tài liệu hóa mốc chuẩn IP/gateway/DNS.", "Giới hạn các thay đổi tường lửa theo quy tắc đã được phê duyệt."]
  }
};

export function getSuggestion(alert) {
  return suggestions[alert.type] ?? {
    summary: "Chưa có kịch bản cụ thể nào cho cảnh báo này.",
    causes: ["Điều kiện giám sát không xác định hoặc tùy chỉnh."],
    checks: ["Xem xét các chỉ số, trạng thái dịch vụ và nhật ký liên quan."],
    actions: ["Điều tra thủ công trước khi thực hiện thay đổi."],
    prevention: ["Thêm một kịch bản dựa trên quy tắc cụ thể sau khi đã hiểu rõ sự cố."]
  };
}

