export type UserRole = "ADMIN" | "MEDICAL_STAFF" | "ADMINISTRATIVE_STAFF" | "EMERGENCY_SUPERVISOR";
export interface User {
  id: string; email: string; passwordHash: string; firstName: string; lastName: string;
  role: UserRole; isActive: boolean; createdAt: Date; updatedAt: Date;
}
