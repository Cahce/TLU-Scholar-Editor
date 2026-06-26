Refine the existing **student dashboard + sidebar** in Figma for **TLU Scholar Editor**.

Important:
- This is an **edit/refinement task**, not a full redesign from scratch.
- Keep the current TLU Scholar Editor design language and sidebar structure.
- Do not redesign the whole application.
- Focus on improving the **student sidebar navigation behavior and the main project listing area**.

## Main goal
The student sidebar already contains:
- **Tất cả project**
- **Project của tôi**
- **Project được chia sẻ**

I want these items to behave like **content-switching navigation inside the current page**, not like completely separate pages.

That means:
- keep the sidebar on the left
- keep the student dashboard layout
- when the user clicks one of these sidebar items, the **main content area on the right updates immediately**
- the list/table content changes based on the selected section
- the page should feel like one project management workspace with section-based content switching

---

## Product direction
TLU Scholar Editor is an internal university academic writing and project management platform.

The interface must feel:
- professional
- academic
- clean
- realistic
- structured
- implementation-friendly
- desktop-first

Use the existing design system:
- primary color: **#007bff**
- light neutral background
- white surfaces
- subtle borders
- soft radius
- minimal shadow
- Vietnamese visible UI text

Do not copy Overleaf visually.
Only use Overleaf-style information architecture ideas where helpful.

---

# Sidebar behavior for student
Keep the student sidebar, but refine the main navigation group to clearly control the project list on the current page.

## Main navigation group
Use these items:
- **Tất cả project**
- **Project của tôi**
- **Project được chia sẻ**

These three items should be visually grouped as the core project navigation.

### Interaction rule
When the user selects one of these items:
- that item becomes active
- the main content area on the right updates
- the header/title and project list/table change accordingly
- do not make it look like a route to a totally different screen
- it should feel like switching between content sections within the same workspace

### Active state
The selected sidebar item should have:
- light blue background
- blue icon/text
- subtle rounded rectangle
- stronger emphasis than inactive items

---

# Main content area behavior
Keep the project management page on the right, but make it dynamic depending on the selected sidebar section.

The content area should include:
1. page title
2. short description/subtitle
3. optional action buttons
4. project list/table
5. empty state if no data exists

---

# Section 1 — Tất cả project
When **Tất cả project** is selected:

## Title
- **Tất cả project**

## Subtitle
- **Danh sách toàn bộ project bạn có quyền truy cập**

## Content
Show a project table or project list containing:
- projects created by the student
- projects shared with the student

Use realistic columns such as:
- **Tên project**
- **Loại project**
- **Ngày tạo**
- **Cập nhật gần nhất**
- **Thao tác**

Use mixed example data to show both owned and shared projects.

Optional small metadata badge:
- **Của tôi**
- **Được chia sẻ**

This helps users visually understand why a project appears in the full list.

---

# Section 2 — Project của tôi
When **Project của tôi** is selected:

## Title
- **Project của tôi**

## Subtitle
- **Danh sách project do bạn tạo và quản lý**

## Content
Show only projects owned by the current student.

Example data should be clearly student-owned projects, such as:
- **Báo cáo Khóa luận Tốt nghiệp 2026**
- **Bài tập lớn môn Trí tuệ Nhân tạo**
- **Tiểu luận Quản trị Dự án phần mềm**

Optional empty state if needed:
- **Bạn chưa có project nào**
- **Hãy tạo project mới để bắt đầu soạn thảo**

Show a visible CTA if empty:
- **Tạo project mới**

---

# Section 3 — Project được chia sẻ
When **Project được chia sẻ** is selected:

## Title
- **Project được chia sẻ**

## Subtitle
- **Danh sách project được người khác chia sẻ cho bạn**

## Content
Show only shared-access projects.

Use realistic shared examples such as:
- **Nghiên cứu khoa học cấp trường**
- **Đề cương seminar nhóm**
- **Báo cáo đề tài chung**

Optional metadata:
- **Người chia sẻ**
- **Quyền truy cập** such as:
  - **Chỉnh sửa**
  - **Chỉ xem**

Recommended columns:
- **Tên project**
- **Người chia sẻ**
- **Quyền**
- **Cập nhật gần nhất**
- **Thao tác**

Empty state text:
- **Chưa có project nào được chia sẻ với bạn**
- **Khi có người chia sẻ project, danh sách sẽ hiển thị tại đây**

---

# Shared layout requirements
All three sections must use the **same page shell/layout**:
- same sidebar
- same content container
- same table/list style
- same action button style
- only the title, description, filters, and list data change

This is very important:
- do not create three unrelated pages
- do not create three different design structures
- create one reusable page layout with three content states

---

# Suggested top content controls
At the top-right of the main content area, allow lightweight controls that remain consistent across all three sections:

- search input: **Tìm kiếm project**
- sort dropdown: **Sắp xếp theo**
- optional view switch: grid/list

These controls should stay in the same position regardless of selected section.

---

# Project list behavior
Keep the project list implementation-friendly and realistic.

Each row/card can include actions such as:
- **Mở**
- **Tải xuống**
- **Nhân bản**
- **Cài đặt**

The action buttons may remain visible if the current design already uses always-visible actions.

Keep the UI clean and stable.

---

# Visual and UX requirements
The result should clearly communicate:
- sidebar item selection controls the current content section
- users stay in the same project management page
- only the dataset changes
- this behaves like internal section navigation, not full page switching

Use smooth hierarchy:
- prominent section title
- muted subtitle
- clear active sidebar state
- consistent project table

---

# Final expectation
Update the existing student sidebar/dashboard so that:

- **Tất cả project** shows all accessible projects
- **Project của tôi** shows only owned projects
- **Project được chia sẻ** shows only shared projects

All of these must appear **inside the same page layout**, with the sidebar preserved and the main content area dynamically switching to the related dataset.

All visible UI text must be in **Vietnamese**.