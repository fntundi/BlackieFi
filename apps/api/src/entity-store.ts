import { v4 as uuidv4 } from "uuid";
import type { AppUser } from "./auth.js";
import { pool } from "./db.js";

export type FilterValue =
  | string
  | number
  | boolean
  | null
  | string[]
  | number[]
  | { $gte?: string | number; $lte?: string | number };

export type EntityFilters = Record<string, FilterValue>;

export type ListOptions = {
  filter?: EntityFilters;
  sort?: string | null;
  limit?: number | null;
};

type RecordRow = {
  id: string;
  data: Record<string, unknown>;
  created_at: Date;
  updated_at: Date;
};

function isAdmin(user?: AppUser | null) {
  return user?.role === "admin";
}

function iso(value: Date) {
  return value.toISOString();
}

function normalizeRow(row: RecordRow) {
  return {
    ...row.data,
    id: row.id,
    created_date: (row.data.created_date as string | undefined) ?? iso(row.created_at),
    updated_date: (row.data.updated_date as string | undefined) ?? iso(row.updated_at)
  };
}

function compareValues(left: unknown, right: unknown) {
  if (left == null && right == null) {
    return 0;
  }
  if (left == null) {
    return -1;
  }
  if (right == null) {
    return 1;
  }

  if (typeof left === "number" && typeof right === "number") {
    return left - right;
  }

  return String(left).localeCompare(String(right));
}

function matchesFilter(record: Record<string, unknown>, filter: EntityFilters = {}) {
  return Object.entries(filter).every(([key, expected]) => {
    const actual = record[key];

    if (Array.isArray(expected)) {
      return expected.includes(actual as never);
    }

    if (expected && typeof expected === "object" && !Array.isArray(expected)) {
      const range = expected as { $gte?: string | number; $lte?: string | number };
      if (range.$gte != null && compareValues(actual, range.$gte) < 0) {
        return false;
      }
      if (range.$lte != null && compareValues(actual, range.$lte) > 0) {
        return false;
      }
      return true;
    }

    return actual === expected;
  });
}

async function getAccessibleEntityIds(user: AppUser) {
  if (isAdmin(user)) {
    const entities = await listRecords("Entity", {}, user);
    return new Set(entities.map((entity) => String(entity.id)));
  }

  const memberships = await listRecords("GroupMember", { filter: { user_email: user.email } }, user);
  const groupIds = memberships.map((membership) => String(membership.group_id));
  const access = await listRecords("GroupEntityAccess", {}, user);

  const accessibleIds = access
    .filter((record) => groupIds.includes(String(record.group_id)))
    .map((record) => String(record.entity_id));

  return new Set(accessibleIds);
}

async function applyVisibility(records: Record<string, unknown>[], entityType: string, user?: AppUser | null) {
  if (!user || isAdmin(user)) {
    return records;
  }

  if (entityType === "Entity") {
    const entityIds = await getAccessibleEntityIds(user);
    return records.filter((record) => {
      const ownerMatches = record.owner_email === user.email;
      return ownerMatches || entityIds.has(String(record.id));
    });
  }

  const accessibleEntityIds = await getAccessibleEntityIds(user);

  return records.filter((record) => {
    if (record.owner_email === user.email || record.user_email === user.email) {
      return true;
    }

    if (record.entity_id) {
      return accessibleEntityIds.has(String(record.entity_id));
    }

    return false;
  });
}

export async function listRecords(entityType: string, options: ListOptions = {}, user?: AppUser | null) {
  const result = await pool.query<RecordRow>(
    `SELECT id, data, created_at, updated_at FROM records WHERE entity_type = $1`,
    [entityType]
  );

  let records = result.rows.map(normalizeRow);
  records = await applyVisibility(records, entityType, user);

  if (options.filter) {
    records = records.filter((record) => matchesFilter(record, options.filter));
  }

  if (options.sort) {
    const descending = options.sort.startsWith("-");
    const key = descending ? options.sort.slice(1) : options.sort;
    records.sort((left, right) => compareValues(left[key], right[key]) * (descending ? -1 : 1));
  }

  if (options.limit != null) {
    records = records.slice(0, options.limit);
  }

  return records;
}

export async function getRecord(entityType: string, id: string, user?: AppUser | null) {
  const records = await listRecords(entityType, { filter: { id } }, user);
  return records[0] ?? null;
}

export async function createRecord(entityType: string, payload: Record<string, unknown>, user?: AppUser | null) {
  const id = String(payload.id ?? uuidv4());
  const now = new Date().toISOString();
  const data = {
    ...payload,
    id,
    created_date: payload.created_date ?? now,
    updated_date: payload.updated_date ?? now
  };

  await pool.query(
    `INSERT INTO records (id, entity_type, data) VALUES ($1, $2, $3::jsonb)`,
    [id, entityType, JSON.stringify(data)]
  );

  return getRecord(entityType, id, user);
}

export async function updateRecord(entityType: string, id: string, patch: Record<string, unknown>, user?: AppUser | null) {
  const current = await getRecord(entityType, id, user);
  if (!current) {
    return null;
  }

  const next = {
    ...current,
    ...patch,
    id,
    updated_date: new Date().toISOString()
  };

  await pool.query(
    `UPDATE records SET data = $3::jsonb, updated_at = NOW() WHERE entity_type = $1 AND id = $2`,
    [entityType, id, JSON.stringify(next)]
  );

  return getRecord(entityType, id, user);
}

export async function deleteRecord(entityType: string, id: string) {
  await pool.query(`DELETE FROM records WHERE entity_type = $1 AND id = $2`, [entityType, id]);
}

export async function bulkCreateRecords(entityType: string, payloads: Record<string, unknown>[], user?: AppUser | null) {
  const created = [];
  for (const payload of payloads) {
    created.push(await createRecord(entityType, payload, user));
  }
  return created;
}
