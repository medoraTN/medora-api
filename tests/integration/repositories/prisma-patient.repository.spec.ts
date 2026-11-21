import { randomUUID } from 'node:crypto';
import { PrismaPatientRepository } from '../../../src/infrastructure/database/repositories/prisma-patient.repository';
import { patientInput, testDatabase } from '../../support/database';

const db = testDatabase();
const repo = new PrismaPatientRepository(db);
const id = randomUUID();
let patientId: string | undefined;

afterAll(async () => {
  if (patientId) {
    await db.patientStatusChange.deleteMany({ where: { patientId } });
    await db.patient.delete({ where: { id: patientId } });
  }
  await db.user.deleteMany({ where: { id } });
  await db.$disconnect();
});

it('persists patient, rejects duplicates and writes status and history atomically', async () => {
  const fields = { ...patientInput, recordNumber: id, dateOfBirth: new Date(patientInput.dateOfBirth) };
  const patient = await repo.create(fields);
  patientId = patient.id;
  expect(patient.status).toBe('WAITING');
  await expect(repo.create(fields)).rejects.toMatchObject({ code: 'DUPLICATE_RECORD' });

  await expect(repo.changeStatus(patient.id, 'IN_PROGRESS', id)).rejects.toBeDefined();
  expect(await repo.find(patient.id)).toMatchObject({ status: 'WAITING', statusHistory: [] });

  await db.user.create({ data: { id, email: `${id}@example.invalid`, passwordHash: 'unused', role: 'MEDICAL' } });
  await repo.changeStatus(patient.id, 'IN_PROGRESS', id);
  const updated = await repo.find(patient.id);
  expect(updated?.status).toBe('IN_PROGRESS');
  expect(updated?.statusHistory).toEqual([
    expect.objectContaining({ actorId: id, changedAt: expect.any(Date), previousStatus: 'WAITING', nextStatus: 'IN_PROGRESS' }),
  ]);
});
