import "dotenv/config";

const databaseUrl = process.env.NODE_ENV === "test" ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL;
if (!databaseUrl) {
  const name = process.env.NODE_ENV === "test" ? "TEST_DATABASE_URL" : "DATABASE_URL";
  throw new Error(`${name} must be set to a PostgreSQL connection string`);
}
export const env = {
  databaseUrl,
  port: Number(process.env.PORT ?? 3000),
  jwtSecret: process.env.JWT_SECRET ?? "",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "1h",
};
