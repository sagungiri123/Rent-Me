const Listing = require("../models/Listing");
const { isDbConnected } = require("../config/db");
const memory = require("../config/memoryStore");
const {
  VALID_DISTRICTS,
  VALID_ROOM_TYPES,
  VALID_AMENITIES,
  escapeRegex,
  isValidObjectId,
  pickAllowedListingFields,
} = require("../utils/sanitize");

const toPublicFileUrl = (file) => {
  if (!file) return "";
  if (file.filename) return `/uploads/${file.filename}`;
  return "";
};

const createListing = async (req, res) => {
  try {
    if (req.user.verificationStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Your identity must be verified before creating listings",
      });
    }

    const parsed = pickAllowedListingFields(req.body || {}, { partial: false });
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const uploadedPhotos =
      Array.isArray(req.files) && req.files.length > 0
        ? req.files.map(toPublicFileUrl).filter(Boolean)
        : [];

    const listingData = {
      ...parsed.data,
      owner: req.user._id,
      status: "pending",
      isAvailable: true,
      views: 0,
      contactRequests: 0,
      photos:
        uploadedPhotos.length > 0
          ? uploadedPhotos
          : ["/assets/aistudio/9303aad1-a51d-4e47-843e-516186d2bcd4_71268c90.jpeg"],
    };

    if (!isDbConnected()) {
      const nowIso = new Date().toISOString();
      const newListing = {
        _id: memory.genId(),
        ...listingData,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      memory.listings.unshift(newListing);
      return res.status(201).json({
        success: true,
        message: "Listing created and submitted for review",
        data: { listing: newListing },
      });
    }

    const listing = await Listing.create(listingData);

    return res.status(201).json({
      success: true,
      message: "Listing created and submitted for review",
      data: { listing },
    });
  } catch (error) {
    console.error("[Listings] create error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to create listing",
    });
  }
};

