// Fullscreen behind a tiny interface. The browser build uses the Fullscreen
// API (needs a user gesture: click or key); a Steam/Electron build can swap
// in window-level fullscreen without touching the UI code.

export interface FullscreenHost {
  isFullscreen(): boolean;
  toggle(): Promise<void>;
  /** Fires after entering or leaving fullscreen (also via Esc / browser UI). */
  onChange(cb: () => void): void;
}

// Safari still exposes the prefixed API only.
interface WebkitElement extends HTMLElement {
  webkitRequestFullscreen?: () => Promise<void> | void;
}
interface WebkitDocument extends Document {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
}

export class BrowserFullscreen implements FullscreenHost {
  constructor(private el: HTMLElement) {}

  isFullscreen(): boolean {
    const d = document as WebkitDocument;
    return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
  }

  async toggle(): Promise<void> {
    const d = document as WebkitDocument;
    const el = this.el as WebkitElement;
    try {
      if (this.isFullscreen()) await (d.exitFullscreen ? d.exitFullscreen() : d.webkitExitFullscreen?.());
      else await (el.requestFullscreen ? el.requestFullscreen() : el.webkitRequestFullscreen?.());
    } catch { /* denied (no gesture, iframe policy): stay as we are */ }
  }

  onChange(cb: () => void): void {
    document.addEventListener('fullscreenchange', cb);
    document.addEventListener('webkitfullscreenchange', cb);
  }
}
