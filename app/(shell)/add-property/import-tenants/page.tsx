import { redirect } from "next/navigation";

export const maxDuration = 60;

export default function Page() {
  redirect("/add-property/import");
}
