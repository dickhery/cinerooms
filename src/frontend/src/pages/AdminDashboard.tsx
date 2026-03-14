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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "@tanstack/react-router";
import {
  Check,
  ChevronDown,
  ChevronUp,
  Code2,
  Copy,
  Eye,
  Film,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Tv2,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { HomepageScript, Room, VideoSubmission } from "../backend.d";
import { RoomForm } from "../components/cinema/RoomForm";
import { useAdmin } from "../contexts/AdminContext";
import {
  useAddHomepageScript,
  useDeleteRoom,
  useGetHomepageScripts,
  useGetPendingSubmissions,
  useGetRooms,
  useRemoveHomepageScript,
  useReorderHomepageScripts,
  useReviewSubmission,
  useUpdateHomepageScript,
} from "../hooks/useQueries";

function formatDate(timestamp: bigint): string {
  const ms = Number(timestamp / BigInt(1_000_000));
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(ms));
}

function SubmissionStatusBadge({ status }: { status: string }) {
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

export function AdminDashboard() {
  const navigate = useNavigate();
  const { isAdmin, isCheckingAdmin } = useAdmin();
  const { data: rooms, isLoading } = useGetRooms();
  const { data: pendingSubmissions, isLoading: isLoadingSubmissions } =
    useGetPendingSubmissions();
  const deleteRoom = useDeleteRoom();
  const reviewSubmission = useReviewSubmission();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [deletingRoom, setDeletingRoom] = useState<Room | null>(null);
  const [reviewingId, setReviewingId] = useState<bigint | null>(null);
  const [approvingSubmission, setApprovingSubmission] =
    useState<VideoSubmission | null>(null);
  const [approveEmbedScript, setApproveEmbedScript] = useState("");
  // State for the content preview modal
  const [previewingSubmission, setPreviewingSubmission] =
    useState<VideoSubmission | null>(null);

  // State for deny dialog
  const [showDenyDialog, setShowDenyDialog] = useState(false);
  const [denyingSubmissionId, setDenyingSubmissionId] = useState<bigint | null>(
    null,
  );
  const [denyReason, setDenyReason] = useState("");

  // ── Homepage Scripts state ──────────────────────────────────────────────────
  const { data: homepageScripts } = useGetHomepageScripts();
  const addScript = useAddHomepageScript();
  const updateScript = useUpdateHomepageScript();
  const removeScript = useRemoveHomepageScript();
  const reorderScripts = useReorderHomepageScripts();

  const [showAddScriptDialog, setShowAddScriptDialog] = useState(false);
  const [editingScript, setEditingScript] = useState<HomepageScript | null>(
    null,
  );
  const [deletingScript, setDeletingScript] = useState<HomepageScript | null>(
    null,
  );
  const [scriptName, setScriptName] = useState("");
  const [scriptContent, setScriptContent] = useState("");

  const handleSaveScript = async () => {
    if (!scriptName.trim() || !scriptContent.trim()) {
      toast.error("Name and script content are required.");
      return;
    }
    try {
      if (editingScript) {
        await updateScript.mutateAsync({
          id: editingScript.id,
          name: scriptName.trim(),
          scriptContent: scriptContent.trim(),
        });
        toast.success("Script updated.");
        setEditingScript(null);
      } else {
        await addScript.mutateAsync({
          name: scriptName.trim(),
          scriptContent: scriptContent.trim(),
        });
        toast.success("Script added.");
        setShowAddScriptDialog(false);
      }
      setScriptName("");
      setScriptContent("");
    } catch (err: any) {
      console.error("Homepage script operation failed:", err);
      toast.error(err?.message || "Failed to save script.");
    }
  };

  const handleDeleteScript = async () => {
    if (!deletingScript) return;
    try {
      await removeScript.mutateAsync(deletingScript.id);
      toast.success(`"${deletingScript.name}" removed.`);
      setDeletingScript(null);
    } catch (err: any) {
      console.error("Homepage script operation failed:", err);
      toast.error(err?.message || "Failed to remove script.");
    }
  };

  const handleMoveScript = async (index: number, direction: "up" | "down") => {
    if (!homepageScripts) return;
    const sorted = [...homepageScripts].sort((a, b) =>
      Number(a.order - b.order),
    );
    const swapIndex = direction === "up" ? index - 1 : index + 1;
    if (swapIndex < 0 || swapIndex >= sorted.length) return;
    const newOrder = sorted.map((s) => s.id);
    [newOrder[index], newOrder[swapIndex]] = [
      newOrder[swapIndex],
      newOrder[index],
    ];
    try {
      await reorderScripts.mutateAsync(newOrder);
    } catch (err: any) {
      console.error("Homepage script operation failed:", err);
      toast.error(err?.message || "Failed to reorder scripts.");
    }
  };

  // Guard: redirect if not admin
  useEffect(() => {
    if (!isCheckingAdmin && !isAdmin) {
      void navigate({ to: "/" });
    }
  }, [isAdmin, isCheckingAdmin, navigate]);

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
      console.warn("Paywall cleanup on non-room page (safe):", err);
    }
  }, []);

  const handleDelete = async () => {
    if (!deletingRoom) return;
    try {
      await deleteRoom.mutateAsync(deletingRoom.id);
      toast.success(`"${deletingRoom.title}" deleted`);
      setDeletingRoom(null);
    } catch {
      toast.error("Failed to delete room");
    }
  };

  const handleReview = async (
    id: bigint,
    approve: boolean,
    embedScript?: string,
    denialReason?: string,
  ) => {
    setReviewingId(id);
    try {
      await reviewSubmission.mutateAsync({
        id,
        approve,
        embedScript,
        denialReason,
      });
      toast.success(approve ? "Submission approved!" : "Submission denied.");
      setApprovingSubmission(null);
      setApproveEmbedScript("");
    } catch {
      toast.error("Failed to update submission");
    } finally {
      setReviewingId(null);
    }
  };

  if (isCheckingAdmin || (!isAdmin && !isCheckingAdmin)) {
    return (
      <main className="flex min-h-screen items-center justify-center pt-16">
        <Loader2 className="animate-spin text-cinema-red" size={28} />
      </main>
    );
  }

  const pendingCount = pendingSubmissions?.filter(
    (s) => s.status === "Pending",
  ).length;

  return (
    <main className="min-h-screen pt-16">
      <div className="container mx-auto px-4 py-8 md:px-6 md:py-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <h1 className="font-display text-3xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage your CineRooms screening rooms and review submissions
          </p>
        </motion.div>

        {/* Tabs */}
        <Tabs defaultValue="rooms">
          <TabsList className="mb-6 border border-border/60 bg-card">
            <TabsTrigger
              data-ocid="admin.rooms_tab"
              value="rooms"
              className="data-[state=active]:bg-cinema-red data-[state=active]:text-white"
            >
              Rooms
            </TabsTrigger>
            <TabsTrigger
              data-ocid="admin.submissions_tab"
              value="submissions"
              className="data-[state=active]:bg-cinema-red data-[state=active]:text-white"
            >
              Pending Submissions
              {pendingCount != null && pendingCount > 0 && (
                <span className="ml-2 rounded-full bg-cinema-red/80 px-1.5 py-0.5 text-[10px] font-bold text-white data-[state=active]:bg-white data-[state=active]:text-cinema-red">
                  {pendingCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger
              data-ocid="admin.scripts_tab"
              value="scripts"
              className="data-[state=active]:bg-cinema-red data-[state=active]:text-white"
            >
              <Code2 size={14} className="mr-1.5" />
              Homepage Scripts
            </TabsTrigger>
          </TabsList>

          {/* ── Tab 1: Rooms ── */}
          <TabsContent value="rooms">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="font-display text-lg font-semibold text-foreground">
                All Rooms
              </h2>
              <Button
                data-ocid="admin.create_room_button"
                onClick={() => setShowCreateForm(true)}
                className="gap-2 bg-cinema-red text-white hover:bg-cinema-red-dim"
              >
                <Plus size={16} />
                Create New Room
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }, (_, i) => `admin-skel-${i}`).map(
                  (id) => (
                    <Skeleton
                      key={id}
                      className="h-20 w-full rounded-lg bg-muted"
                    />
                  ),
                )}
              </div>
            ) : !rooms || rooms.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-card py-20 text-center"
              >
                <Tv2
                  size={40}
                  className="mb-4 text-muted-foreground/30"
                  strokeWidth={1}
                />
                <h3 className="font-display text-lg font-semibold text-muted-foreground">
                  No rooms yet
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground/60">
                  Create your first room to get started.
                </p>
                <Button
                  onClick={() => setShowCreateForm(true)}
                  className="mt-5 gap-2 bg-cinema-red text-white hover:bg-cinema-red-dim"
                  size="sm"
                >
                  <Plus size={14} />
                  Create Room
                </Button>
              </motion.div>
            ) : (
              <motion.div
                data-ocid="admin.rooms_table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="overflow-hidden rounded-lg border border-border/60"
              >
                <table className="w-full text-sm">
                  <thead className="border-b border-border/60 bg-muted/30">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Room
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                        Price
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                        Category
                      </th>
                      <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                        Slug
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {rooms.map((room, index) => (
                      <motion.tr
                        key={room.id.toString()}
                        data-ocid={`admin.rooms_table.row.${index + 1}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.04 }}
                        className="bg-card hover:bg-muted/20 transition-colors"
                      >
                        {/* Thumbnail + title */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="h-12 w-20 shrink-0 overflow-hidden rounded bg-muted">
                              {room.thumbnailUrl ? (
                                <img
                                  src={room.thumbnailUrl}
                                  alt={room.title}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                  <Tv2
                                    size={16}
                                    className="text-muted-foreground/30"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-foreground truncate">
                                {room.title}
                              </p>
                              {room.description && (
                                <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1">
                                  {room.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        {/* Price */}
                        <td className="hidden px-4 py-3 md:table-cell">
                          {room.price ? (
                            <Badge
                              variant="outline"
                              className="border-cinema-red/30 text-cinema-red"
                            >
                              {room.price}
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground/40">—</span>
                          )}
                        </td>
                        {/* Category */}
                        <td className="hidden px-4 py-3 lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {room.category || "—"}
                          </span>
                        </td>
                        {/* Slug */}
                        <td className="hidden px-4 py-3 lg:table-cell">
                          <code className="font-mono text-xs text-muted-foreground/60">
                            {room.slug}
                          </code>
                        </td>
                        {/* Actions */}
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              data-ocid={`admin.edit_button.${index + 1}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingRoom(room)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                            >
                              <Pencil size={14} />
                            </Button>
                            <Button
                              data-ocid={`admin.delete_button.${index + 1}`}
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingRoom(room)}
                              className="h-8 w-8 p-0 text-muted-foreground hover:text-cinema-red"
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </motion.div>
            )}
          </TabsContent>

          {/* ── Tab 2: Pending Submissions ── */}
          <TabsContent value="submissions">
            <div className="mb-5">
              <h2 className="font-display text-lg font-semibold text-foreground">
                Video Submissions Review
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Review, approve, or deny user-submitted videos.
              </p>
            </div>

            {isLoadingSubmissions ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton
                    key={i}
                    className="h-16 w-full rounded-lg bg-muted"
                  />
                ))}
              </div>
            ) : !pendingSubmissions || pendingSubmissions.length === 0 ? (
              <motion.div
                data-ocid="admin.submissions_empty_state"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-card py-20 text-center"
              >
                <Tv2
                  size={40}
                  className="mb-4 text-muted-foreground/30"
                  strokeWidth={1}
                />
                <h3 className="font-display text-lg font-semibold text-muted-foreground">
                  No submissions yet
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground/60">
                  User-submitted videos will appear here for review.
                </p>
              </motion.div>
            ) : (
              <motion.div
                data-ocid="admin.submissions_table"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="overflow-hidden rounded-lg border border-border/60"
              >
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/60 bg-muted/30 hover:bg-muted/30">
                      {/* NEW: thumbnail column */}
                      <TableHead className="w-[72px] text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden sm:table-cell">
                        Preview
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Title / Creator
                      </TableHead>
                      <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground sm:table-cell">
                        Category
                      </TableHead>
                      <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                        Price
                      </TableHead>
                      <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground md:table-cell">
                        Duration
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Status
                      </TableHead>
                      <TableHead className="hidden text-xs font-semibold uppercase tracking-wider text-muted-foreground lg:table-cell">
                        Submitted
                      </TableHead>
                      <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground text-right">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingSubmissions.map((sub, index) => (
                      <TableRow
                        key={sub.id.toString()}
                        data-ocid={`admin.submissions_table.row.${index + 1}`}
                        className="border-border/40 bg-card hover:bg-muted/10 transition-colors"
                      >
                        {/* NEW: thumbnail cell */}
                        <TableCell className="hidden sm:table-cell">
                          <button
                            data-ocid={`admin.submission_preview_button.${index + 1}`}
                            type="button"
                            onClick={() => setPreviewingSubmission(sub)}
                            className="group relative h-12 w-20 shrink-0 overflow-hidden rounded bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-cinema-red/60"
                            title="Preview video"
                          >
                            {sub.thumbnailUrl ? (
                              <img
                                src={sub.thumbnailUrl}
                                alt={sub.title}
                                className="h-full w-full object-cover transition-opacity group-hover:opacity-70"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center">
                                <Film
                                  size={16}
                                  className="text-muted-foreground/30"
                                />
                              </div>
                            )}
                            {/* Play overlay hint */}
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                              <Eye size={14} className="text-white" />
                            </div>
                          </button>
                        </TableCell>

                        <TableCell>
                          <p className="font-medium text-foreground text-sm truncate max-w-[160px] md:max-w-xs">
                            {sub.title}
                          </p>
                          <p className="text-xs text-muted-foreground/60 mt-0.5">
                            by {sub.creatorName}
                          </p>
                          {sub.description && (
                            <p className="text-xs text-muted-foreground/50 mt-0.5 line-clamp-1 max-w-xs hidden lg:block">
                              {sub.description}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {sub.category}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {sub.price}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <span className="text-sm text-muted-foreground">
                            {sub.viewDuration}
                          </span>
                        </TableCell>
                        <TableCell>
                          <SubmissionStatusBadge status={sub.status} />
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {formatDate(sub.createdAt)}
                          </span>
                        </TableCell>
                        <TableCell>
                          {sub.status === "Pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              {/* NEW: standalone preview button for mobile (no thumbnail column) */}
                              <Button
                                data-ocid={`admin.submission_preview_icon_button.${index + 1}`}
                                size="sm"
                                variant="ghost"
                                onClick={() => setPreviewingSubmission(sub)}
                                className="h-8 w-8 p-0 border border-border/50 text-muted-foreground hover:text-foreground sm:hidden"
                                title="Preview video"
                              >
                                <Eye size={13} />
                              </Button>
                              <Button
                                data-ocid={`admin.submission_approve_button.${index + 1}`}
                                size="sm"
                                variant="ghost"
                                disabled={reviewingId === sub.id}
                                onClick={() => {
                                  setApprovingSubmission(sub);
                                  setApproveEmbedScript("");
                                }}
                                className="h-8 gap-1.5 border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300"
                              >
                                {reviewingId === sub.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <Check size={12} />
                                )}
                                Approve
                              </Button>
                              <Button
                                data-ocid={`admin.submission_deny_button.${index + 1}`}
                                size="sm"
                                variant="ghost"
                                disabled={reviewingId === sub.id}
                                onClick={() => {
                                  setDenyingSubmissionId(sub.id);
                                  setDenyReason("");
                                  setShowDenyDialog(true);
                                }}
                                className="h-8 gap-1.5 border border-cinema-red/30 bg-cinema-red/10 text-cinema-red hover:bg-cinema-red/20"
                              >
                                {reviewingId === sub.id ? (
                                  <Loader2 size={12} className="animate-spin" />
                                ) : (
                                  <X size={12} />
                                )}
                                Deny
                              </Button>
                            </div>
                          ) : (
                            <div className="flex justify-end">
                              <span className="text-xs text-muted-foreground/40">
                                Reviewed
                              </span>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </motion.div>
            )}
          </TabsContent>

          {/* ── Tab 3: Homepage Scripts ── */}
          <TabsContent value="scripts">
            <div className="mb-5 flex items-center justify-between">
              <div>
                <h2 className="font-display text-lg font-semibold text-foreground">
                  Homepage Scripts
                </h2>
                <p className="mt-0.5 text-xs text-muted-foreground/70">
                  Scripts are injected into the page &lt;head&gt; in order when
                  users visit the homepage.
                </p>
              </div>
              <Button
                data-ocid="admin.add_script_button"
                onClick={() => {
                  setScriptName("");
                  setScriptContent("");
                  setShowAddScriptDialog(true);
                }}
                className="gap-2 bg-cinema-red text-white hover:bg-cinema-red-dim"
              >
                <Plus size={16} />
                Add Script
              </Button>
            </div>

            {/* Recommended Script Providers */}
            <div className="rounded-xl border border-border/60 bg-card/60 p-4">
              <h3 className="mb-3 text-sm font-semibold text-foreground/80">
                Recommended Script Providers
              </h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a
                  href="https://4kz7m-7iaaa-aaaab-adm5a-cai.icp0.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col overflow-hidden rounded-lg border border-border/50 bg-background/40 transition-all hover:border-cinema-red/50 hover:shadow-md"
                >
                  <img
                    src="/assets/uploads/IC-Paywall-1-2.jpeg"
                    alt="IC Paywall"
                    className="max-h-20 sm:max-h-28 w-auto object-contain mx-auto block"
                  />
                  <div className="p-3 sm:p-4">
                    <p className="text-xs font-semibold text-foreground group-hover:text-cinema-red">
                      IC Paywall
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                      Add paywalls to room pages or the homepage
                    </p>
                  </div>
                </a>
                <a
                  href="https://thowo-iqaaa-aaaab-ac3wa-cai.icp0.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex flex-col overflow-hidden rounded-lg border border-border/50 bg-background/40 transition-all hover:border-cinema-red/50 hover:shadow-md"
                >
                  <img
                    src="/assets/uploads/IC-Ping-1-1.jpeg"
                    alt="IC Ping"
                    className="max-h-20 sm:max-h-28 w-auto object-contain mx-auto block"
                  />
                  <div className="p-3 sm:p-4">
                    <p className="text-xs font-semibold text-foreground group-hover:text-cinema-red">
                      IC Ping
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground/70">
                      Add a contact form or chatroom to your homepage
                    </p>
                  </div>
                </a>
              </div>
            </div>

            {!homepageScripts || homepageScripts.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                data-ocid="admin.scripts_empty_state"
                className="flex flex-col items-center justify-center rounded-lg border border-border/60 bg-card py-20 text-center"
              >
                <Code2
                  size={40}
                  className="mb-4 text-muted-foreground/30"
                  strokeWidth={1}
                />
                <h3 className="font-display text-lg font-semibold text-muted-foreground">
                  No homepage scripts
                </h3>
                <p className="mt-1.5 text-sm text-muted-foreground/60">
                  Add a script to inject custom code into the homepage head.
                </p>
                <Button
                  onClick={() => {
                    setScriptName("");
                    setScriptContent("");
                    setShowAddScriptDialog(true);
                  }}
                  className="mt-5 gap-2 bg-cinema-red text-white hover:bg-cinema-red-dim"
                  size="sm"
                >
                  <Plus size={14} />
                  Add First Script
                </Button>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-3"
              >
                {[...homepageScripts]
                  .sort((a, b) => Number(a.order - b.order))
                  .map((script, index, arr) => (
                    <div
                      key={script.id.toString()}
                      data-ocid={`admin.scripts_list.item.${index + 1}`}
                      className="flex items-center gap-3 rounded-lg border border-border/60 bg-card px-4 py-3 transition-colors hover:border-border"
                    >
                      {/* Reorder buttons */}
                      <div className="flex flex-col gap-0.5">
                        <button
                          data-ocid={`admin.script_move_up_button.${index + 1}`}
                          type="button"
                          disabled={index === 0 || reorderScripts.isPending}
                          onClick={() => void handleMoveScript(index, "up")}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                          title="Move up"
                        >
                          <ChevronUp size={14} />
                        </button>
                        <button
                          data-ocid={`admin.script_move_down_button.${index + 1}`}
                          type="button"
                          disabled={
                            index === arr.length - 1 || reorderScripts.isPending
                          }
                          onClick={() => void handleMoveScript(index, "down")}
                          className="flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30"
                          title="Move down"
                        >
                          <ChevronDown size={14} />
                        </button>
                      </div>

                      {/* Script info */}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {script.name}
                        </p>
                        <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground/60">
                          {script.scriptContent.slice(0, 80)}
                          {script.scriptContent.length > 80 ? "…" : ""}
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex shrink-0 gap-1.5">
                        <Button
                          data-ocid={`admin.script_edit_button.${index + 1}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setEditingScript(script);
                            setScriptName(script.name);
                            setScriptContent(script.scriptContent);
                          }}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          title="Edit script"
                        >
                          <Pencil size={14} />
                        </Button>
                        <Button
                          data-ocid={`admin.script_delete_button.${index + 1}`}
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeletingScript(script)}
                          className="h-8 w-8 p-0 text-muted-foreground hover:text-cinema-red"
                          title="Delete script"
                        >
                          <Trash2 size={14} />
                        </Button>
                      </div>
                    </div>
                  ))}
              </motion.div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Create room form */}
      <RoomForm
        open={showCreateForm}
        onClose={() => setShowCreateForm(false)}
      />

      {/* Edit room form */}
      <RoomForm
        room={editingRoom}
        open={!!editingRoom}
        onClose={() => setEditingRoom(null)}
      />

      {/* ── NEW: Content Preview Modal ── */}
      <Dialog
        open={!!previewingSubmission}
        onOpenChange={(open) => {
          if (!open) setPreviewingSubmission(null);
        }}
      >
        <DialogContent className="border-border bg-card sm:max-w-2xl p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-0">
            <DialogTitle className="font-display text-foreground">
              Content Preview
            </DialogTitle>
          </DialogHeader>

          <div className="px-6 pb-6 pt-4 space-y-4 max-h-[80vh] overflow-y-auto">
            {/* Video player */}
            <div className="w-full overflow-hidden rounded-lg bg-black aspect-video">
              {previewingSubmission?.videoUrl ? (
                // biome-ignore lint/a11y/useMediaCaption: user-uploaded content; captions not available
                <video
                  src={previewingSubmission.videoUrl}
                  controls
                  className="w-full h-full"
                  preload="metadata"
                  playsInline
                />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground/40 gap-2">
                  <Film size={24} strokeWidth={1.5} />
                  <span className="text-sm">No video uploaded</span>
                </div>
              )}
            </div>

            {/* Thumbnail + meta */}
            <div className="flex gap-4">
              {/* Thumbnail */}
              <div className="hidden sm:block h-24 w-40 shrink-0 overflow-hidden rounded-md bg-muted">
                {previewingSubmission?.thumbnailUrl ? (
                  <img
                    src={previewingSubmission.thumbnailUrl}
                    alt={previewingSubmission.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <Film size={20} className="text-muted-foreground/30" />
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="min-w-0 flex-1 space-y-1.5">
                <h3 className="font-display font-semibold text-foreground text-lg leading-tight">
                  {previewingSubmission?.title}
                </h3>
                <p className="text-sm text-muted-foreground">
                  by{" "}
                  <span className="text-foreground/80 font-medium">
                    {previewingSubmission?.creatorName}
                  </span>
                </p>
                <div className="flex flex-wrap gap-2 pt-0.5">
                  <Badge
                    variant="outline"
                    className="border-border/60 text-muted-foreground text-xs"
                  >
                    {previewingSubmission?.category}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-cinema-red/30 text-cinema-red text-xs"
                  >
                    {previewingSubmission?.price} ICP
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-border/60 text-muted-foreground text-xs"
                  >
                    {previewingSubmission?.viewDuration ?? ""}
                    access
                  </Badge>
                </div>
              </div>
            </div>

            {/* Description */}
            {previewingSubmission?.description && (
              <div className="rounded-md border border-border/50 bg-muted/20 px-4 py-3">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Description
                </p>
                <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {previewingSubmission.description}
                </p>
              </div>
            )}

            {/* Payment address */}
            <div className="rounded-md border border-border/50 bg-muted/20 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                ICP Payment Address
              </p>
              <div className="flex items-center gap-2">
                <code className="flex-1 block truncate font-mono text-xs text-muted-foreground">
                  {previewingSubmission?.paymentAddress || "Not provided"}
                </code>
                {previewingSubmission?.paymentAddress && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const addr = previewingSubmission?.paymentAddress;
                      if (addr) {
                        void navigator.clipboard
                          .writeText(addr)
                          .then(() => toast.success("Copied to clipboard!"));
                      }
                    }}
                    className="h-7 w-7 shrink-0 p-0 text-muted-foreground hover:text-foreground"
                    title="Copy payment address"
                  >
                    <Copy size={12} />
                  </Button>
                )}
              </div>
            </div>

            {/* Submitted on */}
            <p className="text-xs text-muted-foreground/50">
              Submitted{" "}
              {previewingSubmission
                ? formatDate(previewingSubmission.createdAt)
                : ""}
            </p>
          </div>

          <DialogFooter className="px-6 pb-5 gap-2 border-t border-border/40 pt-4">
            <Button
              data-ocid="admin.preview_close_button"
              variant="ghost"
              onClick={() => setPreviewingSubmission(null)}
              className="border border-border/50 text-muted-foreground hover:text-foreground"
            >
              Close
            </Button>
            {previewingSubmission?.status === "Pending" && (
              <>
                <Button
                  data-ocid="admin.preview_deny_button"
                  variant="ghost"
                  disabled={reviewingId === previewingSubmission.id}
                  onClick={() => {
                    setDenyingSubmissionId(previewingSubmission.id);
                    setDenyReason("");
                    setShowDenyDialog(true);
                    setPreviewingSubmission(null);
                  }}
                  className="gap-1.5 border border-cinema-red/30 bg-cinema-red/10 text-cinema-red hover:bg-cinema-red/20"
                >
                  <X size={13} />
                  Deny
                </Button>
                <Button
                  data-ocid="admin.preview_approve_button"
                  disabled={reviewingId === previewingSubmission.id}
                  onClick={() => {
                    setApprovingSubmission(previewingSubmission);
                    setApproveEmbedScript("");
                    setPreviewingSubmission(null);
                  }}
                  className="gap-1.5 bg-emerald-600 text-white hover:bg-emerald-500"
                >
                  <Check size={13} />
                  Approve
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve submission modal */}
      <Dialog
        data-ocid="admin.approve_dialog"
        open={!!approvingSubmission}
        onOpenChange={(open) => {
          if (!open) {
            setApprovingSubmission(null);
            setApproveEmbedScript("");
          }
        }}
      >
        <DialogContent className="border-border bg-card sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">
              Approve Submission
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-1">
            {/* NEW: thumbnail + video preview strip inside approve modal */}
            {(approvingSubmission?.thumbnailUrl ||
              approvingSubmission?.videoUrl) && (
              <div className="flex gap-3 rounded-md border border-border/50 bg-muted/20 p-3">
                {approvingSubmission.thumbnailUrl && (
                  <div className="h-16 w-28 shrink-0 overflow-hidden rounded bg-muted">
                    <img
                      src={approvingSubmission.thumbnailUrl}
                      alt={approvingSubmission.title}
                      className="h-full w-full object-cover"
                    />
                  </div>
                )}
                {approvingSubmission.videoUrl && (
                  <div className="flex-1 overflow-hidden rounded bg-black">
                    {/* biome-ignore lint/a11y/useMediaCaption: user-uploaded content; captions not available */}
                    <video
                      src={approvingSubmission.videoUrl}
                      controls
                      className="h-16 w-full object-contain"
                      preload="metadata"
                      playsInline
                    />
                  </div>
                )}
              </div>
            )}

            {/* Summary */}
            <div className="rounded-md border border-border/50 bg-muted/20 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                Approving:{" "}
                <span className="font-semibold text-foreground">
                  {approvingSubmission?.title}
                </span>{" "}
                by{" "}
                <span className="font-medium text-foreground/80">
                  {approvingSubmission?.creatorName}
                </span>
              </p>
            </div>

            {/* Creator's ICP Payment Address */}
            <div className="space-y-1.5">
              <p className="text-sm font-medium text-foreground">
                Creator&apos;s ICP Payment Address
              </p>
              <div className="flex items-center gap-2">
                <div className="flex-1 overflow-hidden rounded-md border border-border/60 bg-background/60 px-3 py-2">
                  <code className="block truncate font-mono text-xs text-muted-foreground">
                    {approvingSubmission?.paymentAddress || "Not provided"}
                  </code>
                </div>
                <Button
                  data-ocid="admin.approve_payment_address_copy_button"
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const addr = approvingSubmission?.paymentAddress;
                    if (addr) {
                      void navigator.clipboard
                        .writeText(addr)
                        .then(() => toast.success("Copied to clipboard!"));
                    }
                  }}
                  disabled={!approvingSubmission?.paymentAddress}
                  className="h-9 w-9 shrink-0 border border-border/50 p-0 text-muted-foreground hover:border-cinema-red/40 hover:text-foreground"
                  title="Copy payment address"
                >
                  <Copy size={13} />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/60">
                Send the creator&apos;s 90% revenue share to this address.
              </p>
            </div>

            {/* Embed script field */}
            <div className="space-y-1.5">
              <label
                htmlFor="approve-embed-script"
                className="text-sm font-medium text-foreground"
              >
                Embed Script{" "}
                <span className="text-muted-foreground font-normal">
                  (optional)
                </span>
              </label>
              <Textarea
                id="approve-embed-script"
                data-ocid="admin.approve_embed_script_textarea"
                value={approveEmbedScript}
                onChange={(e) => setApproveEmbedScript(e.target.value)}
                placeholder="Paste your embed script here (HTML/JS)..."
                rows={6}
                className="resize-none border-border/60 bg-background/60 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-cinema-red/40"
              />
              <p className="text-xs text-muted-foreground/60">
                This script will only run on this room&apos;s page (e.g. IC
                Paywall integration).
              </p>
              <p className="mt-1 text-xs text-muted-foreground/60">
                Need a paywall script? Get one from{" "}
                <a
                  href="https://4kz7m-7iaaa-aaaab-adm5a-cai.icp0.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                >
                  <img
                    src="/assets/uploads/IC-Paywall-1-2.jpeg"
                    alt="IC Paywall"
                    className="inline-block h-4 rounded"
                  />
                  IC Paywall
                </a>
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              data-ocid="admin.approve_cancel_button"
              variant="ghost"
              onClick={() => {
                setApprovingSubmission(null);
                setApproveEmbedScript("");
              }}
              className="border border-border/50 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.approve_confirm_button"
              disabled={
                approvingSubmission !== null &&
                reviewingId === approvingSubmission.id
              }
              onClick={() => {
                if (approvingSubmission) {
                  void handleReview(
                    approvingSubmission.id,
                    true,
                    approveEmbedScript,
                  );
                }
              }}
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-500"
            >
              {approvingSubmission !== null &&
              reviewingId === approvingSubmission.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog
        open={!!deletingRoom}
        onOpenChange={(open) => {
          if (!open) setDeletingRoom(null);
        }}
      >
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Delete Room
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to delete{" "}
              <strong className="text-foreground">
                &ldquo;{deletingRoom?.title}&rdquo;
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="admin.delete_cancel_button"
              className="border-border text-muted-foreground hover:text-foreground"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="admin.delete_confirm_button"
              onClick={handleDelete}
              className="bg-cinema-red text-white hover:bg-cinema-red-dim"
              disabled={deleteRoom.isPending}
            >
              {deleteRoom.isPending ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : null}
              Delete Room
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Add Script Dialog ── */}
      <Dialog
        open={showAddScriptDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowAddScriptDialog(false);
            setScriptName("");
            setScriptContent("");
          }
        }}
      >
        <DialogContent className="border-border bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">
              Add Homepage Script
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="script-name"
                className="text-sm font-medium text-foreground"
              >
                Script Name <span className="text-cinema-red">*</span>
              </Label>
              <Input
                id="script-name"
                data-ocid="admin.script_name_input"
                value={scriptName}
                onChange={(e) => setScriptName(e.target.value)}
                placeholder="e.g. Google Analytics, Chat Widget..."
                className="border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-cinema-red/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="script-content"
                className="text-sm font-medium text-foreground"
              >
                Script Content <span className="text-cinema-red">*</span>
              </Label>
              <Textarea
                id="script-content"
                data-ocid="admin.script_content_textarea"
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                placeholder="Paste your HTML/JS script here..."
                rows={10}
                className="resize-none border-border/60 bg-background/60 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-cinema-red/40"
              />
              <p className="text-xs text-muted-foreground/60">
                This script will be injected into the &lt;head&gt; of the
                homepage in order.
              </p>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              data-ocid="admin.script_cancel_button"
              variant="ghost"
              onClick={() => {
                setShowAddScriptDialog(false);
                setScriptName("");
                setScriptContent("");
              }}
              className="border border-border/50 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.script_save_button"
              disabled={addScript.isPending}
              onClick={() => void handleSaveScript()}
              className="gap-2 bg-cinema-red text-white hover:bg-cinema-red-dim"
            >
              {addScript.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Plus size={14} />
              )}
              Add Script
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Script Dialog ── */}
      <Dialog
        open={!!editingScript}
        onOpenChange={(open) => {
          if (!open) {
            setEditingScript(null);
            setScriptName("");
            setScriptContent("");
          }
        }}
      >
        <DialogContent className="border-border bg-card sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="font-display text-foreground">
              Edit Homepage Script
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-script-name"
                className="text-sm font-medium text-foreground"
              >
                Script Name <span className="text-cinema-red">*</span>
              </Label>
              <Input
                id="edit-script-name"
                data-ocid="admin.script_name_input"
                value={scriptName}
                onChange={(e) => setScriptName(e.target.value)}
                placeholder="e.g. Google Analytics, Chat Widget..."
                className="border-border/60 bg-background/60 text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-cinema-red/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label
                htmlFor="edit-script-content"
                className="text-sm font-medium text-foreground"
              >
                Script Content <span className="text-cinema-red">*</span>
              </Label>
              <Textarea
                id="edit-script-content"
                data-ocid="admin.script_content_textarea"
                value={scriptContent}
                onChange={(e) => setScriptContent(e.target.value)}
                placeholder="Paste your HTML/JS script here..."
                rows={10}
                className="resize-none border-border/60 bg-background/60 font-mono text-xs text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-cinema-red/40"
              />
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              data-ocid="admin.script_cancel_button"
              variant="ghost"
              onClick={() => {
                setEditingScript(null);
                setScriptName("");
                setScriptContent("");
              }}
              className="border border-border/50 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.script_save_button"
              disabled={updateScript.isPending}
              onClick={() => void handleSaveScript()}
              className="gap-2 bg-cinema-red text-white hover:bg-cinema-red-dim"
            >
              {updateScript.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Check size={14} />
              )}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Script Confirmation ── */}
      <AlertDialog
        open={!!deletingScript}
        onOpenChange={(open) => {
          if (!open) setDeletingScript(null);
        }}
      >
        <AlertDialogContent className="border-border bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              Remove Script
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground">
              Are you sure you want to remove{" "}
              <strong className="text-foreground">
                &ldquo;{deletingScript?.name}&rdquo;
              </strong>
              ? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              data-ocid="admin.script_delete_cancel_button"
              className="border-border text-muted-foreground hover:text-foreground"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              data-ocid="admin.script_delete_confirm_button"
              onClick={() => void handleDeleteScript()}
              className="bg-cinema-red text-white hover:bg-cinema-red-dim"
              disabled={removeScript.isPending}
            >
              {removeScript.isPending ? (
                <Loader2 size={14} className="mr-1.5 animate-spin" />
              ) : null}
              Remove Script
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {/* ── Deny Submission Dialog ── */}
      <Dialog
        data-ocid="admin.deny_dialog"
        open={showDenyDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowDenyDialog(false);
            setDenyingSubmissionId(null);
            setDenyReason("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md border border-border/60 bg-card">
          <DialogHeader>
            <DialogTitle className="font-display text-lg text-foreground">
              Deny Submission
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Optionally provide a reason for denying this submission. The
              submitter will be able to read this note.
            </p>
          </DialogHeader>
          <div className="mt-2">
            <Textarea
              data-ocid="admin.deny_reason_textarea"
              placeholder="Enter reason for denial (optional)..."
              value={denyReason}
              onChange={(e) => setDenyReason(e.target.value)}
              className="min-h-[100px] border-border/60 bg-background/50 text-sm resize-none"
            />
          </div>
          <DialogFooter className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end mt-2">
            <Button
              data-ocid="admin.deny_cancel_button"
              variant="ghost"
              onClick={() => {
                setShowDenyDialog(false);
                setDenyingSubmissionId(null);
                setDenyReason("");
              }}
              className="border border-border/50"
            >
              Cancel
            </Button>
            <Button
              data-ocid="admin.deny_skip_button"
              variant="ghost"
              disabled={reviewingId === denyingSubmissionId}
              onClick={async () => {
                if (!denyingSubmissionId) return;
                setShowDenyDialog(false);
                await handleReview(denyingSubmissionId, false, undefined, "");
                setDenyingSubmissionId(null);
                setDenyReason("");
              }}
              className="border border-cinema-red/30 bg-cinema-red/10 text-cinema-red hover:bg-cinema-red/20"
            >
              {reviewingId === denyingSubmissionId ? (
                <Loader2 size={13} className="animate-spin mr-1.5" />
              ) : null}
              Deny without reason
            </Button>
            <Button
              data-ocid="admin.deny_confirm_button"
              disabled={reviewingId === denyingSubmissionId}
              onClick={async () => {
                if (!denyingSubmissionId) return;
                setShowDenyDialog(false);
                await handleReview(
                  denyingSubmissionId,
                  false,
                  undefined,
                  denyReason,
                );
                setDenyingSubmissionId(null);
                setDenyReason("");
              }}
              className="bg-cinema-red text-white hover:bg-cinema-red-dim gap-1.5"
            >
              {reviewingId === denyingSubmissionId ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <X size={13} />
              )}
              Confirm Denial
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
