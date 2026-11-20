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
    <div className="space-y-20 pb-20">
      {/* Section 1: Asymmetric Split Architectural Hero */}
      <section className="border-b border-[#E6E3DC] bg-[#FAF9F6]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-between gap-8 py-2">
              <div className="space-y-5">
                <p className="text-xs font-medium tracking-wide text-[#264D3B]">
                  Kathmandu · Lalitpur · Bhaktapur — Direct Owner Housing
                </p>
                <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold leading-[1.08] tracking-tight text-[#1C1F22] max-w-2xl">
                  Student rooms across the valley, straight from verified owners.
                </h1>
                <p className="text-base text-[#52565B] leading-relaxed max-w-xl">
                  Search single rooms, shared study spaces, and furnished flats near Pulchowk,
                  Tribhuvan University, Baneshwor, and Thimi—with zero broker commission and
                  verified landlord identities.
                </p>
              </div>

              {/* Unified Search Form */}
              <form
                onSubmit={handleHeroSearch}
                className="bg-white border border-[#E6E3DC] rounded-xl p-4 sm:p-5 space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label htmlFor="hero-district" className="block text-xs font-medium text-[#5A5E63] mb-1.5">
                      District
                    </label>
                    <select
                      id="hero-district"
                      value={heroDistrict}
                      onChange={(e) => setHeroDistrict(e.target.value)}
                      className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1F22]"
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
                    <label htmlFor="hero-area" className="block text-xs font-medium text-[#5A5E63] mb-1.5">
                      Area or College
                    </label>
                    <input
                      id="hero-area"
                      type="text"
                      value={heroArea}
                      onChange={(e) => setHeroArea(e.target.value)}
                      placeholder="Pulchowk, Balkhu, Thimi..."
                      className="w-full h-11 px-3 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1F22] placeholder:text-[#8E9296]"
                    />
                  </div>

                  <div>
                    <label htmlFor="hero-budget" className="block text-xs font-medium text-[#5A5E63] mb-1.5">
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
                      className="w-full h-11 px-3 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1F22] placeholder:text-[#8E9296]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-[#64686D]">
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
                        className="text-[#1C1F22] underline decoration-[#CFCBC2] underline-offset-4 hover:decoration-[#264D3B] hover:text-[#264D3B] cursor-pointer"
                      >
                        {spot}
                      </button>
                    ))}
                  </div>

                  <button
                    type="submit"
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <Search className="w-4 h-4" />
                    Search Rooms
                  </button>
                </div>
              </form>
            </div>

            {/* Right Architectural Media Column */}
            <div className="lg:col-span-5 grid grid-rows-12 gap-4 min-h-[340px] lg:min-h-[460px]">
              <div className="row-span-8 relative rounded-xl overflow-hidden border border-[#E6E3DC]">
                <img
                  src={VALLEY_ASSETS.modernFlat}
                  alt="Sunlit modern flat in Sanepa overlooking the Kathmandu Valley hills"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent p-4">
                  <p className="text-xs text-white/85">Sanepa Height, Lalitpur</p>
                  <p className="text-sm font-medium text-white">Verified student & owner housing across 3 districts</p>
                </div>
              </div>
              <div className="row-span-4 grid grid-cols-2 gap-4">
                <div className="rounded-xl overflow-hidden border border-[#E6E3DC]">
                  <img
                    src={VALLEY_ASSETS.brickSingle}
                    alt="Brick single study room with carved wooden window in Kathmandu Valley"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="rounded-xl overflow-hidden border border-[#E6E3DC]">
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

      {/* Section 2: Interactive Catalog & Filter Workbench */}
      <section id="catalog" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1F22]">
              Available Rooms & Flats
            </h2>
            <p className="text-sm text-[#5A5E63] mt-1 tabular-nums">
              {loading
                ? "Loading approved listings..."
                : `${pagination.total} verified ${pagination.total === 1 ? "listing" : "listings"} ready to inspect`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label htmlFor="sort-select" className="text-xs font-medium text-[#5A5E63]">
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
              className="h-10 px-3 text-sm bg-white border border-[#DDD9D0] rounded-lg text-[#1C1F22]"
            >
              <option value="newest">Newest First</option>
              <option value="price_asc">Rent: Low to High</option>
              <option value="price_desc">Rent: High to Low</option>
              <option value="popular">Most Viewed</option>
            </select>
          </div>
        </div>

        {/* Interactive Filter Controls Bar */}
        <div className="bg-white border border-[#E6E3DC] rounded-xl p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            {/* District Segmented Control */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F2F0EB] rounded-lg">
              <button
                type="button"
                onClick={() => onChangeFilters((prev) => ({ ...prev, district: "", page: 1 }))}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filters.district === ""
                    ? "bg-white text-[#1C1F22] shadow-xs"
                    : "text-[#5A5E63] hover:text-[#1C1F22]"
                }`}
              >
                All Districts
              </button>
              {DISTRICTS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => onChangeFilters((prev) => ({ ...prev, district: d, page: 1 }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filters.district === d
                      ? "bg-white text-[#1C1F22] shadow-xs"
                      : "text-[#5A5E63] hover:text-[#1C1F22]"
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>

            {/* Room Type Segmented Control */}
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F2F0EB] rounded-lg">
              <button
                type="button"
                onClick={() => onChangeFilters((prev) => ({ ...prev, roomType: "", page: 1 }))}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  filters.roomType === ""
                    ? "bg-white text-[#1C1F22] shadow-xs"
                    : "text-[#5A5E63] hover:text-[#1C1F22]"
                }`}
              >
                All Types
              </button>
              {(Object.keys(ROOM_TYPE_LABELS) as RoomType[]).map((rt) => (
                <button
                  key={rt}
                  type="button"
                  onClick={() => onChangeFilters((prev) => ({ ...prev, roomType: rt, page: 1 }))}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    filters.roomType === rt
                      ? "bg-white text-[#1C1F22] shadow-xs"
                      : "text-[#5A5E63] hover:text-[#1C1F22]"
                  }`}
                >
                  {ROOM_TYPE_LABELS[rt]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 pt-2 border-t border-[#EFECE6]">
            <div className="lg:col-span-3">
              <input
                type="text"
                value={filters.nearbyCollege}
                onChange={(e) =>
                  onChangeFilters((prev) => ({ ...prev, nearbyCollege: e.target.value, page: 1 }))
                }
                placeholder="Filter by nearby college..."
                aria-label="Nearby college"
                className="w-full h-10 px-3 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1F22] placeholder:text-[#8E9296]"
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
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1F22] placeholder:text-[#8E9296]"
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
                className="w-full h-10 px-3 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1F22] placeholder:text-[#8E9296]"
              />
            </div>

            <div className="lg:col-span-5 flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAmenities((s) => !s)}
                className={`inline-flex items-center gap-2 h-10 px-3.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  showAmenities || filters.amenities.length > 0
                    ? "bg-[#264D3B] text-white border-[#264D3B]"
                    : "bg-[#FAF9F6] text-[#1C1F22] border-[#DDD9D0] hover:bg-[#F2F0EB]"
                }`}
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Amenities{filters.amenities.length > 0 ? ` (${filters.amenities.length})` : ""}
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={onResetFilters}
                  className="inline-flex items-center gap-1.5 h-10 px-3.5 text-xs font-medium text-[#5A5E63] hover:text-[#1C1F22] bg-white border border-[#DDD9D0] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {showAmenities && (
            <div className="pt-3 border-t border-[#EFECE6] grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {ALL_AMENITIES.map((amenity) => {
                const selected = filters.amenities.includes(amenity);
                return (
                  <button
                    key={amenity}
                    type="button"
                    onClick={() => toggleAmenity(amenity)}
                    className={`px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors cursor-pointer ${
                      selected
                        ? "bg-[#264D3B] text-white border-[#264D3B]"
                        : "bg-[#FAF9F6] text-[#3F4347] border-[#E6E3DC] hover:border-[#B9B4A9]"
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
          <div className="bg-white border border-[#E6E3DC] rounded-xl p-10 text-center space-y-3">
            <p className="text-sm font-medium text-[#9A3412]">{error}</p>
            <button
              type="button"
              onClick={onResetFilters}
              className="px-4 py-2 text-sm font-medium text-white bg-[#264D3B] rounded-lg cursor-pointer"
            >
              Try Again
            </button>
          </div>
        ) : loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div
                key={idx}
                className="bg-white border border-[#E6E3DC] rounded-xl overflow-hidden animate-pulse"
              >
                <div className="aspect-[4/3] bg-[#EFECE6]" />
                <div className="p-5 space-y-3">
                  <div className="h-3 w-1/2 bg-[#EFECE6] rounded" />
                  <div className="h-5 w-4/5 bg-[#EFECE6] rounded" />
                  <div className="h-3 w-2/3 bg-[#EFECE6] rounded" />
                  <div className="h-5 w-1/3 bg-[#EFECE6] rounded mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : listings.length === 0 ? (
          <div className="bg-white border border-[#E6E3DC] rounded-xl p-12 text-center space-y-3">
            <h3 className="font-display text-xl font-semibold text-[#1C1F22]">
              No matching rooms found
            </h3>
            <p className="text-sm text-[#5A5E63] max-w-md mx-auto">
              Try widening your budget range, switching districts, or clearing amenity filters to
              see all verified student rooms across the valley.
            </p>
            <button
              type="button"
              onClick={onResetFilters}
              className="mt-2 inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg cursor-pointer"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="flex items-center justify-between pt-4 border-t border-[#E6E3DC]">
                <p className="text-xs text-[#5A5E63] tabular-nums">
                  Page {pagination.page} of {pagination.pages} · {pagination.total} listings
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={pagination.page <= 1}
                    onClick={() =>
                      onChangeFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))
                    }
                    className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium bg-white border border-[#DDD9D0] rounded-lg disabled:opacity-40 cursor-pointer"
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
                    className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-medium bg-white border border-[#DDD9D0] rounded-lg disabled:opacity-40 cursor-pointer"
                  >
                    Next
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>

      {/* Section 3: Valley Districts & Direct-Owner Story */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 border-t border-[#E6E3DC]">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
          <div className="space-y-2 max-w-xl">
            <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#1C1F22]">
              Explore by Kathmandu Valley District
            </h2>
            <p className="text-sm text-[#5A5E63] leading-relaxed">
              Every property owner verifies their citizenship or ownership proof before publishing,
              so students contact homeowners directly without broker fees.
            </p>
          </div>
          {!user && (
            <button
              type="button"
              onClick={() => onNavigate("/register")}
              className="inline-flex items-center gap-2 text-sm font-semibold text-[#264D3B] hover:text-[#1C3B2D] whitespace-nowrap shrink-0 cursor-pointer"
            >
              List your property as an owner
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {DISTRICT_SHOWCASE.map((item) => (
            <button
              key={item.name}
              type="button"
              onClick={() => {
                onChangeFilters((prev) => ({ ...prev, district: item.name, page: 1 }));
                document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="group text-left bg-white border border-[#E6E3DC] rounded-xl overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:border-[#CBC6BB] cursor-pointer"
            >
              <RoomImage src={item.image} alt={`${item.name} student housing`} aspectClass="aspect-[16/10]" />
              <div className="p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-xl font-semibold text-[#1C1F22] group-hover:text-[#264D3B] transition-colors">
                    {item.name}
                  </h3>
                  <ArrowRight className="w-4 h-4 text-[#7A7E83] group-hover:translate-x-0.5 group-hover:text-[#264D3B] transition-all" />
                </div>
                <p className="text-xs font-medium text-[#264D3B]">{item.colleges}</p>
                <p className="text-sm text-[#5A5E63] leading-relaxed">{item.vibe}</p>
              </div>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
