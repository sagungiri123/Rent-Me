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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20 space-y-8">
      {/* Header */}
      <div className="pb-6 border-b border-[#E6E3DC]">
        <h1 className="font-display text-3xl font-semibold text-[#1C1F22]">
          Admin Moderation Console
        </h1>
        <p className="text-sm text-[#5A5E63] mt-1">
          Verify Kathmandu Valley property owners, approve room listings, and maintain account trust.
        </p>
      </div>

      {/* Analytics KPI Strip */}
      {analytics && (
        <section className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
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
              className="bg-white border border-[#E6E3DC] rounded-xl p-4 space-y-1"
            >
              <p className="text-xs text-[#64686D]">{metric.label}</p>
              <p className="font-mono text-2xl font-medium text-[#1C1F22] tabular-nums">
                {metric.value}
              </p>
            </div>
          ))}
        </section>
      )}

      {/* Main Tab Switcher */}
      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#F2F0EB] rounded-lg w-fit">
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
            className={`px-4 py-2 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
              tab === item.id ? "bg-white text-[#1C1F22] shadow-xs" : "text-[#5A5E63] hover:text-[#1C1F22]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Listings Moderation */}
      {tab === "listings" && (
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            {["pending", "approved", "rejected", "all"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setListingStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize cursor-pointer ${
                  listingStatusFilter === st
                    ? "bg-[#264D3B] text-white border-[#264D3B]"
                    : "bg-white text-[#5A5E63] border-[#E6E3DC]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {loadingTab ? (
            <div className="bg-white border border-[#E6E3DC] rounded-xl h-48 animate-pulse" />
          ) : listings.length === 0 ? (
            <div className="bg-white border border-[#E6E3DC] rounded-xl p-10 text-center text-sm text-[#5A5E63]">
              No listings in "{listingStatusFilter}" queue.
            </div>
          ) : (
            <div className="bg-white border border-[#E6E3DC] rounded-xl divide-y divide-[#EFECE6]">
              {listings.map((listing) => {
                const owner =
                  typeof listing.owner === "object" && listing.owner !== null
                    ? listing.owner
                    : null;
                return (
                  <div key={listing._id} className="p-5 space-y-4">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      <div className="flex items-start gap-4 min-w-0">
                        <div className="w-28 shrink-0 rounded-lg overflow-hidden border border-[#E6E3DC]">
                          <RoomImage
                            src={listing.photos?.[0]}
                            alt={listing.title}
                            aspectClass="aspect-[4/3]"
                          />
                        </div>
                        <div className="min-w-0 space-y-1">
                          <div className="flex flex-wrap items-center gap-2 text-xs text-[#64686D]">
                            <span>{ROOM_TYPE_LABELS[listing.roomType]}</span>
                            <span aria-hidden="true">·</span>
                            <span>
                              {listing.location.area}, {listing.location.district}
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="font-mono text-[#1C1F22] tabular-nums">
                              {formatNPR(listing.rent)} / mo
                            </span>
                            <span aria-hidden="true">·</span>
                            <span className="capitalize font-semibold text-[#264D3B]">
                              {listing.status}
                            </span>
                          </div>

                          <h3 className="font-display text-lg font-semibold text-[#1C1F22]">
                            {listing.title}
                          </h3>
                          <p className="text-xs text-[#5A5E63]">
                            Owner: {owner?.name || "Unknown"}
                            {owner?.email ? ` (${owner.email})` : ""} · Submitted{" "}
                            {formatShortDate(listing.createdAt)}
                          </p>
                          <p className="text-sm text-[#4A4E52] line-clamp-2">{listing.description}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => onOpenListing(listing._id)}
                          className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium bg-white border border-[#DDD9D0] rounded-lg cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Inspect
                        </button>
                        {listing.status !== "approved" && (
                          <button
                            type="button"
                            onClick={() => handleReviewListing(listing._id, "approved")}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg cursor-pointer"
                          >
                            <Check className="w-3.5 h-3.5" />
                            Approve
                          </button>
                        )}
                        {listing.status !== "rejected" && (
                          <button
                            type="button"
                            onClick={() => setRejectingListingId(listing._id)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#9A3412] bg-[#FEF2F2] border border-[#FECACA] rounded-lg cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteListing(listing._id)}
                          aria-label="Delete listing"
                          className="inline-flex items-center justify-center w-9 h-9 text-[#5A5E63] hover:text-[#9A3412] border border-[#E6E3DC] rounded-lg cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {rejectingListingId === listing._id && (
                      <div className="pt-3 border-t border-[#EFECE6] flex flex-col sm:flex-row gap-2">
                        <input
                          type="text"
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          placeholder="Reason for rejecting this listing..."
                          className="flex-1 h-10 px-3 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg"
                        />
                        <button
                          type="button"
                          onClick={() => handleReviewListing(listing._id, "rejected")}
                          className="px-4 py-2 text-xs font-semibold text-white bg-[#9A3412] rounded-lg cursor-pointer"
                        >
                          Confirm Rejection
                        </button>
                        <button
                          type="button"
                          onClick={() => setRejectingListingId(null)}
                          className="px-3 py-2 text-xs font-medium text-[#5A5E63] bg-white border border-[#DDD9D0] rounded-lg cursor-pointer"
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
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            {["pending", "approved", "rejected"].map((st) => (
              <button
                key={st}
                type="button"
                onClick={() => setVerificationStatusFilter(st)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize cursor-pointer ${
                  verificationStatusFilter === st
                    ? "bg-[#264D3B] text-white border-[#264D3B]"
                    : "bg-white text-[#5A5E63] border-[#E6E3DC]"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          {loadingTab ? (
            <div className="bg-white border border-[#E6E3DC] rounded-xl h-48 animate-pulse" />
          ) : verifications.length === 0 ? (
            <div className="bg-white border border-[#E6E3DC] rounded-xl p-10 text-center text-sm text-[#5A5E63]">
              No verification requests with status "{verificationStatusFilter}".
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {verifications.map((item) => (
                <div
                  key={item._id}
                  className="bg-white border border-[#E6E3DC] rounded-xl overflow-hidden flex flex-col"
                >
                  <RoomImage
                    src={item.documentUrl}
                    alt={`${item.user.name} verification document`}
                    aspectClass="aspect-[16/10]"
                  />
                  <div className="p-5 flex-1 flex flex-col gap-3">
                    <div className="flex items-center justify-between text-xs text-[#64686D]">
                      <span className="font-medium text-[#264D3B]">
                        {DOCUMENT_TYPE_LABELS[item.documentType]}
                      </span>
                      <span>Submitted {formatShortDate(item.submittedAt)}</span>
                    </div>

                    <div>
                      <h3 className="font-display text-lg font-semibold text-[#1C1F22]">
                        {item.user.name}
                      </h3>
                      <p className="text-xs text-[#5A5E63]">
                        {item.user.email}
                        {item.user.phone ? ` · ${item.user.phone}` : ""}
                      </p>
                    </div>

                    {item.status === "pending" ? (
                      <div className="mt-auto pt-3 border-t border-[#EFECE6] space-y-3">
                        <input
                          type="text"
                          value={reviewNoteById[item._id] || ""}
                          onChange={(e) =>
                            setReviewNoteById((prev) => ({ ...prev, [item._id]: e.target.value }))
                          }
                          placeholder="Optional review notes..."
                          className="w-full h-10 px-3 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg"
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleReviewVerification(item._id, "approved")}
                            className="flex-1 py-2 text-xs font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg cursor-pointer"
                          >
                            Approve Owner
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewVerification(item._id, "rejected")}
                            className="flex-1 py-2 text-xs font-semibold text-[#9A3412] bg-[#FEF2F2] border border-[#FECACA] rounded-lg cursor-pointer"
                          >
                            Reject
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="mt-auto pt-3 border-t border-[#EFECE6] text-xs text-[#5A5E63]">
                        <p className="font-semibold capitalize text-[#1C1F22]">
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
        <section className="space-y-4">
          <div className="flex items-center gap-2">
            {(["", "student", "owner", "admin"] as Array<UserRole | "">).map((r) => (
              <button
                key={r || "all"}
                type="button"
                onClick={() => setUserRoleFilter(r)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border capitalize cursor-pointer ${
                  userRoleFilter === r
                    ? "bg-[#264D3B] text-white border-[#264D3B]"
                    : "bg-white text-[#5A5E63] border-[#E6E3DC]"
                }`}
              >
                {r || "All Roles"}
              </button>
            ))}
          </div>

          {loadingTab ? (
            <div className="bg-white border border-[#E6E3DC] rounded-xl h-48 animate-pulse" />
          ) : (
            <div className="bg-white border border-[#E6E3DC] rounded-xl overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E6E3DC] text-xs text-[#64686D]">
                    <th className="py-3.5 px-5 font-medium">User</th>
                    <th className="py-3.5 px-4 font-medium">Role</th>
                    <th className="py-3.5 px-4 font-medium">Verification</th>
                    <th className="py-3.5 px-4 font-medium">Status</th>
                    <th className="py-3.5 px-4 font-medium">Joined</th>
                    <th className="py-3.5 px-5 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {users.map((u) => (
                    <tr key={u._id} className="hover:bg-[#FAF9F6]">
                      <td className="py-3.5 px-5">
                        <p className="font-medium text-[#1C1F22]">{u.name}</p>
                        <p className="text-xs text-[#64686D]">
                          {u.email}
                          {u.phone ? ` · ${u.phone}` : ""}
                        </p>
                      </td>
                      <td className="py-3.5 px-4 capitalize text-[#3F4347]">{u.role}</td>
                      <td className="py-3.5 px-4 capitalize text-[#5A5E63]">
                        {u.verificationStatus}
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className={`text-xs font-semibold ${
                            u.isSuspended ? "text-[#9A3412]" : "text-[#264D3B]"
                          }`}
                        >
                          {u.isSuspended ? "Suspended" : "Active"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-xs font-mono text-[#5A5E63] tabular-nums">
                        {formatShortDate(u.createdAt)}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        {u.role !== "admin" ? (
                          <button
                            type="button"
                            onClick={() => handleToggleSuspend(u._id)}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer ${
                              u.isSuspended
                                ? "text-[#264D3B] border-[#C8DBD0] bg-[#F4F7F5]"
                                : "text-[#9A3412] border-[#FECACA] bg-[#FEF2F2]"
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
                          <span className="text-xs text-[#8E9296]">Protected</span>
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
  );
}
