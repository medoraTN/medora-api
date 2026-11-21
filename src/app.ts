import express from 'express';
import type { authUseCases } from './application/auth';
import type { patientUseCases } from './application/patients';
import { handleError } from './presentation/http/middlewares/errors';
import { apiRoutes } from './presentation/http/routes/index.routes';

export function createApp(auth: ReturnType<typeof authUseCases>, patients: ReturnType<typeof patientUseCases>) {
  const app = express();
  app.disable('x-powered-by');
  app.use('/api', (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
  });
  app.use(express.json({ limit: '32kb' }));
  app.use('/api', apiRoutes(auth, patients));
  app.use((_req, res) => {
    res.status(404).json({ code: 'NOT_FOUND', message: 'Route introuvable.' });
  });
  app.use(handleError);
  return app;
}
