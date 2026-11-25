const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const BCRYPT_ROUNDS = 12;
const JWT_ISSUER = "rentme-api";
const JWT_AUDIENCE = "rentme-client";
const JWT_ALGORITHM = "HS256";

let ephemeralSecret = null;

function getJwtSecret() {
  const configured = (process.env.JWT_SECRET || "").trim();

  if (configured.length >= 32) {
    return configured;
  }

  if (!ephemeralSecret) {
    ephemeralSecret = crypto.randomBytes(32).toString("hex");
    console.warn(
      "[Security] JWT_SECRET not configured (or <32 chars). Using an ephemeral in-memory CSPRNG signing secret; set JWT_SECRET in environment secrets to persist sessions across restarts."
    );
  }
  return ephemeralSecret;
}

function getJwtExpire() {
  return process.env.JWT_EXPIRE || "7d";
}

function signAuthToken(user) {
  return jwt.sign(
    { id: String(user._id), role: user.role },
    getJwtSecret(),
    {
      algorithm: JWT_ALGORITHM,
      expiresIn: getJwtExpire(),
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );
}

function verifyAuthToken(token) {
  return jwt.verify(token, getJwtSecret(), {
    algorithms: [JWT_ALGORITHM],
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

function getAllowedCorsOrigins() {
  const origins = new Set();
  const rawList = [
    process.env.CLIENT_URL,
    ...(process.env.CORS_ORIGINS || "").split(","),
  ];

  for (const item of rawList) {
    const trimmed = (item || "").trim().replace(/\/+$/, "");
    if (trimmed) origins.add(trimmed);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
    origins.add("http://localhost:5000");
    origins.add("http://127.0.0.1:5000");
  }

  return origins;
}

/**
 * Checks whether a hostname belongs to a private network (RFC 1918), loopback, or local domain.
 */
function isPrivateOrLocalHost(hostname) {
  if (!hostname) return false;
  const clean = hostname.replace(/^\[|\]$/g, "").toLowerCase();

  if (
    clean === "localhost" ||
    clean === "127.0.0.1" ||
    clean === "::1" ||
    clean.endsWith(".local")
  ) {
    return true;
  }

  // IPv4 Loopback (127.0.0.0/8)
  if (/^127(?:\.\d{1,3}){3}$/.test(clean)) return true;

  // IPv4 Private Networks (RFC 1918):
  // 10.0.0.0/8
  if (/^10(?:\.\d{1,3}){3}$/.test(clean)) return true;
  // 172.16.0.0/12
  if (/^172\.(?:1[6-9]|2\d|3[01])(?:\.\d{1,3}){2}$/.test(clean)) return true;
  // 192.168.0.0/16
  if (/^192\.168(?:\.\d{1,3}){2}$/.test(clean)) return true;

  return false;
}

function isOriginAllowedByList(origin) {
  const allowed = getAllowedCorsOrigins();
  if (allowed.has(origin)) return true;

  // Wildcard pattern matching (e.g. *.example.com)
  for (const item of allowed) {
    if (item.includes("*")) {
      const regexPattern =
        "^" + item.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*") + "$";
      if (new RegExp(regexPattern, "i").test(origin)) {
        return true;
      }
    }
  }
  return false;
}

function isOriginAllowed(origin, reqHost) {
  // 1. Same-origin browser requests or non-browser tools omit Origin
  if (!origin) return true;
  const normalized = origin.trim().replace(/\/+$/, "");

  // 2. Wildcard configuration
  const rawCorsOrigins = (process.env.CORS_ORIGINS || "").trim();
  if (rawCorsOrigins === "*") {
    return true;
  }

  // 3. Parse origin URL
  let originUrl;
  try {
    originUrl = new URL(normalized);
  } catch {
    return false;
  }

  const isProd = process.env.NODE_ENV === "production";

  // 4. In development/testing, allow all local network (LAN) and loopback addresses on any port
  if (!isProd && isPrivateOrLocalHost(originUrl.hostname)) {
    return true;
  }

  // 5. Allow if origin matches incoming request Host or X-Forwarded-Host
  if (reqHost) {
    const cleanHost = reqHost.trim().toLowerCase();
    if (
      normalized.toLowerCase() === `https://${cleanHost}` ||
      normalized.toLowerCase() === `http://${cleanHost}`
    ) {
      return true;
    }

    const hostWithoutPort = cleanHost.split(":")[0];
    if (
      originUrl.host.toLowerCase() === cleanHost ||
      originUrl.hostname.toLowerCase() === hostWithoutPort
    ) {
      if (!isProd || isOriginAllowedByList(normalized)) {
        return true;
      }
    }
  }

  // 6. Check against explicitly configured allowed origins
  return isOriginAllowedByList(normalized);
}

module.exports = {
  BCRYPT_ROUNDS,
  JWT_ALGORITHM,
  JWT_ISSUER,
  JWT_AUDIENCE,
  getJwtSecret,
  getJwtExpire,
  signAuthToken,
  verifyAuthToken,
  getAllowedCorsOrigins,
  isOriginAllowed,
};
