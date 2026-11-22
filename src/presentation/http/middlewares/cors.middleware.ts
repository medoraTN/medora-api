import type { RequestHandler } from "express";

const ALLOWED_METHODS = "GET,POST,PATCH,OPTIONS";
const ALLOWED_HEADERS = "Authorization,Content-Type";

/** CORS is a browser policy; API authentication is still enforced by route middleware. */
export function cors(allowedOrigins: readonly string[]): RequestHandler {
  const origins = new Set(allowedOrigins.map((origin) => origin.trim()).filter(Boolean));

  return (req, res, next) => {
    const origin = req.get("Origin");
    if (!origin || !origins.has(origin)) {
      if (req.method === "OPTIONS") {
        res.sendStatus(403);
        return;
      }
      next();
      return;
    }

    res.vary("Origin");
    res.set("Access-Control-Allow-Origin", origin);

    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", ALLOWED_METHODS);
      res.set("Access-Control-Allow-Headers", ALLOWED_HEADERS);
      res.set("Access-Control-Max-Age", "600");
      res.sendStatus(204);
      return;
    }

    next();
  };
}
