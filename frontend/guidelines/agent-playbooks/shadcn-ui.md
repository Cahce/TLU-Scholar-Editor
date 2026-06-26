# Playbook: shadcn/ui (Local Wrappers)

## What "shadcn/ui" Means In This Repo

- UI building blocks live in `src/app/components/ui/*` (shadcn-style wrappers around Radix + Tailwind).
- Class composition helper is `cn()` from `src/app/components/ui/utils.ts`.
- Theme tokens are defined via CSS variables in `src/styles/theme.css` and exposed as Tailwind tokens (example: `bg-background`, `text-foreground`).

## Rules

- Prefer local wrappers from `src/app/components/ui/*` for all new UI.
- In feature screens, do not import Radix primitives directly unless there is no wrapper and the wrapper is not worth adding.
- Use semantic tokens with shadcn components whenever possible:
  - Surfaces: `bg-background`, `bg-card`, `bg-muted`
  - Text: `text-foreground`, `text-muted-foreground`
  - Borders: `border-border`
- Use `cn()` for any merged/conditional className.
- Avoid mixing UI libraries in the same surface; prefer shadcn for new work.
- Keep variants minimal:
  - Use `class-variance-authority` only for real, reused variants.
  - Avoid one-off variants; pass classes at call sites instead.

## Adding/Extending Components

1. Check whether a component already exists in `src/app/components/ui/*`.
2. If it exists, reuse it and pass `className`/props to adapt.
3. If it does not exist, add a new wrapper under `src/app/components/ui/` following existing patterns:
   - uses `cn()`
   - uses semantic tokens
   - keeps the API small and predictable

## Quality Gate

- Imports use local wrappers in screens (example: `./ui/button`).
- Focus states are visible and keyboard interactions work.
- UI copy is Vietnamese and workflow-oriented.

