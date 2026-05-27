# Valgate — Capacitor (local iOS)

The iOS app is a **Capacitor WebView** that loads the **Next.js dev server** (not a static export). Full App Router / Server Components / Server Actions keep working while you develop.

## Prerequisites

- macOS with **Xcode** installed (open once to accept the license)
- `xcode-select --install` if needed

## Quick start

**Terminal 1 — Next (simulator):**

```bash
npm run dev
```

**Terminal 2 — sync & open Xcode:**

```bash
npm run cap:sync
npm run cap:ios
```

In Xcode: choose an **iPhone Simulator** → **Run** (▶).

Default URL: `http://localhost:3000` (see `capacitor.config.ts`).

## Physical iPhone on the same Wi‑Fi

**Terminal 1:**

```bash
npm run dev:mobile
```

Find your Mac’s LAN IP:

```bash
ipconfig getifaddr en0
```

**Terminal 2:**

```bash
CAPACITOR_SERVER_URL=http://192.168.x.x:3000 npm run cap:sync
npm run cap:ios
```

Replace `192.168.x.x` with your IP. Re-sync whenever you change the URL.

## npm scripts

| Script | Purpose |
|--------|---------|
| `dev` | Next dev server (simulator → localhost) |
| `dev:mobile` | Next on `0.0.0.0` (device on LAN) |
| `cap:sync` | Copy `mobile/www` + config into `ios/` |
| `cap:ios` | Open Xcode |
| `cap:run:ios` | CLI run on simulator (optional) |

## Layout

| Path | Role |
|------|------|
| `capacitor.config.ts` | App id, `webDir`, dev `server.url` |
| `mobile/www/` | Placeholder assets for `cap sync` (real UI comes from Next) |
| `ios/` | Native Xcode project (commit for reproducible builds) |

## Notes

- **HTTP / cleartext** is enabled only for local dev (`server.cleartext`). Use HTTPS for production.
- **Clerk / OAuth** on device may need extra setup (custom URL scheme, Universal Links) — not configured yet.
- Static `output: 'export'` is a separate experiment; not used for the main Valgate shell.

## References

- [Capacitor docs](https://capacitorjs.com/docs/)
- [iOS workflow](https://capacitorjs.com/docs/ios)
