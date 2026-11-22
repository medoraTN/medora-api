import type { Patient } from "../../../src/domain/entities/patient.entity";
import type { PatientRepository } from "../../../src/domain/repositories/patient.repository";
import { CreatePatientUseCase } from "../../../src/application/use-cases/create-patient.use-case";
import { GetPatientUseCase } from "../../../src/application/use-cases/get-patient.use-case";
import { ListPatientsUseCase } from "../../../src/application/use-cases/list-patients.use-case";

const patient: Patient = {
  id: "patient-1",
  recordNumber: "ER-100",
  firstName: "Mina",
  lastName: "Test",
  dateOfBirth: new Date("1990-01-10T00:00:00.000Z"),
  sex: "UNKNOWN",
  phone: "+15551234567",
  address: null,
  arrivalReason: "Fever",
  urgencyLevel: 2,
  status: "WAITING",
  internalNotes: null,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
};

describe("patient use cases", () => {
  it("normalizes create input and supplies the initial status and defaults", async () => {
    const repository = { create: jest.fn().mockResolvedValue(patient) } as unknown as PatientRepository;
    const useCase = new CreatePatientUseCase(repository);

    await useCase.execute({
      recordNumber: " ER-100 ",
      firstName: " Mina ",
      lastName: " Test ",
      dateOfBirth: "1990-01-10",
      phone: " +15551234567 ",
      arrivalReason: " Fever ",
      urgencyLevel: 2,
    });

    expect(repository.create).toHaveBeenCalledWith({
      recordNumber: "ER-100",
      firstName: "Mina",
      lastName: "Test",
      dateOfBirth: new Date("1990-01-10"),
      sex: "UNKNOWN",
      phone: "+15551234567",
      address: null,
      arrivalReason: "Fever",
      urgencyLevel: 2,
      status: "WAITING",
      internalNotes: null,
    });
  });

  it("passes paging, status, and trimmed search filters to the repository", async () => {
    const page = { items: [patient], page: 2, pageSize: 5, total: 6, totalPages: 2 };
    const repository = { list: jest.fn().mockResolvedValue(page) } as unknown as PatientRepository;
    const useCase = new ListPatientsUseCase(repository);

    await expect(useCase.execute({ page: 2, pageSize: 5, search: " Mina ", status: "WAITING" })).resolves.toEqual(page);
    expect(repository.list).toHaveBeenCalledWith({ page: 2, pageSize: 5, search: "Mina", status: "WAITING" });
  });

  it("returns the patient or raises the MED-3 not-found domain error", async () => {
    const repository = { findById: jest.fn().mockResolvedValueOnce(patient).mockResolvedValueOnce(null) } as unknown as PatientRepository;
    const useCase = new GetPatientUseCase(repository);

    await expect(useCase.execute(patient.id)).resolves.toEqual(patient);
    await expect(useCase.execute("missing")).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Patient introuvable.",
    });
  });
});
