import { ScryptPasswordHasher } from "../../../src/infrastructure/auth/password.service";

describe("ScryptPasswordHasher", () => {
  const hasher = new ScryptPasswordHasher();
  const PASSWORD = "Tr0ub4dor&3 – clinique";

  it("never stores the password in clear text", async () => {
    const hash = await hasher.hash(PASSWORD);

    expect(hash).toMatch(/^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/);
    expect(hash).not.toContain(PASSWORD);
  });

  it("uses a random salt, so equal passwords give different hashes", async () => {
    const [first, second] = await Promise.all([hasher.hash(PASSWORD), hasher.hash(PASSWORD)]);

    expect(first).not.toEqual(second);
  });

  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hasher.hash(PASSWORD);

    await expect(hasher.verify(PASSWORD, hash)).resolves.toBe(true);
    await expect(hasher.verify(`${PASSWORD}!`, hash)).resolves.toBe(false);
    await expect(hasher.verify("", hash)).resolves.toBe(false);
  });

  it("rejects a hash whose derived key was altered", async () => {
    const hash = await hasher.hash(PASSWORD);
    const tampered = `${hash.slice(0, -1)}${hash.endsWith("0") ? "1" : "0"}`;

    await expect(hasher.verify(PASSWORD, tampered)).resolves.toBe(false);
  });

  it.each([undefined, null, "", "not-a-hash", "plaintext-password", `scrypt$${"0".repeat(32)}$${"0".repeat(128)}`])(
    "resolves false (and does not throw) for the absent or malformed hash %p",
    async (stored) => {
      await expect(hasher.verify(PASSWORD, stored)).resolves.toBe(false);
    },
  );
});
