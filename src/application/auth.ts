import { DomainError } from '../domain/errors';
import type { UserRepository } from '../domain/repositories/user.repository';

export function authUseCases(
  users: UserRepository,
  verifyPassword: (password: string, hash?: string) => Promise<boolean>,
  tokens: { issue(id: string): string; subject(token: string): string | undefined },
) {
  return {
    async login(email: string, password: string) {
      const user = await users.findByEmail(email);
      const valid = await verifyPassword(password, user?.passwordHash);
      if (!user?.active || !valid) {
        throw new DomainError('INVALID_LOGIN', 'Identifiants incorrects.');
      }
      return { token: tokens.issue(user.id), user: { id: user.id, role: user.role } };
    },
    async authenticate(token: string) {
      const id = tokens.subject(token);
      return id ? users.findActiveActor(id) : null;
    },
  };
}
