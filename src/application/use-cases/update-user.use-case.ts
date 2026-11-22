import { NotFoundError } from "../../domain/errors/not-found-error";
import type { UserRepository } from "../../domain/repositories/user.repository";
import { toUserDto, type UpdateUserDto, type UserDto } from "../dto/user.dto";

export class UpdateUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(id: string, input: UpdateUserDto): Promise<UserDto> {
    const current = await this.users.findById(id);
    if (!current) throw new NotFoundError("Utilisateur");

    const updated = await this.users.update(id, {
      ...(input.role !== undefined ? { role: input.role } : {}),
      ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
      ...(input.firstName !== undefined ? { firstName: input.firstName.trim() } : {}),
      ...(input.lastName !== undefined ? { lastName: input.lastName.trim() } : {}),
    });

    return toUserDto(updated);
  }
}
