import type { Request, Response } from "express";
import type { CreateUserUseCase } from "../../../application/use-cases/create-user.use-case";
import type { GetUserUseCase } from "../../../application/use-cases/get-user.use-case";
import type { ListUsersUseCase } from "../../../application/use-cases/list-users.use-case";
import type { ResetUserPasswordUseCase } from "../../../application/use-cases/reset-user-password.use-case";
import type { UpdateUserUseCase } from "../../../application/use-cases/update-user.use-case";
import {
  createUserSchema,
  listUsersQuerySchema,
  resetPasswordSchema,
  updateUserSchema,
  userIdParamsSchema,
} from "../validators/user.validator";

export class UserController {
  constructor(
    private readonly createUser: CreateUserUseCase,
    private readonly listUsers: ListUsersUseCase,
    private readonly getUser: GetUserUseCase,
    private readonly updateUser: UpdateUserUseCase,
    private readonly resetUserPassword: ResetUserPasswordUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createUserSchema.parse(req.body);
    const user = await this.createUser.execute(input);
    res.status(201).json({ user });
  };

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

  getById = async (req: Request, res: Response): Promise<void> => {
    const { id } = userIdParamsSchema.parse(req.params);
    const user = await this.getUser.execute(id);
    res.status(200).json({ user });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = userIdParamsSchema.parse(req.params);
    const input = updateUserSchema.parse(req.body);
    const user = await this.updateUser.execute(id, input);
    res.status(200).json({ user });
  };

  resetPassword = async (req: Request, res: Response): Promise<void> => {
    const { id } = userIdParamsSchema.parse(req.params);
    const input = resetPasswordSchema.parse(req.body);
    const user = await this.resetUserPassword.execute(id, input);
    res.set("Cache-Control", "no-store").status(200).json({ user });
  };
}
