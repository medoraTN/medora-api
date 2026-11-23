export const USER_ROLES = ["ADMIN", "MEDICAL", "ADMIN_STAFF", "SUPERVISOR"] as const;
export type UserRole = (typeof USER_ROLES)[number];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && (USER_ROLES as readonly string[]).includes(value);
}

export interface User {
  id: string; email: string; passwordHash: string; firstName: string; lastName: string;
  role: UserRole; isActive: boolean; createdAt: Date; updatedAt: Date;
}

export type UserAuditAction =
  | "USER_CREATED"
  | "USER_ROLE_CHANGED"
  | "USER_DEACTIVATED"
  | "USER_REACTIVATED"
  | "USER_PASSWORD_RESET";

export interface UserSummary {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserAuditEntry {
  id: string;
  actorUserId: string;
  targetUserId: string;
  action: UserAuditAction;
  metadata: Record<string, string | boolean> | null;
  createdAt: Date;
}
