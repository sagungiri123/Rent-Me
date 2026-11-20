const User = require("../models/User");
const { isDbConnected } = require("../config/db");
const memory = require("../config/memoryStore");
const { verifyAuthToken } = require("../config/security");
const { isValidObjectId } = require("../utils/sanitize");

async function resolveUserFromToken(token) {
  const decoded = verifyAuthToken(token);
  if (!decoded?.id || !isValidObjectId(String(decoded.id))) {
    return null;
  }

  if (isDbConnected()) {
    return await User.findById(decoded.id);
  }
  return memory.users.find((u) => u._id === decoded.id) || null;
}

const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Authentication required",
    });
  }

  const token = authHeader.slice(7).trim();
  if (!token || token.length > 2048) {
    return res.status(401).json({
      success: false,
      message: "Invalid authentication token",
    });
  }

  try {
    const user = await resolveUserFromToken(token);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Authentication session is no longer valid",
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Contact support.",
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired authentication token",
    });
  }
};

/**
 * Optional authentication for public routes that grant extra visibility to owners/admins.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }
  const token = authHeader.slice(7).trim();
  if (!token || token.length > 2048) return next();

  try {
    const user = await resolveUserFromToken(token);
    if (user && !user.isSuspended) {
      req.user = user;
    }
  } catch {
    // Proceed as unauthenticated guest
  }
  next();
};

module.exports = { protect, optionalAuth };
