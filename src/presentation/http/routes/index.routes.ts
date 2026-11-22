import { Router } from "express";
import type { PasswordHasher } from "../../../application/ports/password-hasher";
import type { TokenService } from "../../../application/ports/token-service";
import { GetCurrentUserUseCase } from "../../../application/use-cases/get-current-user.use-case";
import { LoginUseCase } from "../../../application/use-cases/login.use-case";
import type { UserRepository } from "../../../domain/repositories/user.repository";
import { AuthController } from "../controllers/auth.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { createAuthRouter } from "./auth.routes";

export interface ApiDependencies {
  users: UserRepository;
  passwordHasher: PasswordHasher;
  tokens: TokenService;
}

export function createApiRouter({ users, passwordHasher, tokens }: ApiDependencies): Router {
  const router = Router();
  const authController = new AuthController(
    new LoginUseCase(users, passwordHasher, tokens),
    new GetCurrentUserUseCase(users),
  );

  router.use("/auth", createAuthRouter(authController, authenticate(tokens)));
  // Feature routers (patients, reservations, ...) mount here behind
  // `authenticate(tokens)` and `requireRole(...)`.
  return router;
}
