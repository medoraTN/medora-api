import type { Request, Response } from "express";
import type { AssignBedUseCase } from "../../../application/use-cases/assign-bed.use-case";
import type { CreateBedUseCase } from "../../../application/use-cases/create-bed.use-case";
import type { ListBedHistoryUseCase } from "../../../application/use-cases/list-bed-history.use-case";
import type { ListBedsUseCase } from "../../../application/use-cases/list-beds.use-case";
import type { ReleaseBedUseCase } from "../../../application/use-cases/release-bed.use-case";
import type { TransferBedUseCase } from "../../../application/use-cases/transfer-bed.use-case";
import type { UpdateBedStatusUseCase } from "../../../application/use-cases/update-bed-status.use-case";
import { UnauthenticatedError } from "../../../domain/errors/auth-errors";
import {
  assignBedSchema,
  bedIdParamsSchema,
  createBedSchema,
  listBedsQuerySchema,
  transferBedSchema,
  updateBedStatusSchema,
} from "../validators/bed.validator";

export class BedController {
  constructor(
    private readonly createBed: CreateBedUseCase,
    private readonly listBeds: ListBedsUseCase,
    private readonly assignBed: AssignBedUseCase,
    private readonly transferBed: TransferBedUseCase,
    private readonly releaseBed: ReleaseBedUseCase,
    private readonly updateBedStatus: UpdateBedStatusUseCase,
    private readonly listBedHistory: ListBedHistoryUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createBedSchema.parse(req.body);
    const bed = await this.createBed.execute(input);
    res.status(201).json({ bed });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const parsed = listBedsQuerySchema.parse(req.query);
    const items = await this.listBeds.execute({
      ...(parsed.unitId !== undefined ? { unitId: parsed.unitId } : {}),
      ...(parsed.status !== undefined ? { status: parsed.status } : {}),
      ...(parsed.unitKind !== undefined ? { unitKind: parsed.unitKind } : {}),
    });
    res.status(200).json({ items });
  };

  assign = async (req: Request, res: Response): Promise<void> => {
    const { id } = bedIdParamsSchema.parse(req.params);
    const { patientId } = assignBedSchema.parse(req.body);
    const bed = await this.assignBed.execute(id, patientId, this.actorId(req));
    res.status(200).json({ bed });
  };

  transfer = async (req: Request, res: Response): Promise<void> => {
    const { id } = bedIdParamsSchema.parse(req.params);
    const { toBedId } = transferBedSchema.parse(req.body);
    const result = await this.transferBed.execute(id, toBedId, this.actorId(req));
    res.status(200).json(result);
  };

  release = async (req: Request, res: Response): Promise<void> => {
    const { id } = bedIdParamsSchema.parse(req.params);
    const bed = await this.releaseBed.execute(id, this.actorId(req));
    res.status(200).json({ bed });
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = bedIdParamsSchema.parse(req.params);
    const { status } = updateBedStatusSchema.parse(req.body);
    const bed = await this.updateBedStatus.execute(id, status);
    res.status(200).json({ bed });
  };

  history = async (req: Request, res: Response): Promise<void> => {
    const { id } = bedIdParamsSchema.parse(req.params);
    const items = await this.listBedHistory.execute(id);
    res.status(200).json({ items });
  };

  private actorId(req: Request): string {
    if (!req.auth) throw new UnauthenticatedError();
    return req.auth.userId;
  }
}
