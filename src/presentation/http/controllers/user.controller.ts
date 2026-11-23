import type { Request, Response } from "express";
import { UnauthenticatedError } from "../../../domain/errors/auth-errors";
import type { CreateUserUseCase } from "../../../application/use-cases/create-user.use-case";
import type { ListUsersUseCase } from "../../../application/use-cases/list-users.use-case";
import type { ResetUserPasswordUseCase } from "../../../application/use-cases/reset-user-password.use-case";
import type { SetUserActiveUseCase } from "../../../application/use-cases/set-user-active.use-case";
import type { UpdateUserRoleUseCase } from "../../../application/use-cases/update-user-role.use-case";
import {
  createUserSchema,
  listUsersQuerySchema,
  resetUserPasswordSchema,
  setUserActiveSchema,
  updateUserRoleSchema,
  userIdParamsSchema,
} from "../validators/user.validator";

export class UserController {
  constructor(
    private readonly listUsers: ListUsersUseCase,
    private readonly createUser: CreateUserUseCase,
    private readonly updateUserRole: UpdateUserRoleUseCase,
    private readonly setUserActive: SetUserActiveUseCase,
    private readonly resetUserPassword: ResetUserPasswordUseCase,
  ) {}

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listUsersQuerySchema.parse(req.query);
    const result = await this.listUsers.execute(query);
    res.status(200).json({
      items: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createUserSchema.parse(req.body);
    const user = await this.createUser.execute(input, this.actorId(req));
    res.status(201).json({ user });
  };

  updateRole = async (req: Request, res: Response): Promise<void> => {
    const { id } = userIdParamsSchema.parse(req.params);
    const { role } = updateUserRoleSchema.parse(req.body);
    const user = await this.updateUserRole.execute(id, role, this.actorId(req));
    res.status(200).json({ user });
  };

  setActive = async (req: Request, res: Response): Promise<void> => {
    const { id } = userIdParamsSchema.parse(req.params);
    const { isActive } = setUserActiveSchema.parse(req.body);
    const user = await this.setUserActive.execute(id, isActive, this.actorId(req));
    res.status(200).json({ user });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { id } = userIdParamsSchema.parse(req.params);
    const { newPassword } = resetUserPasswordSchema.parse(req.body);
    const user = await this.resetUserPassword.execute(id, newPassword, this.actorId(req));
    res.status(200).json({ user });
  };

  private actorId(req: Request): string {
    if (!req.auth) throw new UnauthenticatedError();
    return req.auth.userId;
  }
}
