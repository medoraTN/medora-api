import 'dotenv/config';
import { createApp } from './app';
import { authUseCases } from './application/auth';
import { patientUseCases } from './application/patients';
import { jwtService } from './infrastructure/auth/jwt.service';
import { verifyPassword } from './infrastructure/auth/password.service';
import { createDatabase } from './infrastructure/database/client';
import { PrismaPatientRepository } from './infrastructure/database/repositories/prisma-patient.repository';
import { PrismaUserRepository } from './infrastructure/database/repositories/prisma-user.repository';

async function main() {
  const connectionString = process.env['DATABASE_URL'];
  const jwtSecret = process.env['JWT_SECRET'];
  const port = Number(process.env['PORT'] ?? 3000);
  if (!connectionString || !jwtSecret || Buffer.byteLength(jwtSecret) < 32) {
    throw new Error('Set DATABASE_URL and JWT_SECRET (at least 32 bytes).');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid PORT.');

  const db = createDatabase(connectionString);
  await db.$connect();
  const auth = authUseCases(new PrismaUserRepository(db), verifyPassword, jwtService(jwtSecret));
  const patients = patientUseCases(new PrismaPatientRepository(db));
  const server = createApp(auth, patients).listen(port, () => console.info(`Medora API listening on ${port}`));
  const stop = () => server.close(() => { void db.$disconnect(); });
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

main().catch((error: unknown) => {
  console.error('Medora API startup failed:', error instanceof Error ? error.name : 'Unknown error');
  process.exitCode = 1;
});
