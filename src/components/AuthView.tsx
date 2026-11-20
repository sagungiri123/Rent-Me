import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { VALLEY_ASSETS } from "../types";

interface AuthViewProps {
  mode: "login" | "register";
  onSwitchMode: (mode: "login" | "register") => void;
  onSuccess: (role: "student" | "owner" | "admin") => void;
  onNotify: (msg: string, tone?: "success" | "error") => void;
}

const DEMO_ACCOUNTS = [
  { label: "Student", email: "student@rentme.com", password: "student123" },
  { label: "Verified Owner", email: "owner@rentme.com", password: "owner123" },
  { label: "Pending Owner", email: "bikram.owner@rentme.com", password: "owner123" },
  { label: "Admin", email: "admin@rentme.com", password: "admin123" },
];

export function AuthView({ mode, onSwitchMode, onSuccess, onNotify }: AuthViewProps) {
  const { login, register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"student" | "owner">("student");
  const [phone, setPhone] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (mode === "login") {
        const user = await login(email, password);
        onNotify(`Welcome back, ${user.name}.`, "success");
        onSuccess(user.role);
      } else {
        const user = await register({
          name,
          email,
          password,
          role,
          phone,
          collegeName: role === "student" ? collegeName : undefined,
        });
        onNotify(`Account created for ${user.name}.`, "success");
        onSuccess(user.role);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="grid grid-cols-1 lg:grid-cols-12 bg-white border border-[#E6E3DC] rounded-xl overflow-hidden items-stretch">
        {/* Left Editorial Photo */}
        <div className="hidden lg:block lg:col-span-5 relative min-h-[520px]">
          <img
            src={VALLEY_ASSETS.rooftopSunset}
            alt="Sunset over Kathmandu Valley from a rooftop terrace"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent flex flex-col justify-end p-8 text-white">
            <p className="text-xs font-medium text-white/80 mb-2">Kathmandu Valley Housing</p>
            <h2 className="font-display text-2xl font-semibold leading-snug">
              Verified landlords and direct student inquiries—no brokers.
            </h2>
          </div>
        </div>

        {/* Right Form */}
        <div className="lg:col-span-7 p-6 sm:p-10 space-y-6">
          <div className="space-y-2">
            <h1 className="font-display text-3xl font-semibold text-[#1C1F22]">
              {mode === "login" ? "Sign in to RentMe" : "Create your RentMe account"}
            </h1>
            <p className="text-sm text-[#5A5E63]">
              {mode === "login"
                ? "Access saved rooms, reveal owner phone numbers, or manage your listings."
                : "Join as a student searching for rooms or as a verified property owner."}
            </p>
          </div>

          {/* Mode Toggle */}
          <div className="flex items-center gap-1 p-1 bg-[#F2F0EB] rounded-lg w-fit">
            <button
              type="button"
              onClick={() => {
                setError(null);
                onSwitchMode("login");
              }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === "login" ? "bg-white text-[#1C1F22] shadow-xs" : "text-[#5A5E63]"
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setError(null);
                onSwitchMode("register");
              }}
              className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                mode === "register" ? "bg-white text-[#1C1F22] shadow-xs" : "text-[#5A5E63]"
              }`}
            >
              Register
            </button>
          </div>

          {error && (
            <div className="p-3.5 text-sm text-[#9A3412] bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-[#5A5E63] mb-1.5">
                    Account Role
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRole("student")}
                      className={`py-2.5 px-3 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                        role === "student"
                          ? "bg-[#264D3B] text-white border-[#264D3B]"
                          : "bg-[#FAF9F6] text-[#1C1F22] border-[#DDD9D0]"
                      }`}
                    >
                      Student
                    </button>
                    <button
                      type="button"
                      onClick={() => setRole("owner")}
                      className={`py-2.5 px-3 text-sm font-medium rounded-lg border transition-colors cursor-pointer ${
                        role === "owner"
                          ? "bg-[#264D3B] text-white border-[#264D3B]"
                          : "bg-[#FAF9F6] text-[#1C1F22] border-[#DDD9D0]"
                      }`}
                    >
                      Property Owner
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="auth-name" className="block text-xs font-medium text-[#5A5E63] mb-1.5">
                    Full Name
                  </label>
                  <input
                    id="auth-name"
                    type="text"
                    required
                    maxLength={50}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Sita Gurung"
                    className="w-full h-11 px-3.5 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1F22]"
                  />
                </div>
              </>
            )}

            <div>
              <label htmlFor="auth-email" className="block text-xs font-medium text-[#5A5E63] mb-1.5">
                Email Address
              </label>
              <input
                id="auth-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full h-11 px-3.5 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1F22]"
              />
            </div>

            <div>
              <label htmlFor="auth-password" className="block text-xs font-medium text-[#5A5E63] mb-1.5">
                Password
              </label>
              <input
                id="auth-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimum 6 characters"
                className="w-full h-11 px-3.5 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1F22]"
              />
            </div>

            {mode === "register" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="auth-phone" className="block text-xs font-medium text-[#5A5E63] mb-1.5">
                    Phone Number
                  </label>
                  <input
                    id="auth-phone"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+977-98XXXXXXXX"
                    className="w-full h-11 px-3.5 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1F22]"
                  />
                </div>

                {role === "student" && (
                  <div>
                    <label htmlFor="auth-college" className="block text-xs font-medium text-[#5A5E63] mb-1.5">
                      College / Campus
                    </label>
                    <input
                      id="auth-college"
                      type="text"
                      value={collegeName}
                      onChange={(e) => setCollegeName(e.target.value)}
                      placeholder="e.g. Pulchowk Campus"
                      className="w-full h-11 px-3.5 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg text-[#1C1F22]"
                    />
                  </div>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
            >
              {submitting
                ? mode === "login"
                  ? "Signing in..."
                  : "Creating account..."
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </button>
          </form>

          {mode === "login" && (
            <div className="pt-5 border-t border-[#EFECE6] space-y-2.5">
              <p className="text-xs font-medium text-[#5A5E63]">Quick Demo Accounts (click to fill)</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {DEMO_ACCOUNTS.map((acct) => (
                  <button
                    key={acct.email}
                    type="button"
                    onClick={() => {
                      setEmail(acct.email);
                      setPassword(acct.password);
                      setError(null);
                    }}
                    className="px-2.5 py-2 text-xs font-medium text-[#1C1F22] bg-[#FAF9F6] hover:bg-[#F2F0EB] border border-[#E6E3DC] rounded-lg transition-colors whitespace-nowrap truncate cursor-pointer"
                  >
                    {acct.label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
