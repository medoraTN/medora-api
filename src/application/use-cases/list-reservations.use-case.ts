import type {
  ReservationListQuery,
  ReservationPage,
  ReservationRepository,
} from "../../domain/repositories/reservation.repository";
import type { ListReservationsDto } from "../dto/create-reservation.dto";

export class ListReservationsUseCase {
  constructor(private readonly reservations: ReservationRepository) {}

  execute(query: ListReservationsDto): Promise<ReservationPage> {
    const filters: ReservationListQuery = {
      page: query.page,
      pageSize: query.pageSize,
      patientId: query.patientId,
      status: query.status,
      from: query.from ? new Date(query.from) : undefined,
      to: query.to ? new Date(query.to) : undefined,
    };
    return this.reservations.list(filters);
  }
}
