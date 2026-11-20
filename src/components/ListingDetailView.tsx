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
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-pulse space-y-6">
        <div className="h-5 w-32 bg-[#EFECE6] rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-7 aspect-[4/3] bg-[#EFECE6] rounded-xl" />
          <div className="lg:col-span-5 h-96 bg-[#EFECE6] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-semibold text-[#1C1F22]">
          {error || "Room not found"}
        </h1>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#264D3B] rounded-lg cursor-pointer"
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-20 space-y-8">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex items-center gap-2 text-sm font-medium text-[#5A5E63] hover:text-[#1C1F22] transition-colors cursor-pointer"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to all rooms
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Photo Gallery + Details */}
        <div className="lg:col-span-7 space-y-8">
          <div className="space-y-3">
            <div className="rounded-xl overflow-hidden border border-[#E6E3DC]">
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
                    className={`rounded-lg overflow-hidden border-2 transition-colors cursor-pointer ${
                      idx === activePhotoIndex
                        ? "border-[#264D3B]"
                        : "border-transparent opacity-75 hover:opacity-100"
                    }`}
                  >
                    <RoomImage src={photo} alt={`${listing.title} photo ${idx + 1}`} aspectClass="aspect-[4/3]" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-3 pt-4 border-t border-[#E6E3DC]">
            <h2 className="font-display text-2xl font-semibold text-[#1C1F22]">About this space</h2>
            <p className="text-[15px] leading-relaxed text-[#3F4347] whitespace-pre-line">
              {listing.description}
            </p>
          </div>

          {/* Amenities Grid */}
          <div className="space-y-4 pt-6 border-t border-[#E6E3DC]">
            <h2 className="font-display text-2xl font-semibold text-[#1C1F22]">
              Included Amenities
            </h2>
            {listing.amenities && listing.amenities.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-3 gap-x-6">
                {listing.amenities.map((amenity) => (
                  <div key={amenity} className="flex items-center gap-2.5 text-sm text-[#2E3236]">
                    <Check className="w-4 h-4 text-[#264D3B] shrink-0" aria-hidden="true" />
                    <span>{AMENITY_LABELS[amenity] || amenity}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-[#64686D]">No specific amenities listed by the owner.</p>
            )}
          </div>

          {/* Location & College Proximity */}
          <div className="space-y-3 pt-6 border-t border-[#E6E3DC]">
            <h2 className="font-display text-2xl font-semibold text-[#1C1F22]">
              Location & Proximity
            </h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <dt className="text-xs text-[#64686D]">District & Area</dt>
                <dd className="font-medium text-[#1C1F22] mt-0.5">
                  {listing.location.area}, {listing.location.district}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#64686D]">Street Address</dt>
                <dd className="font-medium text-[#1C1F22] mt-0.5">{listing.location.address}</dd>
              </div>
              {listing.location.nearbyCollege && (
                <div>
                  <dt className="text-xs text-[#64686D]">Nearest Campus / College</dt>
                  <dd className="font-medium text-[#1C1F22] mt-0.5">
                    {listing.location.nearbyCollege}
                  </dd>
                </div>
              )}
              {listing.location.distanceToCollege !== undefined && (
                <div>
                  <dt className="text-xs text-[#64686D]">Distance to College</dt>
                  <dd className="font-mono font-medium text-[#1C1F22] mt-0.5 tabular-nums">
                    {listing.location.distanceToCollege} km
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* House Rules */}
          {listing.rules && (
            <div className="space-y-2 pt-6 border-t border-[#E6E3DC]">
              <h2 className="font-display text-2xl font-semibold text-[#1C1F22]">House Rules</h2>
              <p className="text-sm leading-relaxed text-[#4A4E52]">{listing.rules}</p>
            </div>
          )}
        </div>

        {/* Right Column: Contiguous Sticky Inquiry Module */}
        <aside className="lg:col-span-5 lg:sticky lg:top-24 bg-white border border-[#E6E3DC] rounded-xl p-6 space-y-6">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#64686D]">
              <span className="font-semibold text-[#264D3B]">
                {ROOM_TYPE_LABELS[listing.roomType]}
              </span>
              <span aria-hidden="true">·</span>
              <span>
                {listing.location.area}, {listing.location.district}
              </span>
              {listing.status !== "approved" && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-[#B4652A]">Status: {listing.status}</span>
                </>
              )}
            </div>

            <h1 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1F22] leading-tight">
              {listing.title}
            </h1>
          </div>

          {/* Pricing Block */}
          <div className="py-4 border-y border-[#EFECE6] flex items-baseline justify-between gap-4">
            <div>
              <span className="font-mono text-2xl font-medium text-[#1C1F22] tabular-nums">
                {formatNPR(listing.rent)}
              </span>
              <span className="text-sm text-[#64686D]"> / month</span>
            </div>
            <div className="text-right">
              <p className="text-xs text-[#64686D]">Security Deposit</p>
              <p className="font-mono text-sm font-medium text-[#1C1F22] tabular-nums">
                {formatNPR(listing.deposit)}
              </p>
            </div>
          </div>

          {/* Key Metadata Rows */}
          <div className="space-y-2.5 text-sm text-[#3F4347]">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[#5A5E63]">
                <Calendar className="w-4 h-4" />
                Available From
              </span>
              <span className="font-medium text-[#1C1F22]">
                {formatShortDate(listing.availableFrom)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[#5A5E63]">
                <MapPin className="w-4 h-4" />
                Availability
              </span>
              <span
                className={`font-medium ${
                  listing.isAvailable ? "text-[#264D3B]" : "text-[#9A3412]"
                }`}
              >
                {listing.isAvailable ? "Available Now" : "Currently Occupied"}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-[#5A5E63]">
                <Eye className="w-4 h-4" />
                Listing Views
              </span>
              <span className="font-mono tabular-nums text-[#1C1F22]">{listing.views || 0}</span>
            </div>
          </div>

          {/* Owner Info */}
          <div className="pt-4 border-t border-[#EFECE6] flex items-center gap-3.5">
            {ownerObj.avatar ? (
              <img
                src={ownerObj.avatar}
                alt={ownerObj.name}
                referrerPolicy="no-referrer"
                className="w-11 h-11 rounded-full object-cover border border-[#E6E3DC]"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-[#F2F0EB] border border-[#E6E3DC] flex items-center justify-center text-[#264D3B] font-semibold">
                <UserIcon className="w-5 h-5" />
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#1C1F22] truncate">{ownerObj.name}</p>
              <p className="inline-flex items-center gap-1 text-xs text-[#264D3B]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Direct Verified Owner · Zero Broker Fee
              </p>
            </div>
          </div>

          {/* Revealed Contact Panel */}
          {contact ? (
            <div className="p-4 bg-[#F4F7F5] border border-[#C8DBD0] rounded-xl space-y-2.5">
              <p className="text-xs font-semibold text-[#264D3B]">Owner Contact Unlocked</p>
              <p className="text-sm font-semibold text-[#1C1F22]">{contact.name}</p>
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex items-center gap-2 text-sm font-mono text-[#1C1F22] hover:text-[#264D3B]"
                >
                  <Phone className="w-4 h-4 text-[#264D3B]" />
                  {contact.phone}
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex items-center gap-2 text-sm text-[#1C1F22] hover:text-[#264D3B] break-all"
                >
                  <Mail className="w-4 h-4 text-[#264D3B]" />
                  {contact.email}
                </a>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <button
                type="button"
                disabled={revealing}
                onClick={handleRevealContact}
                className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
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
                  className="w-full py-2.5 px-4 inline-flex items-center justify-center gap-2 text-sm font-medium text-[#1C1F22] bg-[#FAF9F6] hover:bg-[#F2F0EB] border border-[#DDD9D0] rounded-lg transition-colors cursor-pointer"
                >
                  <Bookmark className={`w-4 h-4 ${isSaved ? "fill-[#264D3B] text-[#264D3B]" : ""}`} />
                  {isSaved ? "Saved in Shortlist" : "Save Room for Later"}
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
