import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ShieldAlert } from "lucide-react";
import { useAdmin } from "../../contexts/AdminContext";

export function RestrictedDialog() {
  const { showRestrictedDialog, dismissRestrictedDialog } = useAdmin();

  return (
    <Dialog
      open={showRestrictedDialog}
      onOpenChange={(open) => {
        if (!open) dismissRestrictedDialog();
      }}
    >
      <DialogContent
        data-ocid="auth.restricted_dialog"
        className="border-border bg-card sm:max-w-sm"
      >
        <DialogHeader>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-cinema-red/10">
            <ShieldAlert className="text-cinema-red" size={24} />
          </div>
          <DialogTitle className="text-center text-foreground">
            Admin Access Restricted
          </DialogTitle>
          <DialogDescription className="text-center text-muted-foreground">
            Your identity does not have admin privileges for CineRooms. Only the
            designated administrator can access the dashboard.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="sm:justify-center">
          <Button
            data-ocid="auth.restricted_close_button"
            onClick={dismissRestrictedDialog}
            className="bg-cinema-red text-white hover:bg-cinema-red-dim"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
