Design the **“Create from template” project creation flow** for **TLU Scholar Editor**, following the existing product guideline and keeping the UI close to the provided references.

## Product context
TLU Scholar Editor is an internal university academic writing and document management platform.

This screen is used when a student clicks **“Tạo từ mẫu”** from the dashboard to create a new project from a Typst template.

The result must feel:
- professional
- academic
- trustworthy
- structured
- realistic
- implementation-friendly
- desktop-first

Do not design this like a landing page or concept art.

---

## Language rule
The prompt is in English for model understanding, but **all visible UI text must be in Vietnamese** by default.

Use Vietnamese for:
- modal title
- field labels
- placeholders
- button labels
- filter labels
- empty states
- descriptions
- notifications
- status messages

Allowed English technical terms only if natural:
- Typst
- PDF
- Template
- Preview

---

## Design system
Follow the TLU Scholar Editor style:
- primary brand color: **#007bff**
- very light neutral app background
- white surfaces
- subtle gray borders
- soft radius
- minimal shadow
- structured spacing
- realistic enterprise/university web app styling

Avoid:
- flashy visuals
- marketing-style composition
- glassmorphism
- strong gradients
- decorative concept styling

---

# Main flow
When the user clicks **“Tạo từ mẫu”**, open a large centered modal above the dashboard, similar to the references.

The modal should be a **template selection and project configuration dialog**.

---

# Modal structure
Create a large modal with 3 main areas:

1. **Header**
2. **Template gallery area**
3. **Template detail / configuration panel**

Use a clean split layout:
- left side: searchable/filterable template gallery
- right side: template details and project configuration

---

## 1. Modal header
Use a simple top header with:
- title: **Cấu hình project mới**
- close icon button on the top-right

Optional subtitle can be omitted for a cleaner layout.

---

## 2. Template search and filters
At the top of the gallery area, include:

### Search field
- placeholder: **Tìm kiếm mẫu**

### Filter 1
- dropdown label/value: **Tất cả danh mục**

### Filter 2
- dropdown label/value: **Tất cả lĩnh vực**

These controls should match the behavior shown in the references.

### Example category options
- **Bài báo**
- **Báo cáo**
- **Luận văn**
- **Đồ án**
- **CV**
- **Trình chiếu**
- **Biểu mẫu**
- **Khác**

### Example discipline options
- **Không phân ngành**
- **Công nghệ thông tin**
- **Kinh tế**
- **Xây dựng**
- **Thủy lợi**
- **Môi trường**
- **Cơ khí**
- **Điện**
- **Toán học**
- **Vật lý**
- **Hóa học**
- **Khác**

Keep the dropdowns realistic, scrollable, and implementation-friendly.

---

## 3. Template gallery
Below the search/filter row, show a scrollable gallery/grid of templates similar to the references.

Each template card should contain:
- thumbnail preview of the template
- template name badge or label below the card
- optional subtle featured state for selected card

Example template names:
- **Mẫu bài báo khoa học**
- **Mẫu luận văn**
- **Mẫu đồ án tốt nghiệp**
- **Mẫu báo cáo thực tập**
- **Mẫu trình chiếu**
- **Mẫu CV học thuật**

The template grid should feel like a real Typst template browser.

---

# Default right-side panel state
Before a template is selected, the right-side panel should show an empty instructional state similar to the reference.

Use:
- a large neutral icon / illustration
- title: **Chọn một mẫu để bắt đầu**
- description: **Chọn mẫu phù hợp để khởi tạo project. Bạn có thể chỉnh sửa lại toàn bộ nội dung sau khi tạo.**

Keep this state simple and clean.

---

# Selected template state
When the user selects a template card, the right-side panel must update to a detailed selected-template view similar to reference image 4.

This panel should include:

## Template header info
- template name
- optional badge: **Nổi bật**
- short Vietnamese description of the template

Example:
- **Mẫu đồ án tốt nghiệp**
- **Nổi bật**
- **Mẫu Typst dùng để khởi tạo đồ án tốt nghiệp theo định dạng chuẩn của hệ thống.**

## About section
Include:
- **Tác giả**
- **Giấy phép**
- **Cập nhật gần nhất**

Important requirement:
- **Do not include any “Repository” or GitHub repository row**
- **Do not show GitHub link**
- **Do not mention repo source**
- The design must not contain repository metadata

So the detail panel must be like reference image 4, but with the repository/GitHub part removed entirely.

---

# Project configuration form in the detail panel
Below the template information, include project creation fields:

## Field 1
- label: **Tên project**
- input placeholder: **Nhập tên project**

## Field 2
- label: **Thể loại**
- dropdown placeholder: **Chọn thể loại**
- example options:
  - **Khóa luận tốt nghiệp**
  - **Đồ án môn học**
  - **Tiểu luận**
  - **Bài báo khoa học**
  - **Báo cáo thực tập**
  - **Nghiên cứu khoa học**
  - **Khác**

## Optional field 3
- label: **Mô tả**
- textarea placeholder: **Nhập mô tả ngắn**

Keep the form short, realistic, and clean.

---

# Action button
At the bottom-right of the modal, place the primary CTA:

- **Tạo project**

Behavior:
- disabled when no template is selected
- disabled when project name is empty
- enabled only when required inputs are valid

The button should use the primary blue color.

---

# Create result behavior
This is a strict requirement.

After clicking **“Tạo project”**, show clear feedback states.

## Success state
If project creation succeeds:
- close the modal
- navigate to the editor workspace
- show a bottom toast notification similar to the reference

Toast content:
- icon: success/check
- message: **Tạo project thành công**
- optional detail: **Project đã được khởi tạo từ mẫu đã chọn**

## Failure state
If project creation fails:
- keep the modal open
- show an error toast notification

Toast content:
- icon: error/warning
- message: **Tạo project thất bại**
- optional detail examples:
  - **Không thể khởi tạo project. Vui lòng thử lại.**
  - **Tên project đã tồn tại.**
  - **Không thể tải dữ liệu mẫu.**

The success and failure notifications should feel realistic and system-like, not playful.

---

# After success navigation
After successful creation, navigate into the Typst editor workspace with the selected template already loaded.

The resulting project should:
- open in the editor directly
- already contain the initialized template content
- feel like the selected template has been applied to the new project

---

# UX requirements
This flow should clearly communicate:
- click “Tạo từ mẫu” opens a template browser modal
- choosing a template updates the detail/configuration panel
- template details are visible without GitHub/repository metadata
- project creation gives clear success/failure feedback
- success leads to the editor workspace

Keep the entire experience:
- practical
- academic
- stable
- clean
- production-minded

---

# Final output expectation
Generate a realistic UI flow with these states:

1. **Modal opened from “Tạo từ mẫu”**
   - search
   - category filter
   - discipline filter
   - template grid
   - empty detail state

2. **Template selected**
   - detailed template panel appears on the right
   - includes template info and project form
   - does **not** include repository/GitHub info

3. **Create action feedback**
   - success toast
   - failure toast

4. **Successful create transition**
   - project opens in the Typst editor workspace

The final result must follow the TLU Scholar Editor guideline closely and use Vietnamese UI content. 