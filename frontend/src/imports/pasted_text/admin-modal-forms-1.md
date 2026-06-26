Refine the Admin modal forms of "TLU Scholar Editor" for:
- Thêm sinh viên
- Chỉnh sửa sinh viên
- Thêm giảng viên
- Chỉnh sửa giảng viên

Keep the current Admin visual system unchanged:
- modern academic SaaS
- primary color #007bff
- white modal background
- subtle gray borders
- soft shadows
- clean typography
- all visible text in Vietnamese
- same design language as the current Admin pages

Main goal:
- Simplify the forms
- Remove the separate "Liên kết tài khoản" section
- Remove the "Ghi chú" field from the add/edit forms
- Instead, include one optional "Tài khoản" field directly inside the main information form
- Keep the layout clean, balanced, and implementation-ready

Important constraints:
- Keep modal pattern
- Keep sticky footer
- Keep scrollable body
- Do not redesign the whole admin system
- Only refine these forms
- Keep add and edit forms sharing the same structure
- Edit forms should show prefilled values naturally

GLOBAL MODAL STRUCTURE

1. Modal header
- Large clear title:
  - "Thêm sinh viên" / "Chỉnh sửa sinh viên"
  - "Thêm giảng viên" / "Chỉnh sửa giảng viên"
- Close button on the top right
- Thin divider below the header

2. Modal body
- Scrollable body
- Consistent horizontal padding
- Clear row spacing
- Use a 2-column grid on desktop
- Keep both columns equal width
- Avoid excessive vertical empty space

3. Modal footer
- Sticky footer with subtle top border
- Right aligned buttons:
  - secondary button: "Hủy"
  - primary button:
    - "Lưu" for add form
    - "Lưu thay đổi" for edit form

SECTION STYLE
- Use only one main section for each form:
  - "1. THÔNG TIN SINH VIÊN"
  - "1. THÔNG TIN GIẢNG VIÊN"
- Add a subtle divider below the section title
- Keep hierarchy clean and professional

========================================
THÊM / CHỈNH SỬA SINH VIÊN
========================================

Use this exact layout for the student form:

Row 1:
- Left: Mã sinh viên *
- Right: Họ và tên *

Row 2:
- Left: Giới tính
- Right: Ngày sinh

Row 3:
- Left: Số điện thoại *
- Right: Email liên hệ *

Row 4:
- Left: Khoa *
- Right: Ngành *

Row 5:
- Left: Tên lớp *
- Right: Trạng thái

Row 6:
- Left: Niên khóa
- Right: Tài khoản

Row 7:
- Full width: Địa chỉ (tùy chọn)

Field type suggestions:
- Mã sinh viên: text input
- Họ và tên: text input
- Giới tính: select
- Ngày sinh: date picker
- Số điện thoại: phone input
- Email liên hệ: email input
- Khoa: searchable select
- Ngành: searchable select
- Tên lớp: searchable select
- Trạng thái: select
- Niên khóa: select or text input
- Tài khoản: searchable select, optional
- Địa chỉ: text input

Rules for "Tài khoản" field in student form:
- This field is optional
- Label: "Tài khoản"
- The field should allow:
  - selecting an existing account
  - leaving it empty
- Use a searchable select/dropdown
- Default option should clearly indicate:
  - "-- Không liên kết --"
- Keep this field visually integrated with the rest of the form
- Do not create a separate account-linking section
- Do not add a separate "Tạo tài khoản mới" block inside this form

Academic hierarchy behavior:
- Khoa, Ngành, Tên lớp must feel structurally related
- Visually imply dependency:
  - selecting Khoa affects Ngành
  - selecting Ngành affects Tên lớp

========================================
THÊM / CHỈNH SỬA GIẢNG VIÊN
========================================

Use this exact layout for the lecturer form:

Row 1:
- Left: Mã giảng viên *
- Right: Họ và tên *

Row 2:
- Left: Giới tính
- Right: Ngày sinh (tùy chọn)

Row 3:
- Left: Số điện thoại *
- Right: Email liên hệ *

Row 4:
- Left: Học hàm
- Right: Học vị

Row 5:
- Left: Khoa / Viện / Trung tâm *
- Right: Bộ môn

Row 6:
- Left: Trạng thái
- Right: Tài khoản

Row 7:
- Full width: Địa chỉ (tùy chọn)

Field type suggestions:
- Mã giảng viên: text input
- Họ và tên: text input
- Giới tính: select
- Ngày sinh: date picker
- Số điện thoại: phone input
- Email liên hệ: email input
- Học hàm: select
- Học vị: select
- Khoa / Viện / Trung tâm: searchable select
- Bộ môn: searchable select
- Trạng thái: select
- Tài khoản: searchable select, optional
- Địa chỉ: text input

Rules for "Tài khoản" field in lecturer form:
- This field is optional
- Label: "Tài khoản"
- The field should allow:
  - selecting an existing account
  - leaving it empty
- Use a searchable select/dropdown
- Default option:
  - "-- Không liên kết --"
- Keep the field integrated into the main information form
- Do not create a separate account-linking section
- Do not add a separate "Tạo tài khoản mới" block inside this form

Organizational hierarchy behavior:
- Khoa / Viện / Trung tâm and Bộ môn must feel structurally related
- Visually imply dependency:
  - selecting Khoa / Viện / Trung tâm affects Bộ môn options

GLOBAL FORM DESIGN RULES
- Remove all "Ghi chú" fields
- Remove the separate "Liên kết tài khoản" section entirely
- Keep "Tài khoản" as one optional field inside the main form
- Follow the row layout exactly
- Do not rearrange fields arbitrarily
- Keep the form clean, balanced, and easy to scan
- Use realistic placeholders and labels
- Show normal, focus, error, and disabled states
- Keep the result polished and ready for React frontend implementation