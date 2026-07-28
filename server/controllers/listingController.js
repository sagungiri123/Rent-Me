const Listing = require("../models/Listing");
const User = require("../models/User");

/**
 * @desc    Create a new listing
 * @route   POST /api/listings
 * @access  Private (Owner - verified only)
 */
const createListing = async (req, res) => {
  try {
    // Check owner is verified
    if (req.user.verificationStatus !== "approved") {
      return res.status(403).json({
        success: false,
        message: "Your identity must be verified before creating listings",
      });
    }

    const listingData = {
      ...req.body,
      owner: req.user._id,
      status: "pending", // All listings start as pending
    };

    // Handle file uploads
    if (req.files && req.files.length > 0) {
      listingData.photos = req.files.map((file) => file.path || file.location);
    }

    // Parse location if sent as JSON string
    if (typeof req.body.location === "string") {
      listingData.location = JSON.parse(req.body.location);
    }

    // Parse amenities if sent as JSON string
    if (typeof req.body.amenities === "string") {
      listingData.amenities = JSON.parse(req.body.amenities);
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

/**
 * @desc    Get all approved, available listings with search/filter
 * @route   GET /api/listings
 * @access  Public
 */
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

    // Build filter query
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

    // Build sort
    let sortOption = { createdAt: -1 }; // Default: newest first
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

/**
 * @desc    Get single listing by ID
 * @route   GET /api/listings/:id
 * @access  Public
 */
const getListing = async (req, res) => {
  try {
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

    // Increment view count
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

/**
 * @desc    Update listing
 * @route   PUT /api/listings/:id
 * @access  Private (Owner of the listing)
 */
const updateListing = async (req, res) => {
  try {
    let listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Ensure user owns this listing
    if (listing.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this listing",
      });
    }

    const updateData = { ...req.body };

    // Parse location if sent as JSON string
    if (typeof req.body.location === "string") {
      updateData.location = JSON.parse(req.body.location);
    }

    // Parse amenities if sent as JSON string
    if (typeof req.body.amenities === "string") {
      updateData.amenities = JSON.parse(req.body.amenities);
    }

    // Handle new photos
    if (req.files && req.files.length > 0) {
      const newPhotos = req.files.map((file) => file.path || file.location);
      updateData.photos = [...(listing.photos || []), ...newPhotos];
    }

    // Edited listings go back to pending review
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

/**
 * @desc    Toggle listing availability
 * @route   PATCH /api/listings/:id/availability
 * @access  Private (Owner of the listing)
 */
const toggleAvailability = async (req, res) => {
  try {
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

/**
 * @desc    Delete listing
 * @route   DELETE /api/listings/:id
 * @access  Private (Owner of listing or Admin)
 */
const deleteListing = async (req, res) => {
  try {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
      return res.status(404).json({
        success: false,
        message: "Listing not found",
      });
    }

    // Allow owner or admin to delete
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

/**
 * @desc    Reveal owner contact (increment contact count)
 * @route   POST /api/listings/:id/contact
 * @access  Private (Student)
 */
const revealContact = async (req, res) => {
  try {
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

    // Increment contact request count
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
