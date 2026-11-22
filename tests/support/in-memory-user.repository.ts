import { randomUUID } from "node:crypto";
import type { User } from "../../src/domain/entities/user.entity";
import type { CreateUserRecord, UserRepository } from "../../src/domain/repositories/user.repository";

/** Test double for the user repository: lets HTTP tests run without PostgreSQL. */
export class InMemoryUserRepository implements UserRepository {
  private readonly users = new Map<string, User>();

  async create(record: CreateUserRecord): Promise<User> {
    if (await this.findByEmail(record.email)) {
      throw new Error(`Duplicate email in test fixtures: ${record.email}`);
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

  deactivate(id: string): void {
    const user = this.users.get(id);
    if (user) {
      user.isActive = false;
    }
  }
}
