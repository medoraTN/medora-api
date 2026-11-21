import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const derive = promisify(scrypt);
const dummyHash = '0'.repeat(32) + ':' + '0'.repeat(128);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const key = await derive(password, salt, 64) as Buffer;
  return `${salt}:${key.toString('hex')}`;
}

export async function verifyPassword(password: string, storedHash = dummyHash) {
  if (!/^[0-9a-f]{32}:[0-9a-f]{128}$/.test(storedHash)) return false;
  const salt = storedHash.slice(0, 32);
  const expected = Buffer.from(storedHash.slice(33), 'hex');
  const actual = await derive(password, salt, expected.length) as Buffer;
  return timingSafeEqual(expected, actual);
}
