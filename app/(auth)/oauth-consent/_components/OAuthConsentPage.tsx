"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  useClerk,
  useOAuthConsent,
  useOrganization,
  useOrganizationList,
  useUser,
} from "@clerk/nextjs";
import { AlertTriangle, CheckCircle2, Eye, Pencil, Trash2, XCircle } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/components/ui/utils";
import { AuthFooter } from "@/components/auth/AuthFooter";

// A single OAuth scope, as returned by Clerk's useOAuthConsent hook. `description` is
// the plain-language copy Clerk (or the OAuth application's own config) attaches to it;
// we fall back to the raw scope name when a scope has none.
type OAuthScope = { scope: string; description?: string | null };

// One org membership, trimmed to the fields the workspace selector needs.
type OrgMembership = { organization: { id: string; name: string } };

// The three permission buckets the consent card groups scopes into (D2). Valgate's MCP
// scopes aren't formally namespaced yet, so we classify by keyword in the scope name —
// "delete"/"remove" wins over "write"-ish verbs, everything else defaults to "view".
type ScopeGroupKey = "view" | "modify" | "delete";

function classifyScope(scopeName: string): ScopeGroupKey {
  const name = scopeName.toLowerCase();
  if (name.includes("delete") || name.includes("remove")) return "delete";
  if (
    name.includes("write") ||
    name.includes("create") ||
    name.includes("update") ||
    name.includes("modify") ||
    name.includes("manage")
  ) {
    return "modify";
  }
  return "view";
}

// Buckets the raw scope list into View / Modify / Delete groups for display.
function groupScopes(scopes: OAuthScope[]): Record<ScopeGroupKey, OAuthScope[]> {
  const groups: Record<ScopeGroupKey, OAuthScope[]> = { view: [], modify: [], delete: [] };
  for (const scope of scopes) {
    groups[classifyScope(scope.scope)].push(scope);
  }
  return groups;
}

// Outer chrome shared by every state on this route: a calm backdrop with a small,
// quiet Valgate mark above a single centered card (D1 — not a full branded page).
function ConsentShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh-safe flex-col bg-surface-page">
      <div className="flex flex-1 items-center justify-center px-4 py-10 sm:px-6">
        <div className="flex w-full max-w-[440px] flex-col items-center">
          <div className="mb-6 flex items-center gap-2">
            <Image src="/valgate-icon.svg" width={24} height={24} alt="" />
            <span className="font-display text-base font-semibold tracking-[-0.3px] text-val-heading">
              Valgate
            </span>
          </div>
          {children}
        </div>
      </div>
      <AuthFooter />
    </div>
  );
}

// The shared card frame every state renders its content into: 1px border + minimal
// shadow, no gradients (per .impeccable.md — borders over shadows).
function ConsentCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-xl border border-border-default bg-surface-base px-8 py-8 shadow-[0px_1px_2px_0px_rgba(0,0,0,0.05)]">
      {children}
    </div>
  );
}

// Loading state: shown while Clerk is loading the session, the org list, or the OAuth
// consent metadata. Static skeleton blocks, no spinner (the plan calls for a quiet
// loading state, not spinner theatre).
export function ConsentSkeleton() {
  return (
    <ConsentShell>
      <ConsentCard>
        <div className="flex animate-pulse flex-col gap-4">
          <div className="h-6 w-3/4 rounded bg-surface-tint" />
          <div className="h-4 w-full rounded bg-surface-tint" />
          <div className="h-24 w-full rounded-lg bg-surface-tint" />
          <div className="h-11 w-full rounded-md bg-surface-tint" />
        </div>
      </ConsentCard>
    </ConsentShell>
  );
}

// One grouped permission block (e.g. "View" or "Delete"). Renders nothing when the
// requested scopes don't include anything in this group.
function PermissionGroup({
  title,
  icon: Icon,
  scopes,
  destructive = false,
}: {
  title: string;
  icon: LucideIcon;
  scopes: OAuthScope[];
  destructive?: boolean;
}) {
  if (scopes.length === 0) return null;
  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        destructive ? "border-red-200 bg-red-50" : "border-border-default bg-surface-base",
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className={cn("size-4", destructive ? "text-destructive" : "text-muted-foreground")} />
        <span className={cn("text-sm font-semibold", destructive ? "text-destructive" : "text-foreground")}>
          {title}
        </span>
        {destructive && <span className="ml-auto text-xs font-medium text-destructive">Sensitive</span>}
      </div>
      <ul className="flex flex-col gap-1 pl-6">
        {scopes.map((scope) => (
          <li key={scope.scope} className="list-disc text-sm text-muted-foreground">
            {scope.description || scope.scope}
          </li>
        ))}
      </ul>
    </div>
  );
}

