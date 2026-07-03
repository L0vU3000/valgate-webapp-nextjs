import { Suspense } from "react";
import { RegisterPage } from "./_components/RegisterPage";

export default function Page() {
  return (
    <Suspense fallback={null}>
      <RegisterPage />
    </Suspense>
  );
}
