import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorStore } from "../state/editorStore";
import { useAutosave } from "../hooks/useAutosave";
import { SaveIndicator } from "./SaveIndicator";
import { lintTheme } from "./lintTheme";
import { latexismsToCmDiagnostics } from "../lint/typstLatexisms";
import CodeMirror from "@uiw/react-codemirror";
import { typst } from "codemirror-lang-typst";
import { StateEffect, StateField } from "@codemirror/state";
import {
  Decoration,
  EditorView,
  keymap,
  type DecorationSet,
} from "@codemirror/view";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import {
  lintGutter,
  linter,
  setDiagnostics as setCmDiagnostics,
} from "@codemirror/lint";
import {
  remapDiagnosticsThroughChanges,
  toCmDiagnostics,
} from "../services/diagnosticMap";
import {
  SearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
  search,
} from "@codemirror/search";
import { setVisualMode, visualExtension } from "../extensions/visual/visual";
import { tableContextNotifier } from "../extensions/visual/table-context";
import { pasteExtension } from "../extensions/paste/PasteExtension";
import "../extensions/visual/register-extensions";
import { setVimMode, vimExtension } from "../extensions/vim/vim";
import {
  mathliveExtension,
  setMathliveEnabled,
} from "../extensions/mathlive/MathLiveExtension";
import { typstAutocompleteExtension } from "../autocomplete/TypstAutocompleteExtension";
import { typstAppHighlight } from "../extensions/typstAppHighlight";
import { typstHoverExtension } from "../autocomplete/HoverExtension";
import { typstSignatureHelpExtension } from "../autocomplete/SignatureHelpExtension";
import {
  getMathliveEnabled,
  getVimMode,
  subscribeSettings,
} from "../state/previewSettings";
import { format as typstyleFormat } from "../services/TypstyleService";
import { toast } from "sonner";
import { wrapSelection } from "../utils/cmInsert";

const outlineHighlightEffect = StateEffect.define<number | null>();

const outlineHighlightField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(highlight, transaction) {
    highlight = highlight.map(transaction.changes);

    for (const effect of transaction.effects) {
      if (!effect.is(outlineHighlightEffect)) {
        continue;
      }

      if (effect.value == null) {
        return Decoration.none;
      }

      const safeLine = Math.max(
        1,
        Math.min(effect.value, transaction.state.doc.lines),
      );
      const line = transaction.state.doc.line(safeLine);

      return Decoration.set([
        Decoration.line({ class: "cm-outline-highlight-line" }).range(line.from),
      ]);
    }

    return highlight;
  },
  provide: (field) => EditorView.decorations.from(field),
});

const outlineHighlightTheme = EditorView.theme({
  ".cm-outline-highlight-line": {
    backgroundColor: "#e8f6ff",
    boxShadow: "inset 3px 0 0 #38bdf8",
    position: "relative",
  },
  ".cm-outline-highlight-line::before": {
    content: '""',
    position: "absolute",
    left: "-28px",
    top: "50%",
    width: "24px",
    height: "24px",
    borderRadius: "9999px",
    border: "1px solid #38bdf8",
    backgroundColor: "rgba(56, 189, 248, 0.14)",
    transform: "translateY(-50%)",
    pointerEvents: "none",
  },
});

