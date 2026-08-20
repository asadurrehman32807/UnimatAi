// lib/auth.js
// Password hashing + JWT session helpers, shared by the auth endpoints.
// Requires a JWT_SECRET env var set in Vercel (any long random string).

import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SECRET = process.env.JWT_SECRET;

export async function hashPassword(password) {
  return bcrypt.hash(password, 10);
}

export async function comparePassword(password, hash) {
  return bcrypt.compare(password, hash);
}

export function signToken(payload) {
  if (!SECRET) throw new Error("JWT_SECRET is not set on the server");
  return jwt.sign(payload, SECRET, { expiresIn: "30d" });
}

export function verifyToken(token) {
  if (!SECRET) return null;
  try {
    return jwt.verify(token, SECRET);
  } catch {
    return null;
  }
}

// Pulls the user id off a Bearer token in the Authorization header.
export function getUserIdFromReq(req) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return null;
  const payload = verifyToken(token);
  return payload?.uid || null;
}
