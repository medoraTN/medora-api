import { NotFoundError } from "../../domain/errors/not-found-error";
import type { UserManagementRepository } from "../../domain/repositories/user.repository";
import type { PasswordHasher } from "../ports/password-hasher";

export class ResetUserPasswordUseCase {
  constructor(
    private readonly users: UserManagementRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(userId: string, newPassword: string, actorUserId: string) {
    if (!await this.users.findById(userId)) throw new NotFoundError("Utilisateur");
    const passwordHash = await this.passwordHasher.hash(newPassword);
    return this.users.resetPassword(userId, passwordHash, actorUserId);
  }
}
