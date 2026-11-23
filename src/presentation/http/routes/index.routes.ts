import { Router } from "express";
import type { PasswordHasher } from "../../../application/ports/password-hasher";
import type { TokenService } from "../../../application/ports/token-service";
import { GetCurrentUserUseCase } from "../../../application/use-cases/get-current-user.use-case";
import { LoginUseCase } from "../../../application/use-cases/login.use-case";
import { CreatePatientUseCase } from "../../../application/use-cases/create-patient.use-case";
import { GetPatientUseCase } from "../../../application/use-cases/get-patient.use-case";
import { ListPatientsUseCase } from "../../../application/use-cases/list-patients.use-case";
import { UpdatePatientStatusUseCase } from "../../../application/use-cases/update-patient-status.use-case";
import { CreateReservationUseCase } from "../../../application/use-cases/create-reservation.use-case";
import { CancelReservationUseCase } from "../../../application/use-cases/cancel-reservation.use-case";
import { ListReservationsUseCase } from "../../../application/use-cases/list-reservations.use-case";
import { UpdateReservationUseCase } from "../../../application/use-cases/update-reservation.use-case";
import { CreateUserUseCase } from "../../../application/use-cases/create-user.use-case";
import { ListUsersUseCase } from "../../../application/use-cases/list-users.use-case";
import { ResetUserPasswordUseCase } from "../../../application/use-cases/reset-user-password.use-case";
import { SetUserActiveUseCase } from "../../../application/use-cases/set-user-active.use-case";
import { UpdateUserRoleUseCase } from "../../../application/use-cases/update-user-role.use-case";
import type { PatientRepository } from "../../../domain/repositories/patient.repository";
import type { ReservationRepository } from "../../../domain/repositories/reservation.repository";
import type { UserManagementRepository, UserRepository } from "../../../domain/repositories/user.repository";
import { AuthController } from "../controllers/auth.controller";
import { PatientController } from "../controllers/patient.controller";
import { ReservationController } from "../controllers/reservation.controller";
import { UserController } from "../controllers/user.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { createAuthRouter } from "./auth.routes";
import { createPatientRouter } from "./patient.routes";
import { createReservationRouter } from "./reservation.routes";
import { createUserRouter } from "./user.routes";

export interface ApiDependencies {
  users: UserRepository;
  userManagement?: UserManagementRepository;
  patients: PatientRepository;
  reservations?: ReservationRepository;
  passwordHasher: PasswordHasher;
  tokens: TokenService;
}

export function createApiRouter({ users, userManagement, patients, reservations, passwordHasher, tokens }: ApiDependencies): Router {
  const router = Router();
  const requireAuthentication = authenticate(tokens, users);
  const authController = new AuthController(
    new LoginUseCase(users, passwordHasher, tokens),
    new GetCurrentUserUseCase(users),
  );

  router.use("/auth", createAuthRouter(authController, requireAuthentication));
  if (userManagement) {
    const userController = new UserController(
      new ListUsersUseCase(userManagement),
      new CreateUserUseCase(userManagement, passwordHasher),
      new UpdateUserRoleUseCase(userManagement),
      new SetUserActiveUseCase(userManagement),
      new ResetUserPasswordUseCase(userManagement, passwordHasher),
    );
    router.use("/users", createUserRouter(userController, requireAuthentication));
  }
  const patientController = new PatientController(
    new CreatePatientUseCase(patients),
    new ListPatientsUseCase(patients),
    new GetPatientUseCase(patients),
    new UpdatePatientStatusUseCase(patients),
  );
  router.use("/patients", createPatientRouter(patientController, requireAuthentication));
  if (reservations) {
    const reservationController = new ReservationController(
      new CreateReservationUseCase(reservations, patients),
      new ListReservationsUseCase(reservations),
      new UpdateReservationUseCase(reservations),
      new CancelReservationUseCase(reservations),
    );
    router.use("/reservations", createReservationRouter(reservationController, requireAuthentication));
  }
  return router;
}
