import { randomUUID } from "node:crypto";
import type { User } from "../../src/domain/entities/user.entity";
import { ConflictError } from "../../src/domain/errors/conflict-error";
import { NotFoundError } from "../../src/domain/errors/not-found-error";
import type {
  CreateUserRecord,
  UpdateUserRecord,
  UserListQuery,
  UserPage,
  UserRepository,
} from "../../src/domain/repositories/user.repository";

/** Test double for the user repository: lets HTTP tests run without PostgreSQL. */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async create(record: CreateUserRecord): Promise<User> {
    if (await this.findByEmail(record.email)) {
      throw new ConflictError("Un utilisateur existe déjà avec cette adresse e-mail.");
    }
    const now = new Date();
    const user: User = { ...record, id: randomUUID(), createdAt: now, updatedAt: now };
    this.users.set(user.id, user);
    return user;
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return [...this.users.values()].find((user) => user.email === email) ?? null;
  }

  async list(query: UserListQuery): Promise<UserPage> {
    const filtered = [...this.users.values()]
      .filter((user) => query.includeInactive || user.isActive)
      .sort((a, b) => a.lastName.localeCompare(b.lastName) || a.firstName.localeCompare(b.firstName) || a.id.localeCompare(b.id));
    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize),
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / query.pageSize) || 0,
    };
  }

  async update(id: string, data: UpdateUserRecord): Promise<User> {
    const current = this.users.get(id);
    if (!current) throw new NotFoundError("Utilisateur");
    const updated: User = { ...current, ...data, updatedAt: new Date() };
    this.users.set(id, updated);
    return updated;
  }

  deactivate(id: string): void {
    const user = this.users.get(id);
    if (user) {
      user.isActive = false;
    }
  }

  clear(): void {
    this.users.clear();
  }
}
