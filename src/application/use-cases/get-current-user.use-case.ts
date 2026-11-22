import { UnauthenticatedError } from "../../domain/errors/auth-errors";
import type { UserRepository } from "../../domain/repositories/user.repository";
import { toAuthenticatedUserDto, type AuthenticatedUserDto } from "../dto/login.dto";

export class GetCurrentUserUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(userId: string): Promise<AuthenticatedUserDto> {
    const user = await this.users.findById(userId);
    // A valid token for a deleted or deactivated account must not keep working.
    if (!user || !user.isActive) {
      throw new UnauthenticatedError();
    }
    return toAuthenticatedUserDto(user);
  }
}
