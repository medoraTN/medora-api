import { Router } from "express";
import type { PasswordHasher } from "../../../application/ports/password-hasher";
import type { TokenService } from "../../../application/ports/token-service";
import { CreatePatientUseCase } from "../../../application/use-cases/create-patient.use-case";
import { CreateUserUseCase } from "../../../application/use-cases/create-user.use-case";
import { GetCurrentUserUseCase } from "../../../application/use-cases/get-current-user.use-case";
import { GetPatientUseCase } from "../../../application/use-cases/get-patient.use-case";
import { GetUserUseCase } from "../../../application/use-cases/get-user.use-case";
import { ListPatientsUseCase } from "../../../application/use-cases/list-patients.use-case";
import { ListUsersUseCase } from "../../../application/use-cases/list-users.use-case";
import { LoginUseCase } from "../../../application/use-cases/login.use-case";
import { ResetUserPasswordUseCase } from "../../../application/use-cases/reset-user-password.use-case";
import { UpdatePatientStatusUseCase } from "../../../application/use-cases/update-patient-status.use-case";
import { UpdateUserUseCase } from "../../../application/use-cases/update-user.use-case";
import type { PatientRepository } from "../../../domain/repositories/patient.repository";
import type { UserRepository } from "../../../domain/repositories/user.repository";
import { AuthController } from "../controllers/auth.controller";
import { PatientController } from "../controllers/patient.controller";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { createAuthRouter } from "./auth.routes";
import { createPatientRouter } from "./patient.routes";
import { createUserRouter } from "./user.routes";

export interface ApiDependencies {
  users: UserRepository;
  patients: PatientRepository;
  passwordHasher: PasswordHasher;
  tokens: TokenService;
}

export function createApiRouter({ users, patients, passwordHasher, tokens }: ApiDependencies): Router {
  const router = Router();
  const requireAuth = authenticate(tokens);

  const authController = new AuthController(
    new LoginUseCase(users, passwordHasher, tokens),
    new GetCurrentUserUseCase(users),
  );
  router.use("/auth", createAuthRouter(authController, requireAuth));

  const patientController = new PatientController(
    new CreatePatientUseCase(patients),
    new ListPatientsUseCase(patients),
    new GetPatientUseCase(patients),
    new UpdatePatientStatusUseCase(patients),
  );
  router.use("/patients", createPatientRouter(patientController, requireAuth));

  const userController = new UserController(
    new CreateUserUseCase(users, passwordHasher),
    new ListUsersUseCase(users),
    new GetUserUseCase(users),
    new UpdateUserUseCase(users),
    new ResetUserPasswordUseCase(users, passwordHasher),
  );
  router.use("/users", createUserRouter(userController, requireAuth));

  return router;
}
