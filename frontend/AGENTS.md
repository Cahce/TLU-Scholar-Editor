# AGENTS: Figma Make + Frontend Rules for TLU Scholar Editor

This file defines the default agent behavior for this repo when generating or implementing frontend from Figma Make / Figma designs.

## Project-Local "Skills" (VS Code Friendly)

Codex "skills" installed under `~/.codex/skills` may not load in every VS Code setup. This repo vendors the equivalent guidance as playbooks.

Always follow these playbooks first:

1. `guidelines/agent-playbooks/frontend-ui.md`
2. `guidelines/agent-playbooks/shadcn-ui.md`
3. `guidelines/agent-playbooks/figma-workflow.md`
4. `guidelines/agent-playbooks/editor-architecture.md`

Also treat the repo-level Kiro guidance as required when working in this frontend:

1. `../.kiro/steering/README.md`
2. `../.kiro/steering/kiro-workflow.md`
3. `../.kiro/steering/editor-hybrid-architecture.md`
4. `../.kiro/steering/typst-reference-workflow.md`
5. the relevant file under `../.kiro/skills/`

For Typst/editor work, inspect the smallest relevant slice under:

- `references/texlyre`
- `references/typst-online-editor`
- `../backend/references/texlyre`
- `../backend/references/typst-online-editor`

Use those repos for logic and architecture only. Rebuild UI in this project's own design language.

## Product Identity Constraints

- Build a real internal university web app, not a marketing landing page.
- Tone: professional, academic, structured, trustworthy, modern, productivity-focused.
- Primary user groups: students, lecturers, administrators.
- Prefer practical dashboard/application layouts over decorative concept shots.

## Language Rules

- Visible UI content must be Vietnamese by default.
- Keep wording concise, neutral, and product-oriented.
- English is allowed only for common technical terms where natural (`PDF`, `AI`, `API`, `Admin`, `Dashboard`, `Email`, `ID`, `Export`, `Template`, `Preview`, `Tab`).

## Visual and Color Rules

- Primary brand color: `#007bff`.
- Primary scale must align with project guideline (`50` to `900`) and use semantic hierarchy consistently.
- Avoid flashy startup style, gaming style, crypto style, and over-designed dribbble-like visuals.

## Layout and UX Rules

- Prefer desktop-first application structure: sidebar + top bar + main workspace + optional secondary panel.
- Ensure responsive behavior for laptop/tablet/mobile without losing information hierarchy.
- Keep forms, tables, filters, metadata panels, and workflow states realistic and production-like.
- Do not overuse cards; use clear section structure and spacing.

## Tailwind Implementation Rules

- Use Tailwind utility classes directly in markup.
- Prefer utility-first composition and avoid large custom CSS blocks.
- Use semantic HTML and reusable component structure.
- Preferred mappings:
  - Primary action: `bg-blue-600 text-white`
  - Primary hover: `hover:bg-blue-700`
  - Active surface: `bg-blue-50`
  - Active text: `text-blue-700`
  - Accent border: `border-blue-200`
  - Focus ring: `focus:ring-blue-500`
- Exact brand match only when needed: `bg-[#007bff]`, `text-[#007bff]`, `border-[#007bff]`.

## Figma Workflow Rules

When implementing from Figma URL/node:

1. Parse `fileKey` and `nodeId`.
2. Fetch design context first.
3. Capture screenshot reference.
4. Reuse project components and patterns.
5. Match spacing/typography/colors/states with design and project guideline.

When creating with Figma Make (prompt-to-design):

1. Generate screen direction with academic dashboard style.
2. Keep UI copy Vietnamese and workflow-oriented.
3. Keep components implementation-friendly for React + Tailwind.
4. Validate realism: tables/forms/filters/statuses must look operable.

## Quality Gate Before Done

- Vietnamese UI content is consistent.
- Brand color and semantic states are consistent.
- Accessibility basics are covered (`focus`, contrast, keyboard-friendly controls).
- Layout works on desktop and mobile.
- No decorative-only sections that do not support real workflows.
