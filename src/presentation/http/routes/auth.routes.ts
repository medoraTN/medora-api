import { Router, type RequestHandler } from "express";
import type { AuthController } from "../controllers/auth.controller";

export function createAuthRouter(controller: AuthController, requireAuthentication: RequestHandler): Router {
  const router = Router();
  router.post("/login", controller.login);
  router.get("/me", requireAuthentication, controller.me);
  return router;
}
