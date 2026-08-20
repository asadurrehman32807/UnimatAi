// api/auth/login.js
import { sql, ensureSchema } from "../../lib/db.js";
import { comparePassword, signToken } from "../../lib/auth.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();

  try {
    await ensureSchema();

    const result = await sql`SELECT id, email, password_hash, name FROM users WHERE email = ${normalizedEmail}`;
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const valid = await comparePassword(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const token = signToken({ uid: user.id, email: user.email });
    return res.status(200).json({ token, user: { id: user.id, email: user.email, name: user.name } });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}
