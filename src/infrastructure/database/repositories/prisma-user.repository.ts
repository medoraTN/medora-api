import { Prisma, type PrismaClient } from "@prisma/client";
import type { User, UserRole, UserSummary } from "../../../domain/entities/user.entity";
import { ConflictError } from "../../../domain/errors/conflict-error";
import { LastAdminError } from "../../../domain/errors/auth-errors";
import { NotFoundError } from "../../../domain/errors/not-found-error";
import type {
  CreateUserRecord,
  UserListQuery,
  UserManagementRepository,
  UserPage,
} from "../../../domain/repositories/user.repository";

const USER_SUMMARY_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export class PrismaUserRepository implements UserManagementRepository {
  constructor(private readonly prisma: PrismaClient) {}
  create(user: CreateUserRecord): Promise<User> { return this.prisma.user.create({ data: user }); }
  findById(id: string): Promise<User | null> { return this.prisma.user.findUnique({ where: { id } }); }
  findByEmail(email: string): Promise<User | null> { return this.prisma.user.findUnique({ where: { email } }); }
  findAuthStateById(id: string): Promise<Pick<User, "id" | "role" | "isActive"> | null> {
    return this.prisma.user.findUnique({ where: { id }, select: { id: true, role: true, isActive: true } });
  }

  async listUsers(query: UserListQuery): Promise<UserPage> {
    const where: Prisma.UserWhereInput = {
      ...(query.role ? { role: query.role } : {}),
      ...(query.isActive === undefined ? {} : { isActive: query.isActive }),
      ...(query.search ? {
        OR: [
          { email: { contains: query.search, mode: "insensitive" } },
          { firstName: { contains: query.search, mode: "insensitive" } },
          { lastName: { contains: query.search, mode: "insensitive" } },
        ],
      } : {}),
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: USER_SUMMARY_SELECT,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ email: "asc" }, { id: "asc" }],
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize),
    };
  }

  async createManagedUser(user: CreateUserRecord, actorUserId: string): Promise<UserSummary> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({ data: user, select: USER_SUMMARY_SELECT });
        await tx.userAuditLog.create({
          data: {
            actorUserId,
            targetUserId: created.id,
            action: "USER_CREATED",
            metadata: { role: created.role, isActive: created.isActive },
          },
        });
        return created;
      });
    } catch (error) {
      this.rethrowUniqueEmail(error);
      throw error;
    }
  }

  async updateRole(userId: string, role: UserRole, actorUserId: string): Promise<UserSummary> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current) throw new NotFoundError("Utilisateur");
      if (current.isActive && current.role === "ADMIN" && role !== "ADMIN") {
        await this.lockActiveAdmins(tx);
        if (await tx.user.count({ where: { role: "ADMIN", isActive: true } }) <= 1) throw new LastAdminError();
      }
      if (current.role === role) return this.summary(current);
      const updated = await tx.user.update({ where: { id: userId }, data: { role }, select: USER_SUMMARY_SELECT });
      await tx.userAuditLog.create({
        data: {
          actorUserId,
          targetUserId: userId,
          action: "USER_ROLE_CHANGED",
          metadata: { previousRole: current.role, role },
        },
      });
      return updated;
    });
  }

  async setActive(userId: string, isActive: boolean, actorUserId: string): Promise<UserSummary> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current) throw new NotFoundError("Utilisateur");
      if (current.role === "ADMIN" && current.isActive && !isActive) {
        await this.lockActiveAdmins(tx);
        if (await tx.user.count({ where: { role: "ADMIN", isActive: true } }) <= 1) throw new LastAdminError();
      }
      if (current.isActive === isActive) return this.summary(current);
      const updated = await tx.user.update({ where: { id: userId }, data: { isActive }, select: USER_SUMMARY_SELECT });
      await tx.userAuditLog.create({
        data: {
          actorUserId,
          targetUserId: userId,
          action: isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED",
          metadata: { previousIsActive: current.isActive, isActive },
        },
      });
      return updated;
    });
  }

  async resetPassword(userId: string, passwordHash: string, actorUserId: string): Promise<UserSummary> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.user.findUnique({ where: { id: userId } });
      if (!current) throw new NotFoundError("Utilisateur");
      const updated = await tx.user.update({
        where: { id: userId },
        data: { passwordHash },
        select: USER_SUMMARY_SELECT,
      });
      await tx.userAuditLog.create({
        data: { actorUserId, targetUserId: userId, action: "USER_PASSWORD_RESET" },
      });
      return updated;
    });
  }

  private async lockActiveAdmins(tx: Prisma.TransactionClient): Promise<void> {
    await tx.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "users"
      WHERE "role" = 'ADMIN'::"UserRole" AND "is_active" = true
      FOR UPDATE
    `;
  }

  private summary(user: User): UserSummary {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  private rethrowUniqueEmail(error: unknown): void {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      throw new ConflictError("Un utilisateur existe déjà avec cette adresse e-mail.");
    }
  }
}
