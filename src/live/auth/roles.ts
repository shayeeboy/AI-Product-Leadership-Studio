// Role model + permission predicates (R6b). Pure and shared by the client
// (UI affordances) and mirrored by the Worker (authoritative enforcement).
// Ordered least → most privilege.

export type Role = "viewer" | "contributor" | "approver" | "admin";

export const ROLES: Role[] = ["viewer", "contributor", "approver", "admin"];

export const ROLE_LABEL: Record<Role, string> = {
  viewer: "Viewer",
  contributor: "Contributor",
  approver: "Approver",
  admin: "Admin",
};

export const ROLE_HINT: Record<Role, string> = {
  viewer: "Read-only",
  contributor: "Create & edit decision data",
  approver: "Record governance approvals",
  admin: "Full access + manage users",
};

const rank: Record<Role, number> = { viewer: 0, contributor: 1, approver: 2, admin: 3 };

// Unknown/undefined roles rank below everything (fail closed).
export const roleRank = (r?: string | null): number => (r && r in rank ? rank[r as Role] : -1);

export const isRole = (r?: string | null): r is Role => !!r && r in rank;

// Only approvers and admins may advance/approve a governance stage.
export const canApprove = (r?: string | null): boolean => roleRank(r) >= rank.approver;

// Only admins may view/manage users and change roles.
export const canManageUsers = (r?: string | null): boolean => roleRank(r) >= rank.admin;
