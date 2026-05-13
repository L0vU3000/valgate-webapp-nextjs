import { getDbdiagramData } from "./queries";
import { SchemaDiagram } from "./_components/SchemaDiagram";

export const dynamic = "force-dynamic";

export default async function DbDiagramPage() {
  const data = await getDbdiagramData();
  return (
    <div className="flex h-[calc(100vh-3.5rem)] w-full flex-col bg-neutral-50">
      <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-6 py-3">
        <div>
          <h1 className="text-base font-semibold text-neutral-900">
            Schema diagram
          </h1>
          <p className="text-xs text-neutral-500">
            Live ER view introspected from{" "}
            <code className="rounded bg-neutral-100 px-1 py-0.5 text-[11px]">
              lib/data/types/*.ts
            </code>
            {" "}— {data.entities.length} entities · {data.edges.length} relations · vertical Dagre layout
          </p>
        </div>
      </header>
      <div className="relative flex-1">
        <SchemaDiagram
          entities={data.entities}
          edges={data.edges}
          initialState={data.state}
          layout={data.layout}
        />
      </div>
    </div>
  );
}
