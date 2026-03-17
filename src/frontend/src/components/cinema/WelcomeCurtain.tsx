import { Clapperboard } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "cinerooms_welcome_seen_at";
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function shouldShowAnimation(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return true;
    const seenAt = Number.parseInt(raw, 10);
    return Date.now() - seenAt > TTL_MS;
  } catch {
    return true;
  }
}

function markSeen(): void {
  try {
    localStorage.setItem(STORAGE_KEY, Date.now().toString());
  } catch {
    // ignore storage errors
  }
}

export function WelcomeCurtain({ forceShow = false }: { forceShow?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [curtainsOpen, setCurtainsOpen] = useState(false);
  const [logoVisible, setLogoVisible] = useState(false);

  useEffect(() => {
    const should = forceShow || shouldShowAnimation();
    if (!should) return;
    if (forceShow) {
      // Clear the localStorage flag so it shows fresh on canister reset
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
    }
    markSeen();
    setVisible(true);
  }, [forceShow]);

  useEffect(() => {
    if (!visible) return;

    // Slight delay before curtains start opening
    const t1 = setTimeout(() => setCurtainsOpen(true), 300);
    // Logo fades in as curtains open
    const t2 = setTimeout(() => setLogoVisible(true), 700);
    // Logo starts fading out
    const t3 = setTimeout(() => setLogoVisible(false), 2000);
    // Dismiss overlay
    const t4 = setTimeout(() => setVisible(false), 3000);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  }, [visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="welcome-curtain"
          className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden bg-black"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Left curtain panel */}
          <motion.div
            className="absolute inset-y-0 left-0 w-1/2"
            style={{
              background:
                "linear-gradient(to right, #0a0a0a 60%, #1a0a0a 100%)",
              borderRight: "2px solid rgba(180,20,20,0.3)",
            }}
            initial={{ x: 0 }}
            animate={{ x: curtainsOpen ? "-100%" : 0 }}
            transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
          >
            {/* Curtain fold lines */}
            {[15, 35, 55, 75].map((pct) => (
              <div
                key={pct}
                className="absolute inset-y-0 w-px bg-white/5"
                style={{ left: `${pct}%` }}
              />
            ))}
          </motion.div>

          {/* Right curtain panel */}
          <motion.div
            className="absolute inset-y-0 right-0 w-1/2"
            style={{
              background: "linear-gradient(to left, #0a0a0a 60%, #1a0a0a 100%)",
              borderLeft: "2px solid rgba(180,20,20,0.3)",
            }}
            initial={{ x: 0 }}
            animate={{ x: curtainsOpen ? "100%" : 0 }}
            transition={{ duration: 1.1, ease: [0.76, 0, 0.24, 1] }}
          >
            {[25, 45, 65, 85].map((pct) => (
              <div
                key={pct}
                className="absolute inset-y-0 w-px bg-white/5"
                style={{ left: `${pct}%` }}
              />
            ))}
          </motion.div>

          {/* Logo + name revealed in center */}
          <AnimatePresence>
            {logoVisible && (
              <motion.div
                key="logo"
                className="relative z-10 flex flex-col items-center gap-3 select-none"
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.04 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cinema-red/40 bg-cinema-red/10">
                  <Clapperboard size={32} className="text-cinema-red" />
                </div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  Cine<span className="text-cinema-red">Rooms</span>
                </h1>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