const getListings = async (req, res) => {
  try {
    const {
      district,
      area,
      minRent,
      maxRent,
      roomType,
      amenities,
      nearbyCollege,
      available,
      sort,
      page = "1",
      limit = "12",
    } = req.query;

    const pageNum = Math.max(1, Math.min(1000, parseInt(String(page), 10) || 1));
    const limitNum = Math.max(1, Math.min(50, parseInt(String(limit), 10) || 12));

    const safeDistrict =
      typeof district === "string" && VALID_DISTRICTS.has(district) ? district : "";
    const safeRoomType =
      typeof roomType === "string" && VALID_ROOM_TYPES.has(roomType) ? roomType : "";
    const safeArea = typeof area === "string" ? escapeRegex(area.trim()) : "";
    const safeCollege =
      typeof nearbyCollege === "string" ? escapeRegex(nearbyCollege.trim()) : "";

    const minRentNum = minRent !== undefined && minRent !== "" ? Number(minRent) : NaN;
    const maxRentNum = maxRent !== undefined && maxRent !== "" ? Number(maxRent) : NaN;

    const safeAmenities =
      typeof amenities === "string"
        ? amenities
            .split(",")
            .map((a) => a.trim())
            .filter((a) => VALID_AMENITIES.has(a))
        : [];

    if (!isDbConnected()) {
      let filtered = memory.listings.filter((l) => l.status === "approved");

      if (available !== "false") {
        filtered = filtered.filter((l) => l.isAvailable === true);
      }
      if (safeDistrict) {
        filtered = filtered.filter((l) => l.location.district === safeDistrict);
      }
      if (safeArea) {
        const re = new RegExp(safeArea, "i");
        filtered = filtered.filter(
          (l) =>
            re.test(l.location.area) ||
            re.test(l.title) ||
            re.test(l.location.address || "") ||
            re.test(l.location.nearbyCollege || "")
        );
      }
      if (Number.isFinite(minRentNum) && minRentNum >= 0) {
        filtered = filtered.filter((l) => l.rent >= minRentNum);
      }
      if (Number.isFinite(maxRentNum) && maxRentNum >= 0) {
        filtered = filtered.filter((l) => l.rent <= maxRentNum);
      }
      if (safeRoomType) {
        filtered = filtered.filter((l) => l.roomType === safeRoomType);
      }
      if (safeAmenities.length > 0) {
        filtered = filtered.filter((l) =>
          safeAmenities.every((a) => (l.amenities || []).includes(a))
        );
      }
      if (safeCollege) {
        const re = new RegExp(safeCollege, "i");
        filtered = filtered.filter((l) => re.test(l.location.nearbyCollege || ""));
      }

      filtered = [...filtered].sort((a, b) => {
        if (sort === "price_asc") return a.rent - b.rent;
        if (sort === "price_desc") return b.rent - a.rent;
        if (sort === "popular") return (b.views || 0) - (a.views || 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const total = filtered.length;
      const skip = (pageNum - 1) * limitNum;
      // Never expose owner phone/email on public listing feed
      const paged = filtered
        .slice(skip, skip + limitNum)
        .map((l) => memory.populateOwner(l, { includeContact: false }));

      return res.status(200).json({
        success: true,
        data: {
          listings: paged,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total,
            pages: Math.max(1, Math.ceil(total / limitNum)),
          },
        },
      });
    }

    const query = { status: "approved" };

    if (available !== "false") {
      query.isAvailable = true;
    }
    if (safeDistrict) {
      query["location.district"] = safeDistrict;
    }
    if (safeArea) {
      query["location.area"] = { $regex: safeArea, $options: "i" };
    }
    if ((Number.isFinite(minRentNum) && minRentNum >= 0) || (Number.isFinite(maxRentNum) && maxRentNum >= 0)) {
      query.rent = {};
      if (Number.isFinite(minRentNum) && minRentNum >= 0) query.rent.$gte = minRentNum;
      if (Number.isFinite(maxRentNum) && maxRentNum >= 0) query.rent.$lte = maxRentNum;
    }
    if (safeRoomType) {
      query.roomType = safeRoomType;
    }
    if (safeAmenities.length > 0) {
      query.amenities = { $all: safeAmenities };
    }
    if (safeCollege) {
      query["location.nearbyCollege"] = { $regex: safeCollege, $options: "i" };
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price_asc") sortOption = { rent: 1 };
    else if (sort === "price_desc") sortOption = { rent: -1 };
    else if (sort === "popular") sortOption = { views: -1 };

    const skip = (pageNum - 1) * limitNum;

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate("owner", "name avatar")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum),
      Listing.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        listings,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.max(1, Math.ceil(total / limitNum)),
        },
      },
    });
  } catch (error) {
    console.error("[Listings] getListings error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch listings",
    });
  }
};

const getListing = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const isOwnerOrAdmin = (ownerId) =>
      Boolean(
        req.user &&
          (req.user.role === "admin" || String(ownerId) === String(req.user._id))
      );

    if (!isDbConnected()) {
      const listing = memory.listings.find((l) => l._id === req.params.id);
      if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }
      if (listing.status !== "approved" && !isOwnerOrAdmin(listing.owner)) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }
      listing.views = (listing.views || 0) + 1;
      return res.status(200).json({
        success: true,
        data: {
          listing: memory.populateOwner(listing, {
            includeContact: isOwnerOrAdmin(listing.owner),
          }),
        },
      });
    }

    const rawListing = await Listing.findById(req.params.id);
    if (!rawListing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const canSeePrivate = isOwnerOrAdmin(rawListing.owner);
    if (rawListing.status !== "approved" && !canSeePrivate) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    rawListing.views += 1;
    await rawListing.save();

    const listing = await Listing.findById(req.params.id).populate(
      "owner",
      canSeePrivate ? "name phone email avatar" : "name avatar"
    );

    return res.status(200).json({
      success: true,
      data: { listing },
    });
  } catch (error) {
    console.error("[Listings] getListing error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to fetch listing",
    });
  }
};

