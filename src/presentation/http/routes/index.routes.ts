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
import type { PatientRepository } from "../../../domain/repositories/patient.repository";
import type { ReservationRepository } from "../../../domain/repositories/reservation.repository";
import type { UserRepository } from "../../../domain/repositories/user.repository";
import { AuthController } from "../controllers/auth.controller";
import { PatientController } from "../controllers/patient.controller";
import { ReservationController } from "../controllers/reservation.controller";
import { authenticate } from "../middlewares/auth.middleware";
import { createAuthRouter } from "./auth.routes";
import { createPatientRouter } from "./patient.routes";
import { createReservationRouter } from "./reservation.routes";

export interface ApiDependencies {
  users: UserRepository;
  patients: PatientRepository;
  reservations?: ReservationRepository;
  passwordHasher: PasswordHasher;
  tokens: TokenService;
}

export function createApiRouter({ users, patients, reservations, passwordHasher, tokens }: ApiDependencies): Router {
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
    new UpdatePatientStatusUseCase(patients),
  );
  router.use("/patients", createPatientRouter(patientController, authenticate(tokens)));
  if (reservations) {
    const reservationController = new ReservationController(
      new CreateReservationUseCase(reservations, patients),
      new ListReservationsUseCase(reservations),
      new UpdateReservationUseCase(reservations),
      new CancelReservationUseCase(reservations),
    );
    router.use("/reservations", createReservationRouter(reservationController, authenticate(tokens)));
  }
  return router;
}
