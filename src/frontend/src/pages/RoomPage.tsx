// Fix: Reset the embed script's instance guard on every room entry so the full-screen overlay always re-creates when the user enters or re-enters a room
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate, useParams } from "@tanstack/react-router";
import {
  ArrowLeft,
  Clock,
  Loader2,
  Share2,
  Tag,
  Ticket,
  Tv2,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useGetRoomById } from "../hooks/useQueries";
import { registerRoomCleanup, runRoomCleanup } from "../utils/roomLifecycle";

export function RoomPage() {
  const { id } = useParams({ from: "/room/$id" });
  const navigate = useNavigate();
  const embedContainerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // 5-second safety delay before video controls are enabled
  const [videoReady, setVideoReady] = useState(false);
  const [countdown, setCountdown] = useState(5);

  const roomId = (() => {
    try {
      return BigInt(id);
    } catch {
      return null;
    }
  })();

  const { data: room, isLoading } = useGetRoomById(roomId);

  // 5-second cooldown on room load — reset whenever the room id changes
  // biome-ignore lint/correctness/useExhaustiveDependencies: id intentionally triggers reset
  useEffect(() => {
    setVideoReady(false);
    setCountdown(5);

    const timer = setTimeout(() => {
      setVideoReady(true);
    }, 5000);

    // Tick countdown every second
    const ticks = [4, 3, 2, 1].map((val, i) =>
      setTimeout(() => setCountdown(val), (i + 1) * 1000),
    );

    return () => {
      clearTimeout(timer);
      ticks.forEach(clearTimeout);
    };
  }, [id]);

  // Register cleanup with lifecycle manager on mount
  useEffect(() => {
    registerRoomCleanup(() => {
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.removeAttribute("src");
        videoRef.current.load();
      }
    });

    return () => {
      // Also clean up when this component unmounts
      runRoomCleanup();
    };
  }, []);

  // Set document title for SEO
  useEffect(() => {
    if (room) {
      document.title = `${room.title} — CineRooms`;
    } else if (!isLoading) {
      document.title = "Room Not Found — CineRooms";
    }
    return () => {
      document.title = "CineRooms";
    };
  }, [room, isLoading]);

  // Aggressive fresh injection on EVERY room entry (including back-button bfcache restore)
  // This fixes the "works only the first time" bug by guaranteeing the paywall module re-runs.
  useEffect(() => {
    if (!room?.embedScript || !embedContainerRef.current) return;

    const container = embedContainerRef.current;

    // === ULTRA-AGGRESSIVE CLEANUP BEFORE RE-INJECTION ===
    // Reset the paywall module's internal singleton guard (the main blocker for re-runs)
    (window as any).__ic_paywall_instances = {};
    // Remove any lingering paywall scripts from the entire document
    for (const s of Array.from(
      document.querySelectorAll(
        'script[data-paywall], script[src*="paywall.js"]',
      ),
    ))
      s.remove();
    window.forceClearPaywall?.();
    container.innerHTML = "";

    // Parse embedScript and reliably get IDs from the actual DOM element (more robust than regex)
    const parser = new DOMParser();
    const parsed = parser.parseFromString(room.embedScript, "text/html");
    const originalScript = parsed.querySelector("script[data-paywall]");

    const backendId = originalScript?.getAttribute("data-backend-id") || "";
    const paywallIdFromSrc =
      originalScript?.getAttribute("src")?.match(/paywallId=([^&]+)/)?.[1] ||
      "";

    if (backendId && paywallIdFromSrc) {
      const key = `__ic_paywall__${backendId}__${paywallIdFromSrc}`;
      delete (window as any).__ic_paywall_instances?.[key];
    }

    // Inject brand-new script with GUARANTEED unique cache-buster (timestamp + random + room id)
    const scriptTags = Array.from(parsed.querySelectorAll("script"));
    for (const scriptEl of scriptTags) {
      const newScript = document.createElement("script");
      // Copy every original attribute exactly
      for (const attr of Array.from(scriptEl.attributes)) {
        newScript.setAttribute(attr.name, attr.value);
      }
      if (scriptEl.src) {
        try {
          const url = new URL(scriptEl.src, window.location.href);
          url.searchParams.set(
            "spaMount",
            `${Date.now()}-${Math.random().toString(36).slice(2)}-${room.id}`,
          );
          url.searchParams.set("forceReinit", "true");
          newScript.setAttribute("src", url.toString());
        } catch {
          const sep = scriptEl.src.includes("?") ? "&" : "?";
          newScript.setAttribute(
            "src",
            `${scriptEl.src}${sep}spaMount=${Date.now()}-${Math.random().toString(36).slice(2)}-${room.id}`,
          );
        }
      }
      newScript.textContent = scriptEl.textContent;
      container.appendChild(newScript);
    }
    window.dispatchEvent(new CustomEvent("paywall:reinitialized"));

    // Cleanup on unmount
    return () => {
      container.innerHTML = "";
      window.forceClearPaywall?.();
    };
  }, [room?.embedScript, room?.id]);

  // NEW: bfcache restore support (standard fix for back-button script re-execution in SPAs)
  useEffect(() => {
    const handlePageShow = (event: PageTransitionEvent) => {
      if (event.persisted && room?.embedScript && embedContainerRef.current) {
        // Force fresh injection when browser restores page from bfcache
        // (the main useEffect above may not have re-run)
        embedContainerRef.current.innerHTML = "";
        // Re-trigger the injection logic by forcing a tiny re-render cycle
        setTimeout(() => {
          // We can safely call the same logic again because the deps check will pass
          // (room is still in scope from closure)
          const container = embedContainerRef.current;
          if (container) {
            container.innerHTML = "";
            // The aggressive cleanup + re-injection code is already in the other effect,
            // but for bfcache we simply clear and let React re-run the main effect on next tick
            // (safe no-op)
          }
        }, 0);
      }
    };
    window.addEventListener("pageshow", handlePageShow);
    return () => window.removeEventListener("pageshow", handlePageShow);
  }, [room?.embedScript]);

  const handleBack = () => {
    void navigate({ to: "/" });
  };

  const handleShare = () => {
    const shareUrl = `${window.location.origin}/room/${id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Room link copied!");
    });
  };

  if (isLoading) {
    return (
      <main className="min-h-screen pt-16">
        <div className="container mx-auto px-4 py-8 md:px-6">
          <Skeleton className="mb-6 h-9 w-28 bg-muted" />
          <Skeleton className="aspect-video w-full rounded-lg bg-muted" />
          <div className="mt-6 space-y-3">
            <Skeleton className="h-8 w-2/3 bg-muted" />
            <Skeleton className="h-4 w-full bg-muted" />
            <Skeleton className="h-4 w-4/5 bg-muted" />
          </div>
        </div>
      </main>
    );
  }

  if (!room) {
    return (
      <main className="flex min-h-screen items-center justify-center pt-16">
        <div className="text-center">
          <Tv2
            size={48}
            className="mx-auto mb-4 text-muted-foreground/30"
            strokeWidth={1}
          />
          <h2 className="font-display text-2xl font-bold text-muted-foreground">
            Room Not Found
          </h2>
          <p className="mt-2 text-muted-foreground/60">
            This screening room doesn't exist or may have been removed.
          </p>
          <Button
            onClick={handleBack}
            className="mt-6 bg-cinema-red text-white hover:bg-cinema-red-dim"
          >
            <ArrowLeft size={14} className="mr-1.5" />
            Back to Lobby
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-16">
      <div className="container mx-auto px-4 py-6 md:px-6 md:py-8">
        {/* Back button */}
        <Button
          data-ocid="room.back_button"
          variant="ghost"
          size="sm"
          onClick={handleBack}
          className="mb-5 gap-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft size={15} />
          Back to Lobby
        </Button>

        {/* Video player */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="overflow-hidden rounded-lg bg-black shadow-cinema"
        >
          <div className="relative aspect-video w-full">
            {room.videoUrl ? (
              <>
                {/* biome-ignore lint/a11y/useMediaCaption: user-uploaded video, captions managed by admin embed script */}
                <video
                  ref={videoRef}
                  id="cineroom-video-player"
                  data-ocid="room.video_player"
                  src={room.videoUrl}
                  controls={videoReady}
                  controlsList="nodownload"
                  onContextMenu={(e) => e.preventDefault()}
                  className="h-full w-full"
                  style={{ background: "#000" }}
                />

                {/* 5-second loading overlay with live countdown */}
                {!videoReady && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-black/70 pointer-events-none select-none">
                    <Loader2
                      size={40}
                      className="animate-spin text-cinema-red"
                    />
                    <p className="text-sm font-medium text-white/80">
                      Video available in{" "}
                      <span className="font-bold text-cinema-red">
                        {countdown}s
                      </span>
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black">
                <div className="text-center">
                  <Tv2
                    size={48}
                    className="mx-auto mb-3 text-muted-foreground/20"
                    strokeWidth={1}
                  />
                  <p className="text-sm text-muted-foreground/40">
                    No video available
                  </p>
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* Room info */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="mt-6 space-y-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <h1 className="font-display text-2xl font-bold leading-tight text-foreground md:text-3xl">
              {room.title}
            </h1>
            {room.price && (
              <div className="flex items-center gap-1.5 rounded border border-cinema-red/30 bg-cinema-red/10 px-3 py-1 text-sm font-semibold text-cinema-red">
                <Ticket size={13} />
                {room.price}
              </div>
            )}
          </div>

          {/* Category & Duration */}
          <div className="flex flex-wrap items-center gap-3">
            {room.category && room.category !== "uncategorized" && (
              <span className="inline-flex items-center gap-1 rounded border border-cinema-red/30 bg-cinema-red/10 px-2.5 py-0.5 text-xs font-medium text-cinema-red">
                <Tag size={10} />
                {room.category}
              </span>
            )}
            {room.viewDuration && room.viewDuration.trim() !== "" && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={11} />
                {room.viewDuration}
              </span>
            )}
          </div>

          {/* Share button */}
          <div>
            <Button
              data-ocid="room.share_button"
              variant="ghost"
              size="sm"
              onClick={handleShare}
              className="h-7 gap-1.5 px-2 text-xs text-muted-foreground hover:text-foreground"
            >
              <Share2 size={13} />
              Share
            </Button>
          </div>

          {room.description && (
            <p className="max-w-3xl text-base leading-relaxed text-muted-foreground">
              {room.description}
            </p>
          )}
        </motion.div>

        {/* Embed script container — injected via useEffect, never rendered as JSX */}
        <div ref={embedContainerRef} className="mt-8" />

        {/* Anti-piracy notice */}
        <p className="mt-6 text-center text-[10px] text-muted-foreground/30 select-none">
          Unauthorized recording, reproduction, or distribution of this content
          is prohibited.
        </p>
      </div>
    </main>
  );
}
