"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { XIcon } from "lucide-react";

import { cn } from "./utils";

/**
 * PhoneSheet
 *
 * A responsive modal primitive that:
 *  - Renders as a **full-screen bottom sheet** on phone (`< sm`), with grab
 *    handle, safe-area-aware padding, and slide-up animation.
 *  - Renders as a **centered dialog** on tablet+ (`sm:` and above), with
 *    rounded corners, max-width, and fade/zoom animation.
 *
 * The phone-vs-desktop switch is pure CSS (no JS measurement), so there is
 * no hydration-shift flash.
 *
 * Composes the same Radix `Dialog` primitives as `Sheet`, but with one
 * responsive set of classes instead of a `side` variant.
 *
 * Use this for any modal that needs to feel native on phone — confirmation
 * dialogs, pickers, info sheets — and fall back to a regular dialog on
 * larger screens.
 */

function PhoneSheet({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root data-slot="phone-sheet" {...props} />;
}

function PhoneSheetTrigger({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return (
    <DialogPrimitive.Trigger data-slot="phone-sheet-trigger" {...props} />
  );
}

function PhoneSheetClose({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close data-slot="phone-sheet-close" {...props} />;
}

function PhoneSheetPortal({
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Portal>) {
  return <DialogPrimitive.Portal data-slot="phone-sheet-portal" {...props} />;
}

function PhoneSheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-slot="phone-sheet-overlay"
      className={cn(
        "fixed inset-0 z-50 bg-black/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 duration-300 ease-out",
        className,
      )}
      {...props}
    />
  );
}

interface PhoneSheetContentProps
  extends React.ComponentProps<typeof DialogPrimitive.Content> {
  /**
   * Show the iOS-style grab handle at the top (phone only — hidden at sm+).
   * Defaults to true.
   */
  showHandle?: boolean;
  /**
   * Hide the default close button (when the content provides its own).
   */
  hideClose?: boolean;
  /**
   * Max width on tablet+ (`sm:` and above). Defaults to `sm:max-w-lg`.
   * Pass a Tailwind class like `sm:max-w-md` or `sm:max-w-xl`.
   */
  desktopMaxWidth?: string;
}

function PhoneSheetContent({
  className,
  children,
  showHandle = true,
  hideClose,
  desktopMaxWidth = "sm:max-w-lg",
  ...props
}: PhoneSheetContentProps) {
  return (
    <PhoneSheetPortal>
      <PhoneSheetOverlay />
      <DialogPrimitive.Content
        data-slot="phone-sheet-content"
        className={cn(
          // Base (phone): bottom sheet, full screen, slide up
          "fixed z-50 flex flex-col bg-surface-base shadow-xl outline-none",
          "inset-x-0 bottom-0 h-dvh w-full rounded-t-3xl border-t border-border-subtle",
          "data-[state=open]:animate-in data-[state=closed]:animate-out duration-300 ease-out",
          "data-[state=open]:slide-in-from-bottom data-[state=closed]:slide-out-to-bottom",
          // sm+ (desktop): centered dialog, zoom + fade in
          "sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[85vh] sm:w-[calc(100%-2rem)] sm:-translate-x-1/2 sm:-translate-y-1/2",
          "sm:rounded-xl sm:border",
          "sm:data-[state=open]:slide-in-from-bottom-0 sm:data-[state=closed]:slide-out-to-bottom-0",
          "sm:data-[state=open]:fade-in-0 sm:data-[state=closed]:fade-out-0",
          "sm:data-[state=open]:zoom-in-95 sm:data-[state=closed]:zoom-out-95",
          desktopMaxWidth,
          className,
        )}
        {...props}
      >
        {showHandle && (
          <div className="flex shrink-0 justify-center pt-2 pb-1 sm:hidden">
            <div className="h-1 w-9 rounded-full bg-border-default" />
          </div>
        )}
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className={cn(
              "absolute top-3 right-3 flex size-11 items-center justify-center rounded-full text-secondary",
              "transition-colors hover:bg-surface-tint hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border-focus focus-visible:ring-offset-2",
            )}
          >
            <XIcon className="size-5" />
            <span className="sr-only">Close</span>
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </PhoneSheetPortal>
  );
}

function PhoneSheetHeader({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="phone-sheet-header"
      className={cn(
        // Phone: pt-safe so header clears the Dynamic Island when the sheet
        // is full-screen. Desktop: regular padding since it's a centered dialog.
        "flex shrink-0 items-center gap-2 border-b border-border-subtle px-4 pt-safe pb-3 min-h-14",
        "sm:pt-4 sm:pb-4",
        className,
      )}
      {...props}
    />
  );
}

function PhoneSheetBody({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="phone-sheet-body"
      className={cn("flex-1 overflow-y-auto px-4 py-4 sm:py-5", className)}
      {...props}
    />
  );
}

function PhoneSheetFooter({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="phone-sheet-footer"
      className={cn(
        // Phone: pb-safe so primary CTA clears the home indicator.
        // Desktop: regular padding.
        "flex shrink-0 flex-col gap-2 border-t border-border-subtle px-4 pt-3 pb-safe",
        "sm:flex-row sm:justify-end sm:pb-4",
        className,
      )}
      {...props}
    />
  );
}

function PhoneSheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      data-slot="phone-sheet-title"
      className={cn("text-base font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function PhoneSheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description
      data-slot="phone-sheet-description"
      className={cn("text-sm text-secondary", className)}
      {...props}
    />
  );
}

export {
  PhoneSheet,
  PhoneSheetBody,
  PhoneSheetClose,
  PhoneSheetContent,
  PhoneSheetDescription,
  PhoneSheetFooter,
  PhoneSheetHeader,
  PhoneSheetOverlay,
  PhoneSheetPortal,
  PhoneSheetTitle,
  PhoneSheetTrigger,
};
