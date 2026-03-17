// CHANGED: Uses window.forceClearPaywall() — the new robust cleanup function from the embed script — to ensure widgets are fully removed when HomePage mounts.
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "@tanstack/react-router";
import { Play, Search, ShieldAlert, Tv2, Video, X } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { AdminBootstrapHint } from "../components/cinema/AdminBootstrapHint";
import { RoomCard } from "../components/cinema/RoomCard";
import { RoomCardSkeleton } from "../components/cinema/RoomCardSkeleton";
import { WelcomeCurtain } from "../components/cinema/WelcomeCurtain";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import {
  useGetHomepageScripts,
  useGetRooms,
  useHasDynamicAdmin,
} from "../hooks/useQueries";

const CATEGORIES = [
  "Action",
  "Drama",
  "Comedy",
  "Sci-Fi",
  "Horror",
  "Documentary",
  "Thriller",
  "Romance",
  "Anime",
  "Tutorials",
  "Adult",
  "Other",
] as const;

export function HomePage() {
  const { data: rooms, isLoading } = useGetRooms();
  const { data: homepageScripts } = useGetHomepageScripts();
  const { identity, login, isLoggingIn } = useInternetIdentity();
  const navigate = useNavigate();

  // Admin bootstrap hint
  const { data: hasDynamicAdmin } = useHasDynamicAdmin();
  // NOTE: We intentionally do NOT check isCallerAdmin here.
  // Hardcoded admin PIDs survive canister resets (they are baked into Motoko code, not stable variables).
  // So after a hard reset, the hardcoded admin's II session is still active and isCallerAdmin() returns true,
  // which would hide the hint even though no dynamic admin has been bootstrapped yet.
  // The hint must appear for ALL visitors whenever hasDynamicAdmin is false.
  const showBootstrapHint = hasDynamicAdmin === false;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(),
  );

  // Adult content gate state
  const [adultConfirmed, setAdultConfirmed] = useState(false);
  const [showAdultDialog, setShowAdultDialog] = useState(false);

  const pendingNavToSubmit = useRef(false);

  useEffect(() => {
    if (pendingNavToSubmit.current && identity) {
      pendingNavToSubmit.current = false;
      void navigate({ to: "/submit" });
    }
  }, [identity, navigate]);

  // Extra defensive cleanup so any stray widget from a previous room visit is gone
  useEffect(() => {
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
    } catch (err) {
      console.warn("Paywall cleanup on HomePage (safe to ignore):", err);
    }
  }, []);

  // Inject homepage scripts into <head> in order.
  useEffect(() => {
    if (!homepageScripts || homepageScripts.length === 0) return;

    const sorted = [...homepageScripts].sort((a, b) =>
      Number(a.order - b.order),
    );
    const injected: HTMLScriptElement[] = [];

    for (const hs of sorted) {
      const parser = new DOMParser();
      const parsed = parser.parseFromString(hs.scriptContent, "text/html");
      const scriptEls = Array.from(parsed.querySelectorAll("script"));

      if (scriptEls.length === 0) {
        const el = document.createElement("script");
        el.setAttribute("data-homepage-script", "true");
        el.setAttribute("data-script-id", hs.id.toString());
        el.textContent = hs.scriptContent;
        document.head.appendChild(el);
        injected.push(el);
      } else {
        for (const srcEl of scriptEls) {
          const el = document.createElement("script");
          el.setAttribute("data-homepage-script", "true");
          el.setAttribute("data-script-id", hs.id.toString());
          for (const attr of Array.from(srcEl.attributes)) {
            el.setAttribute(attr.name, attr.value);
          }
          if (srcEl.src) {
            try {
              const url = new URL(srcEl.src, window.location.href);
              url.searchParams.set("hpMount", Date.now().toString());
              el.setAttribute("src", url.toString());
            } catch {
              const sep = srcEl.src.includes("?") ? "&" : "?";
              el.setAttribute("src", `${srcEl.src}${sep}hpMount=${Date.now()}`);
            }
          }
          el.textContent = srcEl.textContent;
          document.head.appendChild(el);
          injected.push(el);
        }
      }
    }

    return () => {
      for (const el of injected) {
        el.remove();
      }
      for (const s of Array.from(
        document.querySelectorAll("script[data-homepage-script]"),
      )) {
        s.remove();
      }
    };
  }, [homepageScripts]);

  const toggleCategory = (cat: string) => {
    if (cat === "Adult") {
      if (selectedCategories.has("Adult")) {
        setSelectedCategories((prev) => {
          const next = new Set(prev);
          next.delete("Adult");
          return next;
        });
      } else if (adultConfirmed) {
        setSelectedCategories((prev) => {
          const next = new Set(prev);
          next.add("Adult");
          return next;
        });
      } else {
        setShowAdultDialog(true);
      }
      return;
    }

    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const handleAdultConfirm = () => {
    setAdultConfirmed(true);
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      next.add("Adult");
      return next;
    });
    setShowAdultDialog(false);
  };

  const handleAdultDeny = () => {
    setShowAdultDialog(false);
    toast.info("You must be 18+ to view adult content.");
  };

  const clearFilters = () => {
    setSelectedCategories(new Set());
    setSearchQuery("");
  };

  const handleSubmitVideo = () => {
    if (identity) {
      void navigate({ to: "/submit" });
    } else {
      toast.info("Please log in with Internet Identity to submit a video.");
      pendingNavToSubmit.current = true;
      login();
    }
  };

  const filteredRooms = rooms?.filter((room) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      room.title.toLowerCase().includes(q) ||
      room.description.toLowerCase().includes(q) ||
      room.creatorName.toLowerCase().includes(q);
    const matchesSlug = !q || room.slug.toLowerCase().includes(q);

    const matchesCategory =
      selectedCategories.size === 0 || selectedCategories.has(room.category);

    const isAdultRoom = room.category === "Adult";
    if (isAdultRoom && !selectedCategories.has("Adult")) {
      return false;
    }

    return (matchesSearch || matchesSlug) && matchesCategory;
  });

  return (
    <main className="flex min-h-screen flex-col">
      <WelcomeCurtain forceShow={hasDynamicAdmin === false} />

      {/* Admin bootstrap hint — shown when no dynamic admin exists yet */}
      <AnimatePresence>
        {showBootstrapHint && <AdminBootstrapHint />}
      </AnimatePresence>

      {/* Age Confirmation Dialog for Adult Content */}
      <AlertDialog open={showAdultDialog} onOpenChange={setShowAdultDialog}>
        <AlertDialogContent
          data-ocid="home.adult_confirm_dialog"
          className="border-border bg-card text-foreground max-w-md"
        >
          <AlertDialogHeader>
            <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full border border-cinema-red/30 bg-cinema-red/10">
              <ShieldAlert size={28} className="text-cinema-red" />
            </div>
            <AlertDialogTitle className="font-display text-xl text-center text-foreground">
              Age Verification Required
            </AlertDialogTitle>
            <AlertDialogDescription className="text-center text-muted-foreground leading-relaxed">
              The Adult category contains content intended for mature audiences
              only. You must be{" "}
              <strong className="text-foreground">
                18 years of age or older
              </strong>{" "}
              to view this content.
              <br className="my-1" />
              By continuing, you confirm that you are at least 18 years old.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col gap-2 sm:flex-row">
            <AlertDialogCancel
              data-ocid="home.adult_confirm_dialog.cancel_button"
              onClick={handleAdultDeny}
              className="border-border text-muted-foreground hover:border-cinema-red/40 hover:text-foreground w-full sm:w-auto"
            >
              No, I am not 18+
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="home.adult_confirm_dialog.confirm_button"
              onClick={handleAdultConfirm}
              className="bg-cinema-red text-white hover:bg-cinema-red-dim w-full sm:w-auto"
            >
              Yes, I am 18+
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Hero Section */}
      <section
        className="relative flex min-h-[480px] items-center overflow-hidden"
        style={{
          backgroundImage:
            "url('/assets/generated/hero-cinema.dim_1600x500.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* Dark cinematic overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/40" />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-black/20" />

        {/* Film grain */}
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        {/* Decorative film perforations */}
        <div className="absolute left-0 top-0 bottom-0 w-8 flex flex-col justify-around py-4 opacity-20">
          {Array.from({ length: 12 }, (_, i) => `perf-left-${i}`).map((id) => (
            <div
              key={id}
              className="mx-auto h-5 w-3 rounded-sm border border-white/30"
            />
          ))}
        </div>
        <div className="absolute right-0 top-0 bottom-0 w-8 flex flex-col justify-around py-4 opacity-20">
          {Array.from({ length: 12 }, (_, i) => `perf-right-${i}`).map((id) => (
            <div
              key={id}
              className="mx-auto h-5 w-3 rounded-sm border border-white/30"
            />
          ))}
        </div>

        <div className="relative z-10 container mx-auto px-8 md:px-12 py-16">
          <motion.div
            initial={{ opacity: 0, y: 32 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="max-w-2xl"
          >
            {/* Eyebrow */}
            <div className="mb-4 flex items-center gap-2">
              <div className="h-px w-8 bg-cinema-red" />
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cinema-red">
                Now Streaming
              </span>
            </div>

            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight text-foreground sm:text-5xl md:text-6xl">
              Welcome to <span className="text-cinema-red">CineRooms</span>
            </h1>

            <p className="mt-4 max-w-lg text-lg leading-relaxed text-foreground/70">
              Your private movie theater experience. Step into any room and
              immerse yourself in a world of curated cinema.
            </p>

            <div className="mt-8 flex items-center gap-4">
              <a
                href="#rooms"
                className="inline-flex items-center gap-2 rounded bg-cinema-red px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-cinema-red-dim active:scale-[0.97]"
              >
                <Play size={15} fill="white" />
                Browse Rooms
              </a>
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <Tv2 size={15} />
                <span>{rooms?.length ?? "..."} rooms available</span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Rooms Grid */}
      <section id="rooms" className="flex-1 py-12 md:py-16">
        <div className="container mx-auto px-4 md:px-6">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mb-5 flex flex-wrap items-end justify-between gap-4"
          >
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground md:text-3xl">
                Now Showing
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a room to begin your cinematic experience
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!isLoading && rooms && rooms.length > 0 && (
                <span className="text-sm text-muted-foreground/60">
                  {filteredRooms?.length ?? 0} of {rooms.length}{" "}
                  {rooms.length === 1 ? "room" : "rooms"}
                </span>
              )}
              <Button
                data-ocid="home.submit_video_button"
                onClick={handleSubmitVideo}
                disabled={isLoggingIn}
                size="sm"
                className="gap-1.5 bg-cinema-red text-white hover:bg-cinema-red-dim"
              >
                {isLoggingIn ? null : <Video size={14} />}
                {isLoggingIn ? "Logging in..." : "Submit Video"}
              </Button>
            </div>
          </motion.div>

          {/* Search bar */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.25 }}
            className="mb-4 relative"
          >
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
            />
            <Input
              data-ocid="home.search_input"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rooms by title, description, or creator name..."
              className="pl-9 border-border bg-card text-foreground placeholder:text-muted-foreground/40 focus:border-cinema-red/60"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
              >
                <X size={14} />
              </button>
            )}
          </motion.div>

          {/* Category filter chips */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.3 }}
            className="mb-8 flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              data-ocid="home.filter.tab"
              onClick={() => setSelectedCategories(new Set())}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                selectedCategories.size === 0
                  ? "border-cinema-red bg-cinema-red/10 text-cinema-red"
                  : "border-border text-muted-foreground hover:border-cinema-red/40 hover:text-foreground"
              }`}
            >
              All
            </button>
            {CATEGORIES.map((cat) => {
              const isAdult = cat === "Adult";
              const isActive = selectedCategories.has(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  data-ocid={isAdult ? "home.adult_filter_button" : undefined}
                  onClick={() => toggleCategory(cat)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                    isActive
                      ? "border-cinema-red bg-cinema-red/10 text-cinema-red"
                      : "border-border text-muted-foreground hover:border-cinema-red/40 hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              );
            })}
            {selectedCategories.size > 0 && (
              <button
                type="button"
                data-ocid="home.clear_filters_button"
                onClick={clearFilters}
                className="flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground/60 transition-colors hover:border-cinema-red/40 hover:text-cinema-red"
              >
                <X size={11} />
                Clear Filters
              </button>
            )}
          </motion.div>

          {/* Loading state */}
          {isLoading && (
            <div
              data-ocid="home.rooms_loading_state"
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {Array.from({ length: 6 }, (_, i) => `skel-${i}`).map((id) => (
                <RoomCardSkeleton key={id} />
              ))}
            </div>
          )}

          {/* Empty state (no rooms at all) */}
          {!isLoading && (!rooms || rooms.length === 0) && (
            <motion.div
              data-ocid="home.rooms_empty_state"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex flex-col items-center justify-center py-24 text-center"
            >
              <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full border border-border/60 bg-card">
                <Tv2
                  size={32}
                  className="text-muted-foreground/40"
                  strokeWidth={1}
                />
              </div>
              <h3 className="font-display text-lg font-semibold text-muted-foreground">
                No rooms available yet
              </h3>
              <p className="mt-2 max-w-sm text-sm text-muted-foreground/60">
                The theater is being set up. Check back soon for upcoming
                cinematic experiences.
              </p>
            </motion.div>
          )}

          {/* No results from filter */}
          {!isLoading &&
            rooms &&
            rooms.length > 0 &&
            filteredRooms &&
            filteredRooms.length === 0 && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-20 text-center"
              >
                <Search
                  size={36}
                  className="mb-4 text-muted-foreground/30"
                  strokeWidth={1}
                />
                <h3 className="font-display text-lg font-semibold text-muted-foreground">
                  No rooms match your filters
                </h3>
                <p className="mt-2 text-sm text-muted-foreground/60">
                  Try different categories or clear the search.
                </p>
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  size="sm"
                  className="mt-4 border-border text-muted-foreground hover:border-cinema-red/40 hover:text-cinema-red"
                >
                  <X size={13} className="mr-1.5" />
                  Clear Filters
                </Button>
              </motion.div>
            )}

          {/* Rooms grid */}
          {!isLoading && filteredRooms && filteredRooms.length > 0 && (
            <div
              data-ocid="home.rooms_list"
              className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
            >
              {filteredRooms.map((room, index) => (
                <RoomCard key={room.id.toString()} room={room} index={index} />
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
