# Mac Executor Setup — Task Brief (Hardened)

You are running in a terminal on a **macOS laptop**. Your job is to configure this machine as an iOS build executor for an agent (Hermes) running on a remote Linux VPS — with the agent confined to a dedicated user account that reaches only the project it needs.

One-off configuration task. Done when §12 passes. §13 is a deliberately deferred second phase; don't start it unasked.

---

## 1. Role and threat model

A Linux VPS runs an autonomous coding agent on a monorepo (Next.js web + Swift iOS). Xcode is macOS-only, so this Mac is the only machine that can build iOS. After setup it serves two routes:

1. **SSH target (primary)** — the VPS agent pushes a branch, then has this machine fetch and build it.
2. **GitHub Actions self-hosted runner (fallback + durable PR check)** — survives the laptop being shut or rebooted.

### What we're defending against

Not an attacker holding the SSH key — if that leaks, it's a different problem. The realistic risks:

- An autonomous agent making a **destructive mistake** outside its project.
- A **compromised dependency** — npm postinstall, SwiftPM plugin, or Xcode build phase running with whatever privileges the session has.
- **Credential blast radius** — a token here reaching more than the one repo it needs.

### The boundary that actually works

**A dedicated non-admin user account.** Not a command allowlist.

This is counterintuitive but load-bearing: anything that runs `xcodebuild` can execute arbitrary code, because build phases, run scripts, and SwiftPM plugins are code stored in the repo the agent itself writes to. A forced-command wrapper listing "only these binaries" is defeated the moment the agent writes a build script — which is its job. Don't build one; it manufactures false confidence.

Assume anything running as `hermes` can run arbitrary code **as that user**. Then make that user's reach small. That boundary is enforced by the kernel, not by a script.

---

## 2. Human inputs required

Ask the developer; don't guess or work around these.

- **Admin password** — for user creation, `pmset`, Xcode licence. Used by *you*, never granted to `hermes`.
- **VPS public SSH key.**
- **Deploy key decision** (§7) and a **runner registration token** — single-use, expires fast, so request it immediately before use.
- **Tailscale admin access** for ACLs (§9). If unavailable, note the gap and continue.

---

## 3. Create the restricted user — first

Everything after this happens inside the account, so order matters.

System Settings → Users & Groups → Add User:
- **Account type: Standard.** Not Administrator.
- Name: `hermes`

Or:

```bash
sudo sysadminctl -addUser hermes -fullName "Hermes Build Agent" -password -
```

Verify it is **not** an admin:

```bash
dseditgroup -o checkmember -m hermes admin    # must report NOT a member
```

Grant no sudo rights. Create no entry in `/etc/sudoers.d/` for this user, however convenient it looks later.

---

## 4. Close off the developer's files

macOS home directories are world-readable by default (`755`), and `hermes` is a real local user that inherits that access.

```bash
sudo chmod 700 /Users/<developer-username>
sudo -u hermes ls /Users/<developer-username>     # must be Permission denied
```

TCC also protects `~/Documents`, `~/Desktop`, `~/Downloads` — but the `chmod` is the deterministic part; don't rely on TCC alone.

**Never grant Full Disk Access** to sshd, Terminal, or the runner. Decline if prompted; nothing here needs it.

---

## 5. Prevent sleep

The laptop stays **open**, so only system sleep needs disabling. Display sleep is fine and better thermally.

```bash
sudo pmset -c sleep 0
pmset -g custom          # confirm 'sleep 0' under AC Power
```

Leave battery (`-b`) settings alone — on battery it *should* sleep; that's what the job queue handles. Don't set `disablesleep`, which is for closed-lid operation.

---

## 6. Toolchain, and pin Xcode

Install once as admin (Xcode lives in `/Applications`, readable by all users):

```bash
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept
xcodebuild -version
```

**Disable automatic Xcode updates.** System Settings → General → Software Update → Automatic Updates → turn off app auto-updates. An unattended Xcode bump can break every iOS build while the developer is away, and the cause won't be obvious from the failure. Record the pinned version in your §14 report so a future upgrade is deliberate.

Then, **logged in as `hermes`**:

```bash
brew install xcsift        # verify install method against its README
curl -Ls https://mise.run | sh
mise install tuist         # only if the repo uses Tuist
```

If Homebrew is admin-owned and `hermes` can't write to it, install into `/Users/hermes/.local/bin` instead. Widening `/opt/homebrew` write access to a non-admin user undoes much of §3.

