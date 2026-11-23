import type { UserRole } from "../../domain/entities/user.entity";

export interface CreateUserDto {
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  password: string;
}
