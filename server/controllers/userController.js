const User = require("../models/User");
const Listing = require("../models/Listing");
const Verification = require("../models/Verification");

const getProfile = async (req, res) => {
  try {
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
    if (req.file) updates.avatar = req.file.path || req.file.location;

    const user = await User.findByIdAndUpdate(req.user._id, updates, { new: true, runValidators: true });
    res.status(200).json({ success: true, message: "Profile updated", data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to update profile", error: error.message });
  }
};

const getSavedListings = async (req, res) => {
  try {
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

    const existingPending = await Verification.findOne({ user: req.user._id, status: "pending" });
    if (existingPending) {
      return res.status(400).json({ success: false, message: "You already have a pending verification request" });
    }

    const documentUrl = req.file.path || req.file.location;
    if (!documentUrl) {
      return res.status(500).json({ success: false, message: "Failed to upload verification document" });
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
