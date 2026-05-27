import { notFound } from "next/navigation";

// Root layout for the (pro) route group.
//
// Professional routes use ManagerProShell via app/(pro)/pro/layout.tsx.
// TODO: replace NODE_ENV guard with Clerk org-role check when Pro auth ships.

export default function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return children;
}
