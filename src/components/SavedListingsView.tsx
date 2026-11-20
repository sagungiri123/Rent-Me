import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import type { Listing } from "../types";
import { ListingCard } from "./ListingCard";

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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E6E3DC]">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#1C1F22]">Saved Rooms</h1>
          <p className="text-sm text-[#5A5E63] mt-1 tabular-nums">
            {loading ? "Loading shortlist..." : `${listings.length} shortlisted properties across Kathmandu Valley`}
          </p>
        </div>
        <button
          type="button"
          onClick={onExplore}
          className="inline-flex items-center gap-2 text-sm font-semibold text-[#264D3B] hover:text-[#1C3B2D] whitespace-nowrap shrink-0 cursor-pointer"
        >
          Browse more rooms
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      {error ? (
        <div className="bg-white border border-[#E6E3DC] rounded-xl p-8 text-sm text-[#9A3412]">
          {error}
        </div>
      ) : loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="bg-white border border-[#E6E3DC] rounded-xl h-80 animate-pulse" />
          ))}
        </div>
      ) : listings.length === 0 ? (
        <div className="bg-white border border-[#E6E3DC] rounded-xl p-12 text-center space-y-4">
          <h2 className="font-display text-2xl font-semibold text-[#1C1F22]">
            Your shortlist is empty
          </h2>
          <p className="text-sm text-[#5A5E63] max-w-md mx-auto">
            Bookmark rooms while browsing Kathmandu, Lalitpur, and Bhaktapur to compare monthly
            rent, deposit terms, and college proximity side by side.
          </p>
          <button
            type="button"
            onClick={onExplore}
            className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg cursor-pointer"
          >
            Explore Available Rooms
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
  );
}
