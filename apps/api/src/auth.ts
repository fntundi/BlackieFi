import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config.js";
import { pool } from "./db.js";

export type AppUser = {
  id: string;
  email: string;
  full_name: string;
  role: string;
};

declare module "fastify" {
  interface FastifyRequest {
    user?: AppUser | null;
  }
}

function hashToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function ensureBootstrapUser(): Promise<AppUser> {
  const existing = await pool.query<AppUser>(
    `SELECT id, email, full_name, role FROM users WHERE email = $1`,
    [config.bootstrapEmail]
  );

  if (existing.rows[0]) {
    return existing.rows[0];
  }

  const user: AppUser = {
    id: uuidv4(),
    email: config.bootstrapEmail,
    full_name: config.bootstrapName,
    role: config.bootstrapRole
  };

  await pool.query(
    `INSERT INTO users (id, email, full_name, role) VALUES ($1, $2, $3, $4)`,
    [user.id, user.email, user.full_name, user.role]
  );

  return user;
}

export async function createSession(user: AppUser) {
  const token = crypto.randomBytes(32).toString("hex");
  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + config.sessionTtlHours * 60 * 60 * 1000);

  await pool.query(
    `INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES ($1, $2, $3, $4)`,
    [sessionId, user.id, hashToken(token), expiresAt.toISOString()]
  );

  return {
    token,
    expires_at: expiresAt.toISOString(),
    user
  };
}

export async function revokeToken(token: string) {
  await pool.query(`DELETE FROM sessions WHERE token_hash = $1`, [hashToken(token)]);
}

export async function getUserFromToken(token: string | undefined | null): Promise<AppUser | null> {
  if (!token) {
    return null;
  }

  const result = await pool.query<AppUser>(
    `
      SELECT u.id, u.email, u.full_name, u.role
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = $1
        AND s.expires_at > NOW()
      LIMIT 1
    `,
    [hashToken(token)]
  );

  return result.rows[0] ?? null;
}

export function extractToken(request: FastifyRequest) {
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice("Bearer ".length);
  }

  if (typeof request.headers["x-access-token"] === "string") {
    return request.headers["x-access-token"];
  }

  return null;
}

export async function attachUser(request: FastifyRequest) {
  request.user = await getUserFromToken(extractToken(request));
}

export async function requireUser(request: FastifyRequest, reply: FastifyReply) {
  if (!request.user) {
    await reply.code(401).send({ error: "Unauthorized" });
    return false;
  }
  return true;
}
