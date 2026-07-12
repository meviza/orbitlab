#!/usr/bin/env node
/**
 * Import apps/pocketbase/pb_schema.json into a running PocketBase instance.
 *
 * Requires PocketBase ≥ 0.22 (fields-based schema) and a superuser account.
 *
 * Env:
 *   PB_ADMIN_EMAIL      (required) superuser email
 *   PB_ADMIN_PASSWORD   (required) superuser password
 *   POCKETBASE_URL      base URL (default http://127.0.0.1:8090)
 *   PB_HTTP             host:port alternative → http://{PB_HTTP}
 *   PB_DELETE_MISSING   "true" to delete collections/fields not in schema (DANGEROUS)
 *   PB_SCHEMA_PATH      override path to schema JSON
 *
 * Usage (from apps/pocketbase):
 *   export PB_ADMIN_EMAIL=admin@orbitlab.local
 *   export PB_ADMIN_PASSWORD='...'
 *   pnpm import-schema
 */

import { readFileSync, existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import PocketBase from "pocketbase";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

function fail(message, code = 1) {
  console.error(`error: ${message}`);
  process.exit(code);
}

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

/**
 * Align schema collection ids with a live instance so name collisions
 * (especially default `users` → `_pb_users_auth_`) do not fail import.
 * Relation field collectionId values are rewritten via the same map.
 */
function remapCollectionsToExisting(schemaCollections, existingCollections) {
  const existingByName = new Map(
    existingCollections.map((c) => [c.name, c])
  );
  const idMap = new Map(); // schemaId → liveId

  for (const col of schemaCollections) {
    const live = existingByName.get(col.name);
    if (live && live.id !== col.id) {
      idMap.set(col.id, live.id);
    }
  }

  if (idMap.size === 0) {
    return { collections: schemaCollections, remaps: [] };
  }

  const remaps = [...idMap.entries()].map(
    ([from, to]) => `${from} → ${to}`
  );

  const collections = schemaCollections.map((col) => {
    const next = structuredClone(col);
    if (idMap.has(next.id)) {
      next.id = idMap.get(next.id);
    }
    if (Array.isArray(next.fields)) {
      for (const field of next.fields) {
        if (
          field?.type === "relation" &&
          typeof field.collectionId === "string" &&
          idMap.has(field.collectionId)
        ) {
          field.collectionId = idMap.get(field.collectionId);
        }
      }
    }
    // Index SQL often embeds the collection id in the index name; leave as-is
    // unless the old id appears literally — rewrite for consistency.
    if (Array.isArray(next.indexes)) {
      next.indexes = next.indexes.map((sql) => {
        let out = sql;
        for (const [from, to] of idMap) {
          out = out.split(from).join(to);
        }
        return out;
      });
    }
    return next;
  });

  return { collections, remaps };
}

// Optional local env (never commit real .env)
loadEnvFile(join(ROOT, ".env"));

const email = process.env.PB_ADMIN_EMAIL?.trim();
const password = process.env.PB_ADMIN_PASSWORD;
const deleteMissing =
  String(process.env.PB_DELETE_MISSING ?? "false").toLowerCase() === "true";

let baseUrl =
  process.env.POCKETBASE_URL?.trim() ||
  process.env.PB_URL?.trim() ||
  "";

if (!baseUrl) {
  const http = process.env.PB_HTTP?.trim() || "127.0.0.1:8090";
  baseUrl = http.startsWith("http") ? http : `http://${http}`;
}

// normalize trailing slash
baseUrl = baseUrl.replace(/\/+$/, "");

const schemaPath = resolve(
  process.env.PB_SCHEMA_PATH?.trim() || join(ROOT, "pb_schema.json")
);

if (!email) {
  fail(
    "PB_ADMIN_EMAIL is required.\n" +
      "  Example: export PB_ADMIN_EMAIL=admin@orbitlab.local\n" +
      "  See .env.example"
  );
}
if (!password) {
  fail(
    "PB_ADMIN_PASSWORD is required.\n" +
      "  Example: export PB_ADMIN_PASSWORD='your-secret'\n" +
      "  See .env.example"
  );
}
if (!existsSync(schemaPath)) {
  fail(`schema file not found: ${schemaPath}`);
}

let collections;
try {
  const raw = JSON.parse(readFileSync(schemaPath, "utf8"));
  if (Array.isArray(raw)) {
    collections = raw;
  } else if (raw && Array.isArray(raw.collections)) {
    collections = raw.collections;
  } else {
    fail(
      `${schemaPath} must be a JSON array of collections, or { "collections": [...] }`
    );
  }
} catch (err) {
  fail(`failed to parse schema JSON: ${err?.message ?? err}`);
}

if (collections.length === 0) {
  fail("schema contains zero collections");
}

console.log(`PocketBase URL : ${baseUrl}`);
console.log(`Schema         : ${schemaPath} (${collections.length} collections)`);
console.log(`Superuser      : ${email}`);
console.log(`deleteMissing  : ${deleteMissing}`);
if (deleteMissing) {
  console.warn(
    "WARNING: deleteMissing=true will remove collections/fields not present in the import (and their data)."
  );
}

const pb = new PocketBase(baseUrl);
// Node scripts should not auto-cancel duplicate requests the way browsers do.
pb.autoCancellation(false);

try {
  // PocketBase 0.23+ : superusers live in _superusers (replaces /api/admins).
  await pb.collection("_superusers").authWithPassword(email, password);
} catch (err) {
  const status = err?.status ?? err?.response?.status;
  const detail =
    err?.response?.message ||
    err?.message ||
    String(err);
  console.error("");
  console.error("error: superuser authentication failed.");
  console.error(`  status : ${status ?? "n/a"}`);
  console.error(`  detail : ${detail}`);
  console.error("");
  console.error("Checklist:");
  console.error("  1. Is PocketBase running?  pnpm serve");
  console.error("  2. Create superuser if needed:");
  console.error(
    '       ./bin/pocketbase superuser upsert "$PB_ADMIN_EMAIL" "$PB_ADMIN_PASSWORD"'
  );
  console.error("  3. PB_ADMIN_EMAIL / PB_ADMIN_PASSWORD match that superuser");
  console.error(`  4. URL is reachable: ${baseUrl}/api/health`);
  process.exit(1);
}

// Remap schema ids onto existing collection ids (by name) before import.
try {
  const existing = await pb.collections.getFullList({ batch: 200 });
  const { collections: remapped, remaps } = remapCollectionsToExisting(
    collections,
    existing
  );
  collections = remapped;
  if (remaps.length > 0) {
    console.log("Remapped collection ids to match live instance:");
    for (const line of remaps) console.log(`  ${line}`);
  }
} catch (err) {
  console.warn(
    `warning: could not list existing collections for id remap: ${err?.message ?? err}`
  );
  console.warn("  continuing with schema ids as written…");
}

try {
  // JS SDK (0.21+): collections.import(collections, deleteMissing)
  // Wraps PUT /api/collections/import — PocketBase 0.22+ fields schema.
  await pb.collections.import(collections, deleteMissing);
} catch (err) {
  const status = err?.status ?? err?.response?.status;
  const data = err?.response?.data ?? err?.data;
  const detail =
    err?.response?.message ||
    err?.message ||
    String(err);
  console.error("");
  console.error("error: collections.import failed.");
  console.error(`  status : ${status ?? "n/a"}`);
  console.error(`  detail : ${detail}`);
  if (data) {
    try {
      console.error(`  data   : ${JSON.stringify(data, null, 2)}`);
    } catch {
      console.error(`  data   : ${data}`);
    }
  }
  console.error("");
  console.error("Hints:");
  console.error(
    "  • Fresh install: import with deleteMissing=false (default) is safe."
  );
  console.error(
    "  • users id in pb_schema.json should be `_pb_users_auth_` (PB default)."
  );
  console.error(
    "  • Schema targets PocketBase ≥ 0.22 (fields[] API, not schema[])."
  );
  process.exit(1);
}

const names = collections.map((c) => c.name).filter(Boolean);
console.log("");
console.log("Schema import OK.");
console.log(`  collections: ${names.join(", ")}`);
console.log(`  admin UI   : ${baseUrl}/_/`);
process.exit(0);
