// src/api.js
// Thin client for the backend: auth (signup/login) + syncing app data.

const TOKEN_KEY = "unimate_token";
const USER_KEY = "unimate_user";

export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

function storeSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function parseJsonSafe(res) {
  try {
    return await res.json();
  } catch {
    return {};
  }
}

export async function signup(email, password, name) {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.error || "Signup failed");
  storeSession(data.token, data.user);
  return data;
}

export async function login(email, password) {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.error || "Login failed");
  storeSession(data.token, data.user);
  return data;
}

export async function fetchRemoteData() {
  const token = getToken();
  if (!token) throw new Error("Not signed in");
  const res = await fetch("/api/data", {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await parseJsonSafe(res);
  if (!res.ok) throw new Error(data.error || "Failed to load your data");
  return data.data;
}

export async function saveRemoteData(state) {
  const token = getToken();
  if (!token) throw new Error("Not signed in");
  const res = await fetch("/api/data", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ data: state }),
  });
  if (!res.ok) {
    const data = await parseJsonSafe(res);
    throw new Error(data.error || "Failed to save your data");
  }
}
