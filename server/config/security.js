const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const BCRYPT_ROUNDS = 12;
const JWT_ISSUER = "rentme-api";
const JWT_AUDIENCE = "rentme-client";
const JWT_ALGORITHM = "HS256";

let ephemeralDevSecret = null;

function getJwtSecret() {
  const configured = (process.env.JWT_SECRET || "").trim();
  const isProd = process.env.NODE_ENV === "production";

  if (configured.length >= 32) {
    return configured;
  }

  if (isProd) {
    throw new Error(
      "FATAL SECURITY ERROR: JWT_SECRET environment variable must be set and at least 32 characters in production."
    );
  }

  if (!ephemeralDevSecret) {
    ephemeralDevSecret = crypto.randomBytes(64).toString("hex");
    console.warn(
      "[Security] JWT_SECRET not set (or <32 chars). Generated ephemeral CSPRNG secret for this non-production process."
    );
  }
  return ephemeralDevSecret;
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
  }

  return origins;
}

function isOriginAllowed(origin, reqHost) {
  // Same-origin browser requests or non-browser tools omit Origin
  if (!origin) return true;
  const normalized = origin.trim().replace(/\/+$/, "");

  // Allow exact same host (handles Cloud Run / AI Studio preview origin cleanly)
  if (reqHost) {
    if (normalized === `https://${reqHost}` || normalized === `http://${reqHost}`) {
      return true;
    }
  }

  return getAllowedCorsOrigins().has(normalized);
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
