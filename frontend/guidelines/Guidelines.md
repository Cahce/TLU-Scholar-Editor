# TLU Scholar Editor - Global System Guidelines

Design and generate UI for **TLU Scholar Editor**, an internal academic scientific document editing and management platform for a university environment.

The platform is intended for:

- students
- lecturers
- administrators

It supports workflows such as:

- authentication
- project creation and management
- scientific document editing
- bibliography and citation support
- academic supervision
- internal review workflows
- approval flows
- storage management
- activity tracking
- administration and permissions

The generated product must look like a **real internal university web application**, not a marketing landing page.

The overall experience must feel:

- professional
- academic
- trustworthy
- modern
- structured
- clear
- productive
- implementation-friendly

Avoid generating:

- flashy startup-style UI
- gaming-style UI
- crypto-style UI
- decorative concept shots
- dribbble-style overdesigned layouts
- art-heavy interfaces
- mobile-only compositions for desktop systems unless requested

Prefer practical, realistic, dashboard-oriented application screens with strong hierarchy and good usability.

---

# Core Product Identity

TLU Scholar Editor is a platform for creating, editing, reviewing, organizing, and monitoring scientific and academic documents inside a university.

The visual identity should communicate:

- academic rigor
- stability
- clarity
- institutional trust
- digital productivity

The UI should be suitable for:

- long-form document work
- data tables
- forms
- project tracking
- metadata panels
- review workflows
- supervision dashboards
- admin management

This is primarily a **web application**, not a promotional website.

---

# Language Rules

The prompt and system instructions may be written in **English** for better model understanding.

However, the generated **interface content must be in Vietnamese** by default.

All visible UI content should be Vietnamese, including:

- page titles
- section titles
- navigation labels
- sidebar items
- tab labels
- card titles
- button labels
- form labels
- placeholders
- helper text
- validation text
- badges
- table headers
- empty states
- notifications
- modal titles
- modal descriptions
- tooltips
- filter labels
- pagination labels

Do not generate English UI text by default.

A small number of technical or industry-standard terms may remain in English only when they are more natural or clearer in product UI.

Allowed examples include:

- PDF
- Typst
- AI
- Admin
- Dashboard
- Email
- ID
- API
- Export
- Template
- Preview
- Tab

Even when using such terms, the surrounding content must remain Vietnamese.

Good examples:

- Xuất PDF
- Bảng điều khiển Admin
- Email đăng nhập
- Chọn Template
- Xem Preview
- Lịch sử Export

Bad examples:

- Sign in
- Recent documents
- Create project
- User settings
- Project overview

Avoid unnecessary mixing of English and Vietnamese.

---

# Vietnamese Content Style

Use Vietnamese that is:

- concise
- professional
- neutral
- product-oriented
- easy to scan
- suitable for an academic and administrative environment

The writing style should feel formal enough for a university system, but still modern and readable.

Prefer wording such as:

- Đăng nhập
- Quên mật khẩu
- Bảng điều khiển
- Dự án gần đây
- Tài liệu gần đây
- Trình biên tập tài liệu
- Tài liệu tham khảo
- Chi tiết tài liệu
- Lịch sử hoạt động
- Quản lý người dùng
- Theo dõi tiến độ
- Trạng thái xử lý
- Tạo dự án mới
- Xuất PDF
- Thông tin dự án
- Bộ lọc nâng cao
- Giảng viên hướng dẫn
- Quản trị hệ thống

Avoid:

- slang
- casual social-media phrasing
- emoji in interface text
- exaggerated marketing phrases
- playful startup copy
- overly verbose labels

UI text should be compact and action-oriented.

---

# Brand and Color System

Use **#007bff** as the primary brand color.

The color system should feel:

- clear
- accessible
- modern
- institutional
- calm
- trustworthy

## Primary Brand Palette

- Primary 50: #e6f2ff
- Primary 100: #cce5ff
- Primary 200: #99cbff
- Primary 300: #66b2ff
- Primary 400: #3398ff
- Primary 500: #007bff
- Primary 600: #0069d9
- Primary 700: #0056b3
- Primary 800: #004085
- Primary 900: #002752

## Neutral Palette

- Background: #f8fafc
- Surface: #ffffff
- Surface muted: #f1f5f9
- Surface subtle: #f8fbff
- Border: #dbe3ed
- Divider: #e2e8f0
- Text primary: #0f172a
- Text secondary: #475569
- Text muted: #64748b
- Disabled text: #94a3b8

## Semantic Palette

- Success: #16a34a
- Success light: #dcfce7
- Warning: #d97706
- Warning light: #fef3c7
- Error: #dc2626
- Error light: #fee2e2
- Info: #0ea5e9
- Info light: #e0f2fe

