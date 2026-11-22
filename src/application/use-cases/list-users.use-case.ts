import type { UserRepository } from "../../domain/repositories/user.repository";
import { toUserDto, type ListUsersDto, type UserDto } from "../dto/user.dto";

export interface UserPageDto {
  items: UserDto[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export class ListUsersUseCase {
  constructor(private readonly users: UserRepository) {}

  async execute(query: ListUsersDto): Promise<UserPageDto> {
    const page = await this.users.list(query);
    return {
      items: page.items.map(toUserDto),
      page: page.page,
      pageSize: page.pageSize,
      total: page.total,
      totalPages: page.totalPages,
    };
  }
}
