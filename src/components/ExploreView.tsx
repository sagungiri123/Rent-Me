import React, { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";
import {
  ALL_AMENITIES,
  AMENITY_LABELS,
  DISTRICTS,
  ROOM_TYPE_LABELS,
  VALLEY_ASSETS,
  type AmenityKey,
  type District,
  type Listing,
  type ListingFilters,
  type Pagination,
  type RoomType,
} from "../types";
import { ListingCard } from "./ListingCard";
import { LoadingSkeleton } from "./LoadingSkeleton";
import { RoomImage } from "./RoomImage";

interface ExploreViewProps {
  filters: ListingFilters;
  onChangeFilters: (updater: (prev: ListingFilters) => ListingFilters) => void;
  onResetFilters: () => void;
  onOpenListing: (id: string) => void;
  onNavigate: (path: string) => void;
  onNotify: (msg: string, tone?: "success" | "error") => void;
}

const DISTRICT_SHOWCASE: Array<{
  name: District;
  colleges: string;
  vibe: string;
  image: string;
}> = [
  {
    name: "Lalitpur",
    colleges: "Pulchowk Campus, Patan Multiple, Islington",
    vibe: "Quiet residential lanes in Sanepa, Jhamsikhel, and Pulchowk with reliable water reserves.",
    image: VALLEY_ASSETS.modernFlat,
  },
  {
    name: "Kathmandu",
    colleges: "Tribhuvan University, Shanker Dev, CCRC",
    vibe: "Direct ring-road transit access across Balkhu, New Baneshwor, and Koteshwor.",
    image: VALLEY_ASSETS.rooftopSunset,
  },
  {
    name: "Bhaktapur",
    colleges: "Nepal Engineering College, Khwopa College",
    vibe: "Budget-friendly heritage brick residences and sunlit courtyards across Thimi and Suryabinayak.",
    image: VALLEY_ASSETS.newariHeritage,
  },
];

export function ExploreView({
  filters,
  onChangeFilters,
  onResetFilters,
  onOpenListing,
  onNavigate,
  onNotify,
}: ExploreViewProps) {
  const { user, savedIds, toggleSave } = useAuth();
  const [listings, setListings] = useState<Listing[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 9, total: 0, pages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAmenities, setShowAmenities] = useState(false);

  // Local hero search input state synced with filters
  const [heroDistrict, setHeroDistrict] = useState(filters.district);
  const [heroArea, setHeroArea] = useState(filters.area);
  const [heroMaxRent, setHeroMaxRent] = useState(filters.maxRent);

  useEffect(() => {
    setHeroDistrict(filters.district);
    setHeroArea(filters.area);
    setHeroMaxRent(filters.maxRent);
  }, [filters.district, filters.area, filters.maxRent]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    api
      .getListings({
        district: filters.district || undefined,
        area: filters.area || undefined,
        minRent: filters.minRent || undefined,
        maxRent: filters.maxRent || undefined,
        roomType: filters.roomType || undefined,
        amenities: filters.amenities,
        nearbyCollege: filters.nearbyCollege || undefined,
        sort: filters.sort,
        page: filters.page,
        limit: 9,
      })
      .then((res) => {
        if (!active) return;
        setListings(res.listings);
        setPagination(res.pagination);
      })
      .catch((err: Error) => {
        if (!active) return;
        setError(err.message || "Could not load rooms right now.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [filters]);

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onChangeFilters((prev) => ({
      ...prev,
      district: heroDistrict,
      area: heroArea,
      maxRent: heroMaxRent,
      page: 1,
    }));
    document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
  };

  const toggleAmenity = (amenity: AmenityKey) => {
    onChangeFilters((prev) => {
      const exists = prev.amenities.includes(amenity);
      return {
        ...prev,
        amenities: exists
          ? prev.amenities.filter((a) => a !== amenity)
          : [...prev.amenities, amenity],
        page: 1,
      };
    });
  };

  const handleCardSave = async (listingId: string) => {
    if (!user) {
      onNotify("Sign in as a student to save rooms.", "error");
      onNavigate("/login");
      return;
    }
    if (user.role !== "student") {
      onNotify("Saving rooms is available for student accounts.", "error");
      return;
    }
    try {
      const saved = await toggleSave(listingId);
      onNotify(saved ? "Room saved to your shortlist." : "Removed from saved rooms.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Could not update saved list", "error");
    }
  };

  const hasActiveFilters = Boolean(
    filters.district ||
      filters.area ||
      filters.minRent ||
      filters.maxRent ||
      filters.roomType ||
      filters.nearbyCollege ||
      filters.amenities.length > 0
  );

  return (
    <div className="bg-[#FFFFFF]">
      {/* Section 1: Airy Warm Editorial Hero */}
      <section className="bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between gap-10 py-1">
              <div className="space-y-6">
                <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#E86A4D]">
                  Kathmandu · Lalitpur · Bhaktapur — Direct Owner Housing
                </p>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-medium leading-[1.06] tracking-[-0.02em] text-[#1A1A1A] max-w-2xl">
                  Student rooms across the valley, straight from{" "}
                  <em className="italic font-normal text-[#E86A4D]">verified owners.</em>
                </h1>
                <p className="text-base sm:text-[17px] text-[#666666] leading-relaxed max-w-xl">
                  Search single rooms, shared study spaces, and furnished flats near Pulchowk,
                  Tribhuvan University, Baneshwor, and Thimi—with zero broker commission and
                  verified landlord identities.
                </p>
              </div>

              {/* Elevated Pure-White Floating Search Widget */}
              <form
                onSubmit={handleHeroSearch}
                className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl p-6 sm:p-7 shadow-[0_20px_50px_-20px_rgba(26,26,26,0.12)] space-y-5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="hero-district" className="block text-xs font-medium text-[#666666] mb-2">
                      District
                    </label>
                    <select
                      id="hero-district"
                      value={heroDistrict}
                      onChange={(e) => setHeroDistrict(e.target.value)}
                      className="w-full h-11 px-3.5 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A] transition-colors focus:bg-white focus:border-[#E86A4D]"
                    >
                      <option value="">All Valley Districts</option>
                      {DISTRICTS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="hero-area" className="block text-xs font-medium text-[#666666] mb-2">
                      Area or College
                    </label>
                    <input
                      id="hero-area"
                      type="text"
                      value={heroArea}
                      onChange={(e) => setHeroArea(e.target.value)}
                      placeholder="Pulchowk, Balkhu, Thimi..."
                      className="w-full h-11 px-3.5 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A] placeholder:text-[#9A958E] transition-colors focus:bg-white focus:border-[#E86A4D]"
                    />
                  </div>

                  <div>
                    <label htmlFor="hero-budget" className="block text-xs font-medium text-[#666666] mb-2">
                      Max Monthly Rent (NPR)
                    </label>
                    <input
                      id="hero-budget"
                      type="number"
                      min={0}
                      step={500}
                      value={heroMaxRent}
                      onChange={(e) => setHeroMaxRent(e.target.value)}
                      placeholder="e.g. 12000"
                      className="w-full h-11 px-3.5 text-sm font-mono tabular-nums bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A] placeholder:text-[#9A958E] transition-colors focus:bg-white focus:border-[#E86A4D]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#F2EFEA]">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-[#666666]">
                    <span>Popular:</span>
                    {["Pulchowk", "Balkhu", "Sanepa", "Baneshwor", "Thimi"].map((spot) => (
                      <button
                        key={spot}
                        type="button"
                        onClick={() => {
                          setHeroArea(spot);
                          onChangeFilters((prev) => ({ ...prev, area: spot, page: 1 }));
                          document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                        }}
                        className="text-[#1A1A1A] underline decoration-[#DCD7CE] underline-offset-4 hover:decoration-[#E86A4D] hover:text-[#E86A4D] transition-colors cursor-pointer"
                      >
                        {spot}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-6 py-2.5 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full transition-colors shadow-[0_8px_22px_-8px_rgba(232,106,77,0.65)] whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    Search Rooms
                  </button>
                </div>
              </form>
            </div>

            {/* Right Architectural Media Column */}
            <div className="lg:col-span-5 grid grid-rows-12 gap-4 min-h-[360px] lg:min-h-[480px]">
              <div className="row-span-8 relative rounded-2xl overflow-hidden border border-[#EAE6E0] shadow-[0_20px_50px_-24px_rgba(26,26,26,0.18)]">
                <img
                  src={VALLEY_ASSETS.modernFlat}
                  alt="Sunlit modern flat in Sanepa overlooking the Kathmandu Valley hills"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#1A1A1A]/80 via-[#1A1A1A]/30 to-transparent p-5">
                  <p className="text-xs text-white/80 tracking-wide">Sanepa Height, Lalitpur</p>
                  <p className="text-sm font-medium text-white mt-0.5">
                    Verified student & owner housing across 3 districts
                  </p>
                </div>
              </div>
              <div className="row-span-4 grid grid-cols-2 gap-4">
                <div className="rounded-2xl overflow-hidden border border-[#EAE6E0]">
                  <img
                    src={VALLEY_ASSETS.brickSingle}
                    alt="Brick single study room with carved wooden window in Kathmandu Valley"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="rounded-2xl overflow-hidden border border-[#EAE6E0]">
                  <img
                    src={VALLEY_ASSETS.rooftopSunset}
                    alt="Rooftop terrace overlooking Kathmandu Valley hills at sunset"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Warm Stone-Beige Catalog & Filter Workbench */}
      <section id="catalog" className="bg-[#F7F5F2] border-y border-[#EAE6E0] py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-2">
              <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-[#1A1A1A]">
                Available Rooms &{" "}
                <em className="italic font-normal text-[#E86A4D]">Flats</em>
              </h2>
              <p className="text-sm text-[#666666] tabular-nums">
                {loading
                  ? "Loading approved listings..."
                  : `${pagination.total} verified ${pagination.total === 1 ? "listing" : "listings"} ready to inspect`}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="sort-select" className="text-xs font-medium text-[#666666]">
                Sort by
              </label>
              <select
                id="sort-select"
                value={filters.sort}
                onChange={(e) =>
                  onChangeFilters((prev) => ({
                    ...prev,
                    sort: e.target.value as ListingFilters["sort"],
                    page: 1,
                  }))
                }
                className="h-10 px-4 text-sm bg-[#FFFFFF] border border-[#EAE6E0] rounded-full text-[#1A1A1A]"
              >
                <option value="newest">Newest First</option>
                <option value="price_asc">Rent: Low to High</option>
                <option value="price_desc">Rent: High to Low</option>
                <option value="popular">Most Viewed</option>
              </select>
            </div>
          </div>

          {/* Elevated Pure-White Interactive Filter Bar */}
          <div className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl p-6 shadow-[0_14px_40px_-24px_rgba(26,26,26,0.10)] space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4">
              {/* District Pill Controls */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F7F5F2] border border-[#EAE6E0] rounded-full">
                <button
                  type="button"
                  onClick={() => onChangeFilters((prev) => ({ ...prev, district: "", page: 1 }))}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filters.district === ""
                      ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs"
                      : "text-[#666666] hover:text-[#1A1A1A]"
                  }`}
                >
                  All Districts
                </button>
                {DISTRICTS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => onChangeFilters((prev) => ({ ...prev, district: d, page: 1 }))}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      filters.district === d
                        ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs"
                        : "text-[#666666] hover:text-[#1A1A1A]"
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>

              {/* Room Type Pill Controls */}
              <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#F7F5F2] border border-[#EAE6E0] rounded-full">
                <button
                  type="button"
                  onClick={() => onChangeFilters((prev) => ({ ...prev, roomType: "", page: 1 }))}
                  className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filters.roomType === ""
                      ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs"
                      : "text-[#666666] hover:text-[#1A1A1A]"
                  }`}
                >
                  All Types
                </button>
                {(Object.keys(ROOM_TYPE_LABELS) as RoomType[]).map((rt) => (
                  <button
                    key={rt}
                    type="button"
                    onClick={() => onChangeFilters((prev) => ({ ...prev, roomType: rt, page: 1 }))}
                    className={`px-4 py-1.5 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      filters.roomType === rt
                        ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs"
                        : "text-[#666666] hover:text-[#1A1A1A]"
                    }`}
                  >
                    {ROOM_TYPE_LABELS[rt]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-4 pt-4 border-t border-[#F2EFEA]">
              <div className="lg:col-span-3">
                <input
                  type="text"
                  value={filters.nearbyCollege}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({ ...prev, nearbyCollege: e.target.value, page: 1 }))
                  }
                  placeholder="Filter by nearby college..."
                  aria-label="Nearby college"
                  className="w-full h-10 px-3.5 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A] placeholder:text-[#9A958E]"
                />
              </div>

              <div className="lg:col-span-2">
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={filters.minRent}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({ ...prev, minRent: e.target.value, page: 1 }))
                  }
                  placeholder="Min NPR"
                  aria-label="Minimum monthly rent"
                  className="w-full h-10 px-3.5 text-sm font-mono tabular-nums bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A] placeholder:text-[#9A958E]"
                />
              </div>

              <div className="lg:col-span-2">
                <input
                  type="number"
                  min={0}
                  step={500}
                  value={filters.maxRent}
                  onChange={(e) =>
                    onChangeFilters((prev) => ({ ...prev, maxRent: e.target.value, page: 1 }))
                  }
                  placeholder="Max NPR"
                  aria-label="Maximum monthly rent"
                  className="w-full h-10 px-3.5 text-sm font-mono tabular-nums bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A] placeholder:text-[#9A958E]"
                />
              </div>

              <div className="lg:col-span-5 flex flex-wrap items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowAmenities((s) => !s)}
                  className={`inline-flex items-center gap-2 h-10 px-4 text-xs font-medium rounded-full border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    showAmenities || filters.amenities.length > 0
                      ? "bg-[#E86A4D] text-white border-[#E86A4D]"
                      : "bg-[#F7F5F2] text-[#1A1A1A] border-[#EAE6E0] hover:border-[#D6D0C7]"
                  }`}
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Amenities{filters.amenities.length > 0 ? ` (${filters.amenities.length})` : ""}
                </button>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={onResetFilters}
                    className="inline-flex items-center gap-1.5 h-10 px-4 text-xs font-medium text-[#666666] hover:text-[#1A1A1A] bg-[#FFFFFF] border border-[#EAE6E0] rounded-full whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    Reset Filters
                  </button>
                )}
              </div>
            </div>

            {showAmenities && (
              <div className="pt-4 border-t border-[#F2EFEA] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5">
                {ALL_AMENITIES.map((amenity) => {
                  const selected = filters.amenities.includes(amenity);
                  return (
                    <button
                      key={amenity}
                      type="button"
                      onClick={() => toggleAmenity(amenity)}
                      className={`px-3.5 py-2 text-xs font-medium rounded-full border text-left transition-colors cursor-pointer ${
                        selected
                          ? "bg-[#E86A4D] text-white border-[#E86A4D]"
                          : "bg-[#F7F5F2] text-[#666666] border-[#EAE6E0] hover:border-[#D6D0C7] hover:text-[#1A1A1A]"
                      }`}
                    >
                      {AMENITY_LABELS[amenity]}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Listing Results Grid */}
          {error ? (
            <div className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl p-10 text-center space-y-4">
              <p className="text-sm font-medium text-[#B8452C]">{error}</p>
              <button
                type="button"
                onClick={onResetFilters}
                className="px-6 py-2.5 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full transition-colors cursor-pointer"
              >
                Try Again
              </button>
            </div>
          ) : loading ? (
            <LoadingSkeleton variant="listing-grid" count={6} />
          ) : listings.length === 0 ? (
            <div className="editorial-fade-in bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl p-12 text-center space-y-4">
              <h3 className="font-display text-2xl font-medium text-[#1A1A1A]">
                No matching rooms found
              </h3>
              <p className="text-sm text-[#666666] max-w-md mx-auto leading-relaxed">
                Try widening your budget range, switching districts, or clearing amenity filters to
                see all verified student rooms across the valley.
              </p>
              <button
                type="button"
                onClick={onResetFilters}
                className="mt-2 inline-flex items-center px-6 py-2.5 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full transition-colors cursor-pointer"
              >
                Clear All Filters
              </button>
            </div>
          ) : (
            <div className="editorial-fade-in space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {listings.map((listing) => (
                  <ListingCard
                    key={listing._id}
                    listing={listing}
                    canSave={!user || user.role === "student"}
                    isSaved={savedIds.has(listing._id)}
                    onSelect={onOpenListing}
                    onToggleSave={handleCardSave}
                  />
                ))}
              </div>

              {pagination.pages > 1 && (
                <div className="flex items-center justify-between pt-6 border-t border-[#EAE6E0]">
                  <p className="text-xs text-[#666666] tabular-nums">
                    Page {pagination.page} of {pagination.pages} · {pagination.total} listings
                  </p>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={pagination.page <= 1}
                      onClick={() =>
                        onChangeFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                      }
                      className="inline-flex items-center gap-1 px-4 py-2 text-xs font-medium bg-[#FFFFFF] border border-[#EAE6E0] hover:border-[#D6D0C7] rounded-full disabled:opacity-40 cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={pagination.page >= pagination.pages}
                      onClick={() =>
                        onChangeFilters((prev) => ({
                          ...prev,
                          page: Math.min(pagination.pages, prev.page + 1),
                        }))
                      }
                      className="inline-flex items-center gap-1 px-4 py-2 text-xs font-medium bg-[#FFFFFF] border border-[#EAE6E0] hover:border-[#D6D0C7] rounded-full disabled:opacity-40 cursor-pointer"
                    >
                      Next
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Valley Districts & Direct-Owner Story */}
      <section className="bg-[#FFFFFF] py-16 lg:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div className="space-y-3 max-w-xl">
              <h2 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-[#1A1A1A]">
                Explore by{" "}
                <em className="italic font-normal text-[#E86A4D]">Kathmandu Valley</em> District
              </h2>
              <p className="text-sm sm:text-[15px] text-[#666666] leading-relaxed">
                Every property owner verifies their citizenship or ownership proof before publishing,
                so students contact homeowners directly without broker fees.
              </p>
            </div>
            {!user && (
              <button
                type="button"
                onClick={() => onNavigate("/register")}
                className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#E86A4D] bg-[#F7F5F2] hover:bg-[#EFECE6] border border-[#EAE6E0] rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                List your property as an owner
                <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {DISTRICT_SHOWCASE.map((item) => (
              <button
                key={item.name}
                type="button"
                onClick={() => {
                  onChangeFilters((prev) => ({ ...prev, district: item.name, page: 1 }));
                  document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
                }}
                className="group text-left bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-[#D6D0C7] hover:shadow-[0_18px_40px_-20px_rgba(26,26,26,0.12)] cursor-pointer"
              >
                <RoomImage src={item.image} alt={`${item.name} student housing`} aspectClass="aspect-[16/10]" />
                <div className="p-6 sm:p-7 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-display text-2xl font-medium text-[#1A1A1A] group-hover:text-[#E86A4D] transition-colors">
                      {item.name}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-[#9A958E] group-hover:translate-x-0.5 group-hover:text-[#E86A4D] transition-all" />
                  </div>
                  <p className="text-xs font-medium text-[#E86A4D]">{item.colleges}</p>
                  <p className="text-sm text-[#666666] leading-relaxed">{item.vibe}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
