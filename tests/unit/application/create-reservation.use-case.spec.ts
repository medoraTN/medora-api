import { CreateReservationUseCase } from "../../../src/application/use-cases/create-reservation.use-case";
import { NotFoundError } from "../../../src/domain/errors/not-found-error";
import { InMemoryPatientRepository } from "../../support/in-memory-patient.repository";
import { InMemoryReservationRepository } from "../../support/in-memory-reservation.repository";

describe("CreateReservationUseCase", () => {
  const patients = new InMemoryPatientRepository();
  const reservations = new InMemoryReservationRepository();
  const useCase = new CreateReservationUseCase(reservations, patients);

  it("creates a pending reservation for an existing patient", async () => {
    const patient = await patients.create({
      recordNumber: "R-1",
      firstName: "Alex",
      lastName: "Patient",
      dateOfBirth: new Date("1990-01-01"),
      sex: "UNKNOWN",
      phone: "+33111111111",
      address: null,
      arrivalReason: "Pain",
      urgencyLevel: 2,
      status: "WAITING",
      internalNotes: null,
    });

    const reservation = await useCase.execute({
      patientId: patient.id,
      service: "Radiologie",
      practitioner: "Dr. Dupont",
      examination: "Radio thorax",
      scheduledAt: "2026-11-23T10:00:00.000Z",
      durationMinutes: 30,
    });

    expect(reservation).toMatchObject({
      patientId: patient.id,
      service: "Radiologie",
      practitioner: "Dr. Dupont",
      examination: "Radio thorax",
      durationMinutes: 30,
      status: "PENDING",
    });
  });

  it("rejects an unknown patient", async () => {
    await expect(
      useCase.execute({
        patientId: "missing",
        service: "Consult",
        scheduledAt: "2026-11-23T10:00:00.000Z",
        durationMinutes: 15,
      }),
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});
