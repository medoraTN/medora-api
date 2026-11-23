import type { Request, Response } from "express";
import type { CancelReservationUseCase } from "../../../application/use-cases/cancel-reservation.use-case";
import type { CreateReservationUseCase } from "../../../application/use-cases/create-reservation.use-case";
import type { ListReservationsUseCase } from "../../../application/use-cases/list-reservations.use-case";
import type { UpdateReservationUseCase } from "../../../application/use-cases/update-reservation.use-case";
import type { UpdateReservationRecord } from "../../../domain/repositories/reservation.repository";
import {
  createReservationSchema,
  listReservationsQuerySchema,
  reservationIdParamsSchema,
  updateReservationSchema,
} from "../validators/reservation.validator";

export class ReservationController {
  constructor(
    private readonly createReservation: CreateReservationUseCase,
    private readonly listReservations: ListReservationsUseCase,
    private readonly updateReservation: UpdateReservationUseCase,
    private readonly cancelReservation: CancelReservationUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createReservationSchema.parse(req.body);
    const reservation = await this.createReservation.execute(input);
    res.status(201).json({ reservation });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listReservationsQuerySchema.parse(req.query);
    const items = await this.listReservations.execute(query);
    res.status(200).json({ items });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = reservationIdParamsSchema.parse(req.params);
    const update = updateReservationSchema.parse(req.body);
    const cleanUpdate = Object.fromEntries(
      Object.entries(update).filter(([, value]) => value !== undefined),
    ) as typeof update;
    const reservation = await this.updateReservation.execute(id, cleanUpdate as UpdateReservationRecord);
    res.status(200).json({ reservation });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const { id } = reservationIdParamsSchema.parse(req.params);
    const reservation = await this.cancelReservation.execute(id);
    res.status(200).json({ reservation });
  };
}
