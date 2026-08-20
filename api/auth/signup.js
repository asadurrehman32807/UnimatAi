// api/auth/signup.js
import crypto from "crypto";
import { sql, ensureSchema } from "../../lib/db.js";
import { hashPassword, signToken } from "../../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password, name } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    await ensureSchema();

    const existing = await sql`SELECT id FROM users WHERE email = ${normalizedEmail}`;
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const id = crypto.randomUUID();
    const passwordHash = await hashPassword(password);

    await sql`
      INSERT INTO users (id, email, password_hash, name)
      VALUES (${id}, ${normalizedEmail}, ${passwordHash}, ${name || ""})
    `;
    await sql`
      INSERT INTO app_state (user_id, data)
      VALUES (${id}, '{}'::jsonb)
    `;

    const token = signToken({ uid: id, email: normalizedEmail });
    return res.status(200).json({ token, user: { id, email: normalizedEmail, name: name || "" } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
