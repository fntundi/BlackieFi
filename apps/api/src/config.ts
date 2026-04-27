import path from "node:path";

const env = process.env;
const dbHost = env.POSTGRES_HOST ?? "localhost";
const dbPort = env.POSTGRES_PORT ?? "5432";
const dbName = env.POSTGRES_DB ?? "blackiefi";
const dbUser = env.POSTGRES_USER ?? "postgres";
const dbPassword = env.POSTGRES_PASSWORD ?? "postgres";
const appScheme = env.APP_SCHEME ?? "http";
const appHostname = env.APP_HOSTNAME ?? "localhost";
const appBaseUrl = env.APP_BASE_URL ?? `${appScheme}://${appHostname}`;

export const config = {
  host: env.API_HOST ?? "0.0.0.0",
  port: Number(env.API_PORT ?? 3001),
  corsOrigin: env.CORS_ORIGIN ?? appBaseUrl,
  databaseUrl: env.DATABASE_URL ?? `postgresql://${dbUser}:${encodeURIComponent(dbPassword)}@${dbHost}:${dbPort}/${dbName}`,
  storageDir: env.STORAGE_DIR ?? path.resolve(process.cwd(), "data", "uploads"),
  bootstrapEmail: env.BLACKIEFI_BOOTSTRAP_EMAIL ?? "admin@blackiefi.local",
  bootstrapName: env.BLACKIEFI_BOOTSTRAP_NAME ?? "BlackieFi Admin",
  bootstrapRole: env.BLACKIEFI_BOOTSTRAP_ROLE ?? "admin",
  sessionTtlHours: Number(env.SESSION_TTL_HOURS ?? 24 * 30),
  llmServiceUrl: env.LLM_SERVICE_URL ?? "http://localhost:8001",
  appBaseUrl,
  automationKey: env.AUTOMATION_SHARED_KEY ?? "change-me"
};
