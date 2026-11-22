const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { BCRYPT_ROUNDS, signAuthToken } = require("./security");

const PHOTOS = {
  modernFlat: "/assets/aistudio/8e1fdf0b-557a-4c73-9f55-fdf426a5a9f5_c7dbbc3a.jpeg",
  rooftopSunset: "/assets/aistudio/490e9352-85cf-4538-aab4-abe245507933_dbd532fb.jpeg",
  brickSingle: "/assets/aistudio/9303aad1-a51d-4e47-843e-516186d2bcd4_71268c90.jpeg",
  newariHeritage: "/assets/aistudio/a9b752ce-87d5-4c56-a7a6-c4adeb0fde42_3a6741af.jpeg",
};

const genId = () => crypto.randomBytes(12).toString("hex");

function signToken(user) {
  return signAuthToken(user);
}

function sanitizeUser(user) {
  if (!user) return null;
  const copy = { ...user };
  delete copy.password;
  delete copy.googleId;
  return copy;
}

const adminId = "66a100000000000000000001";
const ownerId = "66a100000000000000000002";
const ownerPendingId = "66a100000000000000000004";
const studentId = "66a100000000000000000003";

// Cost-12 bcrypt hashes for non-production sandbox seed accounts
const hashSeed = (pw) => bcrypt.hashSync(pw, BCRYPT_ROUNDS);

function getSeedPassword(envKey, devDefault) {
  if (process.env[envKey]) {
    return process.env[envKey];
  }
  if (process.env.NODE_ENV === "production") {
    return crypto.randomBytes(24).toString("hex");
  }
  return devDefault;
}

const now = Date.now();
const daysAgo = (d) => new Date(now - d * 86400000).toISOString();

const users = [
  {
    _id: adminId,
    name: "Prakash Adhikari",
    email: "admin@rentme.com",
    password: hashSeed(getSeedPassword("SEED_ADMIN_PASSWORD", "Admin@1234")),
    role: "admin",
    phone: "+977-9841000001",
    avatar: "",
    isVerified: true,
    verificationStatus: "approved",
    collegeName: "",
    savedListings: [],
    isSuspended: false,
    createdAt: daysAgo(90),
    updatedAt: daysAgo(5),
  },
  {
    _id: ownerId,
    name: "Sunita Shakya",
    email: "owner@rentme.com",
    password: hashSeed(getSeedPassword("SEED_OWNER_PASSWORD", "Owner@1234")),
    role: "owner",
    phone: "+977-9851123456",
    avatar: "",
    isVerified: true,
    verificationStatus: "approved",
    collegeName: "",
    savedListings: [],
    isSuspended: false,
    createdAt: daysAgo(60),
    updatedAt: daysAgo(2),
  },
  {
    _id: studentId,
    name: "Aarav Shrestha",
    email: "student@rentme.com",
    password: hashSeed(getSeedPassword("SEED_STUDENT_PASSWORD", "Student@1234")),
    role: "student",
    phone: "+977-9860456789",
    avatar: "",
    isVerified: true,
    verificationStatus: "none",
    collegeName: "Pulchowk Engineering Campus",
    savedListings: ["66b200000000000000000001", "66b200000000000000000004"],
    isSuspended: false,
    createdAt: daysAgo(30),
    updatedAt: daysAgo(1),
  },
  {
    _id: ownerPendingId,
    name: "Bikram Maharjan",
    email: "bikram.owner@rentme.com",
    password: hashSeed(getSeedPassword("SEED_OWNER_PASSWORD", "Owner@1234")),
    role: "owner",
    phone: "+977-9841789012",
    avatar: "",
    isVerified: false,
    verificationStatus: "pending",
    collegeName: "",
    savedListings: [],
    isSuspended: false,
    createdAt: daysAgo(4),
    updatedAt: daysAgo(1),
  },
];

