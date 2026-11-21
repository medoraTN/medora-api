import { authUseCases } from '../../../src/application/auth';
import { jwtService } from '../../../src/infrastructure/auth/jwt.service';
import { hashPassword, verifyPassword } from '../../../src/infrastructure/auth/password.service';

it('hashes credentials, issues a verifiable JWT and rejects inactive users', async () => {
  const active = {
    id: 'actor-id', email: 'test@example.invalid', role: 'MEDICAL' as const, active: true,
    passwordHash: await hashPassword('fictional password'),
  };
  const users = {
    findByEmail: jest.fn().mockResolvedValue(active),
    findActiveActor: jest.fn().mockResolvedValue({ id: active.id, role: active.role }),
  };
  const auth = authUseCases(users, verifyPassword, jwtService('only-a-test-secret-at-least-32-bytes'));

  expect(active.passwordHash).not.toContain('fictional password');
  const session = await auth.login(active.email, 'fictional password');
  expect(session.user).toEqual({ id: active.id, role: active.role });
  await expect(auth.authenticate(session.token)).resolves.toEqual(session.user);
  await expect(auth.authenticate(session.token + 'invalid')).resolves.toBeNull();
  await expect(auth.login(active.email, 'incorrect')).rejects.toMatchObject({ code: 'INVALID_LOGIN' });
  users.findByEmail.mockResolvedValueOnce({ ...active, active: false });
  await expect(auth.login(active.email, 'fictional password')).rejects.toMatchObject({ code: 'INVALID_LOGIN' });
});
