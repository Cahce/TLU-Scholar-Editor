Create a production-ready responsive UI for a university internal platform called "TLU Scholar Editor", a Typst-based scientific document editing and management system.

Use a modern academic SaaS style. Primary brand color is #007bff. Use white background, subtle gray borders, soft shadows, clean spacing, strong hierarchy, and accessible contrast. All content must be in Vietnamese. The UI must be realistic, clean, formal, and easy for frontend implementation.

Important architecture rules:
- Separate reusable layout parts for future reuse:
  - pages/header
  - pages/footer
  - pages/sidebar
- Separate role-based screens into:
  - pages/Admin
  - pages/Teacher
  - pages/Student
- Also include pages/Auth for login

Screens to design:
1. Login page
2. Admin dashboard
3. Teacher dashboard
4. Student dashboard
5. Reusable header
6. Reusable sidebar
7. Reusable footer

Login page requirements:
- Desktop: two-column layout
- Left side: branding and product introduction
- Right side: login form card
- Mobile: stacked single-column layout
- Fields:
  - Email
  - Mật khẩu
  - Ghi nhớ đăng nhập
  - Quên mật khẩu?
  - Đăng nhập button
- Remove the divider "hoặc"
- Remove the button "Đăng nhập bằng tài khoản trường"
- Include validation states:
  - empty email
  - empty password
  - invalid credentials
- After successful login, redirect users to the appropriate dashboard based on their system role
- Do not show sample accounts, demo emails, or explicit email-to-role mapping in the interface

Login page left panel content:
- Logo placeholder
- Product name: TLU Scholar Editor
- Description: "Hệ thống biên tập và quản lý tài liệu khoa học nội bộ"
- 3 feature highlights with icons:
  - Soạn thảo tài liệu bằng Typst
  - Quản lý tài liệu tập trung
  - Hỗ trợ cộng tác học thuật

Reusable header requirements:
- Logo
- System name
- Search
- Notifications
- User profile
- Role badge
- Consistent across all dashboards

Reusable sidebar requirements:
- Shared visual design, role-specific menu items
- Admin menu:
  - Tổng quan
  - Quản lý tài khoản
  - Sinh viên
  - Giảng viên
  - Phân quyền
  - Nhật ký hệ thống
  - Cài đặt
- Teacher menu:
  - Tổng quan
  - Project hướng dẫn
  - Danh sách sinh viên
  - Nhận xét & phản hồi
  - Tài liệu
  - Cài đặt
- Student menu:
  - Tổng quan
  - Project của tôi
  - Tạo project mới
  - Mẫu tài liệu
  - Lịch sử chỉnh sửa
  - Cài đặt

Reusable footer requirements:
- Minimal shared footer
- Copyright
- Support link
- Version info
- Content:
  - © 2026 Trường Đại học Thủy Lợi. All rights reserved.
  - Hỗ trợ
  - Phiên bản 1.0

Admin dashboard:
- Purpose: manage student and lecturer accounts
- Use reusable components from pages/header, pages/sidebar, and pages/footer
- Summary cards:
  - Tổng số sinh viên
  - Tổng số giảng viên
  - Tổng số project
  - Tài khoản đang hoạt động
- Main management table columns:
  - Họ tên
  - Email
  - Vai trò
  - Khoa/Bộ môn
  - Trạng thái
  - Ngày tạo
  - Thao tác
- Actions:
  - Xem chi tiết
  - Chỉnh sửa
  - Khóa / mở khóa
  - Đặt lại mật khẩu
  - Phân quyền
- Additional content:
  - Search and filter bar
  - Recent activity panel
  - New account overview
- Style should feel like a real account management admin panel

Teacher dashboard:
- Purpose: view, edit, and comment on projects of supervised students
- Use reusable components from pages/header, pages/sidebar, and pages/footer
- Summary cards:
  - Số sinh viên đang hướng dẫn
  - Số project đang theo dõi
  - Project cần phản hồi
  - Nhận xét mới nhất
- Main project table columns:
  - Tên project
  - Sinh viên
  - Loại tài liệu
  - Cập nhật gần nhất
  - Trạng thái
  - Nhận xét gần nhất
  - Thao tác
- Actions:
  - Xem project
  - Chỉnh sửa thông tin
  - Thêm nhận xét
  - Đánh dấu cần chỉnh sửa
  - Duyệt / chưa duyệt
- Additional content:
  - Danh sách sinh viên hướng dẫn
  - Lịch sử phản hồi gần đây
  - Project chờ xử lý
- The layout should clearly support supervision and review workflow

Student dashboard:
- Purpose: manage and access the student’s own projects
- Use reusable components from pages/header, pages/sidebar, and pages/footer
- Inspired by Overleaf and Typst dashboards in workflow and information structure, but use TLU Scholar Editor branding and the academic SaaS visual style
- Include:
  - Search bar
  - Tạo project mới
  - Tạo từ mẫu
  - Sort and filter controls
  - Project list
- Project list columns:
  - Tên project
  - Ngày tạo
  - Cập nhật gần nhất
  - Trạng thái
  - Giảng viên hướng dẫn
  - Thao tác
- Actions:
  - Mở project
  - Đổi tên
  - Nhân bản
  - Tải xuống
  - Xóa
- Extra side content or cards:
  - Mẫu tài liệu gần đây
  - Thông báo từ giảng viên
  - Hướng dẫn sử dụng Typst
  - Project gần đây
- The dashboard should feel like a practical document workspace, not a generic dashboard

Design quality rules:
- Keep all screens visually consistent
- Prioritize practical layout over decorative visuals
- Use cards, tables, search, filters, badges, and realistic action buttons
- Avoid conceptual-only design
- Make every screen feel ready for implementation in a real system
- Keep header, sidebar, and footer clearly reusable across pages