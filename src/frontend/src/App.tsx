import { Toaster } from "@/components/ui/sonner";
import {
  Outlet,
  RouterProvider,
  createRootRoute,
  createRoute,
  createRouter,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect } from "react";
import { Footer } from "./components/cinema/Footer";
import { Header } from "./components/cinema/Header";
import { RestrictedDialog } from "./components/cinema/RestrictedDialog";
import { AdminProvider, useAdmin } from "./contexts/AdminContext";
import { useDevToolsDetection } from "./hooks/useDevToolsDetection";
import { AdminDashboard } from "./pages/AdminDashboard";
import { DesktopOnlyPage } from "./pages/DesktopOnlyPage";
import { DevToolsBlockedPage } from "./pages/DevToolsBlockedPage";
import { HomePage } from "./pages/HomePage";
import { RoomPage } from "./pages/RoomPage";
import { SubmitVideoPage } from "./pages/SubmitVideoPage";
import { isMobile } from "./utils/mobileDetect";
import { setupRoomLifecycleListener } from "./utils/roomLifecycle";

// Root layout
function RootLayout() {
  // Set up room lifecycle listener once at app startup
  useEffect(() => {
    setupRoomLifecycleListener();
  }, []);

  return (
    <AdminProvider>
      <MobileGuard>
        <DevToolsGuard>
          <div className="flex min-h-screen flex-col bg-background">
            <Header />
            <div className="flex flex-1 flex-col pt-16">
              <Outlet />
            </div>
            <Footer />
            <RestrictedDialog />
            <Toaster
              position="bottom-right"
              toastOptions={{
                style: {
                  background: "oklch(0.1 0 0)",
                  border: "1px solid oklch(0.22 0.005 280)",
                  color: "oklch(0.93 0.01 90)",
                },
              }}
            />
          </div>
        </DevToolsGuard>
      </MobileGuard>
    </AdminProvider>
  );
}

// Redirects mobile visitors to the desktop-only page
function MobileGuard({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  useEffect(() => {
    if (isMobile && currentPath !== "/desktop-only") {
      void navigate({ to: "/desktop-only" });
    }
  }, [currentPath, navigate]);

  return <>{children}</>;
}

// Guard component — must be inside AdminProvider to access useAdmin
function DevToolsGuard({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAdmin();
  const { isDevToolsOpen } = useDevToolsDetection();
  const navigate = useNavigate();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  useEffect(() => {
    if (isDevToolsOpen && !isAdmin && currentPath !== "/devtools-blocked") {
      void navigate({ to: "/devtools-blocked" });
    } else if (!isDevToolsOpen && currentPath === "/devtools-blocked") {
      void navigate({ to: "/" });
    }
  }, [isDevToolsOpen, isAdmin, currentPath, navigate]);

  return <>{children}</>;
}

// Routes
const rootRoute = createRootRoute({
  component: RootLayout,
});

const homeRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/room/$slug",
  component: RoomPage,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: AdminDashboard,
});

const submitRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/submit",
  component: SubmitVideoPage,
});

const devToolsBlockedRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/devtools-blocked",
  component: DevToolsBlockedPage,
});

const desktopOnlyRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/desktop-only",
  component: DesktopOnlyPage,
});

const routeTree = rootRoute.addChildren([
  homeRoute,
  roomRoute,
  adminRoute,
  submitRoute,
  devToolsBlockedRoute,
  desktopOnlyRoute,
]);

const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

export default function App() {
  return <RouterProvider router={router} />;
}
