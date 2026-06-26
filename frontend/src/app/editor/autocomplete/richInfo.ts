/**
 * Rich-info DOM renderers for autocomplete tooltips.
 *
 * `@codemirror/autocomplete`'s `Completion.info` accepts a function that
 * returns a Node. Each renderer below produces a tinymist/VSCode-style
 * panel:
 *
 *   - Header:  icon + title + optional type pill + optional return pill
 *   - Body:    signature/type block + Vietnamese description + optional
 *              parameter table + optional code example
 *   - Footer:  alias chips (enums only)
 *
 * The shared `buildInfoShell()` helper keeps function, param, and enum
 * tooltips visually consistent — same chrome, same spacing rules, same
 * CSS classes styled in `theme.css`.
 */

import type {
  EnumValue,
  EnumValueObject,
  TypstFunction,
  TypstParam,
} from "./types";

type IconKind = "function" | "property" | "enum";

interface InfoShellOptions {
  iconKind: IconKind;
  title: string;
  pillText?: string;
  pillVariant?: "default" | "required";
  /** Optional return-type label rendered as a separate pill on the right
   * of the header (e.g. "→ content"). Mirrors tinymist's signature
   * rendering: `(args) → ret`. */
  returnLabel?: string;
}

function buildInfoShell(options: InfoShellOptions): {
  root: HTMLElement;
  body: HTMLElement;
} {
  const root = document.createElement("div");
  root.className = "cm-info-rich";

  const header = document.createElement("div");
  header.className = "cm-info-header";

  const icon = document.createElement("span");
  icon.className = `cm-info-icon cm-info-icon-${options.iconKind}`;
  header.appendChild(icon);

  const title = document.createElement("span");
  title.className = "cm-info-title";
  title.textContent = options.title;
  header.appendChild(title);

  if (options.pillText) {
    const pill = document.createElement("span");
    pill.className =
      options.pillVariant === "required"
        ? "cm-info-pill cm-info-pill-required"
        : "cm-info-pill";
    pill.textContent = options.pillText;
    header.appendChild(pill);
  }

  if (options.returnLabel) {
    const ret = document.createElement("span");
    ret.className = "cm-info-return";
    ret.textContent = `→ ${options.returnLabel}`;
    header.appendChild(ret);
  }

  root.appendChild(header);

  const body = document.createElement("div");
  body.className = "cm-info-body";
  root.appendChild(body);

  return { root, body };
}

function appendDescription(body: HTMLElement, text: string | undefined): void {
  if (!text) return;
  const desc = document.createElement("p");
  desc.className = "cm-info-desc";
  desc.textContent = text;
  body.appendChild(desc);
}

function appendCodeBlock(
  body: HTMLElement,
  className: string,
  text: string,
): void {
  const block = document.createElement("code");
  block.className = className;
  block.textContent = text;
  body.appendChild(block);
}

function appendSection(
  body: HTMLElement,
  title: string,
  contentBuilder: (container: HTMLElement) => void,
): void {
  const section = document.createElement("div");
  section.className = "cm-info-section";

  const heading = document.createElement("h4");
  heading.className = "cm-info-section-title";
  heading.textContent = title;
  section.appendChild(heading);

  contentBuilder(section);
  body.appendChild(section);
}

function appendExample(body: HTMLElement, example: string | undefined): void {
  if (!example) return;
  appendSection(body, "Ví dụ", (container) => {
    const pre = document.createElement("pre");
    pre.className = "cm-info-example";
    const code = document.createElement("code");
    code.textContent = example;
    pre.appendChild(code);
    container.appendChild(pre);
  });
}

/** Build a `<table>` of parameters: name / type / required-marker /
 * description. Only renders when there's at least one param. */
