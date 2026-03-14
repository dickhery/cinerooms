import { useNavigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
import { motion } from "motion/react";
import { useEffect } from "react";
import { useDevToolsDetection } from "../hooks/useDevToolsDetection";

export function DevToolsBlockedPage() {
  const { isDevToolsOpen } = useDevToolsDetection();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isDevToolsOpen) {
      void navigate({ to: "/" });
    }
  }, [isDevToolsOpen, navigate]);

  return (
    <main
      data-ocid="devtools_blocked.page"
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="flex max-w-md flex-col items-center gap-6 text-center"
      >
        {/* Icon */}
        <div className="flex h-24 w-24 items-center justify-center rounded-full border border-cinema-red/30 bg-cinema-red/10">
          <ShieldAlert size={44} className="text-cinema-red" />
        </div>

        {/* Heading */}
        <div className="space-y-3">
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">
            Developer Tools Detected
          </h1>
          <p className="text-base leading-relaxed text-muted-foreground">
            Please close your developer console to continue watching.
          </p>
          <p className="text-sm text-muted-foreground/60">
            This page will automatically unlock once DevTools is closed.
          </p>
        </div>

        {/* Pulsing indicator */}
        <div className="flex items-center gap-2 rounded-full border border-cinema-red/20 bg-cinema-red/5 px-4 py-2">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-cinema-red opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-cinema-red" />
          </span>
          <span className="text-xs font-medium text-cinema-red/80">
            Monitoring for DevTools…
          </span>
        </div>
      </motion.div>
    </main>
  );
}
