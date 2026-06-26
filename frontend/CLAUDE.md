# Frontend context for Claude

This is the **frontend** workspace of the TLU Scholar Editor: a Vite + React + React Router 7 SPA with Tailwind and shadcn-style UI wrappers under `src/app/components/ui`. It is the client of the hybrid Typst editor; integration code lives under `src/app` (`api/`, `hooks/`, `types/`, `editor/`).

This workspace vendors its design/agent guidance under `guidelines/` and has a Codex entry file at `Frontendtluscholareditor/AGENTS.md`. The files below are imported so Claude Code reads the same source of truth as Codex. **Do not duplicate or rewrite the imported files** — edit them in place.

The repo-root `CLAUDE.md` and its `.kiro/steering/*` integration guidance still apply on top of this — especially `api-request-utilities`, `data-fetching-patterns`, `authentication-flow`, `frontend-project-structure`, `react-best-practices`, and `editor-hybrid-architecture`. Backend remains the source of truth for HTTP contracts.

## Always-loaded frontend guidelines

These are the playbooks `Frontendtluscholareditor/AGENTS.md` says to "always follow first", plus the global design system:

@guidelines/Guidelines.md
@guidelines/agent-playbooks/frontend-ui.md
@guidelines/agent-playbooks/shadcn-ui.md
@guidelines/agent-playbooks/figma-workflow.md
@guidelines/agent-playbooks/editor-architecture.md

## On-demand frontend playbooks

- `guidelines/agent-playbooks/typst-editor-reference.md` — reference notes from `typst-online-editor` and `texlyre` for preview/worker/editor work. Read before Typst preview/worker/diagnostics changes.
- `guidelines/agent-playbooks/README.md` — index of the playbooks above.

## Frontend hard rules (distilled from `AGENTS.md` + `Guidelines.md`)

- Visible UI content is **Vietnamese by default**; English only for natural technical terms (PDF, Typst, AI, API, Admin, Dashboard, Email, ID, Export, Template, Preview, Tab). Surrounding text stays Vietnamese.
- Build a real internal university web app (desktop-first: top header + left sidebar + main content + optional right context panel) — not a marketing/landing, startup, gaming, crypto, or dribbble-style layout.
- Primary brand color `#007bff`. Use the documented primary/neutral/semantic palette and Tailwind brand mapping: primary action `bg-blue-600 text-white`, hover `hover:bg-blue-700`, active/selected `bg-blue-50` + `text-blue-700`, accent border `border-blue-200`, focus ring `focus:ring-blue-500`.
- Reuse existing components in `src/app/components/ui/*`; import local wrappers (e.g. `./ui/button`) instead of Radix primitives directly; compose classes with `cn()` from `src/app/components/ui/utils.ts`. Do not add new UI libraries; do not mix MUI and shadcn on the same surface.
- Tailwind utility-first with semantic HTML. Accessibility basics required: visible focus, contrast, keyboard-friendly controls, never color-only meaning, visible loading/empty/error states. Responsive (sidebar collapses to a drawer on small screens).
- Keep integration code under `src/app`; do not call `fetch` directly from JSX event handlers — use API clients / editor services / hooks.
- For Typst/editor work, keep the hybrid model (client fast preview + debounced server saves; backend authoritative for persistence and official compile/export) and use the reference repos for logic/architecture only — never copy their UI, CSS, or branding.
