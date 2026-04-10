import { ShellLayout } from "@/components/layout/ShellLayout";

export default function ShellGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ShellLayout>{children}</ShellLayout>;
}
