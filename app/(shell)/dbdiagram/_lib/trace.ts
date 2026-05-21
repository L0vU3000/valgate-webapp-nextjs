import type { FkEdge, IntrospectedEntity } from "./introspect";

export type TraceStep = {
  source: string;
  sourceField: string;
  target: string;
  edgeId: string;
};

export type Trace = {
  entity: string;
  field: string;
  edgeIds: Set<string>;
  entityIds: Set<string>;
  steps: TraceStep[];
  kind: "forward" | "incoming" | "field-only" | "entity";
};

export function computeTrace(
  clickedEntity: string,
  clickedField: string,
  entities: IntrospectedEntity[],
  fkEdges: FkEdge[],
): Trace {
  const edgeIds = new Set<string>();
  const entityIds = new Set<string>([`entity-${clickedEntity}`]);
  const steps: TraceStep[] = [];

  const entity = entities.find((e) => e.name === clickedEntity);
  const field = entity?.fields.find((f) => f.name === clickedField);

  if (!entity || !field) {
    return {
      entity: clickedEntity,
      field: clickedField,
      edgeIds,
      entityIds,
      steps,
      kind: "field-only",
    };
  }

  const outgoingByEntity = new Map<string, FkEdge[]>();
  const incomingByEntity = new Map<string, FkEdge[]>();
  for (const e of fkEdges) {
    if (!outgoingByEntity.has(e.source)) outgoingByEntity.set(e.source, []);
    outgoingByEntity.get(e.source)!.push(e);
    if (!incomingByEntity.has(e.target)) incomingByEntity.set(e.target, []);
    incomingByEntity.get(e.target)!.push(e);
  }

  if (field.isPK) {
    const incoming = incomingByEntity.get(clickedEntity) ?? [];
    for (const e of incoming) {
      edgeIds.add(e.id);
      entityIds.add(`entity-${e.source}`);
      steps.push({
        source: e.source,
        sourceField: e.field,
        target: e.target,
        edgeId: e.id,
      });
    }
    return {
      entity: clickedEntity,
      field: clickedField,
      edgeIds,
      entityIds,
      steps,
      kind: "incoming",
    };
  }

  if (field.fkTarget) {
    const startEdge = fkEdges.find(
      (e) => e.source === clickedEntity && e.field === clickedField,
    );
    if (!startEdge) {
      return {
        entity: clickedEntity,
        field: clickedField,
        edgeIds,
        entityIds,
        steps,
        kind: "field-only",
      };
    }

    edgeIds.add(startEdge.id);
    entityIds.add(`entity-${startEdge.target}`);
    steps.push({
      source: startEdge.source,
      sourceField: startEdge.field,
      target: startEdge.target,
      edgeId: startEdge.id,
    });

    const visited = new Set<string>([clickedEntity, startEdge.target]);
    const queue: string[] = [startEdge.target];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      const outgoing = outgoingByEntity.get(cur) ?? [];
      for (const e of outgoing) {
        if (visited.has(e.target)) continue;
        edgeIds.add(e.id);
        entityIds.add(`entity-${e.target}`);
        steps.push({
          source: e.source,
          sourceField: e.field,
          target: e.target,
          edgeId: e.id,
        });
        visited.add(e.target);
        queue.push(e.target);
      }
    }

    return {
      entity: clickedEntity,
      field: clickedField,
      edgeIds,
      entityIds,
      steps,
      kind: "forward",
    };
  }

  return {
    entity: clickedEntity,
    field: clickedField,
    edgeIds,
    entityIds,
    steps,
    kind: "field-only",
  };
}

export function computeEntityTrace(
  entityName: string,
  fkEdges: FkEdge[],
): Trace {
  const edgeIds = new Set<string>();
  const entityIds = new Set<string>([`entity-${entityName}`]);
  const steps: TraceStep[] = [];

  for (const e of fkEdges) {
    if (e.source === entityName || e.target === entityName) {
      edgeIds.add(e.id);
      entityIds.add(`entity-${e.source}`);
      entityIds.add(`entity-${e.target}`);
      steps.push({
        source: e.source,
        sourceField: e.field,
        target: e.target,
        edgeId: e.id,
      });
    }
  }

  return {
    entity: entityName,
    field: "",
    edgeIds,
    entityIds,
    steps,
    kind: "entity",
  };
}
