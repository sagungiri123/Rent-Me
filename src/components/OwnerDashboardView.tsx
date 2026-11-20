import React, { useCallback, useEffect, useState } from "react";
import {
  CheckCircle2,
  Clock,
  Edit3,
  ExternalLink,
  Plus,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  ALL_AMENITIES,
  AMENITY_LABELS,
  DISTRICTS,
  DOCUMENT_TYPE_LABELS,
  formatNPR,
  ROOM_TYPE_LABELS,
  type AmenityKey,
  type District,
  type DocumentType,
  type Listing,
  type RoomType,
} from "../types";
import { RoomImage } from "./RoomImage";

interface OwnerDashboardViewProps {
  onOpenListing: (id: string) => void;
  onNotify: (msg: string, tone?: "success" | "error") => void;
}

interface ListingFormState {
  title: string;
  description: string;
  roomType: RoomType;
  rent: string;
  deposit: string;
  district: District;
  area: string;
  address: string;
  nearbyCollege: string;
  distanceToCollege: string;
  amenities: AmenityKey[];
  rules: string;
  availableFrom: string;
}

const EMPTY_FORM: ListingFormState = {
  title: "",
  description: "",
  roomType: "single",
  rent: "",
  deposit: "0",
  district: "Lalitpur",
  area: "",
  address: "",
  nearbyCollege: "",
  distanceToCollege: "",
  amenities: ["wifi", "water_tank"],
  rules: "",
  availableFrom: new Date().toISOString().slice(0, 10),
};

