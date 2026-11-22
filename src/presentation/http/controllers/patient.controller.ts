import type { Request, Response } from "express";
import type { CreatePatientUseCase } from "../../../application/use-cases/create-patient.use-case";
import type { GetPatientUseCase } from "../../../application/use-cases/get-patient.use-case";
import type { ListPatientsUseCase } from "../../../application/use-cases/list-patients.use-case";
import type { UpdatePatientStatusUseCase } from "../../../application/use-cases/update-patient-status.use-case";
import { UnauthenticatedError } from "../../../domain/errors/auth-errors";
import {
  createPatientSchema,
  listPatientsQuerySchema,
  patientIdParamsSchema,
  updatePatientStatusSchema,
} from "../validators/patient.validator";

export class PatientController {
  constructor(
    private readonly createPatient: CreatePatientUseCase,
    private readonly listPatients: ListPatientsUseCase,
    private readonly getPatient: GetPatientUseCase,
    private readonly updatePatientStatus: UpdatePatientStatusUseCase,
  ) {}

  create = async (req: Request, res: Response): Promise<void> => {
    const input = createPatientSchema.parse(req.body);
    const patient = await this.createPatient.execute(input);
    res.status(201).json({ patient });
  };

  list = async (req: Request, res: Response): Promise<void> => {
    const query = listPatientsQuerySchema.parse(req.query);
    const result = await this.listPatients.execute(query);
    res.status(200).json({
      items: result.items,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  };

  getById = async (req: Request, res: Response): Promise<void> => {
    const { id } = patientIdParamsSchema.parse(req.params);
    const patient = await this.getPatient.execute(id);
    res.status(200).json({ patient });
  };

  updateStatus = async (req: Request, res: Response): Promise<void> => {
    const { id } = patientIdParamsSchema.parse(req.params);
    const { status } = updatePatientStatusSchema.parse(req.body);
    if (!req.auth) throw new UnauthenticatedError();
    const patient = await this.updatePatientStatus.execute(id, status, req.auth.userId);
    res.status(200).json({ patient });
  };
}
