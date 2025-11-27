import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/auth/password";

describe("Password Hashing", () => {
  it("hashes a password and returns salt:hash format", async () => {
    const hash = await hashPassword("testpassword123");

    expect(hash).toContain(":");
    const [salt, key] = hash.split(":");
    expect(salt).toHaveLength(32); // 16 bytes = 32 hex chars
    expect(key).toHaveLength(64); // 32 bytes = 64 hex chars
  });

  it("produces different hashes for the same password (different salts)", async () => {
    const hash1 = await hashPassword("samepassword");
    const hash2 = await hashPassword("samepassword");

    expect(hash1).not.toBe(hash2);
  });

  it("verifies correct password", async () => {
    const password = "mysecretpassword";
    const hash = await hashPassword(password);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it("rejects incorrect password", async () => {
    const hash = await hashPassword("correctpassword");

    const isValid = await verifyPassword("wrongpassword", hash);
    expect(isValid).toBe(false);
  });

  it("rejects malformed hash", async () => {
    const isValid = await verifyPassword("anypassword", "invalid-hash-format");
    expect(isValid).toBe(false);
  });

  it("rejects empty hash parts", async () => {
    const isValid = await verifyPassword("anypassword", ":");
    expect(isValid).toBe(false);
  });

  it("handles empty password", async () => {
    const hash = await hashPassword("");
    const isValid = await verifyPassword("", hash);
    expect(isValid).toBe(true);

    const isInvalid = await verifyPassword("notempty", hash);
    expect(isInvalid).toBe(false);
  });

  it("handles unicode passwords", async () => {
    const password = "пароль🔐密码";
    const hash = await hashPassword(password);

    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("handles long passwords", async () => {
    const password = "a".repeat(1000);
    const hash = await hashPassword(password);

    expect(await verifyPassword(password, hash)).toBe(true);
    expect(await verifyPassword(password + "b", hash)).toBe(false);
  });
});
