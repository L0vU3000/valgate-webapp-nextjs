import { RootProvider } from "fumadocs-ui/provider/next";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { source } from "@/lib/source";
import { baseOptions } from "@/lib/layout.shared";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Valgate User Manual",
  description: "Learn how to manage your properties, tenants, work orders, and more.",
};

export default function DocsRouteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <RootProvider>
      <DocsLayout
        {...baseOptions()}
        tree={source.getPageTree()}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
