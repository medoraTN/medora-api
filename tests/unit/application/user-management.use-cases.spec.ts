import { randomUUID } from "node:crypto";
import { CreateUserUseCase } from "../../../src/application/use-cases/create-user.use-case";
import { ResetUserPasswordUseCase } from "../../../src/application/use-cases/reset-user-password.use-case";
import { SetUserActiveUseCase } from "../../../src/application/use-cases/set-user-active.use-case";
import { UpdateUserRoleUseCase } from "../../../src/application/use-cases/update-user-role.use-case";
import { InMemoryUserRepository } from "../../support/in-memory-user.repository";
import { ScryptPasswordHasher } from "../../../src/infrastructure/auth/password.service";

describe("user management use cases", () => {
  let users: InMemoryUserRepository;
  let hasher: ScryptPasswordHasher;
  let adminId: string;

  beforeEach(async () => {
    users = new InMemoryUserRepository();
    hasher = new ScryptPasswordHasher();
    const admin = await users.create({
      email: `admin-${randomUUID()}@test.local`,
      passwordHash: await hasher.hash("initial-password"),
      firstName: "Admin",
      lastName: "User",
      role: "ADMIN",
      isActive: true,
    });
    adminId = admin.id;
    await users.create({
      email: `other-admin-${randomUUID()}@test.local`,
      passwordHash: "test-hash",
      firstName: "Other",
      lastName: "Admin",
      role: "ADMIN",
      isActive: true,
    });
  });

  it("normalizes email, hashes passwords, defaults active, and records creation", async () => {
    const created = await new CreateUserUseCase(users, hasher).execute({
      email: "  New.User@Example.test ",
      firstName: "New",
      lastName: "User",
      role: "MEDICAL",
      password: "plain-password",
    }, adminId);
    const stored = await users.findByEmail("new.user@example.test");
    expect(created).toMatchObject({ email: "new.user@example.test", isActive: true, role: "MEDICAL" });
    expect("passwordHash" in created).toBe(false);
    expect(stored?.passwordHash).not.toBe("plain-password");
    expect(await hasher.verify("plain-password", stored?.passwordHash)).toBe(true);
    expect(users.auditEntries().at(-1)).toMatchObject({ action: "USER_CREATED", actorUserId: adminId, targetUserId: created.id });
  });

  it("rejects duplicate emails case-insensitively", async () => {
    const existing = await users.findById(adminId);
    await expect(new CreateUserUseCase(users, hasher).execute({
      email: existing!.email.toUpperCase(),
      firstName: "Dupe",
      lastName: "User",
      role: "MEDICAL",
      password: "password",
    }, adminId)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("updates roles and activation with audit events and protects self", async () => {
    const target = await users.create({
      email: `staff-${randomUUID()}@test.local`, passwordHash: "hash", firstName: "Staff", lastName: "User",
      role: "MEDICAL", isActive: true,
    });
    const updated = await new UpdateUserRoleUseCase(users).execute(target.id, "SUPERVISOR", adminId);
    expect(updated.role).toBe("SUPERVISOR");
    const deactivated = await new SetUserActiveUseCase(users).execute(target.id, false, adminId);
    expect(deactivated.isActive).toBe(false);
    expect(users.auditEntries().map((entry) => entry.action)).toEqual(expect.arrayContaining([
      "USER_ROLE_CHANGED", "USER_DEACTIVATED",
    ]));

    await expect(new UpdateUserRoleUseCase(users).execute(adminId, "MEDICAL", adminId))
      .rejects.toMatchObject({ code: "SELF_MODIFICATION_FORBIDDEN" });
    await expect(new SetUserActiveUseCase(users).execute(adminId, false, adminId))
      .rejects.toMatchObject({ code: "SELF_MODIFICATION_FORBIDDEN" });
  });

  it("prevents removal of the last active admin", async () => {
    const otherAdmin = (await users.listUsers({ page: 1, pageSize: 10, role: "ADMIN" })).items
      .find((user) => user.id !== adminId)!;
    await users.setActive(otherAdmin.id, false, adminId);
    await expect(users.updateRole(adminId, "MEDICAL", "another-actor"))
      .rejects.toMatchObject({ code: "LAST_ADMIN_REQUIRED" });
  });

  it("hashes admin password resets and journals only the action", async () => {
    await new ResetUserPasswordUseCase(users, hasher).execute(adminId, "reset-password", adminId);
    const updated = await users.findById(adminId);
    expect(await hasher.verify("reset-password", updated?.passwordHash)).toBe(true);
    const event = users.auditEntries().at(-1);
    expect(event).toMatchObject({ action: "USER_PASSWORD_RESET", actorUserId: adminId, targetUserId: adminId });
    expect(JSON.stringify(event)).not.toContain("reset-password");
  });
});
