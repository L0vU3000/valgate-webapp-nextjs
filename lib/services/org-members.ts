import "server-only";
import { clerkClient } from "@clerk/nextjs/server";
import { and, asc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { organizations, organizationMemberships, orgRoleEnum, users } from "@/lib/db/schema/identity";
import { assertCanMutate, nextId, type Ctx } from "./_mapping";

export const orgMemberRoleSchema = z.enum(orgRoleEnum.enumValues);
export const orgMembershipIdSchema = z.string().max(64).regex(/^MEM-\d+$/);
const emailSchema = z.string().trim().email().max(254).transform(s => s.toLowerCase());
export type OrgMemberRole = z.infer<typeof orgMemberRoleSchema>;

// org:admin is already Valgate's OWNER role. The distinct admin/viewer custom
// roles must be configured in Clerk; never map app admin to org:admin (escalation).
export const clerkOrgMemberRoles = {
  owner: "org:admin", admin: "org:valgate_admin", member: "org:member", viewer: "org:viewer",
} as const;

type Executor = Pick<typeof db, "select" | "update" | "insert">;

async function assertOwner(ctx: Ctx, executor: Executor = db) {
  if (!ctx.userId || !ctx.orgId || ctx.orgRole !== "owner") throw new Error("forbidden");
  const [owner] = await executor.select({ id: organizationMemberships.id }).from(organizationMemberships)
    .where(and(eq(organizationMemberships.orgId, ctx.orgId), eq(organizationMemberships.userId, ctx.userId),
      eq(organizationMemberships.role, "owner"), eq(organizationMemberships.status, "active"))).limit(1);
  if (!owner) throw new Error("forbidden");
}

// Internal read primitive; callers must authorize the org first (see getOrgMembersData).
export async function listOrgMembers(orgId: string) {
  return db.select({
    id: organizationMemberships.id, userId: users.id,
    name: users.displayName, email: users.primaryEmail,
    role: organizationMemberships.role, status: organizationMemberships.status,
    invitedAt: organizationMemberships.invitedAt, joinedAt: organizationMemberships.joinedAt,
  }).from(organizationMemberships).innerJoin(users, eq(users.id, organizationMemberships.userId))
    .where(and(eq(organizationMemberships.orgId, orgId), eq(organizationMemberships.status, "active")))
    .orderBy(asc(users.primaryEmail));
}
export type OrgMember = Awaited<ReturnType<typeof listOrgMembers>>[number];
export type OrgMembersData = { orgName: string; currentUserId: string; members: OrgMember[] };

export async function getOrgMembersData(ctx: Ctx): Promise<OrgMembersData> {
  await assertOwner(ctx);
  const [org] = await db.select({ name: organizations.name }).from(organizations)
    .where(eq(organizations.id, ctx.orgId)).limit(1);
  if (!org) throw new Error("not found");
  return { orgName: org.name, currentUserId: ctx.userId, members: await listOrgMembers(ctx.orgId) };
}

export async function inviteOrgMember(ctx: Ctx, email: string, role: OrgMemberRole): Promise<void> {
  const parsedEmail = emailSchema.parse(email);
  const parsedRole = orgMemberRoleSchema.parse(role);
  assertCanMutate(ctx);
  await assertOwner(ctx);
  const [org] = await db.select({ clerkOrgId: organizations.clerkOrgId }).from(organizations)
    .where(eq(organizations.id, ctx.orgId)).limit(1);
  const [inviter] = await db.select({ clerkUserId: users.clerkUserId }).from(users)
    .where(eq(users.id, ctx.userId)).limit(1);
  if (!org || !inviter) throw new Error("not found");
  const [user] = await db.select({ id: users.id }).from(users)
    .where(sql`lower(${users.primaryEmail}) = ${parsedEmail}`).limit(1);
  const client = await clerkClient();
  const invitation = await client.organizations.createOrganizationInvitation({
    organizationId: org.clerkOrgId, inviterUserId: inviter.clerkUserId,
    emailAddress: parsedEmail, role: clerkOrgMemberRoles[parsedRole],
  });
  // No user FK is available for a new email: Clerk holds the invitation until
  // signup/acceptance. The membership webhook creates/activates the mirror.
  // A webhook racing this insert wins: never overwrite an active membership.
  if (user) {
    await db.insert(organizationMemberships).values({
      id: await nextId("MEM", organizationMemberships), orgId: ctx.orgId, userId: user.id,
      role: parsedRole, status: "invited", invitedByUserId: ctx.userId,
      invitedAt: new Date(invitation.createdAt),
    }).onConflictDoUpdate({
      target: [organizationMemberships.orgId, organizationMemberships.userId],
      set: { role: parsedRole, status: "invited", invitedByUserId: ctx.userId,
        invitedAt: new Date(invitation.createdAt), joinedAt: null, removedAt: null, updatedAt: new Date() },
      setWhere: eq(organizationMemberships.status, "removed"),
    });
  }
}

async function mutateMember(ctx: Ctx, membershipId: string, role?: OrgMemberRole) {
  orgMembershipIdSchema.parse(membershipId);
  assertCanMutate(ctx);
  if (ctx.orgRole !== "owner") throw new Error("forbidden");
  await db.transaction(async tx => {
    // Serialize management actions for this org so concurrent owner demotions
    // cannot both pass the last-owner check. Clerk also enforces its owner rules.
    const [org] = await tx.select({ clerkOrgId: organizations.clerkOrgId }).from(organizations)
      .where(eq(organizations.id, ctx.orgId)).for("update");
    await assertOwner(ctx, tx);
    if (!org) throw new Error("not found");
    const [member] = await tx.select({ userId: users.id, clerkUserId: users.clerkUserId, role: organizationMemberships.role })
      .from(organizationMemberships).innerJoin(users, eq(users.id, organizationMemberships.userId))
      .where(and(eq(organizationMemberships.id, membershipId), eq(organizationMemberships.orgId, ctx.orgId),
        eq(organizationMemberships.status, "active"))).limit(1);
    if (!member) throw new Error("not found");
    if (role === undefined && member.userId === ctx.userId) throw new Error("cannot remove yourself");
    if (member.role === "owner" && role !== "owner") {
      const owners = await tx.select({ id: organizationMemberships.id }).from(organizationMemberships)
        .where(and(eq(organizationMemberships.orgId, ctx.orgId), eq(organizationMemberships.role, "owner"),
          eq(organizationMemberships.status, "active"))).limit(2);
      if (owners.length < 2) throw new Error("cannot remove last owner");
    }
    const client = await clerkClient();
    const target = { organizationId: org.clerkOrgId, userId: member.clerkUserId };
    // Clerk first: a failed remote write must never grant/change local access.
    if (role === undefined) await client.organizations.deleteOrganizationMembership(target);
    else await client.organizations.updateOrganizationMembership({ ...target, role: clerkOrgMemberRoles[role] });
    const now = new Date();
    await tx.update(organizationMemberships)
      .set(role === undefined ? { status: "removed", removedAt: now, updatedAt: now } : { role, updatedAt: now })
      .where(and(eq(organizationMemberships.id, membershipId), eq(organizationMemberships.orgId, ctx.orgId)));
  });
}

export async function updateMemberRole(ctx: Ctx, membershipId: string, role: OrgMemberRole): Promise<void> {
  return mutateMember(ctx, membershipId, orgMemberRoleSchema.parse(role));
}
export async function removeMember(ctx: Ctx, membershipId: string): Promise<void> {
  return mutateMember(ctx, membershipId);
}

// A shared portfolio's empty state offers a direct request to its real owner.
export async function getOrgOwnerEmail(ctx: Ctx): Promise<string | null> {
  const [owner] = await db.select({ email: users.primaryEmail })
    .from(organizationMemberships).innerJoin(users, eq(users.id, organizationMemberships.userId))
    .where(and(eq(organizationMemberships.orgId, ctx.orgId), eq(organizationMemberships.role, "owner"),
      eq(organizationMemberships.status, "active")))
    .orderBy(asc(organizationMemberships.id)).limit(1);
  return owner?.email ?? null;
}
