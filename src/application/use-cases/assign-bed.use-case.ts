import { ConflictError } from "../../domain/errors/conflict-error";
import { NotFoundError } from "../../domain/errors/not-found-error";
import { canAssignToBedStatus } from "../../domain/value-objects/bed-status.vo";
import type { BedRepository } from "../../domain/repositories/bed.repository";
import type { PatientRepository } from "../../domain/repositories/patient.repository";

export class AssignBedUseCase {
  constructor(
    private readonly beds: BedRepository,
    private readonly patients: PatientRepository,
  ) {}

  async execute(bedId: string, patientId: string, actorUserId: string) {
    const bed = await this.beds.findById(bedId);
    if (!bed) throw new NotFoundError("Lit");
    if (!canAssignToBedStatus(bed.status) || bed.currentPatientId) {
      throw new ConflictError("Ce lit n’est pas disponible pour une attribution.", "BED_NOT_AVAILABLE");
    }
    if (!(await this.patients.findById(patientId))) throw new NotFoundError("Patient");

    const occupied = await this.beds.findByPatientId(patientId);
    if (occupied) {
      throw new ConflictError(
        "Ce patient occupe déjà un lit. Utilisez un transfert.",
        "PATIENT_ALREADY_ASSIGNED",
      );
    }

    return this.beds.assignPatient(bedId, patientId, actorUserId);
  }
}
