import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useEffect } from "react";

interface HelpModalProps {
  isAdmin: boolean;
  onClose: () => void;
}

function UserGuide() {
  return (
    <div className="space-y-8 text-sm leading-relaxed text-foreground">
      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">
          1. Browsing and Searching Videos
        </h2>
        <p className="text-muted-foreground">
          On the home page you see a library of videos. You can scroll through
          them, filter by categories, or use the search bar at the top.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">
          2. Submitting Your Own Video
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>
            Tap the <strong className="text-foreground">"Submit Video"</strong>{" "}
            button on the home page.
          </li>
          <li>Authenticate with Internet Identity.</li>
          <li>
            Fill out the form:
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Upload a video (maximum 2 GB)</li>
              <li>Upload a thumbnail</li>
              <li>Enter a title and description</li>
              <li>
                Enter the amount in ICP (the price you want to charge viewers)
              </li>
              <li>
                Set the session duration (how long viewers will have access
                after payment)
              </li>
              <li>
                Enter your ICP account ID or PID (where revenue should be sent)
              </li>
            </ul>
          </li>
          <li>
            Submit the video. It will be reviewed by an admin before it appears
            in the app.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">
          3. Checking Your Submission Status
        </h2>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>
            Tap <strong className="text-foreground">"Submit Video"</strong>{" "}
            again (this authenticates you).
          </li>
          <li>Scroll down to your submission history.</li>
          <li>
            View the status of each submission:{" "}
            <strong className="text-foreground">Pending</strong>,{" "}
            <strong className="text-foreground">Approved</strong>, or{" "}
            <strong className="text-foreground">Denied</strong>.
          </li>
          <li>
            If a submission is denied, tap{" "}
            <strong className="text-foreground">"View Note"</strong> to read the
            reason provided by the admin.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">
          4. How Paywalls Work
        </h2>
        <p className="mb-2 text-muted-foreground">
          When you open a paid video room:
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>Authenticate with Internet Identity.</li>
          <li>Send ICP to the account ID shown on the paywall.</li>
          <li>Refresh your balance.</li>
          <li>
            Press the <strong className="text-foreground">"Unlock Now"</strong>{" "}
            button.
          </li>
          <li>
            You will have access for the session duration set by the creator.
          </li>
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">
          5. Obtaining Your Principal ID (PID)
        </h2>
        <p className="mb-2 text-muted-foreground">
          If you need your PID (for example, when setting up admin privileges
          after cloning the app):
        </p>
        <ol className="list-decimal space-y-2 pl-5 text-muted-foreground">
          <li>
            Tap the <strong className="text-foreground">"Submit Video"</strong>{" "}
            button on the home page (this authenticates you with Internet
            Identity).
          </li>
          <li>Scroll to the bottom of the submit page.</li>
          <li>
            Tap the footer 3 times. Your PID will be copied to the clipboard.
          </li>
        </ol>
      </section>
    </div>
  );
}

