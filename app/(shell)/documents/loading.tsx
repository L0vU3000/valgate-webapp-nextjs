import { cn } from "@/components/ui/utils";
import { ShellPageFrame } from "../_components/skeletons";

// Loading state for /documents, per design frame 03.14. It is not a whole-page skeleton:
// the header, metric labels and tree group labels are static copy and render for real, so
// only the parts that wait on data (metric values, property rows, folder cards, file cards) are bones.
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
      <span className="text-[12px] text-text-tertiary">{sub}</span>
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

const FOLDER_COUNT = 4;
const CARD_COUNT = 4;

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
          <section className="flex flex-col gap-2">
            <div className={TREE_LABEL}>Folders</div>
            {/* Mirrors the loaded grid exactly: 2 / 3 / 6 columns, card padding py-3 px-3.5,
                icon + name + count. Six, not four, because six is what fits at frame width. */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: FOLDER_COUNT }).map((_, i) => (
                <div key={i} className="flex flex-col gap-2 rounded-xl border border-border-default bg-surface-base px-3.5 py-3">
                  <Bone className="h-[18px] w-[18px]" />
                  <Bone className="h-3 w-3/4" />
                  <Bone className="h-2.5 w-full" />
                </div>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-2">
            <div className={TREE_LABEL}>Files</div>
            {/* Loaded toolbar: FILES count, 220px search (h-9), two h-7 filter chips, one
                h-9 List/Grid toggle container. Heights copied from the real controls. */}
            <div className="flex flex-wrap items-center gap-3">
              <Bone className="h-3 w-16" />
              <Bone className="h-9 w-full rounded-md sm:w-[220px]" />
              <Bone className="h-7 w-28 rounded-md" />
              <Bone className="h-7 w-28 rounded-md" />
              <Bone className="h-9 w-[104px] rounded-md" />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {Array.from({ length: CARD_COUNT }).map((_, i) => (
                <div key={i} className="flex flex-col overflow-hidden rounded-[10px] border border-border-default bg-surface-base">
                  <div className="grid h-[130px] place-items-center bg-surface-tint">
                    <Bone className="h-[26px] w-[26px]" />
                  </div>
                  <div className="flex flex-col gap-[5px] p-3">
                    <Bone className="h-3.5 w-3/4" />
                    <Bone className="h-3 w-1/2" />
                    <div className="flex items-center justify-between">
                      <Bone className="h-5 w-16 rounded-full" />
                      <Bone className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="flex items-center justify-between rounded-md border border-border-default bg-val-bg-page-alt p-4">
            <Bone className="h-3 w-[180px]" />
            <div className="flex gap-1">
              <Bone className="h-11 w-11" />
              <Bone className="h-7 w-8" />
              <Bone className="h-7 w-8" />
              <Bone className="h-11 w-11" />
            </div>
          </div>
        </div>
      </div>
    </ShellPageFrame>
  );
}
