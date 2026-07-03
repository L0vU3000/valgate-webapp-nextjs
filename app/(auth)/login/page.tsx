import { Suspense } from "react";
import { LoginPage } from "./_components/LoginPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <LoginPage />
    </Suspense>
  );
}
