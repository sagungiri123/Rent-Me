const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { OAuth2Client } = require("google-auth-library");
const { isDbConnected } = require("../config/db");
const memory = require("../config/memoryStore");

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const register = async (req, res) => {
  try {
    const { name, email, password, role, phone, collegeName } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    if (role && !["student", "owner"].includes(role)) {
      return res.status(400).json({
        success: false,
        message: "Invalid role. Must be 'student' or 'owner'",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isDbConnected()) {
      const existing = memory.users.find((u) => u.email === normalizedEmail);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: "An account with this email already exists",
        });
      }

      const nowIso = new Date().toISOString();
      const newUser = {
        _id: memory.genId(),
        name: name.trim(),
        email: normalizedEmail,
        password: await bcrypt.hash(password, 10),
        role: role || "student",
        phone: (phone || "").trim(),
        collegeName: (collegeName || "").trim(),
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
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const user = await User.create({
      name,
      email: normalizedEmail,
      password,
      role: role || "student",
      phone,
      collegeName,
    });

    const token = user.generateToken();

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: { user, token },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Registration failed",
      error: error.message,
    });
  }
};

const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Please provide email and password",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (!isDbConnected()) {
      const user = memory.users.find((u) => u.email === normalizedEmail);
      if (!user) {
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

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: "Invalid email or password",
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
    if (!user) {
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

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    const token = user.generateToken();

    res.status(200).json({
      success: true,
      message: "Login successful",
      data: { user, token },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Login failed",
      error: error.message,
    });
  }
};

const googleAuth = async (req, res) => {
  try {
    const { credential, role } = req.body;
    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.status(400).json({
        success: false,
        message: "Google Sign-In is not configured in this environment. Please use email sign-in.",
      });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { sub: googleId, email, name, picture } = ticket.getPayload();

    if (!isDbConnected()) {
      let user = memory.users.find((u) => u.googleId === googleId || u.email === email);
      if (!user) {
        const nowIso = new Date().toISOString();
        user = {
          _id: memory.genId(),
          name,
          email,
          googleId,
          avatar: picture || "",
          role: role || "student",
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
        role: role || "student",
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

    res.status(200).json({
      success: true,
      message: "Google authentication successful",
      data: { user, token },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Google authentication failed",
      error: error.message,
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
    res.status(200).json({
      success: true,
      data: { user },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to get user profile",
      error: error.message,
    });
  }
};

module.exports = { register, login, googleAuth, getMe };
