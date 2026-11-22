import type { Request, Response } from "express";
import type { CancelReservationUseCase } from "../../../application/use-cases/cancel-reservation.use-case";
import type { CreateReservationUseCase } from "../../../application/use-cases/create-reservation.use-case";
import type { GetReservationUseCase } from "../../../application/use-cases/get-reservation.use-case";
import type { ListReservationsUseCase } from "../../../application/use-cases/list-reservations.use-case";
import type { UpdateReservationUseCase } from "../../../application/use-cases/update-reservation.use-case";
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
    private readonly getReservation: GetReservationUseCase,
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
    const result = await this.listReservations.execute(query);
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
    const { id } = reservationIdParamsSchema.parse(req.params);
    const reservation = await this.getReservation.execute(id);
    res.status(200).json({ reservation });
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const { id } = reservationIdParamsSchema.parse(req.params);
    const input = updateReservationSchema.parse(req.body);
    const reservation = await this.updateReservation.execute(id, input);
    res.status(200).json({ reservation });
  };

  cancel = async (req: Request, res: Response): Promise<void> => {
    const { id } = reservationIdParamsSchema.parse(req.params);
    const reservation = await this.cancelReservation.execute(id);
    res.status(200).json({ reservation });
  };
}
