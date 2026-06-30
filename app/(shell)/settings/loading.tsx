import {
  ShellPageFrame,
  ShellPageHeader,
  ShellWidgetCard,
} from "../_components/skeletons";

// Loading skeleton for /settings.
// Mirrors: page header → stacked setting section cards.
export default function SettingsLoading() {
  return (
    <ShellPageFrame>
      <ShellPageHeader hasButton={false} />
      <ShellWidgetCard rows={3} />
      <ShellWidgetCard rows={4} />
      <ShellWidgetCard rows={3} />
    </ShellPageFrame>
  );
}
