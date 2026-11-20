const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { OAuth2Client } = require("google-auth-library");
const { isDbConnected } = require("../config/db");
const memory = require("../config/memoryStore");
const { BCRYPT_ROUNDS } = require("../config/security");
const {
  sanitizeText,
  sanitizePhone,
  validateEmail,
  validatePassword,
} = require("../utils/sanitize");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// Precomputed dummy cost-12 hash for constant-time login comparison on unknown emails
const DUMMY_HASH = "$2b$12$C6UzMDM.H6dfI/f/IKcEeO9u6M6X9y6L/vC5Z5G3J6N5H5K5L5M5u";

const register = async (req, res) => {
  try {
    const rawName = req.body?.name;
    const rawEmail = req.body?.email;
    const rawPassword = req.body?.password;
    const rawRole = req.body?.role;
    const rawPhone = req.body?.phone;
    const rawCollegeName = req.body?.collegeName;

    const name = sanitizeText(rawName, 50);
    if (!name || name.length < 2) {
      return res.status(400).json({
        success: false,
        message: "Please provide your full name (2–50 characters)",
      });
    }

    if (!validateEmail(rawEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }
    const normalizedEmail = rawEmail.trim().toLowerCase();

    const pwCheck = validatePassword(rawPassword);
    if (!pwCheck.valid) {
      return res.status(400).json({
        success: false,
        message: pwCheck.message,
      });
    }

    // Strict allowlist: never allow self-registering as admin
    const role = rawRole === "owner" ? "owner" : rawRole === undefined || rawRole === "student" ? "student" : null;
    if (!role) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'student' or 'owner'",
      });
    }

    const phone = sanitizePhone(rawPhone || "");
    const collegeName = role === "student" ? sanitizeText(rawCollegeName || "", 120) : "";

    if (!isDbConnected()) {
      const existing = memory.users.find((u) => u.email === normalizedEmail);
      if (existing) {
        return res.status(409).json({
          success: false,
          message: "An account with this email already exists",
        });
      }

      const nowIso = new Date().toISOString();
      const newUser = {
        _id: memory.genId(),
        name,
        email: normalizedEmail,
        password: await bcrypt.hash(rawPassword, BCRYPT_ROUNDS),
        role,
        phone,
        collegeName,
        avatar: "",
        isVerified: false,
        verificationStatus: "none",
        savedListings: [],
        isSuspended: false,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      memory.users.push(newUser);
      const token = memory.signToken(newUser);

      return res.status(201).json({
        success: true,
        message: "Registration successful",
        data: { user: memory.sanitizeUser(newUser), token },
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: rawPassword,
      role,
      phone,
      collegeName,
    });

    const token = user.generateToken();

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: { user, token },
    });
  } catch (error) {
    console.error("[Auth] Registration error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Registration could not be completed",
    });
  }
};

const login = async (req, res) => {
  try {
    const rawEmail = req.body?.email;
    const rawPassword = req.body?.password;

    if (
      typeof rawEmail !== "string" ||
      typeof rawPassword !== "string" ||
      !validateEmail(rawEmail) ||
      rawPassword.length === 0 ||
      rawPassword.length > 128
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email and password",
      });
    }

    const normalizedEmail = rawEmail.trim().toLowerCase();

    if (!isDbConnected()) {
      const user = memory.users.find((u) => u.email === normalizedEmail);
      if (!user) {
        await bcrypt.compare(rawPassword, DUMMY_HASH);
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      const isMatch = await bcrypt.compare(rawPassword, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
        });
      }

      if (user.isSuspended) {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended. Contact support.",
        });
      }

      const token = memory.signToken(user);
      return res.status(200).json({
        success: true,
        message: "Login successful",
        data: { user: memory.sanitizeUser(user), token },
      });
    }

    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user || !user.password) {
      await bcrypt.compare(rawPassword, DUMMY_HASH);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const isMatch = await user.comparePassword(rawPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Contact support.",
      });
    }

    const token = user.generateToken();

    return res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user, token },
    });
  } catch (error) {
    console.error("[Auth] Login error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Login could not be completed",
    });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { credential, role: rawRole } = req.body || {};
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({
        success: false,
        message: "Google Sign-In is not configured. Please sign in with email and password.",
      });
    }
    if (typeof credential !== "string" || credential.length < 20) {
      return res.status(400).json({
        success: false,
        message: "Invalid Google credential",
      });
    }

    const role = rawRole === "owner" ? "owner" : "student";

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email_verified || !payload.email) {
      return res.status(401).json({
        success: false,
        message: "Google account email must be verified",
      });
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = sanitizeText(payload.name || "RentMe User", 50);
    const picture = typeof payload.picture === "string" && payload.picture.startsWith("https://") ? payload.picture : "";

    if (!isDbConnected()) {
      let user = memory.users.find((u) => u.googleId === googleId || u.email === email);
      if (!user) {
        const nowIso = new Date().toISOString();
        user = {
          _id: memory.genId(),
          name,
          email,
          googleId,
          avatar: picture,
          role,
          phone: "",
          collegeName: "",
          isVerified: true,
          verificationStatus: "none",
          savedListings: [],
          isSuspended: false,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        memory.users.push(user);
      }
      if (user.isSuspended) {
        return res.status(403).json({
          success: false,
          message: "Your account has been suspended. Contact support.",
        });
      }
      const token = memory.signToken(user);
      return res.status(200).json({
        success: true,
        message: "Google authentication successful",
        data: { user: memory.sanitizeUser(user), token },
      });
    }

    let user = await User.findOne({ $or: [{ googleId }, { email }] });

    if (user) {
      if (!user.googleId) {
        user.googleId = googleId;
        user.avatar = user.avatar || picture;
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        googleId,
        avatar: picture,
        role,
        isVerified: true,
      });
    }

    if (user.isSuspended) {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended. Contact support.",
      });
    }

    const token = user.generateToken();

    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      data: { user, token },
    });
  } catch (error) {
    console.error("[Auth] Google auth error:", error.message);
    return res.status(401).json({
      success: false,
      message: "Google authentication failed",
    });
  }
};

const getMe = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const user = memory.users.find((u) => u._id === req.user._id);
      if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
      const hydrated = {
        ...memory.sanitizeUser(user),
        savedListings: (user.savedListings || [])
          .map((id) => memory.listings.find((l) => l._id === id))
          .filter(Boolean)
          .map((l) => memory.populateOwner(l)),
      };
      return res.status(200).json({
        success: true,
        data: { user: hydrated },
      });
    }

    const user = await User.findById(req.user._id).populate("savedListings");
    return res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("[Auth] getMe error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to load account profile",
    });
  }
};

module.exports = { register, login, googleAuth, getMe };
