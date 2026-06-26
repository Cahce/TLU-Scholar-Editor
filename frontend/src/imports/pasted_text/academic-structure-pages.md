Continue the current Admin UI of "TLU Scholar Editor" and create new management pages for academic structure administration.

Pages to create:
- Quản lý khoa
- Quản lý bộ môn
- Quản lý ngành
- Quản lý lớp

Also update the Admin sidebar:
- Do not use a grouped wrapper menu such as "Danh mục học thuật"
- Show these items directly in the sidebar as separate top-level items:
  - Khoa
  - Bộ môn
  - Ngành
  - Lớp

Keep the current Admin shell unchanged:
- same header
- same footer
- same academic SaaS visual style
- same design system / guideline.md
- primary color according to the current system
- white background
- subtle gray borders
- soft shadows
- all visible text in Vietnamese

Main goal:
- Create realistic, implementation-ready admin pages for academic structure management
- Keep the UI clean, compact, and consistent with the existing admin pages
- Support search, filters, add, and edit workflows for all 4 pages

========================================
1. SIDEBAR UPDATE
========================================

Update the Admin sidebar structure so the academic structure items appear directly, without being wrapped inside a grouped parent item.

Required sidebar structure:
- Tổng quan
- Quản lý tài khoản
- Sinh viên
- Giảng viên
- Khoa
- Bộ môn
- Ngành
- Lớp
- Mẫu tài liệu

Requirements:
- keep the current sidebar style
- keep icons consistent with the current icon system
- maintain active states and collapsible behavior
- keep the sidebar visually balanced after adding the new items
- do not use nested submenu or expandable wrapper for these items

========================================
2. PAGE DESIGN DIRECTION
========================================

For all 4 new pages:
- use the same Admin page structure as the existing management pages
- page title + subtitle
- summary cards if appropriate
- search and filter toolbar
- main management table
- add button
- edit action
- pagination
- clean action column
- realistic admin workflow
- implementation-friendly layout

Each page should support:
- tìm kiếm
- lọc
- thêm mới
- chỉnh sửa

Do not redesign the whole admin system.
Only create these new content pages inside the current Admin shell.

========================================
3. QUẢN LÝ KHOA
========================================

Create the page:
- "Quản lý khoa"

Subtitle:
- "Quản lý danh sách khoa trong hệ thống"

Toolbar:
- Search input:
  - "Tìm kiếm khoa..."
- Status filter:
  - Tất cả
  - Hoạt động
  - Tạm khóa
- Add action buttons:
  - "Thêm mới"
  - "Thêm theo file" (optional if you want consistency with other pages)

Suggested table columns:
- Mã khoa
- Tên khoa
- Trạng thái
- Cập nhật lần cuối
- Thao tác

Actions:
- Chỉnh sửa
- Khóa / Mở khóa

Suggested add/edit form fields:
- Mã khoa
- Tên khoa
- Trạng thái
- Mô tả ngắn (optional)

========================================
4. QUẢN LÝ BỘ MÔN
========================================

Create the page:
- "Quản lý bộ môn"

Subtitle:
- "Quản lý danh sách bộ môn trong hệ thống"

Toolbar:
- Search input:
  - "Tìm kiếm bộ môn..."
- Filter by Khoa
- Status filter:
  - Tất cả
  - Hoạt động
  - Tạm khóa
- Add action buttons:
  - "Thêm mới"
  - "Thêm theo file" (optional)

Suggested table columns:
- Mã bộ môn
- Tên bộ môn
- Khoa
- Trạng thái
- Cập nhật lần cuối
- Thao tác

Actions:
- Chỉnh sửa
- Khóa / Mở khóa

Suggested add/edit form fields:
- Mã bộ môn
- Tên bộ môn
- Khoa
- Trạng thái
- Mô tả ngắn (optional)

========================================
5. QUẢN LÝ NGÀNH
========================================

Create the page:
- "Quản lý ngành"

Subtitle:
- "Quản lý danh sách ngành đào tạo"

Toolbar:
- Search input:
  - "Tìm kiếm ngành..."
- Filter by Khoa
- Status filter:
  - Tất cả
  - Hoạt động
  - Tạm khóa
- Add action buttons:
  - "Thêm mới"
  - "Thêm theo file" (optional)

Suggested table columns:
- Mã ngành
- Tên ngành
- Khoa
- Trạng thái
- Cập nhật lần cuối
- Thao tác

Actions:
- Chỉnh sửa
- Khóa / Mở khóa

Suggested add/edit form fields:
- Mã ngành
- Tên ngành
- Khoa
- Trạng thái
- Mô tả ngắn (optional)

========================================
6. QUẢN LÝ LỚP
========================================

Create the page:
- "Quản lý lớp"

Subtitle:
- "Quản lý danh sách lớp trong hệ thống"

Toolbar:
- Search input:
  - "Tìm kiếm lớp..."
- Filter by Khoa
- Filter by Ngành
- Status filter:
  - Tất cả
  - Hoạt động
  - Tạm khóa
- Add action buttons:
  - "Thêm mới"
  - "Thêm theo file" (optional)

Suggested table columns:
- Mã lớp
- Tên lớp
- Khoa
- Ngành
- Trạng thái
- Cập nhật lần cuối
- Thao tác

Actions:
- Chỉnh sửa
- Khóa / Mở khóa

Suggested add/edit form fields:
- Mã lớp
- Tên lớp
- Khoa
- Ngành
- Trạng thái
- Niên khóa (optional)
- Mô tả ngắn (optional)

========================================
7. FILTER AND SEARCH BEHAVIOR
========================================

Make search and filter toolbars look realistic and structured.

Rules:
- search input should be the first and most prominent control
- related filters should appear next
- action buttons should be grouped on the right
- layouts should be balanced and consistent across all 4 pages

Dependent filter behavior:
- On "Quản lý lớp":
  - selecting Khoa should affect available Ngành options
- On other pages, keep filters simple and clean

The design should visually imply realistic filtering behavior, even if it is only a prototype.

========================================
8. ADD / EDIT FORMS
========================================

Create add and edit forms for all 4 entities using the same modal or drawer pattern as the existing admin forms.

Form titles:
- "Thêm khoa" / "Chỉnh sửa khoa"
- "Thêm bộ môn" / "Chỉnh sửa bộ môn"
- "Thêm ngành" / "Chỉnh sửa ngành"
- "Thêm lớp" / "Chỉnh sửa lớp"

Form design:
- clean admin modal or drawer
- consistent spacing and field grouping
- sticky footer
- buttons:
  - Hủy
  - Lưu / Lưu thay đổi

Keep the form layouts simple, compact, and realistic.

========================================
9. GENERAL DESIGN RULES
========================================

- Keep the current admin shell unchanged
- Keep the current branding and visual style
- Use the same table, badge, filter, button, and modal patterns as the existing admin pages
- Make all pages consistent with Quản lý tài khoản / Sinh viên / Giảng viên
- Keep the UI clean, practical, and ready for frontend implementation
- All visible text must remain in Vietnamese