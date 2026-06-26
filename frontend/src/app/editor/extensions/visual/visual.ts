import { Compartment, StateEffect, StateField } from "@codemirror/state";
import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

import "./visual-theme.css";

export const visualCompartment = new Compartment();

export const toggleVisualEffect = StateEffect.define<boolean>();

export const visualEnabledField = StateField.define<boolean>({
  create: () => false,
  update(value, tr) {
    for (const e of tr.effects) {
      if (e.is(toggleVisualEffect)) return e.value;
    }
    return value;
  },
});

const visualModeClassPlugin = EditorView.editorAttributes.compute(
  [visualEnabledField],
  (state) => ({
    class: state.field(visualEnabledField) ? "cm-typst-visual-mode" : "",
  }),
);

let visualExtensionsResolver: () => Extension[] = () => [];

export function registerVisualExtensions(resolver: () => Extension[]): void {
  visualExtensionsResolver = resolver;
}

export function visualExtension(initialEnabled: boolean): Extension {
  return [
    visualEnabledField,
    visualModeClassPlugin,
    visualCompartment.of(initialEnabled ? visualExtensionsResolver() : []),
  ];
}

export function setVisualMode(view: EditorView, enabled: boolean): void {
  view.dispatch({
    effects: [
      toggleVisualEffect.of(enabled),
      visualCompartment.reconfigure(enabled ? visualExtensionsResolver() : []),
    ],
  });
}
