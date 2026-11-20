const VALID_DISTRICTS = new Set(["Kathmandu", "Lalitpur", "Bhaktapur"]);
const VALID_ROOM_TYPES = new Set(["single", "double", "flat", "shared"]);
const VALID_AMENITIES = new Set([
  "wifi",
  "parking",
  "kitchen",
  "bathroom_attached",
  "hot_water",
  "laundry",
  "furnishing",
  "balcony",
  "rooftop",
  "garden",
  "cctv",
  "generator_backup",
  "water_tank",
]);

const FORBIDDEN_KEYS = new Set(["__proto__", "constructor", "prototype"]);

/**
 * Recursively strips MongoDB NoSQL operator keys ($...) and dotted keys,
 * and blocks prototype pollution keys.
 */
function stripNoSqlOperators(value) {
  if (Array.isArray(value)) {
    return value.map(stripNoSqlOperators);
  }
  if (value && typeof value === "object") {
    const clean = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith("$") || key.includes(".") || FORBIDDEN_KEYS.has(key)) {
        continue;
      }
      clean[key] = stripNoSqlOperators(val);
    }
    return clean;
  }
  return value;
}

/**
 * Strips script/style elements, HTML tags, null bytes, and control characters
 * to protect stored text against XSS and injection.
 */
function sanitizeText(input, maxLength = 500) {
  if (typeof input !== "string") return "";
  return input
    .replace(/\u0000/g, "")
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "")
    .trim()
    .slice(0, maxLength);
}

/**
 * Validates and sanitizes image/avatar URLs, blocking javascript:, data:, vbscript:, and protocol-relative URLs.
 */
function sanitizeSafeUrl(input) {
  if (typeof input !== "string") return "";
  const trimmed = input.trim();
  if (!trimmed) return "";

  if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
    if (trimmed.includes("..")) return "";
    return trimmed.slice(0, 500);
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol === "https:") {
      return parsed.toString().slice(0, 500);
    }
    return "";
  } catch {
    return "";
  }
}

/**
 * Escapes regex metacharacters to prevent ReDoS in search queries.
 */
function escapeRegex(input) {
  if (typeof input !== "string") return "";
  return input.slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function validateEmail(email) {
  if (typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (trimmed.length > 254) return false;
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i.test(
    trimmed
  );
}

/**
 * Enforces strong password policy: 8-128 chars, at least 1 letter and 1 digit.
 */
function validatePassword(password) {
  if (typeof password !== "string") {
    return { valid: false, message: "Password is required" };
  }
  if (password.length < 8) {
    return { valid: false, message: "Password must be at least 8 characters long" };
  }
  if (password.length > 128) {
    return { valid: false, message: "Password must not exceed 128 characters" };
  }
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one letter and one number",
    };
  }
  return { valid: true };
}

function sanitizePhone(phone) {
  if (typeof phone !== "string") return "";
  return phone.replace(/[^0-9+\-\s()]/g, "").trim().slice(0, 25);
}

function isValidObjectId(id) {
  return typeof id === "string" && /^[a-fA-F0-9]{24}$/.test(id);
}

/**
 * Inspects leading file bytes to verify real JPEG, PNG, or WebP image format.
 */
function verifyImageMagicBytes(buffer) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 12) return false;

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return true;
  }

  // WebP: "RIFF" .... "WEBP"
  if (
    buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
    buffer.subarray(8, 12).toString("ascii") === "WEBP"
  ) {
    return true;
  }

  return false;
}

/**
 * Strictly picks and sanitizes allowlisted fields for listing creation/updates
 * to prevent mass assignment (owner/status/views/contactRequests tampering).
 */
function pickAllowedListingFields(body, { partial = false } = {}) {
  const result = {};

  if (body.title !== undefined || !partial) {
    const title = sanitizeText(body.title, 100);
    if (!title) return { error: "Listing title is required" };
    result.title = title;
  }

  if (body.description !== undefined || !partial) {
    const description = sanitizeText(body.description, 2000);
    if (!description) return { error: "Listing description is required" };
    result.description = description;
  }

  if (body.roomType !== undefined || !partial) {
    if (!VALID_ROOM_TYPES.has(body.roomType)) {
      return { error: "Invalid room type" };
    }
    result.roomType = body.roomType;
  }

  if (body.rent !== undefined || !partial) {
    const rent = Number(body.rent);
    if (!Number.isFinite(rent) || rent < 0 || rent > 10000000) {
      return { error: "Monthly rent must be a valid non-negative number" };
    }
    result.rent = Math.round(rent);
  }

  if (body.deposit !== undefined) {
    const deposit = Number(body.deposit);
    if (!Number.isFinite(deposit) || deposit < 0 || deposit > 50000000) {
      return { error: "Deposit must be a valid non-negative number" };
    }
    result.deposit = Math.round(deposit);
  } else if (!partial) {
    result.deposit = 0;
  }

  if (body.location !== undefined || !partial) {
    let rawLoc = body.location;
    if (typeof rawLoc === "string") {
      try {
        rawLoc = JSON.parse(rawLoc);
      } catch {
        return { error: "Invalid location format" };
      }
    }
    if (!rawLoc || typeof rawLoc !== "object") {
      return { error: "Location details are required" };
    }
    if (!VALID_DISTRICTS.has(rawLoc.district)) {
      return { error: "District must be Kathmandu, Lalitpur, or Bhaktapur" };
    }
    const area = sanitizeText(rawLoc.area, 80);
    const address = sanitizeText(rawLoc.address, 200);
    if (!area || !address) {
      return { error: "Area and street address are required" };
    }
    const loc = {
      district: rawLoc.district,
      area,
      address,
      nearbyCollege: sanitizeText(rawLoc.nearbyCollege || "", 120),
    };
    if (rawLoc.distanceToCollege !== undefined && rawLoc.distanceToCollege !== "") {
      const dist = Number(rawLoc.distanceToCollege);
      if (Number.isFinite(dist) && dist >= 0 && dist <= 100) {
        loc.distanceToCollege = Math.round(dist * 10) / 10;
      }
    }
    result.location = loc;
  }

  if (body.amenities !== undefined) {
    let rawAmenities = body.amenities;
    if (typeof rawAmenities === "string") {
      try {
        rawAmenities = JSON.parse(rawAmenities);
      } catch {
        return { error: "Invalid amenities format" };
      }
    }
    if (!Array.isArray(rawAmenities)) {
      return { error: "Amenities must be a list" };
    }
    result.amenities = [...new Set(rawAmenities.filter((a) => VALID_AMENITIES.has(a)))];
  } else if (!partial) {
    result.amenities = [];
  }

  if (body.rules !== undefined) {
    result.rules = sanitizeText(body.rules, 500);
  }

  if (body.availableFrom !== undefined && body.availableFrom !== "") {
    const dt = new Date(body.availableFrom);
    if (Number.isNaN(dt.getTime())) {
      return { error: "Invalid availableFrom date" };
    }
    result.availableFrom = dt.toISOString();
  } else if (!partial) {
    result.availableFrom = new Date().toISOString();
  }

  return { data: result };
}

module.exports = {
  VALID_DISTRICTS,
  VALID_ROOM_TYPES,
  VALID_AMENITIES,
  stripNoSqlOperators,
  sanitizeText,
  sanitizeSafeUrl,
  escapeRegex,
  validateEmail,
  validatePassword,
  sanitizePhone,
  isValidObjectId,
  verifyImageMagicBytes,
  pickAllowedListingFields,
};
