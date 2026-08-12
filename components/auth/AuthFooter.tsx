/**
 * Shared legal footer for auth screens.
 * Matches Figma: "Simple Footer (Legal only for auth screens)"
 */
export function AuthFooter() {
  return (
    <footer className="bg-white border-t border-border-default shrink-0">
      <div className="flex items-center justify-center px-8 py-[25px]">
        <p className="text-xs text-text-tertiary">
          © 2025 Valgate. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
