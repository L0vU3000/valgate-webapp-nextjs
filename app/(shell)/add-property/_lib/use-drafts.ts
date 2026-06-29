"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { FormData, Step, DraftRecord } from "../_components/types";
import { defaultForm } from "../_components/types";
import type { PropertyDraft } from "@/lib/services/property-drafts";
import {
  listPropertyDraftsAction,
  upsertPropertyDraftAction,
  deletePropertyDraftAction,
} from "@/app/actions/property-drafts";

// Server is now the single store for drafts (Neon, via the property-draft actions). These
// localStorage keys only survive to be read ONCE and migrated up to the server, then cleared.
const STORAGE_KEY = "valgate:add-property:drafts:v1";
const ACTIVE_KEY = "valgate:add-property:active-draft:v1";
const LEGACY_DRAFTS_KEY = "add-property-drafts";
const LEGACY_ACTIVE_KEY = "add-property-active-draft";

const AUTOSAVE_DEBOUNCE_MS = 800;

// The public shape is UNCHANGED from the localStorage version, so AddPropertyFlow /
// Step0NewOrDraft barely change — only the internals now talk to the server.
interface UseDraftsReturn {
  drafts: DraftRecord[];
  activeId: string | null;
  mounted: boolean;
  setActive: (id: string) => void;
  upsert: (id: string, form: FormData, step: Step) => void;
  remove: (id: string) => void;
  clearActive: () => void;
}

// File blobs never reach the server jsonb: the actual photo/document bytes are staged as
// separate S3 objects + property_draft_files rows (Phase 4). Here we strip the in-memory
// File handles and the transient name fields so only the serializable text form is saved.
function stripFileBlobs(form: FormData): FormData {
  // Drop everything file-related before persisting the form jsonb: the in-memory Step-0 blobs and
  // the Step-4 staged references + display names. Media is the property_draft_files rows' job — it's
  // rebuilt from them on resume, so persisting it here too would only risk a desynced second copy.
  const {
    photoFile: _pf, uploadFile: _uf, stagedPhotos: _sp, stagedDocuments: _sd, ...rest
  } = form;
  void _pf;
  void _uf;
  void _sp;
  void _sd;
  return {
    ...rest,
    photos: [],
    documents: [],
    photoFileName: "",
    uploadFileName: "",
  } as FormData;
}

// Maps a server draft (form is opaque jsonb) back to the wizard's DraftRecord. Merge over
// defaultForm so any field the draft predates is still present and typed.
function serverToRecord(d: PropertyDraft): DraftRecord {
  return {
    id: d.id,
    title: d.title,
    form: { ...defaultForm, ...(d.form as Partial<FormData>) },
    step: d.step as Step,
    updatedAt: d.updatedAt,
  };
}

const isServerId = (id: string): boolean => id.startsWith("DRFT-");

function draftTitleFrom(form: FormData): string {
  return form.propertyName?.trim() || "Untitled Property";
}

