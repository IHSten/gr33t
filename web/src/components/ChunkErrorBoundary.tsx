import { Component, type ReactNode } from "react";

// When we deploy, old code-split chunk hashes disappear. A user with the app
// already open who then navigates to a lazily-loaded route (dashboard/editor)
// or opens the QR modal requests a hash that now 404s, and React.lazy throws.
// A full reload fetches fresh HTML with valid hashes and recovers.
//
// The reload is guarded to once per tab session (sessionStorage survives the
// reload, resets on tab close) so a genuinely broken deploy can't loop.

const RELOAD_FLAG = "gr33t-chunk-reloaded";

function isChunkLoadError(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return /dynamically imported module|importing a module script failed|failed to fetch|loading chunk/i.test(
    msg
  );
}

type Props = { children: ReactNode; fallback: ReactNode };
type State = { failed: boolean };

export class ChunkErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: unknown): void {
    try {
      const alreadyReloaded = sessionStorage.getItem(RELOAD_FLAG) === "1";
      if (isChunkLoadError(error) && !alreadyReloaded) {
        sessionStorage.setItem(RELOAD_FLAG, "1");
        window.location.reload();
      }
    } catch {
      // sessionStorage unavailable (privacy mode); fall through to the fallback.
    }
  }

  render(): ReactNode {
    if (this.state.failed) return this.props.fallback;
    return this.props.children;
  }
}
