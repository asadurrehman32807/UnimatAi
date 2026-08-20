// api/data.js
// GET  -> returns the signed-in user's saved app state (tasks, timetable, GPA, etc.)
// POST -> upserts (saves) the signed-in user's full app state as one JSON document.
// Auth: send `Authorization: Bearer <token>` from login/signup.

import { sql, ensureSchema } from "../lib/db.js";
import { getUserIdFromReq } from "../lib/auth.js";

export default async function handler(req, res) {
  const uid = getUserIdFromReq(req);
  if (!uid) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    await ensureSchema();

    if (req.method === "GET") {
      const result = await sql`SELECT data FROM app_state WHERE user_id = ${uid}`;
      return res.status(200).json({ data: result.rows[0]?.data || {} });
    }

    if (req.method === "POST") {
      const { data } = req.body || {};
      if (data === undefined) {
        return res.status(400).json({ error: "Missing 'data' in request body" });
      }
      await sql`
        INSERT INTO app_state (user_id, data, updated_at)
        VALUES (${uid}, ${JSON.stringify(data)}::jsonb, now())
        ON CONFLICT (user_id)
        DO UPDATE SET data = EXCLUDED.data, updated_at = now()
      `;
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
