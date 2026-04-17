// TODO: confirm route paths once legal pages exist
const FOOTER_LINKS = [
  { label: "Privacy Policy", href: "/legal/privacy" },
  { label: "Terms of Service", href: "/legal/terms" },
  { label: "Cookie Policy", href: "/legal/cookies" },
  { label: "Security", href: "/security" },
] as const;

/**
 * Shared legal footer for auth screens.
 * Matches Figma: "Simple Footer (Legal only for auth screens)"
 */
export function AuthFooter() {
  return (
    <footer className="bg-white border-t border-border-default shrink-0">
      <div className="flex items-center justify-between px-8 py-[25px]">
        <p className="text-xs text-text-tertiary">
          © 2025 Valgate Property Management. All rights reserved.
        </p>
        <nav className="flex items-center gap-6">
          {FOOTER_LINKS.map(({ label, href }) => (
            <a
              key={label}
              href={href}
              className="text-xs font-medium text-text-tertiary hover:text-foreground transition-colors"
            >
              {label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
