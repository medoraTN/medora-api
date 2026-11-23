import { randomUUID } from "node:crypto";
import { CancelReservationUseCase } from "../../../src/application/use-cases/cancel-reservation.use-case";
import { CreateReservationUseCase } from "../../../src/application/use-cases/create-reservation.use-case";
import { UpdateReservationUseCase } from "../../../src/application/use-cases/update-reservation.use-case";
import { InMemoryPatientRepository } from "../../support/in-memory-patient.repository";
import { InMemoryReservationRepository } from "../../support/in-memory-reservation.repository";

const now = new Date("2030-01-01T10:00:00.000Z");
const future = new Date("2030-01-02T10:00:00.000Z");

function createPatientInput() {
  return {
    recordNumber: `RES-${randomUUID()}`,
    firstName: "Jamie", lastName: "Test", dateOfBirth: new Date("1990-01-01T00:00:00.000Z"),
    sex: "UNKNOWN" as const, phone: `+1555${Math.floor(Math.random() * 1e9)}`,
    address: null, arrivalReason: "Test", urgencyLevel: 2, status: "WAITING" as const, internalNotes: null,
  };
}

describe("reservation use cases", () => {
  let patients: InMemoryPatientRepository;
  let reservations: InMemoryReservationRepository;

  beforeEach(() => {
    patients = new InMemoryPatientRepository();
    reservations = new InMemoryReservationRepository();
  });

  it("creates a PENDING reservation for an existing patient", async () => {
    const patient = await patients.create(createPatientInput());
    const useCase = new CreateReservationUseCase(reservations, patients, () => now);

    const created = await useCase.execute({ patientId: patient.id, service: "Imaging", scheduledAt: future, durationMinutes: 30 });

    expect(created).toMatchObject({ patientId: patient.id, service: "Imaging", status: "PENDING", durationMinutes: 30 });
  });

  it("rejects a past schedule and an unknown patient", async () => {
    const useCase = new CreateReservationUseCase(reservations, patients, () => now);
    await expect(useCase.execute({ patientId: "missing", service: "Imaging", scheduledAt: future, durationMinutes: 30 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
    const patient = await patients.create(createPatientInput());
    await expect(useCase.execute({ patientId: patient.id, service: "Imaging", scheduledAt: now, durationMinutes: 30 }))
      .rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("allows confirmation then completion and rejects terminal edits", async () => {
    const patient = await patients.create(createPatientInput());
    const created = await new CreateReservationUseCase(reservations, patients, () => now)
      .execute({ patientId: patient.id, service: "Imaging", scheduledAt: future, durationMinutes: 30 });
    const update = new UpdateReservationUseCase(reservations, () => now);
    await update.execute(created.id, { status: "CONFIRMED" });
    const completed = await update.execute(created.id, { status: "COMPLETED" });
    expect(completed.status).toBe("COMPLETED");
    await expect(update.execute(created.id, { service: "Changed" })).rejects.toMatchObject({
      code: "INVALID_RESERVATION_TRANSITION",
    });
  });

  it("cancels pending reservations idempotently and rejects cancelling completed ones", async () => {
    const patient = await patients.create(createPatientInput());
    const created = await new CreateReservationUseCase(reservations, patients, () => now)
      .execute({ patientId: patient.id, service: "Imaging", scheduledAt: future, durationMinutes: 30 });
    const cancel = new CancelReservationUseCase(reservations);
    expect((await cancel.execute(created.id)).status).toBe("CANCELLED");
    expect((await cancel.execute(created.id)).status).toBe("CANCELLED");

    const completed = await new CreateReservationUseCase(reservations, patients, () => now)
      .execute({ patientId: patient.id, service: "Lab", scheduledAt: future, durationMinutes: 15 });
    await reservations.update(completed.id, { status: "CONFIRMED" });
    await reservations.update(completed.id, { status: "COMPLETED" });
    await expect(cancel.execute(completed.id)).rejects.toMatchObject({ code: "INVALID_RESERVATION_TRANSITION" });
  });
});
