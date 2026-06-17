import { ManagerProShell } from "./_components/ManagerProShell";
import { getProShellData } from "./queries";

// Server layout for every /pro route. Loads the real shell data
// (client list with derived health, open work-order count, manager
// profile, searchable properties) and passes it to the client shell.

export default async function ManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const shellData = await getProShellData();
  return <ManagerProShell shellData={shellData}>{children}</ManagerProShell>;
}
