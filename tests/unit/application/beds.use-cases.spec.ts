import { AssignBedUseCase } from "../../../src/application/use-cases/assign-bed.use-case";
import { CreateBedUseCase } from "../../../src/application/use-cases/create-bed.use-case";
import { CreateUnitUseCase } from "../../../src/application/use-cases/create-unit.use-case";
import { ReleaseBedUseCase } from "../../../src/application/use-cases/release-bed.use-case";
import { TransferBedUseCase } from "../../../src/application/use-cases/transfer-bed.use-case";
import { UpdateBedStatusUseCase } from "../../../src/application/use-cases/update-bed-status.use-case";
import { InMemoryBedRepository } from "../../support/in-memory-bed.repository";
import { InMemoryPatientRepository } from "../../support/in-memory-patient.repository";
import { InMemoryUnitRepository } from "../../support/in-memory-unit.repository";

describe("bed management use cases", () => {
  const actorId = "actor-1";
  let units: InMemoryUnitRepository;
  let beds: InMemoryBedRepository;
  let patients: InMemoryPatientRepository;

  beforeEach(() => {
    units = new InMemoryUnitRepository();
    beds = new InMemoryBedRepository(units.records);
    patients = new InMemoryPatientRepository();
  });

  async function seedUnitAndBeds() {
    const unit = await new CreateUnitUseCase(units).execute({ name: "Urgence A", kind: "EMERGENCY" });
    const createBed = new CreateBedUseCase(beds, units);
    const bedA = await createBed.execute({ unitId: unit.id, code: "U-01", type: "STANDARD" });
    const bedB = await createBed.execute({ unitId: unit.id, code: "U-02", type: "MONITORING" });
    const patient = await patients.create({
      recordNumber: "D-BED-1",
      firstName: "Alex",
      lastName: "Patient",
      dateOfBirth: new Date("1990-01-01"),
      sex: "UNKNOWN",
      phone: "+33100000001",
      address: null,
      arrivalReason: "Test",
      urgencyLevel: 2,
      status: "WAITING",
      internalNotes: null,
    });
    return { unit, bedA, bedB, patient };
  }

  it("creates emergency/or/icu units and beds attached to a unit", async () => {
    const emergency = await new CreateUnitUseCase(units).execute({ name: "Urgence", kind: "EMERGENCY" });
    const or = await new CreateUnitUseCase(units).execute({ name: "Bloc 1", kind: "OR" });
    const icu = await new CreateUnitUseCase(units).execute({ name: "ICU 1", kind: "ICU" });
    expect([emergency.kind, or.kind, icu.kind]).toEqual(["EMERGENCY", "OR", "ICU"]);

    const bed = await new CreateBedUseCase(beds, units).execute({
      unitId: emergency.id,
      code: "u-01",
      type: "STANDARD",
    });
    expect(bed).toMatchObject({ unitId: emergency.id, code: "U-01", status: "FREE", type: "STANDARD" });
  });

  it("assigns a free bed, blocks occupied reassignment, transfers and releases with history", async () => {
    const { bedA, bedB, patient } = await seedUnitAndBeds();
    const assign = new AssignBedUseCase(beds, patients);
    const transfer = new TransferBedUseCase(beds);
    const release = new ReleaseBedUseCase(beds);

    const occupied = await assign.execute(bedA.id, patient.id, actorId);
    expect(occupied).toMatchObject({ status: "OCCUPIED", currentPatientId: patient.id });

    await expect(assign.execute(bedA.id, patient.id, actorId)).rejects.toMatchObject({
      code: "BED_NOT_AVAILABLE",
    });

    const otherPatient = await patients.create({
      recordNumber: "D-BED-2",
      firstName: "Sam",
      lastName: "Other",
      dateOfBirth: new Date("1991-01-01"),
      sex: "UNKNOWN",
      phone: "+33100000002",
      address: null,
      arrivalReason: "Test",
      urgencyLevel: 1,
      status: "WAITING",
      internalNotes: null,
    });
    await expect(assign.execute(bedA.id, otherPatient.id, actorId)).rejects.toMatchObject({
      code: "BED_NOT_AVAILABLE",
    });

    const moved = await transfer.execute(bedA.id, bedB.id, actorId);
    expect(moved.from).toMatchObject({ id: bedA.id, status: "FREE", currentPatientId: null });
    expect(moved.to).toMatchObject({ id: bedB.id, status: "OCCUPIED", currentPatientId: patient.id });

    const freed = await release.execute(bedB.id, actorId);
    expect(freed).toMatchObject({ status: "FREE", currentPatientId: null });

    const history = await beds.listHistory(bedB.id);
    expect(history.map((entry) => entry.event)).toEqual(expect.arrayContaining(["TRANSFERRED", "RELEASED"]));
  });

  it("rejects invalid manual status transitions on occupied beds", async () => {
    const { bedA, patient } = await seedUnitAndBeds();
    await new AssignBedUseCase(beds, patients).execute(bedA.id, patient.id, actorId);
    await expect(new UpdateBedStatusUseCase(beds).execute(bedA.id, "MAINTENANCE")).rejects.toMatchObject({
      code: "INVALID_BED_STATUS_TRANSITION",
    });

    await new ReleaseBedUseCase(beds).execute(bedA.id, actorId);
    const cleaning = await new UpdateBedStatusUseCase(beds).execute(bedA.id, "CLEANING");
    expect(cleaning.status).toBe("CLEANING");
  });
});
