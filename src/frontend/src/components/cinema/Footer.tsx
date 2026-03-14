import { useQuery } from "@tanstack/react-query";
import { Film, Heart } from "lucide-react";
import { useRef } from "react";
import { toast } from "sonner";
import { useAdmin } from "../../contexts/AdminContext";
import { useActor } from "../../hooks/useActor";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { Button } from "../ui/button";

export function Footer() {
  const year = new Date().getFullYear();
  const hostname =
    typeof window !== "undefined" ? window.location.hostname : "";
  const utmUrl = `https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(hostname)}`;

  const { identity } = useInternetIdentity();
  const { isAdmin, logout } = useAdmin();
  const { actor } = useActor();

  // ── Triple-tap → copy PID to clipboard ──────────────────────────────────
  // Hidden gesture: any authenticated user taps/clicks the footer 3× within
  // 600 ms to copy their Principal ID to the clipboard. No visible UI change.
  const tapCount = useRef(0);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const handleFooterTap = () => {
    // Only act when a user is authenticated
    if (!identity) return;

    tapCount.current += 1;
    clearTimeout(tapTimer.current);

    // Reset the counter after 600 ms of inactivity
    tapTimer.current = setTimeout(() => {
      tapCount.current = 0;
    }, 600);

    if (tapCount.current >= 3) {
      tapCount.current = 0;
      clearTimeout(tapTimer.current);

      const pid = identity.getPrincipal().toText();

      navigator.clipboard
        .writeText(pid)
        .then(() => {
          toast.success("Principal ID copied to clipboard", {
            description: `${pid.slice(0, 10)}...`,
          });
        })
        .catch(() => {
          // Clipboard API may fail if focus is not on the document
          toast.error("Could not copy to clipboard", {
            description: `Please copy your PID manually: ${pid.slice(0, 10)}...`,
          });
        });
    }
  };

  // ── Check whether an admin is currently registered ───────────────────────
  // The reset button is only shown to the current admin (isAdmin === true).
  const { data: adminExists } = useQuery({
    queryKey: ["hasAdmin"],
    queryFn: async () => {
      if (!actor) return true; // default to "yes" so button stays hidden when actor isn't ready
      return actor.hasAdmin();
    },
    enabled: !!actor && isAdmin,
    staleTime: 30_000,
  });

  // ── Reset admin handler ───────────────────────────────────────────────────
  const handleResetAdmin = async () => {
    if (!actor) return;
    try {
      await actor.resetAdmin();
      logout();
      toast.success(
        "Admin access has been reset. The next person to triple-tap the logo and log in will become the new admin.",
      );
    } catch (err) {
      console.error("Reset admin failed:", err);
      toast.error("Failed to reset admin access. Please try again.");
    }
  };

  return (
    <footer
      className="border-t border-border/40 bg-black/60 py-8"
      onClick={handleFooterTap}
      onKeyUp={handleFooterTap}
      data-ocid="footer.panel"
    >
      <div className="container mx-auto flex flex-col items-center gap-3 px-4 text-center md:flex-row md:justify-between md:text-left">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Film size={14} className="text-cinema-red" />
          <span className="font-display font-semibold text-foreground/60">
            Cine<span className="text-cinema-red">Rooms</span>
          </span>
          <span>© {year} All rights reserved.</span>

          {/* ── Admin Reset Button ──────────────────────────────────────────
               Only visible to the authenticated admin. Styled to be subtle
               and unobtrusive so regular users never notice it. */}
          {isAdmin && adminExists !== false && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="ml-2 h-auto px-1.5 py-0.5 text-[10px] text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10"
                  data-ocid="footer.reset_admin_button"
                >
                  Reset Admin
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent className="bg-card border-border">
                <AlertDialogHeader>
                  <AlertDialogTitle className="text-foreground">
                    Reset Admin Access?
                  </AlertDialogTitle>
                  <AlertDialogDescription className="text-muted-foreground">
                    This will permanently remove your admin privileges. The next
                    person to triple-tap the logo and log in via Internet
                    Identity will become the new admin. This action cannot be
                    undone without re-claiming admin access.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel
                    className="border-border"
                    data-ocid="footer.reset_admin_cancel_button"
                  >
                    Cancel
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleResetAdmin}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    data-ocid="footer.reset_admin_confirm_button"
                  >
                    Yes, Reset Admin
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        <a
          href={utmUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-xs text-muted-foreground/50 transition-colors hover:text-muted-foreground"
        >
          Built with <Heart size={11} className="text-cinema-red" /> using
          caffeine.ai
        </a>
      </div>
    </footer>
  );
}