export function OwnerDashboardView({ onOpenListing, onNotify }: OwnerDashboardViewProps) {
  const { user, refreshUser } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  // Verification form state
  const [docType, setDocType] = useState<DocumentType>("citizenship");
  const [docFile, setDocFile] = useState<File | null>(null);
  const [submittingVerification, setSubmittingVerification] = useState(false);

  // Listing create/edit drawer state
  const [showForm, setShowForm] = useState(false);
  const [editingListing, setEditingListing] = useState<Listing | null>(null);
  const [form, setForm] = useState<ListingFormState>(EMPTY_FORM);
  const [photoFiles, setPhotoFiles] = useState<File[]>([]);
  const [savingListing, setSavingListing] = useState(false);

  // Inline delete confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadMyListings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getMyListings();
      setListings(data);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to load listings", "error");
    } finally {
      setLoading(false);
    }
  }, [onNotify]);

  useEffect(() => {
    void loadMyListings();
  }, [loadMyListings]);

  const handleSubmitVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docFile) {
      onNotify("Please attach a citizenship, ownership proof, or ID image.", "error");
      return;
    }
    setSubmittingVerification(true);
    try {
      await api.submitVerification(docType, docFile);
      await refreshUser();
      setDocFile(null);
      onNotify("Verification submitted. An admin will review it shortly.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Verification submission failed", "error");
    } finally {
      setSubmittingVerification(false);
    }
  };

  const openCreateForm = () => {
    setEditingListing(null);
    setForm(EMPTY_FORM);
    setPhotoFiles([]);
    setShowForm(true);
  };

  const openEditForm = (listing: Listing) => {
    setEditingListing(listing);
    setForm({
      title: listing.title,
      description: listing.description,
      roomType: listing.roomType,
      rent: String(listing.rent),
      deposit: String(listing.deposit || 0),
      district: listing.location.district,
      area: listing.location.area,
      address: listing.location.address,
      nearbyCollege: listing.location.nearbyCollege || "",
      distanceToCollege:
        listing.location.distanceToCollege !== undefined
          ? String(listing.location.distanceToCollege)
          : "",
      amenities: [...(listing.amenities || [])],
      rules: listing.rules || "",
      availableFrom: listing.availableFrom
        ? new Date(listing.availableFrom).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
    });
    setPhotoFiles([]);
    setShowForm(true);
  };

  const toggleFormAmenity = (amenity: AmenityKey) => {
    setForm((prev) => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter((a) => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const handleSaveListing = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingListing(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title);
      fd.append("description", form.description);
      fd.append("roomType", form.roomType);
      fd.append("rent", form.rent);
      fd.append("deposit", form.deposit || "0");
      fd.append("rules", form.rules);
      fd.append("availableFrom", form.availableFrom);
      fd.append(
        "location",
        JSON.stringify({
          district: form.district,
          area: form.area,
          address: form.address,
          nearbyCollege: form.nearbyCollege || undefined,
          distanceToCollege: form.distanceToCollege ? Number(form.distanceToCollege) : undefined,
        })
      );
      fd.append("amenities", JSON.stringify(form.amenities));
      photoFiles.slice(0, 8).forEach((file) => {
        fd.append("photos", file);
      });

      if (editingListing) {
        await api.updateListing(editingListing._id, fd);
        onNotify("Listing updated and resubmitted for admin review.", "success");
      } else {
        await api.createListing(fd);
        onNotify("Listing created and submitted for admin review.", "success");
      }

      setShowForm(false);
      setEditingListing(null);
      setPhotoFiles([]);
      await loadMyListings();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to save listing", "error");
    } finally {
      setSavingListing(false);
    }
  };

  const handleToggleAvailability = async (id: string) => {
    try {
      const res = await api.toggleAvailability(id);
      if (res.data?.listing) {
        setListings((prev) => prev.map((l) => (l._id === id ? res.data!.listing : l)));
      }
      onNotify(res.message || "Availability updated.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Could not toggle availability", "error");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.deleteListing(id);
      setListings((prev) => prev.filter((l) => l._id !== id));
      setConfirmDeleteId(null);
      onNotify("Listing deleted.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to delete listing", "error");
    }
  };

  const isVerifiedOwner = user?.verificationStatus === "approved";

  return (
    <div className="bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 pb-24 space-y-12">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 pb-8 border-b border-[#EAE6E0]">
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-[#1A1A1A]">
              Owner <em className="italic font-normal text-[#E86A4D]">Hub</em>
            </h1>
            <p className="text-sm text-[#666666]">
              Verify your identity, publish rooms across Kathmandu Valley, and track student inquiries.
            </p>
          </div>

          <button
            type="button"
            disabled={!isVerifiedOwner}
            onClick={openCreateForm}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full transition-colors shadow-[0_10px_24px_-10px_rgba(232,106,77,0.65)] disabled:opacity-45 disabled:cursor-not-allowed whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            New Room Listing
          </button>
        </div>

        {/* Verification Status Section */}
        <section className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <h2 className="font-display text-2xl font-medium text-[#1A1A1A]">
                Owner Identity Verification
              </h2>
              <p className="text-sm text-[#666666]">
                RentMe requires identity or ownership verification before rooms can be listed.
              </p>
            </div>

            <div className="flex items-center gap-2 px-4 py-2 bg-[#FFFFFF] border border-[#EAE6E0] rounded-full text-xs font-medium whitespace-nowrap shrink-0">
              {user?.verificationStatus === "approved" && (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#2F6F4E]" />
                  <span className="text-[#1A1A1A]">Verified Owner</span>
                </>
              )}
              {user?.verificationStatus === "pending" && (
                <>
                  <Clock className="w-4 h-4 text-[#E86A4D]" />
                  <span className="text-[#1A1A1A]">Under Admin Review</span>
                </>
              )}
              {(user?.verificationStatus === "none" || user?.verificationStatus === "rejected") && (
                <>
                  <ShieldAlert className="w-4 h-4 text-[#B8452C]" />
                  <span className="text-[#B8452C]">
                    {user.verificationStatus === "rejected" ? "Verification Rejected" : "Not Verified Yet"}
                  </span>
                </>
              )}
            </div>
          </div>

          {(user?.verificationStatus === "none" || user?.verificationStatus === "rejected") && (
            <form
              onSubmit={handleSubmitVerification}
              className="pt-6 border-t border-[#EAE6E0] grid grid-cols-1 md:grid-cols-12 gap-5 items-end"
            >
              <div className="md:col-span-4">
                <label htmlFor="doc-type" className="block text-xs font-medium text-[#666666] mb-2">
                  Document Type
                </label>
                <select
                  id="doc-type"
                  value={docType}
                  onChange={(e) => setDocType(e.target.value as DocumentType)}
                  className="w-full h-11 px-3.5 text-sm bg-[#FFFFFF] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                >
                  {(Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[]).map((key) => (
                    <option key={key} value={key}>
                      {DOCUMENT_TYPE_LABELS[key]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-5">
                <label htmlFor="doc-file" className="block text-xs font-medium text-[#666666] mb-2">
                  Upload Document Image (.jpg, .png, .webp, max 5MB)
                </label>
                <input
                  id="doc-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  className="w-full h-11 px-3.5 py-2 text-sm bg-[#FFFFFF] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                />
              </div>

              <div className="md:col-span-3">
                <button
                  type="submit"
                  disabled={submittingVerification}
                  className="w-full h-11 inline-flex items-center justify-center gap-2 px-5 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full transition-colors disabled:opacity-60 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  {submittingVerification ? "Submitting..." : "Submit Document"}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Create / Edit Listing Form */}
        {showForm && (
          <section className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl p-6 sm:p-8 shadow-[0_24px_60px_-24px_rgba(26,26,26,0.14)] space-y-6">
            <div className="flex items-center justify-between gap-4 pb-5 border-b border-[#F2EFEA]">
              <div>
                <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#1A1A1A]">
                  {editingListing ? "Edit Room Listing" : "Create New Room Listing"}
                </h2>
                <p className="text-xs text-[#666666] mt-1">
                  Submitted and edited listings enter admin review before going live to students.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                aria-label="Close form"
                className="w-10 h-10 inline-flex items-center justify-center rounded-full border border-[#EAE6E0] bg-[#F7F5F2] text-[#666666] hover:text-[#1A1A1A] cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveListing} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                <div className="md:col-span-8">
                  <label className="block text-xs font-medium text-[#666666] mb-2">
                    Listing Title
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Sunlit Single Room near Pulchowk Campus"
                    className="w-full h-11 px-3.5 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-[#666666] mb-2">
                    Room Type
                  </label>
                  <select
                    value={form.roomType}
                    onChange={(e) => setForm((p) => ({ ...p, roomType: e.target.value as RoomType }))}
                    className="w-full h-11 px-3.5 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                  >
                    {(Object.keys(ROOM_TYPE_LABELS) as RoomType[]).map((rt) => (
                      <option key={rt} value={rt}>
                        {ROOM_TYPE_LABELS[rt]}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-[#666666] mb-2">
                    Monthly Rent (NPR)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={form.rent}
                    onChange={(e) => setForm((p) => ({ ...p, rent: e.target.value }))}
                    placeholder="8500"
                    className="w-full h-11 px-3.5 text-sm font-mono tabular-nums bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-[#666666] mb-2">
                    Security Deposit (NPR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={form.deposit}
                    onChange={(e) => setForm((p) => ({ ...p, deposit: e.target.value }))}
                    placeholder="5000"
                    className="w-full h-11 px-3.5 text-sm font-mono tabular-nums bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-[#666666] mb-2">
                    Available From
                  </label>
                  <input
                    type="date"
                    value={form.availableFrom}
                    onChange={(e) => setForm((p) => ({ ...p, availableFrom: e.target.value }))}
                    className="w-full h-11 px-3.5 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-[#666666] mb-2">District</label>
                  <select
                    value={form.district}
                    onChange={(e) => setForm((p) => ({ ...p, district: e.target.value as District }))}
                    className="w-full h-11 px-3.5 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                  >
                    {DISTRICTS.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-[#666666] mb-2">Area</label>
                  <input
                    type="text"
                    required
                    value={form.area}
                    onChange={(e) => setForm((p) => ({ ...p, area: e.target.value }))}
                    placeholder="e.g. Sanepa, Balkhu, Thimi"
                    className="w-full h-11 px-3.5 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-[#666666] mb-2">
                    Full Street Address
                  </label>
                  <input
                    type="text"
                    required
                    value={form.address}
                    onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                    placeholder="Ward & landmark"
                    className="w-full h-11 px-3.5 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                  />
                </div>

                <div className="md:col-span-8">
                  <label className="block text-xs font-medium text-[#666666] mb-2">
                    Nearby College / University
                  </label>
                  <input
                    type="text"
                    value={form.nearbyCollege}
                    onChange={(e) => setForm((p) => ({ ...p, nearbyCollege: e.target.value }))}
                    placeholder="e.g. Pulchowk Engineering Campus"
                    className="w-full h-11 px-3.5 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                  />
                </div>

                <div className="md:col-span-4">
                  <label className="block text-xs font-medium text-[#666666] mb-2">
                    Distance to College (km)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="0.1"
                    value={form.distanceToCollege}
                    onChange={(e) => setForm((p) => ({ ...p, distanceToCollege: e.target.value }))}
                    placeholder="0.5"
                    className="w-full h-11 px-3.5 text-sm font-mono tabular-nums bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#666666] mb-2">Description</label>
                <textarea
                  required
                  rows={4}
                  maxLength={2000}
                  value={form.description}
                  onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                  placeholder="Describe natural light, water availability, floor level, transport access, and furnishings..."
                  className="w-full p-4 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                />
              </div>

              <div>
                <p className="text-xs font-medium text-[#666666] mb-3">Amenities Included</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                  {ALL_AMENITIES.map((amenity) => {
                    const selected = form.amenities.includes(amenity);
                    return (
                      <button
                        key={amenity}
                        type="button"
                        onClick={() => toggleFormAmenity(amenity)}
                        className={`px-3.5 py-2 text-xs font-medium rounded-full border text-left transition-colors cursor-pointer ${
                          selected
                            ? "bg-[#E86A4D] text-white border-[#E86A4D]"
                            : "bg-[#F7F5F2] text-[#666666] border-[#EAE6E0] hover:text-[#1A1A1A]"
                        }`}
                      >
                        {AMENITY_LABELS[amenity]}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-medium text-[#666666] mb-2">
                    House Rules (Optional)
                  </label>
                  <input
                    type="text"
                    maxLength={500}
                    value={form.rules}
                    onChange={(e) => setForm((p) => ({ ...p, rules: e.target.value }))}
                    placeholder="e.g. Quiet hours after 10 PM, no smoking indoors"
                    className="w-full h-11 px-3.5 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[#666666] mb-2">
                    Room Photos (up to 8 images)
                  </label>
                  <input
                    type="file"
                    multiple
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => setPhotoFiles(Array.from(e.target.files || []))}
                    className="w-full h-11 px-3.5 py-2 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-5 border-t border-[#F2EFEA]">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="px-5 py-2.5 text-sm font-medium text-[#666666] hover:text-[#1A1A1A] bg-[#F7F5F2] border border-[#EAE6E0] rounded-full cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingListing}
                  className="px-6 py-2.5 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full transition-colors disabled:opacity-60 cursor-pointer"
                >
                  {savingListing
                    ? "Saving..."
                    : editingListing
                      ? "Save Changes & Resubmit"
                      : "Submit Listing for Review"}
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Owner's Listings Table */}
        <section className="space-y-5">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#1A1A1A]">
              My Properties ({listings.length})
            </h2>
          </div>

          {loading ? (
            <div className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl h-48 animate-pulse" />
          ) : listings.length === 0 ? (
            <div className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl p-12 text-center space-y-3">
              <h3 className="font-display text-2xl font-medium text-[#1A1A1A]">No rooms listed yet</h3>
              <p className="text-sm text-[#666666] max-w-md mx-auto leading-relaxed">
                {isVerifiedOwner
                  ? "Publish your first room or flat to start receiving direct inquiries from valley students."
                  : "Submit your identity verification document above to unlock room publishing."}
              </p>
            </div>
          ) : (
            <div className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl divide-y divide-[#F2EFEA]">
              {listings.map((listing) => (
                <div
                  key={listing._id}
                  className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
                >
                  <div className="flex items-start gap-5 min-w-0">
                    <div className="w-28 shrink-0 rounded-xl overflow-hidden border border-[#EAE6E0]">
                      <RoomImage src={listing.photos?.[0]} alt={listing.title} aspectClass="aspect-[4/3]" />
                    </div>
                    <div className="min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#666666]">
                        <span className="font-medium text-[#E86A4D]">
                          {ROOM_TYPE_LABELS[listing.roomType]}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {listing.location.area}, {listing.location.district}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-medium capitalize ${
                            listing.status === "approved"
                              ? "text-[#2F6F4E]"
                              : listing.status === "rejected"
                                ? "text-[#B8452C]"
                                : "text-[#E86A4D]"
                          }`}
                        >
                          Review: {listing.status}
                        </span>
                      </div>

                      <h3 className="font-display text-xl font-medium text-[#1A1A1A] truncate">
                        {listing.title}
                      </h3>

                      <div className="flex flex-wrap items-center gap-4 text-xs text-[#666666] font-mono tabular-nums">
                        <span className="text-[#1A1A1A] font-medium">
                          {formatNPR(listing.rent)} / mo
                        </span>
                        <span>{listing.views || 0} views</span>
                        <span>{listing.contactRequests || 0} inquiries</span>
                        <span className={listing.isAvailable ? "text-[#2F6F4E]" : "text-[#B8452C]"}>
                          {listing.isAvailable ? "Available" : "Occupied"}
                        </span>
                      </div>

                      {listing.status === "rejected" && listing.rejectionReason && (
                        <p className="text-xs text-[#B8452C]">
                          Rejection reason: {listing.rejectionReason}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleAvailability(listing._id)}
                      className="px-4 py-2 text-xs font-medium text-[#1A1A1A] bg-[#F7F5F2] hover:bg-[#EFECE6] border border-[#EAE6E0] rounded-full whitespace-nowrap cursor-pointer"
                    >
                      {listing.isAvailable ? "Mark Occupied" : "Mark Available"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onOpenListing(listing._id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#1A1A1A] bg-[#FFFFFF] hover:bg-[#F7F5F2] border border-[#EAE6E0] rounded-full whitespace-nowrap cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditForm(listing)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#1A1A1A] bg-[#FFFFFF] hover:bg-[#F7F5F2] border border-[#EAE6E0] rounded-full whitespace-nowrap cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit
                    </button>

                    {confirmDeleteId === listing._id ? (
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleDelete(listing._id)}
                          className="px-4 py-2 text-xs font-medium text-white bg-[#B8452C] rounded-full whitespace-nowrap cursor-pointer"
                        >
                          Confirm Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3.5 py-2 text-xs font-medium text-[#666666] bg-[#FFFFFF] border border-[#EAE6E0] rounded-full cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(listing._id)}
                        aria-label="Delete listing"
                        className="inline-flex items-center justify-center w-9 h-9 text-[#B8452C] hover:bg-[#FEF2F2] border border-[#EAE6E0] rounded-full cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
