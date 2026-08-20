// lib/db.js
// Shared Postgres connection + schema setup for the UniMate AI backend.
// Requires a Vercel Postgres (or any Postgres) database connected to this
// project — Vercel injects the POSTGRES_URL env vars automatically once you
// add a Postgres store to the project in the Vercel dashboard.

import { sql } from "@vercel/postgres";

let schemaReady = false;

export async function ensureSchema() {
  if (schemaReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS app_state (
      user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
      data JSONB NOT NULL DEFAULT '{}'::jsonb,
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `;
  schemaReady = true;
}

export { sql };
