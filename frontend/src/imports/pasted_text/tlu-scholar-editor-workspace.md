Design a **project editor workspace screen** for **TLU Scholar Editor**, shown immediately after a student opens a project from the dashboard.

This screen is part of an internal university academic document editing platform. Follow the TLU Scholar Editor system guideline strictly:
- professional
- academic
- trustworthy
- structured
- realistic
- implementation-friendly
- desktop-first web application
- not a marketing page
- not flashy
- not decorative

Use the TLU Scholar Editor design language:
- primary color: **#007bff**
- very light neutral background
- white surfaces
- subtle gray borders
- soft radius
- minimal shadow
- strong hierarchy
- practical information density

Important language rule:
- The prompt is in English for model understanding.
- But **all visible UI text must be in Vietnamese by default**.
- Only keep technical terms in English when natural, such as: Typst, PDF, Template, Preview.

## Main user flow
When the user clicks **Mở project** from the dashboard, navigate to a full **Typst editor workspace** screen.

This page must clearly communicate:
- the user is inside a specific project
- the project is being edited with a **Typst-based editor**
- the document can be previewed live
- the layout supports academic long-form writing
- the major areas can be resized horizontally
- the project sidebar can also be collapsed

## Core workspace layout
Create a desktop editor layout similar to a real online document editor, with these major regions:

1. **Top application bar**
2. **Slim left global navigation rail**
3. **Collapsible project/file sidebar**
4. **Main code editor pane**
5. **Live preview pane**
6. Optional contextual controls related to compile, zoom, export, file actions

The screen should feel close to a real Typst web editor workspace.

---

## 1. Top application bar
Create a horizontal top bar with:
- back navigation
- product name: **Typst**
- basic menu items similar to a desktop editor:
  - **Tệp**
  - **Chỉnh sửa**
  - **Xem**
  - **Trợ giúp**
- center breadcrumb/path showing current workspace and current file, for example:
  - **Hoàng Thân > aaaa > main.typ**
- right-side project actions such as:
  - **Chia sẻ**
  - **Tải xuống**
  - more menu button

Keep this bar compact, stable, and desktop-like.

---

## 2. Slim left global navigation rail
Keep a narrow vertical icon rail on the far left for app-level navigation.

Possible icons/sections:
- project
- tìm kiếm
- tài liệu
- chỉnh sửa / công cụ
- cài đặt
- trợ giúp

Keep it minimal, subtle, and consistent with the TLU Scholar Editor system.

---

## 3. Collapsible project/file sidebar
Add a **project sidebar** next to the global rail.

This sidebar must:
- show project files and structure
- be **collapsible**
- support **horizontal resizing**
- have a drag handle or clear divider
- collapse into a narrow state when needed
- expand back smoothly

The sidebar should include:
- top button: **Khám phá tệp**
- file action buttons:
  - tạo tệp mới
  - tạo thư mục
  - menu thêm
  - tải lên
- a simple file tree

Example file tree:
- **main.typ**
- **template.typ**

Show active file state clearly.
Allow row actions like visibility or expand/collapse where appropriate.

Important:
- the project sidebar must feel like a real file explorer
- width must be adjustable by dragging horizontally
- collapsed state should preserve the rest of the workspace layout

---

## 4. Main code editor pane
Create the central editing area for **Typst source code**.

This area must include:
- a formatting/action toolbar above the code area
- code editor with line numbers
- monospaced font
- syntax-highlighted Typst code
- scrollable content
- realistic editor surface

The editing toolbar can include:
- text formatting controls
- heading controls
- list controls
- formula / symbol insertion
- inline tools relevant to document editing
- comment / annotation shortcut if suitable

Important:
- this is a **Typst editor**
- the content should clearly look like Typst source code
- use a realistic code sample for an academic document
- keep the editor implementation-friendly, not overly decorative

Example visible code content can include:
- import template
- title
- authors
- headings
- paragraphs
- sections such as:
  - Giới thiệu
  - Nội dung chính
  - Đóng góp
  - Tài liệu liên quan

---

## 5. Live preview pane
Add a preview pane on the right showing the compiled document output.

This preview must:
- visually represent **Typst compile preview**
- show formatted academic document pages
- include zoom controls above the preview
- include current zoom level such as **100%**
- support page preview scrolling
- feel like the official rendered output of the Typst source

Important behavior:
- the preview pane width must be **horizontally resizable**
- it must share space with the code editor pane
- the divider between editor and preview should be draggable
- users should be able to make editor wider or preview wider

---

## 6. Resizable horizontal panels
This is a strict requirement.

The following regions must support horizontal resizing:
- **project/file sidebar**
- **main code editor pane**
- **preview pane**

Use draggable dividers between:
- project sidebar and editor
- editor and preview

Behavior expectations:
- users can drag left or right to resize widths
- widths update fluidly
- minimum width should be respected for usability
- each region can also collapse if appropriate
- collapsed sidebar should expand back without breaking layout

Make this behavior visually clear in the design using divider handles or resize affordances.

---

## 7. Editor workspace sections that must be visible
Show all corresponding core parts of the project editor page:

- top navigation bar
- project breadcrumb
- project/file sidebar
- file action controls
- Typst code editor
- editor toolbar
- live compiled preview
- zoom controls
- project actions such as share/download
- split-pane layout with resize affordances

Do not hide the essential structure.
The screen must clearly show that this is the main editing workspace after opening a project.

---

## 8. UX and visual behavior
The workspace should feel:
- focused
- productive
- suited for long writing sessions
- suitable for academic scientific documents
- clear and structured
- similar to a real collaborative web editor

Avoid:
- landing-page styling
- oversized decorative cards
- excessive shadows
- bright gradients
- playful visuals
- cluttered floating controls

Prefer:
- subtle separators
- realistic toolbars
- stable panel layout
- clean hierarchy
- practical spacing

---

## 9. Vietnamese UI text
Use Vietnamese for visible interface labels, such as:
- **Khám phá tệp**
- **Tìm kiếm**
- **Chia sẻ**
- **Tải xuống**
- **Giới thiệu**
- **Tài liệu liên quan**
- **Phóng to**
- **Thu nhỏ**
- **Tệp**
- **Chỉnh sửa**
- **Xem**
- **Trợ giúp**

If keeping “Typst” or “main.typ”, that is acceptable.

---

## 10. Final output expectation
Generate a polished **project editor screen** for TLU Scholar Editor that appears when a user opens a project.

It must:
- use a **Typst editing workspace**
- show code editor + compiled preview
- have a **collapsible project sidebar**
- support **horizontal resizing** of the main regions
- show realistic academic document editing sections
- use Vietnamese interface text
- follow the TLU Scholar Editor guideline closely
- look like a real internal university document editing application