import type { Express } from "express";
import type { Server } from "node:http";

export function startServer(app: Express, port: number): Server {
  return app.listen(port, () => {
    console.log(`[medora-api] listening on port ${port}`);
  });
}
