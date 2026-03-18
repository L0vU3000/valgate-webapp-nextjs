import { Outlet } from "react-router";
import { Sidebar } from "./Sidebar";

export function ShellLayout() {
  return (
    <div className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-background">
        <Outlet />
      </main>
    </div>
  );
}
