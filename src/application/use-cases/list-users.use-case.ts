import type { UserListQuery, UserManagementRepository } from "../../domain/repositories/user.repository";

export class ListUsersUseCase {
  constructor(private readonly users: UserManagementRepository) {}

  execute(query: UserListQuery) {
    return this.users.listUsers(query);
  }
}