function AdminGuide() {
  return (
    <div className="space-y-8 text-sm leading-relaxed text-foreground">
      {/* YouTube Video Player */}
      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Setup Tutorial Video – How to set up a newly cloned CineRooms app
        </h2>
        <div
          className="overflow-hidden rounded-lg"
          style={{ aspectRatio: "16/9" }}
        >
          <iframe
            src="https://www.youtube.com/embed/GtC4MUmhFCQ"
            title="Setup Tutorial Video – How to set up a newly cloned CineRooms app"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            className="h-full w-full border-0"
          />
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Becoming an Admin After Cloning
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>On a fresh clone there are no admins yet.</li>
          <li>
            <strong className="text-foreground">Method 1:</strong> Tap the
            CineRooms logo on the home page 3 times to become admin.
          </li>
          <li>
            <strong className="text-foreground">Method 2:</strong> Tap{" "}
            <strong className="text-foreground">"Submit Video"</strong>{" "}
            (authenticates you), then tap the footer 3 times to copy your PID to
            the clipboard. Provide that PID to Caffeine AI and request that it
            be added as a hardcoded admin.
          </li>
          <li>
            <strong className="text-foreground">Warning:</strong> A canister
            data reset allows the first person who authenticates to become
            admin, but it erases all videos and the previous admin. Use this
            only on a completely empty clone.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Accessing the Dashboard
        </h2>
        <p className="text-muted-foreground">
          After authenticating (by tapping the logo or the Submit Video button),
          a <strong className="text-foreground">"Dashboard"</strong> button
          appears. Tap it to enter the admin dashboard.
        </p>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Dashboard Tabs
        </h2>

        <div className="space-y-5">
          <div>
            <h3 className="mb-2 font-semibold text-foreground">1. Rooms Tab</h3>
            <p className="text-muted-foreground">
              View all approved videos. Edit title, description, price, or other
              information, delete videos, or modify script tags for any room.
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-foreground">
              2. Pending Submissions Tab
            </h3>
            <p className="mb-2 text-muted-foreground">
              View all submitted videos and their current status (Pending,
              Approved, or Denied).
            </p>
            <ul className="list-disc space-y-3 pl-5 text-muted-foreground">
              <li>
                <strong className="text-foreground">
                  To approve a submission:
                </strong>{" "}
                Review the video, thumbnail, title, and description. When
                approving, you have the option to add a script tag to that
                specific video room. This allows you to implement a paywall for
                the room if you choose.
                <br />
                <br />
                To create a paywall (optional): use the IC Paywall builder at{" "}
                <a
                  href="https://4kz7m-7iaaa-aaaab-adm5a-cai.icp0.io/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-cinema-red underline underline-offset-2 hover:opacity-80"
                >
                  https://4kz7m-7iaaa-aaaab-adm5a-cai.icp0.io/
                </a>
                . Use the submitted video details:
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  <li>
                    Set the URL to your deployed app URL followed by the video
                    title.
                  </li>
                  <li>
                    Set the paywall price slightly lower than the displayed
                    price to account for network fees and the 1% fee collected
                    by IC Paywall for every transaction (example: for a 1 ICP
                    video use 0.9997; if you keep 10% use 0.9996).
                  </li>
                  <li>
                    Set the login prompt text to the video title and the payment
                    prompt text to a short description of the video.
                  </li>
                  <li>Generate the script and paste it when approving.</li>
                </ul>
                <p className="mt-2">
                  You can also approve the submission without adding any script
                  to make the video freely accessible.
                </p>
              </li>
              <li>
                <strong className="text-foreground">
                  To deny a submission:
                </strong>{" "}
                Enter a reason. The user will see this reason in their
                submission history under{" "}
                <strong className="text-foreground">"View Note"</strong>.
              </li>
            </ul>
          </div>

          <div>
            <h3 className="mb-2 font-semibold text-foreground">
              3. Homepage Scripts Tab
            </h3>
            <p className="mb-2 text-muted-foreground">
              This tab allows you to add optional scripts that run on the home
              page. Quick links are provided to the IC Paywall builder and IC
              Ping (for chatrooms or contact forms).
            </p>
            <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
              <li>
                A chatroom script adds a small icon that opens a public chatroom
                (users authenticate with Internet Identity).
              </li>
              <li>
                A contact form script adds a small icon that allows users to
                send a message and contact information to the admin.
              </li>
              <li>
                Any script intended for the{" "}
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
                  &lt;head&gt;
                </code>{" "}
                of an index.html file can be added here.
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border/60 bg-muted/40 p-4">
        <h2 className="mb-3 text-base font-semibold text-foreground">
          Important Information After Cloning
        </h2>
        <ul className="list-disc space-y-2 pl-5 text-muted-foreground">
          <li>
            The current link preview image is set to{" "}
            <code className="break-all rounded bg-muted px-1 py-0.5 font-mono text-xs">
              https://3jorm-yqaaa-aaaam-aaa6a-cai.ic0.app/cinerooms-link-preview.jpeg
            </code>
            . Request that Caffeine AI update this URL if you want a custom
            preview image.
          </li>
          <li>
            The cloned version works with IC Paywall and IC Ping scripts. Other
            head scripts should also function if they are designed for an
            index.html file.
          </li>
        </ul>
      </section>
    </div>
  );
}

export function HelpModal({ isAdmin, onClose }: HelpModalProps) {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  return (
    <div
      data-ocid="help.modal"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 flex w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-border/60 bg-background shadow-2xl"
        style={{ maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-5 py-4">
          <div>
            <h1 className="text-lg font-bold text-foreground">
              {isAdmin ? "Admin Guide" : "User Guide"}
            </h1>
            <p className="text-xs text-muted-foreground">
              {isAdmin
                ? "CineRooms administration reference"
                : "How to use CineRooms"}
            </p>
          </div>
          <Button
            data-ocid="help.close_button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Scrollable content */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain"
          style={{ maxHeight: "calc(90vh - 120px)" }}
        >
          <div className="px-5 py-6">
            {isAdmin ? <AdminGuide /> : <UserGuide />}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-border/40 px-5 py-3 text-right">
          <Button
            data-ocid="help.done_button"
            size="sm"
            onClick={onClose}
            className="bg-cinema-red text-white hover:bg-cinema-red/90"
          >
            Done
          </Button>
        </div>
      </div>
    </div>
  );
}
