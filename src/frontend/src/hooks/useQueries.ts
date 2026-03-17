import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRef } from "react";
import type { Room, VideoSubmissionFull } from "../backend.d";
import { useActor } from "./useActor";
import { useInternetIdentity } from "./useInternetIdentity";

// ─── Rooms queries ───────────────────────────────────────────────────────────────────

export function useGetRooms() {
  const { actor } = useActor();
  return useQuery<Room[]>({
    queryKey: ["rooms"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getRooms();
    },
    enabled: true,
    placeholderData: (prev) => prev,
  });
}

export function useGetRoomById(id: bigint | null) {
  const { actor } = useActor();
  return useQuery<Room | null>({
    queryKey: ["room", id?.toString()],
    queryFn: async () => {
      if (!actor || id === null) return null;
      return actor.getRoomById(id);
    },
    enabled: !!actor && id !== null,
  });
}

export function useGetRoomBySlug(slug: string | null) {
  const { actor } = useActor();
  return useQuery<Room | null>({
    queryKey: ["room", "slug", slug],
    queryFn: async () => {
      if (!actor || !slug) return null;
      return actor.getRoomBySlug(slug);
    },
    enabled: !!actor && !!slug,
  });
}

export function useIsCallerAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["isCallerAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.isCallerAdmin();
    },
    enabled: !!actor && !isFetching,
    staleTime: 60_000,
  });
}

export function useHasAdmin() {
  const { actor, isFetching } = useActor();
  return useQuery<boolean>({
    queryKey: ["hasAdmin"],
    queryFn: async () => {
      if (!actor) return false;
      return actor.hasAdmin();
    },
    enabled: !!actor && !isFetching,
  });
}

// ─── Dynamic admin check ──────────────────────────────────────────────────────────
// Returns false when only hardcoded PIDs exist (no one has triple-tapped to claim admin).
// Returns true once a dynamic admin has been bootstrapped — hint should never show again.
export function useHasDynamicAdmin() {
  const { actor } = useActor();
  return useQuery<boolean>({
    queryKey: ["hasDynamicAdmin"],
    queryFn: async () => {
      if (!actor) return true; // hide hint until actor is ready
      return (actor as any).hasDynamicAdmin();
    },
    enabled: !!actor,
    staleTime: 0,
    refetchInterval: (query) => {
      // Poll every 5 seconds until a dynamic admin is set
      return query.state.data === false ? 5000 : false;
    },
  });
}

// ─── Room mutations ───────────────────────────────────────────────────────────────────

export function useCreateRoom() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      title: string;
      slug: string;
      description: string;
      price: string;
      thumbnailUrl: string;
      videoUrl: string;
      embedScript: string;
      viewDuration: string;
      category: string;
      creatorName: string;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.createRoom(
        params.title,
        params.slug,
        params.description,
        params.price,
        params.thumbnailUrl,
        params.videoUrl,
        params.embedScript,
        params.viewDuration,
        params.category,
        params.creatorName,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useUpdateRoom() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: bigint;
      title: string;
      slug: string;
      description: string;
      price: string;
      thumbnailUrl: string;
      videoUrl: string;
      embedScript: string;
      viewDuration: string;
      category: string;
      creatorName: string;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.updateRoom(
        params.id,
        params.title,
        params.slug,
        params.description,
        params.price,
        params.thumbnailUrl,
        params.videoUrl,
        params.embedScript,
        params.viewDuration,
        params.category,
        params.creatorName,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
      void queryClient.invalidateQueries({ queryKey: ["room"] });
    },
  });
}

export function useDeleteRoom() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.deleteRoom(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

export function useMoveRoomToTop() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.moveRoomToTop(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

// ─── Video submission queries ─────────────────────────────────────────────────────

export function useSubmitVideo() {
  const { identity } = useInternetIdentity();
  const { actor, isFetching: isActorFetching } = useActor();
  const queryClient = useQueryClient();

  const actorRef = useRef<import("../backend").backendInterface | null>(null);
  const identityRef = useRef<typeof identity>(undefined);
  const isActorFetchingRef = useRef(false);

  actorRef.current = actor;
  identityRef.current = identity;
  isActorFetchingRef.current = isActorFetching;

  return useMutation({
    mutationFn: async (params: {
      title: string;
      description: string;
      videoUrl: string;
      thumbnailUrl: string;
      paymentAddress: string;
      price: string;
      category: string;
      viewDuration: string;
      creatorName: string;
    }) => {
      const currentActor = actorRef.current;
      const currentIdentity = identityRef.current;
      const currentlyFetching = isActorFetchingRef.current;

      if (currentlyFetching) {
        throw new Error(
          "Setting up your session — please wait a moment and try again",
        );
      }
      if (!currentActor || !currentIdentity) {
        throw new Error(
          "Not authenticated — please log in with Internet Identity first",
        );
      }
      return currentActor.submitVideo(
        params.title,
        params.description,
        params.videoUrl,
        params.thumbnailUrl,
        params.paymentAddress,
        params.price,
        params.category,
        params.viewDuration,
        params.creatorName,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["userSubmissions"] });
    },
  });
}

export function useGetUserSubmissions() {
  const { actor, isFetching } = useActor();
  return useQuery<VideoSubmissionFull[]>({
    queryKey: ["userSubmissions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUserSubmissions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetPendingSubmissions() {
  const { actor, isFetching } = useActor();
  return useQuery<VideoSubmissionFull[]>({
    queryKey: ["pendingSubmissions"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getPendingSubmissions();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useReviewSubmission() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: bigint;
      approve: boolean;
      embedScript?: string;
      denialReason?: string;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.reviewSubmission(
        params.id,
        params.approve,
        params.embedScript ?? "",
        params.denialReason ?? "",
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["pendingSubmissions"] });
      void queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}

// ─── Homepage Script queries ─────────────────────────────────────────────────────

export function useGetHomepageScripts() {
  const { actor } = useActor();
  return useQuery<import("../backend.d").HomepageScript[]>({
    queryKey: ["homepageScripts"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getHomepageScripts();
    },
    enabled: !!actor,
  });
}

export function useAddHomepageScript() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { name: string; scriptContent: string }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.addHomepageScript(params.name, params.scriptContent);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["homepageScripts"] });
    },
  });
}

export function useUpdateHomepageScript() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: bigint;
      name: string;
      scriptContent: string;
    }) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.updateHomepageScript(
        params.id,
        params.name,
        params.scriptContent,
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["homepageScripts"] });
    },
  });
}

export function useRemoveHomepageScript() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.removeHomepageScript(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["homepageScripts"] });
    },
  });
}

export function useReorderHomepageScripts() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: bigint[]) => {
      if (!actor) throw new Error("Not authenticated");
      return actor.reorderHomepageScripts(ids);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["homepageScripts"] });
    },
  });
}
