import { canTransitionReservationStatus } from "../../../src/domain/value-objects/reservation-status.vo";

describe("canTransitionReservationStatus", () => {
  it.each([
    ["PENDING", "CONFIRMED"],
    ["CONFIRMED", "PENDING"],
    ["PENDING", "CANCELLED"],
    ["CONFIRMED", "CANCELLED"],
  ] as const)("allows %s → %s", (from, to) => {
    expect(canTransitionReservationStatus(from, to)).toBe(true);
  });

  it.each([
    ["CANCELLED", "PENDING"],
    ["CANCELLED", "CONFIRMED"],
    ["CANCELLED", "CANCELLED"],
    ["PENDING", "PENDING"],
  ] as const)("rejects %s → %s", (from, to) => {
    expect(canTransitionReservationStatus(from, to)).toBe(false);
  });
});
