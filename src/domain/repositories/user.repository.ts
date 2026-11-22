import type { User, UserRole } from "../entities/user.entity";

export type CreateUserRecord = Omit<User, "id" | "createdAt" | "updatedAt">;

export type UpdateUserRecord = Partial<{
  role: UserRole;
  isActive: boolean;
  firstName: string;
  lastName: string;
  passwordHash: string;
}>;

export interface UserListQuery {
  page: number;
  pageSize: number;
  includeInactive?: boolean | undefined;
}

export interface UserPage {
  items: User[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UserRepository {
  create(user: CreateUserRecord): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  list(query: UserListQuery): Promise<UserPage>;
  update(id: string, data: UpdateUserRecord): Promise<User>;
}
