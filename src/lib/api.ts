import type {
  AdminAnalytics,
  DocumentType,
  Listing,
  ListingFilters,
  Pagination,
  User,
  UserRole,
  VerificationRecord,
} from "../types";

const TOKEN_KEY = "rentme_auth_token";

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  } catch {
    // Ignore storage unavailability
  }
}

interface ApiEnvelope<T> {
  success: boolean;
  message?: string;
  data?: T;
  error?: string;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<ApiEnvelope<T>> {
  const token = getStoredToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const isFormData = options.body instanceof FormData;
  if (!isFormData && options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(path, {
    ...options,
    headers,
  });

  const payload = (await res.json().catch(() => ({
    success: false,
    message: "Unexpected server response",
  }))) as ApiEnvelope<T>;

  if (!res.ok || !payload.success) {
    throw new Error(payload.message || payload.error || `Request failed (${res.status})`);
  }

  return payload;
}

export const api = {
  // Auth
  async register(body: {
    name: string;
    email: string;
    password: string;
    role: "student" | "owner";
    phone?: string;
    collegeName?: string;
  }) {
    const res = await request<{ user: User; token: string }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.data!;
  },

  async login(body: { email: string; password: string }) {
    const res = await request<{ user: User; token: string }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(body),
    });
    return res.data!;
  },

  async getMe() {
    const res = await request<{ user: User }>("/api/auth/me");
    return res.data!.user;
  },

  // Listings (Public + Owner + Student)
  async getListings(filters: Partial<ListingFilters> & { limit?: number; available?: boolean }) {
    const params = new URLSearchParams();
    if (filters.district) params.set("district", filters.district);
    if (filters.area) params.set("area", filters.area);
    if (filters.minRent) params.set("minRent", filters.minRent);
    if (filters.maxRent) params.set("maxRent", filters.maxRent);
    if (filters.roomType) params.set("roomType", filters.roomType);
    if (filters.nearbyCollege) params.set("nearbyCollege", filters.nearbyCollege);
    if (filters.amenities && filters.amenities.length > 0) {
      params.set("amenities", filters.amenities.join(","));
    }
    if (filters.sort && filters.sort !== "newest") params.set("sort", filters.sort);
    if (filters.page) params.set("page", String(filters.page));
    if (filters.limit) params.set("limit", String(filters.limit));
    if (filters.available === false) params.set("available", "false");

    const qs = params.toString();
    const res = await request<{ listings: Listing[]; pagination: Pagination }>(
      `/api/listings${qs ? `?${qs}` : ""}`
    );
    return res.data!;
  },

  async getListing(id: string) {
    const res = await request<{ listing: Listing }>(`/api/listings/${id}`);
    return res.data!.listing;
  },

  async createListing(formData: FormData) {
    const res = await request<{ listing: Listing }>("/api/listings", {
      method: "POST",
      body: formData,
    });
    return res;
  },

  async updateListing(id: string, formData: FormData) {
    const res = await request<{ listing: Listing }>(`/api/listings/${id}`, {
      method: "PUT",
      body: formData,
    });
    return res;
  },

  async toggleAvailability(id: string) {
    const res = await request<{ listing: Listing }>(`/api/listings/${id}/availability`, {
      method: "PATCH",
    });
    return res;
  },

  async deleteListing(id: string) {
    return request<undefined>(`/api/listings/${id}`, {
      method: "DELETE",
    });
  },

  async revealContact(id: string) {
    const res = await request<{ contact: { name: string; phone: string; email: string } }>(
      `/api/listings/${id}/contact`,
      { method: "POST" }
    );
    return res.data!.contact;
  },

  // Users
  async getProfile() {
    const res = await request<{ user: User }>("/api/users/profile");
    return res.data!.user;
  },

  async updateProfile(formData: FormData) {
    const res = await request<{ user: User }>("/api/users/profile", {
      method: "PUT",
      body: formData,
    });
    return res;
  },

  async getSavedListings() {
    const res = await request<{ listings: Listing[] }>("/api/users/saved");
    return res.data!.listings;
  },

  async toggleSaveListing(listingId: string) {
    const res = await request<{ saved: boolean }>(`/api/users/saved/${listingId}`, {
      method: "POST",
    });
    return res.data!.saved;
  },

  async getMyListings() {
    const res = await request<{ listings: Listing[] }>("/api/users/my-listings");
    return res.data!.listings;
  },

  async submitVerification(documentType: DocumentType, documentFile: File) {
    const formData = new FormData();
    formData.append("documentType", documentType);
    formData.append("document", documentFile);
    return request<{ verification: VerificationRecord }>("/api/users/verification", {
      method: "POST",
      body: formData,
    });
  },

  // Admin
  async getAdminAnalytics() {
    const res = await request<{ analytics: AdminAnalytics }>("/api/admin/analytics");
    return res.data!.analytics;
  },

  async getAdminListings(status: string = "pending", page = 1) {
    const params = new URLSearchParams({ status, page: String(page), limit: "20" });
    const res = await request<{ listings: Listing[]; pagination: Pagination }>(
      `/api/admin/listings?${params.toString()}`
    );
    return res.data!;
  },

  async reviewAdminListing(id: string, status: "approved" | "rejected", rejectionReason?: string) {
    return request<{ listing: Listing }>(`/api/admin/listings/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status, rejectionReason }),
    });
  },

  async getAdminVerifications(status: string = "pending") {
    const params = new URLSearchParams({ status });
    const res = await request<{ verifications: VerificationRecord[] }>(
      `/api/admin/verifications?${params.toString()}`
    );
    return res.data!.verifications;
  },

  async reviewAdminVerification(id: string, status: "approved" | "rejected", reviewNotes?: string) {
    return request<{ verification: VerificationRecord }>(`/api/admin/verifications/${id}`, {
      method: "PUT",
      body: JSON.stringify({ status, reviewNotes }),
    });
  },

  async getAdminUsers(role?: UserRole | "") {
    const params = new URLSearchParams({ limit: "50" });
    if (role) params.set("role", role);
    const res = await request<{ users: User[]; pagination: Pagination }>(
      `/api/admin/users?${params.toString()}`
    );
    return res.data!;
  },

  async toggleSuspendUser(id: string) {
    return request<{ user: User }>(`/api/admin/users/${id}/suspend`, {
      method: "PUT",
    });
  },
};