const listings = [
  {
    _id: "66b200000000000000000001",
    owner: ownerId,
    title: "Sunlit Brick Single Room near Pulchowk Campus",
    description:
      "A bright, well-ventilated single room with classic exposed brick walls and a carved wooden window overlooking courtyard roofs. Ideal for engineering and architecture students seeking quiet study hours with 24/7 water supply and shared rooftop access.",
    roomType: "single",
    rent: 7500,
    deposit: 5000,
    location: {
      district: "Lalitpur",
      area: "Pulchowk",
      address: "Near Pulchowk Campus Gate, Ward 22",
      nearbyCollege: "Pulchowk Engineering Campus",
      distanceToCollege: 0.3,
    },
    amenities: ["wifi", "hot_water", "water_tank", "kitchen", "rooftop"],
    photos: [PHOTOS.brickSingle, PHOTOS.rooftopSunset],
    rules: "No smoking indoors. Quiet study hours after 10 PM.",
    availableFrom: daysAgo(2),
    isAvailable: true,
    status: "approved",
    views: 148,
    contactRequests: 19,
    createdAt: daysAgo(14),
    updatedAt: daysAgo(2),
  },
  {
    _id: "66b200000000000000000004",
    owner: ownerId,
    title: "Modern 1BHK Flat with Valley Balcony — Sanepa",
    description:
      "Contemporary furnished flat featuring a sage-toned modular kitchen, hardwood floors, and floor-to-ceiling balcony doors opening toward the Kathmandu hills. Separate entrance, reliable fiber internet, and secure scooter parking.",
    roomType: "flat",
    rent: 24000,
    deposit: 20000,
    location: {
      district: "Lalitpur",
      area: "Sanepa",
      address: "Sanepa Height, Ward 3",
      nearbyCollege: "Islington College",
      distanceToCollege: 1.8,
    },
    amenities: [
      "wifi",
      "parking",
      "kitchen",
      "bathroom_attached",
      "hot_water",
      "furnishing",
      "balcony",
      "cctv",
      "generator_backup",
    ],
    photos: [PHOTOS.modernFlat, PHOTOS.rooftopSunset],
    rules: "Two students or couples welcome. No smoking indoors.",
    availableFrom: daysAgo(1),
    isAvailable: true,
    status: "approved",
    views: 214,
    contactRequests: 27,
    createdAt: daysAgo(11),
    updatedAt: daysAgo(1),
  },
  {
    _id: "66b200000000000000000002",
    owner: ownerId,
    title: "Terrace-Access Double Room in Koteshwor",
    description:
      "Spacious furnished double room with direct access to a sunset rooftop terrace overlooking the valley hills. Located two minutes off the ring road with direct tempo and bus connections to major colleges.",
    roomType: "double",
    rent: 12500,
    deposit: 10000,
    location: {
      district: "Kathmandu",
      area: "Koteshwor",
      address: "Koteshwor Chowk, Ward 32",
      nearbyCollege: "CCRC",
      distanceToCollege: 1.2,
    },
    amenities: ["wifi", "parking", "bathroom_attached", "furnishing", "hot_water", "rooftop"],
    photos: [PHOTOS.rooftopSunset, PHOTOS.modernFlat],
    rules: "No pets. Electricity metered separately.",
    availableFrom: daysAgo(5),
    isAvailable: true,
    status: "approved",
    views: 112,
    contactRequests: 14,
    createdAt: daysAgo(9),
    updatedAt: daysAgo(2),
  },
  {
    _id: "66b200000000000000000005",
    owner: ownerId,
    title: "Heritage Courtyard Single Room — Thimi, Bhaktapur",
    description:
      "Peaceful room inside a restored traditional brick residence near Madhyapur Thimi. Cool in summer, sunlit in winter mornings, with reliable municipal and reserve tank water plus fiber WiFi included.",
    roomType: "single",
    rent: 6000,
    deposit: 3000,
    location: {
      district: "Bhaktapur",
      area: "Thimi",
      address: "Madhyapur Thimi, Ward 6",
      nearbyCollege: "Nepal Engineering College",
      distanceToCollege: 1.5,
    },
    amenities: ["wifi", "water_tank", "kitchen", "garden"],
    photos: [PHOTOS.newariHeritage, PHOTOS.brickSingle],
    rules: "Respect quiet courtyard hours after 9:30 PM.",
    availableFrom: daysAgo(3),
    isAvailable: true,
    status: "approved",
    views: 87,
    contactRequests: 9,
    createdAt: daysAgo(7),
    updatedAt: daysAgo(1),
  },
  {
    _id: "66b200000000000000000003",
    owner: ownerId,
    title: "Affordable Shared Study Room — Balkhu",
    description:
      "Clean two-bed shared room just five minutes on foot from Tribhuvan University Main Gate. Individual study desks, bookshelves, and high-speed WiFi included in monthly rent.",
    roomType: "shared",
    rent: 4500,
    deposit: 3000,
    location: {
      district: "Kathmandu",
      area: "Balkhu",
      address: "Balkhu, near TU Main Gate",
      nearbyCollege: "Tribhuvan University",
      distanceToCollege: 0.5,
    },
    amenities: ["wifi", "kitchen", "water_tank", "laundry"],
    photos: [PHOTOS.brickSingle],
    rules: "Students only. Visitors until 8 PM.",
    availableFrom: daysAgo(4),
    isAvailable: true,
    status: "approved",
    views: 164,
    contactRequests: 23,
    createdAt: daysAgo(6),
    updatedAt: daysAgo(1),
  },
  {
    _id: "66b200000000000000000006",
    owner: ownerId,
    title: "Quiet Studio Room near New Baneshwor",
    description:
      "Secure top-floor room for students near New Baneshwor with owner family living downstairs. Includes attached bathroom, small kitchenette counter, solar hot water, and CCTV at main gate.",
    roomType: "single",
    rent: 9000,
    deposit: 6000,
    location: {
      district: "Kathmandu",
      area: "Baneshwor",
      address: "New Baneshwor, Ward 10",
      nearbyCollege: "Shanker Dev Campus",
      distanceToCollege: 0.8,
    },
    amenities: ["wifi", "bathroom_attached", "hot_water", "cctv", "water_tank"],
    photos: [PHOTOS.modernFlat, PHOTOS.brickSingle],
    rules: "Gate closes at 9:30 PM. No loud music.",
    availableFrom: daysAgo(1),
    isAvailable: true,
    status: "approved",
    views: 132,
    contactRequests: 17,
    createdAt: daysAgo(5),
    updatedAt: daysAgo(1),
  },
  {
    _id: "66b200000000000000000007",
    owner: ownerId,
    title: "Corner Balcony Flat near Patan Durbar Square",
    description:
      "Newly renovated two-room student flat overlooking brick lanes in Patan. Includes dining corner, reliable water reserve, and rooftop laundry drying area. Awaiting admin verification.",
    roomType: "flat",
    rent: 19500,
    deposit: 15000,
    location: {
      district: "Lalitpur",
      area: "Patan",
      address: "Mangalbazar Lane, Ward 16",
      nearbyCollege: "Patan Multiple Campus",
      distanceToCollege: 0.4,
    },
    amenities: ["wifi", "kitchen", "balcony", "hot_water", "water_tank", "rooftop"],
    photos: [PHOTOS.newariHeritage, PHOTOS.modernFlat],
    rules: "Non-smoking building. Long-term semester stay preferred.",
    availableFrom: daysAgo(0),
    isAvailable: true,
    status: "pending",
    views: 5,
    contactRequests: 0,
    createdAt: daysAgo(1),
    updatedAt: daysAgo(1),
  },
];

