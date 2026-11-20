const User = require("../models/User");
const Listing = require("../models/Listing");
const Verification = require("../models/Verification");
const { isDbConnected } = require("../config/db");
const memory = require("../config/memoryStore");

const getVerifications = async (req, res) => {
  try {
    const { status = "pending" } = req.query;

    if (!isDbConnected()) {
      const items = memory.verifications
        .filter((v) => (status === "all" ? true : v.status === status))
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .map((v) => memory.populateUserForVerification(v));
      return res.status(200).json({ success: true, data: { verifications: items } });
    }

    const query = status === "all" ? {} : { status };
    const verifications = await Verification.find(query).populate("user", "name email phone role").sort({ submittedAt: -1 });
    res.status(200).json({ success: true, data: { verifications } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get verifications", error: error.message });
  }
};

const reviewVerification = async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'" });
    }

    if (!isDbConnected()) {
      const verification = memory.verifications.find((v) => v._id === req.params.id);
      if (!verification) return res.status(404).json({ success: false, message: "Verification not found" });

      verification.status = status;
      verification.reviewedBy = req.user._id;
      verification.reviewNotes = reviewNotes || "";
      verification.reviewedAt = new Date().toISOString();
      verification.updatedAt = verification.reviewedAt;

      const user = memory.users.find((u) => u._id === verification.user);
      if (user) {
        user.verificationStatus = status;
        user.isVerified = status === "approved";
      }

      return res.status(200).json({
        success: true,
        message: `Verification ${status}`,
        data: { verification: memory.populateUserForVerification(verification) },
      });
    }

    const verification = await Verification.findById(req.params.id);
    if (!verification) return res.status(404).json({ success: false, message: "Verification not found" });

    verification.status = status;
    verification.reviewedBy = req.user._id;
    verification.reviewNotes = reviewNotes || "";
    verification.reviewedAt = new Date();
    await verification.save();

    await User.findByIdAndUpdate(verification.user, {
      verificationStatus: status,
      isVerified: status === "approved",
    });

    res.status(200).json({ success: true, message: `Verification ${status}`, data: { verification } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to review verification", error: error.message });
  }
};

const getAdminListings = async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 20 } = req.query;

    if (!isDbConnected()) {
      let filtered = status === "all" ? [...memory.listings] : memory.listings.filter((l) => l.status === status);
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const total = filtered.length;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;
      const paged = filtered.slice(skip, skip + limitNum).map((l) => memory.populateOwner(l, true));

      return res.status(200).json({
        success: true,
        data: {
          listings: paged,
          pagination: { page: pageNum, limit: limitNum, total, pages: Math.max(1, Math.ceil(total / limitNum)) },
        },
      });
    }

    const query = status === "all" ? {} : { status };
    const skip = (Number(page) - 1) * Number(limit);

    const [listings, total] = await Promise.all([
      Listing.find(query).populate("owner", "name email phone").sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Listing.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: { listings, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get listings", error: error.message });
  }
};

const reviewListing = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'" });
    }

    if (!isDbConnected()) {
      const listing = memory.listings.find((l) => l._id === req.params.id);
      if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

      listing.status = status;
      listing.rejectionReason = status === "rejected" ? rejectionReason || "Does not meet listing guidelines" : undefined;
      listing.updatedAt = new Date().toISOString();

      return res.status(200).json({
        success: true,
        message: `Listing ${status}`,
        data: { listing: memory.populateOwner(listing, true) },
      });
    }

    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { status, rejectionReason: status === "rejected" ? rejectionReason : undefined },
      { new: true }
    );

    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

    res.status(200).json({ success: true, message: `Listing ${status}`, data: { listing } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to review listing", error: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;

    if (!isDbConnected()) {
      let filtered = role ? memory.users.filter((u) => u.role === role) : [...memory.users];
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const total = filtered.length;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;
      const paged = filtered.slice(skip, skip + limitNum).map((u) => memory.sanitizeUser(u));

      return res.status(200).json({
        success: true,
        data: {
          users: paged,
          pagination: { page: pageNum, limit: limitNum, total, pages: Math.max(1, Math.ceil(total / limitNum)) },
        },
      });
    }

    const query = role ? { role } : {};
    const skip = (Number(page) - 1) * Number(limit);

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: { users, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / Number(limit)) } },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get users", error: error.message });
  }
};

const toggleSuspendUser = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const user = memory.users.find((u) => u._id === req.params.id);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      if (user.role === "admin") return res.status(400).json({ success: false, message: "Cannot suspend admin accounts" });
      user.isSuspended = !user.isSuspended;
      user.updatedAt = new Date().toISOString();
      return res.status(200).json({
        success: true,
        message: `User ${user.isSuspended ? "suspended" : "unsuspended"}`,
        data: { user: memory.sanitizeUser(user) },
      });
    }

    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: "User not found" });
    if (user.role === "admin") return res.status(400).json({ success: false, message: "Cannot suspend admin accounts" });

    user.isSuspended = !user.isSuspended;
    await user.save();

    res.status(200).json({ success: true, message: `User ${user.isSuspended ? "suspended" : "unsuspended"}`, data: { user } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to toggle suspension", error: error.message });
  }
};

const getAnalytics = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const analytics = {
        totalUsers: memory.users.length,
        totalStudents: memory.users.filter((u) => u.role === "student").length,
        totalOwners: memory.users.filter((u) => u.role === "owner").length,
        totalListings: memory.listings.length,
        approvedListings: memory.listings.filter((l) => l.status === "approved").length,
        pendingListings: memory.listings.filter((l) => l.status === "pending").length,
        pendingVerifications: memory.verifications.filter((v) => v.status === "pending").length,
      };
      return res.status(200).json({ success: true, data: { analytics } });
    }

    const [totalUsers, totalStudents, totalOwners, totalListings, approvedListings, pendingListings, pendingVerifications] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "owner" }),
      Listing.countDocuments(),
      Listing.countDocuments({ status: "approved" }),
      Listing.countDocuments({ status: "pending" }),
      Verification.countDocuments({ status: "pending" }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        analytics: { totalUsers, totalStudents, totalOwners, totalListings, approvedListings, pendingListings, pendingVerifications },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get analytics", error: error.message });
  }
};

module.exports = { getVerifications, reviewVerification, getAdminListings, reviewListing, getUsers, toggleSuspendUser, getAnalytics };