// "No workspace" — an authenticated user with zero Valgate org memberships. This is the
// honest failure surface until Plan 1 (JIT provisioning) exists: without an org there's
// nothing for the MCP connection to read or write, so we send the user to finish setup
// instead of pretending the connection can proceed.
function NoWorkspaceState() {
  return (
    <ConsentCard>
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-surface-tint">
          <AlertTriangle className="size-6 text-muted-foreground" />
        </div>
        <h1 className="font-display text-xl font-semibold text-val-heading">
          Finish setting up Valgate first
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Your account isn&apos;t part of a Valgate workspace yet, so there&apos;s nothing for
          Claude to connect to. Set up your workspace, then come back to connect.
        </p>
        <Button asChild className="mt-6 h-11 w-full">
          <Link href="/launch">Open Valgate</Link>
        </Button>
      </div>
    </ConsentCard>
  );
}

// "Success" — the screen the plan wants shown after Allow is submitted. NOTE: Clerk's
// documented consent flow is a plain form POST to buildConsentActionUrl, which redirects
// the browser straight back to the connecting app (claude.ai) once it completes — the
// browser leaves this page before a real grant could ever render this component. It's
// built here as the plan's canvas artboard and for local QA: visit /oauth-consent with
// ?demo=success (and no real OAuth params) to view it without a live OAuth request.
function SuccessState({ returnUrl }: { returnUrl: string }) {
  return (
    <ConsentCard>
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-val-bg-tint">
          <CheckCircle2 className="size-6 text-[--val-primary-dark]" />
        </div>
        <h1 className="font-display text-xl font-semibold text-val-heading">Claude is now connected</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Claude can now access your Valgate workspace using the permissions you approved.
        </p>
        <Button asChild className="mt-6 h-11 w-full">
          <a href={returnUrl}>Return to claude.ai</a>
        </Button>
      </div>
    </ConsentCard>
  );
}

// "Denied" — same caveat as SuccessState above: reachable in this app only via
// ?demo=denied for design QA, since a real Deny also redirects the browser straight
// back to the connecting app rather than rendering on our domain.
function DeniedState({ returnUrl }: { returnUrl: string }) {
  return (
    <ConsentCard>
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-surface-tint">
          <XCircle className="size-6 text-muted-foreground" />
        </div>
        <h1 className="font-display text-xl font-semibold text-val-heading">Access not granted</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Nothing changed — Claude was not given access to your Valgate workspace.
        </p>
        <Button asChild variant="outline" className="mt-6 h-11 w-full">
          <a href={returnUrl}>Return to claude.ai</a>
        </Button>
      </div>
    </ConsentCard>
  );
}

// Generic fallback for anything useOAuthConsent can't recover from — a missing/invalid
// request, or Clerk's own fetch failing. Never surfaces the underlying error detail to
// the client (security rule: log internally, show a generic string).
function ConsentErrorState() {
  return (
    <ConsentCard>
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex size-12 items-center justify-center rounded-full bg-red-50">
          <AlertTriangle className="size-6 text-destructive" />
        </div>
        <h1 className="font-display text-xl font-semibold text-val-heading">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t load this connection request. Please go back to Claude and try connecting
          again.
        </p>
      </div>
    </ConsentCard>
  );
}