## Color Usage Rules

- Use the primary blue for main CTAs, active controls, selected states, focus states, links, and important navigation highlights.
- Use darker blue shades for hover, pressed, or stronger emphasis states.
- Use very light blue backgrounds for active tabs, selected cards, selected filters, selected rows, and subtle information highlights.
- Keep the majority of the interface on white or very light neutral surfaces.
- Do not flood entire screens with solid blue backgrounds.
- Use semantic colors only for meaning:
  - success
  - warning
  - error
  - informational status
- Do not use semantic colors as random decoration.
- Ensure good accessibility and contrast.
- Avoid neon colors.
- Avoid strong gradients in application screens.
- Prefer flat, stable, readable color application.

---

# Visual Design Principles

The design language should be:

- clean
- structured
- minimal but not empty
- realistic
- efficient
- modern
- academic
- administrative

Use decoration sparingly.

Focus on:

- hierarchy
- clarity
- alignment
- readable density
- calm composition
- practical interaction patterns

The UI should prioritize function over visual novelty.

---

# Layout Principles

## General Layout

- Build responsive web application layouts.
- Prefer grid and flexbox structures.
- Avoid unnecessary absolute positioning.
- Avoid decorative floating elements without function.
- Use modular sections that can scale to more complex screens.

## Preferred Desktop Application Structure

For main application screens, prefer:

- top header
- left sidebar navigation
- central content area
- optional right-side context panel

This right-side panel can be used for:

- metadata
- bibliography
- activity history
- version history
- filters
- document properties
- notes or review comments

## Spacing Scale

Use a consistent spacing system:

- 4
- 8
- 12
- 16
- 20
- 24
- 32
- 40
- 48

Prefer consistent spacing rhythms instead of ad hoc gaps.

## Section Spacing

- Small internal gaps for tightly related controls
- Medium spacing between grouped content
- Larger spacing between major sections

## Width and Density

- The product should support moderate to high information density.
- Keep screens readable but not excessively sparse.
- Use whitespace to structure information, not to make the UI look empty.
- Long text content must have reasonable line width.
- Tables and dashboards should feel organized, not cramped.

## Responsive Behavior

- On tablet and mobile widths, collapse the sidebar into a drawer.
- Stack sections vertically when needed.
- Maintain usable spacing.
- Allow tables and large editors to scroll horizontally if necessary.
- Preserve functionality rather than forcing decorative symmetry.

---

# Typography

Use typography suitable for a serious academic product.

The typography should feel:

- clear
- professional
- stable
- readable
- not playful

## Suggested Hierarchy

- Page title: strong, prominent, clear
- Section title: visible, structured
- Card title: semibold
- Body text: neutral and readable
- Supporting/meta text: smaller and muted

## Suggested Scale

- h1: text-3xl or text-4xl
- h2: text-2xl
- h3: text-xl
- h4 / card title: text-lg
- body: text-sm or text-base
- meta text: text-xs or text-sm

## Typography Rules

- Prioritize readability over expression.
- Avoid oversized headings on app screens.
- Avoid very small text for important data.
- Keep labels and helper text compact.
- Use visual hierarchy consistently.
- Use muted text for metadata, timestamps, secondary descriptions, and helper content.

---

# Shape, Radius, Border, Shadow

## Radius

Use soft but controlled radii:

- cards: rounded-xl
- buttons: rounded-lg
- inputs: rounded-lg
- dropdowns: rounded-lg
- modals: rounded-2xl
- badges: rounded-full or rounded-md depending on style

Avoid extremely round playful styling.

## Borders

- Prefer subtle borders for separation.
- Most cards, tables, forms, side panels, and containers should use soft gray borders.
- Borders are preferred over strong shadows for content grouping.

## Shadows

- Use subtle shadows only when necessary.
- cards: shadow-sm
- floating menus / dropdowns / modals: shadow-lg
- avoid heavy shadows
- avoid dramatic layered depth

The interface should feel crisp, not soft and decorative.

---

# Iconography

- Use simple, modern outline icons.
- Icons should improve recognition, not act as decoration.
- Keep icon size consistent across similar elements.
- Use icons sparingly in dense tables and forms.
- Do not fill the interface with random illustrative icons.

Preferred use cases:

- navigation
- status indicators
- quick actions
- input prefixes
- metadata labels
- tabs

---

# Component Rules

## Component Library (shadcn/ui)

This project uses a shadcn/ui-style component library backed by Radix primitives and Tailwind.

Rules:

