import { createApp } from "./app";
import { JwtTokenService } from "./infrastructure/auth/jwt.service";
import { ScryptPasswordHasher } from "./infrastructure/auth/password.service";
import { env } from "./infrastructure/config/env";
import { prisma } from "./infrastructure/database/prisma/client";
import { PrismaPatientRepository } from "./infrastructure/database/repositories/prisma-patient.repository";
import { PrismaUserRepository } from "./infrastructure/database/repositories/prisma-user.repository";
import { startServer } from "./presentation/server";

// Composition root: picks the concrete implementations behind each port.
const app = createApp(
  {
    users: new PrismaUserRepository(prisma),
    patients: new PrismaPatientRepository(prisma),
    passwordHasher: new ScryptPasswordHasher(),
    tokens: new JwtTokenService({ secret: env.jwtSecret, expiresIn: env.jwtExpiresIn }),
  },
  env.corsOrigins,
);

startServer(app, env.port);
