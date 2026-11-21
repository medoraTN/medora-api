export const roles = ['ADMIN', 'MEDICAL', 'ADMIN_STAFF', 'SUPERVISOR'] as const;
export type Role = typeof roles[number];
export interface Actor {
  id: string;
  role: Role;
}

export interface UserAccount extends Actor {
  email: string;
  passwordHash: string;
  active: boolean;
}