- Prefer using existing components in `src/app/components/ui/*` for all new UI.
- Prefer importing shadcn components via local wrappers (example: `./ui/button`) instead of importing Radix primitives directly in feature screens.
- Use `cn()` from `src/app/components/ui/utils.ts` for class composition; avoid manual string concatenation.
- Prefer semantic tokens (example: `bg-background`, `text-foreground`, `text-muted-foreground`, `border-border`) when working with shadcn components. Use raw `slate-*` only when a screen explicitly needs it.
- Do not introduce new UI libraries for new screens. Avoid mixing MUI and shadcn in the same surface; use shadcn for new work unless there is a strong compatibility reason.
- Keep variants minimal and explicit; use `class-variance-authority` only when variants are real and reused.

## Buttons

Use exactly three priority levels.

### Primary Button

Used for the most important action in a local area.

Style:

- primary blue background
- white text
- clearly visible
- medium emphasis

Examples:

- Đăng nhập
- Tạo dự án mới
- Lưu thay đổi
- Gửi phê duyệt
- Xuất PDF

### Secondary Button

Used for important but non-primary actions.

Style:

- white or muted background
- soft border
- dark text
- optional blue accent border when useful

Examples:

- Hủy
- Xem chi tiết
- Mở tài liệu
- Quản lý
- Xem thêm

### Tertiary Button

Used for inline or supporting actions.

Style:

- minimal visual weight
- text or low-emphasis button
- used in table rows, cards, or helper areas

Examples:

- Sửa
- Xóa
- Thử lại
- Xem lịch sử
- Mở bộ lọc

### Button Rules

- Keep labels short and action-oriented.
- Do not place too many primary buttons in one area.
- Add icons only when helpful.
- Ensure hover and focus states are visible.
- Keep button sizes consistent.

---

## Inputs and Forms

- Use clear labels above inputs.
- Use helper text only when it adds value.
- Keep placeholder text supportive, not a replacement for labels.
- Show visible focus state with blue border or blue ring.
- Error state must include both color and text.
- Required fields should be clearly indicated when necessary.
- Group related fields into sections or cards.
- For longer forms, use visible section titles.

Form types that should be supported well:

- login form
- project creation
- metadata editing
- user management
- filter forms
- approval / review forms
- profile and settings forms

---

## Cards

Cards should:

- group related information
- support clean scanning
- use consistent padding
- have simple headers when needed
- not be overloaded with decoration

Cards are suitable for:

- dashboard metrics
- project summary
- recent items
- activities
- statistics
- alerts
- metadata groups

Avoid deeply nested cards unless necessary.

---

## Tables

Tables are important in this product.

Design tables to feel:

- structured
- administrative
- readable
- actionable

Table rules:

- use clear headers
- support row hover states
- align numbers and dates consistently
- use badges for status
- keep row actions compact
- use sticky headers when appropriate
- allow horizontal scrolling when necessary
- provide search / filter / sort affordances where useful

Likely use cases:

- project list
- user list
- document list
- activity log
- review status
- storage reports
- supervision tables

---

## Badges

Use badges for:

- trạng thái
- vai trò
- mức độ ưu tiên
- tiến độ
- quyền truy cập
- dung lượng
- cảnh báo

Badge design:

- compact
- readable
- soft background
- darker foreground text
- consistent sizing

Examples:

- Đang xử lý
- Hoàn thành
- Chờ duyệt
- Quản trị viên
- Giảng viên
- Sinh viên
- Quá hạn
- Bình thường

---

## Navigation

Navigation must be:

- stable
- clear
- structured
- easy to scan

Sidebar navigation should support:

- grouped sections
- active state
- optional icons
- collapsible behavior for smaller screens

Active navigation state:

- light blue background
- blue text
- stronger emphasis than inactive items

Top header may include:

- page title
- breadcrumbs
- search
- notifications
- user menu
- quick actions

Do not overcomplicate navigation.

---

## Tabs

Use tabs where content is closely related but logically separated.

Appropriate examples:

- Soạn thảo / Preview / Tài liệu tham khảo / Lịch sử
- Tổng quan / Thành viên / Hoạt động / Thiết lập
- Thông tin chung / Quyền truy cập / Nhật ký

Tabs should:

- be clearly visible
- show active state with blue emphasis
- not be overly decorative

---

## Modals, Drawers, Side Panels

Use:

- modal for confirmation, short forms, and focused tasks
- drawer / side panel for contextual data, metadata, history, notes, bibliography, or filters

Examples:

- xác nhận xóa
- thêm người dùng
- chỉnh sửa thông tin dự án
- xem lịch sử hoạt động
- mở bảng tài liệu tham khảo
- xem thuộc tính tài liệu

Keep these surfaces clean and structured.

---

# Page and Module Guidance

## Authentication

Pages may include:

- đăng nhập
- quên mật khẩu
- đổi mật khẩu
- xác thực vai trò

