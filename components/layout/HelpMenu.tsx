"use client";

import { useEffect, useState } from "react";
import {
  HelpCircle,
  MessageSquare,
  Sparkles,
  BookOpen,
  Keyboard,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from "../ui/dropdown-menu";
import { WhatsNewModal } from "./WhatsNewModal";
import {
  getLatestChangelogVersion,
  compareVersions,
} from "@/lib/data/changelog";

// localStorage key holding the newest changelog version this browser has seen.
const LAST_SEEN_KEY = "valgate:changelog:last-seen";

// Placeholder destinations. Send Feedback opens the user's mail client; Docs and
// Keyboard Shortcuts are wired as real links so the affordance works, pointing at
// "#" until a user manual / shortcuts reference exists.
// ponytail: swap these three for real URLs when the destinations ship.
const FEEDBACK_MAILTO =
  "mailto:feedback@valgate.co?subject=Valgate%20feedback";
const DOCS_HREF = "#";
const SHORTCUTS_HREF = "#";

// Header Help (?) menu, shared by the Standard and Pro shells. Owns the
// "What's new" modal open state and the localStorage-backed unread dot.
export function HelpMenu() {
  const [whatsNewOpen, setWhatsNewOpen] = useState(false);
  // Whether to show the unread dot. Starts false so the server-rendered markup
  // matches the client (no dot); the effect below decides on mount.
  const [hasUnread, setHasUnread] = useState(false);

  const latestVersion = getLatestChangelogVersion();

  // On mount, compare the newest changelog version to what this browser last saw.
  // Show the dot when there's something newer (or nothing has ever been seen).
  useEffect(() => {
    if (!latestVersion) {
      return;
    }
    const lastSeen = window.localStorage.getItem(LAST_SEEN_KEY);
    if (lastSeen === null || compareVersions(latestVersion, lastSeen) > 0) {
      setHasUnread(true);
    }
  }, [latestVersion]);

  // Opening the changelog marks the newest version as seen and clears the dot.
  function openWhatsNew() {
    if (latestVersion) {
      window.localStorage.setItem(LAST_SEEN_KEY, latestVersion);
    }
    setHasUnread(false);
    setWhatsNewOpen(true);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Help"
            className="relative rounded p-2 text-secondary transition-colors hover:bg-surface-tint hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200"
          >
            <HelpCircle className="h-5 w-5" />
            {hasUnread && (
              <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-blue-600" />
            )}
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-56">
          <DropdownMenuItem asChild>
            <a href={FEEDBACK_MAILTO}>
              <MessageSquare className="mr-2 h-4 w-4 text-secondary" />
              Send Feedback
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem
            onSelect={() => {
              // Let the dropdown close first, then open the dialog on the next
              // tick. Opening it synchronously here races Radix's focus-return
              // (menu → trigger) and can snap the dialog shut. ponytail: this
              // 0ms defer is the standard Radix menu→dialog workaround.
              setTimeout(openWhatsNew, 0);
            }}
          >
            <Sparkles className="mr-2 h-4 w-4 text-secondary" />
            Changelog
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <a href={DOCS_HREF} target="_blank" rel="noreferrer">
              <BookOpen className="mr-2 h-4 w-4 text-secondary" />
              Docs
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={SHORTCUTS_HREF}>
              <Keyboard className="mr-2 h-4 w-4 text-secondary" />
              Keyboard Shortcuts
              <DropdownMenuShortcut>⌘K</DropdownMenuShortcut>
            </a>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <WhatsNewModal open={whatsNewOpen} onOpenChange={setWhatsNewOpen} />
    </>
  );
}
