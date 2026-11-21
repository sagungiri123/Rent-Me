import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const {
  stripNoSqlOperators,
  sanitizeText,
  sanitizeSafeUrl,
  escapeRegex,
  validateEmail,
  validatePassword,
  isValidObjectId,
  verifyImageMagicBytes,
  pickAllowedListingFields,
} = require("./sanitize.js");

const {
  getJwtSecret,
  signAuthToken,
  verifyAuthToken,
  isOriginAllowed,
} = require("../config/security.js");

test("stripNoSqlOperators removes $ operators, dotted keys, and prototype pollution keys", () => {
  const hostile = JSON.parse(
    '{"email":{"$ne":""},"$where":"1==1","user.role":"admin","__proto__":{"polluted":true},"name":"Aarav"}'
  );
  const cleaned = stripNoSqlOperators(hostile);
  assert.deepEqual(cleaned, { email: {}, name: "Aarav" });
  assert.equal(({} as Record<string, unknown>).polluted, undefined);
});

test("sanitizeText strips XSS script tags, inline HTML, and null bytes", () => {
  const xss = '<script>alert("xss")</script><img src=x onerror=alert(1)><b>Sunlit Room</b>\u0000';
  assert.equal(sanitizeText(xss, 100), "Sunlit Room");
});

test("sanitizeSafeUrl blocks javascript:, data:, and protocol-relative URLs", () => {
  assert.equal(sanitizeSafeUrl("javascript:alert(1)"), "");
  assert.equal(sanitizeSafeUrl("data:text/html,<script>alert(1)</script>"), "");
  assert.equal(sanitizeSafeUrl("//evil.example.com/x.png"), "");
  assert.equal(sanitizeSafeUrl("/uploads/../.env"), "");
  assert.equal(sanitizeSafeUrl("/uploads/room.jpg"), "/uploads/room.jpg");
  assert.equal(sanitizeSafeUrl("https://cdn.example.com/room.jpg"), "https://cdn.example.com/room.jpg");
});

test("escapeRegex prevents ReDoS patterns in search input", () => {
  const raw = "((a+)+)$.*";
  const escaped = escapeRegex(raw);
  assert.equal(escaped, "\\(\\(a\\+\\)\\+\\)\\$\\.\\*");
  assert.doesNotThrow(() => new RegExp(escaped, "i"));
});

test("validatePassword enforces 8+ chars, letter + digit, and max length cap", () => {
  assert.equal(validatePassword("short1").valid, false);
  assert.equal(validatePassword("onlyletters").valid, false);
  assert.equal(validatePassword("12345678").valid, false);
  assert.equal(validatePassword("A".repeat(129) + "1").valid, false);
  assert.equal(validatePassword("Kathmandu2026").valid, true);
});

test("validateEmail and isValidObjectId reject malformed inputs", () => {
  assert.equal(validateEmail("student@rentme.com"), true);
  assert.equal(validateEmail("not-an-email"), false);
  assert.equal(isValidObjectId("66b200000000000000000001"), true);
  assert.equal(isValidObjectId("invalid-id; DROP TABLE"), false);
});

test("verifyImageMagicBytes accepts JPEG/PNG/WebP and rejects spoofed HTML/scripts", () => {
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
  const webp = Buffer.from("RIFF1234WEBP", "ascii");
  const forged = Buffer.from("<script>alert(1)</script>", "utf8");

  assert.equal(verifyImageMagicBytes(jpeg), true);
  assert.equal(verifyImageMagicBytes(png), true);
  assert.equal(verifyImageMagicBytes(webp), true);
  assert.equal(verifyImageMagicBytes(forged), false);
});

test("pickAllowedListingFields blocks mass assignment of owner, status, and views", () => {
  const payload = {
    title: "<script>bad()</script>Pulchowk Single Room",
    description: "Quiet bright room near campus.",
    roomType: "single",
    rent: 8000,
    deposit: 5000,
    location: {
      district: "Lalitpur",
      area: "Pulchowk",
      address: "Ward 22",
      nearbyCollege: "Pulchowk Campus",
      distanceToCollege: 0.4,
    },
    amenities: ["wifi", "injected_bad_amenity"],
    owner: "66a100000000000000000001",
    status: "approved",
    views: 99999,
  };

  const { data, error } = pickAllowedListingFields(payload);
  assert.equal(error, undefined);
  assert.equal(data.title, "Pulchowk Single Room");
  assert.deepEqual(data.amenities, ["wifi"]);
  assert.equal(data.owner, undefined);
  assert.equal(data.status, undefined);
  assert.equal(data.views, undefined);
});

test("JWT HS256 token signing and verification plus strict CORS allowlist", () => {
  const token = signAuthToken({ _id: "66a100000000000000000003", role: "student" });
  const decoded = verifyAuthToken(token);
  assert.equal(decoded.id, "66a100000000000000000003");
  assert.equal(decoded.role, "student");

  assert.equal(isOriginAllowed("http://localhost:3000", "localhost:3000"), true);
  assert.equal(isOriginAllowed("https://evil.attacker.example", "localhost:3000"), false);
});

test("getJwtSecret falls back cleanly to a 256-bit in-memory CSPRNG secret in production", () => {
  const prevEnv = process.env.NODE_ENV;
  const prevSecret = process.env.JWT_SECRET;
  try {
    process.env.NODE_ENV = "production";
    delete process.env.JWT_SECRET;
    const secret = getJwtSecret();
    assert.equal(typeof secret, "string");
    assert.ok(secret.length >= 64, "Ephemeral secret must be at least 64 hex chars (256-bit)");
    assert.equal(getJwtSecret(), secret, "Ephemeral secret must remain stable within process");
  } finally {
    if (prevEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = prevEnv;
    if (prevSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = prevSecret;
  }
});
