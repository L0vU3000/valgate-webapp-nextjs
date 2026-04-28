import type { Metadata } from "next";
import Script from "next/script";
import "../styles/index.css";
import { AgentationProvider } from "./_components/agentation-provider";
import { Toaster } from "sonner";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/components/convex-client-provider";

export const metadata: Metadata = {
  title: "Valgate",
  description: "Property portfolio management",
  icons: { icon: "/valgate-icon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Script
          src="https://mcp.figma.com/mcp/html-to-design/capture.js"
          strategy="lazyOnload"
        />
        <ClerkProvider>
          <ConvexClientProvider>
            {children}
          </ConvexClientProvider>
        </ClerkProvider>
        <Toaster position="top-right" richColors />
        <AgentationProvider />
      </body>
    </html>
  );
}
