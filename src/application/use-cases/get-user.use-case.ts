import { NotFoundError } from "../../domain/errors/not-found-error";
import type { UserRepository } from "../../domain/repositories/user.repository";
import { toUserDto, type UserDto } from "../dto/user.dto";

export class GetUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(id: string): Promise<UserDto> {
    const user = await this.users.findById(id);
    if (!user) throw new NotFoundError("Utilisateur");
    return toUserDto(user);
  }
}
