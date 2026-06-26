Create polished, production-ready Admin modal forms for "TLU Scholar Editor" for these screens:
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
- Design clean, balanced, implementation-ready modal forms
- Improve layout, spacing, alignment, grouping, and section hierarchy
- Keep the forms realistic for a university internal management system
- Make the forms easy to scan and comfortable to use
- Keep all logic practical for React frontend implementation

Important constraints:
- Use modal forms, not full page forms
- Keep sticky footer with action buttons
- Use scrollable body
- Do not redesign the whole admin system
- Only refine and generate the form UIs
- Make both add and edit forms share the same structure, with the edit form showing prefilled data naturally

GLOBAL MODAL STRUCTURE

1. Modal header
- Large clear title:
  - "Thêm sinh viên" / "Chỉnh sửa sinh viên"
  - "Thêm giảng viên" / "Chỉnh sửa giảng viên"
- Close button on the top right
- Clean header with subtle divider below

2. Modal body
- Scrollable body
- Consistent horizontal padding
- Clear visual rhythm between rows and sections
- Avoid excessive vertical empty space
- Use structured sections with subtle divider lines

3. Modal footer
- Sticky footer with subtle top border
- Right aligned buttons:
  - secondary button: "Hủy"
  - primary button:
    - "Lưu" for add form
    - "Lưu thay đổi" for edit form
- Keep footer always visible when scrolling

SECTION STYLE
- Use clear section titles with numbering
- Keep titles visually strong but not heavy
- Example:
  - 1. THÔNG TIN SINH VIÊN
  - 2. LIÊN KẾT TÀI KHOẢN (không bắt buộc)
- Add a subtle divider under each section title
- Make section spacing compact and professional

========================================
FORM 1 + FORM 2: THÊM / CHỈNH SỬA SINH VIÊN
========================================

Use this exact layout for the student form.

Section 1 title:
- "1. THÔNG TIN SINH VIÊN"

Use a 2-column grid on desktop.
Keep both columns equal width.
Labels on top, inputs below.
Use full-width rows only when truly necessary.

Student form row layout:

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
- Right: Địa chỉ (tùy chọn)

Row 7:
- Full width: Ghi chú (tùy chọn)

Field type suggestions for student form:
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
- Địa chỉ: text input
- Ghi chú: textarea

Academic hierarchy behavior:
- Khoa, Ngành, Tên lớp must feel structurally related
- Visually imply dependency:
  - selecting Khoa affects Ngành
  - selecting Ngành affects Tên lớp
- Keep this relationship obvious in the UI even if it is only a prototype

Section 2 title:
- "2. LIÊN KẾT TÀI KHOẢN (không bắt buộc)"

Refine this section so it feels integrated and practical.

Use this exact structure:
- One soft bordered container/card inside the section

Inside the container:
1. Short helper text at the top:
   - "Có thể liên kết với tài khoản hệ thống để sinh viên đăng nhập và sử dụng nền tảng."
2. Main account field:
   - Label: "Tài khoản hệ thống"
   - Searchable select/dropdown
   - Default value: "-- Không liên kết --"
3. Secondary support row below:
   - small text: "Chưa có tài khoản?"
   - outline button: "Tạo tài khoản mới"

Rules for account linking section:
- The select field is the primary action
- "Tạo tài khoản mới" is secondary
- Do not place a large centered "HOẶC" between controls
- Keep the section compact, balanced, and aligned
- On desktop, the create-account action can sit below the select or as a secondary aligned row
- On smaller widths, stack naturally

========================================
FORM 3 + FORM 4: THÊM / CHỈNH SỬA GIẢNG VIÊN
========================================

Use this exact layout for the lecturer form.

Section 1 title:
- "1. THÔNG TIN GIẢNG VIÊN"

Use a 2-column grid on desktop.
Keep both columns equal width.
Labels on top, inputs below.
Keep the organization fields integrated naturally into the form.

Lecturer form row layout:

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
- Right: Địa chỉ (tùy chọn)

Row 7:
- Full width: Ghi chú (tùy chọn)

Field type suggestions for lecturer form:
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
- Địa chỉ: text input
- Ghi chú: textarea

Organizational hierarchy behavior:
- Khoa / Viện / Trung tâm and Bộ môn must feel structurally related
- Visually imply dependency:
  - selecting Khoa / Viện / Trung tâm affects Bộ môn options
- Make this relationship clear in the UI

Section 2 title:
- "2. LIÊN KẾT TÀI KHOẢN (không bắt buộc)"

Use the same improved account linking design as the student form.

Inside the container:
1. Short helper text at the top:
   - "Có thể liên kết với tài khoản hệ thống để giảng viên đăng nhập và sử dụng nền tảng."
2. Main account field:
   - Label: "Tài khoản hệ thống"
   - Searchable select/dropdown
   - Default value: "-- Không liên kết --"
3. Secondary support row below:
   - small text: "Chưa có tài khoản?"
   - outline button: "Tạo tài khoản mới"

Rules:
- Make the account select primary
- Make the create-account action secondary
- Remove awkward centered "HOẶC" layout
- Keep the section compact and integrated with the form

GLOBAL FORM DESIGN RULES
- Follow the row layout exactly as specified
- Do not rearrange fields arbitrarily
- Keep names, labels, and inputs aligned cleanly
- Use consistent field heights and widths
- Use full-width fields only where needed
- Reduce unnecessary vertical empty space
- Keep the form dense but breathable
- Mark required fields clearly with *
- Keep optional labels more subtle
- Use realistic placeholders and helper text
- Show normal, focus, error, and disabled states
- Keep everything polished, balanced, and ready for React frontend implementation

Edit form behavior:
- Same layout as add form
- Prefill existing data naturally
- Keep the same field order and structure
- If a linked account already exists, show it as selected in the account field