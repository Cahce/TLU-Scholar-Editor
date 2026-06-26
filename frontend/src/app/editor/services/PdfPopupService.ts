// Cross-window communication for the popup PDF previewer.
// Pattern adapted from references/texlyre/src/services/PdfWindowService.ts.

type PopupMessage =
  | { type: 'pdf-update'; pdf: Uint8Array; projectName: string | null; timestamp: number }
  | { type: 'pdf-clear'; timestamp: number }
  | { type: 'window-ready'; timestamp: number }
  | { type: 'window-closed'; timestamp: number };

const CHANNEL_PREFIX = 'tlu-preview-';
const POPUP_FEATURES =
  'width=1000,height=900,scrollbars=yes,resizable=yes,menubar=no,toolbar=no,location=no,status=no';

export class PdfPopupService {
  #projectId: string;
  #channel: BroadcastChannel;
  #popup: Window | null = null;
  #closedPollHandle: number | null = null;
  #listeners = new Set<(message: PopupMessage) => void>();
  // Most recent payload — replayed when a popup signals 'window-ready'.
  #lastPayload: { pdf: Uint8Array; projectName: string | null } | null = null;

  constructor(projectId: string) {
    this.#projectId = projectId;
    this.#channel = new BroadcastChannel(CHANNEL_PREFIX + projectId);

    this.#channel.addEventListener('message', (event) => {
      const message = event.data as PopupMessage;
      // Re-emit the most recent payload as soon as the popup signals it's ready.
      if (message.type === 'window-ready' && this.#lastPayload) {
        this.#send({
          type: 'pdf-update',
          pdf: this.#lastPayload.pdf,
          projectName: this.#lastPayload.projectName,
          timestamp: Date.now(),
        });
      }
      for (const listener of this.#listeners) {
        listener(message);
      }
    });
  }

  open(pdf: Uint8Array | null, projectName: string | null): Window | null {
    const route = `${window.location.origin}/preview-popup/${encodeURIComponent(this.#projectId)}`;
    if (this.#popup && !this.#popup.closed) {
      this.#popup.focus();
    } else {
      this.#popup = window.open(route, `tlu-preview-${this.#projectId}`, POPUP_FEATURES);
      if (!this.#popup) return null;
      this.#startClosedPoll();
    }

    if (pdf) {
      this.#lastPayload = { pdf, projectName };
      this.#send({
        type: 'pdf-update',
        pdf,
        projectName,
        timestamp: Date.now(),
      });
    }

    return this.#popup;
  }

  pushUpdate(pdf: Uint8Array, projectName: string | null): void {
    this.#lastPayload = { pdf, projectName };
    if (!this.isOpen()) return;
    this.#send({
      type: 'pdf-update',
      pdf,
      projectName,
      timestamp: Date.now(),
    });
  }

  close(): void {
    if (this.#popup && !this.#popup.closed) {
      this.#popup.close();
    }
    this.#popup = null;
    this.#stopClosedPoll();
  }

  isOpen(): boolean {
    return !!this.#popup && !this.#popup.closed;
  }

  /** Subscribe to messages from the popup window (notably 'window-closed'). */
  onMessage(listener: (message: PopupMessage) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  dispose(): void {
    this.close();
    this.#listeners.clear();
    this.#channel.close();
    this.#lastPayload = null;
  }

  #send(message: PopupMessage): void {
    this.#channel.postMessage(message);
  }

  #startClosedPoll(): void {
    this.#stopClosedPoll();
    const tick = () => {
      if (!this.#popup || this.#popup.closed) {
        this.#stopClosedPoll();
        this.#popup = null;
        this.#send({ type: 'window-closed', timestamp: Date.now() });
        for (const listener of this.#listeners) {
          listener({ type: 'window-closed', timestamp: Date.now() });
        }
        return;
      }
      this.#closedPollHandle = window.setTimeout(tick, 800);
    };
    this.#closedPollHandle = window.setTimeout(tick, 800);
  }

  #stopClosedPoll(): void {
    if (this.#closedPollHandle !== null) {
      window.clearTimeout(this.#closedPollHandle);
      this.#closedPollHandle = null;
    }
  }
}

export type { PopupMessage };
