# Playbook: Hybrid Editor Architecture

## Mục tiêu (Objective)
Xây dựng một trình soạn thảo (editor) tài liệu khoa học/học thuật theo hướng Hybrid (kết hợp Client-side và Server-side), lấy cảm hứng và tham khảo từ các dự án mã nguồn mở có sẵn trong thư mục `references/` (`texlyre` và `typst-online-editor`).

## Nguồn Tham Khảo (References)
1. **`references/texlyre`**: 
   - Tham khảo cách tổ chức trạng thái (state management) của trình soạn thảo.
   - Tham khảo luồng xử lý (pipeline) văn bản, phân tích cú pháp (parsing) và cơ chế live-preview.
2. **`references/typst-online-editor`**:
   - Tham khảo cách tích hợp trình biên dịch (compiler) hoặc WebAssembly (WASM) trực tiếp trên trình duyệt để đạt tốc độ render phía client nhanh nhất.
   - Tham khảo cách quản lý hệ thống tệp (file system) của một dự án tài liệu nhiều file.

## Quy tắc Thiết Kế Hybrid (Client-Server Architecture)

### 1. Client-Side (Ưu tiên trải nghiệm thời gian thực)
- **Live-Preview (Xem trước trực tiếp):** Trình duyệt chịu trách nhiệm render nội dung soạn thảo ngay lập tức. Bắt buộc tận dụng Web Workers hoặc WASM cho các tác vụ tính toán nặng để không làm đơ (block) giao diện người dùng.
- **Local State & Caching:** Quản lý nội dung đang soạn thảo ở bộ nhớ cục bộ (RAM, IndexedDB, hoặc LocalStorage) để đảm bảo không bị mất dữ liệu khi mất mạng đột ngột.
- **UI/UX Độc Lập:** KHÔNG sao chép y nguyên giao diện (UI) của các repo tham khảo. Toàn bộ UI (thanh công cụ, menu, bảng điều khiển) phải được thiết kế và xây dựng lại bằng hệ thống component của dự án (`src/app/components/ui/`, Tailwind CSS) theo tiêu chuẩn tại `frontend-ui.md`.

### 2. Server-Side Ready (Sẵn sàng tích hợp Backend)
- **Trừu tượng hóa API (API Abstraction):** 
  - Tách biệt hoàn toàn logic lưu trữ (storage logic) ra khỏi UI. Xây dựng các Interface/Service (ví dụ: `EditorStorageService`). 
  - Ở giai đoạn hiện tại (chưa có backend), Service này có thể lưu file ở LocalStorage. Khi có backend, chỉ cần thay thế ruột của Service thành các lệnh gọi API (`fetch`/`axios`) mà không cần sửa code UI.
- **Debounce/Throttle:** Các thay đổi nội dung (keystrokes) phải được debounce (ví dụ: 1-2 giây sau khi ngừng gõ) trước khi gọi hàm lưu (save) để tránh spam request lên server sau này.
- **Cấu trúc Dữ liệu:** Thiết kế payload lưu trữ theo dạng JSON chuẩn hóa, có metadata (phiên bản, timestamp, ID người dùng) để dọn đường cho tính năng chỉnh sửa đồng thời (collaborative editing) ở backend.
- **Heavy Compilation (Biên dịch nặng):** Việc xuất file PDF độ phân giải cao hoặc xử lý tài liệu lớn nên được đẩy về Backend. Client chỉ đảm nhận việc gửi yêu cầu (trigger) và hiển thị thanh tiến trình (progress bar).

## Quy trình làm việc (Workflow) khi trích xuất code từ References
1. **Nghiên cứu trước (Research First):** Khi cần triển khai tính năng lõi (như render toán học, đồng bộ cuộn trang - scroll sync), hãy tìm kiếm và đọc cách làm trong `texlyre` hoặc `typst-online-editor`.
2. **Trích xuất Logic, Bỏ qua UI (Extract Logic, Ignore UI):** Lọc lấy các thuật toán xử lý dữ liệu, cách cấu hình core engine. Tuyệt đối không copy dán trực tiếp các component React, class CSS hay file styling của họ.
3. **Đóng gói (Encapsulation):** Đưa các logic phức tạp trích xuất được vào các Custom Hooks (ví dụ: `useTypstCompiler`, `useEditorSync`) hoặc thư mục `utils/`. Điều này giúp các component giao diện luôn sạch sẽ, dễ đọc và dễ bảo trì.
