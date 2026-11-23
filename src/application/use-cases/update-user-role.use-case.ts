import { SelfModificationError } from "../../domain/errors/auth-errors";
import { NotFoundError } from "../../domain/errors/not-found-error";
import type { UserRole } from "../../domain/entities/user.entity";
import type { UserManagementRepository } from "../../domain/repositories/user.repository";

export class UpdateUserRoleUseCase {
  constructor(private readonly users: UserManagementRepository) {}

  async execute(userId: string, role: UserRole, actorUserId: string) {
    const current = await this.users.findById(userId);
    if (!current) throw new NotFoundError("Utilisateur");
    if (userId === actorUserId && current.role === "ADMIN" && role !== "ADMIN") throw new SelfModificationError();
    return this.users.updateRole(userId, role, actorUserId);
  }
}
