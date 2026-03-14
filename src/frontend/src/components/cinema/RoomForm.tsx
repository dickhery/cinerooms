import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, Loader2, Upload, X } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { Room } from "../../backend.d";
import { useFileUpload } from "../../hooks/useFileUpload";
import { useCreateRoom, useUpdateRoom } from "../../hooks/useQueries";

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

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Build a human-readable duration string; zero-value parts are omitted. */
export function buildDurationString(
  years: number,
  months: number,
  days: number,
  hours: number,
  minutes: number,
): string {
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} ${years === 1 ? "Year" : "Years"}`);
  if (months > 0) parts.push(`${months} ${months === 1 ? "Month" : "Months"}`);
  if (days > 0) parts.push(`${days} ${days === 1 ? "Day" : "Days"}`);
  if (hours > 0) parts.push(`${hours} ${hours === 1 ? "Hour" : "Hours"}`);
  if (minutes > 0)
    parts.push(`${minutes} ${minutes === 1 ? "Minute" : "Minutes"}`);
  return parts.join(" ");
}

/** Parse a formatted duration string back into its components. */
function parseDurationString(str: string): {
  years: number;
  months: number;
  days: number;
  hours: number;
  minutes: number;
} {
  const result = { years: 0, months: 0, days: 0, hours: 0, minutes: 0 };
  if (!str) return result;
  const matches = str.matchAll(
    /(\d+)\s+(Year|Years|Month|Months|Day|Days|Hour|Hours|Minute|Minutes)/gi,
  );
  for (const m of matches) {
    const val = Number.parseInt(m[1], 10);
    const unit = m[2].toLowerCase();
    if (unit.startsWith("year")) result.years = val;
    else if (unit.startsWith("month")) result.months = val;
    else if (unit.startsWith("day")) result.days = val;
    else if (unit.startsWith("hour")) result.hours = val;
    else if (unit.startsWith("minute")) result.minutes = val;
  }
  return result;
}

interface RoomFormProps {
  room?: Room | null;
  open: boolean;
  onClose: () => void;
}

export function RoomForm({ room, open, onClose }: RoomFormProps) {
  const isEditing = !!room;

  const initialDuration = parseDurationString(room?.viewDuration ?? "");

  const [title, setTitle] = useState(room?.title ?? "");
  const [slug, setSlug] = useState(room?.slug ?? "");
  const [description, setDescription] = useState(room?.description ?? "");
  const [price, setPrice] = useState(room?.price ?? "");
  const [embedScript, setEmbedScript] = useState(room?.embedScript ?? "");
  const [videoUrl, setVideoUrl] = useState(room?.videoUrl ?? "");
  const [thumbnailUrl, setThumbnailUrl] = useState(room?.thumbnailUrl ?? "");
  const [durationYears, setDurationYears] = useState(initialDuration.years);
  const [durationMonths, setDurationMonths] = useState(initialDuration.months);
  const [durationDays, setDurationDays] = useState(initialDuration.days);
  const [durationHours, setDurationHours] = useState(initialDuration.hours);
  const [durationMinutes, setDurationMinutes] = useState(
    initialDuration.minutes,
  );
  const [category, setCategory] = useState(room?.category ?? "Other");
  const [creatorName, setCreatorName] = useState(room?.creatorName ?? "");

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);

  const videoUpload = useFileUpload();
  const thumbnailUpload = useFileUpload();
  const createRoom = useCreateRoom();
  const updateRoom = useUpdateRoom();

  const isPending = createRoom.isPending || updateRoom.isPending;

  const handleTitleBlur = useCallback(() => {
    if (!isEditing || !slug) {
      setSlug(generateSlug(title));
    }
  }, [title, slug, isEditing]);

  const handleVideoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = await videoUpload.upload(file);
      if (url) setVideoUrl(url);
    },
    [videoUpload],
  );

  const handleThumbnailChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const url = await thumbnailUpload.upload(file);
      if (url) setThumbnailUrl(url);
    },
    [thumbnailUpload],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!title.trim()) {
        toast.error("Title is required");
        return;
      }

      const params = {
        title: title.trim(),
        slug: slug.trim() || generateSlug(title),
        description: description.trim(),
        price: price.trim(),
        thumbnailUrl: thumbnailUrl,
        videoUrl: videoUrl,
        embedScript: embedScript.trim(),
        viewDuration: buildDurationString(
          durationYears,
          durationMonths,
          durationDays,
          durationHours,
          durationMinutes,
        ),
        category: category,
        creatorName: creatorName.trim(),
      };

      try {
        if (isEditing && room) {
          await updateRoom.mutateAsync({ id: room.id, ...params });
          toast.success("Room updated successfully");
        } else {
          await createRoom.mutateAsync(params);
          toast.success("Room created successfully");
        }
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Failed to save room");
      }
    },
    [
      title,
      slug,
      description,
      price,
      thumbnailUrl,
      videoUrl,
      embedScript,
      durationYears,
      durationMonths,
      durationDays,
      durationHours,
      durationMinutes,
      category,
      creatorName,
      isEditing,
      room,
      createRoom,
      updateRoom,
      onClose,
    ],
  );

  const handleClose = () => {
    if (!isPending) onClose();
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto border-border bg-card scrollbar-cinema">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">
            {isEditing ? "Edit Room" : "Create New Room"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 py-2">
          {/* Video upload */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-muted-foreground">
              Video File
            </Label>
            <div className="flex items-center gap-3">
              <Button
                data-ocid="room_form.video_upload_button"
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-border text-muted-foreground hover:border-cinema-red/60 hover:text-foreground"
                onClick={() => videoInputRef.current?.click()}
                disabled={videoUpload.isUploading}
              >
                {videoUpload.isUploading ? (
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                ) : (
                  <Upload size={14} className="mr-1.5" />
                )}
                {videoUpload.isUploading ? "Uploading..." : "Choose Video"}
              </Button>
              <input
                ref={videoInputRef}
                type="file"
                accept="video/*"
                className="hidden"
                onChange={handleVideoChange}
              />
              {/* Progress bar during upload */}
              {videoUpload.isUploading && (
                <div className="flex-1">
                  <Progress value={videoUpload.progress} className="h-1.5" />
                  <span className="text-xs text-muted-foreground">
                    {videoUpload.progress}%
                  </span>
                </div>
              )}
              {/* Compact badge shown when a video URL is set and not currently uploading.
                  Replaces both the raw URL <p> and the filename span to prevent dialog stretching. */}
              {videoUrl && !videoUpload.isUploading && (
                <div className="flex min-w-0 items-center gap-1.5 rounded border border-border bg-background px-2 py-1">
                  <CheckCircle size={13} className="shrink-0 text-cinema-red" />
                  <span className="truncate text-xs text-muted-foreground">
                    Video ready
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setVideoUrl("");
                      if (videoInputRef.current)
                        videoInputRef.current.value = "";
                    }}
                    className="ml-auto shrink-0 text-muted-foreground hover:text-cinema-red"
                    aria-label="Remove video"
                  >
                    <X size={13} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label
              htmlFor="room-title"
              className="text-sm font-medium text-muted-foreground"
            >
              Title *
            </Label>
            <Input
              id="room-title"
              data-ocid="room_form.title_input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleBlur}
              placeholder="Enter room title..."
              className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-cinema-red/60"
              required
            />
          </div>

          {/* Creator Name */}
          <div className="space-y-1.5">
            <Label
              htmlFor="room-creator"
              className="text-sm font-medium text-muted-foreground"
            >
              Creator Name
            </Label>
            <Input
              id="room-creator"
              data-ocid="room_form.creator_name_input"
              value={creatorName}
              onChange={(e) => setCreatorName(e.target.value)}
              placeholder="e.g. Studio Ghibli, John Doe..."
              className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-cinema-red/60"
            />
          </div>

          {/* Slug */}
          <div className="space-y-1.5">
            <Label
              htmlFor="room-slug"
              className="text-sm font-medium text-muted-foreground"
            >
              URL Slug
            </Label>
            <Input
              id="room-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="room-url-slug"
              className="border-border bg-background font-mono text-sm text-muted-foreground focus:border-cinema-red/60"
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label
              htmlFor="room-desc"
              className="text-sm font-medium text-muted-foreground"
            >
              Description
            </Label>
            <Textarea
              id="room-desc"
              data-ocid="room_form.description_textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe this room..."
              rows={4}
              className="resize-none border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-cinema-red/60"
            />
          </div>

          {/* Thumbnail upload */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-muted-foreground">
              Thumbnail Image
            </Label>
            <div className="flex items-center gap-3">
              <Button
                data-ocid="room_form.thumbnail_upload_button"
                type="button"
                variant="outline"
                size="sm"
                className="shrink-0 border-border text-muted-foreground hover:border-cinema-red/60 hover:text-foreground"
                onClick={() => thumbnailInputRef.current?.click()}
                disabled={thumbnailUpload.isUploading}
              >
                {thumbnailUpload.isUploading ? (
                  <Loader2 size={14} className="mr-1.5 animate-spin" />
                ) : (
                  <Upload size={14} className="mr-1.5" />
                )}
                {thumbnailUpload.isUploading ? "Uploading..." : "Choose Image"}
              </Button>
              <input
                ref={thumbnailInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleThumbnailChange}
              />
              {thumbnailUrl && (
                <div className="flex items-center gap-2">
                  <img
                    src={thumbnailUrl}
                    alt="Thumbnail preview"
                    className="h-10 w-16 rounded object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setThumbnailUrl("")}
                    className="text-muted-foreground hover:text-cinema-red"
                  >
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Price */}
          <div className="space-y-1.5">
            <Label
              htmlFor="room-price"
              className="text-sm font-medium text-muted-foreground"
            >
              Price (display only)
            </Label>
            <Input
              id="room-price"
              data-ocid="room_form.price_input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="e.g. Free, $9.99, 5 ICP"
              className="border-border bg-background text-foreground placeholder:text-muted-foreground/50 focus:border-cinema-red/60"
            />
          </div>

          {/* View Duration After Payment — 5-part picker */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-muted-foreground">
              View Duration After Payment
            </Label>
            <p className="text-xs text-muted-foreground/50">
              How long viewers can access the video after paying. Leave all at 0
              for unlimited.
            </p>
            <div className="grid grid-cols-5 gap-2">
              {[
                {
                  label: "Years",
                  value: durationYears,
                  setter: setDurationYears,
                  ocid: "room_form.duration_years_input",
                },
                {
                  label: "Months",
                  value: durationMonths,
                  setter: setDurationMonths,
                  ocid: "room_form.duration_months_input",
                },
                {
                  label: "Days",
                  value: durationDays,
                  setter: setDurationDays,
                  ocid: "room_form.duration_days_input",
                },
                {
                  label: "Hours",
                  value: durationHours,
                  setter: setDurationHours,
                  ocid: "room_form.duration_hours_input",
                },
                {
                  label: "Minutes",
                  value: durationMinutes,
                  setter: setDurationMinutes,
                  ocid: "room_form.duration_minutes_input",
                },
              ].map(({ label, value, setter, ocid }) => (
                <div key={label} className="flex flex-col gap-1">
                  <span className="text-center text-[10px] font-medium uppercase tracking-wide text-muted-foreground/60">
                    {label}
                  </span>
                  <Input
                    data-ocid={ocid}
                    type="number"
                    min={0}
                    value={value}
                    onChange={(e) =>
                      setter(
                        Math.max(0, Number.parseInt(e.target.value, 10) || 0),
                      )
                    }
                    className="border-border bg-background text-center text-foreground focus:border-cinema-red/60"
                  />
                </div>
              ))}
            </div>
            {buildDurationString(
              durationYears,
              durationMonths,
              durationDays,
              durationHours,
              durationMinutes,
            ) && (
              <p className="text-xs text-cinema-red/80">
                →{" "}
                {buildDurationString(
                  durationYears,
                  durationMonths,
                  durationDays,
                  durationHours,
                  durationMinutes,
                )}
              </p>
            )}
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label
              htmlFor="room-category"
              className="text-sm font-medium text-muted-foreground"
            >
              Category
            </Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                id="room-category"
                data-ocid="room_form.category_select"
                className="border-border bg-background text-foreground focus:border-cinema-red/60"
              >
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent className="border-border bg-card">
                {CATEGORIES.map((cat) => (
                  <SelectItem
                    key={cat}
                    value={cat}
                    className="text-foreground focus:bg-cinema-red/10 focus:text-cinema-red"
                  >
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Embed Script */}
          <div className="space-y-1.5">
            <Label
              htmlFor="room-script"
              className="text-sm font-medium text-muted-foreground"
            >
              Embed Script
            </Label>
            <p className="text-xs text-muted-foreground/60">
              Paste any HTML/JS code here. It will ONLY execute on this room's
              page (e.g. IC Paywall integration).
            </p>
            <Textarea
              id="room-script"
              data-ocid="room_form.embed_script_textarea"
              value={embedScript}
              onChange={(e) => setEmbedScript(e.target.value)}
              placeholder="Paste your embed script here (HTML/JS)..."
              rows={6}
              className="resize-y border-border bg-background font-mono text-xs text-muted-foreground placeholder:text-muted-foreground/40 focus:border-cinema-red/60"
            />
          </div>
        </form>

        <DialogFooter className="gap-2 pt-2">
          <Button
            data-ocid="room_form.cancel_button"
            type="button"
            variant="ghost"
            onClick={handleClose}
            disabled={isPending}
            className="text-muted-foreground hover:text-foreground"
          >
            Cancel
          </Button>
          <Button
            data-ocid="room_form.submit_button"
            type="submit"
            onClick={handleSubmit}
            disabled={
              isPending ||
              videoUpload.isUploading ||
              thumbnailUpload.isUploading
            }
            className="bg-cinema-red text-white hover:bg-cinema-red-dim"
          >
            {isPending ? (
              <>
                <Loader2 size={14} className="mr-1.5 animate-spin" />
                Saving...
              </>
            ) : isEditing ? (
              "Save Changes"
            ) : (
              "Create Room"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
