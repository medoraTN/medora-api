import type { User, UserRole } from "../../domain/entities/user.entity";

/** Safe projection for admin user management — never includes the password hash. */
export interface UserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface UpdateUserDto {
  role?: UserRole | undefined;
  isActive?: boolean | undefined;
  firstName?: string | undefined;
  lastName?: string | undefined;
}

export interface ResetPasswordDto {
  password: string;
}

export interface ListUsersDto {
  page: number;
  pageSize: number;
  /** When false (default), only active users are returned. */
  includeInactive?: boolean | undefined;
}

export function toUserDto(user: User): UserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
    isActive: user.isActive,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
