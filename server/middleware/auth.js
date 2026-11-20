const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { isDbConnected } = require("../config/db");
const memory = require("../config/memoryStore");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized — no token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, memory.JWT_SECRET());

    let user;
    if (isDbConnected()) {
      user = await User.findById(decoded.id);
    } else {
      user = memory.users.find((u) => u._id === decoded.id);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User belonging to this token no longer exists",
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
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: "Not authorized — invalid token",
    });
  }
};

module.exports = { protect };
