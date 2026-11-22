import { CreateUserUseCase } from "../../../src/application/use-cases/create-user.use-case";
import { ConflictError } from "../../../src/domain/errors/conflict-error";
import { ScryptPasswordHasher } from "../../../src/infrastructure/auth/password.service";
import { InMemoryUserRepository } from "../../support/in-memory-user.repository";

describe("CreateUserUseCase", () => {
  it("creates an active user with a hashed password and never returns the hash", async () => {
    const users = new InMemoryUserRepository();
    const hasher = new ScryptPasswordHasher();
    const useCase = new CreateUserUseCase(users, hasher);

    const user = await useCase.execute({
      email: "  Nurse@Medora.TEST ",
      password: "SecretPass1",
      firstName: "Nora",
      lastName: "Nurse",
      role: "MEDICAL",
    });

    expect(user).toMatchObject({
      email: "nurse@medora.test",
      firstName: "Nora",
      lastName: "Nurse",
      role: "MEDICAL",
      isActive: true,
    });
    expect(JSON.stringify(user)).not.toMatch(/password|scrypt\$/i);

    const stored = await users.findByEmail("nurse@medora.test");
    expect(stored?.passwordHash).toMatch(/^scrypt\$/);
    expect(stored?.passwordHash).not.toContain("SecretPass1");
    await expect(hasher.verify("SecretPass1", stored?.passwordHash)).resolves.toBe(true);
  });

  it("rejects a duplicate email", async () => {
    const users = new InMemoryUserRepository();
    const useCase = new CreateUserUseCase(users, new ScryptPasswordHasher());
    const input = {
      email: "admin@medora.test",
      password: "SecretPass1",
      firstName: "Ada",
      lastName: "Admin",
      role: "ADMIN" as const,
    };
    await useCase.execute(input);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(ConflictError);
  });
});
