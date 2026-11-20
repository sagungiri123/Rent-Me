const rateLimit = require("express-rate-limit");
const { stripNoSqlOperators } = require("../utils/sanitize");

const SENSITIVE_PATH_PATTERNS = [
  /\/\.(env|git|htaccess|htpasswd|npmrc|DS_Store)/i,
  /^\/server(\/|$)/i,
  /^\/(package(-lock)?\.json|tsconfig\.json|vite\.config\.ts|README\.md)$/i,
  /\.\.[/\\]/,
];

const VITE_DEV_ALLOWED_PREFIXES = [
  "/node_modules/.vite/",
  "/node_modules/vite/dist/client/",
];

/**
 * Blocks probing of dotfiles, server source files, package manifests, and path traversal.
 */
function blockSensitivePaths(req, res, next) {
  let decodedPath = req.path;
  try {
    decodedPath = decodeURIComponent(req.path);
  } catch {
    return res.status(400).json({ success: false, message: "Malformed request path" });
  }

  const isProd = process.env.NODE_ENV === "production";
  if (/^\/node_modules(\/|$)/i.test(decodedPath)) {
    const allowedInDev =
      !isProd && VITE_DEV_ALLOWED_PREFIXES.some((prefix) => decodedPath.startsWith(prefix));
    if (!allowedInDev) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
  }

  for (const pattern of SENSITIVE_PATH_PATTERNS) {
    if (pattern.test(decodedPath)) {
      return res.status(404).json({ success: false, message: "Not found" });
    }
  }
  next();
}

/**
 * Strips MongoDB NoSQL operators ($...) and prototype pollution keys across body, query, and params.
 */
function sanitizeRequest(req, res, next) {
  if (req.body && typeof req.body === "object") {
    req.body = stripNoSqlOperators(req.body);
  }
  if (req.params && typeof req.params === "object") {
    const cleanParams = stripNoSqlOperators(req.params);
    Object.keys(req.params).forEach((k) => {
      if (!(k in cleanParams)) delete req.params[k];
      else req.params[k] = cleanParams[k];
    });
  }
  if (req.query && typeof req.query === "object") {
    const cleanQuery = stripNoSqlOperators(req.query);
    Object.keys(req.query).forEach((k) => {
      if (!(k in cleanQuery)) delete req.query[k];
      else req.query[k] = cleanQuery[k];
    });
  }
  next();
}

const createLimiter = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, message },
  });

const apiLimiter = createLimiter(
  15 * 60 * 1000,
  150,
  "Too many requests from this IP. Please try again later."
);

const authLimiter = createLimiter(
  15 * 60 * 1000,
  15,
  "Too many authentication attempts. Please wait 15 minutes before trying again."
);

const writeLimiter = createLimiter(
  15 * 60 * 1000,
  30,
  "Too many submissions. Please slow down and try again shortly."
);

const adminLimiter = createLimiter(
  15 * 60 * 1000,
  80,
  "Admin rate limit reached. Please try again shortly."
);

module.exports = {
  blockSensitivePaths,
  sanitizeRequest,
  apiLimiter,
  authLimiter,
  writeLimiter,
  adminLimiter,
};
