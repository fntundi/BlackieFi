import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, stat } from "node:fs/promises";
import path from "node:path";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import Fastify from "fastify";
import { parse as parseCsv } from "csv-parse/sync";
import { v4 as uuidv4 } from "uuid";
import { attachUser, createSession, ensureBootstrapUser, extractToken, requireUser, revokeToken } from "./auth.js";
import { config } from "./config.js";
import { pool, ensureSchema } from "./db.js";
import { bulkCreateRecords, createRecord, deleteRecord, getRecord, listRecords, updateRecord } from "./entity-store.js";
import { registerFeatureRoutes } from "./feature-routes.js";
import { handleFunctionInvocation, processRecurringTransactions } from "./functions.js";

const app = Fastify({ logger: true });

app.register(cors, {
  origin: true,
  credentials: true
});
app.register(multipart);

app.addHook("preHandler", async (request) => {
  await attachUser(request);
});

app.get("/health", async () => ({
  ok: true,
  service: "blackiefi-api",
  timestamp: new Date().toISOString()
}));

app.post("/api/auth/bootstrap", async (_request, reply) => {
  const user = await ensureBootstrapUser();
  const session = await createSession(user);
  return reply.send(session);
});

app.get("/api/auth/me", async (request, reply) => {
  if (!request.user) {
    return reply.code(401).send({ error: "Unauthorized" });
  }
  return reply.send(request.user);
});

app.post("/api/auth/logout", async (request) => {
  const token = extractToken(request);
  if (token) {
    await revokeToken(token);
  }
  return { success: true };
});

app.post("/api/app-logs", async (request, reply) => {
  if (!(await requireUser(request, reply))) {
    return;
  }
  const body = request.body as { page_name: string };
  await pool.query(
    `INSERT INTO app_logs (id, user_id, page_name) VALUES ($1, $2, $3)`,
    [uuidv4(), request.user!.id, body.page_name]
  );
  return reply.send({ success: true });
});

app.post("/api/entities/:entity/list", async (request, reply) => {
  if (!(await requireUser(request, reply))) {
    return;
  }
  const params = request.params as { entity: string };
  const body = request.body as { filter?: Record<string, unknown>; sort?: string; limit?: number };
  return reply.send(await listRecords(params.entity, body, request.user));
});

app.post("/api/entities/:entity", async (request, reply) => {
  if (!(await requireUser(request, reply))) {
    return;
  }
  const params = request.params as { entity: string };
  const body = request.body as Record<string, unknown>;
  return reply.send(await createRecord(params.entity, body, request.user));
});

app.post("/api/entities/:entity/bulk", async (request, reply) => {
  if (!(await requireUser(request, reply))) {
    return;
  }
  const params = request.params as { entity: string };
  const body = request.body as Array<Record<string, unknown>>;
  return reply.send(await bulkCreateRecords(params.entity, body, request.user));
});

app.get("/api/entities/:entity/:id", async (request, reply) => {
  if (!(await requireUser(request, reply))) {
    return;
  }
  const params = request.params as { entity: string; id: string };
  const record = await getRecord(params.entity, params.id, request.user);
  if (!record) {
    return reply.code(404).send({ error: "Not found" });
  }
  return reply.send(record);
});

app.patch("/api/entities/:entity/:id", async (request, reply) => {
  if (!(await requireUser(request, reply))) {
    return;
  }
  const params = request.params as { entity: string; id: string };
  const body = request.body as Record<string, unknown>;
  const record = await updateRecord(params.entity, params.id, body, request.user);
  if (!record) {
    return reply.code(404).send({ error: "Not found" });
  }
  return reply.send(record);
});

app.delete("/api/entities/:entity/:id", async (request, reply) => {
  if (!(await requireUser(request, reply))) {
    return;
  }
  const params = request.params as { entity: string; id: string };
  await deleteRecord(params.entity, params.id, request.user);
  return reply.send({ success: true });
});

