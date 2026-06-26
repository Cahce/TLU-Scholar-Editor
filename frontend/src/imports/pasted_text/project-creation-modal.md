Design the **project creation flow** for **TLU Scholar Editor** based strictly on the actual database structure and the system design guideline.

## Product context
TLU Scholar Editor is an internal university academic writing and document management platform.

This screen is used when a student creates a new project, either:
- **Tạo project trống**
- **Tạo từ mẫu**

The result must feel:
- professional
- academic
- trustworthy
- realistic
- structured
- implementation-friendly
- desktop-first

Do not design this like a startup landing page or concept shot.

---

## Language rule
The prompt is in English for model understanding, but **all visible UI text must be in Vietnamese** by default.

Use Vietnamese for:
- modal titles
- labels
- placeholders
- helper text
- validation text
- buttons
- notifications
- filter labels
- empty states

Allowed technical terms only when natural:
- Typst
- PDF
- Template
- Preview

---

## Design system
Follow the TLU Scholar Editor guideline:
- primary brand color: **#007bff**
- light neutral background
- white surfaces
- subtle borders
- soft radius
- minimal shadow
- clean hierarchy
- realistic internal academic application styling

Avoid:
- flashy visuals
- glassmorphism
- strong gradients
- decorative marketing layouts

---

# Main goal
Create a realistic **project creation modal / flow** that matches the actual backend schema.

The UI must only expose fields and behaviors that make sense with the database.

---

# Database-aligned project creation model
The project creation UI must align with this structure:

## Project core fields
- **Tên project** → maps to project title
- **Loại project** → maps to project category
- Optional template selection → maps to:
  - selected template
  - selected template version

## Notes for the design
- Do **not** treat “discipline” as a saved project field.
- Do **not** add arbitrary metadata as core persisted project fields if they are not part of Project.
- If discipline/category browsing is shown in template search, make it clear that it is only for filtering templates, not a saved project property.

---

# Create project modal
Create a centered modal with two supported entry modes:

1. **Tạo project trống**
2. **Tạo từ mẫu**

The modal should feel like a real product form, not a wizard unless necessary.

---

## Modal header
- Title: **Tạo project mới**
- Subtitle: **Khởi tạo không gian làm việc cho tài liệu học thuật**
- Close button on top-right

---

## Required form fields
Use these fields in the form:

### 1. Tên project
- label: **Tên project**
- input placeholder: **Nhập tên project**
- required

### 2. Loại project
This field must map to the real enum-backed project category.

- label: **Loại project**
- select placeholder: **Chọn loại project**
- options in Vietnamese mapped from enum:
  - **Luận văn / Khóa luận** → thesis
  - **Báo cáo** → report
  - **Đề xuất** → proposal
  - **Bài báo** → paper
  - **Trình chiếu** → presentation
  - **Khác** → other

This is a required field unless you intentionally infer it from template selection.

---

## Optional mode selector
At the top of the modal, allow users to choose one of two tabs or segmented options:

- **Tạo trống**
- **Tạo từ mẫu**

Keep the switch simple and visible.

---

# Mode A — Tạo project trống
If the user chooses **Tạo trống**:

Show a short explanation:
- **Project sẽ được khởi tạo với tệp mặc định `main.typ`.**

Optional helper block:
- **Bạn có thể thêm tệp `.bib`, hình ảnh, dữ liệu và các tệp Typst khác sau khi tạo project.**

Do not overload this mode with template browsing.

### Resulting default structure after create
The design should communicate that a newly created blank project will automatically contain:
- **main.typ**

Optional future file placeholders can be shown subtly as possible additions:
- `references.bib`
- `images/`
- `data/`

But the only guaranteed default file should be:
- **main.typ**

---

# Mode B — Tạo từ mẫu
If the user chooses **Tạo từ mẫu**:

Open a larger modal state or split layout with:
- left side: template browsing
- right side: selected template details + project form

This mode must align with actual template data.

---