function appendParamTable(body: HTMLElement, params: TypstParam[]): void {
  if (params.length === 0) return;

  appendSection(body, "Tham số", (container) => {
    const table = document.createElement("table");
    table.className = "cm-info-params";

    const thead = document.createElement("thead");
    const headRow = document.createElement("tr");
    ["Tên", "Kiểu", "", "Mô tả"].forEach((label) => {
      const th = document.createElement("th");
      th.textContent = label;
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");
    for (const p of params) {
      const row = document.createElement("tr");

      const nameCell = document.createElement("td");
      const nameCode = document.createElement("code");
      nameCode.textContent = p.name;
      nameCell.appendChild(nameCode);
      row.appendChild(nameCell);

      const typeCell = document.createElement("td");
      const typeCode = document.createElement("code");
      typeCode.textContent = p.detail;
      typeCell.appendChild(typeCode);
      row.appendChild(typeCell);

      const reqCell = document.createElement("td");
      reqCell.className = "cm-info-required-cell";
      if (p.required) {
        reqCell.textContent = "*";
        reqCell.title = "Bắt buộc";
        reqCell.classList.add("cm-info-required");
      }
      row.appendChild(reqCell);

      const descCell = document.createElement("td");
      descCell.textContent = p.info;
      row.appendChild(descCell);

      tbody.appendChild(row);
    }
    table.appendChild(tbody);
    container.appendChild(table);
  });
}

/** Compact preview of allowed enum values for a parameter (`style: "ieee"
 * | "apa" | …`). Renders the first few inline as code chips and a
 * "+ N more" suffix when truncated. */
function appendEnumPreview(body: HTMLElement, values: EnumValue[]): void {
  if (values.length === 0) return;

  const previewLimit = 6;
  const normalized = values.map((v) =>
    typeof v === "string" ? v : v.value,
  );
  const shown = normalized.slice(0, previewLimit);
  const remaining = normalized.length - shown.length;

  appendSection(body, "Giá trị cho phép", (container) => {
    const wrap = document.createElement("div");
    wrap.className = "cm-info-enum-preview";
    shown.forEach((value) => {
      const chip = document.createElement("code");
      chip.className = "cm-info-enum-chip";
      chip.textContent = `"${value}"`;
      wrap.appendChild(chip);
    });
    if (remaining > 0) {
      const more = document.createElement("span");
      more.className = "cm-info-enum-more";
      more.textContent = `+ ${remaining} khác`;
      wrap.appendChild(more);
    }
    container.appendChild(wrap);
  });
}

/**
 * Info tooltip for a Typst function.
 *
 * Header: function icon + name + "function" pill + optional return pill.
 * Body:   monospace signature block (from `fn.detail`) + Vietnamese
 *         description + parameter table + optional code example.
 */
export function renderFunctionInfo(fn: TypstFunction): HTMLElement {
  const { root, body } = buildInfoShell({
    iconKind: "function",
    title: fn.name,
    pillText: "function",
    returnLabel: fn.returns,
  });

  if (fn.detail) {
    appendCodeBlock(body, "cm-info-signature", `${fn.name}${fn.detail}`);
  }
  appendDescription(body, fn.info);
  appendParamTable(body, fn.params);
  appendExample(body, fn.example);

  return root;
}

/**
 * Info tooltip for a Typst function parameter.
 *
 * Header: property icon + param name + "required" / "optional" pill.
 * Body:   monospace type block (from `p.detail`) + Vietnamese description
 *         + optional enum-value preview chips.
 */
export function renderParamInfo(p: TypstParam): HTMLElement {
  const { root, body } = buildInfoShell({
    iconKind: "property",
    title: p.name,
    pillText: p.required ? "required" : "optional",
    pillVariant: p.required ? "required" : "default",
  });

  if (p.detail) {
    appendCodeBlock(body, "cm-info-signature", p.detail);
  }
  appendDescription(body, p.info);
  if (p.enumValues) {
    appendEnumPreview(body, p.enumValues);
  }

  return root;
}

/**
 * Info tooltip for a string enum value (e.g. citation style `"ieee"`,
 * paper size `"a4"`).
 *
 * Header: enum icon + display name (or raw value) + "value" pill.
 * Body:   raw technical identifier (when distinct from displayName) +
 *         Vietnamese description + optional code example.
 * Footer: alias chips so the user knows what other strings map to the
 *         same value.
 */
export function renderEnumInfo(ev: EnumValueObject): HTMLElement {
  const { root, body } = buildInfoShell({
    iconKind: "enum",
    title: ev.displayName || ev.value,
    pillText: "value",
  });

  if (ev.displayName && ev.displayName !== ev.value) {
    appendCodeBlock(body, "cm-info-tech", ev.value);
  }
  appendDescription(body, ev.infoVi);
  appendExample(body, ev.example);

  if (ev.aliases && ev.aliases.length > 0) {
    const footer = document.createElement("div");
    footer.className = "cm-info-aliases";

    const label = document.createElement("span");
    label.className = "cm-info-aliases-label";
    label.textContent = "Alias";
    footer.appendChild(label);

    for (const alias of ev.aliases) {
      const chip = document.createElement("span");
      chip.className = "cm-info-chip";
      chip.textContent = alias;
      footer.appendChild(chip);
    }

    root.appendChild(footer);
  }

  return root;
}
