import type { PrismaClient } from '@prisma/client';
import type { UserRepository } from '../../../domain/repositories/user.repository';

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly db: PrismaClient) {}

  findByEmail(email: string) {
    return this.db.user.findUnique({ where: { email } });
  }

  findActiveActor(id: string) {
    return this.db.user.findFirst({ where: { id, active: true }, select: { id: true, role: true } });
  }
}
