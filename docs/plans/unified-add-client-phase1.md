# Unified "Add Client" Modal — Phase 1

- **Plan ID:** `plan-f51f6b5374e3461d`
- **Hosted:** https://plan.agent-native.com/plans/plan-f51f6b5374e3461d
- **Status:** approved (decisions locked, ready for execution)
- **Scope:** UI-only reshuffle, **zero new backend**.

Part of a 3-phase initiative to unify the manager↔client link surfaces:

1. **Phase 1 (this plan)** — one "Add Client" button → method chooser → create-new vs connect-existing.
2. **Phase 2** — client-side *email*-invite-a-manager, reusing `sendInvitationEmail` + the accept flow, **direct-add on accept**.
3. **Phase 3** — polish / notifications / cleanup.

---

## Objective

Collapse the two disconnected manager→client entry points into one surface:

- **Flow A (built):** `Onboard Client` button on `/pro/clients` → `OnboardClientWizard` (4-step `ProModal`) → `createClientPortfolioWithInvitees` (create portfolio + email invite).
- **Flow B (built):** separate `/pro/add-account` page → `requestAccessAction` → `requestAccess` (owner's 8-char invite code → pending `access_requests` row → owner approves in Settings → Managers).

Merge both behind a single **Add Client** button that first asks *which kind* of client this is (a two-card chooser), then routes into the matching existing flow.

**Done means:** one `Add Client` button; a two-card chooser; Branch A runs the existing wizard unchanged; Branch B runs the invite-code flow; and `/pro/add-account` + the Account Switcher + Dashboard links all resolve into the same modal (no broken bookmarks).

**Non-goals:** no schema changes, no new server actions, no change to `requestAccess` / `createClientPortfolioWithInvitees`.

---

## Design language

- Chooser = two bordered cards, each **icon + title + one-line description**, `Cancel` / `Continue` footer.
- **Blue reserved** for the single primary action per view (project convention) — here, `Continue` / `Request access` / `Next`.
- Reuse existing `pro-modal` tokens + `ProModal` + `ProgressStepper` shell verbatim.
- **Mobbin references:**
  - Heidi "What type of template would you like to create?" — https://mobbin.com/screens/cef46316-6383-4635-b799-ef1113564d37
  - Contra "What brings you to Contra?" — https://mobbin.com/screens/41798d6b-6101-4d45-92ae-eb641332df14
  - X Ads "Choose a campaign" — https://mobbin.com/screens/b1549bec-d141-4a18-b560-0e2ceb6dc292

---

## Reuse first

Everything already exists — this phase mostly **moves** code:

- `ProModal` + `ProgressStepper` — the modal frame, unchanged.
- `OnboardClientWizard` (4 steps) — mounted as **Branch A**, gaining only a "back to chooser" arrow.
- `AddAccountPage` (code field + View/Full segmented control + `requestAccessAction` + the *Your requests* list with `RequestListItem` / `StatusBadge`) — ported wholesale as **Branch B**.

Genuinely new: the **MethodChooser** step + the **AddClientModal** wrapper that owns which branch shows.

---

## Locked decisions

1. **Keep `/pro/add-account` as a redirect, not a deleted route.** The Account Switcher, the Dashboard, in-app ACCESS notifications, and manager bookmarks all link straight to it. `redirect('/pro/clients?add=connect')` keeps them working; a 404 would silently break them.
2. **"Your requests" list lives inside Branch B**, under the code form — mirrors today's `AddAccountPage`, simplest port.
3. **Relabel to "Add Client" everywhere** — the Account Switcher and Dashboard "Add account" links become "Add Client" and point at `/pro/clients?add=connect`. One consistent verb for the action.

---

## File map

| File | Change |
|---|---|
| `clients/_components/ClientsIndexPage.tsx` | Rename button → `Add Client`; add `mode` state + deep-link handling (`?add=connect`, keep `?onboard=1`); mount `AddClientModal`. |
| `clients/_components/AddClientModal.tsx` | **New.** `ProModal` wrapper owning the branch; renders chooser / new / connect. |
| `clients/_components/MethodChooser.tsx` | **New.** Two-card chooser + `Cancel`/`Continue` footer. |
| `clients/_components/OnboardClientWizard.tsx` | Extract the flow body into `OnboardClientFlow` so it mounts inside `AddClientModal`; add back-to-chooser arrow. |
| `clients/_components/ConnectExistingClient.tsx` | **New.** Ported from `AddAccountPage`: code field + View/Full + `requestAccessAction` + Your requests list. |
| `add-account/page.tsx` | Replace with `redirect('/pro/clients?add=connect')`. |
| `add-account/_components/AddAccountPage.tsx` | Delete after logic moves to `ConnectExistingClient`. |
| `_components/AccountSwitcher.tsx` | Point the "Add account" link at `/pro/clients?add=connect`. |
| `dashboard/_components/ManagedAccountsSection.tsx` | Point both "Add account" links at `/pro/clients?add=connect`. |

---

## Key code stubs

### `ClientsIndexPage.tsx`

```tsx
const [addOpen, setAddOpen] = useState(false);
// Which branch the modal shows: the chooser, or straight into one flow.
const [addMode, setAddMode] = useState<"choose" | "new" | "connect">("choose");

// Deep links open the modal on the right branch, then clean the URL.
useEffect(() => {
  const add = searchParams.get("add");        // ?add=connect  (folded /pro/add-account)
  const onboard = searchParams.get("onboard"); // ?onboard=1    (legacy new-client link)
  if (add === "connect") { setAddMode("connect"); setAddOpen(true); }
  else if (onboard === "1") { setAddMode("new"); setAddOpen(true); }
  else return;
  router.replace("/pro/clients", { scroll: false });
}, [searchParams, router]);

<button onClick={() => { setAddMode("choose"); setAddOpen(true); }} disabled={atQuota}>
  <Plus /> Add Client
</button>

<AddClientModal
  open={addOpen}
  onOpenChange={setAddOpen}
  initialMode={addMode}
  unassignedProperties={unassignedProperties}
/>
```

### `AddClientModal.tsx` (new)

```tsx
type Mode = "choose" | "new" | "connect";

export function AddClientModal({ open, onOpenChange, initialMode, unassignedProperties }: Props) {
  const [mode, setMode] = useState<Mode>(initialMode);

  // Reset to the requested branch each time the modal opens.
  useEffect(() => { if (open) setMode(initialMode); }, [open, initialMode]);

  return (
    <ProModal
      open={open}
      onOpenChange={onOpenChange}
      title={mode === "choose" ? "Add a client" : undefined}
    >
      {mode === "choose" && (
        <MethodChooser onPick={setMode} onCancel={() => onOpenChange(false)} />
      )}
      {mode === "new" && (
        <OnboardClientFlow onBack={() => setMode("choose")} unassignedProperties={unassignedProperties} />
      )}
      {mode === "connect" && (
        <ConnectExistingClient onBack={() => setMode("choose")} />
      )}
    </ProModal>
  );
}
```

### `add-account/page.tsx`

```tsx
import { redirect } from "next/navigation";

// Folded into the unified Add Client modal (Phase 1). Kept as a redirect so
// existing bookmarks and notification deep-links still resolve.
export default function Page() {
  redirect("/pro/clients?add=connect");
}
```

---

## Verification

- [ ] Clients page shows a single `Add Client` button; clicking opens the two-card chooser.
- [ ] Create a new client → the existing 4-step wizard runs unchanged and creates a portfolio + sends the email invite.
- [ ] Connect to an existing client → invite code + View/Full submits via `requestAccessAction`; a pending row appears in Your requests.
- [ ] Back arrow on either branch returns to the chooser without losing modal state.
- [ ] Visiting `/pro/add-account` redirects into the modal on Branch B.
- [ ] Account Switcher + Dashboard "Add account" links open the modal on Branch B.
- [ ] Legacy `/pro/clients?onboard=1` still opens Branch A.
- [ ] `npm run typecheck` + `eslint` clean; `atQuota` still disables the button.

---

_All open questions resolved — see Locked decisions above._
