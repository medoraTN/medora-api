import { Router, type RequestHandler } from "express";
import type { UnitController } from "../controllers/unit.controller";
import { requireRole } from "../middlewares/role.middleware";

const READ_ROLES = ["ADMIN", "MEDICAL", "ADMIN_STAFF", "SUPERVISOR"] as const;

export function createUnitRouter(controller: UnitController, authenticate: RequestHandler): Router {
  const router = Router();
  router.post("/", authenticate, requireRole("ADMIN", "ADMIN_STAFF"), controller.create);
  router.get("/", authenticate, requireRole(...READ_ROLES), controller.list);
  return router;
}
