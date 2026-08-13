// setActive({ organization }) is a Clerk client call that can reject transiently (observed as
// a generic "An unexpected response was received from the server" right after signIn.finalize()).
// Pre-selecting the user's default org is a convenience, not a gate, so this never throws —
// callers get a success/failure result and stay responsible for redirecting either way. Retries
// are bounded on operation failure alone; we don't inspect Clerk error codes/types, since the
// root cause of the transient rejection isn't proven.

type SetActiveOrg = (params: { organization: string }) => Promise<unknown>;

export interface ActivateDefaultOrgParams {
  clerkOrgId: string | null;
  setActive: SetActiveOrg;
  maxAttempts?: number;
  delayMs?: number;
  wait?: (ms: number) => Promise<void>;
}

export interface ActivateDefaultOrgResult {
  success: boolean;
  attempts: number;
}

const defaultWait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function activateDefaultOrgWithRetry({
  clerkOrgId,
  setActive,
  maxAttempts = 3,
  delayMs = 150,
  wait = defaultWait,
}: ActivateDefaultOrgParams): Promise<ActivateDefaultOrgResult> {
  if (!clerkOrgId) return { success: true, attempts: 0 };

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await setActive({ organization: clerkOrgId });
      return { success: true, attempts: attempt };
    } catch {
      if (attempt < maxAttempts) {
        await wait(delayMs);
      }
    }
  }

  return { success: false, attempts: maxAttempts };
}
