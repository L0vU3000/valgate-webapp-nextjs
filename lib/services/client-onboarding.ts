import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Compatibility barrel.
//
// client-onboarding.ts was split into three concern modules:
//   - client-records.ts     → client record CRUD, visuals, FS/Drizzle dual-write
//   - portfolio-members.ts  → Phase-6 multi-invitee portfolio + membership mgmt
//   - client-invitations.ts → handoff/invitation lifecycle
//
// This file re-exports the original public surface so existing importers keep
// working unchanged. New code should import from the concern modules directly.
// ─────────────────────────────────────────────────────────────────────────────

export {
  MAX_UNCONFIRMED_CLIENTS,
  countUnconfirmedClients,
  listManagerClientOrgs,
  nameToInitials,
  nameToAvatarBg,
  createClientRecord,
} from "@/lib/services/client-records";

export {
  createClientPortfolioWithInvitees,
  addPortfolioInvitees,
  changeMemberRole,
  changeInviteeRole,
  removePortfolioMember,
  listPortfolioMembers,
  type PortfolioRole,
  type CreatePortfolioResult,
  type PortfolioMember,
  type PortfolioInvitee,
} from "@/lib/services/portfolio-members";

export {
  getPendingWelcome,
  getInviteeNameForInvitation,
  sendInvitationEmail,
  insertAccessNotification,
  onboardClientPortfolio,
  revokeClientInvitation,
  resendClientInvitation,
  recordInvitationLinkCopy,
  markWelcomeSeen,
  removeManagerAccess,
  handleBounce,
  handleInvitationAccepted,
  completePendingHandoffsForUser,
  type OnboardResult,
} from "@/lib/services/client-invitations";
