import { ManagerProShell } from "./_components/ManagerProShell";

export default function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ManagerProShell>{children}</ManagerProShell>;
}
