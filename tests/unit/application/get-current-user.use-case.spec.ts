import { GetCurrentUserUseCase } from "../../../src/application/use-cases/get-current-user.use-case";
import { UnauthenticatedError } from "../../../src/domain/errors/auth-errors";
import { InMemoryUserRepository } from "../../support/in-memory-user.repository";

describe("GetCurrentUserUseCase", () => {
  const record = {
    email: "admin@medora.test",
    passwordHash: "hashed",
    firstName: "Ada",
    lastName: "Admin",
    role: "ADMIN" as const,
    isActive: true,
  };

  it("returns the safe projection of an active user", async () => {
    const users = new InMemoryUserRepository();
    const user = await users.create(record);

    const result = await new GetCurrentUserUseCase(users).execute(user.id);

    expect(result).toEqual({
      id: user.id,
      email: "admin@medora.test",
      firstName: "Ada",
      lastName: "Admin",
      role: "ADMIN",
    });
  });

  it("rejects an unknown user id", async () => {
    const useCase = new GetCurrentUserUseCase(new InMemoryUserRepository());

    await expect(useCase.execute("missing")).rejects.toBeInstanceOf(UnauthenticatedError);
  });

  it("rejects a deactivated user", async () => {
    const users = new InMemoryUserRepository();
    const user = await users.create({ ...record, isActive: false });

    await expect(new GetCurrentUserUseCase(users).execute(user.id)).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
