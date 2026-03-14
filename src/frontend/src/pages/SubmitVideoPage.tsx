import { Badge } from "@/components/ui/badge";
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
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Film,
  ImageIcon,
  Loader2,
  MessageSquare,
  Upload,
  Video,
} from "lucide-react";
import { motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { buildDurationString } from "../components/cinema/RoomForm";
import { useActor } from "../hooks/useActor";
import { useFileUpload } from "../hooks/useFileUpload";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { useGetUserSubmissions, useSubmitVideo } from "../hooks/useQueries";

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

function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp / BigInt(1_000_000));
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(ms));
}

function StatusBadge({ status }: { status: string }) {
  if (status === "Approved") {
    return (
      <Badge className="border-emerald-500/40 bg-emerald-500/10 text-emerald-400">
        Approved
      </Badge>
    );
  }
  if (status === "Denied") {
    return (
      <Badge className="border-cinema-red/40 bg-cinema-red/10 text-cinema-red">
        Denied
      </Badge>
    );
  }
  return (
    <Badge className="border-amber-500/40 bg-amber-500/10 text-amber-400">
      Pending
    </Badge>
  );
}

export function SubmitVideoPage() {
  const { identity, login, isInitializing, isLoginIdle, isLoggingIn } =
    useInternetIdentity();
  const { isFetching: isActorFetching } = useActor();
  // Only block submission while the actor is rebuilding for an authenticated
  // identity — not during the initial anonymous actor creation.
  const isActorBuilding = isActorFetching && !!identity;
  const navigate = useNavigate();

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Other");
  const [durYears, setDurYears] = useState(0);
  const [durMonths, setDurMonths] = useState(0);
  const [durDays, setDurDays] = useState(0);
  const [durHours, setDurHours] = useState(0);
  const [durMinutes, setDurMinutes] = useState(0);
  const [creatorName, setCreatorName] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [paymentAddress, setPaymentAddress] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [viewingDenialReason, setViewingDenialReason] = useState<string | null>(
    null,
  );

  const videoInputRef = useRef<HTMLInputElement>(null);
  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoUpload = useFileUpload();
  const thumbnailUpload = useFileUpload();
  const submitVideo = useSubmitVideo();
  const { data: submissions, isLoading: isLoadingSubmissions } =
    useGetUserSubmissions();

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
      setTimeout(() => window.forceClearPaywall?.(), 50);
    } catch (err) {
      console.warn("Paywall cleanup on non-room page (safe):", err);
    }
  }, []);

  const handleVideoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Check size limit (2GB)
      if (file.size > 2 * 1024 * 1024 * 1024) {
        toast.error(
          "File exceeds the 2GB limit. Please choose a smaller file.",
        );
        return;
      }
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
      if (!creatorName.trim()) {
        toast.error("Creator name is required");
        return;
      }
      if (!videoUrl) {
        toast.error("Please upload a video first");
        return;
      }
      if (!thumbnailUrl) {
        toast.error("Please upload a thumbnail first");
        return;
      }
      if (!paymentAddress.trim()) {
        toast.error("ICP Payment Address is required");
        return;
      }

      try {
        await submitVideo.mutateAsync({
          title: title.trim(),
          description: description.trim(),
          videoUrl,
          thumbnailUrl,
          paymentAddress: paymentAddress.trim(),
          price: `${price} ICP`,
          category,
          viewDuration: buildDurationString(
            durYears,
            durMonths,
            durDays,
            durHours,
            durMinutes,
          ),
          creatorName: creatorName.trim(),
        });

        // Success — reset form
        setTitle("");
        setDescription("");
        setPrice("");
        setCategory("Other");
        setDurYears(0);
        setDurMonths(0);
        setDurDays(0);
        setDurHours(0);
        setDurMinutes(0);
        setCreatorName("");
        setVideoUrl("");
        setThumbnailUrl("");
        setPaymentAddress("");
        videoUpload.reset();
        thumbnailUpload.reset();
        setSubmitted(true);
        toast.success("Video submitted successfully!");
      } catch (err) {
        toast.error(
          err instanceof Error ? err.message : "Failed to submit video",
        );
      }
    },
    [
      title,
      description,
      videoUrl,
      thumbnailUrl,
      paymentAddress,
      price,
      category,
      durYears,
      durMonths,
      durDays,
      durHours,
      durMinutes,
      creatorName,
      submitVideo,
      videoUpload,
      thumbnailUpload,
    ],
  );

  // Auth gate: initializing
  if (isInitializing) {
    return (
      <main className="flex min-h-screen items-center justify-center pt-16">
        <Loader2 className="animate-spin text-cinema-red" size={28} />
      </main>
    );
  }

  // Auth gate: not logged in
  if (isLoginIdle && !identity) {
    return (
      <main className="flex min-h-screen items-center justify-center pt-16 px-4">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md rounded-xl border border-border/60 bg-card p-8 text-center shadow-cinema"
        >
          <Film
            size={44}
            className="mx-auto mb-4 text-cinema-red/70"
            strokeWidth={1}
          />
          <h1 className="font-display text-2xl font-bold text-foreground">
            Login Required
          </h1>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed">
            You must log in with Internet Identity to submit a video to
            CineRooms.
          </p>
          <Button
            data-ocid="submit.login_button"
            onClick={login}
            disabled={isLoggingIn}
            className="mt-6 w-full bg-cinema-red text-white hover:bg-cinema-red-dim"
          >
            {isLoggingIn ? (
              <Loader2 size={15} className="mr-2 animate-spin" />
            ) : null}
            {isLoggingIn ? "Logging in..." : "Login with Internet Identity"}
          </Button>
          <button
            type="button"
            onClick={() => void navigate({ to: "/" })}
            className="mt-3 text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors"
          >
            ← Back to CineRooms
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="min-h-screen pt-16">
      <div className="container mx-auto max-w-3xl px-4 py-10 md:px-6 md:py-12">
        {/* Back to Home button */}
        <button
          data-ocid="submit.back_button"
          type="button"
          onClick={() => void navigate({ to: "/" })}
          className="mb-6 flex items-center gap-1.5 text-sm text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <ArrowLeft size={15} />
          Back to Home
        </button>

        {/* Page heading */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="mb-3 flex items-center gap-2">
            <div className="h-px w-8 bg-cinema-red" />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-cinema-red">
              Creator Submission
            </span>
          </div>
          <h1 className="font-display text-3xl font-bold text-foreground md:text-4xl">
            Submit Your Video to CineRooms
          </h1>
          <p className="mt-2 text-muted-foreground">
            Share your content with our cinema community.
          </p>
        </motion.div>

        {/* Revenue notice */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="mb-8 flex items-start gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3.5"
        >
          <AlertCircle size={18} className="mt-0.5 shrink-0 text-amber-400" />
          <p className="text-sm text-amber-300 leading-relaxed">
            <strong className="font-semibold text-amber-200">
              Revenue Share:
            </strong>{" "}
            CineRooms keeps 10% of any payments that are made by people who view
            your video if a paywall is integrated. You retain 90% of all revenue
            generated. This amount is entirely controlled by the admin. If a
            video has an IC Paywall integrated then it collects 1% of every
            transaction after network fees.
          </p>
        </motion.div>

        {/* Success banner */}
        {submitted && (
          <motion.div
            data-ocid="submit.success_state"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-8 flex items-start gap-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-4"
          >
            <CheckCircle2
              size={20}
              className="mt-0.5 shrink-0 text-emerald-400"
            />
            <div>
              <p className="font-semibold text-emerald-300">
                Thank you! Your video has been submitted for review.
              </p>
              <p className="mt-0.5 text-sm text-emerald-400/80">
                Our team will review your submission and you'll see the status
                update below.
              </p>
            </div>
          </motion.div>
        )}

        {/* Submission form */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="rounded-xl border border-border/60 bg-card p-6 md:p-8"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Video upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Video File *
              </Label>
              <p className="text-xs text-muted-foreground/50">
                Accepted: .mp4, .webm, .mov — Max 2GB
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  data-ocid="submit.video_upload_button"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => videoInputRef.current?.click()}
                  disabled={videoUpload.isUploading}
                  className="gap-2 border-border text-muted-foreground hover:border-cinema-red/60 hover:text-foreground"
                >
                  {videoUpload.isUploading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Upload size={14} />
                  )}
                  {videoUpload.isUploading ? "Uploading..." : "Choose Video"}
                </Button>
                <input
                  ref={videoInputRef}
                  type="file"
                  accept=".mp4,.webm,.mov,video/mp4,video/webm,video/quicktime"
                  className="hidden"
                  onChange={handleVideoChange}
                />
                {videoUpload.filename && !videoUpload.isUploading && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 size={13} className="text-cinema-red" />
                    {videoUpload.filename}
                  </span>
                )}
              </div>
              {videoUpload.isUploading && (
                <div className="mt-2 space-y-1">
                  <Progress value={videoUpload.progress} className="h-1.5" />
                  <span className="text-xs text-muted-foreground">
                    {videoUpload.progress}% uploaded
                  </span>
                </div>
              )}
              {videoUrl && !videoUpload.isUploading && (
                <div className="mt-1 flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5">
                  <Video size={12} className="text-emerald-400" />
                  <span className="text-xs text-emerald-400 truncate">
                    Video ready
                  </span>
                </div>
              )}
            </div>

            {/* Thumbnail upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Thumbnail Image *
              </Label>
              <p className="text-xs text-muted-foreground/50">
                Accepted: .jpg, .jpeg, .png — This will be your room&apos;s
                cover image
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  data-ocid="submit.thumbnail_upload_button"
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => thumbnailInputRef.current?.click()}
                  disabled={thumbnailUpload.isUploading}
                  className="gap-2 border-border text-muted-foreground hover:border-cinema-red/60 hover:text-foreground"
                >
                  {thumbnailUpload.isUploading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <ImageIcon size={14} />
                  )}
                  {thumbnailUpload.isUploading
                    ? "Uploading..."
                    : "Choose Thumbnail"}
                </Button>
                <input
                  ref={thumbnailInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                  className="hidden"
                  onChange={handleThumbnailChange}
                />
                {thumbnailUpload.filename && !thumbnailUpload.isUploading && (
                  <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <CheckCircle2 size={13} className="text-cinema-red" />
                    {thumbnailUpload.filename}
                  </span>
                )}
              </div>
              {thumbnailUpload.isUploading && (
                <div className="mt-2 space-y-1">
                  <Progress
                    value={thumbnailUpload.progress}
                    className="h-1.5"
                  />
                  <span className="text-xs text-muted-foreground">
                    {thumbnailUpload.progress}% uploaded
                  </span>
                </div>
              )}
              {thumbnailUrl && !thumbnailUpload.isUploading && (
                <div className="mt-2 flex items-start gap-3">
                  <div className="overflow-hidden rounded border border-emerald-500/30">
                    <img
                      src={thumbnailUrl}
                      alt="Thumbnail preview"
                      className="h-24 w-40 object-cover"
                    />
                  </div>
                  <div className="flex items-center gap-1.5 rounded border border-emerald-500/30 bg-emerald-500/5 px-3 py-1.5 self-end">
                    <ImageIcon size={12} className="text-emerald-400" />
                    <span className="text-xs text-emerald-400 truncate">
                      Thumbnail ready
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <Label
                htmlFor="sub-title"
                className="text-sm font-medium text-muted-foreground"
              >
                Title *
              </Label>
              <Input
                id="sub-title"
                data-ocid="submit.title_input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter your video title..."
                className="border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:border-cinema-red/60"
                required
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label
                htmlFor="sub-desc"
                className="text-sm font-medium text-muted-foreground"
              >
                Description *
              </Label>
              <Textarea
                id="sub-desc"
                data-ocid="submit.description_textarea"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your video..."
                rows={4}
                className="resize-none border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:border-cinema-red/60"
                required
              />
            </div>

            {/* Price + Category row */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label
                  htmlFor="sub-price"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Price (ICP) *
                </Label>
                <Input
                  id="sub-price"
                  data-ocid="submit.price_input"
                  type="number"
                  min={0}
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="e.g. 5"
                  className="border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:border-cinema-red/60"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label
                  htmlFor="sub-category"
                  className="text-sm font-medium text-muted-foreground"
                >
                  Category *
                </Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger
                    id="sub-category"
                    data-ocid="submit.category_select"
                    className="border-border bg-background text-foreground focus:border-cinema-red/60"
                  >
                    <SelectValue placeholder="Select category" />
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
            </div>

            {/* View Duration After Payment */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                View Duration After Payment
              </Label>
              <p className="text-xs text-muted-foreground/50">
                How long viewers can access your video after paying
              </p>
              <div className="grid grid-cols-5 gap-2">
                {[
                  {
                    label: "Years",
                    value: durYears,
                    setter: setDurYears,
                    ocid: "submit.duration_years_input",
                  },
                  {
                    label: "Months",
                    value: durMonths,
                    setter: setDurMonths,
                    ocid: "submit.duration_months_input",
                  },
                  {
                    label: "Days",
                    value: durDays,
                    setter: setDurDays,
                    ocid: "submit.duration_days_input",
                  },
                  {
                    label: "Hours",
                    value: durHours,
                    setter: setDurHours,
                    ocid: "submit.duration_hours_input",
                  },
                  {
                    label: "Minutes",
                    value: durMinutes,
                    setter: setDurMinutes,
                    ocid: "submit.duration_minutes_input",
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
                durYears,
                durMonths,
                durDays,
                durHours,
                durMinutes,
              ) && (
                <p className="text-xs text-cinema-red/80">
                  →{" "}
                  {buildDurationString(
                    durYears,
                    durMonths,
                    durDays,
                    durHours,
                    durMinutes,
                  )}
                </p>
              )}
            </div>

            {/* Creator Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="sub-creator"
                className="text-sm font-medium text-muted-foreground"
              >
                Creator Name (displayed publicly) *
              </Label>
              <Input
                id="sub-creator"
                data-ocid="submit.creator_name_input"
                value={creatorName}
                onChange={(e) => setCreatorName(e.target.value)}
                placeholder="Your name or handle..."
                className="border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:border-cinema-red/60"
                required
              />
            </div>

            {/* ICP Payment Address */}
            <div className="space-y-1.5">
              <Label
                htmlFor="sub-payment"
                className="text-sm font-medium text-muted-foreground"
              >
                ICP Payment Address (PID or Account ID) *
              </Label>
              <Input
                id="sub-payment"
                data-ocid="submit.payment_address_input"
                value={paymentAddress}
                onChange={(e) => setPaymentAddress(e.target.value)}
                placeholder="Enter your ICP principal ID or account ID..."
                className="border-border bg-background text-foreground placeholder:text-muted-foreground/40 focus:border-cinema-red/60 font-mono text-sm"
                required
              />
              <p className="text-xs text-muted-foreground/50">
                This is where your 90% revenue share will be sent.
              </p>
            </div>

            <Button
              data-ocid="submit.submit_button"
              type="submit"
              disabled={
                submitVideo.isPending ||
                videoUpload.isUploading ||
                isActorBuilding
              }
              className="w-full bg-cinema-red text-white hover:bg-cinema-red-dim"
            >
              {isActorBuilding ? (
                <>
                  <Loader2 size={15} className="mr-2 animate-spin" />
                  Setting up session...
                </>
              ) : submitVideo.isPending ? (
                <>
                  <Loader2 size={15} className="mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Video for Review"
              )}
            </Button>
          </form>
        </motion.div>

        {/* Divider */}
        <Separator className="my-10 border-border/50" />

        {/* My Submissions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <h2 className="font-display text-xl font-bold text-foreground mb-4">
            My Submissions
          </h2>

          {isLoadingSubmissions ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg bg-muted" />
              ))}
            </div>
          ) : !submissions || submissions.length === 0 ? (
            <div
              data-ocid="submit.submissions_empty_state"
              className="flex flex-col items-center justify-center rounded-xl border border-border/60 bg-card py-14 text-center"
            >
              <Film
                size={36}
                className="mb-3 text-muted-foreground/30"
                strokeWidth={1}
              />
              <p className="text-sm text-muted-foreground">
                You haven't submitted any videos yet.
              </p>
            </div>
          ) : (
            <div
              data-ocid="submit.submissions_list"
              className="overflow-hidden rounded-xl border border-border/60"
            >
              <Table>
                <TableHeader>
                  <TableRow className="border-border/60 bg-muted/30 hover:bg-muted/30">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Title
                    </TableHead>
                    <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                      Category
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </TableHead>
                    <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                      Submitted
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((sub, index) => (
                    <TableRow
                      key={sub.id.toString()}
                      data-ocid={`submit.submissions_list.item.${index + 1}`}
                      className="border-border/40 bg-card hover:bg-muted/10 transition-colors"
                    >
                      <TableCell>
                        <p className="font-medium text-foreground text-sm truncate max-w-[160px] md:max-w-xs">
                          {sub.title}
                        </p>
                        <p className="text-xs text-muted-foreground/60 mt-0.5 truncate max-w-[160px] md:max-w-xs">
                          by {sub.creatorName}
                        </p>
                        {sub.status === "Denied" && (
                          <Button
                            data-ocid={`submit.view_reason_button.${index + 1}`}
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setViewingDenialReason(sub.denialReason ?? "")
                            }
                            className="mt-1 h-6 gap-1 px-1.5 text-xs text-cinema-red hover:bg-cinema-red/10 hover:text-cinema-red"
                          >
                            <MessageSquare size={11} />
                            View Reason
                          </Button>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {sub.category}
                        </span>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={sub.status} />
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {formatDate(sub.createdAt)}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </motion.div>
        {/* ── Denial Reason Dialog ── */}
        <Dialog
          data-ocid="submit.denial_reason_dialog"
          open={viewingDenialReason !== null}
          onOpenChange={(open) => {
            if (!open) setViewingDenialReason(null);
          }}
        >
          <DialogContent className="sm:max-w-md border border-border/60 bg-card">
            <DialogHeader>
              <DialogTitle className="font-display text-lg text-foreground">
                Submission Denied
              </DialogTitle>
            </DialogHeader>
            <div className="mt-2 rounded-lg border border-border/40 bg-background/50 p-4">
              {viewingDenialReason ? (
                <p className="text-sm text-foreground leading-relaxed">
                  {viewingDenialReason}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">
                  No reason was provided for this denial.
                </p>
              )}
            </div>
            <DialogFooter className="mt-2">
              <Button
                data-ocid="submit.denial_reason_close_button"
                onClick={() => setViewingDenialReason(null)}
                className="bg-cinema-red text-white hover:bg-cinema-red-dim"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  );
}
