import { Router, type RequestHandler } from "express";
import type { UserController } from "../controllers/user.controller";
import { requireRole } from "../middlewares/role.middleware";

export function createUserRouter(controller: UserController, authenticate: RequestHandler): Router {
  const router = Router();
  router.use(authenticate, requireRole("ADMIN"));
  router.get("/", controller.list);
  router.post("/", controller.create);
  router.patch("/:id/role", controller.updateRole);
  router.patch("/:id/status", controller.setActive);
  router.post("/:id/password-reset", controller.resetPassword);
  return router;
}
