const User = require("../models/User");
const Listing = require("../models/Listing");
const Verification = require("../models/Verification");
const { isDbConnected } = require("../config/db");
const memory = require("../config/memoryStore");

const toPublicFileUrl = (file) => {
  if (!file) return "";
  if (file.location) return file.location;
  if (file.filename) return `/uploads/${file.filename}`;
  return file.path || "";
};

const getProfile = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const user = memory.users.find((u) => u._id === req.user._id);
      return res.status(200).json({ success: true, data: { user: memory.sanitizeUser(user) } });
    }
    const user = await User.findById(req.user._id);
    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get profile", error: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const allowedFields = ["name", "phone", "collegeName", "avatar"];
    const updates = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });
    if (req.file) updates.avatar = toPublicFileUrl(req.file);

    if (!isDbConnected()) {
      const user = memory.users.find((u) => u._id === req.user._id);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      Object.assign(user, updates, { updatedAt: new Date().toISOString() });
      return res.status(200).json({ success: true, message: "Profile updated", data: { user: memory.sanitizeUser(user) } });
    }

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: "Profile updated", data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update profile", error: error.message });
  }
};

const getSavedListings = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const user = memory.users.find((u) => u._id === req.user._id);
      const saved = (user?.savedListings || [])
        .map((id) => memory.listings.find((l) => l._id === id))
        .filter(Boolean)
        .map((l) => memory.populateOwner(l));
      return res.status(200).json({ success: true, data: { listings: saved } });
    }

    const user = await User.findById(req.user._id).populate({
      path: "savedListings",
      populate: { path: "owner", select: "name phone avatar" },
    });
    res.status(200).json({ success: true, data: { listings: user.savedListings } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get saved listings", error: error.message });
  }
};

const toggleSaveListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!isDbConnected()) {
      const listing = memory.listings.find((l) => l._id === listingId);
      if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

      const user = memory.users.find((u) => u._id === req.user._id);
      if (!Array.isArray(user.savedListings)) user.savedListings = [];
      const idx = user.savedListings.indexOf(listingId);

      if (idx > -1) {
        user.savedListings.splice(idx, 1);
        return res.status(200).json({ success: true, message: "Listing removed from saved", data: { saved: false } });
      } else {
        user.savedListings.push(listingId);
        return res.status(200).json({ success: true, message: "Listing saved", data: { saved: true } });
      }
    }

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

    const user = await User.findById(req.user._id);
    const savedIndex = user.savedListings.indexOf(listingId);

    if (savedIndex > -1) {
      user.savedListings.splice(savedIndex, 1);
      await user.save();
      res.status(200).json({ success: true, message: "Listing removed from saved", data: { saved: false } });
    } else {
      user.savedListings.push(listingId);
      await user.save();
      res.status(200).json({ success: true, message: "Listing saved", data: { saved: true } });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to toggle save", error: error.message });
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
    res.status(200).json({ success: true, data: { listings } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get your listings", error: error.message });
  }
};

const submitVerification = async (req, res) => {
  try {
    const { documentType } = req.body;
    if (!documentType || !["citizenship", "ownership_proof", "college_id"].includes(documentType)) {
      return res.status(400).json({ success: false, message: "A valid document type is required" });
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: "A verification document is required" });
    }

    const documentUrl = toPublicFileUrl(req.file);
    if (!documentUrl) {
      return res.status(500).json({ success: false, message: "Failed to upload verification document" });
    }

    if (!isDbConnected()) {
      const existingPending = memory.verifications.find(
        (v) => v.user === req.user._id && v.status === "pending"
      );
      if (existingPending) {
        return res.status(400).json({ success: false, message: "You already have a pending verification request" });
      }

      const nowIso = new Date().toISOString();
      const verification = {
        _id: memory.genId(),
        user: req.user._id,
        documentType,
        documentUrl,
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
        data: { verification },
      });
    }

    const existingPending = await Verification.findOne({ user: req.user._id, status: "pending" });
    if (existingPending) {
      return res.status(400).json({ success: false, message: "You already have a pending verification request" });
    }

    const verification = await Verification.create({
      user: req.user._id,
      documentType,
      documentUrl,
    });

    await User.findByIdAndUpdate(req.user._id, { verificationStatus: "pending" });

    res.status(201).json({ success: true, message: "Verification submitted successfully", data: { verification } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to submit verification", error: error.message });
  }
};

module.exports = { getProfile, updateProfile, getSavedListings, toggleSaveListing, getMyListings, submitVerification };
