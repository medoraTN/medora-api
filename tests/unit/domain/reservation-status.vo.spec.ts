import { canTransitionReservationStatus, isTerminalReservationStatus } from "../../../src/domain/value-objects/reservation-status.vo";

describe("reservation status transitions", () => {
  it.each([
    ["PENDING", "CONFIRMED"],
    ["PENDING", "CANCELLED"],
    ["CONFIRMED", "CANCELLED"],
    ["CONFIRMED", "COMPLETED"],
  ] as const)("allows %s to %s", (from, to) => {
    expect(canTransitionReservationStatus(from, to)).toBe(true);
  });

  it.each([
    ["PENDING", "COMPLETED"],
    ["CANCELLED", "CONFIRMED"],
    ["COMPLETED", "CANCELLED"],
  ] as const)("rejects %s to %s", (from, to) => {
    expect(canTransitionReservationStatus(from, to)).toBe(false);
  });

  it.each(["CANCELLED", "COMPLETED"] as const)("treats %s as terminal", (status) => {
    expect(isTerminalReservationStatus(status)).toBe(true);
  });
});
