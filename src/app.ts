import express, { type Express } from "express";
import { errorHandler, notFoundHandler } from "./presentation/http/middlewares/error-handler.middleware";
import { cors } from "./presentation/http/middlewares/cors.middleware";
import { createApiRouter, type ApiDependencies } from "./presentation/http/routes/index.routes";

export function createApp(
  dependencies: ApiDependencies,
  allowedOrigins: readonly string[] = ["http://localhost:4200"],
): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(cors(allowedOrigins));
  app.use(express.json({ limit: "10kb" }));
  app.use("/api", createApiRouter(dependencies));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
