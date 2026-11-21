export type LoadingSkeletonVariant = "listing-grid" | "listing-detail" | "page-frame";

interface LoadingSkeletonProps {
  variant: LoadingSkeletonVariant;
  count?: number;
  label?: string;
}

const DELAY_CLASSES = ["", "skeleton-delay-1", "skeleton-delay-2"] as const;

export function LoadingSkeleton({ variant, count = 6, label }: LoadingSkeletonProps) {
  const defaultLabel =
    variant === "listing-detail"
      ? "Loading room details"
      : variant === "listing-grid"
        ? "Loading verified room listings"
        : "Loading page content";

  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label || defaultLabel}</span>
      {variant === "listing-grid" && <ListingGridSkeleton count={count} />}
      {variant === "listing-detail" && <ListingDetailSkeleton />}
      {variant === "page-frame" && <PageFrameSkeleton />}
    </div>
  );
}

function ListingGridSkeleton({ count }: { count: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      {Array.from({ length: count }).map((_, idx) => {
        const delay = DELAY_CLASSES[idx % DELAY_CLASSES.length];
        return (
          <article
            key={idx}
            aria-hidden="true"
            className="flex flex-col bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl overflow-hidden"
          >
            {/* Photo container matching ListingCard aspect-[4/3] */}
            <div className="relative aspect-[4/3] bg-[#F7F5F2]">
              <div className={`w-full h-full skeleton-shimmer ${delay}`} />
              <div className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-[#FFFFFF]/85 border border-[#EAE6E0]" />
            </div>

            {/* Card body matching ListingCard p-6 proportions */}
            <div className="p-6 flex-1 flex flex-col gap-3.5">
              {/* Room type + location eyebrow */}
              <div className="flex items-center gap-2">
                <div className={`h-3 w-20 rounded-full skeleton-shimmer ${delay}`} />
                <div className="w-1 h-1 rounded-full bg-[#EAE6E0]" />
                <div className={`h-3 w-28 rounded-full skeleton-shimmer ${delay}`} />
              </div>

              {/* Editorial title (2-line reserve) */}
              <div className="space-y-2">
                <div className={`h-5 w-11/12 rounded-md skeleton-shimmer ${delay}`} />
                <div className={`h-5 w-2/3 rounded-md skeleton-shimmer ${delay}`} />
              </div>

              {/* College proximity */}
              <div className="flex items-center gap-2 pt-0.5">
                <div className={`w-3.5 h-3.5 rounded-full shrink-0 skeleton-shimmer ${delay}`} />
                <div className={`h-3 w-3/4 rounded-full skeleton-shimmer ${delay}`} />
              </div>

              {/* Amenities summary */}
              <div className={`h-3 w-5/6 rounded-full skeleton-shimmer ${delay}`} />

              {/* Footer price & availability row */}
              <div className="mt-auto pt-4 border-t border-[#F2EFEA] flex items-baseline justify-between gap-2">
                <div className="flex items-baseline gap-1.5">
                  <div className={`h-5 w-24 rounded-md skeleton-shimmer ${delay}`} />
                  <div className={`h-3 w-12 rounded-full skeleton-shimmer ${delay}`} />
                </div>
                <div className={`h-3 w-16 rounded-full skeleton-shimmer ${delay}`} />
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function ListingDetailSkeleton() {
  return (
    <div aria-hidden="true" className="bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-24 space-y-10">
        {/* Back pill placeholder */}
        <div className="h-9 w-36 rounded-full border border-[#EAE6E0] skeleton-shimmer" />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          {/* Left Column: Gallery + Editorial Details */}
          <div className="lg:col-span-7 space-y-10">
            <div className="space-y-4">
              <div className="aspect-[4/3] rounded-2xl border border-[#EAE6E0] overflow-hidden shadow-[0_18px_45px_-24px_rgba(26,26,26,0.12)]">
                <div className="w-full h-full skeleton-shimmer" />
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div
                    key={idx}
                    className={`aspect-[4/3] rounded-xl border border-[#EAE6E0] skeleton-shimmer ${
                      DELAY_CLASSES[idx % DELAY_CLASSES.length]
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* About this space warm stone-beige card */}
            <div className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl p-6 sm:p-8 space-y-4">
              <div className="h-7 w-48 rounded-md skeleton-shimmer-warm" />
              <div className="space-y-2.5 pt-1">
                <div className="h-3.5 w-full rounded-full skeleton-shimmer-warm" />
                <div className="h-3.5 w-11/12 rounded-full skeleton-shimmer-warm skeleton-delay-1" />
                <div className="h-3.5 w-5/6 rounded-full skeleton-shimmer-warm skeleton-delay-2" />
                <div className="h-3.5 w-2/3 rounded-full skeleton-shimmer-warm" />
              </div>
            </div>

            {/* Included Amenities card */}
            <div className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="h-6 w-44 rounded-md skeleton-shimmer" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-6">
                {Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="flex items-center gap-2.5">
                    <div className="w-4 h-4 rounded-full shrink-0 skeleton-shimmer" />
                    <div
                      className={`h-3.5 w-24 rounded-full skeleton-shimmer ${
                        DELAY_CLASSES[idx % DELAY_CLASSES.length]
                      }`}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Location & Proximity card */}
            <div className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl p-6 sm:p-8 space-y-5">
              <div className="h-6 w-48 rounded-md skeleton-shimmer" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="h-3 w-24 rounded-full skeleton-shimmer" />
                    <div className="h-4 w-40 rounded-md skeleton-shimmer skeleton-delay-1" />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Column: Elevated Sticky Inquiry Module */}
          <aside className="lg:col-span-5 bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl p-7 sm:p-8 shadow-[0_24px_60px_-24px_rgba(26,26,26,0.14)] space-y-6">
            {/* Eyebrow & Display Title */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-3 w-20 rounded-full skeleton-shimmer" />
                <div className="w-1 h-1 rounded-full bg-[#EAE6E0]" />
                <div className="h-3 w-28 rounded-full skeleton-shimmer skeleton-delay-1" />
              </div>
              <div className="space-y-2.5">
                <div className="h-8 w-full rounded-md skeleton-shimmer" />
                <div className="h-8 w-3/4 rounded-md skeleton-shimmer skeleton-delay-1" />
              </div>
            </div>

            {/* Pricing Block */}
            <div className="py-5 border-y border-[#F2EFEA] flex items-baseline justify-between gap-4">
              <div className="flex items-baseline gap-2">
                <div className="h-7 w-28 rounded-md skeleton-shimmer" />
                <div className="h-3.5 w-14 rounded-full skeleton-shimmer" />
              </div>
              <div className="space-y-1.5 flex flex-col items-end">
                <div className="h-3 w-24 rounded-full skeleton-shimmer" />
                <div className="h-4 w-20 rounded-md skeleton-shimmer skeleton-delay-1" />
              </div>
            </div>

            {/* Key Metadata Rows */}
            <div className="space-y-3.5">
              {Array.from({ length: 3 }).map((_, idx) => (
                <div key={idx} className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full skeleton-shimmer" />
                    <div className="h-3.5 w-24 rounded-full skeleton-shimmer" />
                  </div>
                  <div className="h-3.5 w-24 rounded-full skeleton-shimmer skeleton-delay-1" />
                </div>
              ))}
            </div>

            {/* Owner Info */}
            <div className="pt-5 border-t border-[#F2EFEA] flex items-center gap-3.5">
              <div className="w-11 h-11 rounded-full shrink-0 border border-[#EAE6E0] skeleton-shimmer" />
              <div className="space-y-2 flex-1">
                <div className="h-4 w-32 rounded-md skeleton-shimmer" />
                <div className="h-3 w-48 rounded-full skeleton-shimmer skeleton-delay-1" />
              </div>
            </div>

            {/* Pill Action Buttons */}
            <div className="space-y-3 pt-1">
              <div className="h-12 w-full rounded-full skeleton-shimmer" />
              <div className="h-11 w-full rounded-full border border-[#EAE6E0] skeleton-shimmer skeleton-delay-1" />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

function PageFrameSkeleton() {
  return (
    <div aria-hidden="true" className="bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 pb-24 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#EAE6E0]">
          <div className="space-y-2.5">
            <div className="h-9 w-56 rounded-md skeleton-shimmer" />
            <div className="h-4 w-80 max-w-full rounded-full skeleton-shimmer skeleton-delay-1" />
          </div>
          <div className="h-10 w-36 rounded-full border border-[#EAE6E0] skeleton-shimmer skeleton-delay-2" />
        </div>

        <ListingGridSkeleton count={3} />
      </div>
    </div>
  );
}
