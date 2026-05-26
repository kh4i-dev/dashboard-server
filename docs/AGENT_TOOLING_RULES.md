# Agent Tooling Rules

## Mục tiêu

Quy định cách AI Agent sử dụng CodeGraph, React Doctor và các skill có sẵn khi phân tích, sửa lỗi hoặc cải thiện dự án dashboard server/network.

## Rule bắt buộc

[NEW] Trước khi sửa code, AI Agent phải chọn đúng công cụ theo loại vấn đề:

- Dùng CodeGraph cho câu hỏi cấu trúc code: symbol nằm ở đâu, function nào gọi function nào, flow từ API đến UI, thay đổi một module sẽ ảnh hưởng gì.
- Dùng tìm kiếm native như `rg` cho câu hỏi literal: text, route string, log message, CSS class, tên file.
- Dùng skill phù hợp khi yêu cầu khớp với skill đã có, ví dụ `react-doctor`, `diagnose`, `tdd`, `grill-with-docs`.
- Sau khi sửa React/frontend, chạy React Doctor nếu môi trường cho phép.

## CodeGraph MCP

Khi dự án có CodeGraph MCP server, ưu tiên:

| Nhu cầu | Công cụ |
|---|---|
| Tìm symbol/function/component | `codegraph_search` |
| Hiểu một khu vực code | `codegraph_context` |
| Xem source nhiều symbol liên quan | `codegraph_explore` |
| Xem function/component được gọi bởi ai | `codegraph_callers` |
| Xem function/component gọi gì | `codegraph_callees` |
| Trace flow từ A đến B | `codegraph_trace` |
| Đánh giá thay đổi ảnh hưởng gì | `codegraph_impact` |

Nguyên tắc:

- Không grep trước khi tìm symbol bằng tên.
- Không tự rebuild call graph bằng nhiều lần grep nếu CodeGraph có thể trace.
- Không query CodeGraph ngay sau khi vừa ghi file; đợi watcher sync.
- Nếu CodeGraph báo chưa initialized, hỏi user trước khi chạy init.

## React Doctor

Dùng khi:

- Vừa sửa React component.
- Vừa sửa UI/CSS ảnh hưởng trải nghiệm.
- Sắp commit hoặc bàn giao một feature frontend.
- User yêu cầu clean up hoặc kiểm tra chất lượng React.

Lệnh mặc định sau khi sửa React:

```bash
npx react-doctor@latest --verbose --diff
```

Nếu cần scan toàn bộ frontend:

```bash
npx react-doctor@latest --verbose
```

Nguyên tắc:

- Nếu React Doctor báo score giảm, ưu tiên sửa regression trước khi bàn giao.
- Nếu không chạy được vì thiếu git/base branch/tooling, báo rõ trong final response.
- React Doctor không thay thế `npm run build` hoặc test smoke.

## Skill selection

AI Agent phải dùng skill khi yêu cầu khớp rõ với mô tả skill:

- `react-doctor`: kiểm tra chất lượng React/frontend.
- `diagnose`: debug bug, lỗi runtime, lỗi khó tái hiện.
- `tdd`: yêu cầu test-first hoặc red-green-refactor.
- `grill-with-docs`: thảo luận kiến trúc, chốt thuật ngữ và cập nhật docs.
- `prototype`: dựng bản thử nghiệm nhanh.

Nguyên tắc:

- Đọc `SKILL.md` trước khi áp dụng skill.
- Không dùng skill như nhãn hình thức; phải thực hiện workflow chính của skill.
- Nếu skill yêu cầu tool không có hoặc không chạy được, dùng fallback hợp lý và báo rõ.

## Final verification checklist

Trước khi trả lời cuối sau một thay đổi code:

- [ ] Đã đọc docs liên quan trong `docs/`.
- [ ] Đã dùng CodeGraph nếu cần hiểu cấu trúc/call flow.
- [ ] Đã dùng đúng skill nếu task khớp skill.
- [ ] Đã chạy `npm run build` khi sửa frontend/backend build.
- [ ] Đã chạy `npm run smoke` nếu thay đổi API hoặc flow chính.
- [ ] Đã chạy React Doctor khi sửa React, hoặc báo lý do chưa chạy.
- [ ] Đã cập nhật docs nếu behavior/API/schema/UI rule thay đổi.

