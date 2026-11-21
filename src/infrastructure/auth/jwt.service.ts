import jwt from 'jsonwebtoken';

export function jwtService(secret: string) {
  return {
    issue: (id: string) => jwt.sign({}, secret, {
      algorithm: 'HS256', subject: id, expiresIn: '1h', issuer: 'medora-api',
    }),
    subject(token: string) {
      try {
        const payload = jwt.verify(token, secret, { algorithms: ['HS256'], issuer: 'medora-api' });
        return typeof payload === 'object' ? payload.sub : undefined;
      } catch {
        return undefined;
      }
    },
  };
}
