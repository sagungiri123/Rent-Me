const path = require("path");
const fs = require("fs");
const User = require("../models/User");
const Listing = require("../models/Listing");
const Verification = require("../models/Verification");
const { isDbConnected } = require("../config/db");
const memory = require("../config/memoryStore");
const { privateVerificationsDir } = require("../middleware/upload");
const { sanitizeText, isValidObjectId } = require("../utils/sanitize");

const VALID_VERIFICATION_FILTERS = new Set(["pending", "approved", "rejected", "all"]);
const VALID_LISTING_FILTERS = new Set(["pending", "approved", "rejected", "all"]);
const VALID_ROLE_FILTERS = new Set(["student", "owner", "admin"]);

function mapVerificationDocumentUrl(v) {
  if (typeof v.documentUrl === "string" && v.documentUrl.startsWith("private:")) {
    return {
      ...v,
      documentUrl: `/api/admin/verifications/${v._id}/document`,
      isPrivateDocument: true,
    };
  }
  return v;
}

const getVerifications = async (req, res) => {
  try {
    const rawStatus = String(req.query.status || "pending");
    const status = VALID_VERIFICATION_FILTERS.has(rawStatus) ? rawStatus : "pending";

    if (!isDbConnected()) {
      const items = memory.verifications
        .filter((v) => (status === "all" ? true : v.status === status))
        .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
        .map((v) => mapVerificationDocumentUrl(memory.populateUserForVerification(v)));
      return res.status(200).json({ success: true, data: { verifications: items } });
    }

    const query = status === "all" ? {} : { status };
    const docs = await Verification.find(query)
      .populate("user", "name email phone role")
      .sort({ submittedAt: -1 })
      .lean();

    const verifications = docs.map(mapVerificationDocumentUrl);
    return res.status(200).json({ success: true, data: { verifications } });
  } catch (error) {
    console.error("[Admin] getVerifications error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch verifications" });
  }
};

/**
 * Authenticated admin-only stream for private owner verification documents.
 */
const getVerificationDocument = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    const verification = isDbConnected()
      ? await Verification.findById(req.params.id)
      : memory.verifications.find((v) => v._id === req.params.id);

    if (!verification || typeof verification.documentUrl !== "string") {
      return res.status(404).json({ success: false, message: "Document not found" });
    }

    if (!verification.documentUrl.startsWith("private:")) {
      return res.status(404).json({ success: false, message: "Document not stored locally" });
    }

    const safeFileName = path.basename(verification.documentUrl.slice("private:".length));
    const resolvedPath = path.resolve(privateVerificationsDir, safeFileName);

    // Prevent path traversal outside privateVerificationsDir
    if (!resolvedPath.startsWith(path.resolve(privateVerificationsDir) + path.sep)) {
      return res.status(403).json({ success: false, message: "Invalid document path" });
    }

    if (!fs.existsSync(resolvedPath)) {
      return res.status(404).json({ success: false, message: "Document file not found" });
    }

    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, no-store");
    return res.sendFile(resolvedPath);
  } catch (error) {
    console.error("[Admin] getVerificationDocument error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load document" });
  }
};

const reviewVerification = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Verification not found" });
    }

    const { status } = req.body || {};
    const reviewNotes = sanitizeText(req.body?.reviewNotes || "", 500);

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'" });
    }

    if (!isDbConnected()) {
      const verification = memory.verifications.find((v) => v._id === req.params.id);
      if (!verification) return res.status(404).json({ success: false, message: "Verification not found" });

      verification.status = status;
      verification.reviewedBy = req.user._id;
      verification.reviewNotes = reviewNotes;
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
        data: {
          verification: mapVerificationDocumentUrl(memory.populateUserForVerification(verification)),
        },
      });
    }

    const verification = await Verification.findById(req.params.id);
    if (!verification) return res.status(404).json({ success: false, message: "Verification not found" });

    verification.status = status;
    verification.reviewedBy = req.user._id;
    verification.reviewNotes = reviewNotes;
    verification.reviewedAt = new Date();
    await verification.save();

    await User.findByIdAndUpdate(verification.user, {
      verificationStatus: status,
      isVerified: status === "approved",
    });

    return res.status(200).json({
      success: true,
      message: `Verification ${status}`,
      data: { verification },
    });
  } catch (error) {
    console.error("[Admin] reviewVerification error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to review verification" });
  }
};

