const mongoose = require("mongoose");

const verificationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    documentType: {
      type: String,
      enum: ["citizenship", "ownership_proof", "college_id"],
      required: [true, "Document type is required"],
    },
    documentUrl: {
      type: String,
      required: [true, "Document URL is required"],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    reviewNotes: {
      type: String,
      maxlength: [500, "Review notes cannot exceed 500 characters"],
    },
    submittedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

verificationSchema.index({ status: 1 });
verificationSchema.index({ user: 1 });

module.exports = mongoose.model("Verification", verificationSchema);
