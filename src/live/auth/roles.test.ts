import { describe, it, expect } from "vitest";
import { roleRank, isRole, canApprove, canManageUsers, ROLES } from "./roles";

describe("roleRank", () => {
  it("orders roles least → most privilege", () => {
    expect(roleRank("viewer")).toBeLessThan(roleRank("contributor"));
    expect(roleRank("contributor")).toBeLessThan(roleRank("approver"));
    expect(roleRank("approver")).toBeLessThan(roleRank("admin"));
  });
  it("ranks unknown/empty roles below everything (fail closed)", () => {
    expect(roleRank("wizard")).toBe(-1);
    expect(roleRank(null)).toBe(-1);
    expect(roleRank(undefined)).toBe(-1);
  });
});

describe("isRole", () => {
  it("accepts only the four known roles", () => {
    for (const r of ROLES) expect(isRole(r)).toBe(true);
    expect(isRole("root")).toBe(false);
    expect(isRole(undefined)).toBe(false);
  });
});

describe("canApprove", () => {
  it("is true only for approver and admin", () => {
    expect(canApprove("approver")).toBe(true);
    expect(canApprove("admin")).toBe(true);
    expect(canApprove("contributor")).toBe(false);
    expect(canApprove("viewer")).toBe(false);
    expect(canApprove(null)).toBe(false); // anonymous
  });
});

describe("canManageUsers", () => {
  it("is true only for admin", () => {
    expect(canManageUsers("admin")).toBe(true);
    expect(canManageUsers("approver")).toBe(false);
    expect(canManageUsers(undefined)).toBe(false);
  });
});