Authentication screens should feel:

- secure
- simple
- uncluttered
- trustworthy

Recommended patterns:

- centered card layout
- split layout with product introduction on one side
- concise branding
- no unnecessary visual noise

---

## Main Dashboard

The main dashboard should provide:

- summary statistics
- recent projects
- recent documents
- pending tasks
- alerts
- recent activity
- quick actions

The dashboard should help users understand current status immediately.

---

## Project Management

Possible screens:

- danh sách dự án
- tạo dự án
- chi tiết dự án
- tiến độ dự án
- thành viên dự án
- trạng thái phê duyệt

These screens should balance:

- summary data
- tables
- filters
- actions
- status visualization

---

## Document Editor

The editor is one of the core modules.

It should feel:

- focused
- productivity-oriented
- structured
- suitable for long-form academic content

Possible editor layout:

- top action bar
- main writing/editor area
- preview area or tab
- bibliography / citation panel
- metadata panel
- version history panel
- compile/export actions
- comments/review support where relevant

Do not design the editor like a social app or content marketing page.

---

## Lecturer Dashboard

The lecturer-facing area may include:

- danh sách sinh viên
- tiến độ dự án
- trạng thái tài liệu
- thời gian cập nhật gần nhất
- cảnh báo chậm tiến độ
- hàng chờ phê duyệt
- bộ lọc theo nhóm / lớp / trạng thái

This module should emphasize monitoring, review, and oversight.

---

## Admin Dashboard

The admin area may include:

- quản lý người dùng
- vai trò và phân quyền
- thống kê hệ thống
- trạng thái lưu trữ
- nhật ký hoạt động
- cấu hình hệ thống
- báo cáo sử dụng

This module should feel structured, efficient, and administrative.

---

## Profile and Settings

Possible sections:

- thông tin cá nhân
- cài đặt tài khoản
- đổi mật khẩu
- tùy chọn thông báo
- cấu hình hệ thống cá nhân
- quyền truy cập
- lịch sử hoạt động cá nhân

These pages should remain simple and form-oriented.

---

# Data Visualization Guidance

Charts and simple visual summaries may be used for:

- project counts
- activity trends
- storage usage
- status distribution
- supervision progress

Chart rules:

- keep them simple
- use restrained color application
- prefer readable labels
- do not create flashy analytics dashboards
- use charts only when they add clear value

Use cards, progress bars, mini charts, and summary blocks in moderation.

---

# Accessibility and Usability

- Maintain strong color contrast.
- Never rely on color alone to communicate meaning.
- Always provide visible focus states.
- Keep click targets comfortable.
- Use clear labels.
- Ensure disabled states are distinguishable.
- Avoid tiny text on important controls.
- Use consistent state patterns for success, warning, error, and info.
- Ensure forms, tables, and actions are easy to understand.

The product should feel reliable and usable for long work sessions.

---

# Tailwind CSS Code Generation Rules

## Mandatory Requirement

Generated code must use **Tailwind CSS**.

## Core Tailwind Approach

- Use Tailwind utility classes directly in markup.
- Prefer utility-first styling.
- Avoid large custom CSS blocks unless absolutely necessary.
- Keep generated code implementation-friendly and modular.
- Use semantic HTML where practical.

## Preferred Tailwind Utilities

Use common Tailwind patterns such as:

### Layout

- `flex`
- `grid`
- `items-center`
- `justify-between`
- `min-h-screen`
- `w-full`
- `max-w-*`
- `mx-auto`

### Spacing

- `p-4`
- `p-6`
- `p-8`
- `px-4`
- `px-6`
- `py-3`
- `py-4`
- `gap-2`
- `gap-4`
- `gap-6`
- `space-y-4`
- `space-y-6`

### Surface and Border

- `bg-white`
- `bg-slate-50`
- `bg-blue-50`
- `border`
- `border-slate-200`
- `border-blue-200`

### Typography

- `text-slate-900`
- `text-slate-700`
- `text-slate-600`
- `text-sm`
- `text-base`
- `text-lg`
- `text-xl`
- `font-medium`
- `font-semibold`
- `font-bold`

### Radius and Shadow

- `rounded-lg`
- `rounded-xl`
- `rounded-2xl`
- `shadow-sm`
- `shadow-lg`

### States

- `hover:bg-blue-700`
- `hover:bg-slate-50`
- `focus:outline-none`
- `focus:ring-2`
- `focus:ring-blue-500`
- `disabled:opacity-50`
- `disabled:pointer-events-none`

## Tailwind Brand Mapping

Use this mapping for the main design language:

- primary action: `bg-blue-600 text-white`
- hover state: `hover:bg-blue-700`
- active/selected background: `bg-blue-50`
- active text: `text-blue-700`
- accent border: `border-blue-200`
- focus ring: `focus:ring-blue-500`

