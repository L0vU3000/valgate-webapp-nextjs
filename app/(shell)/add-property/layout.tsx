import { redirect } from "next/navigation";

// The add-property wizard is retired — properties are created from the map's Quick Add, and
// documents/photos are added from a property's Documents page. The routes (and their /import*
// sub-flows) stay in the tree so old links and history entries don't 404, but every entry point
// lands on the portfolio. Not deleted: remove this guard to bring the wizard back.
export default function RetiredAddPropertyLayout() {
  redirect("/portfolio");
}
