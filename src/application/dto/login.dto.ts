import type { User, UserRole } from "../../domain/entities/user.entity";

export interface LoginDto {
  email: string;
  password: string;
}

/** Safe projection of a user: never carries the password hash. */
export interface AuthenticatedUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
}

export interface LoginResultDto {
  token: string;
  user: AuthenticatedUserDto;
}

export function toAuthenticatedUserDto(user: User): AuthenticatedUserDto {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    role: user.role,
  };
}
