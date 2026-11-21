import { randomUUID } from 'node:crypto';
import request from 'supertest';
import { createApp } from '../../src/app';
import { authUseCases } from '../../src/application/auth';
import { patientUseCases } from '../../src/application/patients';
import { jwtService } from '../../src/infrastructure/auth/jwt.service';
import { hashPassword, verifyPassword } from '../../src/infrastructure/auth/password.service';
import { PrismaPatientRepository } from '../../src/infrastructure/database/repositories/prisma-patient.repository';
import { PrismaUserRepository } from '../../src/infrastructure/database/repositories/prisma-user.repository';
import { patientInput, testDatabase } from '../support/database';

const db = testDatabase();
const auth = authUseCases(new PrismaUserRepository(db), verifyPassword, jwtService('only-a-test-secret-at-least-32-bytes'));
const app = createApp(auth, patientUseCases(new PrismaPatientRepository(db)));
const prefix = randomUUID();
const medicalEmail = `medical-${prefix}@example.invalid`;
const staffEmail = `staff-${prefix}@example.invalid`;
const supervisorEmail = `supervisor-${prefix}@example.invalid`;
const password = 'fictional local test password';
const emails = [medicalEmail, staffEmail, supervisorEmail];
let patientId: string | undefined;

beforeAll(async () => {
  const passwordHash = await hashPassword(password);
  await db.user.createMany({ data: [
    { email: medicalEmail, passwordHash, role: 'MEDICAL' },
    { email: staffEmail, passwordHash, role: 'ADMIN_STAFF' },
    { email: supervisorEmail, passwordHash, role: 'SUPERVISOR' },
  ] });
});

afterAll(async () => {
  if (patientId) {
    await db.patientStatusChange.deleteMany({ where: { patientId } });
    await db.patient.deleteMany({ where: { id: patientId } });
  }
  await db.user.deleteMany({ where: { email: { in: emails } } });
  await db.$disconnect();
});

async function login(email: string) {
  const response = await request(app).post('/api/auth/login').send({ email, password }).expect(200);
  return `Bearer ${response.body.token}`;
}

it('signs in, validates requests, enforces roles and tracks patient changes', async () => {
  await request(app).post('/api/auth/login').send({ email: medicalEmail, password: 'wrong' }).expect(401);
  await request(app).get('/api/patients').expect(401);
  const supervisor = await login(supervisorEmail);
  const staff = await login(staffEmail);
  const medical = await login(medicalEmail);
  await request(app).post('/api/patients').set('Authorization', supervisor).send(patientInput).expect(403);
  await request(app).post('/api/patients').set('Authorization', staff).send({}).expect(400);
  const created = await request(app).post('/api/patients').set('Authorization', staff)
    .send({ ...patientInput, recordNumber: prefix }).expect(201);
  patientId = created.body.id as string;
  const path = `/api/patients/${patientId}`;
  await request(app).patch(path).set('Authorization', staff).send({ firstName: 'Ari' }).expect(200);
  await request(app).get('/api/patients').set('Authorization', supervisor).query({ search: patientId })
    .expect(200).expect(({ body }) => {
      expect(body.total).toBe(1);
      expect(body.items[0]).toMatchObject({ id: patientId, firstName: 'Ari' });
      expect(body.items[0]).not.toHaveProperty('arrivalReason');
    });
  await request(app).patch(`${path}/status`).set('Authorization', staff).send({ status: 'IN_PROGRESS' }).expect(403);
  await request(app).patch(`${path}/status`).set('Authorization', medical).send({ status: 'INVALID' }).expect(400);
  await request(app).patch(`${path}/status`).set('Authorization', medical).send({ status: 'IN_PROGRESS' }).expect(200);
  await request(app).get(path).set('Authorization', medical).expect(200).expect(({ body }) => {
    expect(body.status).toBe('IN_PROGRESS');
    expect(body.statusHistory).toEqual([
      expect.objectContaining({ previousStatus: 'WAITING', nextStatus: 'IN_PROGRESS', actorId: expect.any(String) }),
    ]);
  });
});
