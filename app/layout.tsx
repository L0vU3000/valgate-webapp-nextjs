import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { ClerkProvider } from "@clerk/nextjs";
import "../styles/index.css";
import { AgentationProvider } from "./_components/agentation-provider";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export const metadata: Metadata = {
  title: "Valgate",
  description: "Property portfolio management",
  // .ico first so clients that hard-request /favicon.ico (e.g. some connector UIs) get a
  // real raster mark; svg second for crisp rendering in browsers that support it.
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48", type: "image/x-icon" },
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Valgate",
  },
  formatDetection: {
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Custom auth pages live at /login and /register (headless Clerk). The fallback redirect URLs
    // send users to the authed home ("/") after sign-in/up when no explicit redirect is set.
    <ClerkProvider
      signInUrl="/login"
      signUpUrl="/register"
      signInFallbackRedirectUrl="/launch"
      signUpFallbackRedirectUrl="/launch"
      taskUrls={{
        "choose-organization": "/login/tasks",
        "reset-password": "/login/tasks",
        "setup-mfa": "/login/tasks",
      }}
    >
      <html lang="en">
        <body className="antialiased">
          <Script
            src="https://mcp.figma.com/mcp/html-to-design/capture.js"
            strategy="lazyOnload"
          />
          {children}
          <AgentationProvider />
        </body>
      </html>
    </ClerkProvider>
  );
}
