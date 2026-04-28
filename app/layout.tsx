import type { Metadata } from "next";
import Script from "next/script";
import "../styles/index.css";
import { AgentationProvider } from "./_components/agentation-provider";
import { Toaster } from "sonner";
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
        {children}
        <Toaster position="top-right" richColors />
        <AgentationProvider />
      </body>
    </html>
  );
}
