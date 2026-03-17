import { Monitor } from "lucide-react";

export function DesktopOnlyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center">
      <Monitor size={56} className="mb-6 text-cinema-red opacity-80" />
      <h1 className="mb-4 font-serif text-3xl font-bold tracking-wide text-foreground sm:text-4xl">
        Desktop Only
      </h1>
      <p className="max-w-md text-base leading-relaxed text-muted-foreground">
        CineRooms is currently available on desktop and PC only. Please visit us
        from a laptop or desktop computer to enjoy this exclusive cinematic
        experience.
      </p>
    </div>
  );
}
