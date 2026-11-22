import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { env } from "../../config/env";

const globalForPrisma = globalThis as typeof globalThis & { medoraPrisma?: PrismaClient };
const adapter = new PrismaPg({ connectionString: env.databaseUrl });
export const prisma = globalForPrisma.medoraPrisma ?? new PrismaClient({ adapter });
if (process.env.NODE_ENV !== "production") globalForPrisma.medoraPrisma = prisma;
