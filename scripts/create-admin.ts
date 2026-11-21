import 'dotenv/config';
import { z } from 'zod';
import { hashPassword } from '../src/infrastructure/auth/password.service';
import { createDatabase } from '../src/infrastructure/database/client';

async function main() {
  const env = z.object({
    DATABASE_URL: z.string().min(1),
    MEDORA_ADMIN_EMAIL: z.email().transform((email) => email.toLowerCase()),
    MEDORA_ADMIN_PASSWORD: z.string().min(12).max(256),
  }).safeParse(process.env);
  if (!env.success) {
    console.error('Set DATABASE_URL, MEDORA_ADMIN_EMAIL and MEDORA_ADMIN_PASSWORD (12–256 characters).');
    process.exitCode = 1;
    return;
  }
  const db = createDatabase(env.data.DATABASE_URL);
  try {
    await db.user.create({
      data: {
        email: env.data.MEDORA_ADMIN_EMAIL,
        passwordHash: await hashPassword(env.data.MEDORA_ADMIN_PASSWORD),
        role: 'ADMIN',
      },
    });
    console.info('Administrator created.');
  } catch {
    console.error('Could not create the administrator. Check database access and email uniqueness.');
    process.exitCode = 1;
  } finally {
    await db.$disconnect();
  }
}
void main();
