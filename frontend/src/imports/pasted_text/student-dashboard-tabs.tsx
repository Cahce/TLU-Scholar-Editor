Refine the existing **student project dashboard** in Figma for **TLU Scholar Editor**.

Important:
- This is an **edit/refinement task**, not a full redesign.
- Keep the current visual style, spacing system, and overall layout.
- Keep the page as a clean academic dashboard for desktop.
- All visible UI text must be in **Vietnamese**.

## Main change request
Remove these items from the **student sidebar navigation**:
- Tất cả project
- Project của tôi
- Project được chia sẻ

Do not show these three items in the left sidebar anymore.

Instead, move them into the **main content area** as a **tab navigation component** on the project listing page.

---

## Sidebar after edit
Keep the student sidebar, but remove the 3 project list navigation items above.

The sidebar should keep only the other relevant items such as:
- Tạo project mới
- Mẫu tài liệu
- Lịch sử chỉnh sửa
- Hồ sơ cá nhân
- Cài đặt
- Hỗ trợ

The sidebar should feel cleaner and less crowded.

---

## Main content area
Keep the page as the main student project management page.

At the top of the main content area, keep:
- page title
- subtitle
- quick actions like:
  - Tạo project trống
  - Tạo từ mẫu

Below the title/subtitle and action cards, add a **tab bar** for project sections.

---

## New tab navigation
Create a horizontal tab component in the content area with 3 tabs:

- **Tất cả project**
- **Project của tôi**
- **Project được chia sẻ**

This tab bar should visually replace the old project-related sidebar navigation.

### Tab behavior
- only one tab is active at a time
- clicking a tab updates the data shown in the project list below
- this should feel like switching views inside the same page
- do not create separate unrelated pages

### Active tab style
Use a modern clean tab style:
- clear active indicator
- blue active state aligned with the existing brand color
- subtle inactive tabs
- implementation-friendly design

Possible active style:
- blue text
- bold or semibold label
- bottom border indicator or filled soft background
- rounded corners if appropriate

---

## Tab content states

### 1. Tất cả project
When this tab is active:
- title area can stay the same
- the table/list below shows **all accessible projects**
- include both owned projects and shared projects
- optional small status badge per row:
  - Của tôi
  - Được chia sẻ

### 2. Project của tôi
When this tab is active:
- the table/list shows only projects created and managed by the student
- sample rows should reflect personal projects

### 3. Project được chia sẻ
When this tab is active:
- the table/list shows only projects shared with the student
- can include metadata such as:
  - Người chia sẻ
  - Quyền truy cập

---

## Table/list area
Keep the project listing area below the tabs.

Use a structured table with columns such as:
- Tên project
- Loại project
- Ngày tạo
- Cập nhật gần nhất
- Thao tác

For the shared tab, you may adjust one or two columns if necessary, for example:
- Người chia sẻ
- Quyền

Keep action buttons always visible on the right:
- Mở
- Tải xuống
- Nhân bản
- Cài đặt

Keep the same clean table style already used in the design.

---

## Search and filter area
Keep the search and sorting controls above the table:
- search input: **Tìm kiếm project**
- sort dropdown: **Sắp xếp theo**
- view switch: list / grid if already present

These controls should work consistently across all tabs.

Recommended placement:
- tab bar first
- then search/sort controls
- then the table/list

Or:
- search/sort controls on the same row as the tabs if the layout feels balanced

---

## Layout guidance
The final page should have this hierarchy:

1. Page title: **Project của tôi** or a broader title like **Danh sách project**
2. Subtitle
3. Quick action cards:
   - Tạo project trống
   - Tạo từ mẫu
4. Horizontal tab navigation:
   - Tất cả project
   - Project của tôi
   - Project được chia sẻ
5. Search / sort / view controls
6. Project table or list

Use good spacing and alignment.

---

## UX goal
The interface should feel more streamlined by:
- simplifying the sidebar
- moving project scope switching into the page itself
- making it easier for students to switch between project categories in one place

This should feel similar to a tabbed content layout, not a left-navigation driven layout.

---

## Visual style
Keep the current TLU Scholar Editor visual language:
- white cards
- light neutral background
- subtle blue accents
- rounded corners
- soft shadows
- clean typography
- academic and professional feel

Do not redesign into a completely different style.

---

## Final expectation
Produce an updated student dashboard where:
- the sidebar no longer contains:
  - Tất cả project
  - Project của tôi
  - Project được chia sẻ
- these options appear as a tab bar inside the main project listing page
- switching tabs changes the displayed dataset
- the overall layout remains clean, realistic, and implementation-friendly
- all visible labels are in Vietnamese