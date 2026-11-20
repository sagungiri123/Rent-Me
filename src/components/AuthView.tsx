import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { VALLEY_ASSETS } from "../types";

interface AuthViewProps {
  mode: "login" | "register";
  onSwitchMode: (mode: "login" | "register") => void;
  onSuccess: (role: "student" | "owner" | "admin") => void;
  onNotify: (msg: string, tone?: "success" | "error") => void;
}

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
    <div className="bg-[#2B3445] min-h-[calc(100vh-4.5rem)] flex items-center py-14 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 bg-[#1C1B1A] border border-[#333333] rounded-2xl overflow-hidden items-stretch shadow-[0_32px_70px_-20px_rgba(0,0,0,0.55)]">
          {/* Left Editorial Photo */}
          <div className="hidden lg:block lg:col-span-5 relative min-h-[540px] border-r border-[#333333]">
            <img
              src={VALLEY_ASSETS.rooftopSunset}
              alt="Sunset over Kathmandu Valley from a rooftop terrace"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#1C1B1A] via-[#1C1B1A]/35 to-transparent flex flex-col justify-end p-8 text-white space-y-2.5">
              <p className="text-xs font-medium tracking-[0.14em] uppercase text-[#E86A4D]">
                Kathmandu Valley Housing
              </p>
              <h2 className="font-display text-2xl sm:text-[1.75rem] font-medium leading-snug">
                Verified landlords and direct student inquiries—{" "}
                <em className="italic font-normal text-[#E86A4D]">no brokers.</em>
              </h2>
            </div>
          </div>

          {/* Right Matte Charcoal Form */}
          <div className="lg:col-span-7 p-7 sm:p-10 lg:p-12 space-y-7">
            <div className="space-y-2.5">
              <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-white">
                {mode === "login" ? (
                  <>
                    Sign in to <em className="italic font-normal text-[#E86A4D]">RentMe</em>
                  </>
                ) : (
                  <>
                    Create your <em className="italic font-normal text-[#E86A4D]">RentMe</em> account
                  </>
                )}
              </h1>
              <p className="text-sm text-[#A8A49E] leading-relaxed">
                {mode === "login"
                  ? "Access saved rooms, reveal owner phone numbers, or manage your listings."
                  : "Join as a student searching for rooms or as a verified property owner."}
              </p>
            </div>

            {/* Pill Mode Toggle */}
            <div className="flex items-center gap-1 p-1 bg-[#252423] border border-[#333333] rounded-full w-fit">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  onSwitchMode("login");
                }}
                className={`px-5 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                  mode === "login"
                    ? "bg-[#E86A4D] text-white"
                    : "text-[#A8A49E] hover:text-white"
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
                className={`px-5 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer ${
                  mode === "register"
                    ? "bg-[#E86A4D] text-white"
                    : "text-[#A8A49E] hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            {error && (
              <div className="p-4 text-sm text-[#FCA5A5] bg-[#3A1E1E] border border-[#6E3030] rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {mode === "register" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-[#A8A49E] mb-2">
                      Account Role
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setRole("student")}
                        className={`py-2.5 px-4 text-sm font-medium rounded-full border transition-colors cursor-pointer ${
                          role === "student"
                            ? "bg-[#E86A4D] text-white border-[#E86A4D]"
                            : "bg-[#252423] text-[#D8D4CE] border-[#333333] hover:border-[#4A4845]"
                        }`}
                      >
                        Student
                      </button>
                      <button
                        type="button"
                        onClick={() => setRole("owner")}
                        className={`py-2.5 px-4 text-sm font-medium rounded-full border transition-colors cursor-pointer ${
                          role === "owner"
                            ? "bg-[#E86A4D] text-white border-[#E86A4D]"
                            : "bg-[#252423] text-[#D8D4CE] border-[#333333] hover:border-[#4A4845]"
                        }`}
                      >
                        Property Owner
                      </button>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-medium text-[#A8A49E] mb-2">
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
                      className="w-full h-11 px-4 text-sm bg-[#252423] border border-[#333333] rounded-xl text-white placeholder:text-[#78746E] focus:border-[#E86A4D]"
                    />
                  </div>
                </>
              )}

              <div>
                <label htmlFor="auth-email" className="block text-xs font-medium text-[#A8A49E] mb-2">
                  Email Address
                </label>
                <input
                  id="auth-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full h-11 px-4 text-sm bg-[#252423] border border-[#333333] rounded-xl text-white placeholder:text-[#78746E] focus:border-[#E86A4D]"
                />
              </div>

              <div>
                <label htmlFor="auth-password" className="block text-xs font-medium text-[#A8A49E] mb-2">
                  Password
                </label>
                <input
                  id="auth-password"
                  type="password"
                  required
                  minLength={8}
                  maxLength={128}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={
                    mode === "register"
                      ? "At least 8 characters with letters and numbers"
                      : "Enter your password"
                  }
                  className="w-full h-11 px-4 text-sm bg-[#252423] border border-[#333333] rounded-xl text-white placeholder:text-[#78746E] focus:border-[#E86A4D]"
                />
              </div>

              {mode === "register" && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="auth-phone" className="block text-xs font-medium text-[#A8A49E] mb-2">
                      Phone Number
                    </label>
                    <input
                      id="auth-phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+977-98XXXXXXXX"
                      className="w-full h-11 px-4 text-sm bg-[#252423] border border-[#333333] rounded-xl text-white placeholder:text-[#78746E] focus:border-[#E86A4D]"
                    />
                  </div>

                  {role === "student" && (
                    <div>
                      <label htmlFor="auth-college" className="block text-xs font-medium text-[#A8A49E] mb-2">
                        College / Campus
                      </label>
                      <input
                        id="auth-college"
                        type="text"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        placeholder="e.g. Pulchowk Campus"
                        className="w-full h-11 px-4 text-sm bg-[#252423] border border-[#333333] rounded-xl text-white placeholder:text-[#78746E] focus:border-[#E86A4D]"
                      />
                    </div>
                  )}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3.5 px-6 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full transition-colors shadow-[0_12px_28px_-10px_rgba(232,106,77,0.75)] disabled:opacity-60 cursor-pointer"
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
          </div>
        </div>
      </div>
    </div>
  );
}
