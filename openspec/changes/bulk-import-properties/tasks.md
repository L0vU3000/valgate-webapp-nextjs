## 1. Entry point

- [x] 1.1 Add an **"Import from spreadsheet"** method card to `Step0NewOrDraft.tsx` (active, not
      "Coming soon"); `onClick` → `router.push("/add-property/import")`
- [x] 1.2 Leave the **Upload document** / **Take a photo** cards untouched (still disabled)

## 2. Parsing (client)

- [x] 2.1 `_lib/parse-spreadsheet.ts`: parse a `File` → `{ headers: string[], rows: Record<string,string>[] }`;
      CSV via `papaparse` (installed)
- [x] 2.2 `.xlsx` branch — either the chosen `.xlsx` reader (first sheet → rows) **or**, if CSV-only
      is chosen, reject `.xlsx` with the "export as CSV" hint (per design's open decision)
- [x] 2.3 Enforce caps: reuse `MAX_FILE_BYTES` for size; hard-cap **100 data rows** with a clear
      message when exceeded

## 3. AI column mapping (server)

- [x] 3.1 `lib/services/property-import.ts` (`server-only`): `mapColumns(headers, sampleRows)` using
      `generateObject` (`ai` + `@ai-sdk/openai`, `gpt-4o-mini`) with a Zod schema of
      `ValgateField → sourceColumn | null` + enum-value hints for `type`/`status`
- [x] 3.2 Graceful degrade when `OPENAI_API_KEY` is unset → return an empty mapping + flag so the UI
      falls back to manual mapping (no crash)
- [x] 3.3 `app/actions/property-import.ts`: `mapSpreadsheetColumnsAction(headers, sampleRows)` — auth
      via ctx, generic errors, returns the mapping

## 4. Apply mapping + geocode

- [x] 4.1 In `property-import.ts`: `applyMapping(rows, fieldMap)` → wizard `FormData[]`, reusing the
      existing `parseCurrency` / `parseFloatSafe` / date parsers (extract them from
      `app/(shell)/add-property/actions.ts` into a shared spot if needed)
- [x] 4.2 Server geocode helper: address string → `[lng, lat]` via Mapbox
      (`NEXT_PUBLIC_MAPBOX_TOKEN`), unique-address dedupe, small concurrency cap; failure → unset +
      "needs location" flag
- [x] 4.3 `geocodeAddressesAction(addresses[])` action wrapping 4.2

## 5. Review + commit

- [x] 5.1 `bulkCreatePropertiesAction(candidates)`: per-row — validate via `fullPropertySchema`, then
      `createProperty(ctx, …)`; **partial success**; returns `{ created, failures[{row, reason}] }`;
      `revalidateFeTag("properties")` on success
- [x] 5.2 Confirm org-scope/IDOR: creates only ever target `ctx.orgId` (no cross-org param) 🔴 security checkpoint

## 6. UI

- [x] 6.1 `app/(shell)/add-property/import/page.tsx` — server shell (auth, renders `ImportFlow`)
- [x] 6.2 `ImportFlow.tsx` — client orchestrator holding `stage: upload | review`, the parsed data,
      the mapping, and the candidates
- [x] 6.3 `UploadStep.tsx` — drop zone (`.csv,.xlsx`), size/row-cap errors, "parsing…" state
- [x] 6.4 `MappingReview.tsx` — shows the AI's column matches (editable), then the candidate table:
      editable cells, per-row problem flags (missing required field / needs location), "Import N
      properties" button
- [x] 6.5 Result state — "Created N. M rows need attention" with the failing rows + reasons and a
      "Retry these" affordance

## 7. Verify

- [ ] 7.1 `/verify` — drive the real flow: upload a small sample sheet, confirm the AI mapping, fix a
      flagged row, import, and confirm the new properties appear in `/portfolio` scoped to the org
      (PENDING — needs a running app + login + a live upload; steps handed to the user)
- [ ] 7.2 Edge checks: a row missing a name (flagged, not created), an un-geocodable address
      (flagged), a `>100`-row file (rejected), a mix where some rows succeed and some fail
