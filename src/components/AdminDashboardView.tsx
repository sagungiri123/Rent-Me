import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, ShieldOff, Trash2, UserCheck, X } from "lucide-react";
import { api } from "../lib/api";
import {
  DOCUMENT_TYPE_LABELS,
  formatNPR,
  formatShortDate,
  ROOM_TYPE_LABELS,
  type AdminAnalytics,
  type Listing,
  type User,
  type UserRole,
  type VerificationRecord,
} from "../types";
import { RoomImage } from "./RoomImage";

interface AdminDashboardViewProps {
  onOpenListing: (id: string) => void;
  onNotify: (msg: string, tone?: "success" | "error") => void;
}

type AdminTab = "listings" | "verifications" | "users";

export function AdminDashboardView({ onOpenListing, onNotify }: AdminDashboardViewProps) {
  const [tab, setTab] = useState<AdminTab>("listings");
  const [analytics, setAnalytics] = useState<AdminAnalytics | null>(null);

  // Listings tab
  const [listingStatusFilter, setListingStatusFilter] = useState("pending");
  const [listings, setListings] = useState<Listing[]>([]);
  const [rejectingListingId, setRejectingListingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  // Verifications tab
  const [verificationStatusFilter, setVerificationStatusFilter] = useState("pending");
  const [verifications, setVerifications] = useState<VerificationRecord[]>([]);
  const [reviewNoteById, setReviewNoteById] = useState<Record<string, string>>({});

  // Users tab
  const [userRoleFilter, setUserRoleFilter] = useState<UserRole | "">("");
  const [users, setUsers] = useState<User[]>([]);

  const [loadingTab, setLoadingTab] = useState(true);

  const loadAnalytics = useCallback(async () => {
    try {
      const data = await api.getAdminAnalytics();
      setAnalytics(data);
    } catch {
      // handled per tab
    }
  }, []);

  const loadListings = useCallback(async () => {
    setLoadingTab(true);
    try {
      const res = await api.getAdminListings(listingStatusFilter);
      setListings(res.listings);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to fetch listings", "error");
    } finally {
      setLoadingTab(false);
    }
  }, [listingStatusFilter, onNotify]);

  const loadVerifications = useCallback(async () => {
    setLoadingTab(true);
    try {
      const res = await api.getAdminVerifications(verificationStatusFilter);
      setVerifications(res);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to fetch verifications", "error");
    } finally {
      setLoadingTab(false);
    }
  }, [verificationStatusFilter, onNotify]);

  const loadUsers = useCallback(async () => {
    setLoadingTab(true);
    try {
      const res = await api.getAdminUsers(userRoleFilter);
      setUsers(res.users);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to fetch users", "error");
    } finally {
      setLoadingTab(false);
    }
  }, [userRoleFilter, onNotify]);

  useEffect(() => {
    void loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    if (tab === "listings") void loadListings();
    else if (tab === "verifications") void loadVerifications();
    else void loadUsers();
  }, [tab, loadListings, loadVerifications, loadUsers]);

  const handleReviewListing = async (id: string, status: "approved" | "rejected") => {
    try {
      await api.reviewAdminListing(
        id,
        status,
        status === "rejected" ? rejectionReason || "Does not meet listing quality guidelines." : undefined
      );
      setRejectingListingId(null);
      setRejectionReason("");
      onNotify(`Listing ${status}.`, "success");
      await Promise.all([loadListings(), loadAnalytics()]);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Action failed", "error");
    }
  };

  const handleDeleteListing = async (id: string) => {
    try {
      await api.deleteListing(id);
      onNotify("Listing removed.", "success");
      await Promise.all([loadListings(), loadAnalytics()]);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to remove listing", "error");
    }
  };

  const handleReviewVerification = async (id: string, status: "approved" | "rejected") => {
    try {
      await api.reviewAdminVerification(id, status, reviewNoteById[id] || "");
      onNotify(`Owner verification ${status}.`, "success");
      await Promise.all([loadVerifications(), loadAnalytics()]);
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Verification review failed", "error");
    }
  };

  const handleToggleSuspend = async (id: string) => {
    try {
      const res = await api.toggleSuspendUser(id);
      if (res.data?.user) {
        setUsers((prev) => prev.map((u) => (u._id === id ? res.data!.user : u)));
      }
      onNotify(res.message || "User account updated.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Failed to update user", "error");
    }
  };

  return (
    <div className="bg-[#FFFFFF]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 pb-24 space-y-10">
        {/* Header */}
        <div className="pb-8 border-b border-[#EAE6E0] space-y-1.5">
          <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-[#1A1A1A]">
            Admin Moderation <em className="italic font-normal text-[#E86A4D]">Console</em>
          </h1>
          <p className="text-sm text-[#666666]">
            Verify Kathmandu Valley property owners, approve room listings, and maintain account trust.
          </p>
        </div>

        {/* Analytics KPI Strip */}
        {analytics && (
          <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-5">
            {[
              { label: "Total Users", value: analytics.totalUsers },
              { label: "Students", value: analytics.totalStudents },
              { label: "Owners", value: analytics.totalOwners },
              { label: "Approved Rooms", value: analytics.approvedListings },
              { label: "Pending Rooms", value: analytics.pendingListings },
              { label: "Pending IDs", value: analytics.pendingVerifications },
            ].map((metric) => (
              <div
                key={metric.label}
                className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl p-6 space-y-1.5"
              >
                <p className="text-xs text-[#666666]">{metric.label}</p>
                <p className="font-mono text-2xl font-medium text-[#1A1A1A] tabular-nums">
                  {metric.value}
                </p>
              </div>
            ))}
          </section>
        )}

        {/* Main Pill Tab Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#F7F5F2] border border-[#EAE6E0] rounded-full w-fit">
          {(
            [
              { id: "listings", label: `Listings (${analytics?.pendingListings ?? 0} pending)` },
              {
                id: "verifications",
                label: `Owner Verifications (${analytics?.pendingVerifications ?? 0} pending)`,
              },
              { id: "users", label: "Users Directory" },
            ] as Array<{ id: AdminTab; label: string }>
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`px-5 py-2 text-xs font-medium rounded-full transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                tab === item.id
                  ? "bg-[#FFFFFF] text-[#1A1A1A] shadow-xs"
                  : "text-[#666666] hover:text-[#1A1A1A]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Listings Moderation */}
        {tab === "listings" && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {["pending", "approved", "rejected", "all"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setListingStatusFilter(st)}
                  className={`px-4 py-2 text-xs font-medium rounded-full border capitalize cursor-pointer transition-colors ${
                    listingStatusFilter === st
                      ? "bg-[#E86A4D] text-white border-[#E86A4D]"
                      : "bg-[#FFFFFF] text-[#666666] border-[#EAE6E0] hover:text-[#1A1A1A]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {loadingTab ? (
              <div className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl h-48 animate-pulse" />
            ) : listings.length === 0 ? (
              <div className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl p-12 text-center text-sm text-[#666666]">
                No listings in "{listingStatusFilter}" queue.
              </div>
            ) : (
              <div className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl divide-y divide-[#F2EFEA]">
                {listings.map((listing) => {
                  const owner =
                    typeof listing.owner === "object" && listing.owner !== null
                      ? listing.owner
                      : null;
                  return (
                    <div key={listing._id} className="p-6 space-y-4">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
                        <div className="flex items-start gap-5 min-w-0">
                          <div className="w-28 shrink-0 rounded-xl overflow-hidden border border-[#EAE6E0]">
                            <RoomImage
                              src={listing.photos?.[0]}
                              alt={listing.title}
                              aspectClass="aspect-[4/3]"
                            />
                          </div>
                          <div className="min-w-0 space-y-1.5">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[#666666]">
                              <span>{ROOM_TYPE_LABELS[listing.roomType]}</span>
                              <span aria-hidden="true">·</span>
                              <span>
                                {listing.location.area}, {listing.location.district}
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono text-[#1A1A1A] tabular-nums">
                                {formatNPR(listing.rent)} / mo
                              </span>
                              <span aria-hidden="true">·</span>
                              <span className="capitalize font-medium text-[#E86A4D]">
                                {listing.status}
                              </span>
                            </div>

                            <h3 className="font-display text-xl font-medium text-[#1A1A1A]">
                              {listing.title}
                            </h3>
                            <p className="text-xs text-[#666666]">
                              Owner: {owner?.name || "Unknown"}
                              {owner?.email ? ` (${owner.email})` : ""} · Submitted{" "}
                              {formatShortDate(listing.createdAt)}
                            </p>
                            <p className="text-sm text-[#666666] line-clamp-2 leading-relaxed">
                              {listing.description}
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 shrink-0">
                          <button
                            type="button"
                            onClick={() => onOpenListing(listing._id)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#1A1A1A] bg-[#F7F5F2] hover:bg-[#EFECE6] border border-[#EAE6E0] rounded-full cursor-pointer"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                            Inspect
                          </button>
                          {listing.status !== "approved" && (
                            <button
                              type="button"
                              onClick={() => handleReviewListing(listing._id, "approved")}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full cursor-pointer"
                            >
                              <Check className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          )}
                          {listing.status !== "rejected" && (
                            <button
                              type="button"
                              onClick={() => setRejectingListingId(listing._id)}
                              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-[#B8452C] bg-[#FEF2F2] border border-[#FECACA] rounded-full cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteListing(listing._id)}
                            aria-label="Delete listing"
                            className="inline-flex items-center justify-center w-9 h-9 text-[#666666] hover:text-[#B8452C] border border-[#EAE6E0] rounded-full cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {rejectingListingId === listing._id && (
                        <div className="pt-4 border-t border-[#F2EFEA] flex flex-col sm:flex-row gap-3">
                          <input
                            type="text"
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Reason for rejecting this listing..."
                            className="flex-1 h-10 px-4 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                          />
                          <button
                            type="button"
                            onClick={() => handleReviewListing(listing._id, "rejected")}
                            className="px-5 py-2 text-xs font-medium text-white bg-[#B8452C] rounded-full cursor-pointer"
                          >
                            Confirm Rejection
                          </button>
                          <button
                            type="button"
                            onClick={() => setRejectingListingId(null)}
                            className="px-4 py-2 text-xs font-medium text-[#666666] bg-[#FFFFFF] border border-[#EAE6E0] rounded-full cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Owner Verifications */}
        {tab === "verifications" && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {["pending", "approved", "rejected"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setVerificationStatusFilter(st)}
                  className={`px-4 py-2 text-xs font-medium rounded-full border capitalize cursor-pointer transition-colors ${
                    verificationStatusFilter === st
                      ? "bg-[#E86A4D] text-white border-[#E86A4D]"
                      : "bg-[#FFFFFF] text-[#666666] border-[#EAE6E0] hover:text-[#1A1A1A]"
                  }`}
                >
                  {st}
                </button>
              ))}
            </div>

            {loadingTab ? (
              <div className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl h-48 animate-pulse" />
            ) : verifications.length === 0 ? (
              <div className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl p-12 text-center text-sm text-[#666666]">
                No verification requests with status "{verificationStatusFilter}".
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {verifications.map((item) => (
                  <div
                    key={item._id}
                    className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl overflow-hidden flex flex-col"
                  >
                    <PrivateDocumentPreview
                      url={item.documentUrl}
                      alt={`${item.user.name} verification document`}
                    />
                    <div className="p-6 flex-1 flex flex-col gap-4">
                      <div className="flex items-center justify-between text-xs text-[#666666]">
                        <span className="font-medium text-[#E86A4D]">
                          {DOCUMENT_TYPE_LABELS[item.documentType]}
                        </span>
                        <span>Submitted {formatShortDate(item.submittedAt)}</span>
                      </div>

                      <div>
                        <h3 className="font-display text-xl font-medium text-[#1A1A1A]">
                          {item.user.name}
                        </h3>
                        <p className="text-xs text-[#666666] mt-0.5">
                          {item.user.email}
                          {item.user.phone ? ` · ${item.user.phone}` : ""}
                        </p>
                      </div>

                      {item.status === "pending" ? (
                        <div className="mt-auto pt-4 border-t border-[#F2EFEA] space-y-3">
                          <input
                            type="text"
                            value={reviewNoteById[item._id] || ""}
                            onChange={(e) =>
                              setReviewNoteById((prev) => ({ ...prev, [item._id]: e.target.value }))
                            }
                            placeholder="Optional review notes..."
                            className="w-full h-10 px-3.5 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
                          />
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => handleReviewVerification(item._id, "approved")}
                              className="flex-1 py-2.5 text-xs font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full cursor-pointer"
                            >
                              Approve Owner
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReviewVerification(item._id, "rejected")}
                              className="flex-1 py-2.5 text-xs font-medium text-[#B8452C] bg-[#FEF2F2] border border-[#FECACA] rounded-full cursor-pointer"
                            >
                              Reject
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto pt-4 border-t border-[#F2EFEA] text-xs text-[#666666]">
                          <p className="font-semibold capitalize text-[#1A1A1A]">
                            Decision: {item.status}
                          </p>
                          {item.reviewNotes && <p className="mt-1">{item.reviewNotes}</p>}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 3: Users Directory */}
        {tab === "users" && (
          <section className="space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              {(["", "student", "owner", "admin"] as Array<UserRole | "">).map((r) => (
                <button
                  key={r || "all"}
                  type="button"
                  onClick={() => setUserRoleFilter(r)}
                  className={`px-4 py-2 text-xs font-medium rounded-full border capitalize cursor-pointer transition-colors ${
                    userRoleFilter === r
                      ? "bg-[#E86A4D] text-white border-[#E86A4D]"
                      : "bg-[#FFFFFF] text-[#666666] border-[#EAE6E0] hover:text-[#1A1A1A]"
                  }`}
                >
                  {r || "All Roles"}
                </button>
              ))}
            </div>

            {loadingTab ? (
              <div className="bg-[#F7F5F2] border border-[#EAE6E0] rounded-2xl h-48 animate-pulse" />
            ) : (
              <div className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-[#EAE6E0] bg-[#F7F5F2] text-xs text-[#666666]">
                      <th className="py-4 px-6 font-medium">User</th>
                      <th className="py-4 px-4 font-medium">Role</th>
                      <th className="py-4 px-4 font-medium">Verification</th>
                      <th className="py-4 px-4 font-medium">Status</th>
                      <th className="py-4 px-4 font-medium">Joined</th>
                      <th className="py-4 px-6 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F2EFEA]">
                    {users.map((u) => (
                      <tr key={u._id} className="hover:bg-[#FAF8F5] transition-colors">
                        <td className="py-4 px-6">
                          <p className="font-medium text-[#1A1A1A]">{u.name}</p>
                          <p className="text-xs text-[#666666]">
                            {u.email}
                            {u.phone ? ` · ${u.phone}` : ""}
                          </p>
                        </td>
                        <td className="py-4 px-4 capitalize text-[#1A1A1A]">{u.role}</td>
                        <td className="py-4 px-4 capitalize text-[#666666]">
                          {u.verificationStatus}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`text-xs font-medium ${
                              u.isSuspended ? "text-[#B8452C]" : "text-[#2F6F4E]"
                            }`}
                          >
                            {u.isSuspended ? "Suspended" : "Active"}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-xs font-mono text-[#666666] tabular-nums">
                          {formatShortDate(u.createdAt)}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {u.role !== "admin" ? (
                            <button
                              type="button"
                              onClick={() => handleToggleSuspend(u._id)}
                              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-full border cursor-pointer ${
                                u.isSuspended
                                  ? "text-[#2F6F4E] border-[#C8DBD0] bg-[#F4F7F5]"
                                  : "text-[#B8452C] border-[#FECACA] bg-[#FEF2F2]"
                              }`}
                            >
                              {u.isSuspended ? (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Unsuspend
                                </>
                              ) : (
                                <>
                                  <ShieldOff className="w-3.5 h-3.5" />
                                  Suspend
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-xs text-[#9A958E]">Protected</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function PrivateDocumentPreview({ url, alt }: { url: string; alt: string }) {
  const [resolvedSrc, setResolvedSrc] = useState<string>(
    url.startsWith("/api/admin/") ? "" : url
  );

  useEffect(() => {
    if (!url.startsWith("/api/admin/")) {
      setResolvedSrc(url);
      return;
    }
    let active = true;
    let createdBlobUrl = "";
    api
      .fetchAuthorizedBlobUrl(url)
      .then((blobUrl) => {
        createdBlobUrl = blobUrl;
        if (active) setResolvedSrc(blobUrl);
      })
      .catch(() => {
        if (active) setResolvedSrc("");
      });
    return () => {
      active = false;
      if (createdBlobUrl) URL.revokeObjectURL(createdBlobUrl);
    };
  }, [url]);

  return <RoomImage src={resolvedSrc} alt={alt} aspectClass="aspect-[16/10]" />;
}
