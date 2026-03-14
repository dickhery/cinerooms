import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import type { backendInterface } from "../backend";
import { createActorWithConfig } from "../config";
import { getSecretParameter } from "../utils/urlParams";
import { useInternetIdentity } from "./useInternetIdentity";

const ACTOR_QUERY_KEY = "actor";

type ActorResult = {
  actor: backendInterface;
  bootstrapIsAdmin: boolean;
};

export function useActor() {
  const { identity } = useInternetIdentity();
  const queryClient = useQueryClient();
  const actorQuery = useQuery<ActorResult>({
    queryKey: [ACTOR_QUERY_KEY, identity?.getPrincipal().toString()],
    queryFn: async () => {
      const isAuthenticated = !!identity;

      if (!isAuthenticated) {
        const actor = await createActorWithConfig();
        return { actor, bootstrapIsAdmin: false };
      }

      const actorOptions = {
        agentOptions: {
          identity,
        },
      };

      const actor = await createActorWithConfig(actorOptions);

      // Optional secret-based init (non-fatal on fresh canister)
      const adminToken = getSecretParameter("caffeineAdminToken") || "";
      if (adminToken) {
        try {
          await actor._initializeAccessControlWithSecret(adminToken);
        } catch (err) {
          console.warn(
            "[useActor] secret init failed (safe on fresh canister):",
            err,
          );
        }
      } else {
        try {
          await actor._initializeAccessControlWithSecret("");
        } catch {
          // ignore
        }
      }

      // Bootstrap first-admin if needed
      let bootstrapIsAdmin = false;
      try {
        bootstrapIsAdmin = await (actor as any).bootstrapAdminIfNeeded();
      } catch (err) {
        console.warn("[useActor] bootstrapAdminIfNeeded failed:", err);
        // fallback to claimHardcodedAdmin
        try {
          bootstrapIsAdmin = await (actor as any).claimHardcodedAdmin();
        } catch {
          // ignore
        }
      }

      // Final authoritative check
      if (!bootstrapIsAdmin) {
        try {
          bootstrapIsAdmin = await actor.isCallerAdmin();
        } catch {
          // ignore
        }
      }

      return { actor, bootstrapIsAdmin };
    },
    staleTime: 0,
    refetchOnWindowFocus: false,
    enabled: true,
  });

  // When the actor changes, invalidate dependent queries
  useEffect(() => {
    if (actorQuery.data) {
      queryClient.invalidateQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
      queryClient.refetchQueries({
        predicate: (query) => {
          return !query.queryKey.includes(ACTOR_QUERY_KEY);
        },
      });
    }
  }, [actorQuery.data, queryClient]);

  return {
    actor: actorQuery.data?.actor || null,
    bootstrapIsAdmin: actorQuery.data?.bootstrapIsAdmin ?? false,
    isFetching: actorQuery.isFetching,
    refetchActor: actorQuery.refetch,
  };
}
