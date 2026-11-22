import { NotFoundError } from "../../domain/errors/not-found-error";
import type { UserRepository } from "../../domain/repositories/user.repository";
import type { PasswordHasher } from "../ports/password-hasher";
import { toUserDto, type ResetPasswordDto, type UserDto } from "../dto/user.dto";

export class ResetUserPasswordUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
  ) {}

  async execute(id: string, input: ResetPasswordDto): Promise<UserDto> {
    const current = await this.users.findById(id);
    if (!current) throw new NotFoundError("Utilisateur");

    const updated = await this.users.update(id, {
      passwordHash: await this.passwordHasher.hash(input.password),
    });

    return toUserDto(updated);
  }
}
