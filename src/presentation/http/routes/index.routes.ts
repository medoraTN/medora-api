import { Router, type RequestHandler } from 'express';
import type { authUseCases } from '../../../application/auth';
import type { patientUseCases } from '../../../application/patients';
import type { Actor, Role } from '../../../domain/entities/user.entity';
import { DomainError } from '../../../domain/errors';
import { idInput, listInput, loginInput, patientEditInput, patientInput, statusInput } from '../validators/input';

type Auth = ReturnType<typeof authUseCases>;
type Patients = ReturnType<typeof patientUseCases>;

function authorize(auth: Auth, roles?: readonly Role[]): RequestHandler {
  return async (req, res, next) => {
    const token = req.get('Authorization')?.match(/^Bearer ([^\s]+)$/i)?.[1];
    const actor = token && await auth.authenticate(token);
    if (!actor) throw new DomainError('UNAUTHENTICATED', 'Connexion requise.');
    if (roles && !roles.includes(actor.role)) {
      throw new DomainError('FORBIDDEN', 'Accès refusé.');
    }
    res.locals['actor'] = actor;
    next();
  };
}

export function apiRoutes(auth: Auth, patients: Patients) {
  const router = Router();
  const patientWriters = authorize(auth, ['ADMIN', 'MEDICAL', 'ADMIN_STAFF']);
  const clinicalWriters = authorize(auth, ['ADMIN', 'MEDICAL']);

  router.get('/health', (_req, res) => { res.json({ status: 'ok' }); });
  router.post('/auth/login', async (req, res) => {
    const { email, password } = loginInput.parse(req.body);
    res.json(await auth.login(email, password));
  });
  router.get('/patients', authorize(auth), async (req, res) => {
    res.json(await patients.list(listInput.parse(req.query)));
  });
  router.post('/patients', patientWriters, async (req, res) => {
    const patient = await patients.create(patientInput.parse(req.body));
    res.location(`/api/patients/${patient.id}`).status(201).json(patient);
  });
  router.get('/patients/:id', authorize(auth), async (req, res) => {
    res.json(await patients.find(idInput.parse(req.params['id'])));
  });
  router.patch('/patients/:id', patientWriters, async (req, res) => {
    const { comments, ...fields } = patientEditInput.parse(req.body);
    const changes = Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined));
    res.json(await patients.update(idInput.parse(req.params['id']), {
      ...changes,
      ...(comments === undefined ? {} : { comments: comments || null }),
    }));
  });
  router.patch('/patients/:id/status', clinicalWriters, async (req, res) => {
    const actor: Actor = res.locals['actor'];
    const { status } = statusInput.parse(req.body);
    res.json(await patients.changeStatus(idInput.parse(req.params['id']), status, actor.id));
  });
  return router;
}
