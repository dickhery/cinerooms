import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Link } from "@tanstack/react-router";
import { Clock, Play, Share2, Tag, Ticket, User, X } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { toast } from "sonner";
import type { Room } from "../../backend.d";

interface RoomCardProps {
  room: Room;
  index: number;
}

export function RoomCard({ room, index }: RoomCardProps) {
  const ocidIndex = index + 1;
  const [dialogOpen, setDialogOpen] = useState(false);

  const hasDuration = !!room.viewDuration && room.viewDuration.trim() !== "";
  const hasCategory =
    room.category &&
    room.category !== "uncategorized" &&
    room.category !== "Other";
  const durationLabel = hasDuration ? room.viewDuration : "";
  const hasCreator = !!room.creatorName && room.creatorName.trim() !== "";

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}/room/${room.slug}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      toast.success("Room link copied!");
    });
  };

  return (
    <>
      {/* ── Card ── */}
      <motion.article
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: index * 0.07, ease: "easeOut" }}
        onClick={() => setDialogOpen(true)}
        className="group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border border-border/60 bg-card transition-all duration-300 hover:border-cinema-red/40 hover:shadow-card-hover"
      >
        {/* Thumbnail */}
        <div className="relative aspect-video overflow-hidden bg-muted">
          {room.thumbnailUrl ? (
            <img
              src={room.thumbnailUrl}
              alt={room.title}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card to-muted">
              <Play size={40} className="text-cinema-red/40" strokeWidth={1} />
            </div>
          )}

          {/* Red vignette overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Category badge overlay on thumbnail */}
          {hasCategory && (
            <div className="absolute bottom-2 left-2 flex items-center gap-1 rounded border border-cinema-red/30 bg-black/70 px-2 py-0.5 text-xs font-medium text-cinema-red backdrop-blur-sm">
              <Tag size={9} />
              {room.category}
            </div>
          )}

          {/* Play overlay on hover */}
          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-cinema-red/90 shadow-cinema backdrop-blur-sm">
              <Play
                size={22}
                className="translate-x-0.5 text-white"
                fill="white"
              />
            </div>
          </div>
        </div>

        {/* Card body */}
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="line-clamp-2 font-display text-base font-semibold leading-snug text-foreground transition-colors duration-200 group-hover:text-cinema-red">
            {room.title}
          </h3>

          {/* Creator name below title */}
          {hasCreator && (
            <p className="-mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <User size={10} className="shrink-0" />
              {room.creatorName}
            </p>
          )}

          {/* Category + Duration + Price row */}
          <div className="flex flex-wrap items-center gap-2">
            {hasCategory && (
              <span className="inline-flex items-center gap-1 rounded border border-cinema-red/30 bg-cinema-red/10 px-2 py-0.5 text-xs text-cinema-red">
                <Tag size={9} />
                {room.category}
              </span>
            )}
            {hasDuration && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Clock size={10} />
                {durationLabel}
              </span>
            )}
            {/* Price */}
            {room.price && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-cinema-red">
                <Ticket size={10} />
                {room.price} ICP
              </span>
            )}
          </div>

          {room.description && (
            <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">
              {room.description}
            </p>
          )}

          <div className="mt-auto pt-3">
            <Link
              to="/room/$slug"
              params={{ slug: room.slug }}
              onClick={(e) => e.stopPropagation()}
            >
              <Button
                data-ocid={`home.enter_room_button.${ocidIndex}`}
                className="w-full bg-cinema-red font-semibold text-white hover:bg-cinema-red-dim active:scale-[0.98]"
              >
                <Play size={14} className="mr-1.5" />
                Enter Room
              </Button>
            </Link>
          </div>
        </div>
      </motion.article>

      {/* ── Detail Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          data-ocid="room.detail_dialog"
          className="max-h-[90vh] max-w-lg overflow-y-auto border-border bg-card p-0 text-foreground"
        >
          {/* Thumbnail banner */}
          <div className="relative aspect-video w-full overflow-hidden rounded-t-lg bg-muted">
            {room.thumbnailUrl ? (
              <img
                src={room.thumbnailUrl}
                alt={room.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-card to-muted">
                <Play
                  size={48}
                  className="text-cinema-red/40"
                  strokeWidth={1}
                />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          </div>

          <div className="flex flex-col gap-4 p-5">
            <DialogHeader>
              <DialogTitle className="font-display text-xl font-semibold leading-snug text-foreground">
                {room.title}
              </DialogTitle>
              {/* Creator name in dialog */}
              {hasCreator && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <User size={12} className="shrink-0" />
                  {room.creatorName}
                </p>
              )}
            </DialogHeader>

            {/* Info badges */}
            <div className="flex flex-wrap items-center gap-3">
              {hasCategory && (
                <span className="inline-flex items-center gap-1.5 rounded border border-cinema-red/30 bg-cinema-red/10 px-2.5 py-1 text-xs font-medium text-cinema-red">
                  <Tag size={10} />
                  {room.category}
                </span>
              )}
              {hasDuration && (
                <span className="inline-flex flex-col items-start gap-0.5 text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    View Window
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-foreground">
                    <Clock size={11} />
                    {durationLabel}
                  </span>
                </span>
              )}
              {room.price && (
                <span className="inline-flex flex-col items-start gap-0.5 text-xs">
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Price
                  </span>
                  <span className="inline-flex items-center gap-1 font-semibold text-cinema-red">
                    <Ticket size={11} />
                    {room.price} ICP
                  </span>
                </span>
              )}
            </div>

            {/* Full description */}
            {room.description && (
              <DialogDescription asChild>
                <div className="max-h-48 overflow-y-auto rounded-md border border-border/40 bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground">
                  {room.description}
                </div>
              </DialogDescription>
            )}

            {/* Footer actions */}
            <div className="flex items-center gap-3 pt-1">
              <Button
                data-ocid="room.detail.share_button"
                variant="ghost"
                size="icon"
                onClick={handleShare}
                title="Share"
                className="shrink-0 text-muted-foreground hover:text-foreground"
              >
                <Share2 size={15} />
              </Button>
              <Button
                data-ocid="room.detail.close_button"
                variant="outline"
                className="flex-1 border-border text-muted-foreground hover:text-foreground"
                onClick={() => setDialogOpen(false)}
              >
                <X size={14} className="mr-1.5" />
                Close
              </Button>
              <Link
                to="/room/$slug"
                params={{ slug: room.slug }}
                className="flex-1"
                onClick={() => setDialogOpen(false)}
              >
                <Button
                  data-ocid="room.detail.enter_room_button"
                  className="w-full bg-cinema-red font-semibold text-white hover:bg-cinema-red-dim active:scale-[0.98]"
                >
                  <Play size={14} className="mr-1.5" fill="white" />
                  Enter Room
                </Button>
              </Link>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
