import React, { useState } from "react";
import { Bookmark, MapPin } from "lucide-react";
import { AMENITY_LABELS, formatNPR, ROOM_TYPE_LABELS, type Listing } from "../types";
import { RoomImage } from "./RoomImage";

interface ListingCardProps {
  listing: Listing;
  isSaved?: boolean;
  canSave?: boolean;
  onSelect: (id: string) => void;
  onToggleSave?: (id: string) => Promise<void>;
}

export function ListingCard({
  listing,
  isSaved = false,
  canSave = false,
  onSelect,
  onToggleSave,
}: ListingCardProps) {
  const [saving, setSaving] = useState(false);

  const handleSaveClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onToggleSave || saving) return;
    setSaving(true);
    try {
      await onToggleSave(listing._id);
    } finally {
      setSaving(false);
    }
  };

  const topAmenities = (listing.amenities || [])
    .slice(0, 3)
    .map((key) => AMENITY_LABELS[key] || key)
    .join(" · ");

  return (
    <article
      onClick={() => onSelect(listing._id)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(listing._id);
        }
      }}
      tabIndex={0}
      role="button"
      className="group flex flex-col bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl overflow-hidden text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#DCD6CC] hover:shadow-[0_20px_44px_-20px_rgba(26,26,26,0.14)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#E86A4D]"
    >
      <div className="relative">
        <RoomImage
          src={listing.photos?.[0]}
          alt={listing.title}
          aspectClass="aspect-[4/3]"
        />
        {canSave && (
          <button
            type="button"
            onClick={handleSaveClick}
            disabled={saving}
            aria-label={isSaved ? "Remove from saved rooms" : "Save room"}
            className={`absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center border shadow-[0_6px_16px_-6px_rgba(26,26,26,0.18)] transition-colors cursor-pointer ${
              isSaved
                ? "bg-[#E86A4D] text-white border-[#E86A4D]"
                : "bg-white/95 text-[#1A1A1A] border-[#EAE6E0] hover:bg-white hover:text-[#E86A4D]"
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col p-6 gap-3.5">
        <div className="flex items-center gap-2 text-xs text-[#666666]">
          <span className="font-medium text-[#E86A4D]">{ROOM_TYPE_LABELS[listing.roomType]}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">
            {listing.location.area}, {listing.location.district}
          </span>
        </div>

        <h3 className="font-display text-[1.22rem] font-medium text-[#1A1A1A] leading-snug line-clamp-2 group-hover:text-[#E86A4D] transition-colors">
          {listing.title}
        </h3>

        {listing.location.nearbyCollege && (
          <p className="flex items-center gap-1.5 text-xs text-[#666666] truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#948E86]" aria-hidden="true" />
            <span className="truncate">
              {listing.location.distanceToCollege !== undefined
                ? `${listing.location.distanceToCollege} km to ${listing.location.nearbyCollege}`
                : `Near ${listing.location.nearbyCollege}`}
            </span>
          </p>
        )}

        {topAmenities && (
          <p className="text-xs text-[#78746E] truncate">{topAmenities}</p>
        )}

        <div className="mt-auto pt-4 border-t border-[#F1EDE7] flex items-baseline justify-between gap-3">
          <div>
            <span className="font-mono text-base font-medium text-[#1A1A1A] tabular-nums">
              {formatNPR(listing.rent)}
            </span>
            <span className="text-xs text-[#666666]"> / month</span>
          </div>
          <span className="text-xs font-medium text-[#666666] whitespace-nowrap shrink-0">
            {listing.isAvailable ? "Available" : "Occupied"}
          </span>
        </div>
      </div>
    </article>
  );
}
