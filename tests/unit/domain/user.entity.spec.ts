import { isUserRole, USER_ROLES } from "../../../src/domain/entities/user.entity";

describe("user roles", () => {
  it("manages exactly the four roles of the product contract", () => {
    expect([...USER_ROLES].sort()).toEqual(["ADMIN", "ADMIN_STAFF", "MEDICAL", "SUPERVISOR"]);
  });

  it.each(USER_ROLES)("recognises %s as a role", (role) => {
    expect(isUserRole(role)).toBe(true);
  });

  it.each(["", "admin", "MEDICAL_STAFF", "EMERGENCY_SUPERVISOR", "ROOT", 42, null, undefined, {}])(
    "rejects %p as a role",
    (value) => {
      expect(isUserRole(value)).toBe(false);
    },
  );
});
