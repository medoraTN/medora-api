import type { User } from "../entities/user.entity";
export type CreateUserRecord = Omit<User, "id" | "createdAt" | "updatedAt">;
export interface UserRepository {
  create(user: CreateUserRecord): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}
