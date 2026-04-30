# 02 — Write Map

> Per-route inventory of every write surface. Validation column says one of: `<Zod schema>`, `none`, `ad-hoc client check`. Target column says one of: `<server action>`, `localStorage:<key>`, `state only`, `none`.

---

## Auth group `(auth)`

### `/login`
- **Auth**: unauthenticated
- **Writes**:

| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `email` | text | none | none (mock; sets 800ms timer then redirects to `/`) | `Session` |
| `password` | password | none | none | `Session` |
| `rememberMe` | checkbox | none | state only | `Session` |
| Sign-in submit | button | none | none (mock redirect) | `Session` |

### `/register`
- **Auth**: unauthenticated
- **Writes**:

| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `fullName` | text | none | none | `User` |
| `email` | email | none | none | `User` |
| `password` | password | ad-hoc client check (regex strength scoring) | none | `User` |
| `confirmPassword` | password | none | none | `User` |
| `agreed` (ToS) | checkbox | none | state only | `User` |
| Submit | button | none | none (renders local success card) | `User` |

---

## Shell group `(shell)`

### `/` (home)
- **Auth**: signed in
- **Writes**: none persisted. Map pin click, command-palette open, table expand are all `state only`.

### `/portfolio`
- **Auth**: signed in
- **Writes**: all client-side filtering only.

| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `searchQuery` | text | none | state only | (UI filter) |
| `typeFilter` | select | none | state only | (UI filter) |
| `statusFilter` | select | none | state only | (UI filter) |
| `provinceFilter` | select | none | state only | (UI filter) |
| `currentPage` | pagination click | none | state only | (UI filter) |

"Add Property" button navigates to `/add-property`; not a write.

### `/property/[id]/overview`
- **Auth**: signed in (no ownership check)
- **Writes**: none.

### `/property/[id]/documents`
- **Auth**: signed in (no ownership check)
- **Writes**:

| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `selectedFiles` (multi-select) | checkbox set | none | state only (`Set<string>`) | `Document` |
| `viewMode` (List/Grid) | toggle | none | state only | (UI pref) |
| `newFolderName` | text | ad-hoc client check (`.trim()` non-empty) | none (modal dismisses; nothing persists) | `Folder` |
| File upload | `<input type=file multiple>` + drag-drop | accept `.pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif,.mp4,.mov` (line 1043) | state only (`uploadQueue`, simulated 370–420) | `Document` |
| `moveSelectedLocation` (move modal) | tree node | ad-hoc (destination required) | none (modal dismisses) | `Document` |
| Select-all toggle | button | none | state only | `Document` |
| Bulk delete | button (action bar) | none | none (no handler wired) | `Document` |

**Critical**: every write here goes nowhere yet. Folder creation, file upload, move, delete are all UI-only.

### `/property/[id]/location`
- **Auth**: signed in (no ownership check)
- **Writes**: all `state only` (view-mode toggle, layer toggles for satellite/terrain/boundaries/labels, info-tab selection, legend visibility). Nothing persists.

### `/property/[id]/safety`
- **Auth**: signed in (no ownership check)
- **Writes**: "Add Certificate" button rendered with no handler. No persist surfaces.

### `/property/[id]/ownership`
- **Auth**: signed in (no ownership check)
- **Writes**: "Add Owner" button rendered with no handler. No persist surfaces.

### `/property/[id]/rental`
- **Auth**: signed in (no ownership check)
- **Writes**: "Send Renewal Offer" button rendered with no handler. No persist surfaces.

### `/property/[id]/valuation`
- **Auth**: signed in (no ownership check)
- **Writes**: none.

### `/add-property` (multi-step wizard)
**Draft pattern**: every input flows through `useDrafts` hook → `localStorage:valgate:add-property:drafts:v1` with 500ms debounce. `File` blobs are filtered out before serialization (`drafts-storage.tsx:7–8`); only filenames persist. Final submit goes to `submitPropertyAction`.

