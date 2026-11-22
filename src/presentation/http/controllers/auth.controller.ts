import type { Request, Response } from "express";
import type { GetCurrentUserUseCase } from "../../../application/use-cases/get-current-user.use-case";
import type { LoginUseCase } from "../../../application/use-cases/login.use-case";
import { UnauthenticatedError } from "../../../domain/errors/auth-errors";
import { loginSchema } from "../validators/auth.validator";

export class AuthController {
  constructor(
    private readonly loginUseCase: LoginUseCase,
    private readonly getCurrentUserUseCase: GetCurrentUserUseCase,
  ) {}

  // Express 5 forwards rejected promises from handlers to the error middleware.
  login = async (req: Request, res: Response): Promise<void> => {
    const credentials = loginSchema.parse(req.body);
    const result = await this.loginUseCase.execute(credentials);
    res.set("Cache-Control", "no-store").status(200).json(result);
  };

  me = async (req: Request, res: Response): Promise<void> => {
    if (!req.auth) {
      throw new UnauthenticatedError();
    }
    const user = await this.getCurrentUserUseCase.execute(req.auth.userId);
    res.status(200).json({ user });
  };
}
