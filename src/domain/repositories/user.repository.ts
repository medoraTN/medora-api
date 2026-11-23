import type { User, UserRole, UserSummary } from "../entities/user.entity";
export type CreateUserRecord = Omit<User, "id" | "createdAt" | "updatedAt">;

export interface UserListQuery {
  page: number;
  pageSize: number;
  search?: string | undefined;
  role?: UserRole | undefined;
  isActive?: boolean | undefined;
}

export interface UserPage {
  items: UserSummary[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UserRepository {
  create(user: CreateUserRecord): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findAuthStateById(id: string): Promise<Pick<User, "id" | "role" | "isActive"> | null>;
}

export interface UserManagementRepository extends UserRepository {
  listUsers(query: UserListQuery): Promise<UserPage>;
  createManagedUser(user: CreateUserRecord, actorUserId: string): Promise<UserSummary>;
  updateRole(userId: string, role: UserRole, actorUserId: string): Promise<UserSummary>;
  setActive(userId: string, isActive: boolean, actorUserId: string): Promise<UserSummary>;
  resetPassword(userId: string, passwordHash: string, actorUserId: string): Promise<UserSummary>;
}
