import {
  ShellPropertyPageFrame,
  ShellPropertyContent,
  ShellWidgetCard,
} from "../../../_components/skeletons";

// Loading skeleton for /property/[id]/ownership.
// Mirrors: primary owner card → co-owners table → ownership docs card.
export default function OwnershipLoading() {
  return (
    <ShellPropertyPageFrame>
      <ShellPropertyContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ShellWidgetCard rows={4} />
          <ShellWidgetCard rows={4} />
        </div>

        <ShellWidgetCard rows={5} />
      </ShellPropertyContent>
    </ShellPropertyPageFrame>
  );
}
