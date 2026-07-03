import { Suspense } from "react";
import { LoginTasksPage } from "./_components/LoginTasksPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginTasksPage />
    </Suspense>
  );
}
