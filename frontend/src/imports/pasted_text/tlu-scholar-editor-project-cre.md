Design a **new project creation flow + editor workspace** for **TLU Scholar Editor**, following the project guideline closely.

## Product context
TLU Scholar Editor is an internal university web application for academic document editing and project management.

This flow is for **students creating a new project** and then entering the **Typst editor workspace**.

The final UI must feel:
- professional
- academic
- trustworthy
- realistic
- implementation-friendly
- desktop-first
- suitable for long-form academic writing

Do not design this like a marketing page or concept shot.

---

## Language rules
Use English for prompt understanding, but generate **all visible UI text in Vietnamese** by default.

Allowed technical terms that may stay in English if needed:
- Typst
- PDF
- Template
- Preview

Everything else should be in Vietnamese:
- modal titles
- labels
- buttons
- table headers
- placeholders
- file actions
- empty states
- tooltips

---

## Design system rules
Follow the TLU Scholar Editor design system:
- primary brand color: **#007bff**
- light neutral app background
- white surfaces
- subtle gray borders
- soft radius
- minimal shadow
- strong hierarchy
- structured layout
- realistic desktop application UI

Avoid:
- flashy visuals
- heavy gradients
- glassmorphism
- startup-style landing page aesthetics
- decorative concept styling

---

# Part 1 — Create new project modal

Create a dashboard state where the user clicks **Tạo project trống**, and a modal opens in the center of the screen.

The modal should feel close to the first reference image, but adapted to TLU Scholar Editor and written in Vietnamese.

## Modal title
- **Tạo project mới**

## Modal description (optional, concise)
- **Khởi tạo không gian làm việc mới cho tài liệu học thuật**

## Form fields
Add a realistic form with these fields:

1. **Tên project**
   - input
   - placeholder: **Nhập tên project**

2. **Thể loại**
   - select / dropdown
   - placeholder: **Chọn thể loại**
   - example options:
     - **Khóa luận tốt nghiệp**
     - **Đồ án môn học**
     - **Tiểu luận**
     - **Nghiên cứu khoa học**
     - **Báo cáo thực tập**
     - **Khác**

3. **Mẫu tài liệu**
   - select / dropdown
   - placeholder: **Chọn mẫu tài liệu**
   - example values:
     - **Tài liệu trống**
     - **Mẫu chuẩn của trường**

4. **Mô tả** (optional)
   - textarea
   - placeholder: **Nhập mô tả ngắn**

5. Optional additional metadata section if useful:
   - **Bộ môn**
   - **Giảng viên hướng dẫn**
   - **Năm học**

Keep the modal clean, compact, and realistic.
Use proper form spacing and label hierarchy.

## Modal actions
Footer buttons:
- secondary button: **Hủy**
- primary button: **Tạo project**

Important behavior to communicate in the design:
- when the user submits successfully, the system automatically creates a new project
- the project is initialized with a default file:
  - **main.typ**

---

# Part 2 — After creating a project, navigate to the editor workspace

After clicking **Tạo project**, navigate directly to the **Typst editor workspace**.

This workspace should look similar in structure to the second and third reference images:
- left global icon rail
- project file sidebar
- center Typst source editor
- right preview pane

Keep the layout realistic and implementation-friendly.

---

## Workspace structure

### 1. Left global icon rail
Use a slim vertical icon rail with icons such as:
- file/project
- search
- outline
- errors/warnings
- settings
- help

Use selected state with light blue background and blue icon.

### 2. File sidebar
Next to the icon rail, create a project file sidebar.

Header title:
- **Tệp**

Header actions:
- tạo tệp
- tạo thư mục
- menu thêm
- tải lên

The file sidebar should support a realistic file tree.

### Important initial behavior
For a newly created project, the file tree must automatically contain:
- **main.typ**

If the selected project uses a larger structure, it may also contain files such as:
- **meta.typ**
- **bibliography.bib**
- folder **chapters**
- folder **images**

But the minimum required default file after creation is:
- **main.typ**

Show **main.typ** as the active file immediately after project creation.

---

## 3. Typst editor pane
The center pane is the Typst code editor.

Requirements:
- line numbers
- monospaced font
- syntax-highlighted Typst code
- scrollable editor
- top toolbar with realistic formatting / editing controls
- clean editor surface

For a newly created project, the editor should open **main.typ** by default.

The default content may be a minimal starter Typst file, such as:
- import template if relevant
- title
- author
- basic section structure

This should feel like a realistic initial academic template.

---

## 4. Preview pane
The right pane is the live compiled preview.

Requirements:
- clean page preview surface
- zoom controls above
- scrollable preview
- realistic rendered document page
- Typst-style preview behavior

---

# Part 3 — Preview switching behavior by file eye icon

This is a strict requirement.

In the file sidebar, if the project has multiple files, each relevant file row may show an **eye icon**.

Behavior:
- when the user clicks the **eye icon** of a file, the **preview pane on the right must show the preview of that specific file**
- this is different from only selecting the file for editing
- the eye icon explicitly controls which file is being previewed

Examples:
- clicking the eye icon on **main.typ** shows preview of **main.typ**
- clicking the eye icon on **meta.typ** shows preview of **meta.typ**
- clicking the eye icon on **bibliography.bib** may show a suitable non-page preview or file content preview if previewable
- clicking the eye icon on chapter files inside **chapters/** shows preview of that chapter file

Visual behavior:
- the file currently used for preview should have a clear preview state
- for example:
  - highlighted eye icon
  - subtle active row state
  - small “Đang preview” indicator if useful

Important:
- if there are multiple files, the preview pane must update based on the file whose eye icon is clicked
- the interaction should be visually obvious and implementation-friendly

---

## Suggested example file tree
Use a realistic academic project structure like:

- **chapters/**
- **images/**
- **acronyms.typ**
- **bibliography.bib**
- **main.typ**
- **meta.typ**

Show one active file in the editor and one preview-target file in the preview pane.
These can be the same file or different files.

---

## UX requirements
The page should clearly communicate:
- a new project has been created
- the project already contains a default **main.typ**
- the editor is ready for writing
- the preview panel is live
- the eye icon controls preview target when multiple files exist

Do not overcomplicate the experience.
Keep it clean, academic, stable, and practical.

---

## Final output expectation
Generate a realistic multi-state UI or flow covering:

1. **Create project modal**
   - includes additional attributes such as **Thể loại**
   - clear form structure
   - Vietnamese UI

2. **Editor workspace after project creation**
   - automatically includes **main.typ**
   - opens the project in a Typst editor layout
   - shows file sidebar, editor, and preview pane

3. **Multi-file preview behavior**
   - clicking the **eye icon** on a file changes the preview pane to that file
   - preview state is clearly shown in the UI

The final design must follow the TLU Scholar Editor guideline closely and look like a real internal academic editing system.