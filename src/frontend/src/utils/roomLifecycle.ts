/**
 * Global Room Lifecycle Manager
 *
 * Tracks cleanup functions registered by room pages and ensures they're all
 * called when navigating away from a room — including via the browser back button.
 *
 * CHANGED: runRoomCleanup() now calls window.forceClearPaywall?.() — the new robust embed cleanup —
 * inside a try/catch so errors are silently ignored and never disrupt navigation away from a room.
 */

// NEW: Extend Window to declare the cleanup functions exposed by the room embed script
declare global {
  interface Window {
    tryClearEmbedOverlay?: () => void;
    forceClearPaywall?: () => void; // <-- stronger cleanup added to the embed script
    __ic_paywall_timers?: Record<
      string,
      {
        timeout?: ReturnType<typeof setTimeout>;
        interval?: ReturnType<typeof setInterval>;
      }
    >;
  }
}

type CleanupFn = () => void;

const cleanupRegistry: CleanupFn[] = [];
let listenerAttached = false;

/**
 * Register a cleanup function to be called when leaving a room.
 * Call this from within a room page/component on mount.
 */
export function registerRoomCleanup(fn: CleanupFn): void {
  cleanupRegistry.push(fn);
}

/**
 * Call all registered cleanup functions in reverse order, then clear the registry.
 * Safe to call multiple times — subsequent calls are no-ops if registry is empty.
 */
export function runRoomCleanup(): void {
  // Call registered cleanups (video pause etc.)
  for (let i = cleanupRegistry.length - 1; i >= 0; i--) {
    try {
      cleanupRegistry[i]();
    } catch (err) {
      console.warn("[RoomLifecycle] Cleanup fn threw:", err);
    }
  }
  cleanupRegistry.length = 0;

  // Aggressive embed cleanup (removes any stray script tags + calls the robust forceClear)
  try {
    for (const s of Array.from(
      document.querySelectorAll(
        'script[data-paywall], script[src*="paywall.js"]',
      ),
    ))
      s.remove();
    (window as any).__ic_paywall_instances = {};
    window.forceClearPaywall?.();
    (window as any).exitFullscreenAndPauseMedia?.();
    if (window.__ic_paywall_timers) {
      for (const t of Object.values(window.__ic_paywall_timers)) {
        if (t.timeout) clearTimeout(t.timeout);
        if (t.interval) clearInterval(t.interval);
      }
      window.__ic_paywall_timers = {};
    }
  } catch (err) {
    console.warn("[RoomLifecycle] Embed cleanup failed (safe):", err);
  }
}

/**
 * Returns true if the given URL path belongs to a room page.
 */
function isRoomPath(pathname: string): boolean {
  return pathname.includes("/room/");
}

/**
 * Attaches a single set of global hashchange + popstate listeners that fire
 * runRoomCleanup() when navigating away from any /room/* path.
 *
 * Call once at app startup (e.g. in App.tsx useEffect with [] deps).
 */
export function setupRoomLifecycleListener(): void {
  if (listenerAttached) return;
  listenerAttached = true;

  const handleNavigation = () => {
    const pathname = window.location.pathname + window.location.hash;
    if (!isRoomPath(pathname)) {
      runRoomCleanup();
    }
  };

  window.addEventListener("hashchange", handleNavigation);
  window.addEventListener("popstate", handleNavigation);
}
