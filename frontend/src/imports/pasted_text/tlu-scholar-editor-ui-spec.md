Continue the existing UI for the "TLU Scholar Editor" platform and refine it into a production-ready academic SaaS interface.

Context:
- The foundational pages and routing already exist.
- The login page has already been simplified:
  - remove the "hoặc" divider
  - remove the "Đăng nhập bằng tài khoản trường" button
- The system already has role-based routing after login.
- Now focus on the UI structure and reusable layout, not backend integration.

Design goals:
- Modern academic SaaS style
- Clean, professional, trustworthy
- Primary brand color: #007bff
- White background
- Subtle gray borders
- Soft shadows
- Strong hierarchy
- Realistic and implementation-friendly
- All visible text in Vietnamese

Important priority:
1. Fully design the reusable app layout first
2. Then design the Student dashboard in detail
3. Keep the structure reusable for Teacher and Admin dashboards later

Architecture rules:
- Separate reusable layout parts clearly for future reuse:
  - pages/header
  - pages/sidebar
  - pages/footer
- Separate role-based pages:
  - pages/Student
  - pages/Teacher
  - pages/Admin
- Keep the visual system consistent across all pages

Step 1: Design the reusable app layout

Create a shared application layout that will be reused by all logged-in roles.

Reusable Header requirements:
- Clean top header
- Logo on the left
- System name: TLU Scholar Editor
- Search bar
- Notification icon
- User avatar
- User name
- Role badge
- Dropdown trigger for account actions
- Thin bottom border
- Height around 64px to 72px
- Consistent spacing and balanced alignment

Reusable Sidebar requirements:
- Vertical sidebar on the left
- Light background with thin right border
- Active item highlighted with #007bff
- Clear icons and Vietnamese labels
- Collapsible on desktop
- Drawer behavior on mobile
- Shared visual design, but menu items can change by role

Student sidebar menu:
- Tổng quan
- Project của tôi
- Tạo project mới
- Mẫu tài liệu
- Lịch sử chỉnh sửa
- Cài đặt

Teacher sidebar menu:
- Tổng quan
- Project hướng dẫn
- Danh sách sinh viên
- Nhận xét & phản hồi
- Tài liệu
- Cài đặt

Admin sidebar menu:
- Tổng quan
- Quản lý tài khoản
- Sinh viên
- Giảng viên
- Phân quyền
- Nhật ký hệ thống
- Cài đặt

Reusable Footer requirements:
- Minimal shared footer
- Thin top border
- Small neutral text
- Include:
  - © 2026 Trường Đại học Thủy Lợi. All rights reserved.
  - Hỗ trợ
  - Phiên bản 1.0

Main content layout requirements:
- Responsive content container
- Clear spacing between header, sidebar, content, and footer
- Content area should support dashboard cards, tables, filters, and list views
- Keep layout realistic and easy for React frontend implementation

Step 2: Design the Student Dashboard in detail

This should be the first fully developed dashboard.
The Student dashboard should be inspired by the workflow and information structure of Overleaf and Typst dashboards, but it must keep the visual branding of TLU Scholar Editor.

Student Dashboard purpose:
- Help students manage and access their own scientific document projects
- Focus on document workspace and project management
- Avoid generic admin-style dashboard design

Student Dashboard content:
- Page title: "Project của tôi"
- Search bar
- Primary button: "Tạo project mới"
- Secondary button: "Tạo từ mẫu"
- Sort and filter controls:
  - Sắp xếp theo cập nhật gần nhất
  - Loại tài liệu
  - Trạng thái

Project list/table requirements:
- Clean searchable document/project list
- Columns:
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

Additional side cards or supporting blocks:
- Mẫu tài liệu gần đây
- Thông báo từ giảng viên
- Hướng dẫn sử dụng Typst
- Project gần đây

Design direction for Student Dashboard:
- Feel like a practical document workspace
- Similar in spirit to Overleaf and Typst dashboards:
  - searchable project list
  - recent updates
  - quick actions
  - document-focused workflow
- But do not copy their visual style directly
- Keep everything aligned with the TLU Scholar Editor system and #007bff brand color

Important constraints:
- Do not redesign the login flow again
- Do not add sample email accounts or demo credentials to the UI
- Do not focus on backend or authentication screens
- Do not create conceptual-only visuals
- Prioritize clean reusable structure and implementation-ready layouts

Final output expectations:
- A polished reusable app layout
- A detailed Student Dashboard using that layout
- Strong consistency in spacing, typography, cards, table styling, button hierarchy, and navigation patterns