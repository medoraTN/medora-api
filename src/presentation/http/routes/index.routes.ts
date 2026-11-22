import { Router } from "express";
import type { PasswordHasher } from "../../../application/ports/password-hasher";
import type { TokenService } from "../../../application/ports/token-service";
import { GetCurrentUserUseCase } from "../../../application/use-cases/get-current-user.use-case";
import { LoginUseCase } from "../../../application/use-cases/login.use-case";
import { CreatePatientUseCase } from "../../../application/use-cases/create-patient.use-case";
import { GetPatientUseCase } from "../../../application/use-cases/get-patient.use-case";
import { ListPatientsUseCase } from "../../../application/use-cases/list-patients.use-case";
import type { PatientRepository } from "../../../domain/repositories/patient.repository";
import type { UserRepository } from "../../../domain/repositories/user.repository";
import { AuthController } from "../controllers/auth.controller";
import { PatientController } from "../controllers/patient.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { createAuthRouter } from "./auth.routes";
import { createPatientRouter } from "./patient.routes";

export interface ApiDependencies {
  users: UserRepository;
  patients: PatientRepository;
  passwordHasher: PasswordHasher;
  tokens: TokenService;
}

export function createApiRouter({ users, patients, passwordHasher, tokens }: ApiDependencies): Router {
  const router = Router();
  const authController = new AuthController(
    new LoginUseCase(users, passwordHasher, tokens),
    new GetCurrentUserUseCase(users),
  );

  router.use("/auth", createAuthRouter(authController, authenticate(tokens)));
  const patientController = new PatientController(
    new CreatePatientUseCase(patients),
    new ListPatientsUseCase(patients),
    new GetPatientUseCase(patients),
  );
  router.use("/patients", createPatientRouter(patientController, authenticate(tokens)));
  return router;
}
