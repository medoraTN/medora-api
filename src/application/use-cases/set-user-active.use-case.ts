import { SelfModificationError } from "../../domain/errors/auth-errors";
import { NotFoundError } from "../../domain/errors/not-found-error";
import type { UserManagementRepository } from "../../domain/repositories/user.repository";

export class SetUserActiveUseCase {
  constructor(private readonly users: UserManagementRepository) {}

  async execute(userId: string, isActive: boolean, actorUserId: string) {
    if (!await this.users.findById(userId)) throw new NotFoundError("Utilisateur");
    if (userId === actorUserId && !isActive) throw new SelfModificationError();
    return this.users.setActive(userId, isActive, actorUserId);
  }
}
