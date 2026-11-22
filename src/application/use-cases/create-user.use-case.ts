import { ConflictError } from "../../domain/errors/conflict-error";
import type { UserRepository } from "../../domain/repositories/user.repository";
import type { PasswordHasher } from "../ports/password-hasher";
import { toUserDto, type CreateUserDto, type UserDto } from "../dto/user.dto";

export class CreateUserUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(input: CreateUserDto): Promise<UserDto> {
    const email = input.email.trim().toLowerCase();
    if (await this.users.findByEmail(email)) {
      throw new ConflictError("Un utilisateur existe déjà avec cette adresse e-mail.");
    }

    const user = await this.users.create({
      email,
      passwordHash: await this.passwordHasher.hash(input.password),
      firstName: input.firstName.trim(),
      lastName: input.lastName.trim(),
      role: input.role,
      isActive: true,
    });

    return toUserDto(user);
  }
}
