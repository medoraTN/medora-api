import { Router, type RequestHandler } from "express";
import type { ReservationController } from "../controllers/reservation.controller";
import { requireRole } from "../middlewares/role.middleware";

const READ_ROLES = ["ADMIN", "MEDICAL", "ADMIN_STAFF", "SUPERVISOR"] as const;
const WRITE_ROLES = ["ADMIN", "ADMIN_STAFF", "MEDICAL"] as const;

export function createReservationRouter(controller: ReservationController, authenticate: RequestHandler): Router {
  const router = Router();
  router.post("/", authenticate, requireRole(...WRITE_ROLES), controller.create);
  router.get("/", authenticate, requireRole(...READ_ROLES), controller.list);
  router.patch("/:id", authenticate, requireRole(...WRITE_ROLES), controller.update);
  router.delete("/:id", authenticate, requireRole(...WRITE_ROLES), controller.cancel);
  return router;
}
