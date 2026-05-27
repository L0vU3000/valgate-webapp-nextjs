import { Toaster } from "sonner";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-dvh-safe bg-surface-page">
      {children}
      <Toaster position="top-center" richColors />
    </div>
  );
}
