import { randomUUID } from "node:crypto";
import type { User, UserAuditAction, UserRole, UserSummary } from "../../src/domain/entities/user.entity";
import { LastAdminError } from "../../src/domain/errors/auth-errors";
import { NotFoundError } from "../../src/domain/errors/not-found-error";
import type {
  CreateUserRecord,
  UserListQuery,
  UserManagementRepository,
  UserPage,
} from "../../src/domain/repositories/user.repository";
import type { UserAuditEntry } from "../../src/domain/entities/user.entity";

/** Test double for the user repository: lets HTTP tests run without PostgreSQL. */
export class InMemoryUserRepository implements UserManagementRepository {
  private readonly users = new Map<string, User>();
  private readonly audit: UserAuditEntry[] = [];

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

  async findAuthStateById(id: string): Promise<Pick<User, "id" | "role" | "isActive"> | null> {
    const user = this.users.get(id);
    return user ? { id: user.id, role: user.role, isActive: user.isActive } : null;
  }

  async listUsers(query: UserListQuery): Promise<UserPage> {
    const needle = query.search?.toLowerCase();
    const filtered = [...this.users.values()]
      .filter((user) => !query.role || user.role === query.role)
      .filter((user) => query.isActive === undefined || user.isActive === query.isActive)
      .filter((user) => !needle || [user.email, user.firstName, user.lastName].some((field) => field.toLowerCase().includes(needle)))
      .sort((a, b) => a.email.localeCompare(b.email) || a.id.localeCompare(b.id));
    const start = (query.page - 1) * query.pageSize;
    return {
      items: filtered.slice(start, start + query.pageSize).map((user) => this.summary(user)),
      page: query.page,
      pageSize: query.pageSize,
      total: filtered.length,
      totalPages: Math.ceil(filtered.length / query.pageSize),
    };
  }

  async createManagedUser(user: CreateUserRecord, actorUserId: string): Promise<UserSummary> {
    const created = await this.create(user);
    this.recordAudit(actorUserId, created.id, "USER_CREATED", { role: created.role, isActive: created.isActive });
    return this.summary(created);
  }

  async updateRole(userId: string, role: UserRole, actorUserId: string): Promise<UserSummary> {
    const user = this.requireUser(userId);
    if (user.isActive && user.role === "ADMIN" && role !== "ADMIN") this.assertNotLastAdmin();
    if (user.role !== role) {
      const previousRole = user.role;
      user.role = role;
      user.updatedAt = new Date();
      this.recordAudit(actorUserId, userId, "USER_ROLE_CHANGED", { previousRole, role });
    }
    return this.summary(user);
  }

  async setActive(userId: string, isActive: boolean, actorUserId: string): Promise<UserSummary> {
    const user = this.requireUser(userId);
    if (user.role === "ADMIN" && user.isActive && !isActive) this.assertNotLastAdmin();
    if (user.isActive !== isActive) {
      const previousIsActive = user.isActive;
      user.isActive = isActive;
      user.updatedAt = new Date();
      this.recordAudit(actorUserId, userId, isActive ? "USER_REACTIVATED" : "USER_DEACTIVATED", {
        previousIsActive,
        isActive,
      });
    }
    return this.summary(user);
  }

  async resetPassword(userId: string, passwordHash: string, actorUserId: string): Promise<UserSummary> {
    const user = this.requireUser(userId);
    user.passwordHash = passwordHash;
    user.updatedAt = new Date();
    this.recordAudit(actorUserId, userId, "USER_PASSWORD_RESET", null);
    return this.summary(user);
  }

  deactivate(id: string): void {
    const user = this.users.get(id);
    if (user) {
      user.isActive = false;
    }
  }

  setRole(id: string, role: UserRole): void {
    const user = this.users.get(id);
    if (user) user.role = role;
  }

  auditEntries(): UserAuditEntry[] {
    return [...this.audit];
  }

  private requireUser(id: string): User {
    const user = this.users.get(id);
    if (!user) throw new NotFoundError("Utilisateur");
    return user;
  }

  private assertNotLastAdmin(): void {
    const activeAdmins = [...this.users.values()].filter((user) => user.role === "ADMIN" && user.isActive).length;
    if (activeAdmins <= 1) throw new LastAdminError();
  }

  private summary(user: User): UserSummary {
    const { passwordHash: _passwordHash, ...safe } = user;
    return safe;
  }

  private recordAudit(
    actorUserId: string,
    targetUserId: string,
    action: UserAuditAction,
    metadata: Record<string, string | boolean> | null,
  ): void {
    this.audit.push({
      id: randomUUID(),
      actorUserId,
      targetUserId,
      action,
      metadata,
      createdAt: new Date(),
    });
  }
}
