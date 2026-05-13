import { detectFk } from "./fk-detector";
import { SCHEMA_REGISTRY, STUB_ENTITIES, type EntitySchema } from "./registry";

export type IntrospectedFieldType =
  | "string"
  | "number"
  | "boolean"
  | "enum"
  | "array"
  | "object"
  | "literal"
  | "record"
  | "union"
  | "unknown";

export type IntrospectedField = {
  name: string;
  type: IntrospectedFieldType;
  required: boolean;
  enumValues?: string[];
  refinements: string[];
  fkTarget?: string;
  isPK: boolean;
  isUserId: boolean;
};

export type IntrospectedEntity = {
  name: string;
  fieldCount: number;
  fields: IntrospectedField[];
  isStub?: boolean;
  note?: string;
};

type ZodAnyDef = {
  type?: string;
  innerType?: { _def?: ZodAnyDef };
  element?: { _def?: ZodAnyDef };
  entries?: Record<string, string | number>;
  values?: unknown[];
  checks?: unknown[];
  options?: unknown[];
  isInt?: boolean;
  format?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
};

function getDef(node: unknown): ZodAnyDef | null {
  if (!node || typeof node !== "object") return null;
  const obj = node as { _def?: ZodAnyDef; def?: ZodAnyDef };
  return obj._def ?? obj.def ?? null;
}

function describeChecks(def: ZodAnyDef): string[] {
  const out: string[] = [];
  if (def.isInt) out.push("int");
  if (typeof def.minValue === "number" && def.minValue !== null) {
    out.push(`min(${def.minValue})`);
  }
  if (typeof def.maxValue === "number" && def.maxValue !== null) {
    out.push(`max(${def.maxValue})`);
  }
  if (def.format && typeof def.format === "string") {
    out.push(def.format);
  }
  return out;
}

function classifyField(
  fieldNode: unknown,
  fieldName: string,
  ownerEntity: string,
): IntrospectedField {
  let required = true;
  let cursor: unknown = fieldNode;
  let def = getDef(cursor);

  while (def && (def.type === "optional" || def.type === "nullable" || def.type === "default")) {
    if (def.type === "optional" || def.type === "nullable") required = false;
    cursor = def.innerType;
    def = getDef(cursor);
  }

  if (!def) {
    return {
      name: fieldName,
      type: "unknown",
      required,
      refinements: [],
      isPK: fieldName === "id",
      isUserId: fieldName === "userId",
      fkTarget: detectFk(fieldName, ownerEntity),
    };
  }

  const refinements = describeChecks(def);
  const fkTarget = detectFk(fieldName, ownerEntity);
  const isPK = fieldName === "id";
  const isUserId = fieldName === "userId";

  let type: IntrospectedFieldType = "unknown";
  let enumValues: string[] | undefined;

  switch (def.type) {
    case "string":
      type = "string";
      break;
    case "number":
      type = "number";
      break;
    case "boolean":
      type = "boolean";
      break;
    case "enum":
      type = "enum";
      enumValues = def.entries
        ? Object.values(def.entries).map((v) => String(v))
        : [];
      break;
    case "literal":
      type = "literal";
      enumValues = (def.values ?? []).map((v) => String(v));
      break;
    case "array": {
      type = "array";
      const innerDef = getDef(def.element);
      if (innerDef?.type) refinements.push(`of ${innerDef.type}`);
      break;
    }
    case "object":
      type = "object";
      break;
    case "record":
      type = "record";
      break;
    case "union":
      type = "union";
      break;
    default:
      type = "unknown";
      break;
  }

  return {
    name: fieldName,
    type,
    required,
    enumValues,
    refinements,
    fkTarget,
    isPK,
    isUserId,
  };
}

function introspectEntity(name: string, schema: EntitySchema): IntrospectedEntity {
  let fields: IntrospectedField[] = [];
  try {
    const shape = (schema as unknown as { shape: Record<string, unknown> }).shape;
    if (shape && typeof shape === "object") {
      fields = Object.entries(shape).map(([fieldName, node]) =>
        classifyField(node, fieldName, name),
      );
    }
  } catch {
    fields = [];
  }
  return { name, fieldCount: fields.length, fields };
}

export function introspectAll(): IntrospectedEntity[] {
  const entities: IntrospectedEntity[] = Object.entries(SCHEMA_REGISTRY)
    .map(([name, schema]) => introspectEntity(name, schema))
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const stub of STUB_ENTITIES) {
    entities.push({
      name: stub.name,
      fieldCount: 1,
      fields: [
        {
          name: "id",
          type: "string",
          required: true,
          refinements: [],
          isPK: true,
          isUserId: false,
        },
      ],
      isStub: true,
      note: stub.note,
    });
  }

  return entities;
}

export type FkEdge = {
  id: string;
  source: string;
  target: string;
  field: string;
};

export function deriveEdges(entities: IntrospectedEntity[]): FkEdge[] {
  const names = new Set(entities.map((e) => e.name));
  const edges: FkEdge[] = [];
  for (const entity of entities) {
    for (const field of entity.fields) {
      if (!field.fkTarget) continue;
      if (!names.has(field.fkTarget)) continue;
      if (field.fkTarget === entity.name && field.name === "id") continue;
      edges.push({
        id: `${entity.name}.${field.name}->${field.fkTarget}`,
        source: entity.name,
        target: field.fkTarget,
        field: field.name,
      });
    }
  }
  return edges;
}