When exact brand matching is required, use arbitrary values carefully:

- `bg-[#007bff]`
- `text-[#007bff]`
- `border-[#007bff]`

Prefer standard Tailwind color classes when visually close enough and easier to maintain.

## Code Quality Requirements

- Generate clean and readable code.
- Keep component structure logical.
- Avoid unnecessary wrappers.
- Avoid hardcoded inline styles unless necessary.
- Avoid pixel-perfect overfitting that makes the code brittle.
- Default to responsive implementation.
- Prefer reusable section patterns.
- Organize markup for easy real-world implementation.

---

# Realism Requirements

The generated UI should look like something a real product team could actually build and use.

This means:

- realistic spacing
- realistic table structures
- realistic forms
- realistic labels
- realistic data cards
- realistic empty states
- realistic workflows
- realistic admin and dashboard patterns

Avoid concept-only layouts that look impressive but are not practical.

---

# Consistency Rules Across the Project

All screens across the project should maintain consistency in:

- color system
- typography
- spacing
- card style
- button style
- input style
- navigation behavior
- table appearance
- badge appearance
- modal style
- wording tone
- language behavior
- Tailwind styling patterns

Do not redesign the entire visual language from screen to screen.

Each module may vary in layout according to function, but the system identity must stay consistent.

---

# Output Expectations

When generating any screen for this project, aim for:

1. realistic application UI
2. clean and structured composition
3. professional academic software aesthetics
4. Vietnamese interface content
5. limited English only for necessary technical terms
6. Tailwind CSS-friendly design and code structure
7. practical responsive layout
8. strong information hierarchy
9. production-minded components
10. consistency with the overall TLU Scholar Editor system

If the prompt is ambiguous, choose the most practical and realistic solution for an internal academic document editing and management platform.

---

# Strict Do Not Generate List

Do not generate:

- flashy hero landing pages
- glassmorphism-heavy dashboards
- neon gradients
- excessive illustration-based interfaces
- decorative 3D cards
- startup marketing layouts for core app screens
- social-media-style engagement patterns
- cluttered card walls with no hierarchy
- random mixed language UI
- dark mode by default unless explicitly requested
- over-animated interfaces
- impractical concept art instead of usable product screens

Always refer to this database schema. The block below is auto-generated from `backend/prisma/schema.prisma` — do not edit it by hand; run `npm run sync:guidelines-schema`.

