import { useEffect, useState } from "react";

/**
 * Returns true only if a real desktop DevTools panel appears to be open.
 *
 * Mobile devices are excluded entirely: they cannot open DevTools and their
 * browser chrome creates large outerHeight/innerHeight gaps that would trigger
 * false positives on every page load.
 *
 * Detection methods (desktop only):
 * 1. Window size heuristic — side/bottom devtools panel creates a gap > 160 px
 * 2. Timing-based getter probe — devtools calls object property getters when
 *    inspecting objects printed to the console
 */
export function useDevToolsDetection(): { isDevToolsOpen: boolean } {
  const [isDevToolsOpen, setIsDevToolsOpen] = useState(false);

  useEffect(() => {
    // Mobile browsers cannot open DevTools. Detecting via size/timing on mobile
    // produces false positives due to browser chrome (address bar, tab bar, etc.).
    // Skip detection entirely on touch/mobile devices.
    const isMobile =
      /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent,
      ) ||
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0;

    if (isMobile) {
      setIsDevToolsOpen(false);
      return;
    }

    let getterTriggered = false;

    const check = () => {
      // Method 1: window size heuristic (desktop only — mobile excluded above)
      const widthGap = window.outerWidth - window.innerWidth > 160;
      const heightGap = window.outerHeight - window.innerHeight > 160;
      const sizeDetected = widthGap || heightGap;

      // Method 2: devtools calls getters when inspecting objects in console
      getterTriggered = false;
      const probe = Object.defineProperty({}, "__devtools_probe__", {
        get() {
          getterTriggered = true;
          return undefined;
        },
        configurable: true,
      });
      // biome-ignore lint/suspicious/noConsole: intentional devtools probe
      console.log("%c", probe);

      const open = sizeDetected || getterTriggered;
      setIsDevToolsOpen(open);
    };

    // Run immediately and then poll every 500 ms
    check();
    const interval = setInterval(check, 500);

    return () => clearInterval(interval);
  }, []);

  return { isDevToolsOpen };
}
