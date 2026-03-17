import { ChevronUp, Clapperboard, Lock } from "lucide-react";
import { motion } from "motion/react";

export function AdminBootstrapHint() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className="fixed left-1/2 top-[72px] z-50 -translate-x-1/2"
      style={{ pointerEvents: "none" }}
    >
      {/* Outer glow container */}
      <div
        className="relative flex flex-col items-center"
        style={{
          filter: "drop-shadow(0 0 24px oklch(0.55 0.22 25 / 0.7))",
        }}
      >
        {/* Bouncing arrow pointing UP toward logo */}
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{
            duration: 1.1,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="mb-1 flex flex-col items-center"
        >
          <ChevronUp
            size={44}
            strokeWidth={2.5}
            className="text-cinema-red drop-shadow-[0_0_8px_oklch(0.55_0.22_25)]"
          />
          <ChevronUp
            size={28}
            strokeWidth={2}
            className="-mt-5 text-cinema-red/50"
          />
        </motion.div>

        {/* Callout box */}
        <motion.div
          animate={{
            boxShadow: [
              "0 0 16px 2px oklch(0.55 0.22 25 / 0.35)",
              "0 0 32px 6px oklch(0.55 0.22 25 / 0.65)",
              "0 0 16px 2px oklch(0.55 0.22 25 / 0.35)",
            ],
          }}
          transition={{
            duration: 2,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut",
          }}
          className="relative overflow-hidden rounded-md border border-cinema-red/70 bg-black/90 px-5 py-4 text-center backdrop-blur-sm"
          style={{ minWidth: 280, maxWidth: 360 }}
        >
          {/* Scanline texture overlay */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.04]"
            style={{
              backgroundImage:
                "repeating-linear-gradient(0deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)",
            }}
          />

          {/* Top accent bar */}
          <div className="absolute inset-x-0 top-0 h-[2px] bg-cinema-red" />

          {/* Icon row */}
          <div className="mb-3 flex items-center justify-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded border border-cinema-red/40 bg-cinema-red/10">
              <Clapperboard size={16} className="text-cinema-red" />
            </div>
            <div className="h-px flex-1 bg-cinema-red/20" />
            <div className="flex h-8 w-8 items-center justify-center rounded border border-cinema-red/40 bg-cinema-red/10">
              <Lock size={14} className="text-cinema-red" />
            </div>
          </div>

          {/* Primary message */}
          <p
            className="font-display text-base font-bold leading-snug text-cinema-red"
            style={{ letterSpacing: "0.01em" }}
          >
            Tap the logo <span className="text-white">3 times</span> to become
            Admin
          </p>

          {/* Secondary message */}
          <p className="mt-2 text-xs leading-relaxed text-white/60">
            The logo is your gateway to the Admin Dashboard. Triple-tap it to
            claim ownership of this app.
          </p>

          {/* Tap counter dots */}
          <div className="mt-3 flex items-center justify-center gap-2">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="flex h-6 w-6 items-center justify-center rounded-full border border-cinema-red/50 bg-cinema-red/10 text-[10px] font-bold text-cinema-red"
              >
                {n}
              </div>
            ))}
          </div>

          {/* Bottom accent bar */}
          <div className="absolute inset-x-0 bottom-0 h-[2px] bg-cinema-red/40" />
        </motion.div>
      </div>
    </motion.div>
  );
}