// The default, live state: the real consent form. It submits a plain HTML form POST to
// Clerk's consent endpoint (buildConsentActionUrl) exactly as Clerk documents — Clerk
// reads the session from cookies, records the decision, then redirects the browser to
// the OAuth client's redirect_uri with the result. We deliberately never intercept that
// submit (e.g. with fetch) — doing so could break the real redirect Claude is waiting on.
function ConsentForm({
  actionUrl,
  redirectUri,
  applicationName,
  applicationLogoUrl,
  redirectDomain,
  scopes,
  hiddenParams,
  memberships,
  activeOrgId,
}: {
  actionUrl: string;
  redirectUri: string;
  applicationName: string;
  applicationLogoUrl?: string | null;
  redirectDomain?: string | null;
  scopes: OAuthScope[];
  hiddenParams: [string, string][];
  memberships: OrgMembership[];
  activeOrgId?: string;
}) {
  const groups = groupScopes(scopes);

  // D2 open question 1: pre-select the user's primary (currently active) org so Allow
  // is never blocked waiting on a choice; the dropdown only appears for multi-org users.
  const [selectedOrgId, setSelectedOrgId] = useState(
    activeOrgId ?? memberships[0]?.organization.id ?? "",
  );
  useEffect(() => {
    if (selectedOrgId || memberships.length === 0) return;
    setSelectedOrgId(activeOrgId ?? memberships[0].organization.id);
  }, [memberships, activeOrgId, selectedOrgId]);

  return (
    <ConsentCard>
      <form method="POST" action={actionUrl} className="flex flex-col gap-6">
        <div className="flex flex-col items-center text-center">
          {applicationLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- external, unregistered Clerk-hosted logo
            <img src={applicationLogoUrl} alt="" className="mb-4 size-12 rounded-lg" />
          ) : (
            <div className="mb-4 flex size-12 items-center justify-center rounded-lg bg-surface-tint text-lg font-semibold text-foreground">
              {applicationName.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="font-display text-xl font-semibold text-val-heading">
            {applicationName} wants to connect to your Valgate workspace
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            You&apos;ll be returned to {redirectDomain || new URL(redirectUri).hostname} once you
            decide.
          </p>
        </div>

        {memberships.length > 1 && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="organization_id" className="text-sm font-medium text-foreground">
              Workspace
            </label>
            <select
              id="organization_id"
              name="organization_id"
              value={selectedOrgId}
              onChange={(event) => setSelectedOrgId(event.target.value)}
              className="h-11 w-full rounded-md border border-input bg-input-background px-3 text-base outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 md:h-9 md:text-sm"
            >
              {memberships.map((membership) => (
                <option key={membership.organization.id} value={membership.organization.id}>
                  {membership.organization.name}
                </option>
              ))}
            </select>
          </div>
        )}
        {memberships.length === 1 && (
          <input type="hidden" name="organization_id" value={memberships[0].organization.id} />
        )}

        <div className="flex flex-col gap-3">
          <PermissionGroup title="View" icon={Eye} scopes={groups.view} />
          <PermissionGroup title="Modify" icon={Pencil} scopes={groups.modify} />
          <PermissionGroup title="Delete" icon={Trash2} scopes={groups.delete} destructive />
        </div>

        {/* Forward every original OAuth param except the ones this form sets itself. */}
        {hiddenParams.map(([key, value], index) => (
          <input key={`${key}:${index}`} type="hidden" name={key} value={value} />
        ))}

        <div className="flex flex-col gap-3">
          <Button type="submit" name="consented" value="true" className="h-11 w-full">
            Allow access
          </Button>
          <Button type="submit" name="consented" value="false" variant="outline" className="h-11 w-full">
            Deny
          </Button>
        </div>
      </form>
    </ConsentCard>
  );
}

// Route entry point. Reads the OAuth request straight off the URL (Clerk puts client_id,
// redirect_uri, scope, state, etc. there), loads the signed-in user's session, their org
// memberships, and the OAuth application's consent metadata, then renders whichever
// state applies.
export function OAuthConsentCard() {
  const searchParams = useSearchParams();
  const clientId = searchParams.get("client_id") ?? "";
  const redirectUri = searchParams.get("redirect_uri") ?? "";
  const scope = searchParams.get("scope") ?? undefined;

  // QA-only escape hatch for the Success/Denied canvas states — see the comments on
  // SuccessState/DeniedState for why a real grant can't reach them in this app.
  const demoState = searchParams.get("demo");

  const clerk = useClerk();
  const { isLoaded: userLoaded } = useUser();
  const { organization: activeOrganization } = useOrganization();
  const { userMemberships } = useOrganizationList({ userMemberships: true });
  const { data, isLoading: consentLoading, error: consentError } = useOAuthConsent({
    oauthClientId: clientId,
    redirectUri,
    scope,
  });

  let content: React.ReactNode;

  if (demoState === "success" || demoState === "denied") {
    const returnUrl = redirectUri || "https://claude.ai";
    content = demoState === "success" ? <SuccessState returnUrl={returnUrl} /> : <DeniedState returnUrl={returnUrl} />;
  } else if (!clientId || !redirectUri) {
    content = <ConsentErrorState />;
  } else if (!userLoaded || userMemberships.data === undefined || consentLoading) {
    return <ConsentSkeleton />;
  } else if (consentError || !data) {
    content = <ConsentErrorState />;
  } else if (userMemberships.data.length === 0) {
    content = <NoWorkspaceState />;
  } else {
    const hiddenParams = Array.from(searchParams.entries()).filter(
      ([key]) => key !== "consented" && key !== "organization_id" && key !== "demo",
    );
    content = (
      <ConsentForm
        actionUrl={clerk.oauthApplication.buildConsentActionUrl({ clientId })}
        redirectUri={redirectUri}
        applicationName={data.oauthApplicationName}
        applicationLogoUrl={data.oauthApplicationLogoUrl}
        redirectDomain={data.redirectDomain}
        scopes={data.scopes}
        hiddenParams={hiddenParams}
        memberships={userMemberships.data}
        activeOrgId={activeOrganization?.id}
      />
    );
  }

  return <ConsentShell>{content}</ConsentShell>;
}