const updateListing = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    const parsed = pickAllowedListingFields(req.body || {}, { partial: true });
    if (parsed.error) {
      return res.status(400).json({ success: false, message: parsed.error });
    }

    const newPhotos =
      Array.isArray(req.files) && req.files.length > 0
        ? req.files.map(toPublicFileUrl).filter(Boolean)
        : [];

    if (!isDbConnected()) {
      const idx = memory.listings.findIndex((l) => l._id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }
      const existing = memory.listings[idx];
      if (String(existing.owner) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this listing",
        });
      }

      const updated = {
        ...existing,
        ...parsed.data,
        location: parsed.data.location
          ? { ...existing.location, ...parsed.data.location }
          : existing.location,
        photos:
          newPhotos.length > 0
            ? [...(existing.photos || []), ...newPhotos].slice(0, 8)
            : existing.photos,
        status: "pending",
        rejectionReason: undefined,
        updatedAt: new Date().toISOString(),
      };
      memory.listings[idx] = updated;

      return res.status(200).json({
        success: true,
        message: "Listing updated and resubmitted for review",
        data: { listing: updated },
      });
    }

    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    if (String(listing.owner) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this listing",
      });
    }

    const updateData = {
      ...parsed.data,
      status: "pending",
      rejectionReason: undefined,
    };

    if (newPhotos.length > 0) {
      updateData.photos = [...(listing.photos || []), ...newPhotos].slice(0, 8);
    }

    listing = await Listing.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    return res.status(200).json({
      success: true,
      message: "Listing updated and resubmitted for review",
      data: { listing },
    });
  } catch (error) {
    console.error("[Listings] update error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to update listing",
    });
  }
};

const toggleAvailability = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    if (!isDbConnected()) {
      const listing = memory.listings.find((l) => l._id === req.params.id);
      if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }
      if (String(listing.owner) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to modify this listing",
        });
      }
      listing.isAvailable = !listing.isAvailable;
      listing.updatedAt = new Date().toISOString();
      return res.status(200).json({
        success: true,
        message: `Listing marked as ${listing.isAvailable ? "available" : "unavailable"}`,
        data: { listing },
      });
    }

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    if (String(listing.owner) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this listing",
      });
    }

    listing.isAvailable = !listing.isAvailable;
    await listing.save();

    return res.status(200).json({
      success: true,
      message: `Listing marked as ${listing.isAvailable ? "available" : "unavailable"}`,
      data: { listing },
    });
  } catch (error) {
    console.error("[Listings] toggleAvailability error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to toggle availability",
    });
  }
};

const deleteListing = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    if (!isDbConnected()) {
      const idx = memory.listings.findIndex((l) => l._id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }
      const listing = memory.listings[idx];
      if (String(listing.owner) !== String(req.user._id) && req.user.role !== "admin") {
        return res.status(403).json({
          success: false,
          message: "Not authorized to delete this listing",
        });
      }
      memory.listings.splice(idx, 1);
      memory.users.forEach((u) => {
        if (Array.isArray(u.savedListings)) {
          u.savedListings = u.savedListings.filter((id) => id !== req.params.id);
        }
      });
      return res.status(200).json({
        success: true,
        message: "Listing deleted successfully",
      });
    }

    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    if (String(listing.owner) !== String(req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this listing",
      });
    }

    await Listing.findByIdAndDelete(req.params.id);

    return res.status(200).json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    console.error("[Listings] delete error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to delete listing",
    });
  }
};

const revealContact = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    if (!isDbConnected()) {
      const listing = memory.listings.find(
        (l) => l._id === req.params.id && l.status === "approved"
      );
      if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }
      listing.contactRequests = (listing.contactRequests || 0) + 1;
      const owner = memory.users.find((u) => u._id === listing.owner);
      return res.status(200).json({
        success: true,
        data: {
          contact: {
            name: owner?.name || "Property Owner",
            phone: owner?.phone || "",
            email: owner?.email || "",
          },
        },
      });
    }

    const listing = await Listing.findOne({
      _id: req.params.id,
      status: "approved",
    }).populate("owner", "name phone email");

    if (!listing) {
      return res.status(404).json({ success: false, message: "Listing not found" });
    }

    listing.contactRequests += 1;
    await listing.save();

    return res.status(200).json({
      success: true,
      data: {
        contact: {
          name: listing.owner.name,
          phone: listing.owner.phone,
          email: listing.owner.email,
        },
      },
    });
  } catch (error) {
    console.error("[Listings] revealContact error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to reveal contact",
    });
  }
};

module.exports = {
  createListing,
  getListings,
  getListing,
  updateListing,
  toggleAvailability,
  deleteListing,
  revealContact,
};
