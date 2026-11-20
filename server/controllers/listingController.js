const Listing = require("../models/Listing");
const { isDbConnected } = require("../config/db");
const memory = require("../config/memoryStore");

const toPublicFileUrl = (file) => {
  if (!file) return "";
  if (file.location) return file.location;
  if (file.filename) return `/uploads/${file.filename}`;
  return file.path || "";
};

const createListing = async (req, res) => {
  try {
    if (req.user.verificationStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Your identity must be verified before creating listings",
      });
    }

    const listingData = {
      ...req.body,
      owner: req.user._id,
      status: "pending",
    };

    if (req.files && req.files.length > 0) {
      listingData.photos = req.files.map(toPublicFileUrl);
    }

    if (typeof req.body.location === "string") {
      listingData.location = JSON.parse(req.body.location);
    }

    if (typeof req.body.amenities === "string") {
      listingData.amenities = JSON.parse(req.body.amenities);
    }

    if (listingData.rent !== undefined) listingData.rent = Number(listingData.rent);
    if (listingData.deposit !== undefined) listingData.deposit = Number(listingData.deposit);

    if (!isDbConnected()) {
      if (!listingData.title || !listingData.description || !listingData.roomType || !listingData.location?.district) {
        return res.status(400).json({
          success: false,
          message: "Title, description, room type, and location district are required",
        });
      }

      const nowIso = new Date().toISOString();
      const newListing = {
        _id: memory.genId(),
        owner: req.user._id,
        title: listingData.title.trim(),
        description: listingData.description.trim(),
        roomType: listingData.roomType,
        rent: Number(listingData.rent) || 0,
        deposit: Number(listingData.deposit) || 0,
        location: {
          district: listingData.location.district,
          area: (listingData.location.area || "").trim(),
          address: (listingData.location.address || "").trim(),
          nearbyCollege: (listingData.location.nearbyCollege || "").trim(),
          distanceToCollege:
            listingData.location.distanceToCollege !== undefined && listingData.location.distanceToCollege !== ""
              ? Number(listingData.location.distanceToCollege)
              : undefined,
        },
        amenities: Array.isArray(listingData.amenities) ? listingData.amenities : [],
        photos:
          listingData.photos && listingData.photos.length > 0
            ? listingData.photos
            : ["/assets/aistudio/9303aad1-a51d-4e47-843e-516186d2bcd4_71268c90.jpeg"],
        rules: (listingData.rules || "").trim(),
        availableFrom: listingData.availableFrom || nowIso,
        isAvailable: true,
        status: "pending",
        views: 0,
        contactRequests: 0,
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

    res.status(201).json({
      success: true,
      message: "Listing created and submitted for review",
      data: { listing },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create listing",
      error: error.message,
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
      page = 1,
      limit = 12,
    } = req.query;

    if (!isDbConnected()) {
      let filtered = memory.listings.filter((l) => l.status === "approved");

      if (available !== "false") {
        filtered = filtered.filter((l) => l.isAvailable === true);
      }
      if (district) {
        filtered = filtered.filter((l) => l.location.district === district);
      }
      if (area) {
        const re = new RegExp(area, "i");
        filtered = filtered.filter(
          (l) =>
            re.test(l.location.area) ||
            re.test(l.title) ||
            re.test(l.location.address || "") ||
            re.test(l.location.nearbyCollege || "")
        );
      }
      if (minRent) {
        filtered = filtered.filter((l) => l.rent >= Number(minRent));
      }
      if (maxRent) {
        filtered = filtered.filter((l) => l.rent <= Number(maxRent));
      }
      if (roomType) {
        filtered = filtered.filter((l) => l.roomType === roomType);
      }
      if (amenities) {
        const amenityList = amenities.split(",").filter(Boolean);
        filtered = filtered.filter((l) => amenityList.every((a) => (l.amenities || []).includes(a)));
      }
      if (nearbyCollege) {
        const re = new RegExp(nearbyCollege, "i");
        filtered = filtered.filter((l) => re.test(l.location.nearbyCollege || ""));
      }

      filtered = [...filtered].sort((a, b) => {
        if (sort === "price_asc") return a.rent - b.rent;
        if (sort === "price_desc") return b.rent - a.rent;
        if (sort === "popular") return (b.views || 0) - (a.views || 0);
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      const total = filtered.length;
      const pageNum = Number(page);
      const limitNum = Number(limit);
      const skip = (pageNum - 1) * limitNum;
      const paged = filtered.slice(skip, skip + limitNum).map((l) => memory.populateOwner(l));

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

    if (district) {
      query["location.district"] = district;
    }

    if (area) {
      query["location.area"] = { $regex: area, $options: "i" };
    }

    if (minRent || maxRent) {
      query.rent = {};
      if (minRent) query.rent.$gte = Number(minRent);
      if (maxRent) query.rent.$lte = Number(maxRent);
    }

    if (roomType) {
      query.roomType = roomType;
    }

    if (amenities) {
      const amenityList = amenities.split(",");
      query.amenities = { $all: amenityList };
    }

    if (nearbyCollege) {
      query["location.nearbyCollege"] = { $regex: nearbyCollege, $options: "i" };
    }

    let sortOption = { createdAt: -1 };
    if (sort === "price_asc") sortOption = { rent: 1 };
    else if (sort === "price_desc") sortOption = { rent: -1 };
    else if (sort === "popular") sortOption = { views: -1 };

    const skip = (Number(page) - 1) * Number(limit);

    const [listings, total] = await Promise.all([
      Listing.find(query)
        .populate("owner", "name phone avatar")
        .sort(sortOption)
        .skip(skip)
        .limit(Number(limit)),
      Listing.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: {
        listings,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch listings",
      error: error.message,
    });
  }
};

const getListing = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const listing = memory.listings.find((l) => l._id === req.params.id);
      if (!listing) {
        return res.status(404).json({
          success: false,
          message: "Listing not found",
        });
      }
      listing.views = (listing.views || 0) + 1;
      return res.status(200).json({
        success: true,
        data: { listing: memory.populateOwner(listing, true) },
      });
    }

    const listing = await Listing.findById(req.params.id).populate(
      "owner",
      "name phone email avatar"
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    listing.views += 1;
    await listing.save();

    res.status(200).json({
      success: true,
      data: { listing },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch listing",
      error: error.message,
    });
  }
};

const updateListing = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const idx = memory.listings.findIndex((l) => l._id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }
      const existing = memory.listings[idx];
      if (existing.owner.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "Not authorized to update this listing",
        });
      }

      const updateData = { ...req.body };
      if (typeof req.body.location === "string") {
        updateData.location = JSON.parse(req.body.location);
      }
      if (typeof req.body.amenities === "string") {
        updateData.amenities = JSON.parse(req.body.amenities);
      }
      if (updateData.rent !== undefined) updateData.rent = Number(updateData.rent);
      if (updateData.deposit !== undefined) updateData.deposit = Number(updateData.deposit);

      if (req.files && req.files.length > 0) {
        const newPhotos = req.files.map(toPublicFileUrl);
        updateData.photos = [...(existing.photos || []), ...newPhotos];
      }

      const updated = {
        ...existing,
        ...updateData,
        location: updateData.location ? { ...existing.location, ...updateData.location } : existing.location,
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
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this listing",
      });
    }

    const updateData = { ...req.body };

    if (typeof req.body.location === "string") {
      updateData.location = JSON.parse(req.body.location);
    }

    if (typeof req.body.amenities === "string") {
      updateData.amenities = JSON.parse(req.body.amenities);
    }

    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map(toPublicFileUrl);
      updateData.photos = [...(listing.photos || []), ...newPhotos];
    }

    updateData.status = "pending";

    listing = await Listing.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: "Listing updated and resubmitted for review",
      data: { listing },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to update listing",
      error: error.message,
    });
  }
};

