# Playbook: Frontend UI Quality (App Surfaces)

This repo is a productivity app. Prefer "calm, dense, readable" over decorative UI.

## Rules

- Build realistic app screens (tables, forms, filters, status, audit/history) instead of card mosaics.
- Keep hierarchy strong:
  - one primary action per region
  - headings label what the area does
  - copy is short and operational, not marketing
- Prefer layout structure over heavy chrome:
  - sections, columns, dividers, sticky headers
  - cards only when the card is the interaction
- Motion (if used) must be purposeful and restrained; no ornamental animation.
- Accessibility basics are required: focus ring, keyboard, contrast.

## Form validation

- Every `<form onSubmit>` that does its own validation MUST set `noValidate`.
  Otherwise the browser's native HTML5 check (e.g. `type="email"`) fires first
  and shows an **English** bubble, preempting the React validation. Admin modals
  inherit this via `components/admin/AdminFormModal`.
- Source validation messages and reusable field validators from
  `src/app/lib/validation` (`VMSG`, `validateEmail`, `validatePassword`, …)
  instead of re-typing Vietnamese literals per form. Role/domain-aware email
  checks live in `features/admin/_shared/email.ts` (re-exported from the same
  module).
- Error state must convey meaning by both text and color, with `aria-invalid`
  on the invalid control.

