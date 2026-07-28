const mongoose = require("mongoose");

const listingSchema = new mongoose.Schema(
  {
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: [true, "Listing title is required"],
      trim: true,
      maxlength: [100, "Title cannot exceed 100 characters"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },
    roomType: {
      type: String,
      enum: ["single", "double", "flat", "shared"],
      required: [true, "Room type is required"],
    },
    rent: {
      type: Number,
      required: [true, "Monthly rent is required"],
      min: [0, "Rent cannot be negative"],
    },
    deposit: {
      type: Number,
      default: 0,
      min: [0, "Deposit cannot be negative"],
    },
    location: {
      district: {
        type: String,
        enum: ["Kathmandu", "Lalitpur", "Bhaktapur"],
        required: [true, "District is required"],
      },
      area: {
        type: String,
        required: [true, "Area is required"],
        trim: true,
      },
      address: {
        type: String,
        required: [true, "Address is required"],
        trim: true,
      },
      coordinates: {
        lat: { type: Number },
        lng: { type: Number },
      },
      nearbyCollege: {
        type: String,
        trim: true,
      },
      distanceToCollege: {
        type: Number, // in kilometers
        min: 0,
      },
    },
    amenities: [
      {
        type: String,
        enum: [
          "wifi",
          "parking",
          "kitchen",
          "bathroom_attached",
          "hot_water",
          "laundry",
          "furnishing",
          "balcony",
          "rooftop",
          "garden",
          "cctv",
          "generator_backup",
          "water_tank",
        ],
      },
    ],
    photos: [
      {
        type: String, // Cloudinary URLs
      },
    ],
    rules: {
      type: String,
      maxlength: [500, "Rules cannot exceed 500 characters"],
    },
    availableFrom: {
      type: Date,
      default: Date.now,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: {
      type: String,
    },
    views: {
      type: Number,
      default: 0,
    },
    contactRequests: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for search performance
listingSchema.index({ "location.district": 1, rent: 1, roomType: 1 });
listingSchema.index({ "location.area": 1 });
listingSchema.index({ status: 1, isAvailable: 1 });
listingSchema.index({ owner: 1 });

module.exports = mongoose.model("Listing", listingSchema);