const toggleAvailability = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const listing = memory.listings.find((l) => l._id === req.params.id);
      if (!listing) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }
      if (listing.owner.toString() !== req.user._id.toString()) {
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
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to modify this listing",
      });
    }

    listing.isAvailable = !listing.isAvailable;
    await listing.save();

    res.status(200).json({
      success: true,
      message: `Listing marked as ${listing.isAvailable ? "available" : "unavailable"}`,
      data: { listing },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to toggle availability",
      error: error.message,
    });
  }
};

const deleteListing = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const idx = memory.listings.findIndex((l) => l._id === req.params.id);
      if (idx === -1) {
        return res.status(404).json({ success: false, message: "Listing not found" });
      }
      const listing = memory.listings[idx];
      if (listing.owner.toString() !== req.user._id.toString() && req.user.role !== "admin") {
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
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    if (
      listing.owner.toString() !== req.user._id.toString() &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to delete this listing",
      });
    }

    await Listing.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: "Listing deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to delete listing",
      error: error.message,
    });
  }
};

const revealContact = async (req, res) => {
  try {
    if (!isDbConnected()) {
      const listing = memory.listings.find((l) => l._id === req.params.id);
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
            phone: owner?.phone || "+977-9851123456",
            email: owner?.email || "owner@rentme.com",
          },
        },
      });
    }

    const listing = await Listing.findById(req.params.id).populate(
      "owner",
      "name phone email"
    );

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    listing.contactRequests += 1;
    await listing.save();

    res.status(200).json({
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
    res.status(500).json({
      success: false,
      message: "Failed to reveal contact",
      error: error.message,
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