const verifications = [
  {
    _id: "66c300000000000000000001",
    user: ownerPendingId,
    documentType: "citizenship",
    documentUrl: PHOTOS.newariHeritage,
    status: "pending",
    reviewedBy: null,
    reviewNotes: "",
    submittedAt: daysAgo(2),
    reviewedAt: null,
    createdAt: daysAgo(2),
    updatedAt: daysAgo(2),
  },
  {
    _id: "66c300000000000000000002",
    user: ownerId,
    documentType: "ownership_proof",
    documentUrl: PHOTOS.modernFlat,
    status: "approved",
    reviewedBy: adminId,
    reviewNotes: "Lalpurja and identity verified against Lalitpur Ward 22 records.",
    submittedAt: daysAgo(58),
    reviewedAt: daysAgo(57),
    createdAt: daysAgo(58),
    updatedAt: daysAgo(57),
  },
];

/**
 * Populates owner summary on listings.
 * By default, NEVER exposes owner phone or email publicly — only when includeContact=true (admin/revealContact).
 */
function populateOwner(listing, { includeContact = false } = {}) {
  const owner = users.find((u) => u._id === listing.owner);
  const ownerObj = owner
    ? {
        _id: owner._id,
        name: owner.name,
        avatar: owner.avatar || "",
        ...(includeContact ? { phone: owner.phone || "", email: owner.email } : {}),
      }
    : { _id: listing.owner, name: "Property Owner", avatar: "" };
  return { ...listing, owner: ownerObj };
}

function populateUserForVerification(v) {
  const user = users.find((u) => u._id === v.user);
  return {
    ...v,
    user: user
      ? {
          _id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || "",
          role: user.role,
        }
      : { _id: v.user, name: "Unknown User", email: "", phone: "", role: "owner" },
  };
}

module.exports = {
  users,
  listings,
  verifications,
  genId,
  signToken,
  sanitizeUser,
  populateOwner,
  populateUserForVerification,
};
