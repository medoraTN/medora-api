import { InvalidCredentialsError } from "../../domain/errors/auth-errors";
import type { UserRepository } from "../../domain/repositories/user.repository";
import { toAuthenticatedUserDto, type LoginDto, type LoginResultDto } from "../dto/login.dto";
import type { PasswordHasher } from "../ports/password-hasher";
import type { TokenService } from "../ports/token-service";

export class LoginUseCase {
  constructor(
    private readonly users: UserRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokens: TokenService,
  ) {}

  async execute({ email, password }: LoginDto): Promise<LoginResultDto> {
    const user = await this.users.findByEmail(email.trim().toLowerCase());
    // Always verify, even without a user, so timing does not reveal which emails exist.
    const passwordMatches = await this.passwordHasher.verify(password, user?.passwordHash);

    if (!user || !user.isActive || !passwordMatches) {
      throw new InvalidCredentialsError();
    }

    return {
      token: this.tokens.issue({ userId: user.id, role: user.role }),
      user: toAuthenticatedUserDto(user),
    };
  }
}
