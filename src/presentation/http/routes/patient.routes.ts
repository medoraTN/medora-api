import { Router, type RequestHandler } from "express";
import type { PatientController } from "../controllers/patient.controller";
import { requireRole } from "../middlewares/role.middleware";

const READ_ROLES = ["ADMIN", "MEDICAL", "ADMIN_STAFF", "SUPERVISOR"] as const;

export function createPatientRouter(controller: PatientController, authenticate: RequestHandler): Router {
  const router = Router();
  router.post("/", authenticate, requireRole("ADMIN", "ADMIN_STAFF"), controller.create);
  router.get("/", authenticate, requireRole(...READ_ROLES), controller.list);
  router.get("/:id", authenticate, requireRole(...READ_ROLES), controller.getById);
  return router;
}
