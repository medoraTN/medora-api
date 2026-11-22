import type { PasswordHasher } from "../../../src/application/ports/password-hasher";
import type { TokenService } from "../../../src/application/ports/token-service";
import { LoginUseCase } from "../../../src/application/use-cases/login.use-case";
import type { User } from "../../../src/domain/entities/user.entity";
import { InvalidCredentialsError } from "../../../src/domain/errors/auth-errors";
import { InMemoryUserRepository } from "../../support/in-memory-user.repository";

const PASSWORD = "correct horse battery staple";

function setup() {
  const users = new InMemoryUserRepository();
  const passwordHasher: PasswordHasher = {
    hash: async (plain) => `hashed:${plain}`,
    verify: jest.fn(async (plain: string, stored?: string | null) => stored === `hashed:${plain}`),
  };
  const tokens: TokenService = {
    issue: jest.fn(({ userId, role }) => `token:${userId}:${role}`),
    verify: jest.fn(() => null),
  };
  return { users, passwordHasher, tokens, useCase: new LoginUseCase(users, passwordHasher, tokens) };
}

function createUser(users: InMemoryUserRepository, overrides: Partial<User> = {}): Promise<User> {
  return users.create({
    email: "nurse@medora.test",
    passwordHash: `hashed:${PASSWORD}`,
    firstName: "Nora",
    lastName: "Nurse",
    role: "MEDICAL",
    isActive: true,
    ...overrides,
  });
}

describe("LoginUseCase", () => {
  it("returns a token carrying the user id and role, plus a safe user projection", async () => {
    const { users, tokens, useCase } = setup();
    const user = await createUser(users);

    const result = await useCase.execute({ email: "nurse@medora.test", password: PASSWORD });

    expect(tokens.issue).toHaveBeenCalledWith({ userId: user.id, role: "MEDICAL" });
    expect(result).toEqual({
      token: `token:${user.id}:MEDICAL`,
      user: { id: user.id, email: "nurse@medora.test", firstName: "Nora", lastName: "Nurse", role: "MEDICAL" },
    });
    expect(JSON.stringify(result)).not.toContain("hashed:");
  });

  it("normalises the email (case and surrounding spaces) before looking the user up", async () => {
    const { users, useCase } = setup();
    await createUser(users);

    await expect(useCase.execute({ email: "  Nurse@MEDORA.test ", password: PASSWORD })).resolves.toMatchObject({
      user: { email: "nurse@medora.test" },
    });
  });

  it("rejects an incorrect password without issuing a token", async () => {
    const { users, tokens, useCase } = setup();
    await createUser(users);

    await expect(useCase.execute({ email: "nurse@medora.test", password: "wrong" })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(tokens.issue).not.toHaveBeenCalled();
  });

  it("rejects an unknown email with the same error, and still runs a password verification", async () => {
    const { passwordHasher, tokens, useCase } = setup();

    await expect(useCase.execute({ email: "ghost@medora.test", password: PASSWORD })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(passwordHasher.verify).toHaveBeenCalledTimes(1);
    expect(tokens.issue).not.toHaveBeenCalled();
  });

  it("rejects a deactivated account even when the password is correct", async () => {
    const { users, tokens, useCase } = setup();
    await createUser(users, { isActive: false });

    await expect(useCase.execute({ email: "nurse@medora.test", password: PASSWORD })).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(tokens.issue).not.toHaveBeenCalled();
  });
});
