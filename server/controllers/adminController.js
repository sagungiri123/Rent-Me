const User = require("../models/User");
const Listing = require("../models/Listing");
const Verification = require("../models/Verification");

// GET /api/admin/verifications - Pending owner verifications
const getVerifications = async (req, res) => {
  try {
    const { status = "pending" } = req.query;
    const verifications = await Verification.find({ status }).populate("user", "name email phone role").sort({ submittedAt: -1 });
    res.status(200).json({ success: true, data: { verifications } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to get verifications", error: error.message });
  }
};

// PUT /api/admin/verifications/:id - Approve/reject owner verification
const reviewVerification = async (req, res) => {
  try {
    const { status, reviewNotes } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'" });
    }

    const verification = await Verification.findById(req.params.id);
    if (!verification) return res.status(404).json({ success: false, message: "Verification not found" });

    verification.status = status;
    verification.reviewedBy = req.user._id;
    verification.reviewNotes = reviewNotes || "";
    verification.reviewedAt = new Date();
    await verification.save();

    // Update user verification status
    await User.findByIdAndUpdate(verification.user, {
      verificationStatus: status,
      isVerified: status === "approved",
    });

    res.status(200).json({ success: true, message: `Verification ${status}`, data: { verification } });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to review verification", error: error.message });
  }
};

// GET /api/admin/listings - All listings for admin review
const getAdminListings = async (req, res) => {
  try {
    const { status = "pending", page = 1, limit = 20 } = req.query;
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

// PUT /api/admin/listings/:id/status - Approve/reject listing
const reviewListing = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'" });
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

// GET /api/admin/users - All users
const getUsers = async (req, res) => {
  try {
    const { role, page = 1, limit = 20 } = req.query;
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

// PUT /api/admin/users/:id/suspend - Suspend/unsuspend user
const toggleSuspendUser = async (req, res) => {
  try {
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

// GET /api/admin/analytics - Platform stats
const getAnalytics = async (req, res) => {
  try {
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
