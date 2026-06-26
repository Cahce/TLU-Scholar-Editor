Refine the existing left sidebar navigation for **TLU Scholar Editor** based on the current design, while using the **information architecture style of Overleaf’s sidebar** as inspiration.

Important:
- This is an **edit/refinement task**, not a full redesign from scratch.
- Keep the overall visual language of TLU Scholar Editor.
- Use Overleaf only as a reference for **sidebar structure and grouping**, not for direct visual copying.
- Keep the interface suitable for a **real internal academic web application**.

## Product context
TLU Scholar Editor is an internal university platform for academic writing, project management, and Typst-based document editing.

The sidebar should feel:
- professional
- academic
- clean
- organized
- implementation-friendly
- role-based
- easy to scan

## Visual style
Keep the current TLU Scholar Editor design system:
- primary accent color: **#007bff**
- light neutral background
- white or light-gray surfaces
- subtle borders
- soft radius
- minimal shadow
- clean spacing
- Vietnamese visible UI text

Do not copy Overleaf’s dark theme literally.
Use Overleaf only as inspiration for:
- grouped navigation
- prominent project entry points
- clear section hierarchy
- simple left-side navigation experience

---

# Main goal
Update the sidebar so that it supports **role-based navigation**.

Create two sidebar variants:
1. **Sinh viên**
2. **Giảng viên**

The two variants should share the same visual structure, but differ in navigation items.

---

# Shared sidebar structure
Use a vertical left sidebar with these zones:

1. **Primary action area**
2. **Project navigation section**
3. **Additional navigation section**
4. **Bottom utility/help area**

The layout should feel more structured like Overleaf:
- top area for important project actions
- middle area for project-related navigation
- secondary items below
- support/help items at the bottom

---

# Student sidebar
Create a sidebar variant for **Sinh viên**.

## Top primary action
At the top, show a prominent primary action button:
- **Tạo project mới**

This button should be visually more prominent than normal nav items.

## Main project navigation group
Below that, show a grouped navigation section for project-related items:

- **Tất cả project**
- **Project của tôi**
- **Project được chia sẻ**

Behavior:
- these are main navigation destinations
- only one item is active at a time
- active item uses light blue background and blue text/icon
- inactive items use neutral text/icon

## Secondary navigation group
Below the main project group, keep additional student-related navigation items:

- **Mẫu tài liệu**
- **Lịch sử chỉnh sửa**
- **Hồ sơ cá nhân**
- **Cài đặt**

Important:
- “Tổng quan” can be removed if it is no longer needed, or moved above as a general dashboard item only if it still fits the IA
- prioritize project-related navigation like Overleaf

## Bottom support section
At the bottom, keep a compact support/help block or utility area.

Use:
- title: **Cần hỗ trợ?**
- supporting text: **Xem tài liệu hướng dẫn hoặc liên hệ Admin.**
- button: **Trung tâm trợ giúp**

This bottom support block should feel lighter and more compact than before.

---

# Teacher sidebar
Create a sidebar variant for **Giảng viên**.

The teacher sidebar should use the same structure, but with teacher-relevant items.

## Top primary action
At the top, keep a prominent action button:
- **Tạo project mới**
or if needed:
- **Tạo tài liệu mới**

## Main project navigation group
Below that, show:

- **Tất cả project**
- **Project của tôi**
- **Project được chia sẻ**
- **Đồ án tốt nghiệp**

Important:
- **Đồ án tốt nghiệp** is a dedicated teacher navigation item
- this item should feel like a first-class section, not a nested child
- it can represent supervising, reviewing, or managing graduation thesis projects

## Secondary navigation group
Below the main project group, keep:

- **Mẫu tài liệu**
- **Lịch sử chỉnh sửa**
- **Hồ sơ cá nhân**
- **Cài đặt**

If useful, a teacher-specific item may also be added:
- **Sinh viên hướng dẫn**
but only if it fits naturally and does not overcrowd the sidebar

## Bottom utility/help area
Keep the same support block:
- **Cần hỗ trợ?**
- **Xem tài liệu hướng dẫn hoặc liên hệ Admin.**
- **Trung tâm trợ giúp**

---

# Interaction and hierarchy
Use a clear hierarchy similar to Overleaf’s navigation logic:

## Primary button
- visually distinct
- placed near the top
- easy to find

## Navigation items
- icon + label
- aligned consistently
- grouped with comfortable spacing
- active state clearly visible
- hover state subtle and clean

## Suggested icons
Use simple outline icons appropriate for each item:
- Tất cả project
- Project của tôi
- Project được chia sẻ
- Đồ án tốt nghiệp
- Mẫu tài liệu
- Lịch sử chỉnh sửa
- Hồ sơ cá nhân
- Cài đặt
- Trung tâm trợ giúp

Do not overuse icon variety.
Keep them consistent and implementation-friendly.

---

# UX requirement
The sidebar should feel closer to Overleaf in **navigation structure**, meaning:
- project access is central
- important project categories are grouped together
- one clear primary action is placed at the top
- supporting utilities are separated below

But it must still look like **TLU Scholar Editor**, not like a copied Overleaf clone.

---

# Final expectation
Update the existing sidebar design into two role-based variants:

## Variant 1 — Sinh viên
Includes:
- Tạo project mới
- Tất cả project
- Project của tôi
- Project được chia sẻ
- Mẫu tài liệu
- Lịch sử chỉnh sửa
- Hồ sơ cá nhân
- Cài đặt
- Trung tâm trợ giúp

## Variant 2 — Giảng viên
Includes:
- Tạo project mới
- Tất cả project
- Project của tôi
- Project được chia sẻ
- Đồ án tốt nghiệp
- Mẫu tài liệu
- Lịch sử chỉnh sửa
- Hồ sơ cá nhân
- Cài đặt
- Trung tâm trợ giúp

All visible UI text must be in **Vietnamese**.
Keep the result clean, realistic, academic, and aligned with the TLU Scholar Editor design system.