app.post("/api/functions/:name", async (request, reply) => {
  if (!(await requireUser(request, reply))) {
    return;
  }
  return handleFunctionInvocation(request as never, reply);
});

app.post("/api/automation/process-recurring", async (request, reply) => {
  const automationKey = request.headers["x-automation-key"];
  if (automationKey !== config.automationKey) {
    return reply.code(401).send({ error: "Unauthorized automation request" });
  }

  const bootstrapUser = await ensureBootstrapUser();
  request.user = bootstrapUser;
  return reply.send(await processRecurringTransactions(request as never));
});

app.post("/api/integrations/upload", async (request, reply) => {
  if (!(await requireUser(request, reply))) {
    return;
  }

  const file = await request.file();
  if (!file) {
    return reply.code(400).send({ error: "File is required" });
  }

  await mkdir(config.storageDir, { recursive: true });
  const fileId = uuidv4();
  const safeName = `${fileId}-${file.filename}`;
  const target = path.join(config.storageDir, safeName);
  const stream = createWriteStream(target);
  await file.file.pipe(stream);
  await new Promise((resolve, reject) => {
    stream.on("finish", () => resolve(undefined));
    stream.on("error", reject);
  });
  const meta = await stat(target);

  await pool.query(
    `INSERT INTO files (id, filename, content_type, storage_path, byte_size, created_by) VALUES ($1, $2, $3, $4, $5, $6)`,
    [fileId, file.filename, file.mimetype, target, meta.size, request.user!.id]
  );

  return reply.send({
    file_url: `${config.appBaseUrl}/api/files/${fileId}`,
    file_id: fileId
  });
});

app.get("/api/files/:id", async (request, reply) => {
  if (!(await requireUser(request, reply))) {
    return;
  }

  const params = request.params as { id: string };
  const result = await pool.query<{ filename: string; content_type: string; storage_path: string }>(
    `SELECT filename, content_type, storage_path FROM files WHERE id = $1 LIMIT 1`,
    [params.id]
  );

  if (!result.rows[0]) {
    return reply.code(404).send({ error: "File not found" });
  }

  reply.header("content-type", result.rows[0].content_type);
  reply.header("content-disposition", `inline; filename="${result.rows[0].filename}"`);
  return reply.send(createReadStream(result.rows[0].storage_path));
});

app.post("/api/integrations/extract", async (request, reply) => {
  if (!(await requireUser(request, reply))) {
    return;
  }

  const body = request.body as { file_url: string; json_schema?: Record<string, unknown> };
  const fileId = body.file_url.split("/").pop();
  const result = await pool.query<{ filename: string; content_type: string; storage_path: string }>(
    `SELECT filename, content_type, storage_path FROM files WHERE id = $1 LIMIT 1`,
    [fileId]
  );
  const file = result.rows[0];
  if (!file) {
    return reply.code(404).send({ error: "File not found" });
  }

  if (file.filename.toLowerCase().endsWith(".csv")) {
    const csv = await import("node:fs/promises").then((fs) => fs.readFile(file.storage_path, "utf8"));
    const rows = parseCsv(csv, { columns: true, skip_empty_lines: true });
    const output = rows.map((row: Record<string, string>) => ({
      date: row.date ?? row.Date ?? row.posted_at ?? new Date().toISOString().split("T")[0],
      description: row.description ?? row.Description ?? row.memo ?? "Imported transaction",
      amount: Number(row.amount ?? row.Amount ?? row.value ?? 0),
      type: Number(row.amount ?? row.Amount ?? row.value ?? 0) >= 0 ? "income" : "expense"
    }));
    return reply.send({ status: "success", output });
  }

  return reply.send({
    status: "failed",
    details: "PDF extraction requires an LLM/document provider configuration."
  });
});

registerFeatureRoutes(app);

async function start() {
  await ensureSchema();
  await ensureBootstrapUser();
  await app.listen({ host: config.host, port: config.port });
}

start().catch((error) => {
  app.log.error(error);
  process.exit(1);
});
