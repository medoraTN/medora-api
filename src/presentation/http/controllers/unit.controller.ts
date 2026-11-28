import type { Request, Response } from "express";
import type { CreateUnitUseCase } from "../../../application/use-cases/create-unit.use-case";
import type { ListUnitsUseCase } from "../../../application/use-cases/list-units.use-case";
import { createUnitSchema, listUnitsQuerySchema } from "../validators/unit.validator";

export class UnitController {
  constructor(
    private readonly createUnit: CreateUnitUseCase,
    private readonly listUnits: ListUnitsUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createUnitSchema.parse(req.body);
    const unit = await this.createUnit.execute(input);
    res.status(201).json({ unit });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listUnitsQuerySchema.parse(req.query);
    const items = await this.listUnits.execute(query.kind);
    res.status(200).json({ items });
  };
}