export function useDrafts(): UseDraftsReturn {
  const [drafts, setDrafts] = useState<DraftRecord[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  // Autosave plumbing (refs so the debounced callback never reads stale React state):
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<{ id: string; form: FormData; step: Step } | null>(null);
  // True while a CREATE round-trip is in flight — stops a second debounce tick from minting
  // a duplicate draft before the first create returns its id. (requirement: no duplicate drafts)
  const creatingRef = useRef(false);
  // Maps a temporary client id (the uuid AddPropertyFlow assigns before the first save) to the
  // server-minted DRFT id, so any late save against the temp id resolves to an UPDATE, not a CREATE.
  const idMapRef = useRef<Map<string, string>>(new Map());

  // Inserts or replaces a draft in local display state (newest first by updatedAt).
  const upsertDraftState = useCallback((d: PropertyDraft) => {
    const record = serverToRecord(d);
    setDrafts((prev) => {
      const without = prev.filter((x) => x.id !== record.id);
      return [record, ...without].sort((a, b) => b.updatedAt - a.updatedAt);
    });
  }, []);

  // Flushes the latest pending edit to the server: UPDATE if we already have a server id for it,
  // otherwise CREATE (once) and adopt the returned DRFT id as the active draft.
  const flush = useCallback(async () => {
    const pending = pendingRef.current;
    if (!pending) return;

    // Resolve the temp id to its server id if the create already happened.
    const mapped = idMapRef.current.get(pending.id);
    const effectiveId = mapped ?? pending.id;
    const title = draftTitleFrom(pending.form);
    const form = stripFileBlobs(pending.form) as unknown as Record<string, unknown>;

    if (isServerId(effectiveId)) {
      const res = await upsertPropertyDraftAction({ id: effectiveId, title, step: pending.step, form });
      if (res.ok) upsertDraftState(res.data);
      return;
    }

    // Needs a CREATE. Skip if one is already running — the trailing edit is saved right after the
    // id swap (the active-id change re-triggers autosave with the latest form).
    if (creatingRef.current) return;
    creatingRef.current = true;
    try {
      const res = await upsertPropertyDraftAction({ title, step: pending.step, form });
      if (res.ok) {
        idMapRef.current.set(pending.id, res.data.id); // temp → server, for any in-flight saves
        upsertDraftState(res.data);
        setActiveId(res.data.id);                       // swap active id → AddPropertyFlow reflects it into the URL
      }
    } finally {
      creatingRef.current = false;
    }
  }, [upsertDraftState]);

  // Load drafts from the server on mount, after a one-time migration of any legacy local drafts.
  useEffect(() => {
    let cancelled = false;

    async function migrateLegacyLocalDrafts(): Promise<void> {
      try {
        const raw = localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_DRAFTS_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw) as DraftRecord[];
        // Legacy drafts are text-only (file names were already cleared on persist), so we push
        // just the form fields — there are no staged files to recreate.
        for (const d of parsed) {
          const form = { ...defaultForm, ...(d.form ?? {}) } as FormData;
          await upsertPropertyDraftAction({
            title: d.title || draftTitleFrom(form),
            step: (d.step ?? 0) as Step,
            form: stripFileBlobs(form) as unknown as Record<string, unknown>,
          });
        }
      } catch {
        // A corrupt local payload must never block the wizard — skip migration and move on.
      } finally {
        // Clear every local draft key so we never migrate (or read) them again.
        [STORAGE_KEY, ACTIVE_KEY, LEGACY_DRAFTS_KEY, LEGACY_ACTIVE_KEY].forEach((k) => {
          try { localStorage.removeItem(k); } catch { /* ignore */ }
        });
      }
    }

    (async () => {
      await migrateLegacyLocalDrafts();
      const res = await listPropertyDraftsAction();
      if (cancelled) return;
      if (res.ok) setDrafts(res.data.map(serverToRecord));
      setMounted(true);
    })();

    return () => { cancelled = true; };
  }, []);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  // Debounced autosave entry point. AddPropertyFlow calls this on every form/step change.
  const upsert = useCallback((id: string, form: FormData, step: Step) => {
    pendingRef.current = { id, form, step };
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { void flush(); }, AUTOSAVE_DEBOUNCE_MS);
  }, [flush]);

  // Deletes a draft from the server (S3 objects + rows) and from local display state.
  const remove = useCallback((id: string) => {
    const serverId = idMapRef.current.get(id) ?? id;
    setDrafts((prev) => prev.filter((d) => d.id !== id && d.id !== serverId));
    if (isServerId(serverId)) {
      void deletePropertyDraftAction(serverId);
    }
    setActiveId((prev) => (prev === id || prev === serverId ? null : prev));
  }, []);

  // Clears the active draft and cancels any queued autosave (e.g. after a successful submit).
  const clearActive = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    pendingRef.current = null;
    setActiveId(null);
  }, []);

  return { drafts, activeId, mounted, setActive, upsert, remove, clearActive };
}
