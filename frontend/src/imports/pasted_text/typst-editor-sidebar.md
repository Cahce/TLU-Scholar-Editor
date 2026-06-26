Refine the current Typst editor workspace for **TLU Scholar Editor** and extend the left workspace sidebar with additional functional modes.

Keep the overall editor layout, visual system, and split-pane structure unchanged:
- left global icon rail
- collapsible/resizable workspace sidebar
- Typst code editor in the center
- live preview pane on the right
- academic, professional, implementation-friendly UI
- Vietnamese visible UI text by default
- primary accent color: #007bff
- subtle borders, soft radius, minimal shadow, realistic desktop application style

## Main goal
Expand the workspace sidebar so it supports multiple functional views selected from the left icon rail.

The sidebar must support these modes:

1. **Tệp dự án**
2. **Tìm kiếm**
3. **Outline**
4. **Lỗi và cảnh báo**

The sidebar content should switch depending on the selected icon.

---

## Left icon rail behavior
Keep a slim vertical icon rail on the far left.

Add or refine these icons in order:
- file/project icon
- search icon
- outline/document structure icon
- diagnostics/issues icon at the bottom of the workspace tools area

Important:
- the last icon is **only for error and warning list**
- do not label it as “Improve”
- do not show writing suggestions, AI suggestions, or generic improvement tips
- it must clearly represent **compiler diagnostics / document issues only**

Selected icon state:
- light blue background
- blue icon
- subtle rounded rectangle
- consistent with the design system

---

## Sidebar mode 1: Tệp dự án
When the file/project icon is selected, show the project file explorer panel.

Panel title:
- **Khám phá tệp**

Content:
- file tree for the current project
- example files such as:
  - main.typ
  - template.typ
- file actions in the header:
  - tạo tệp
  - tạo thư mục
  - menu thêm
  - tải lên

This is the normal project file explorer state.

---

## Sidebar mode 2: Tìm kiếm
When the search icon is selected, show a dedicated search panel inside the same sidebar area.

Panel title:
- **Tìm kiếm**

Content:
- search input with placeholder:
  - **Tìm trong project**
- filter options if useful:
  - **Trong tệp hiện tại**
  - **Toàn bộ project**
  - **Phân biệt hoa thường** (optional)
- results list below the search field

Each result item should show:
- matched text snippet
- file name
- line number
- subtle highlight for matched keyword

Example result structure:
- `main.typ — dòng 16`
- matched heading or paragraph snippet
- click behavior implied: opens the file and jumps to that line

The search panel should feel like a real code/document project search, not a global app search.

---

## Sidebar mode 3: Outline
When the outline icon is selected, show the document structure panel.

Panel title:
- **Outline**

Content:
- hierarchical heading tree extracted from the current Typst document
- expandable/collapsible structure
- indentation for levels
- current active section highlighted subtly

Example items:
- **Giới thiệu**
- **Nội dung chính**
- **Đóng góp**
- **Tài liệu liên quan**

Optional small actions in the header:
- expand all
- collapse all

This panel should help users navigate long academic documents.

---

## Sidebar mode 4: Lỗi và cảnh báo
When the last icon is selected, show a diagnostics panel that contains only document issues.

Panel title:
- **Lỗi và cảnh báo**

Important rule:
- this panel is only for:
  - compile errors
  - syntax errors
  - warnings
  - missing references
  - missing file imports
  - invalid citations
- do not show “suggestions for improvement”
- do not show grammar coaching or style advice
- do not show AI recommendations

The content should feel like a real Typst/compiler diagnostics panel.

Example sections:
- **Lỗi**
- **Cảnh báo**

Example items:
- **Không tìm thấy tệp `template.typ`**
- **Tham chiếu chưa được định nghĩa**
- **Cú pháp không hợp lệ tại dòng 24**
- **Trích dẫn chưa có trong tệp .bib**

Each issue item should show:
- severity icon or badge
- short Vietnamese message
- file name
- line number
- optional click target behavior implied: jump to issue location

Use semantic colors carefully:
- red for errors
- amber/orange for warnings
- soft background, subtle styling, not noisy

Empty state text:
- **Không có lỗi hoặc cảnh báo**
- **Tài liệu hiện đang biên dịch bình thường**

---

## Shared sidebar behavior
The sidebar must remain:
- collapsible
- horizontally resizable
- reusable across all sidebar modes
- the same physical panel area switches content based on selected icon

Use a clear divider between:
- left icon rail
- functional sidebar panel
- main editor

Make the switching behavior visually obvious and consistent.

---

## UX expectations
This should feel like a real Typst-based academic editor:
- focused
- productive
- practical
- clean
- stable
- useful for long-form document work

Do not redesign the whole editor.
Only extend and refine the left workspace sidebar so that it supports:
- project files
- search
- outline
- error/warning diagnostics

## Final result
Generate an updated editor workspace where the left sidebar supports four clear modes:
- **Khám phá tệp**
- **Tìm kiếm**
- **Outline**
- **Lỗi và cảnh báo**

The last mode must strictly display only the list of errors and warnings.