Record the exact simulator device string — a mismatch produces a confusing CI failure later:

```bash
xcrun simctl list devices available
```

---

## 7. Repo checkout as a fetch target

Check out **only the one repo**, inside the hermes home:

```
/Users/hermes/work/<repo>
```

**This clone is a build target, not a workspace.** The agent pushes a branch from the VPS, then fetches and hard-checks-out that ref here. Expect it to sit on a detached HEAD — that's correct, not a problem to fix. Leave no local modifications; anything uncommitted here will be destroyed by the next `checkout -f`.

Nothing outside `/Users/hermes` should be writable by this account. **Do not symlink to the developer's copy** — that hands the agent write access to their working tree.

Confirm the fetch-and-build cycle works before moving on:

```bash
sudo -u hermes bash -c 'cd /Users/hermes/work/<repo> && \
  git fetch origin main && git checkout -f FETCH_HEAD && git status'
```

### Scoped credentials — where blast radius is won or lost

Use a **repository deploy key**, not a personal access token. A PAT reaches the developer's whole GitHub account; a deploy key reaches this repo only.

```bash
sudo -u hermes ssh-keygen -t ed25519 -f /Users/hermes/.ssh/id_repo -C "mac-executor"
```

Add the public half at repo **Settings → Deploy keys**. Read-only is sufficient if the Mac only builds; enable write only if it will also push (e.g. TestFlight tagging in §13). Prefer read-only now.

```
# /Users/hermes/.ssh/config
Host github.com
  IdentityFile ~/.ssh/id_repo
  IdentitiesOnly yes
```

No global git credential helper for this user. Don't copy the developer's `~/.gitconfig`, `~/.ssh`, or keychain items across.

---

## 8. SSH access from the VPS

Enable Remote Login: **System Settings → General → Sharing → Remote Login** → *Allow access for: Only these users* → `hermes` only.

Add the VPS public key to `/Users/hermes/.ssh/authorized_keys`:

```
restrict,pty ssh-ed25519 AAAA... hermes-vps
```

`restrict` disables port, agent, X11 forwarding and tunnelling; `pty` restores the terminal the agent needs. Without it, a session here becomes a pivot into the rest of the network.

Deliberately **no forced command** — see §1 for why an allowlist would be theatre.

```
# /etc/ssh/sshd_config.d/100-hermes.conf
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin no
AllowUsers hermes <developer-username>
```

⚠️ **Include the developer's username in `AllowUsers`** if they ever SSH here. Omitting it locks them out. Verify before restarting sshd and keep an existing session open while testing.

```bash
sudo -u hermes chmod 700 /Users/hermes/.ssh
sudo -u hermes chmod 600 /Users/hermes/.ssh/authorized_keys
```

---

## 9. Tailscale ACLs

SSH reachable from the VPS and nothing else:

```json
{
  "tagOwners": {
    "tag:vps": ["autogroup:admin"],
    "tag:mac": ["autogroup:admin"]
  },
  "acls": [
    { "action": "accept", "src": ["tag:vps"], "dst": ["tag:mac:22"] },
    { "action": "accept", "src": ["autogroup:member"], "dst": ["tag:mac:*"] }
  ]
}
```

Tag both machines. The first rule confines the VPS to port 22 on this Mac, so even a fully compromised agent can't reach other tailnet devices through this host. It's the control most worth having, and it's enforced outside the machine.

No tailnet admin access? Note it as outstanding rather than skipping silently.

---

## 10. GitHub Actions runner

Register and run **as `hermes`**, logged in as that user:

```bash
cd /Users/hermes/actions-runner
./config.sh --labels self-hosted,macOS,ARM64,xcode
./svc.sh install && ./svc.sh start && ./svc.sh status
```

Confirm *Idle* on the repo's Runners page.

**launchd caveat.** The runner installs as a user LaunchAgent, requiring an active session for that user. After a reboot someone must log in as `hermes` (fast user switching suffices) before the queue drains. Flag this in your report so a stalled queue isn't misdiagnosed as a broken runner. Do **not** enable auto-login for `hermes` to work around it — that undermines FileVault.

**Fork PRs.** Settings → Actions → General: require approval for workflows from forks. A self-hosted runner executing an untrusted fork's workflow is arbitrary code on this machine.

**PATH.** A service-installed runner doesn't inherit an interactive shell's environment:

```bash
sudo launchctl print gui/$(id -u)/actions.runner.* | grep -i PATH
```

Set PATH in the workflow rather than fighting launchd:

