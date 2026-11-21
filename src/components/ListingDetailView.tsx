import { useEffect, useState } from "react";
import {
  ArrowLeft,
  Bookmark,
  Calendar,
  Check,
  Eye,
  Mail,
  MapPin,
  Phone,
  ShieldCheck,
  User as UserIcon,
} from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  AMENITY_LABELS,
  formatNPR,
  formatShortDate,
  ROOM_TYPE_LABELS,
  type Listing,
  type ListingOwner,
} from "../types";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { RoomImage } from "./RoomImage";

interface ListingDetailViewProps {
  listingId: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
  onNotify: (msg: string, tone?: "success" | "error") => void;
}

export function ListingDetailView({
  listingId,
  onBack,
  onNavigate,
  onNotify,
}: ListingDetailViewProps) {
  const { user, savedIds, toggleSave } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const [contact, setContact] = useState<{ name: string; phone: string; email: string } | null>(
    null
  );
  const [revealing, setRevealing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    setContact(null);
    setActivePhotoIndex(0);

    api
      .getListing(listingId)
      .then((data) => {
        if (active) setListing(data);
      })
      .catch((err: Error) => {
        if (active) setError(err.message || "Listing not found");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [listingId]);

  const handleRevealContact = async () => {
    if (!user) {
      onNotify("Sign in as a student to reveal direct owner contact.", "error");
      onNavigate("/login");
      return;
    }
    if (user.role !== "student") {
      onNotify("Direct contact reveal is reserved for student accounts.", "error");
      return;
    }
    setRevealing(true);
    try {
      const info = await api.revealContact(listingId);
      setContact(info);
      setListing((prev) =>
        prev ? { ...prev, contactRequests: (prev.contactRequests || 0) + 1 } : prev
      );
      onNotify("Owner contact details unlocked.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to reveal contact", "error");
    } finally {
      setRevealing(false);
    }
  };

  const handleToggleSave = async () => {
    if (!user) {
      onNotify("Sign in as a student to save rooms.", "error");
      onNavigate("/login");
      return;
    }
    if (user.role !== "student") {
      onNotify("Only student accounts can save listings.", "error");
      return;
    }
    setSaving(true);
    try {
      const saved = await toggleSave(listingId);
      onNotify(saved ? "Saved to your shortlist." : "Removed from saved rooms.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to update saved rooms", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingSkeleton variant="listing-detail" />;
  }

  if (error || !listing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center space-y-5">
        <h1 className="font-display text-3xl font-medium text-[#1A1A1A]">
          {error || "Room not found"}
        </h1>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </button>
      </div>
    );
  }

  const photos = listing.photos?.length ? listing.photos : [""];
  const ownerObj: ListingOwner =
    typeof listing.owner === "object" && listing.owner !== null
      ? listing.owner
      : { _id: String(listing.owner), name: "Verified Owner" };
  const isSaved = savedIds.has(listing._id);

  return (
    <div className="bg-[#FFFFFF] editorial-fade-in">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 space-y-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium text-[#666666] hover:text-[#1A1A1A] bg-[#F7F5F2] border border-[#EAE6E0] rounded-full transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to all rooms
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Photo Gallery + Editorial Details */}
          <div className="lg:col-span-7 space-y-10">
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden border border-[#EAE6E0] shadow-[0_18px_45px_-24px_rgba(26,26,26,0.16)]">
                <RoomImage
                  src={photos[activePhotoIndex]}
                  alt={listing.title}
                  aspectClass="aspect-[4/3]"
                />
              </div>

              {photos.length > 1 && (
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {photos.map((photo, idx) => (
                    <button
                      key={`${photo}-${idx}`}
                      type="button"
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                        idx === activePhotoIndex
                          ? "border-[#E86A4D]"
                          : "border-transparent opacity-70 hover:opacity-100"
                      }`}
                    >
                      <RoomImage src={photo} alt={`${listing.title} photo ${idx + 1}`} aspectClass="aspect-[4/3]" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Description */}
            <div className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl p-6 sm:p-8 space-y-4">
              <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#1A1A1A]">
                About this <em className="italic font-normal text-[#E86A4D]">space</em>
              </h2>
              <p className="text-[15px] leading-relaxed text-[#666666] whitespace-pre-line">
                {listing.description}
              </p>
            </div>

            {/* Amenities Grid */}
            <div className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl p-6 sm:p-8 space-y-5">
              <h2 className="font-display text-2xl font-medium text-[#1A1A1A]">
                Included Amenities
              </h2>
              {listing.amenities && listing.amenities.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3.5 gap-x-6">
                  {listing.amenities.map((amenity) => (
                    <div key={amenity} className="flex items-center gap-2.5 text-sm text-[#1A1A1A]">
                      <Check className="w-4 h-4 text-[#E86A4D] shrink-0" aria-hidden="true" />
                      <span>{AMENITY_LABELS[amenity] || amenity}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-[#666666]">No specific amenities listed by the owner.</p>
              )}
            </div>

            {/* Location & College Proximity */}
            <div className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl p-6 sm:p-8 space-y-5">
              <h2 className="font-display text-2xl font-medium text-[#1A1A1A]">
                Location & <em className="italic font-normal text-[#E86A4D]">Proximity</em>
              </h2>
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div>
                  <dt className="text-xs text-[#666666]">District & Area</dt>
                  <dd className="font-medium text-[#1A1A1A] mt-1">
                    {listing.location.area}, {listing.location.district}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[#666666]">Street Address</dt>
                  <dd className="font-medium text-[#1A1A1A] mt-1">{listing.location.address}</dd>
                </div>
                {listing.location.nearbyCollege && (
                  <div>
                    <dt className="text-xs text-[#666666]">Nearest Campus / College</dt>
                    <dd className="font-medium text-[#1A1A1A] mt-1">
                      {listing.location.nearbyCollege}
                    </dd>
                  </div>
                )}
                {listing.location.distanceToCollege !== undefined && (
                  <div>
                    <dt className="text-xs text-[#666666]">Distance to College</dt>
                    <dd className="font-mono font-medium text-[#1A1A1A] mt-1 tabular-nums">
                      {listing.location.distanceToCollege} km
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* House Rules */}
            {listing.rules && (
              <div className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl p-6 sm:p-8 space-y-3">
                <h2 className="font-display text-2xl font-medium text-[#1A1A1A]">House Rules</h2>
                <p className="text-sm leading-relaxed text-[#666666]">{listing.rules}</p>
              </div>
            )}
          </div>

          {/* Right Column: Elevated Pure-White Sticky Inquiry Widget */}
          <aside className="lg:col-span-5 lg:sticky lg:top-24 bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl p-7 sm:p-8 shadow-[0_24px_60px_-24px_rgba(26,26,26,0.14)] space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#666666]">
                <span className="font-medium text-[#E86A4D]">
                  {ROOM_TYPE_LABELS[listing.roomType]}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                  {listing.location.area}, {listing.location.district}
                </span>
                {listing.status !== "approved" && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-medium text-[#B8452C]">Status: {listing.status}</span>
                  </>
                )}
              </div>

              <h1 className="font-display text-3xl sm:text-[2rem] font-medium text-[#1A1A1A] leading-[1.15] tracking-[-0.015em]">
                {listing.title}
              </h1>
            </div>

            {/* Pricing Block */}
            <div className="py-5 border-y border-[#F2EFEA] flex items-baseline justify-between gap-4">
              <div>
                <span className="font-mono text-2xl font-medium text-[#1A1A1A] tabular-nums">
                  {formatNPR(listing.rent)}
                </span>
                <span className="text-sm text-[#666666]"> / month</span>
              </div>
              <div className="text-right">
                <p className="text-xs text-[#666666]">Security Deposit</p>
                <p className="font-mono text-sm font-medium text-[#1A1A1A] tabular-nums mt-0.5">
                  {formatNPR(listing.deposit)}
                </p>
              </div>
            </div>

            {/* Key Metadata Rows */}
            <div className="space-y-3 text-sm text-[#666666]">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-[#9A958E]" />
                  Available From
                </span>
                <span className="font-medium text-[#1A1A1A]">
                  {formatShortDate(listing.availableFrom)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#9A958E]" />
                  Availability
                </span>
                <span
                  className={`font-medium ${
                    listing.isAvailable ? "text-[#1A1A1A]" : "text-[#B8452C]"
                  }`}
                >
                  {listing.isAvailable ? "Available Now" : "Currently Occupied"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2">
                  <Eye className="w-4 h-4 text-[#9A958E]" />
                  Listing Views
                </span>
                <span className="font-mono tabular-nums text-[#1A1A1A]">{listing.views || 0}</span>
              </div>
            </div>

            {/* Owner Info */}
            <div className="pt-5 border-t border-[#F2EFEA] flex items-center gap-3.5">
              {ownerObj.avatar ? (
                <img
                  src={ownerObj.avatar}
                  alt={ownerObj.name}
                  referrerPolicy="no-referrer"
                  className="w-11 h-11 rounded-full object-cover border border-[#EAE6E0]"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-[#F7F5F2] border border-[#EAE6E0] flex items-center justify-center text-[#E86A4D] font-semibold">
                  <UserIcon className="w-5 h-5" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1A1A1A] truncate">{ownerObj.name}</p>
                <p className="inline-flex items-center gap-1.5 text-xs text-[#666666] mt-0.5">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#E86A4D]" />
                  Direct Verified Owner · Zero Broker Fee
                </p>
              </div>
            </div>

            {/* Revealed Contact Panel */}
            {contact ? (
              <div className="p-5 bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl space-y-2.5">
                <p className="text-xs font-medium uppercase tracking-wider text-[#E86A4D]">
                  Owner Contact Unlocked
                </p>
                <p className="text-sm font-semibold text-[#1A1A1A]">{contact.name}</p>
                {contact.phone && (
                  <a
                    href={`tel:${contact.phone}`}
                    className="flex items-center gap-2.5 text-sm font-mono text-[#1A1A1A] hover:text-[#E86A4D] transition-colors"
                  >
                    <Phone className="w-4 h-4 text-[#E86A4D]" />
                    {contact.phone}
                  </a>
                )}
                {contact.email && (
                  <a
                    href={`mailto:${contact.email}`}
                    className="flex items-center gap-2.5 text-sm text-[#1A1A1A] hover:text-[#E86A4D] transition-colors break-all"
                  >
                    <Mail className="w-4 h-4 text-[#E86A4D]" />
                    {contact.email}
                  </a>
                )}
              </div>
            ) : (
              <div className="space-y-3 pt-1">
                <button
                  type="button"
                  disabled={revealing}
                  onClick={handleRevealContact}
                  className="w-full py-3.5 px-6 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full transition-colors shadow-[0_10px_24px_-10px_rgba(232,106,77,0.7)] disabled:opacity-60 cursor-pointer"
                >
                  {revealing
                    ? "Revealing Contact..."
                    : user?.role === "student"
                      ? "Reveal Owner Contact"
                      : user
                        ? "Student Account Required to Contact"
                        : "Sign In as Student to Reveal Contact"}
                </button>

                {(!user || user.role === "student") && (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={handleToggleSave}
                    className="w-full py-3 px-6 inline-flex items-center justify-center gap-2 text-sm font-medium text-[#1A1A1A] bg-[#F7F5F2] hover:bg-[#EFECE6] border border-[#EAE6E0] rounded-full transition-colors cursor-pointer"
                  >
                    <Bookmark className={`w-4 h-4 ${isSaved ? "fill-[#E86A4D] text-[#E86A4D]" : ""}`} />
                    {isSaved ? "Saved in Shortlist" : "Save Room for Later"}
                  </button>
                )}
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
