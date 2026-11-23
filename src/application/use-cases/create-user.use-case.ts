import { ConflictError } from "../../domain/errors/conflict-error";
import type { UserManagementRepository } from "../../domain/repositories/user.repository";
import type { PasswordHasher } from "../ports/password-hasher";
import type { CreateUserDto } from "../dto/create-user.dto";

export class CreateUserUseCase {
  constructor(
    private readonly users: UserManagementRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: CreateUserDto, actorUserId: string) {
    const email = input.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) throw new ConflictError("Un utilisateur existe déjà avec cette adresse e-mail.");
    const passwordHash = await this.passwordHasher.hash(input.password);
    return this.users.createManagedUser({
      email,
      passwordHash,
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: input.role,
      isActive: true,
    }, actorUserId);
  }
}
