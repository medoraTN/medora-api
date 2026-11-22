import { createApp } from "./app";
import { JwtTokenService } from "./infrastructure/auth/jwt.service";
import { ScryptPasswordHasher } from "./infrastructure/auth/password.service";
import { env } from "./infrastructure/config/env";
import { prisma } from "./infrastructure/database/prisma/client";
import { PrismaPatientRepository } from "./infrastructure/database/repositories/prisma-patient.repository";
import { PrismaReservationRepository } from "./infrastructure/database/repositories/prisma-reservation.repository";
import { PrismaUserRepository } from "./infrastructure/database/repositories/prisma-user.repository";
import { startServer } from "./presentation/server";

const app = createApp({
  users: new PrismaUserRepository(prisma),
  patients: new PrismaPatientRepository(prisma),
  reservations: new PrismaReservationRepository(prisma),
  passwordHasher: new ScryptPasswordHasher(),
  tokens: new JwtTokenService({ secret: env.jwtSecret, expiresIn: env.jwtExpiresIn }),
});

startServer(app, env.port);
