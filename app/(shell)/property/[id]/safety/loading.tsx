import {
  ShellPropertyPageFrame,
  ShellPropertyContent,
  ShellWidgetCard,
} from "../../../_components/skeletons";

// Loading skeleton for /property/[id]/safety.
// Mirrors: risk summary card → risk list → inspections + certifications.
export default function SafetyLoading() {
  return (
    <ShellPropertyPageFrame>
      <ShellPropertyContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <ShellWidgetCard rows={4} />
          <ShellWidgetCard rows={4} />
        </div>

        <ShellWidgetCard rows={6} />
      </ShellPropertyContent>
    </ShellPropertyPageFrame>
  );
}
