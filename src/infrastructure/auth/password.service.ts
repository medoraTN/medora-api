import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import type { PasswordHasher } from "../../application/ports/password-hasher";

const derive = promisify(scrypt) as (password: string, salt: Buffer, keyLength: number) => Promise<Buffer>;

const SALT_BYTES = 16;
const KEY_BYTES = 64;
// Stored format: scrypt$<salt hex>$<derived key hex>. A random salt per password.
const HASH_PATTERN = /^scrypt\$([0-9a-f]{32})\$([0-9a-f]{128})$/;
// Stand-ins used when the stored hash is absent or malformed, so the same scrypt run is paid.
const FALLBACK_SALT_HEX = "0".repeat(SALT_BYTES * 2);
const FALLBACK_KEY_HEX = "0".repeat(KEY_BYTES * 2);

export class ScryptPasswordHasher implements PasswordHasher {
  async hash(plain: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const key = await derive(plain, salt, KEY_BYTES);
    return `scrypt$${salt.toString("hex")}$${key.toString("hex")}`;
  }

  async verify(plain: string, storedHash?: string | null): Promise<boolean> {
    const parsed = HASH_PATTERN.exec(storedHash ?? "");
    const expected = Buffer.from(parsed?.[2] ?? FALLBACK_KEY_HEX, "hex");
    const salt = Buffer.from(parsed?.[1] ?? FALLBACK_SALT_HEX, "hex");

    const actual = await derive(plain, salt, expected.length);
    return timingSafeEqual(expected, actual) && parsed !== null;
  }
}
