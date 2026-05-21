import type { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 text-center ${className ?? ""}`}
    >
      {icon && <div className="mb-3 text-slate-400">{icon}</div>}
      <p className="text-sm font-medium text-[--val-heading]">{title}</p>
      {description && (
        <p className="mt-1 text-xs text-slate-500">{description}</p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
