import { Prisma, type PrismaClient } from "@prisma/client";
import type { User } from "../../../domain/entities/user.entity";
import { ConflictError } from "../../../domain/errors/conflict-error";
import { NotFoundError } from "../../../domain/errors/not-found-error";
import type {
  CreateUserRecord,
  UpdateUserRecord,
  UserListQuery,
  UserPage,
  UserRepository,
} from "../../../domain/repositories/user.repository";

export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async create(user: CreateUserRecord): Promise<User> {
    try {
      return await this.prisma.user.create({ data: user });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new ConflictError("Un utilisateur existe déjà avec cette adresse e-mail.");
      }
      throw error;
    }
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async list(query: UserListQuery): Promise<UserPage> {
    const where: Prisma.UserWhereInput = query.includeInactive ? {} : { isActive: true };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        orderBy: [{ lastName: "asc" }, { firstName: "asc" }, { id: "asc" }],
      }),
      this.prisma.user.count({ where }),
    ]);
    return {
      items,
      page: query.page,
      pageSize: query.pageSize,
      total,
      totalPages: Math.ceil(total / query.pageSize) || 0,
    };
  }

  async update(id: string, data: UpdateUserRecord): Promise<User> {
    try {
      return await this.prisma.user.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
        throw new NotFoundError("Utilisateur");
      }
      throw error;
    }
  }
}
