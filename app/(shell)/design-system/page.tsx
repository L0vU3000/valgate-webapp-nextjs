import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';

export default function DesignSystemPage() {
  return (
    <div className="flex flex-col gap-12 py-8">
      <header className="border-b pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight leading-10 text-val-heading">
          Design System Reference
        </h1>
        <p className="text-slate-500 text-base mt-2">
          A living gallery of Valgate&apos;s design tokens and UI primitives. Use this as optional inspiration; creative departures are welcome when task-specific needs require them.
        </p>
      </header>

      {/* Buttons Section */}
      <section className="flex flex-col gap-6">
        <h2 className="text-base font-bold text-val-heading">Button Variants</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 tracking-wider">Variants</span>
            <div className="flex flex-wrap gap-3">
              <Button variant="default">Default</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="link">Link</Button>
              <Button variant="destructive">Destructive</Button>
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 tracking-wider">Sizes</span>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm">Small</Button>
              <Button size="default">Default</Button>
              <Button size="lg">Large</Button>
              <Button size="icon" className="w-10 h-10 p-0">
                <span className="sr-only">Icon</span>
                <div className="size-4 bg-current rounded-full" />
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Typography Section */}
      <section className="flex flex-col gap-6">
        <h2 className="text-base font-bold text-val-heading">Typography Hierarchy</h2>
        <div className="flex flex-col gap-6 p-6 bg-surface-tint rounded-xl border border-border-subtle">
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 tracking-wider">Display</span>
            <p className="text-4xl font-extrabold tracking-tight leading-10 text-val-heading">The quick brown fox jumps over the lazy dog</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 tracking-wider">Title</span>
            <p className="text-base font-bold text-val-heading">The quick brown fox jumps over the lazy dog</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 tracking-wider">Body</span>
            <p className="text-[14px] text-val-heading">The quick brown fox jumps over the lazy dog. This is standard body text for reading and descriptions.</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 tracking-wider">Data</span>
            <p className="text-[14px] text-val-heading">The quick brown fox jumps over the lazy dog (Data view)</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 tracking-wider">Label</span>
            <p className="text-[11px] font-semibold uppercase tracking-[0.05em] text-val-heading tracking-widest">THE QUICK BROWN FOX</p>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 tracking-wider">Badge</span>
            <p className="text-[10px] font-semibold tracking-[1px] uppercase text-val-heading tracking-widest">STATUS BADGE</p>
          </div>
        </div>
      </section>

      {/* Colors Section */}
      <section className="flex flex-col gap-6">
        <h2 className="text-base font-bold text-val-heading">Semantic Colors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { name: 'Primary', class: 'bg-primary text-primary-foreground' },
            { name: 'Secondary', class: 'bg-interactive-secondary text-interactive-secondary-text' },
            { name: 'Surface Page', class: 'bg-surface-page text-val-heading border border-border-subtle' },
            { name: 'Surface Tint', class: 'bg-surface-tint text-val-heading border border-border-subtle' },
            { name: 'Text Primary', class: 'bg-surface-base text-val-heading border border-border-subtle' },
            { name: 'Text Secondary', class: 'bg-surface-base text-slate-500 border border-border-subtle' },
            { name: 'Success', class: 'bg-emerald-50 text-emerald-700' },
            { name: 'Warning', class: 'bg-amber-50 text-amber-700' },
            { name: 'Danger', class: 'bg-rose-50 text-rose-700' },
            { name: 'Info', class: 'bg-blue-50 text-blue-700' },
          ].map((color) => (
            <div key={color.name} className="flex flex-col gap-2">
              <div className={`h-12 rounded-md flex items-center justify-center text-xs font-medium ${color.class}`}>
                {color.name}
              </div>
              <span className="text-xs text-slate-400">{color.name}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Spacing & Radius Section */}
      <section className="flex flex-col gap-6">
        <h2 className="text-base font-bold text-val-heading">Spacing & Radius</h2>
        <div className="flex flex-wrap gap-8 p-6 bg-surface-base border border-border-default rounded-xl">
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 tracking-wider">Radius Scale</span>
            <div className="flex flex-wrap gap-3">
              <div className="size-12 bg-primary rounded-xs flex items-center justify-center text-white text-[10px]">xs</div>
              <div className="size-12 bg-primary rounded-sm flex items-center justify-center text-white text-[10px]">sm</div>
              <div className="size-12 bg-primary rounded-md flex items-center justify-center text-white text-[10px]">md</div>
              <div className="size-12 bg-primary rounded-lg flex items-center justify-center text-white text-[10px]">lg</div>
              <div className="size-12 bg-primary rounded-xl flex items-center justify-center text-white text-[10px]">xl</div>
            </div>
          </div>
          <div className="flex flex-col gap-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-400 tracking-wider">Spacing Scale</span>
            <div className="flex flex-wrap gap-2">
              {['1', '2', '3', '4', '5', '6', '8', '10'].map(s => (
                <div key={s} className={`bg-surface-sunken border border-border-default flex items-center justify-center text-slate-400 text-xs`}
                     style={{ width: `${parseInt(s)*4}px`, height: `${parseInt(s)*4}px`, minWidth: '20px', minHeight: '20px' }}>
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Empty State Demo */}
      <section className="flex flex-col gap-6">
        <h2 className="text-base font-bold text-val-heading">Primitive: EmptyState</h2>
        <div className="border rounded-xl p-12 bg-surface-base">
          <EmptyState
            title="Creative Reference"
            description="Use this gallery as a starting point for common patterns, but feel free to adapt styles for specific user needs."
            action={<Button size="sm">Explore Patterns</Button>}
          />
        </div>
      </section>
    </div>
  );
}