const getAdminListings = async (req, res) => {
  try {
    const rawStatus = String(req.query.status || "pending");
    const status = VALID_LISTING_FILTERS.has(rawStatus) ? rawStatus : "pending";
    const pageNum = Math.max(1, Math.min(1000, parseInt(String(req.query.page || "1"), 10) || 1));
    const limitNum = Math.max(1, Math.min(50, parseInt(String(req.query.limit || "20"), 10) || 20));

    if (!isDbConnected()) {
      let filtered = status === "all" ? [...memory.listings] : memory.listings.filter((l) => l.status === status);
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const total = filtered.length;
      const skip = (pageNum - 1) * limitNum;
      const paged = filtered
        .slice(skip, skip + limitNum)
        .map((l) => memory.populateOwner(l, { includeContact: true }));

      return res.status(200).json({
        success: true,
        data: {
          listings: paged,
          pagination: { page: pageNum, limit: limitNum, total, pages: Math.max(1, Math.ceil(total / limitNum)) },
        },
      });
    }

    const query = status === "all" ? {} : { status };
    const skip = (pageNum - 1) * limitNum;

    const [listings, total] = await Promise.all([
      Listing.find(query).populate("owner", "name email phone").sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      Listing.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        listings,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.max(1, Math.ceil(total / limitNum)) },
      },
    });
  } catch (error) {
    console.error("[Admin] getAdminListings error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch listings" });
  }
};

const reviewListing = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const { status } = req.body || {};
    const rejectionReason = sanitizeText(req.body?.rejectionReason || "", 300);

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, message: "Status must be 'approved' or 'rejected'" });
    }

    if (!isDbConnected()) {
      const listing = memory.listings.find((l) => l._id === req.params.id);
      if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

      listing.status = status;
      listing.rejectionReason =
        status === "rejected" ? rejectionReason || "Does not meet listing guidelines" : undefined;
      listing.updatedAt = new Date().toISOString();

      return res.status(200).json({
        success: true,
        message: `Listing ${status}`,
        data: { listing: memory.populateOwner(listing, { includeContact: true }) },
      });
    }

    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { status, rejectionReason: status === "rejected" ? rejectionReason : undefined },
      { new: true }
    );

    if (!listing) return res.status(404).json({ success: false, message: "Listing not found" });

    return res.status(200).json({ success: true, message: `Listing ${status}`, data: { listing } });
  } catch (error) {
    console.error("[Admin] reviewListing error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to review listing" });
  }
};

const getUsers = async (req, res) => {
  try {
    const rawRole = typeof req.query.role === "string" ? req.query.role : "";
    const role = VALID_ROLE_FILTERS.has(rawRole) ? rawRole : "";
    const pageNum = Math.max(1, Math.min(1000, parseInt(String(req.query.page || "1"), 10) || 1));
    const limitNum = Math.max(1, Math.min(50, parseInt(String(req.query.limit || "20"), 10) || 20));

    if (!isDbConnected()) {
      let filtered = role ? memory.users.filter((u) => u.role === role) : [...memory.users];
      filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const total = filtered.length;
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
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum),
      User.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        users,
        pagination: { page: pageNum, limit: limitNum, total, pages: Math.max(1, Math.ceil(total / limitNum)) },
      },
    });
  } catch (error) {
    console.error("[Admin] getUsers error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};

const toggleSuspendUser = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ success: false, message: "Cannot suspend your own account" });
    }

    if (!isDbConnected()) {
      const user = memory.users.find((u) => u._id === req.params.id);
      if (!user) return res.status(404).json({ success: false, message: "User not found" });
      if (user.role === "admin") {
        return res.status(400).json({ success: false, message: "Cannot suspend admin accounts" });
      }
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
    if (user.role === "admin") {
      return res.status(400).json({ success: false, message: "Cannot suspend admin accounts" });
    }

    user.isSuspended = !user.isSuspended;
    await user.save();

    return res.status(200).json({
      success: true,
      message: `User ${user.isSuspended ? "suspended" : "unsuspended"}`,
      data: { user },
    });
  } catch (error) {
    console.error("[Admin] toggleSuspendUser error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to update account status" });
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

    const [
      totalUsers,
      totalStudents,
      totalOwners,
      totalListings,
      approvedListings,
      pendingListings,
      pendingVerifications,
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "owner" }),
      Listing.countDocuments(),
      Listing.countDocuments({ status: "approved" }),
      Listing.countDocuments({ status: "pending" }),
      Verification.countDocuments({ status: "pending" }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        analytics: {
          totalUsers,
          totalStudents,
          totalOwners,
          totalListings,
          approvedListings,
          pendingListings,
          pendingVerifications,
        },
      },
    });
  } catch (error) {
    console.error("[Admin] getAnalytics error:", error.message);
    return res.status(500).json({ success: false, message: "Failed to load analytics" });
  }
};

module.exports = {
  getVerifications,
  getVerificationDocument,
  reviewVerification,
  getAdminListings,
  reviewListing,
  getUsers,
  toggleSuspendUser,
  getAnalytics,
};
