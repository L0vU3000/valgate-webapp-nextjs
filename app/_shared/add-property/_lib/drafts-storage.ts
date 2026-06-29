import type { DraftRecord } from "@/app/_shared/add-property/types";

const STORAGE_KEY = "valgate:add-property:drafts:v1";

function serializeDraft(r: DraftRecord): DraftRecord {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { photoFile: _pf, uploadFile: _uf, ...rest } = r.form;
  return { ...r, form: rest as DraftRecord["form"] };
}

export function readDrafts(): DraftRecord[] {
  try {
    if (typeof window === "undefined") return [];
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as DraftRecord[];
  } catch {
    return [];
  }
}

export function upsertDraft(r: DraftRecord): void {
  try {
    if (typeof window === "undefined") return;
    const drafts = readDrafts();
    const idx = drafts.findIndex((d) => d.id === r.id);
    const serialized = serializeDraft(r);
    if (idx >= 0) {
      drafts[idx] = serialized;
    } else {
      drafts.push(serialized);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // quota exceeded or private mode — silently ignore
  }
}

export function deleteDraft(id: string): void {
  try {
    if (typeof window === "undefined") return;
    const drafts = readDrafts().filter((d) => d.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
  } catch {
    // ignore
  }
}

export function clearAll(): void {
  try {
    if (typeof window === "undefined") return;
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}
