import { REGISTRY_KEYS } from "./registry";

const HARDCODED_FK: Record<string, string> = {
  userId: "users",
  propertyId: "properties",
  tenantId: "tenants",
  leaseId: "leases",
  folderId: "folders",
  parentFolderId: "folders",
  successorId: "successors",
};

const NON_FK_ID_FIELDS = new Set([
  "id",
  "employeeId",
  "taxId",
  "storageId",
  "linkedPropertyIds",
]);

function pluralize(camel: string): string {
  if (camel.endsWith("y")) return `${camel.slice(0, -1)}ies`;
  if (camel.endsWith("s")) return `${camel}es`;
  return `${camel}s`;
}

function camelToKebab(s: string): string {
  return s.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase();
}

export function detectFk(
  fieldName: string,
  ownerEntity: string,
): string | undefined {
  if (NON_FK_ID_FIELDS.has(fieldName)) return undefined;

  if (HARDCODED_FK[fieldName]) {
    const target = HARDCODED_FK[fieldName];
    if (target === ownerEntity) return target;
    return target;
  }

  if (!fieldName.endsWith("Id")) return undefined;
  const stem = fieldName.slice(0, -2);
  if (!stem) return undefined;

  const candidates = [
    pluralize(camelToKebab(stem)),
    camelToKebab(stem),
    pluralize(stem),
    stem,
  ];

  for (const c of candidates) {
    if (REGISTRY_KEYS.includes(c)) return c;
  }
  return undefined;
}