```yaml
- run: echo "PATH=/opt/homebrew/bin:$PATH" >> "$GITHUB_ENV"
```

---

## 11. Housekeeping

**DerivedData grows without bound** and will quietly fill the disk until builds fail for unrelated-looking reasons — a bad failure mode when the developer is away. Install a weekly prune as the `hermes` user:

```bash
# crontab -e  (as hermes)
0 4 * * 0 find /Users/hermes/Library/Developer/Xcode/DerivedData -maxdepth 1 -mtime +7 -exec rm -rf {} +
0 4 * * 0 xcrun simctl delete unavailable
```

Note current free disk space in your report so there's a baseline.

---

## 12. Acceptance tests

**Do not report success until all four pass.**

### 12a. Isolation

```bash
sudo -u hermes ls /Users/<developer-username>        # Permission denied
sudo -u hermes sudo -n true                          # must fail
sudo -u hermes touch /Applications/test 2>&1         # Permission denied
sudo -u hermes ls /Users/hermes/work/<repo>          # succeeds
```

### 12b. Fetch-and-build cycle

From the VPS, with a test branch pushed:

```bash
ssh hermes@<mac>.<tailnet>.ts.net "
  cd /Users/hermes/work/<repo> &&
  git fetch origin <branch> && git checkout -f FETCH_HEAD &&
  git rev-parse HEAD
"
```

The returned SHA must match the pushed commit. This proves the agent builds *its* code rather than whatever this clone last held.

### 12c. Build feedback loop

Introduce a deliberate Swift compile error, then:

```bash
set -o pipefail
xcodebuild test \
  -workspace ios/MyApp.xcworkspace \
  -scheme MyApp \
  -destination 'platform=iOS Simulator,name=iPhone 16,OS=latest' \
  | xcsift
echo "exit status: $?"
```

Both must hold:
- Structured JSON with file, line, message — not thousands of raw log lines.
- **Exit status non-zero.**

Revert and confirm a clean run exits 0.

**Why this exact check:** without `set -o pipefail` the exit status comes from `xcsift`, which *succeeds* at parsing a failed build. Every iOS job then reports green while shipping broken code — the worst possible failure mode, because a remote agent that cannot compile Swift itself is trusting CI to tell it the truth. If a broken build exits 0, stop and fix the pipeline before anything else.

### 12d. Network confinement

From the VPS: `ssh hermes@<mac>...  "xcodebuild -version"` succeeds. An attempt to reach a different tailnet device's port through this Mac fails.

---

## 13. Phase two — signing and TestFlight (do not start unasked)

Deferred deliberately: get build-and-test green first. But it's not optional long-term. Until TestFlight upload exists, **the developer cannot see iOS progress while away from this laptop** — web has a Tailscale preview, iOS has nothing. That's half the original problem still open.

When asked, scope will be: signing certificate and provisioning profile in the `hermes` login keychain (never the developer's), App Store Connect API key as a repo secret, Fastlane or `xcodebuild -exportArchive` for upload, triggered on merge to `main`.

Note in your report that this remains outstanding.

---

## 14. Boundaries

**Do not:**
- Grant `hermes` admin rights or any sudoers entry.
- Enable SSH password authentication or root login.
- Grant Full Disk Access to anything.
- Copy the developer's `~/.ssh`, `~/.gitconfig`, or keychain items to `hermes`.
- Enable auto-login for `hermes`.
- Enable automatic Xcode updates.
- Install macOS virtualisation or Hackintosh tooling — irrelevant, and against Apple's EULA.
- Commit anything except the temporary error in 12c, which you revert.
- Modify application source beyond that.

**Ask first:** anything costing money; anything touching signing certificates or App Store Connect; any change to CI workflow files; anything requiring §3, §4, or §8 to be relaxed.

---

## 15. Report back

The developer will paste this to the VPS agent, so be exact about the interface between machines:

- Tailscale hostname; SSH user (`hermes`)
- Absolute repo path: `/Users/hermes/work/<repo>`
- **Pinned Xcode version** and the exact simulator device string that works
- Runner name and labels; whether the launchd reboot caveat applies
- Deploy key scope (read-only or write)
- Results of 12a–12d, including the observed exit status on a broken build in 12c
- Whether Tailscale ACLs were applied, or why not
- Current free disk space; confirmation the DerivedData prune is scheduled
- Outstanding: signing/TestFlight (§13)
- Anything you couldn't complete, and **any point where you weakened a control to make something work** — state it plainly rather than leaving it implicit
