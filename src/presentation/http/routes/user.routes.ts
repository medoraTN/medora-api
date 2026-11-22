import { Router, type RequestHandler } from "express";
import type { UserController } from "../controllers/user.controller";
import { requireRole } from "../middlewares/role.middleware";

/** User administration is reserved to ADMIN (SPECDOC §4.5). */
export function createUserRouter(controller: UserController, authenticate: RequestHandler): Router {
  const router = Router();
  router.use(authenticate, requireRole("ADMIN"));
  router.post("/", controller.create);
  router.get("/", controller.list);
  router.get("/:id", controller.getById);
  router.patch("/:id", controller.update);
  router.post("/:id/reset-password", controller.resetPassword);
  return router;
}