export function EditorPane(): JSX.Element {
  const activePath = useEditorStore((s) => s.activePath);
  const draft = useEditorStore((s) => (activePath ? s.drafts[activePath] : null));
  const loading = useEditorStore((s) => s.loading);
  const readOnly = useEditorStore((s) => s.readOnly);
  const setContent = useEditorStore((s) => s.setContent);
  const saveDraftNow = useEditorStore((s) => s.saveDraftNow);
  const editorFontSize = useEditorStore((s) => s.editorFontSize);
  const setEditorView = useEditorStore((s) => s.setEditorView);
  const setActiveOutlineLine = useEditorStore((s) => s.setActiveOutlineLine);
  const visualMode = useEditorStore((s) =>
    activePath ? s.visualModeByPath[activePath] ?? "code" : "code",
  );
  const viewRef = useRef<EditorView | null>(null);
  // Reverse-sync / cross-file jump support: a requested jump is stashed until
  // the mounted view is actually showing the requested file (it may need to
  // load + remount first), so the selection never lands on the previous doc.
  const pendingJumpRef = useRef<{ file?: string; line: number; column: number } | null>(null);
  // Path whose content the currently-mounted CodeMirror view is showing.
  const viewFileRef = useRef<string | null>(null);
  // Read-only projects render Visual mode too — a viewer should see the same
  // widget layer as an editor. Mutation stays blocked: EditorState.readOnly is
  // set, widgets hide their edit affordances and the visual keymap no-ops when
  // that facet is on.
  const initialVisualEnabledRef = useRef(visualMode === "visual");
  // Vim mode is a per-user preference (localStorage), not part of the
  // editor store. We snapshot the initial value for the extensions array and
  // then keep a local state that updates via subscribeSettings, mirroring the
  // pattern used in `OutlinePanel`/`EditorSettingsPanel`.
  const initialVimEnabledRef = useRef(getVimMode());
  const [vimMode, setLocalVimMode] = useState<boolean>(initialVimEnabledRef.current);
  // MathLive: same pref pattern as Vim mode.
  const initialMathliveEnabledRef = useRef(getMathliveEnabled());
  const [mathliveOn, setLocalMathliveOn] = useState<boolean>(
    initialMathliveEnabledRef.current,
  );

  const editorFontTheme = useMemo(
    () =>
      EditorView.theme({
        "&": {
          fontSize: `${editorFontSize}px`,
        },
        ".cm-content": {
          fontSize: `${editorFontSize}px`,
          lineHeight: "1.55",
        },
        ".cm-gutters": {
          fontSize: `${Math.max(editorFontSize - 1, 11)}px`,
        },
      }),
    [editorFontSize],
  );

  // Scroll-spy: track the document line that should drive outline highlight.
  // Prefer the cursor line when it's visible in the viewport (user is reading
  // / editing around the cursor); otherwise fall back to the topmost line of
  // the viewport. Debounced to ~100ms to avoid render churn during fast scroll.
  const outlineSpyExtension = useMemo(() => {
    let timer: number | null = null;
    let lastLine = -1;
    // Accumulated across the debounce window: did any update in it actually
    // EDIT the document? Lets `editor:cursorChanged` carry a typing/selection
    // cause so follow-typing preview scroll reacts to keystrokes only
    // (spec typing-latency-and-follow-preview FT-4).
    let sawDocChange = false;
    return EditorView.updateListener.of((update) => {
      if (
        !update.docChanged &&
        !update.viewportChanged &&
        !update.selectionSet &&
        !update.geometryChanged
      ) {
        return;
      }
      if (update.docChanged) sawDocChange = true;
      const view = update.view;
      const doc = update.state.doc;
      const topLine = doc.lineAt(view.viewport.from).number;
      const bottomLine = doc.lineAt(view.viewport.to).number;
      const cursorLine = doc.lineAt(update.state.selection.main.head).number;
      const active =
        cursorLine >= topLine && cursorLine <= bottomLine ? cursorLine : topLine;
      // Same-line scroll/selection churn stays cheap (no re-dispatch), but
      // typing on the SAME line must still fire — that's the common case the
      // follow-typing scroll listens for.
      if (active === lastLine && !update.docChanged) return;
      lastLine = active;
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        timer = null;
        const cause = sawDocChange ? 'typing' : 'selection';
        sawDocChange = false;
        setActiveOutlineLine(active);
        // Phase 4 forward sync: notify subscribers of the active line.
        // Co-located with outline-spy so we share one debounce timer.
        // `file` lets the sync map resolve the heading in the file the
        // cursor is ACTUALLY in — source lines are per-file, so without it
        // multi-file projects matched headings in unrelated chapters.
        window.dispatchEvent(
          new CustomEvent('editor:cursorChanged', {
            detail: {
              line: active,
              cause,
              file: useEditorStore.getState().activePath ?? undefined,
            },
          }),
        );
      }, 100);
    });
  }, [setActiveOutlineLine]);

  // Keep diagnostic positions in sync with edits between compile passes.
  // The Typst WASM compiler runs debounced (~750ms after the user stops
  // typing) so without this, the IssuesPanel + inline squiggles report
  // stale line/column numbers in the meantime — e.g. user adds a blank
  // line above an error and the panel still says "line 105" until next
  // compile finishes. Maps each diagnostic's range through the same
  // ChangeSet CodeMirror itself uses, so positions track exactly the way
  // lint markers do. No deps because the listener reads the latest store
  // state on every fire via `getState()`.
  const diagnosticRemapExtension = useMemo(() => {
    return EditorView.updateListener.of((update) => {
      if (!update.docChanged) return;
      const { diagnostics, activePath, setDiagnostics } =
        useEditorStore.getState();
      if (diagnostics.length === 0) return;
      const remapped = remapDiagnosticsThroughChanges(
        diagnostics,
        activePath,
        update.startState,
        update.changes,
        update.state,
      );
      if (remapped !== diagnostics) {
        setDiagnostics(remapped);
      }
    });
  }, []);

  // Stable CodeMirror prop identities. `@uiw/react-codemirror`'s
  // useCodeMirror hook reconfigures the view whenever the `extensions` or
  // `onChange` prop reference changes (see its useEffect on
  // [theme, extensions, ..., onChange, onUpdate]). Inlining a fresh array
  // literal + arrow function every render dispatched StateEffect.reconfigure
  // on every keystroke + save-state update, adding render churn and making
  // the value-sync interaction harder to reason about. Memoising both pins
  // the identity so reconfigure only fires when something the editor
  // genuinely depends on changes.
  //
  // Refs (`initialVimEnabledRef`, `initialMathliveEnabledRef`,
  // `initialVisualEnabledRef`) intentionally stay out of the deps: they are
  // snapshots taken at mount, and runtime toggles for vim / mathlive /
  // visual mode go through compartments (`setVimMode`, `setMathliveEnabled`,
  // `setVisualMode`) instead of recreating the extension.
  const cmExtensions = useMemo(
    () => [
      vimExtension(initialVimEnabledRef.current),
      mathliveExtension(initialMathliveEnabledRef.current),
      typst(),
      typstAppHighlight,
      typstAutocompleteExtension(),
      typstHoverExtension(),
      typstSignatureHelpExtension(),
      editorFontTheme,
      EditorView.lineWrapping,
      history(),
      keymap.of([...defaultKeymap, ...historyKeymap]),
      EditorView.theme({
        "&": { height: "100%" },
        ".cm-scroller": { overflow: "auto" },
      }),
      linter(
        (view) => {
          const state = useEditorStore.getState();
          const compileDiags = toCmDiagnostics(
            view.state,
            state.diagnostics,
            state.activePath ?? "",
          );
          // LaTeX-ism warnings (e.g. `^{2}` → `^(2)`) shown inline as hover
          // tooltips, never as injected comments. Typst files only; recomputed
          // from the live doc so they appear/clear as the user types.
          const isTypst = state.activePath
            ? state.files[state.activePath]?.kind === "typst"
            : false;
          const latexDiags = isTypst
            ? latexismsToCmDiagnostics(view.state.doc.toString())
            : [];
          return [...compileDiags, ...latexDiags];
        },
        { delay: 0 },
      ),
      lintGutter(),
      lintTheme,
      outlineHighlightField,
      outlineHighlightTheme,
      outlineSpyExtension,
      diagnosticRemapExtension,
      search({ top: false }),
      visualExtension(initialVisualEnabledRef.current),
      tableContextNotifier(),
      pasteExtension(),
    ],
    [editorFontTheme, outlineSpyExtension, diagnosticRemapExtension],
  );

  const handleEditorChange = useCallback(
    (value: string) => {
      if (activePath) {
        setContent(activePath, value);
      }
    },
    [activePath, setContent],
  );

  // Clear outline highlight when the active file changes — the new file may
  // have completely different headings.
  useEffect(() => {
    setActiveOutlineLine(null);
  }, [activePath, setActiveOutlineLine]);

  // Wire autosave.
  useAutosave(activePath);

  // Push-based diagnostic dispatch (`useEditorLinter`) used to race with the
  // CodeMirror view's lint state field on F5 — `setDiagnostics(state, …)`
  // dispatched before the gutter's internal field finished initialising was
  // silently dropped, so the gutter stayed empty until the user clicked.
  // We now follow the canonical CodeMirror pattern: register a `linter()`
  // SOURCE that reads from the Zustand store, and call `forceLinting(view)`
  // when the store's `diagnostics` array changes. CodeMirror guarantees the
  // source runs after the view is mounted, eliminating the race.
  useEffect(() => {
    return useEditorStore.subscribe((state, prev) => {
      if (state.diagnostics === prev.diagnostics) return;
      const view = viewRef.current;
      if (!view) return;
      // Dispatch lint state directly instead of going through `forceLinting`.
      // `forceLinting` short-circuits via `plugin.force()`'s `if (this.set)`
      // guard — `set` is reset to `false` after every run and only goes
      // back to `true` on `docChanged`. Effect: when the Typst compile
      // finishes 750ms after the user stopped typing and clears
      // `store.diagnostics`, the lint plugin has already settled (`set`
      // is false), so `force()` is a no-op and the gutter keeps showing
      // markers for errors that no longer exist. Pushing the diagnostics
      // through `setDiagnostics` overwrites the lint state unconditionally
      // — the same transaction the plugin would dispatch internally on
      // re-run, but routed past the gating flag.
      const isTypst = state.activePath
        ? state.files[state.activePath]?.kind === "typst"
        : false;
      const latexDiags = isTypst
        ? latexismsToCmDiagnostics(view.state.doc.toString())
        : [];
      const cmDiags = [
        ...toCmDiagnostics(view.state, state.diagnostics, state.activePath ?? ""),
        ...latexDiags,
      ];
      view.dispatch(setCmDiagnostics(view.state, cmDiags));
    });
  }, []);

  // Reconfigure the visual extension compartment when the mode for the active
  // file changes. Initial mount uses `initialVisualEnabledRef`; this effect
  // syncs subsequent toggles.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    setVisualMode(view, visualMode === "visual");
  }, [visualMode, activePath]);

  // Sync the local vimMode + mathlive state with the global preference (which
  // may change from the settings panel or another tab). Cleanup the listener
  // on unmount.
  useEffect(() => {
    return subscribeSettings(() => {
      setLocalVimMode(getVimMode());
      setLocalMathliveOn(getMathliveEnabled());
    });
  }, []);

  // Apply vim mode toggle to the live CodeMirror view without remount.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    setVimMode(view, vimMode);
  }, [vimMode]);

  // Apply mathlive toggle to the live CodeMirror view without remount.
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    setMathliveEnabled(view, mathliveOn);
  }, [mathliveOn]);

  // Jump-to-line (IssuesPanel / OutlinePanel / Search / reverse-sync clicks).
  //
  // A jump may target a file that isn't active yet: `setActivePath` loads it
  // asynchronously and CodeMirror briefly unmounts (loading state) before
  // remounting with the new content. Applying the selection immediately would
  // land on the PREVIOUS document — the "have to click 2-3 times" symptom. So
  // we stash the request and (re)apply it only once the mounted view is
  // actually showing the requested file (tracked by `viewFileRef`, updated on
  // mount and on every content change). Events without a `file` apply
  // immediately, so legacy same-file callers are unaffected.
  const applyPendingJump = useCallback(() => {
    const view = viewRef.current;
    const pending = pendingJumpRef.current;
    if (!view || !pending) return;
    if (pending.file && pending.file !== viewFileRef.current) return;
    const safeLine = Math.max(1, Math.min(pending.line, view.state.doc.lines));
    const lineInfo = view.state.doc.line(safeLine);
    const pos = lineInfo.from + Math.max(0, pending.column - 1);
    view.dispatch({
      selection: { anchor: pos },
      effects: [
        EditorView.scrollIntoView(pos, { y: "center" }),
        outlineHighlightEffect.of(safeLine),
      ],
    });
    view.focus();
    pendingJumpRef.current = null;
  }, []);

  useEffect(() => {
    function onJump(ev: Event) {
      pendingJumpRef.current = (ev as CustomEvent).detail as {
        file?: string;
        line: number;
        column: number;
      };
      applyPendingJump();
    }
    window.addEventListener("editor:jumpTo", onJump);
    return () => window.removeEventListener("editor:jumpTo", onJump);
  }, [applyPendingJump]);

  // Once the requested file's content is mounted, flush the stashed jump.
  useEffect(() => {
    if (draft?.content == null) return;
    viewFileRef.current = activePath;
    applyPendingJump();
  }, [activePath, draft?.content, applyPendingJump]);

  // Generic insert-at-cursor event used by sidebar tools (e.g. Symbol Draw)
  // to inject Typst commands without prop-drilling the editor view.
  useEffect(() => {
    function onInsertText(ev: Event) {
      const view = viewRef.current;
      if (!view) return;
      const detail = (ev as CustomEvent).detail as { text: string };
      if (!detail?.text) return;
      const pos = view.state.selection.main.head;
      view.dispatch({
        changes: { from: pos, insert: detail.text },
        selection: { anchor: pos + detail.text.length },
      });
      view.focus();
    }

    window.addEventListener("editor:insertText", onInsertText);
    return () => window.removeEventListener("editor:insertText", onInsertText);
  }, []);

  useEffect(() => {
    function onOutlineHover(ev: Event) {
      const view = viewRef.current;
      if (!view) return;

      const detail = (ev as CustomEvent).detail as { line: number | null };
      view.dispatch({
        effects: outlineHighlightEffect.of(detail.line ?? null),
      });
    }

    window.addEventListener("editor:outlineHover", onOutlineHover);
    return () => window.removeEventListener("editor:outlineHover", onOutlineHover);
  }, []);

  // Format the active .typ buffer with typstyle, preserving (clamped) cursor.
  // Extracted so BOTH the Shift+Alt+F keydown handler and the top-bar
  // "Chỉnh sửa → Định dạng tài liệu" menu (via the `editor:format` event)
  // run the exact same logic — one source of truth for formatting.
  const runFormat = useCallback(() => {
    if (readOnly) return;
    const view = viewRef.current;
    if (!view || !activePath || !activePath.endsWith(".typ")) return;
    const source = view.state.doc.toString();
    void typstyleFormat(source)
      .then((formatted) => {
        if (formatted === source) {
          toast.success("Mã đã đúng định dạng");
          return;
        }
        const currentSelection = view.state.selection;
        const newLength = formatted.length;
        const clampedSelection = currentSelection.ranges.map((range) => ({
          anchor: Math.min(range.anchor, newLength),
          head: Math.min(range.head, newLength),
        }));
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: formatted },
          selection: { ranges: clampedSelection },
        });
        toast.success("Đã định dạng tài liệu");
      })
      .catch((err) => {
        const msg = err instanceof Error ? err.message : "Lỗi không xác định";
        toast.error(`Định dạng thất bại: ${msg}`);
      });
  }, [readOnly, activePath]);

  // Top-bar Chỉnh sửa → Định dạng tài liệu dispatches `editor:format`.
  useEffect(() => {
    const onFormat = (): void => runFormat();
    window.addEventListener("editor:format", onFormat);
    return () => window.removeEventListener("editor:format", onFormat);
  }, [runFormat]);

  useEffect(() => {
    function onSaveShortcut(event: KeyboardEvent) {
      // Shift+Alt+F → run typstyle on the active buffer. This shortcut
      // intentionally does NOT require Ctrl/Cmd because that matches VSCode's
      // industry-standard "Format Document" binding.
      if (event.shiftKey && event.altKey && event.key.toLowerCase() === "f") {
        event.preventDefault();
        runFormat();
        return;
      }

      const mod = event.ctrlKey || event.metaKey;
      if (!mod) return;
      const k = event.key.toLowerCase();

      if (k === "s") {
        event.preventDefault();
        if (readOnly) return;
        if (!activePath || !draft?.dirty || draft.saving) return;
        void saveDraftNow(activePath).catch(() => {});
        return;
      }

      // Format shortcuts mirroring Overleaf: Ctrl+B / Ctrl+I / Ctrl+` wrap
      // the current selection with Typst markup. Work in both Code and
      // Visual mode since both modes share the underlying text buffer.
      const view = viewRef.current;
      if (view && !readOnly) {
        if (k === "b" && !event.shiftKey) {
          event.preventDefault();
          wrapSelection(view, "*", "*");
          return;
        }
        if (k === "i" && !event.shiftKey) {
          event.preventDefault();
          wrapSelection(view, "_", "_");
          return;
        }
        if (event.key === "`" && !event.shiftKey) {
          event.preventDefault();
          wrapSelection(view, "`", "`");
          return;
        }
      }

      // Ctrl+F / Ctrl+H → open SearchPanel and focus the corresponding input.
      // Dispatched through `workspace:openSearch` (handled by ProjectWorkspace),
      // which switches sidebar mode + then fires `search:focus` for the panel.
      if (k === "f" || k === "h") {
        event.preventDefault();
        window.dispatchEvent(
          new CustomEvent("workspace:openSearch", {
            detail: { focus: k === "h" ? "replace" : "find" },
          }),
        );
        return;
      }

      // Multi-tab shortcuts. Reading store imperatively (getState) keeps the
      // handler stable across activePath churn.
      const {
        openTabs,
        activePath: ap,
        setActivePath,
        closeTab,
        toggleEditorMode,
        files,
      } = useEditorStore.getState();

      // Ctrl+Shift+V → toggle Code ↔ Visual on the active file. Allowed in
      // read-only too: switching modes is a view preference, not an edit.
      if (event.shiftKey && k === "v") {
        event.preventDefault();
        if (ap && files[ap]?.kind === "typst") toggleEditorMode(ap);
        return;
      }

      // Ctrl+W → close active tab.
      if (k === "w" && !event.shiftKey) {
        event.preventDefault();
        if (ap) void closeTab(ap);
        return;
      }

      // Ctrl+Tab / Ctrl+Shift+Tab → cycle tabs.
      if (event.key === "Tab" && openTabs.length > 1) {
        event.preventDefault();
        const idx = openTabs.indexOf(ap ?? "");
        if (idx === -1) return;
        const nextIdx = event.shiftKey
          ? (idx - 1 + openTabs.length) % openTabs.length
          : (idx + 1) % openTabs.length;
        void setActivePath(openTabs[nextIdx]);
        return;
      }

      // Ctrl+1..9 → jump to tab N.
      if (/^[1-9]$/.test(event.key) && !event.shiftKey) {
        const n = parseInt(event.key, 10) - 1;
        if (openTabs[n]) {
          event.preventDefault();
          void setActivePath(openTabs[n]);
        }
      }
    }

    window.addEventListener("keydown", onSaveShortcut);
    return () => window.removeEventListener("keydown", onSaveShortcut);
  }, [activePath, draft?.dirty, draft?.saving, saveDraftNow, readOnly, runFormat]);

  // Search / Replace commands (triggered by SearchPanel)
  useEffect(() => {
    function onSearchCmd(ev: Event) {
      const view = viewRef.current;
      if (!view) return;
      const detail = (ev as CustomEvent).detail as {
        type: "findNext" | "findPrev" | "replaceNext" | "replaceAll";
        query: string;
        caseSensitive: boolean;
        replacement?: string;
        regex?: boolean;
        wholeWord?: boolean;
      };
      const { type, query, caseSensitive, replacement, regex, wholeWord } = detail;

      if (!query) return;

      // Set (or update) the active search query in the CM state. CodeMirror's
      // SearchQuery supports `regexp` and `wholeWord` flags natively — no
      // custom regex compilation needed for the in-file path.
      const sq = new SearchQuery({
        search: query,
        caseSensitive: !!caseSensitive,
        regexp: !!regex,
        wholeWord: !!wholeWord,
        replace: replacement ?? "",
      });
      view.dispatch({ effects: setSearchQuery.of(sq) });

      // Then execute the requested command
      if (type === "findNext") findNext(view);
      else if (type === "findPrev") findPrevious(view);
      else if (type === "replaceNext") replaceNext(view);
      else if (type === "replaceAll") replaceAll(view);

      view.focus();
    }

    window.addEventListener("editor:searchCmd", onSearchCmd);
    return () => window.removeEventListener("editor:searchCmd", onSearchCmd);
  }, []);

  if (!activePath) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-white">
        <div className="text-center text-slate-500">
          <p className="text-sm">Chưa chọn tệp</p>
          <p className="text-xs mt-1">Chọn một tệp từ cây thư mục</p>
        </div>
      </div>
    );
  }

  if (loading || !draft) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 bg-white">
        <div className="text-center text-slate-500">
          <p className="text-sm">Đang tải tệp {activePath}...</p>
        </div>
      </div>
    );
  }

  return (
    // `min-h-0` is required so this flex item can actually shrink below its
    // content's intrinsic height — without it, the CodeMirror child grows
    // unbounded and the outer page scrolls instead of the editor's internal
    // scrollbar appearing for long files.
    <div className="relative h-full min-h-0 flex flex-col bg-white">
      <SaveIndicator path={activePath} />
      <div className="flex-1 min-h-0 overflow-hidden">
        <CodeMirror
          value={draft.content}
          height="100%"
          editable={!readOnly}
          readOnly={readOnly}
          extensions={cmExtensions}
          onChange={handleEditorChange}
          onCreateEditor={(view) => {
            viewRef.current = view;
            setEditorView(view);
            // This fresh view shows the active file's content — record it and
            // flush any jump that was waiting for this file to mount.
            viewFileRef.current = activePath;
            applyPendingJump();
            // Auto-focus so cursor state (especially Vim's Normal-mode
            // block) is in a known visual state right after F5. Without
            // this users see a hollow block before any interaction and
            // wonder why the cursor "looks weird".
            requestAnimationFrame(() => view.focus());
          }}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            highlightActiveLine: true,
            highlightActiveLineGutter: true,
          }}
          className="h-full"
        />
      </div>
    </div>
  );
}
