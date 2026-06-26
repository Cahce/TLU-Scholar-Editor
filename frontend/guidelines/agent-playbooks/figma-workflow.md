# Playbook: Figma Make + Figma-to-Code

## Figma Make (Prompt -> Design)

- Generate screens as internal university app UI, not marketing.
- Keep UI copy Vietnamese by default.
- Prefer dashboard/app layouts: sidebar + topbar + workspace + optional inspector.
- Keep components implementation-friendly for React + Tailwind + local shadcn wrappers.

## Implementing From Figma (Design -> Code)

When you have a Figma URL/node:

1. Identify the exact frame/component and states/variants to implement.
2. Implement using project conventions:
   - Prefer `src/app/components/ui/*` wrappers
   - Prefer semantic tokens (`bg-background`, etc.)
3. Match interaction states: hover/active/focus/disabled.
4. Validate layout/typography/spacing against the reference.

## If Figma MCP Is Not Authenticated

- Do not block the task; implement based on available spec/screenshots and the repo guidelines.
- Note what cannot be verified without Figma context (exact spacing, specific assets).