#### Step 1 — Type
| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `propertyType` | radio button group | `step1Schema` (enum, optional) | state + `localStorage:valgate:add-property:drafts:v1` (debounced 500ms) | `Property` |

Auto-advance to Step 2 on selection.

#### Step 2 — Basic Info
| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `propertyName` | text | `step2Schema` (string, optional) | localStorage draft | `Property` |
| `addressLine` | text or search | `step2Schema` | localStorage draft | `Property` |
| `addressLine2` | text | `step2Schema` | localStorage draft | `Property` |
| `city` | text | `step2Schema` | localStorage draft | `Property` |
| `state` | text | `step2Schema` | localStorage draft | `Property` |
| `zip` | text | `step2Schema` | localStorage draft | `Property` |
| `country` | text | `step2Schema` | localStorage draft | `Property` |
| `mapCenter` (lng/lat) | Mapbox pin drag | none | localStorage draft | `Property` |
| `showManualAddress` | toggle | none | state only | (UI mode) |

#### Step 3 — Financial
Only `currentMarketValue` is editable in this step — the other 9 financial fields are defined in `step3Schema` but not collected via inputs in this UI pass. Fields below are reflected in form state.

| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `currentMarketValue` | number-only text (formatted via `toLocaleString`) | `step3Schema` (string, optional) | localStorage draft | `Property` |
| `purchasePrice` | (no UI input — schema only) | `step3Schema` | — | `Property` |
| `purchaseDate` | (no UI input — schema only) | `step3Schema` | — | `Property` |
| `ownershipStatus` | (no UI input — schema only) | `step3Schema` | — | `Property` |
| `outstandingMortgage` | (no UI input — schema only) | `step3Schema` | — | `Property` |
| `monthlyPayment` | (no UI input — schema only) | `step3Schema` | — | `Property` |
| `interestRate` | (no UI input — schema only) | `step3Schema` | — | `Property` |
| `annualPropertyTax` | (no UI input — schema only) | `step3Schema` | — | `Property` |
| `taxAssessmentValue` | (no UI input — schema only) | `step3Schema` | — | `Property` |
| `annualInsurance` | (no UI input — schema only) | `step3Schema` | — | `Property` |

"Skip" button advances without value.

#### Step 4 — Photos & Documents
| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `photos[]` | `<input type=file accept=image/* multiple>` (filename strings only) | none (no MIME/size guards beyond `accept`) | localStorage draft (filenames only; `File` blobs filtered) | `Property` / `Document` |
| `documents[]` | `<input type=file accept=.pdf,.doc,.docx,.xls,.xlsx multiple>` | none | localStorage draft (filenames only) | `Document` |
| Remove photo (per index) | button | none | localStorage draft | `Property` |
| Remove document (per index) | button | none | localStorage draft | `Document` |
| Drag-and-drop region | (UI hint, no functional handler) | — | — | — |

#### Step 5 — Review
| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| Edit-section buttons (1–4) | button click → `goToStep(n)` | none | router push (no mutation) | — |

#### Step 6 — Success
| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| (none) | — | — | — | — |

#### Wizard-level submit (FlowFooter)
| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| Submit final form | button | `fullPropertySchema.safeParse` (server-side, in `actions.ts:8`) | `submitPropertyAction(input)` returns `{ ok: true, propertyId: PR<Date.now()> }` (stub) | `Property` |
| Save draft (programmatic) | every input via debounce | none | `useDrafts.upsert()` → `localStorage:valgate:add-property:drafts:v1` | `Draft` |
| Delete draft (after submit) | programmatic | none | `useDrafts.remove()` (clears localStorage entry) | `Draft` |

`saveDraftAction(_input)` and `deleteDraftAction(_id)` exist in `actions.ts:16–17` as **stubs not called** (no server-side draft persistence today).

### `/rental`
- **Auth**: signed in
- **Writes**: only client UI state.

| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `activeNav` (Portfolio/Units/Leases/Financials) | tab button | none | state only | (UI pref) |
| Quick-action buttons ("Create New Lease", etc.) | button | none | none (no handler wired) | `Lease` |

### `/analytics`
- **Auth**: signed in
- **Writes**: all `state only`. "Compare", "Schedule Report", "Export", view-mode toggles (Chart/Table/Grid) are buttons with **no handlers**.

| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `activePeriod` (MTD/QTD/YTD/12M/Custom) | button | none | state only | (UI pref) |
| `grossMode` | toggle | none | state only | (UI pref) |
| Search-data text | text | none | state only (no filtering wired) | (UI filter) |

### `/settings`
- **Auth**: signed in
- **Writes**: every toggle is a write surface; none persists today.

| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `currentPassword` | password | none | none (button stub at SettingsPage.tsx:82) | `User` |
| `newPassword` | password | none | none | `User` |
| `confirmPassword` | password | none | none | `User` |
| MFA — Authenticator app | "Manage" button | none | none (modal stub) | `User.security` |
| MFA — SMS recovery | "Setup" button | none | none (modal stub) | `User.security` |
| Notifications — Valuation updates × Email | toggle | none | state only | `NotificationPreference` |
| Notifications — Valuation updates × Slack | toggle | none | state only | `NotificationPreference` |
| Notifications — Valuation updates × SMS | toggle | none | state only | `NotificationPreference` |
| Notifications — Team comments × Email | toggle | none | state only | `NotificationPreference` |
| Notifications — Team comments × Slack | toggle | none | state only | `NotificationPreference` |
| Notifications — Team comments × SMS | toggle | none | state only | `NotificationPreference` |
| Notifications — Market insights × Email | toggle | none | state only | `NotificationPreference` |
| Notifications — Market insights × Slack | toggle | none | state only | `NotificationPreference` |
| Notifications — Market insights × SMS | toggle | none | state only | `NotificationPreference` |
| `dashboardView` (portfolio-overview / analytics / map) | select | none | state only | `UserPreference` |
| `language` (en-US / km / zh) | select | none | state only | `UserPreference` |
| `timezone` (5 options) | select | none | state only | `UserPreference` |

### `/profile`
- **Auth**: signed in
- **Writes**:

| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| Edit-profile button | button | none | none (no handler wired) | `User` |
| Sub-nav (Profile / Security / Notifications) | button | none | state only | (UI pref) |

### `/directory`
- **Auth**: signed in
- **Writes**: all UI-only.

| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `activeCategory` | category pill | none | state only | (UI filter) |
| `searchQuery` | text | none | state only | (UI filter) |
| `view` (grid/list) | toggle | none | state only | (UI pref) |
| Copy info | button | none | `navigator.clipboard.writeText` (no persist) | — |
| Email / Phone buttons | button | none | none (no handler wired) | — |
| Add Professional | button | none | none (no destination wired) | `Professional` |
| Sort dropdown | select | none | none (no handler wired) | (UI sort) |

### `/estate-planning`
- **Auth**: signed in
- **Writes**: all buttons rendered without handlers.

| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `selectedProperty` | property card click | none | state only | (UI selection) |
| Add Beneficiary | button | none | none | `Successor` |
| Download Summary / Generate Portfolio Report / Filter / View Analytics / Review All | button | none | none | — |
| Document download buttons | button | none | none | `EstateDocument` |

---

## Notifications client-side mutations (cross-cutting)

`lib/hooks/use-notifications.ts` — used wherever `<NotificationsPanel />` renders (e.g. `AppHeader`).

| Field | Input | Validation | Target | Target entity |
|---|---|---|---|---|
| `markAllRead()` | button | none | state only (TODO: `markAllReadMutation()`) | `Notification` |
| `markAsRead(id)` | per-row click | none | state only (TODO: `markAsReadMutation({ id })`) | `Notification` |
