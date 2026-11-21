const User = require("../models/User");
const Listing = require("../models/Listing");
const Verification = require("../models/Verification");
const { isDbConnected } = require("../config/db");
const memory = require("../config/memoryStore");
const {
  sanitizeText,
  sanitizePhone,
  sanitizeSafeUrl,
  isValidObjectId,
} = require("../utils/sanitize");

const getProfile = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const user = memory.users.find((u) => u._id === req.user._id);
      return res.status(200).json({ success: true, data: { user: memory.sanitizeUser(user) } });
    }
    const user = await User.findById(req.user._id);
    return res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    console.error("[Users] getProfile error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load profile" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const updates = {};
    if (req.body?.name !== undefined) {
      const cleanName = sanitizeText(req.body.name, 50);
      if (cleanName.length < 2) {
        return res.status(400).json({ success: false, message: "Name must be 2–50 characters" });
      }
      updates.name = cleanName;
    }
    if (req.body?.phone !== undefined) {
      updates.phone = sanitizePhone(req.body.phone);
    }
    if (req.body?.collegeName !== undefined && req.user.role === "student") {
      updates.collegeName = sanitizeText(req.body.collegeName, 120);
    }
    if (req.file?.cloudinaryUrl || req.file?.url) {
      updates.avatar = req.file.cloudinaryUrl || req.file.url;
    } else if (req.file?.filename) {
      updates.avatar = `/uploads/${req.file.filename}`;
    } else if (typeof req.body?.avatar === "string" && req.body.avatar.trim()) {
      const safeAvatar = sanitizeSafeUrl(req.body.avatar);
      if (safeAvatar) updates.avatar = safeAvatar;
    }

    if (!isDbConnected()) {
      const user = memory.users.find((u) => u._id === req.user._id);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      Object.assign(user, updates, { updatedAt: new Date().toISOString() });
      return res.status(200).json({
        success: true,
        message: "Profile updated",
        data: { user: memory.sanitizeUser(user) },
      });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });
    return res.status(200).json({ success: true, message: "Profile updated", data: { user } });
  } catch (error) {
    console.error("[Users] updateProfile error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update profile" });
  }
};

const getSavedListings = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const user = memory.users.find((u) => u._id === req.user._id);
      const saved = (user?.savedListings || [])
        .map((id) => memory.listings.find((l) => l._id === id && l.status === "approved"))
        .filter(Boolean)
        .map((l) => memory.populateOwner(l, { includeContact: false }));
      return res.status(200).json({ success: true, data: { listings: saved } });
    }

    const user = await User.findById(req.user._id).populate({
      path: "savedListings",
      match: { status: "approved" },
      populate: { path: "owner", select: "name avatar" },
    });
    return res.status(200).json({ success: true, data: { listings: user.savedListings } });
  } catch (error) {
    console.error("[Users] getSavedListings error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load saved listings" });
  }
};

const toggleSaveListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    if (!isValidObjectId(listingId)) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    if (!isDbConnected()) {
      const listing = memory.listings.find((l) => l._id === listingId && l.status === "approved");
      if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

      const user = memory.users.find((u) => u._id === req.user._id);
      if (!Array.isArray(user.savedListings)) user.savedListings = [];
      const idx = user.savedListings.indexOf(listingId);

      if (idx > -1) {
        user.savedListings.splice(idx, 1);
        return res
          .status(200)
          .json({ success: true, message: "Listing removed from saved", data: { saved: false } });
      } else {
        user.savedListings.push(listingId);
        return res.status(200).json({ success: true, message: "Listing saved", data: { saved: true } });
      }
    }

    const listing = await Listing.findOne({ _id: listingId, status: "approved" });
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

    const user = await User.findById(req.user._id);
    const savedIndex = user.savedListings.indexOf(listingId);

    if (savedIndex > -1) {
      user.savedListings.splice(savedIndex, 1);
      await user.save();
      return res
        .status(200)
        .json({ success: true, message: "Listing removed from saved", data: { saved: false } });
    } else {
      user.savedListings.push(listingId);
      await user.save();
      return res.status(200).json({ success: true, message: "Listing saved", data: { saved: true } });
    }
  } catch (error) {
    console.error("[Users] toggleSaveListing error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update saved list" });
  }
};

const getMyListings = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const mine = memory.listings
        .filter((l) => l.owner === req.user._id)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      return res.status(200).json({ success: true, data: { listings: mine } });
    }

    const listings = await Listing.find({ owner: req.user._id }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: { listings } });
  } catch (error) {
    console.error("[Users] getMyListings error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load your listings" });
  }
};

const submitVerification = async (req, res) => {
  try {
    const { documentType } = req.body || {};
    if (!documentType || !["citizenship", "ownership_proof", "college_id"].includes(documentType)) {
      return res.status(400).json({ success: false, message: "A valid document type is required" });
    }

    if (!req.file?.filename) {
      return res.status(400).json({ success: false, message: "A valid verification document image is required" });
    }

    // Store private filename reference — served ONLY via authenticated admin endpoint, never public /uploads
    const privateRef = `private:${req.file.filename}`;

    if (!isDbConnected()) {
      const existingPending = memory.verifications.find(
        (v) => v.user === req.user._id && v.status === "pending"
      );
      if (existingPending) {
        return res
          .status(400)
          .json({ success: false, message: "You already have a pending verification request" });
      }

      const nowIso = new Date().toISOString();
      const id = memory.genId();
      const verification = {
        _id: id,
        user: req.user._id,
        documentType,
        documentUrl: privateRef,
        status: "pending",
        reviewedBy: null,
        reviewNotes: "",
        submittedAt: nowIso,
        reviewedAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      memory.verifications.unshift(verification);

      const user = memory.users.find((u) => u._id === req.user._id);
      if (user) user.verificationStatus = "pending";

      return res.status(201).json({
        success: true,
        message: "Verification submitted successfully",
        data: {
          verification: {
            _id: verification._id,
            documentType: verification.documentType,
            status: verification.status,
            submittedAt: verification.submittedAt,
          },
        },
      });
    }

    const existingPending = await Verification.findOne({ user: req.user._id, status: "pending" });
    if (existingPending) {
      return res
        .status(400)
        .json({ success: false, message: "You already have a pending verification request" });
    }

    const verification = await Verification.create({
      user: req.user._id,
      documentType,
      documentUrl: privateRef,
    });

    await User.findByIdAndUpdate(req.user._id, { verificationStatus: "pending" });

    return res.status(201).json({
      success: true,
      message: "Verification submitted successfully",
      data: {
        verification: {
          _id: verification._id,
          documentType: verification.documentType,
          status: verification.status,
          submittedAt: verification.submittedAt,
        },
      },
    });
  } catch (error) {
    console.error("[Users] submitVerification error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to submit verification" });
  }
};

module.exports = {
  getProfile,
  updateProfile,
  getSavedListings,
  toggleSaveListing,
  getMyListings,
  submitVerification,
};
