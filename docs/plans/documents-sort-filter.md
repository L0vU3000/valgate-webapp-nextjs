# Documents — Sort & Filter the files list

**Plan:** `plan-67c3cb0d0a124317` ·
https://plan.agent-native.com/_agent-native/open?app=plan&view=plan&to=%2Fplans%2Fplan-67c3cb0d0a124317&planId=plan-67c3cb0d0a124317

**Status:** approved, ready to implement. Client-side only, one file:
`app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx`.

**Locked decisions:** filter by File type + Category · default sort Date added (newest) ·
local React state (no URL persistence) · sort via dropdown only (no column headers).

---

## Ready-to-paste implementation prompt (for a new Claude Code / Sonnet 4.6 chat)

```
You are a senior Next.js engineer. Implement an APPROVED, client-side-only feature
in this repo (valgate-webapp-nextjs, Next.js 15, Tailwind, shadcn/ui). Write long,
explicit, readable code; add a comment to every function explaining what it does.
Only make the changes described — do NOT refactor unrelated code, add dependencies,
create files, or touch the server/schema.

## Goal
Add a Sort control and a multi-select Filter control to the Files toolbar on the
property Documents page, so a landlord can reorder and narrow the files list.

## Scope — edit ONLY this file
app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx

## Locked decisions (do not re-litigate)
- Filter dimensions: File type + Category.
- Default sort: Date added, newest first.
- State is local React state — NO URL persistence; resets on navigation.
- Sort lives only in a dropdown — NO clickable list-view column headers.
- Everything is client-side over the documents already in props. No server action,
  query, or schema change.

## Reuse what's already imported (do not add deps)
The file already imports DropdownMenu, DropdownMenuTrigger, DropdownMenuContent,
DropdownMenuItem, DropdownMenuSeparator from "@/components/ui/dropdown-menu".
components/ui/dropdown-menu.tsx also exports DropdownMenuCheckboxItem — add it to
that import for the filter checkboxes.

## Orient first (read before editing)
In PropertyDocumentsPage.tsx find: the `FileEntry` type; the `files: FileEntry[]`
derivation from `dbDocuments.map(...)`; the `filteredFiles` const (currently folder
chip only); the Files-section toolbar (left group = "All Files · N files" + Select
toggle; right group = list/grid segmented toggle + Upload File button); and where
`filteredFiles` is passed to <ListView /> and <GridView /> and the empty state.
Document fields available: name, kind, extension, sizeBytes, category
("Title"|"Rental"|"Photos"|"Legal"|"Financial"|"Estate"|"Other"), uploadedAt, and
the derived FileEntry.type ("pdf"|"image"|"spreadsheet"|"doc").

## Implementation steps
1. Imports: add `DropdownMenuCheckboxItem` to the dropdown-menu import; add
   `ArrowDownUp` and `SlidersHorizontal` from "lucide-react" for the trigger icons.
2. Carry raw sort/filter keys on FileEntry — add `sizeBytes?: number`,
   `uploadedAt: number`, `category?: string`; populate them in the existing
   dbDocuments.map(...) (keep the formatted `size`/`date` strings for display).
3. State:
     type SortField = "date" | "name" | "size" | "type";
     const [sortField, setSortField] = useState<SortField>("date");
     const [sortDir, setSortDir] = useState<"asc" | "desc">("desc"); // newest first
     const [typeFilters, setTypeFilters] = useState<Set<string>>(new Set());
     const [categoryFilters, setCategoryFilters] = useState<Set<string>>(new Set());
     const activeFilterCount = typeFilters.size + categoryFilters.size;
4. Replace `filteredFiles` with one derivation (folder chip -> type -> category -> sort):
     function deriveVisibleFiles(): FileEntry[] {
       let out = activeSubfolder ? files.filter((f) => f.folder === activeSubfolder) : files;
       if (typeFilters.size) out = out.filter((f) => typeFilters.has(f.type));
       if (categoryFilters.size) out = out.filter((f) => f.category != null && categoryFilters.has(f.category));
       const dir = sortDir === "asc" ? 1 : -1;
       return [...out].sort((a, b) => {
         switch (sortField) {
           case "name": return a.name.localeCompare(b.name) * dir;
           case "size": return ((a.sizeBytes ?? 0) - (b.sizeBytes ?? 0)) * dir;
           case "type": return a.type.localeCompare(b.type) * dir;
           case "date":
           default:     return (a.uploadedAt - b.uploadedAt) * dir;
         }
       });
     }
     const visibleFiles = deriveVisibleFiles();
   Update the count label and the <ListView/> <GridView/> props from filteredFiles
   to visibleFiles.
5. Sort control — a DropdownMenu pill in the toolbar's right group (match the
   existing Select-toggle button styling: h-7 px-3 rounded border text-[12px]
   font-semibold, slate by default). Fields: Date added, Name, Size, Type. Selecting
   the active field flips direction; show ChevronUp/ChevronDown on the active field;
   tint the active field with text-[--val-primary-dark]:
     function chooseSort(field: SortField) {
       if (field === sortField) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
       else { setSortField(field); setSortDir(field === "name" || field === "type" ? "asc" : "desc"); }
     }
   Use onSelect={(e) => { e.preventDefault(); chooseSort(f.id); }} so the menu stays open.
6. Filter control — a DropdownMenu pill using DropdownMenuCheckboxItem, grouped:
   File type (PDF=pdf, Image=image, Spreadsheet=spreadsheet, Document=doc) then a
   DropdownMenuSeparator then Category (Title, Rental, Photos, Legal, Financial,
   Estate, Other). Multi-select; use onCheckedChange to toggle the matching Set and
   onSelect={(e) => e.preventDefault()} to keep it open. When activeFilterCount > 0,
   the trigger shows a count ("Filter · 2") and the active styling
   (border-[--val-primary-dark] bg-[--val-bg-tint] text-[--val-primary-dark]).
     function toggleSet(set, setter, key) {
       const next = new Set(set); next.has(key) ? next.delete(key) : next.add(key); setter(next);
     }
7. Chips row — render directly below the toolbar ONLY when activeFilterCount > 0.
   One removable chip per active type/category (slate chip + an X that removes that
   key via toggleSet), plus a "Clear all" text button that sets both Sets to new Set().
8. Empty state — branch: if (activeFilterCount > 0 || activeSubfolder) AND
   visibleFiles is empty, show a no-match state ("No documents match these filters",
   short helper, and a "Clear filters" action) — distinct from the existing
   "No documents yet" empty state, which stays for the truly-empty case.

## Design constraints (this project's .impeccable.md)
- Calm by default: resting state shows neutral slate pills and NO chips row; chips
  appear only after a filter is applied.
- Blue is precious: brand tint (--val-primary-dark / --val-bg-tint) marks ONLY the
  active sort field, the Filter count badge/active trigger, and the existing list/grid
  selection. Nothing else.
- The file list stays the hero; Sort/Filter sit quietly in the toolbar's trailing group.
- Borders over shadows for pills and chips; elevation only on the dropdown overlays.
- Specific copy: "No documents match these filters" (not generic); chips name the filter.

## Stop and ask before
- Editing any file other than PropertyDocumentsPage.tsx, adding any dependency, or
  changing anything server-side/schema. (None of these should be needed.)

## Done when (verify, then report results)
- `npx tsc --noEmit` exits 0.
- `npx eslint "app/(shell)/property/[id]/_components/PropertyDocumentsPage.tsx"`
  reports no NEW errors (pre-existing warnings are fine).
- Behaviour: Sort reorders (and flips on re-select) using raw values; Filter
  multi-selects by type+category with a count badge and removable chips; Sort +
  Filter + folder chip compose and the "N files" count matches; no-match state shows
  when filters exclude everything; both list and grid reflect the result.
Report the tsc/eslint output verbatim and a short summary of what changed. Do not
commit unless asked.
```

🎯 Target: Claude Code (Sonnet 4.6) · 💡 Front-loaded scope/decisions/stop-conditions
and inlined the full code stubs so a fresh session implements it in one pass with no
re-prompting.