## Template browser
Show:
- search input: **Tìm kiếm mẫu**
- category filter: **Tất cả loại mẫu**
- optional official filter:
  - **Tất cả mẫu**
  - **Mẫu chính thức**
  - **Mẫu đang hoạt động**

Important:
- category filter must align with the template category enum:
  - thesis
  - report
  - proposal
  - paper
  - presentation
  - other

In Vietnamese, display them as:
- **Luận văn / Khóa luận**
- **Báo cáo**
- **Đề xuất**
- **Bài báo**
- **Trình chiếu**
- **Khác**

If you show “discipline” or “lĩnh vực”, present it only as an external browsing/filter concept, not as a persisted project field.

---

## Template card content
Each template card should show:
- thumbnail preview
- template name
- short description
- category badge
- badge if official:
  - **Chính thức**
- state if inactive should not be selectable

The template grid should only highlight templates that are active and selectable.

---

## Selected template detail panel
When a template is selected, show a detail panel on the right with:

### Template information
- **Tên mẫu**
- **Mô tả**
- **Loại mẫu**
- **Phiên bản**
- **Ghi chú cập nhật** (if available from changelog)
- badge if official:
  - **Mẫu chính thức**

Important:
- Do **not** show repository or GitHub information.
- Do **not** invent metadata not present in the template structure.

### Project configuration section
Below template details, show:

- **Tên project**
- **Loại project**
  - prefilled from selected template category
  - still editable if needed
- **Phiên bản mẫu**
  - read-only or selectable if multiple template versions are available

Optional helper text:
- **Project sẽ lưu liên kết tới mẫu và phiên bản mẫu đã chọn.**

---

# Action buttons
At the bottom-right of the modal:

- secondary: **Hủy**
- primary: **Tạo project**

Primary button state:
- disabled if project name is empty
- disabled if category is missing
- disabled in template mode if no template is selected

---

# Success behavior
When project creation succeeds:

1. Close the modal
2. Navigate to the editor workspace
3. Show success toast notification

Toast:
- icon: success
- title: **Tạo project thành công**
- message for blank project:
  - **Project đã được khởi tạo với tệp `main.typ`.**
- message for template project:
  - **Project đã được khởi tạo từ mẫu đã chọn.**

---

# Failure behavior
If project creation fails:
- keep modal open
- show error toast

Error examples:
- **Tạo project thất bại**
- **Tên project đã tồn tại**
- **Không thể khởi tạo project từ mẫu**
- **Dữ liệu mẫu không hợp lệ**
- **Vui lòng thử lại**

The error state should feel realistic and system-like.

---

# Post-create editor state
After successful creation, navigate into the Typst editor workspace.

## Blank project
Show initial file tree:
- **main.typ**

## Project created from template
Show file tree initialized from the selected template version.

Possible files:
- `main.typ`
- `meta.typ`
- `references.bib`
- `images/`
- `chapters/`

Use realistic file types based on the system:
- Typst files
- Bib files
- image files
- data files
- other files

The UI should visually communicate that these files belong to a structured academic project.

---

# UX constraints
The screen must communicate the real system behavior:

- project title is the main required identity field
- project category is enum-based and constrained
- template selection is optional unless user chooses “Tạo từ mẫu”
- template version matters
- a blank project always starts with **main.typ**
- template projects start from template content
- success and failure notifications are explicit and visible

Do not add fake fields such as:
- repository URL
- GitHub source
- public template repo metadata
- permanent discipline field on Project
- non-existing project status in the creation form

---

# Final output expectation
Generate a realistic project creation flow for TLU Scholar Editor that includes:

1. **Blank project creation state**
2. **Template-based project creation state**
3. **Template selection and version-aware configuration**
4. **Database-aligned project fields**
5. **Automatic default file behavior with `main.typ`**
6. **Success and failure feedback**
7. **Transition into the Typst editor workspace**

The final result must follow the TLU Scholar Editor guideline closely and use Vietnamese UI content.