import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Listing } from "../types";
import { ListingCard } from "./ListingCard";
import { LoadingSkeleton } from "./LoadingSkeleton";

interface SavedListingsViewProps {
  onOpenListing: (id: string) => void;
  onExplore: () => void;
  onNotify: (msg: string, tone?: "success" | "error") => void;
}

export function SavedListingsView({
  onOpenListing,
  onExplore,
  onNotify,
}: SavedListingsViewProps) {
  const { savedIds, toggleSave } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    api
      .getSavedListings()
      .then((data) => {
        if (active) setListings(data);
      })
      .catch((err: Error) => {
        if (active) setError(err.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleUnsave = async (id: string) => {
    try {
      const saved = await toggleSave(id);
      if (!saved) {
        setListings((prev) => prev.filter((item) => item._id !== id));
        onNotify("Removed from saved rooms.", "success");
      }
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Could not update saved rooms", "error");
    }
  };

  return (
    <div className="bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 pb-24 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#EAE6E0]">
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-[#1A1A1A]">
              Saved <em className="italic font-normal text-[#E86A4D]">Rooms</em>
            </h1>
            <p className="text-sm text-[#666666] tabular-nums">
              {loading
                ? "Loading shortlist..."
                : `${listings.length} shortlisted properties across Kathmandu Valley`}
            </p>
          </div>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-medium text-[#E86A4D] bg-[#F7F5F2] hover:bg-[#EFECE6] border border-[#EAE6E0] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Browse more rooms
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        {error ? (
          <div className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl p-8 text-sm text-[#B8452C]">
            {error}
          </div>
        ) : loading ? (
          <LoadingSkeleton variant="listing-grid" count={3} label="Loading saved rooms" />
        ) : listings.length === 0 ? (
          <div className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl p-12 sm:p-16 text-center space-y-4">
            <h2 className="font-display text-2xl sm:text-3xl font-medium text-[#1A1A1A]">
              Your shortlist is empty
            </h2>
            <p className="text-sm text-[#666666] max-w-md mx-auto leading-relaxed">
              Bookmark rooms while browsing Kathmandu, Lalitpur, and Bhaktapur to compare monthly
              rent, deposit terms, and college proximity side by side.
            </p>
            <button
              type="button"
              onClick={onExplore}
              className="mt-2 inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full transition-colors shadow-[0_10px_24px_-10px_rgba(232,106,77,0.65)] cursor-pointer"
            >
              Explore Available Rooms
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {listings.map((listing) => (
              <ListingCard
                key={listing._id}
                listing={listing}
                canSave={true}
                isSaved={savedIds.has(listing._id)}
                onSelect={onOpenListing}
                onToggleSave={handleUnsave}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
