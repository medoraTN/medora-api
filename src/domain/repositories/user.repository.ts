import type { Actor, UserAccount } from '../entities/user.entity';

export interface UserRepository {
  findByEmail(email: string): Promise<UserAccount | null>;
  findActiveActor(id: string): Promise<Actor | null>;
}
