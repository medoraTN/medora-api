export interface PasswordHasher {
  hash(plain: string): Promise<string>;
  /**
   * Must take comparable time whether or not `storedHash` exists, so a missing
   * account cannot be told apart from a wrong password by response time.
   * Resolves `false` (never throws) for an absent or malformed hash.
   */
  verify(plain: string, storedHash?: string | null): Promise<boolean>;
}
