"use client";
import {
  Background,
  Controls,
  MarkerType,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { saveDiagramState, resetDiagramState } from "../actions";
import { defaultColorFor } from "../_lib/default-layout";
import {
  computeGroupRects,
  estimateCardHeight,
} from "../_lib/groups";
import type { LayoutPositions } from "../_lib/dagre-layout";
import type { FkEdge, IntrospectedEntity } from "../_lib/introspect";
import { computeTrace, type Trace, type TraceStep } from "../_lib/trace";
import type {
  DbdiagramNote,
  DbdiagramState,
} from "@/lib/data/types/dbdiagram-state";
import { EntityNode } from "./EntityNode";
import { Note } from "./Note";
import { AnnotationPanel } from "./AnnotationPanel";
import { GroupFrame } from "./GroupFrame";
import { TracePill } from "./TracePill";

type Props = {
  entities: IntrospectedEntity[];
  edges: FkEdge[];
  initialState: DbdiagramState;
  layout: LayoutPositions;
};

type NodeMeta = Record<string, { x: number; y: number; color?: string }>;

const nodeTypes: NodeTypes = {
  entity: EntityNode,
  note: Note,
  groupFrame: GroupFrame,
};

const SAVE_DEBOUNCE_MS = 350;
const HIGHLIGHT_COLOR = "#0ea5e9";
const EDGE_DEFAULT_COLOR = "#94a3b8";

function positionFor(
  name: string,
  layout: LayoutPositions,
): { x: number; y: number } {
  return layout[name] ?? { x: 0, y: 0 };
}

function entityNodeFor(
  entity: IntrospectedEntity,
  meta: NodeMeta[string] | undefined,
  layout: LayoutPositions,
  onColorPick: (name: string) => void,
  onFieldClick: (entityName: string, fieldName: string) => void,
): Node {
  const position = meta
    ? { x: meta.x, y: meta.y }
    : positionFor(entity.name, layout);
  const color = meta?.color ?? defaultColorFor(entity.name);
  return {
    id: `entity-${entity.name}`,
    type: "entity",
    position,
    data: {
      entity,
      color,
      dimmed: false,
      activeFieldName: null,
      onColorPick,
      onFieldClick,
    },
    draggable: true,
  };
}

function noteNodeFor(
  note: DbdiagramNote,
  onChange: (id: string, text: string) => void,
  onDelete: (id: string) => void,
): Node {
  return {
    id: `note-${note.id}`,
    type: "note",
    position: { x: note.x, y: note.y },
    data: {
      id: note.id,
      text: note.text,
      color: note.color,
      onChange,
      onDelete,
    },
    draggable: true,
  };
}

function groupNodesFor(
  entities: IntrospectedEntity[],
  positionsByName: Map<string, { x: number; y: number }>,
): Node[] {
  const positions = new Map<
    string,
    { x: number; y: number; height: number }
  >();
  for (const entity of entities) {
    const p = positionsByName.get(entity.name);
    if (!p) continue;
    const height = estimateCardHeight(entity.fieldCount, Boolean(entity.note));
    positions.set(entity.name, { x: p.x, y: p.y, height });
  }
  return computeGroupRects(positions).map((rect) => ({
    id: rect.id,
    type: "groupFrame",
    position: { x: rect.x, y: rect.y },
    data: {
      label: rect.label,
      width: rect.width,
      height: rect.height,
      borderColor: rect.borderColor,
      bgColor: rect.bgColor,
      labelColor: rect.labelColor,
    },
    draggable: false,
    selectable: false,
    focusable: false,
    zIndex: -1,
  }));
}

function buildEdges(
  fkEdges: FkEdge[],
  entityPositions: Map<string, { x: number; y: number }>,
  trace: Trace | null,
): Edge[] {
  return fkEdges.map((e) => {
    const pkP = entityPositions.get(e.target);
    const fkP = entityPositions.get(e.source);
    let pkSide: "L" | "R" = "R";
    let fkSide: "L" | "R" = "L";
    if (pkP && fkP) {
      if (pkP.x > fkP.x) {
        pkSide = "L";
        fkSide = "R";
      }
    }
    const isHighlighted = trace ? trace.edgeIds.has(e.id) : false;
    const isDimmed = trace !== null && !isHighlighted;
    const stroke = isHighlighted ? HIGHLIGHT_COLOR : EDGE_DEFAULT_COLOR;
    return {
      id: e.id,
      source: `entity-${e.target}`,
      target: `entity-${e.source}`,
      sourceHandle: `id-${pkSide}`,
      targetHandle: `${e.field}-${fkSide}`,
      type: "smoothstep",
      pathOptions: { borderRadius: 14, offset: 18 },
      animated: false,
      style: {
        stroke,
        strokeWidth: isHighlighted ? 2.5 : 1.25,
        opacity: isDimmed ? 0.18 : 1,
        ...(isHighlighted
          ? {
              strokeDasharray: "8 4",
              animationName: "edge-trace-flow",
              animationDuration: "0.5s",
              animationTimingFunction: "linear",
              animationIterationCount: "infinite",
            }
          : {}),
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: stroke,
        width: isHighlighted ? 16 : 14,
        height: isHighlighted ? 16 : 14,
      },
      zIndex: isHighlighted ? 10 : 0,
    };
  });
}

function entityPositionsFromNodes(
  nodes: Node[],
): Map<string, { x: number; y: number }> {
  const positions = new Map<string, { x: number; y: number }>();
  for (const n of nodes) {
    if (n.type === "entity") {
      positions.set(n.id.replace(/^entity-/, ""), n.position);
    }
  }
  return positions;
}

function applyTraceToNodes(nodes: Node[], trace: Trace | null): Node[] {
  return nodes.map((n) => {
    if (n.type !== "entity") return n;
    const name = n.id.replace(/^entity-/, "");
    const dimmed = trace !== null && !trace.entityIds.has(n.id);
    const activeFieldName =
      trace && trace.entity === name ? trace.field : null;
    const cur = n.data as {
      dimmed?: boolean;
      activeFieldName?: string | null;
    };
    if (cur.dimmed === dimmed && cur.activeFieldName === activeFieldName) {
      return n;
    }
    return {
      ...n,
      data: { ...n.data, dimmed, activeFieldName },
    };
  });
}

function Inner({ entities, edges, initialState, layout }: Props) {
  const flow = useReactFlow();
  const [colorPickFor, setColorPickFor] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [trace, setTrace] = useState<Trace | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const nodeMetaRef = useRef<NodeMeta>({ ...initialState.nodes });
  const notesRef = useRef<DbdiagramNote[]>([...initialState.notes]);

  const persist = useCallback(() => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      try {
        await saveDiagramState({
          nodes: nodeMetaRef.current,
          notes: notesRef.current,
        });
      } finally {
        setSaving(false);
      }
    }, SAVE_DEBOUNCE_MS);
  }, []);

  const handleColorPickRequest = useRef((name: string) => {
    setColorPickFor(name);
  }).current;

  const handleFieldClickRef = useRef<
    (entityName: string, fieldName: string) => void
  >(() => {});
  const handleNoteChangeRef = useRef<(id: string, text: string) => void>(
    () => {},
  );
  const handleNoteDeleteRef = useRef<(id: string) => void>(() => {});

  const stableFieldClick = useCallback(
    (entityName: string, fieldName: string) =>
      handleFieldClickRef.current(entityName, fieldName),
    [],
  );

  const initialNodes = useMemo<Node[]>(() => {
    const entityNodes = entities.map((entity) =>
      entityNodeFor(
        entity,
        initialState.nodes[entity.name],
        layout,
        handleColorPickRequest,
        stableFieldClick,
      ),
    );
    const noteNodes = initialState.notes.map((note) =>
      noteNodeFor(
        note,
        (id, text) => handleNoteChangeRef.current(id, text),
        (id) => handleNoteDeleteRef.current(id),
      ),
    );
    const positions = entityPositionsFromNodes(entityNodes);
    const groupNodes = groupNodesFor(entities, positions);
    return [...groupNodes, ...entityNodes, ...noteNodes];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);

  const [flowEdges, setFlowEdges] = useState<Edge[]>(() =>
    buildEdges(edges, entityPositionsFromNodes(initialNodes), null),
  );

  // Refs that mirror the latest values so callbacks can read them without
  // taking a dep on state (avoids re-creating callbacks on every render).
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const traceRef = useRef<Trace | null>(null);
  traceRef.current = trace;

  // Trace click handler — toggles off if clicking same field, otherwise
  // computes a new trace. All side effects live in the event handler body so
  // StrictMode double-invocation of state updaters doesn't double-trigger them.
  handleFieldClickRef.current = useCallback(
    (entityName: string, fieldName: string) => {
      const prev = traceRef.current;
      const isToggleOff =
        prev && prev.entity === entityName && prev.field === fieldName;
      const next = isToggleOff
        ? null
        : computeTrace(entityName, fieldName, entities, edges);
      const positions = entityPositionsFromNodes(nodesRef.current);
      setNodes((current) => applyTraceToNodes(current, next));
      setFlowEdges(buildEdges(edges, positions, next));
      setTrace(next);
    },
    [edges, entities, setNodes],
  );

  const handleNarrowTrace = useCallback(
    (step: TraceStep) => {
      const narrowed: Trace = {
        entity: step.source,
        field: step.sourceField,
        kind: "forward",
        edgeIds: new Set([step.edgeId]),
        entityIds: new Set([`entity-${step.source}`, `entity-${step.target}`]),
        steps: [step],
      };
      const positions = entityPositionsFromNodes(nodesRef.current);
      setNodes((current) => applyTraceToNodes(current, narrowed));
      setFlowEdges(buildEdges(edges, positions, narrowed));
      setTrace(narrowed);
    },
    [edges, setNodes],
  );

  const clearTrace = useCallback(() => {
    if (!traceRef.current) return;
    const positions = entityPositionsFromNodes(nodesRef.current);
    setNodes((current) => applyTraceToNodes(current, null));
    setFlowEdges(buildEdges(edges, positions, null));
    setTrace(null);
  }, [edges, setNodes]);

  const refreshGroupsAndEdges = useCallback(() => {
    setNodes((current) => {
      const positions = entityPositionsFromNodes(current);
      const newGroups = groupNodesFor(entities, positions);
      const nonGroup = current.filter((n) => n.type !== "groupFrame");
      return [...newGroups, ...nonGroup];
    });
    const positions = entityPositionsFromNodes(nodesRef.current);
    setFlowEdges(buildEdges(edges, positions, traceRef.current));
  }, [entities, edges, setNodes]);

  handleNoteChangeRef.current = useCallback(
    (id: string, text: string) => {
      notesRef.current = notesRef.current.map((n) =>
        n.id === id ? { ...n, text } : n,
      );
      setNodes((prev) =>
        prev.map((n) =>
          n.id === `note-${id}` ? { ...n, data: { ...n.data, text } } : n,
        ),
      );
      persist();
    },
    [persist, setNodes],
  );

  handleNoteDeleteRef.current = useCallback(
    (id: string) => {
      notesRef.current = notesRef.current.filter((n) => n.id !== id);
      setNodes((prev) => prev.filter((n) => n.id !== `note-${id}`));
      persist();
    },
    [persist, setNodes],
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && trace) {
        clearTrace();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [trace, clearTrace]);

  const onNodeDragStop = useCallback(
    (_evt: React.MouseEvent | MouseEvent | TouchEvent, node: Node) => {
      if (node.type === "entity") {
        const name = node.id.replace(/^entity-/, "");
        const prev = nodeMetaRef.current[name];
        nodeMetaRef.current = {
          ...nodeMetaRef.current,
          [name]: {
            x: node.position.x,
            y: node.position.y,
            color: prev?.color,
          },
        };
        refreshGroupsAndEdges();
        persist();
      } else if (node.type === "note") {
        const id = node.id.replace(/^note-/, "");
        notesRef.current = notesRef.current.map((n) =>
          n.id === id
            ? { ...n, x: node.position.x, y: node.position.y }
            : n,
        );
        persist();
      }
    },
    [persist, refreshGroupsAndEdges],
  );

  const handlePanTo = useCallback(
    (name: string) => {
      const node = nodes.find((n) => n.id === `entity-${name}`);
      if (!node) return;
      flow.setCenter(node.position.x + 130, node.position.y + 100, {
        zoom: 1,
        duration: 400,
      });
    },
    [flow, nodes],
  );

  const handleAddNote = useCallback(() => {
    const center = flow.screenToFlowPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    });
    const id = `n-${Date.now().toString(36)}`;
    const note: DbdiagramNote = {
      id,
      x: center.x - 100,
      y: center.y - 40,
      text: "",
      color: "#fef3c7",
    };
    notesRef.current = [...notesRef.current, note];
    setNodes((prev) => [
      ...prev,
      noteNodeFor(
        note,
        (nid, text) => handleNoteChangeRef.current(nid, text),
        (nid) => handleNoteDeleteRef.current(nid),
      ),
    ]);
    persist();
  }, [flow, persist, setNodes]);

  const handleReset = useCallback(async () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setSaving(true);
    try {
      await resetDiagramState();
      nodeMetaRef.current = {};
      notesRef.current = [];
      setTrace(null);
      const entityNodes = entities.map((entity) =>
        entityNodeFor(
          entity,
          undefined,
          layout,
          handleColorPickRequest,
          stableFieldClick,
        ),
      );
      const positions = entityPositionsFromNodes(entityNodes);
      const groupNodes = groupNodesFor(entities, positions);
      setNodes([...groupNodes, ...entityNodes]);
      setFlowEdges(buildEdges(edges, positions, null));
    } finally {
      setSaving(false);
    }
  }, [
    entities,
    edges,
    handleColorPickRequest,
    layout,
    setNodes,
    stableFieldClick,
  ]);

  const handlePickColor = useCallback(
    (name: string, color: string) => {
      const cur = nodeMetaRef.current[name];
      const fallback = positionFor(name, layout);
      nodeMetaRef.current = {
        ...nodeMetaRef.current,
        [name]: {
          x: cur?.x ?? fallback.x,
          y: cur?.y ?? fallback.y,
          color,
        },
      };
      setNodes((prev) =>
        prev.map((n) =>
          n.id === `entity-${name}`
            ? { ...n, data: { ...n.data, color } }
            : n,
        ),
      );
      setColorPickFor(null);
      persist();
    },
    [layout, persist, setNodes],
  );

  const minimapNodeColor = useCallback((n: Node) => {
    if (n.type === "groupFrame") return "transparent";
    if (n.type === "note") return "#fde68a";
    const data = n.data as { color?: string } | undefined;
    if (data?.color) return data.color;
    const name = n.id.replace(/^entity-/, "");
    return defaultColorFor(name);
  }, []);

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onNodeDragStop={onNodeDragStop}
        onPaneClick={clearTrace}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
        nodesConnectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        elementsSelectable={false}
        zoomOnDoubleClick={false}
        defaultEdgeOptions={{ type: "smoothstep" }}
      >
        <Background gap={28} size={1} color="#e5e7eb" />
        <Controls position="bottom-left" showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={minimapNodeColor}
          maskColor="rgba(15,23,42,0.05)"
        />
      </ReactFlow>
      {trace && (
        <TracePill
          trace={trace}
          onClear={clearTrace}
          onStepClick={handleNarrowTrace}
        />
      )}
      <AnnotationPanel
        entities={entities}
        onPanTo={handlePanTo}
        onAddNote={handleAddNote}
        onReset={handleReset}
        onPickColor={handlePickColor}
        colorPickFor={colorPickFor}
        saving={saving}
      />
    </>
  );
}

export function SchemaDiagram(props: Props) {
  return (
    <ReactFlowProvider>
      <Inner {...props} />
    </ReactFlowProvider>
  );
}
