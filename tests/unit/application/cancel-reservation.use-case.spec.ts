import { CancelReservationUseCase } from "../../../src/application/use-cases/cancel-reservation.use-case";
import { InvalidReservationStatusTransitionError } from "../../../src/domain/errors/invalid-reservation-status-transition-error";
import { NotFoundError } from "../../../src/domain/errors/not-found-error";
import { InMemoryReservationRepository } from "../../support/in-memory-reservation.repository";

describe("CancelReservationUseCase", () => {
  it("cancels a pending reservation", async () => {
    const reservations = new InMemoryReservationRepository();
    const created = await reservations.create({
      patientId: "p1",
      service: "Consult",
      practitioner: null,
      examination: null,
      scheduledAt: new Date("2026-11-23T10:00:00.000Z"),
      durationMinutes: 20,
      status: "PENDING",
    });

    const cancelled = await new CancelReservationUseCase(reservations).execute(created.id);
    expect(cancelled.status).toBe("CANCELLED");
  });

  it("rejects cancelling an already cancelled reservation", async () => {
    const reservations = new InMemoryReservationRepository();
    const created = await reservations.create({
      patientId: "p1",
      service: "Consult",
      practitioner: null,
      examination: null,
      scheduledAt: new Date("2026-11-23T10:00:00.000Z"),
      durationMinutes: 20,
      status: "CANCELLED",
    });

    await expect(new CancelReservationUseCase(reservations).execute(created.id)).rejects.toBeInstanceOf(
      InvalidReservationStatusTransitionError,
    );
  });

  it("rejects an unknown reservation", async () => {
    await expect(new CancelReservationUseCase(new InMemoryReservationRepository()).execute("missing")).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });
});
