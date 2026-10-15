import { cn } from "@/components/ui/utils";
import { ShellPageFrame } from "../_components/skeletons";

// Loading state for /documents, per design frame 03.14. It is not a whole-page skeleton:
// the header, metric labels and tree group labels are static copy and render for real, so
// only the parts that wait on data (metric values, property rows, the file list) are bones.
// Every bone sits inside a box with the loaded state's padding and height, so nothing
// reflows when the data arrives.

// Bones use border-subtle rather than Shimmer's slate fill so they follow the theme in dark mode.
function Bone({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return <div className={cn("animate-pulse rounded bg-border-subtle", className)} style={style} aria-hidden="true" />;
}

function MetricSkeleton({ label, sub }: { label: string; sub: string }) {
  // Same stack as the page's Metric: 11px label, 20px value line, 12px sub line.
  return (
    <div className="flex flex-col gap-2 p-5">
      <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary">{label}</span>
      <span className="flex h-5 items-center">
        <Bone className="h-4 w-16" />
      </span>
      <span className="text-[12px] text-secondary">{sub}</span>
    </div>
  );
}

const TREE_LABEL = "px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary";
const TREE_ROW = "flex h-7 items-center rounded-md px-2.5 text-[13px] text-secondary";

function TreeBar({ width }: { width: number }) {
  return (
    <div className="flex h-7 items-center px-2.5">
      <Bone className="h-3" style={{ width }} />
    </div>
  );
}

const ROW_COUNT = 7;

export default function DocumentsLoading() {
  return (
    <ShellPageFrame>
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-val-primary-dark">
            Valgate
          </span>
          <span className="text-[11px] text-slate-300">/</span>
          <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400">
            Documents
          </span>
        </div>
        <h1 className="text-[28px] font-extrabold leading-tight tracking-tight text-val-heading sm:text-[40px] sm:leading-10">
          Documents
        </h1>
        <p className="mt-2 text-[14px] text-slate-500 sm:text-[15px]">
          Every file uploaded across your portfolio, in one vault.
        </p>
      </div>

      <div className="grid grid-cols-1 divide-y divide-border-subtle rounded-xl border border-border-subtle bg-surface-base sm:grid-cols-2 sm:divide-x sm:divide-y-0">
        <MetricSkeleton label="Documents" sub="Across your portfolio" />
        <MetricSkeleton label="Total storage" sub="Sum of recorded file sizes" />
      </div>

      <div className="flex flex-col gap-5 lg:flex-row" role="status" aria-label="Loading documents">
        <aside className="flex w-full shrink-0 flex-col gap-3 rounded-xl border border-border-default bg-surface-base p-3 lg:w-[264px]">
          <div className="px-1 py-0.5 text-[13px] font-bold text-val-heading">Vault</div>
          <div className="flex flex-col gap-1 pt-1">
            <div className={TREE_LABEL}>Views</div>
            {["All documents", "Recent", "Unfiled"].map((name) => (
              <div key={name} className={TREE_ROW}>
                {name}
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-1 pt-1">
            <div className={TREE_LABEL}>Properties</div>
            {[158, 170, 122].map((w) => (
              <TreeBar key={w} width={w} />
            ))}
          </div>
          {/* No Expiring soon view and no Shared folders group: the schema has no expiry
              field and no sharing model, so the loaded page has neither. A skeleton that
              promises them would reflow the moment the real data arrives. */}
          <div className="mt-1 border border-border-subtle px-1.5 pb-0.5 pt-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.05em] text-text-tertiary">
              Storage
            </div>
            <Bone className="mt-2 h-3 w-40" />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div className="overflow-hidden rounded-lg border border-border-default bg-surface-base">
            {Array.from({ length: ROW_COUNT }).map((_, i) => (
              <div
                key={i}
                className="flex h-[55px] items-center gap-3 border-b border-border-subtle px-4 py-2.5 last:border-b-0"
              >
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Bone className="h-7 w-7 shrink-0 rounded-lg" />
                  <Bone className="h-3 w-48 max-w-full" />
                </div>
                <Bone className="hidden h-3 w-[170px] sm:block" />
                <Bone className="hidden h-3 w-[140px] sm:block" />
                <Bone className="hidden h-3 w-16 sm:block" />
                <Bone className="hidden h-3 w-[110px] sm:block" />
                <Bone className="h-4 w-4 shrink-0" />
              </div>
            ))}
          </div>

          <div className="flex h-[76px] items-center justify-between rounded-lg border border-border-default bg-surface-tint p-4">
            <Bone className="h-3 w-[180px]" />
            <div className="flex gap-1">
              <Bone className="h-7 w-11" />
              <Bone className="h-7 w-11" />
              <Bone className="h-7 w-8" />
              <Bone className="h-7 w-8" />
            </div>
          </div>
        </div>
      </div>
    </ShellPageFrame>
  );
}
