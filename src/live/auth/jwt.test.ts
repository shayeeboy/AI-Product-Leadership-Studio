import { describe, it, expect } from "vitest";
import { decodeJwt, isExpired, userFromToken } from "./jwt";

// Build an unsigned token with a given payload (the client only decodes; the
// Worker is what actually signs/verifies).
const b64url = (obj: unknown) =>
  btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const tokenWith = (payload: Record<string, unknown>) => `${b64url({ alg: "HS256" })}.${b64url(payload)}.sig`;

const future = Math.floor(Date.now() / 1000) + 3600;
const past = Math.floor(Date.now() / 1000) - 3600;

describe("decodeJwt", () => {
  it("decodes the payload segment", () => {
    const p = decodeJwt(tokenWith({ sub: "u1", email: "a@b.com", name: "Casey", exp: future }));
    expect(p).toMatchObject({ sub: "u1", email: "a@b.com", name: "Casey" });
  });
  it("returns null for a malformed token", () => {
    expect(decodeJwt("not-a-jwt")).toBeNull();
    expect(decodeJwt("")).toBeNull();
  });
});

describe("isExpired", () => {
  it("is false for a future exp, true for a past one", () => {
    expect(isExpired({ exp: future })).toBe(false);
    expect(isExpired({ exp: past })).toBe(true);
  });
  it("treats a null payload as expired", () => {
    expect(isExpired(null)).toBe(true);
  });
});

describe("userFromToken", () => {
  it("returns the user for a valid, unexpired token", () => {
    expect(userFromToken(tokenWith({ sub: "u1", email: "a@b.com", name: "Casey", exp: future }))).toEqual({
      id: "u1",
      email: "a@b.com",
      name: "Casey",
    });
  });
  it("returns null for an expired token", () => {
    expect(userFromToken(tokenWith({ sub: "u1", email: "a@b.com", exp: past }))).toBeNull();
  });
  it("returns null for a token missing sub/email", () => {
    expect(userFromToken(tokenWith({ name: "Casey", exp: future }))).toBeNull();
  });
  it("returns null for no token", () => {
    expect(userFromToken(null)).toBeNull();
  });
});
