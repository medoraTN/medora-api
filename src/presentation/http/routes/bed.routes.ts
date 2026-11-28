import { Router, type RequestHandler } from "express";
import type { BedController } from "../controllers/bed.controller";
import { requireRole } from "../middlewares/role.middleware";

const READ_ROLES = ["ADMIN", "MEDICAL", "ADMIN_STAFF", "SUPERVISOR"] as const;
const WRITE_ROLES = ["ADMIN", "ADMIN_STAFF", "MEDICAL"] as const;

export function createBedRouter(controller: BedController, authenticate: RequestHandler): Router {
  const router = Router();
  router.post("/", authenticate, requireRole("ADMIN", "ADMIN_STAFF"), controller.create);
  router.get("/", authenticate, requireRole(...READ_ROLES), controller.list);
  router.post("/:id/assign", authenticate, requireRole(...WRITE_ROLES), controller.assign);
  router.post("/:id/transfer", authenticate, requireRole(...WRITE_ROLES), controller.transfer);
  router.post("/:id/release", authenticate, requireRole(...WRITE_ROLES), controller.release);
  router.patch("/:id/status", authenticate, requireRole(...WRITE_ROLES), controller.updateStatus);
  router.get("/:id/history", authenticate, requireRole(...READ_ROLES), controller.history);
  return router;
}