<!-- BEGIN AUTO-GENERATED: prisma-schema (source: backend/prisma/schema.prisma) -->
```prisma
// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

// Get a free hosted Postgres database in seconds: `npx create-db`

generator client {
  provider = "prisma-client-js"
  output   = "../src/generated/prisma"
}

generator erd {
  provider = "prisma-erd-generator"
  output   = "../docs/diagrams/class/database-erd.svg"
  theme    = "neutral"
}

datasource db {
  provider = "postgresql"
}

/**
 * =========================
 * Enums
 * =========================
 */
enum CompileStatus {
  queued
  running
  success
  failed
}

enum UserRole {
  admin
  student
  teacher
}

enum ProjectRole {
  editor
  viewer
}

enum CompileMode {
  export
  preview
}

enum CompileEngine {
  node
  web
}

enum FileKind {
  typst
  bib
  image
  vector
  font
  markdown
  config
  data
  text
  pdf
  other
}

enum TemplateCategory {
  thesis
  report
  proposal
  paper
  presentation
  other
}

enum ZoteroLibraryType {
  user
  group
}

enum ZoteroSyncStatus {
  pending
  running
  success
  failed
}

enum ZoteroSyncType {
  full
  incremental
}

enum OpenAlexImportStatus {
  imported
  skipped_duplicate
  failed
}

enum Gender {
  male
  female
  other
}

/**
 * =========================
 * Users
 * =========================
 */
model User {
  id                  String           @id @default(cuid())
  email               String           @unique
  role                UserRole
  passwordHash        String
  isActive            Boolean          @default(true)
  mustChangePassword  Boolean          @default(false)
  passwordChangedAt   DateTime?
  createdAt           DateTime         @default(now())
  updatedAt           DateTime         @updatedAt
  
  // Profile relations
  teacher             Teacher?         @relation("TeacherAccount")
  student             Student?         @relation("StudentAccount")
  
  // Existing relations
  ownedProjects       Project[]        @relation("ProjectOwner")
  requestedCompileJobs CompileJob[]    @relation("CompileJobRequestedBy")
  memberships         ProjectMember[]
  createdShareLinks   ProjectShareLink[]
  quota               UserQuota?
  invalidTokens       InvalidToken[]
  refreshTokens       RefreshToken[]
  zoteroConnections   ZoteroConnection[]
  openAlexImportLogs  OpenAlexImportLog[]

  @@index([createdAt])
}

/**
 * =========================
 * Academic Structure
 * =========================
 */
model Faculty {
  id          String       @id @default(cuid())
  name        String
  code        String       @unique
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt
  departments Department[]
  majors      Major[]

  @@index([updatedAt])
}

model Department {
  id        String    @id @default(cuid())
  name      String
  code      String    @unique
  facultyId String
  faculty   Faculty   @relation(fields: [facultyId], references: [id], onDelete: Restrict)
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt
  
  // Relations
  teachers  Teacher[]

  @@index([facultyId])
  @@index([updatedAt])
}

model Major {
  id            String          @id @default(cuid())
  name          String
  code          String          @unique
  facultyId     String
  faculty       Faculty         @relation(fields: [facultyId], references: [id], onDelete: Restrict)
  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt
  classes       Class[]

  @@index([facultyId])
  @@index([updatedAt])
}

model Class {
  id        String   @id @default(cuid())
  name      String
  code      String   @unique
  majorId   String
  major     Major    @relation(fields: [majorId], references: [id], onDelete: Restrict)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  
  // Relations
  students  Student[]

  @@index([majorId])
  @@index([updatedAt])
}

/**
 * =========================
 * Student / Teacher profiles
 * =========================
 */

// New independent Teacher model
model Teacher {
  id             String          @id @default(cuid())
  accountId      String?         @unique
  account        User?           @relation("TeacherAccount", fields: [accountId], references: [id], onDelete: SetNull)
  teacherCode    String          @unique
  fullName       String
  departmentId   String
  department     Department      @relation(fields: [departmentId], references: [id], onDelete: Restrict)
  academicRank   String
  academicDegree String
  phone          String?
  gender         Gender?
  dateOfBirth    DateTime?
  address        String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  
  // Reverse relation to ProjectAdvisor (join table)
  // This does NOT mean Teacher owns projects
  // It only represents advisor assignment links
  advisorAssignments ProjectAdvisor[] @relation("advisorAssignments")

  @@index([accountId])
  @@index([departmentId])
  @@index([teacherCode])
  @@index([updatedAt])
}

// New independent Student model
model Student {
  id          String   @id @default(cuid())
  accountId   String?  @unique
  account     User?    @relation("StudentAccount", fields: [accountId], references: [id], onDelete: SetNull)
  studentCode String   @unique
  fullName    String
  classId     String
  class       Class    @relation(fields: [classId], references: [id], onDelete: Restrict)
  phone       String?
  gender      Gender?
  dateOfBirth DateTime?
  address     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([accountId])
  @@index([classId])
  @@index([studentCode])
  @@index([updatedAt])
}

/**
 * =========================
 * Templates
 * =========================
 */
model Template {
  id          String             @id @default(cuid())
  name        String
  description String?
  category    TemplateCategory
  isOfficial  Boolean            @default(false)
  isActive    Boolean            @default(true)
  createdAt   DateTime           @default(now())
  updatedAt   DateTime           @updatedAt
  versions    TemplateVersion[]
  projects    Project[]          @relation("ProjectTemplate")

  // Editable "source project" (admin-owned working copy) used to author this
  // template's content in the workspace, then publish versions from it.
  sourceProjectId String?
  sourceProject   Project?       @relation("TemplateSourceProject", fields: [sourceProjectId], references: [id], onDelete: SetNull)

  @@index([category])
  @@index([isOfficial, isActive])
  @@index([sourceProjectId])
}

model TemplateVersion {
  id            String    @id @default(cuid())
  templateId    String
  template      Template  @relation(fields: [templateId], references: [id], onDelete: Cascade)
  versionNumber String
  changelog     String?
  storageKey    String
  entryPath     String    @default("main.typ")
  isActive      Boolean   @default(true)
  createdAt     DateTime  @default(now())
  projects      Project[]

  @@unique([templateId, versionNumber])
  @@index([templateId, isActive])
  @@index([createdAt])
}

/**
 * =========================
 * Zotero Integration
 * =========================
 */

/// Kết nối Zotero của user.
/// `accessToken` lưu encrypted blob `v1:iv:tag:cipher` (base64),
/// mã hoá AES-256-GCM bởi `shared/crypto/SecretCipher.ts` (key HKDF từ JWT_SECRET).
/// `refreshToken` không dùng (chỉ API-key flow); giữ cột vì tương thích migration cũ.
model ZoteroConnection {
  id              String              @id @default(cuid())
  userId          String
  user            User                @relation(fields: [userId], references: [id], onDelete: Cascade)
  provider        String              @default("zotero")
  accessToken     String
  refreshToken    String?
  libraryId       String
  libraryType     ZoteroLibraryType
  connectedAt     DateTime            @default(now())
  lastSyncedAt    DateTime?
  updatedAt       DateTime            @updatedAt
  syncLogs        ZoteroSyncLog[]

  @@unique([userId, provider])
  @@index([userId])
}

model ZoteroSyncLog {
  id            String            @id @default(cuid())
  connectionId  String
  connection    ZoteroConnection  @relation(fields: [connectionId], references: [id], onDelete: Cascade)
  projectId     String?
  project       Project?          @relation(fields: [projectId], references: [id], onDelete: SetNull)
  targetBibPath String?
  syncType      ZoteroSyncType
  status        ZoteroSyncStatus
  itemsSynced   Int               @default(0)
  itemsAdded    Int               @default(0)
  itemsUpdated  Int               @default(0)
  itemsSkipped  Int               @default(0)
  errorCode     String?
  errorMessage  String?
  startedAt     DateTime          @default(now())
  finishedAt    DateTime?

  @@index([connectionId, startedAt])
  @@index([projectId, startedAt])
  @@index([status])
}

/// Audit từng entry OpenAlex được import vào file .bib của project.
/// Dùng cho dedupe (frontend disable nút "Lưu vào .bib" nếu đã import).
model OpenAlexImportLog {
  id            String                @id @default(cuid())
  userId        String
  user          User                  @relation(fields: [userId], references: [id], onDelete: Cascade)
  projectId     String
  project       Project               @relation(fields: [projectId], references: [id], onDelete: Cascade)
  openAlexId    String
  citationKey   String
  targetBibPath String
  doi           String?
  title         String?
  year          Int?
  status        OpenAlexImportStatus
  errorMessage  String?
  importedAt    DateTime              @default(now())

  @@index([projectId, importedAt])
  @@index([userId, importedAt])
  @@index([openAlexId])
  @@index([projectId, openAlexId])
}

/**
 * =========================
 * Project
 * =========================
 */
model Project {
  id           String           @id @default(cuid())
  title        String
  category     TemplateCategory @default(other)
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt
  ownerId      String?
  owner        User?            @relation("ProjectOwner", fields: [ownerId], references: [id], onDelete: SetNull)
  lastEditedAt DateTime?
  
  // Template relationship
  templateId        String?
  template          Template?        @relation("ProjectTemplate", fields: [templateId], references: [id], onDelete: SetNull)
  templateVersionId String?
  templateVersion   TemplateVersion? @relation(fields: [templateVersionId], references: [id], onDelete: SetNull)
  // Templates that use this project as their editable source (authoring copy)
  templateSources   Template[]       @relation("TemplateSourceProject")

  settings     ProjectSettings?
  members      ProjectMember[]
  shareLinks   ProjectShareLink[]
  advisors     ProjectAdvisor[]
  files        File[]
  compileJobs  CompileJob[]
  compileArtifacts CompileArtifact[]
  snapshots    ProjectSnapshot[]
  wordCountSnapshots ProjectWordCountSnapshot[]
  zoteroSyncLogs      ZoteroSyncLog[]
  openAlexImportLogs  OpenAlexImportLog[]

  @@index([ownerId])
  @@index([templateId])
  @@index([templateVersionId])
  @@index([category])
  @@index([updatedAt])
  @@index([createdAt])
}

/**
 * =========================
 * Project Settings
 * =========================
 */
model ProjectSettings {
  projectId      String   @id
  project        Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  mainPath       String   @default("main.typ")
  compileOptions Json?
  zoteroConfig   Json?
  openalexConfig Json?
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt
}

/**
 * =========================
 * Project Membership
 * =========================
 */
model ProjectMember {
  id        String      @id @default(cuid())
  projectId String
  userId    String
  role      ProjectRole @default(viewer)
  project   Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt DateTime    @default(now())

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
}

/**
 * =========================
 * Share link
 * =========================
 */
model ProjectShareLink {
  id          String      @id @default(cuid())
  projectId   String
  project     Project     @relation(fields: [projectId], references: [id], onDelete: Cascade)
  token       String      @unique
  role        ProjectRole @default(viewer)
  expiresAt   DateTime?
  maxUses     Int?
  usedCount   Int         @default(0)
  createdById String?
  createdBy   User?       @relation(fields: [createdById], references: [id], onDelete: SetNull)
  createdAt   DateTime    @default(now())

  @@index([projectId])
  @@index([expiresAt])
}

/**
 * =========================
 * Teacher advising
 * =========================
 */
model ProjectAdvisor {
  id        String   @id @default(cuid())
  projectId String
  teacherId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  teacher   Teacher  @relation("advisorAssignments", fields: [teacherId], references: [id], onDelete: Cascade)
  isPrimary Boolean  @default(false)
  createdAt DateTime @default(now())

  @@unique([projectId, teacherId])
  @@index([teacherId])
  @@index([projectId])
}

/**
 * =========================
 * Files
 * =========================
 */
model File {
  id           String   @id @default(cuid())
  projectId    String
  project      Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  path         String
  kind         FileKind @default(other)
  // preserve old DB column "content"
  textContent  String?  @map("content") @db.Text
  storageKey   String?
  mimeType     String?
  sizeBytes    Int?
  sha256       String?
  lastEditedAt DateTime?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  @@unique([projectId, path])
  @@index([projectId])
}

/**
 * =========================
 * Compile Jobs
 * =========================
 */
model CompileJob {
  id              String         @id @default(cuid())
  projectId       String
  project         Project        @relation(fields: [projectId], references: [id], onDelete: Cascade)
  entryPath       String
  status          CompileStatus  @default(queued)
  mode            CompileMode    @default(export)
  engine          CompileEngine  @default(node)
  inputHash       String?        // legacy - keep to avoid data loss
  artifactPath    String?
  diagnostics     Json?
  attempt         Int            @default(0)
  priority        Int            @default(0)
  requestedById   String?
  requestedBy     User?          @relation("CompileJobRequestedBy", fields: [requestedById], references: [id], onDelete: SetNull)
  
  // job -> 0..1 latest artifact (1-1 optional)
  latestArtifactId String?       @unique
  latestArtifact   CompileArtifact? @relation("LatestArtifact", fields: [latestArtifactId], references: [id], onDelete: SetNull)

  createdAt       DateTime       @default(now())
  updatedAt       DateTime       @updatedAt
  startedAt       DateTime?
  finishedAt      DateTime?

  // job -> many artifacts (produced by job)
  artifacts       CompileArtifact[] @relation("JobArtifacts")

  @@index([projectId])
  @@index([status])
  @@index([projectId, createdAt]) // queue optimization
  @@index([status, priority, createdAt])
}

/**
 * =========================
 * Compile Artifacts
 * =========================
 */
model CompileArtifact {
  id        String   @id @default(cuid())
  projectId String
  jobId     String?
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  
  // produced-by relation (opposite of CompileJob.artifacts)
  job       CompileJob? @relation("JobArtifacts", fields: [jobId], references: [id], onDelete: SetNull)
  
  // opposite of CompileJob.latestArtifact (0..1)
  latestOfJob CompileJob? @relation("LatestArtifact")

  format      String   @default("pdf")
  storageKey  String
  sizeBytes   Int?
  sha256      String?
  createdAt   DateTime @default(now())

  @@index([projectId, createdAt])
  @@index([jobId])
}

/**
 * =========================
 * Collaboration snapshots (MVP)
 * =========================
 */
model ProjectSnapshot {
  id        String   @id @default(cuid())
  projectId String
  project   Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  state     Bytes
  revision  String?
  createdAt DateTime @default(now())

  @@index([projectId, createdAt])
}

/**
 * =========================
 * Analytics: word count growth
 * =========================
 */
model ProjectWordCountSnapshot {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  wordCount  Int
  charCount  Int?
  fileCount  Int?
  computedAt DateTime @default(now())

  @@index([projectId, computedAt])
}

/**
 * =========================
 * Quota
 * =========================
 */
model UserQuota {
  userId    String   @id
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  limitBytes BigInt   @default(2147483648)
  usedBytes  BigInt   @default(0)
  updatedAt DateTime @updatedAt
}

/**
 * =========================
 * JWT blacklist
 * =========================
 */
model InvalidToken {
  jti       String   @id
  userId    String?
  user      User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  expiresAt DateTime
  createdAt DateTime @default(now())

  @@index([expiresAt])
  @@index([userId])
}

/**
 * =========================
 * Refresh tokens (rotating)
 * =========================
 * Only the SHA-256 hash of the opaque refresh token is stored. Each successful
 * refresh rotates the token (old row gets `revokedAt` + `replacedBy`). Reuse of
 * a revoked token is treated as theft and burns the whole `familyId`.
 */
model RefreshToken {
  id         String    @id @default(cuid())
  userId     String
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  tokenHash  String    @unique
  familyId   String
  expiresAt  DateTime
  revokedAt  DateTime?
  replacedBy String?
  createdAt  DateTime  @default(now())
  userAgent  String?
  ip         String?

  @@index([userId])
  @@index([expiresAt])
  @@index([familyId])
}
```
<!-- END AUTO-GENERATED: prisma-schema -->
