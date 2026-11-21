export type UserRole = "student" | "owner" | "admin";
export type VerificationStatus = "none" | "pending" | "approved" | "rejected";
export type ListingStatus = "pending" | "approved" | "rejected";
export type District = "Kathmandu" | "Lalitpur" | "Bhaktapur";
export type RoomType = "single" | "double" | "flat" | "shared";
export type DocumentType = "citizenship" | "ownership_proof" | "college_id";

export type AmenityKey =
  | "wifi"
  | "parking"
  | "kitchen"
  | "bathroom_attached"
  | "hot_water"
  | "laundry"
  | "furnishing"
  | "balcony"
  | "rooftop"
  | "garden"
  | "cctv"
  | "generator_backup"
  | "water_tank";

export interface User {
  _id: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  avatar?: string;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  collegeName?: string;
  savedListings?: Array<string | Listing>;
  isSuspended: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface ListingOwner {
  _id: string;
  name: string;
  phone?: string;
  email?: string;
  avatar?: string;
}

export interface ListingLocation {
  district: District;
  area: string;
  address: string;
  coordinates?: {
    lat?: number;
    lng?: number;
  };
  nearbyCollege?: string;
  distanceToCollege?: number;
}

export interface Listing {
  _id: string;
  owner: ListingOwner | string;
  title: string;
  description: string;
  roomType: RoomType;
  rent: number;
  deposit: number;
  location: ListingLocation;
  amenities: AmenityKey[];
  photos: string[];
  rules?: string;
  availableFrom: string;
  isAvailable: boolean;
  status: ListingStatus;
  rejectionReason?: string;
  views: number;
  contactRequests: number;
  createdAt: string;
  updatedAt?: string;
}

export interface VerificationRecord {
  _id: string;
  user: {
    _id: string;
    name: string;
    email: string;
    phone?: string;
    role: UserRole;
  };
  documentType: DocumentType;
  documentUrl: string;
  status: "pending" | "approved" | "rejected";
  reviewNotes?: string;
  submittedAt: string;
  reviewedAt?: string | null;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface AdminAnalytics {
  totalUsers: number;
  totalStudents: number;
  totalOwners: number;
  totalListings: number;
  approvedListings: number;
  pendingListings: number;
  pendingVerifications: number;
}

export interface ListingFilters {
  district: string;
  area: string;
  minRent: string;
  maxRent: string;
  roomType: string;
  amenities: AmenityKey[];
  nearbyCollege: string;
  sort: "newest" | "price_asc" | "price_desc" | "popular";
  page: number;
}

export const DISTRICTS: District[] = ["Kathmandu", "Lalitpur", "Bhaktapur"];

export const ROOM_TYPE_LABELS: Record<RoomType, string> = {
  single: "Single Room",
  double: "Double Room",
  flat: "Full Flat",
  shared: "Shared Room",
};

export const AMENITY_LABELS: Record<AmenityKey, string> = {
  wifi: "High-Speed WiFi",
  parking: "Bike / Car Parking",
  kitchen: "Kitchen Access",
  bathroom_attached: "Attached Bathroom",
  hot_water: "Solar / Hot Water",
  laundry: "Laundry Area",
  furnishing: "Furnished",
  balcony: "Private Balcony",
  rooftop: "Rooftop Access",
  garden: "Courtyard / Garden",
  cctv: "CCTV Security",
  generator_backup: "Inverter / Backup",
  water_tank: "24/7 Water Reserve",
};

export const ALL_AMENITIES = Object.keys(AMENITY_LABELS) as AmenityKey[];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  citizenship: "Nepali Citizenship Certificate",
  ownership_proof: "Property Ownership (Lalpurja)",
  college_id: "Institutional / College ID",
};

export const VALLEY_ASSETS = {
  modernFlat: "/assets/aistudio/8e1fdf0b-557a-4c73-9f55-fdf426a5a9f5_c7dbbc3a.jpeg",
  rooftopSunset: "/assets/aistudio/490e9352-85cf-4538-aab4-abe245507933_dbd532fb.jpeg",
  brickSingle: "/assets/aistudio/9303aad1-a51d-4e47-843e-516186d2bcd4_71268c90.jpeg",
  newariHeritage: "/assets/aistudio/a9b752ce-87d5-4c56-a7a6-c4adeb0fde42_3a6741af.jpeg",
};

export function formatNPR(amount: number): string {
  return `NPR ${Number(amount || 0).toLocaleString("en-IN")}`;
}

export function formatShortDate(dateStr?: string): string {
  if (!dateStr) return "Immediately";
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return "Immediately";
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
