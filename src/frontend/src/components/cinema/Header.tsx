import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link, useNavigate } from "@tanstack/react-router";
import { Film, HelpCircle, LayoutDashboard, LogOut, Video } from "lucide-react";
import { useState } from "react";
import { useAdmin } from "../../contexts/AdminContext";
import { useInternetIdentity } from "../../hooks/useInternetIdentity";
import { HelpModal } from "./HelpModal";

export function Header() {
  const { isAdmin, handleLogoClick, logout } = useAdmin();
  const { identity } = useInternetIdentity();
  const navigate = useNavigate();
  const [helpOpen, setHelpOpen] = useState(false);

  const handleSubmitVideo = () => {
    void navigate({ to: "/submit" });
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 md:px-6">
          {/* Logo — triple-click triggers admin auth */}
          <button
            data-ocid="header.logo"
            onClick={handleLogoClick}
            onTouchStart={handleLogoClick}
            className="flex cursor-pointer select-none items-center gap-2.5 border-none bg-transparent p-0 focus:outline-none"
            aria-label="CineRooms"
            type="button"
          >
            <Film className="text-cinema-red" size={24} strokeWidth={1.5} />
            <span className="font-display text-xl font-bold tracking-wide text-foreground">
              Cine<span className="text-cinema-red">Rooms</span>
            </span>
          </button>

          {/* Nav items */}
          <nav className="flex items-center gap-2">
            {/* Submit Video — visible to ALL authenticated users (regular + admin) */}
            {identity && (
              <Button
                data-ocid="nav.submit_video_button"
                variant="outline"
                size="sm"
                onClick={handleSubmitVideo}
                className="gap-1.5 border-cinema-red/40 text-cinema-red hover:bg-cinema-red/10 hover:text-cinema-red"
              >
                <Video size={14} />
                <span className="hidden sm:inline">Submit Video</span>
              </Button>
            )}

            {/* Admin nav items — visible only to admin */}
            {isAdmin && (
              <>
                <Badge
                  data-ocid="nav.admin_badge"
                  className="border-cinema-red/40 bg-cinema-red/10 text-cinema-red"
                  variant="outline"
                >
                  Admin
                </Badge>
                <Link to="/admin">
                  <Button
                    data-ocid="nav.admin_dashboard_link"
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-muted-foreground hover:text-foreground"
                  >
                    <LayoutDashboard size={15} />
                    <span className="hidden sm:inline">Dashboard</span>
                  </Button>
                </Link>
              </>
            )}

            {/* Help button — visible to all users */}
            <Button
              data-ocid="nav.help_button"
              variant="ghost"
              size="sm"
              onClick={() => setHelpOpen(true)}
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              aria-label="Help"
            >
              <HelpCircle size={15} />
              <span className="hidden sm:inline">Help</span>
            </Button>

            {/* Sign out — visible to ANY authenticated user (regular or admin) */}
            {identity && (
              <Button
                data-ocid="nav.sign_out_button"
                variant="ghost"
                size="sm"
                onClick={logout}
                className="gap-1.5 text-muted-foreground hover:text-cinema-red"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Help Modal */}
      {helpOpen && (
        <HelpModal isAdmin={isAdmin} onClose={() => setHelpOpen(false)} />
      )}
    </>
  );
}
