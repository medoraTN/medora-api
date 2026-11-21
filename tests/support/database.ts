import 'dotenv/config';
import { createDatabase } from '../../src/infrastructure/database/client';

export function testDatabase() {
  const url = process.env['TEST_DATABASE_URL'];
  if (!url) throw new Error('Set TEST_DATABASE_URL to a dedicated PostgreSQL test database.');
  const test = new URL(url);
  const development = process.env['DATABASE_URL'] && new URL(process.env['DATABASE_URL']);
  if (development && test.origin === development.origin && test.pathname === development.pathname) {
    throw new Error('Use a separate test database.');
  }
  return createDatabase(url);
}

export const patientInput = {
  recordNumber: 'TEST',
  firstName: 'Camille',
  lastName: 'Exemple',
  dateOfBirth: '1990-09-15',
  sex: 'F',
  phone: '00000000',
  residence: 'Zone fictive',
  arrivalReason: 'Test de démonstration',
  priority: 'Normale',
};
