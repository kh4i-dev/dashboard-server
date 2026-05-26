# Quy tắc đồng bộ Code & Tài liệu

Tài liệu này quy định quy trình bắt buộc dành cho Antigravity, Codex và các AI Agent khác khi chỉnh sửa, cập nhật mã nguồn trong dự án này.

## Bước 1: Đọc tài liệu trước khi code

Trước khi sửa code hoặc đề xuất giải pháp:

1. Khảo sát thư mục `docs/` để tìm tài liệu mô tả tính năng hoặc kiến trúc liên quan.
2. Đọc tài liệu liên quan trước khi code:
   - Sửa database: đọc `docs/DATABASE_SCHEMA.md`.
   - Sửa API: đọc `docs/API_SPEC.md`.
   - Sửa UI/icon: đọc `docs/FEATURE_SPEC.md` và `docs/UI_ICON_RULES.md`.
   - Sửa bảo mật: đọc `docs/SECURITY.md`.
   - Sửa deploy/test: đọc `docs/DEPLOYMENT.md` hoặc `docs/TEST_PLAN.md`.
3. Không đoán mò cấu trúc bảng, endpoint, payload, port hoặc rule nếu chưa đọc tài liệu chính thức.

## Bước 2: Cập nhật tài liệu song song

Trong quá trình thiết kế giải pháp và viết code:

1. Nếu thêm/sửa bảng hoặc cột dữ liệu, cập nhật ngay `docs/DATABASE_SCHEMA.md`.
2. Nếu thêm/sửa endpoint, payload, HTTP status code hoặc error code, cập nhật ngay `docs/API_SPEC.md`.
3. Nếu thêm/sửa UI component, màu sắc, layout hoặc icon, cập nhật `docs/FEATURE_SPEC.md` và `docs/UI_ICON_RULES.md`.
4. Nếu thêm kịch bản lỗi, test case hoặc cách xử lý sự cố, cập nhật `docs/TEST_PLAN.md` hoặc `docs/TROUBLESHOOTING_SCENARIOS.md`.
5. Đánh dấu thay đổi tài liệu bằng `[NEW]`, `[MODIFY]` hoặc `[DELETE]` khi phù hợp.

## Bước 3: Đồng bộ & báo cáo cuối

Sau khi hoàn thành code:

1. Đối chiếu lại code với docs để tránh stale docs.
2. Chạy lệnh kiểm tra phù hợp, tối thiểu `npm run build` và `npm run smoke` khi thay đổi flow chính.
3. Trong phản hồi cuối, báo cáo:
   - Tài liệu đã đọc.
   - Tài liệu đã cập nhật.
   - Lệnh kiểm tra đã chạy.
   - Phần chưa làm được nếu có.

## [NEW] Bước 4: Dùng đúng MCP/Skill để phân tích và sửa lỗi

Khi sửa code hoặc xử lý lỗi, AI Agent bắt buộc dùng công cụ phù hợp thay vì đoán mò.

### CodeGraph MCP

Dùng CodeGraph cho câu hỏi cấu trúc code:

- Tìm symbol, function, component.
- Xem caller/callee.
- Trace flow từ API đến UI.
- Đánh giá impact khi sửa module.

Không dùng grep trước khi tìm symbol bằng tên. Nếu CodeGraph chưa initialized, hỏi user trước khi chạy init.

### React Doctor

Sau khi sửa React component, UI, CSS hoặc flow frontend, chạy:

```bash
npx react-doctor@latest --verbose --diff
```

Khi cần scan toàn bộ frontend:

```bash
npx react-doctor@latest --verbose
```

Nếu score giảm hoặc có lỗi nghiêm trọng, sửa trước khi bàn giao. Nếu không chạy được vì môi trường thiếu git/base branch/tooling, báo rõ trong phản hồi cuối.

### Skill phù hợp

Dùng skill đúng theo loại task:

- `react-doctor`: kiểm tra chất lượng React/frontend.
- `diagnose`: debug bug, runtime issue, lỗi khó tái hiện.
- `tdd`: test-first hoặc red-green-refactor.
- `grill-with-docs`: thảo luận kiến trúc, chốt thuật ngữ, cập nhật docs.
- `prototype`: dựng bản thử nghiệm nhanh.

Quy định chi tiết nằm ở `docs/AGENT_TOOLING_RULES.md`.

