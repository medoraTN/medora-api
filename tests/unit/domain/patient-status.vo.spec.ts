import { allowedPatientStatusTransitions, canTransitionPatientStatus } from "../../../src/domain/value-objects/patient-status.vo";
import type { PatientStatus } from "../../../src/domain/entities/patient.entity";

describe("patient status transitions", () => {
  it.each([
    ["WAITING", "IN_PROGRESS"],
    ["WAITING", "TRANSFERRED"],
    ["WAITING", "CANCELLED"],
    ["IN_PROGRESS", "IN_EXAMINATION"],
    ["IN_PROGRESS", "WAITING_RESULT"],
    ["IN_EXAMINATION", "IN_PROGRESS"],
    ["WAITING_RESULT", "READY_FOR_DISCHARGE"],
    ["READY_FOR_DISCHARGE", "DISCHARGED"],
  ] as const)("allows %s → %s", (from, to) => {
    expect(canTransitionPatientStatus(from, to)).toBe(true);
  });

  it.each([
    ["WAITING", "DISCHARGED"],
    ["IN_PROGRESS", "WAITING"],
    ["DISCHARGED", "WAITING"],
    ["TRANSFERRED", "IN_PROGRESS"],
    ["CANCELLED", "IN_PROGRESS"],
  ] as const)("rejects %s → %s", (from, to) => {
    expect(canTransitionPatientStatus(from, to)).toBe(false);
  });

  it.each(["DISCHARGED", "TRANSFERRED", "CANCELLED"] as const)("treats %s as terminal", (status) => {
    expect(allowedPatientStatusTransitions(status)).toEqual([]);
  });

  it("defines transitions for every supported status", () => {
    const statuses: PatientStatus[] = [
      "WAITING", "IN_PROGRESS", "IN_EXAMINATION", "WAITING_RESULT",
      "READY_FOR_DISCHARGE", "DISCHARGED", "TRANSFERRED", "CANCELLED",
    ];
    for (const status of statuses) expect(allowedPatientStatusTransitions(status)).toBeDefined();
  });
});
