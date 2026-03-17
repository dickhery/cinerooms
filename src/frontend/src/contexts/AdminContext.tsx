import { useQueryClient } from "@tanstack/react-query";
import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useActor } from "../hooks/useActor";
import { useInternetIdentity } from "../hooks/useInternetIdentity";
import { isMobile } from "../utils/mobileDetect";

interface AdminContextType {
  isAdmin: boolean;
  isCheckingAdmin: boolean;
  showRestrictedDialog: boolean;
  handleLogoClick: () => void;
  dismissRestrictedDialog: () => void;
  logout: () => void;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

// All PIDs that should automatically receive admin access
const HARDCODED_ADMIN_PIDS = [
  "xcrfe-n64wj-5ec52-kpr3q-h5yft-ovyo6-4bjso-ubj2v-qe3uo-tm3ie-aqe",
  "dmqpn-7duh5-66nau-irxp2-tqm3o-ahcdq-36tps-krdf3-wwjiu-33hdf-mae",
];

export function AdminProvider({ children }: { children: ReactNode }) {
  const { login, clear, identity, isInitializing } = useInternetIdentity();
  const { actor, isFetching } = useActor();
  const refetchActor = async () => {};
  const queryClient = useQueryClient();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isCheckingAdmin, setIsCheckingAdmin] = useState(false);
  const [showRestrictedDialog, setShowRestrictedDialog] = useState(false);

  // Triple-click tracking
  const clickCount = useRef(0);
  const clickTimer = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  // Track whether we have already synced this principal with the backend
  const lastSyncedPrincipal = useRef<string | null>(null);

  // Whether the triple-tap flow has been triggered (for non-hardcoded PID path)
  const [adminLoginTriggered, setAdminLoginTriggered] = useState(false);

  const handleLogoClick = useCallback(() => {
    // Desktop-only app — prevent admin login on mobile
    if (isMobile) return;
    clickCount.current += 1;
    clearTimeout(clickTimer.current);
    clickTimer.current = setTimeout(() => {
      clickCount.current = 0;
    }, 600);
    if (clickCount.current >= 3) {
      clickCount.current = 0;
      clearTimeout(clickTimer.current);

      // If already authenticated as a hardcoded admin, grant access immediately
      // without re-opening Internet Identity.
      if (identity) {
        const callerPid = identity.getPrincipal().toText();
        if (HARDCODED_ADMIN_PIDS.includes(callerPid)) {
          setIsAdmin(true);
          return;
        }
        // Already authenticated but not a hardcoded admin:
        // force a fresh bootstrap run (covers returning non-hardcoded admins).
        setAdminLoginTriggered(true);
        void refetchActor();
        return;
      }

      // Not authenticated yet — open Internet Identity.
      setAdminLoginTriggered(true);
      login();
    }
  }, [login, identity]);

  const logout = useCallback(() => {
    clear();
    setIsAdmin(false);
    lastSyncedPrincipal.current = null;
    void queryClient.invalidateQueries({ queryKey: ["isCallerAdmin"] });
  }, [clear, queryClient]);

  const dismissRestrictedDialog = useCallback(() => {
    setShowRestrictedDialog(false);
    logout();
  }, [logout]);

  // ── Effect 1: Auto-detect hardcoded admins from identity alone ────────────
  // As soon as identity is available for a hardcoded PID, set isAdmin = true
  // immediately — no actor or canister call required.
  useEffect(() => {
    if (!identity || isInitializing) return;

    const callerPid = identity.getPrincipal().toText();
    if (!HARDCODED_ADMIN_PIDS.includes(callerPid)) return;

    setIsAdmin(true);

    if (adminLoginTriggered) {
      setAdminLoginTriggered(false);
    }
  }, [identity, isInitializing, adminLoginTriggered]);

  // ── Effect 2: Background backend sync for hardcoded admins ────────────────
  // Once the actor is also available, register the admin role in the backend
  // (fire-and-forget, once per principal per session).
  useEffect(() => {
    if (!identity || !actor) return;

    const callerPid = identity.getPrincipal().toText();
    if (!HARDCODED_ADMIN_PIDS.includes(callerPid)) return;
    if (lastSyncedPrincipal.current === callerPid) return;

    lastSyncedPrincipal.current = callerPid;
    void actor.claimHardcodedAdmin().catch((err: unknown) => {
      console.error("Background claimHardcodedAdmin failed:", err);
    });
    void queryClient.invalidateQueries({ queryKey: ["isCallerAdmin"] });
  }, [identity, actor, queryClient]);

  // ── Effect 3: Triple-tap admin check for non-hardcoded PIDs ──────────────
  // Runs after triple-tap completes authentication. Calls bootstrapAdminIfNeeded
  // on the backend which atomically enforces "first user only" — only the first
  // non-hardcoded user to authenticate after a canister reset is promoted.
  useEffect(() => {
    if (!adminLoginTriggered) return;
    if (!identity || !actor || isInitializing) return;
    // Wait for any in-flight actor fetch to finish
    if (isFetching) return;

    const callerPid = identity.getPrincipal().toText();

    // Hardcoded PIDs are handled by Effect 1.
    if (HARDCODED_ADMIN_PIDS.includes(callerPid)) {
      setAdminLoginTriggered(false);
      setIsAdmin(true);
      return;
    }

    setAdminLoginTriggered(false);

    const checkAdminStatus = async () => {
      setIsCheckingAdmin(true);
      try {
        // bootstrapAdminIfNeeded enforces "first user only" atomically:
        // - Returns true for the first non-hardcoded user after a canister reset
        // - Returns true for returning dynamic admins
        // - Returns false for everyone else
        let bootstrapped = false;
        try {
          bootstrapped = await actor.bootstrapAdminIfNeeded();
        } catch (err) {
          console.warn("[AdminContext] bootstrapAdminIfNeeded failed:", err);
        }

        if (bootstrapped) {
          setIsAdmin(true);
          return;
        }

        // Fallback: check via isAdmin() (custom backend function, not isCallerAdmin)
        // This covers the case where the user is already a dynamic admin but
        // bootstrapAdminIfNeeded had a transient failure.
        let adminCheck = false;
        try {
          adminCheck = await actor.isAdmin();
        } catch (err) {
          console.warn("[AdminContext] isAdmin fallback check failed:", err);
        }

        if (adminCheck) {
          setIsAdmin(true);
        } else {
          setShowRestrictedDialog(true);
        }
      } catch (err) {
        console.error("Admin check failed:", err);
        setShowRestrictedDialog(true);
      } finally {
        setIsCheckingAdmin(false);
        void queryClient.invalidateQueries({ queryKey: ["isCallerAdmin"] });
      }
    };

    void checkAdminStatus();
  }, [
    adminLoginTriggered,
    identity,
    actor,
    isInitializing,
    isFetching,
    queryClient,
  ]);

  return (
    <AdminContext.Provider
      value={{
        isAdmin,
        isCheckingAdmin,
        showRestrictedDialog,
        handleLogoClick,
        dismissRestrictedDialog,
        logout,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextType {
  const ctx = useContext(AdminContext);
  if (!ctx) throw new Error("useAdmin must be used within AdminProvider");
  return ctx;
}
