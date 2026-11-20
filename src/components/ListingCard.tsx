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
      className="group flex flex-col bg-white border border-[#E6E3DC] rounded-xl overflow-hidden text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#CBC6BB] hover:shadow-[0_12px_30px_-14px_rgba(28,31,34,0.16)] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#264D3B]"
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
            className={`absolute top-3 right-3 w-10 h-10 rounded-lg flex items-center justify-center border transition-colors cursor-pointer ${
              isSaved
                ? "bg-[#264D3B] text-white border-[#264D3B]"
                : "bg-white/95 text-[#1C1F22] border-[#E6E3DC] hover:bg-white"
            }`}
          >
            <Bookmark className={`w-4 h-4 ${isSaved ? "fill-current" : ""}`} />
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col p-5 gap-3">
        <div className="flex items-center gap-2 text-xs text-[#64686D]">
          <span className="font-medium text-[#264D3B]">{ROOM_TYPE_LABELS[listing.roomType]}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate">
            {listing.location.area}, {listing.location.district}
          </span>
        </div>

        <h3 className="font-display text-lg font-semibold text-[#1C1F22] leading-snug line-clamp-2 group-hover:text-[#264D3B] transition-colors">
          {listing.title}
        </h3>

        {listing.location.nearbyCollege && (
          <p className="flex items-center gap-1.5 text-xs text-[#5A5E63] truncate">
            <MapPin className="w-3.5 h-3.5 shrink-0 text-[#7A7E83]" aria-hidden="true" />
            <span className="truncate">
              {listing.location.distanceToCollege !== undefined
                ? `${listing.location.distanceToCollege} km to ${listing.location.nearbyCollege}`
                : `Near ${listing.location.nearbyCollege}`}
            </span>
          </p>
        )}

        {topAmenities && (
          <p className="text-xs text-[#73777C] truncate">{topAmenities}</p>
        )}

        <div className="mt-auto pt-3 border-t border-[#EFECE6] flex items-baseline justify-between gap-3">
          <div>
            <span className="font-mono text-base font-medium text-[#1C1F22] tabular-nums">
              {formatNPR(listing.rent)}
            </span>
            <span className="text-xs text-[#64686D]"> / month</span>
          </div>
          <span className="text-xs font-medium text-[#5A5E63] whitespace-nowrap shrink-0">
            {listing.isAvailable ? "Available" : "Occupied"}
          </span>
        </div>
      </div>
    </article>
  );
}
