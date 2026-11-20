import { useState } from "react";
import { Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import type { District } from "../types";

export interface NavbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onSelectDistrict: (district: District) => void;
}

export function Navbar({ currentPath, onNavigate, onSelectDistrict }: NavbarProps) {
  const { user, savedIds } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isAuthPage = currentPath === "/login" || currentPath === "/register";

  const handleNav = (path: string) => {
    setMobileOpen(false);
    onNavigate(path);
  };

  const handleDistrictNav = (district: District) => {
    setMobileOpen(false);
    onSelectDistrict(district);
  };

  const linkClass = (active: boolean) =>
    `text-sm font-medium whitespace-nowrap shrink-0 pb-0.5 border-b transition-colors ${
      isAuthPage
        ? active
          ? "text-white border-[#E86A4D]"
          : "text-white/75 border-transparent hover:text-white hover:border-white/40"
        : active
          ? "text-[#1A1A1A] border-[#E86A4D]"
          : "text-[#666666] border-transparent hover:text-[#1A1A1A] hover:border-[#EAE6E0]"
    }`;

  return (
    <header
      className={`sticky top-0 z-40 backdrop-blur-md border-b transition-colors ${
        isAuthPage
          ? "bg-[#2B3445]/95 border-[#3B465A]"
          : "bg-[#FFFFFF]/95 border-[#EAE6E0]"
      }`}
    >
      <div className="max-w-7xl mx-auto px-5 sm:px-8 h-18 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav("/")}
          className={`font-display text-2xl font-semibold tracking-tight whitespace-nowrap shrink-0 cursor-pointer ${
            isAuthPage ? "text-white" : "text-[#1A1A1A]"
          }`}
        >
          RentMe
        </button>

        {/* Zone 2: 4–5 Clean Single-Line Nav Links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-8">
          <button
            type="button"
            onClick={() => handleNav("/")}
            className={`${linkClass(currentPath === "/")} cursor-pointer`}
          >
            Explore
          </button>

          {!user && (
            <>
              <button
                type="button"
                onClick={() => handleDistrictNav("Kathmandu")}
                className={`${linkClass(false)} cursor-pointer`}
              >
                Kathmandu
              </button>
              <button
                type="button"
                onClick={() => handleDistrictNav("Lalitpur")}
                className={`${linkClass(false)} cursor-pointer`}
              >
                Lalitpur
              </button>
              <button
                type="button"
                onClick={() => handleDistrictNav("Bhaktapur")}
                className={`${linkClass(false)} cursor-pointer`}
              >
                Bhaktapur
              </button>
              <button
                type="button"
                onClick={() => handleNav("/register")}
                className={`${linkClass(currentPath === "/register")} cursor-pointer`}
              >
                For Owners
              </button>
            </>
          )}

          {user?.role === "student" && (
            <>
              <button
                type="button"
                onClick={() => handleDistrictNav("Lalitpur")}
                className={`${linkClass(false)} cursor-pointer`}
              >
                Lalitpur
              </button>
              <button
                type="button"
                onClick={() => handleDistrictNav("Kathmandu")}
                className={`${linkClass(false)} cursor-pointer`}
              >
                Kathmandu
              </button>
              <button
                type="button"
                onClick={() => handleNav("/saved")}
                className={`${linkClass(currentPath === "/saved")} cursor-pointer tabular-nums`}
              >
                Saved ({savedIds.size})
              </button>
              <button
                type="button"
                onClick={() => handleNav("/profile")}
                className={`${linkClass(currentPath === "/profile")} cursor-pointer`}
              >
                Profile
              </button>
            </>
          )}

          {user?.role === "owner" && (
            <>
              <button
                type="button"
                onClick={() => handleNav("/owner")}
                className={`${linkClass(currentPath === "/owner")} cursor-pointer`}
              >
                My Listings
              </button>
              <button
                type="button"
                onClick={() => handleDistrictNav("Kathmandu")}
                className={`${linkClass(false)} cursor-pointer`}
              >
                Valley Market
              </button>
              <button
                type="button"
                onClick={() => handleNav("/profile")}
                className={`${linkClass(currentPath === "/profile")} cursor-pointer`}
              >
                Profile
              </button>
            </>
          )}

          {user?.role === "admin" && (
            <>
              <button
                type="button"
                onClick={() => handleNav("/admin")}
                className={`${linkClass(currentPath === "/admin")} cursor-pointer`}
              >
                Moderation
              </button>
              <button
                type="button"
                onClick={() => handleDistrictNav("Kathmandu")}
                className={`${linkClass(false)} cursor-pointer`}
              >
                Catalog
              </button>
              <button
                type="button"
                onClick={() => handleNav("/profile")}
                className={`${linkClass(currentPath === "/profile")} cursor-pointer`}
              >
                Account
              </button>
            </>
          )}
        </nav>

        {/* Zone 3: 1 Primary Pill Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          {!user ? (
            <button
              type="button"
              onClick={() => handleNav("/login")}
              className="hidden md:inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D55A3E] rounded-full shadow-[0_8px_20px_-8px_rgba(232,106,77,0.55)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          ) : user.role === "owner" ? (
            <button
              type="button"
              onClick={() => handleNav("/owner")}
              className="hidden md:inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D55A3E] rounded-full shadow-[0_8px_20px_-8px_rgba(232,106,77,0.55)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              List a Room
            </button>
          ) : user.role === "admin" ? (
            <button
              type="button"
              onClick={() => handleNav("/admin")}
              className="hidden md:inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D55A3E] rounded-full shadow-[0_8px_20px_-8px_rgba(232,106,77,0.55)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              Admin Console
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNav("/saved")}
              className="hidden md:inline-flex items-center justify-center px-6 py-2.5 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D55A3E] rounded-full shadow-[0_8px_20px_-8px_rgba(232,106,77,0.55)] transition-all whitespace-nowrap shrink-0 cursor-pointer"
            >
              Saved Rooms
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className={`md:hidden inline-flex items-center justify-center w-11 h-11 rounded-full border cursor-pointer ${
              isAuthPage
                ? "border-[#3B465A] text-white bg-[#1C1B1A]"
                : "border-[#EAE6E0] text-[#1A1A1A] bg-white"
            }`}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div
          className={`md:hidden border-t px-5 py-5 space-y-2 ${
            isAuthPage
              ? "border-[#3B465A] bg-[#1C1B1A] text-white"
              : "border-[#EAE6E0] bg-white text-[#1A1A1A]"
          }`}
        >
          <button
            type="button"
            onClick={() => handleNav("/")}
            className={`block w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl ${
              isAuthPage ? "hover:bg-[#2B3445]" : "hover:bg-[#F7F5F2]"
            }`}
          >
            Explore Listings
          </button>
          <button
            type="button"
            onClick={() => handleDistrictNav("Kathmandu")}
            className={`block w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl ${
              isAuthPage ? "text-white/80 hover:bg-[#2B3445]" : "text-[#666666] hover:bg-[#F7F5F2]"
            }`}
          >
            Kathmandu
          </button>
          <button
            type="button"
            onClick={() => handleDistrictNav("Lalitpur")}
            className={`block w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl ${
              isAuthPage ? "text-white/80 hover:bg-[#2B3445]" : "text-[#666666] hover:bg-[#F7F5F2]"
            }`}
          >
            Lalitpur
          </button>
          <button
            type="button"
            onClick={() => handleDistrictNav("Bhaktapur")}
            className={`block w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl ${
              isAuthPage ? "text-white/80 hover:bg-[#2B3445]" : "text-[#666666] hover:bg-[#F7F5F2]"
            }`}
          >
            Bhaktapur
          </button>
          {user?.role === "student" && (
            <button
              type="button"
              onClick={() => handleNav("/saved")}
              className="block w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl hover:bg-[#F7F5F2]"
            >
              Saved Rooms ({savedIds.size})
            </button>
          )}
          {user?.role === "owner" && (
            <button
              type="button"
              onClick={() => handleNav("/owner")}
              className="block w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl hover:bg-[#F7F5F2]"
            >
              Owner Hub & My Listings
            </button>
          )}
          {user?.role === "admin" && (
            <button
              type="button"
              onClick={() => handleNav("/admin")}
              className="block w-full text-left px-4 py-2.5 text-sm font-medium rounded-xl hover:bg-[#F7F5F2]"
            >
              Admin Moderation Console
            </button>
          )}
          {user ? (
            <button
              type="button"
              onClick={() => handleNav("/profile")}
              className="block w-full text-left px-4 py-2.5 text-sm font-semibold text-[#E86A4D] rounded-xl hover:bg-[#F7F5F2]"
            >
              Profile ({user.name})
            </button>
          ) : (
            <div className="pt-3 border-t border-[#EAE6E0]/30 flex gap-3">
              <button
                type="button"
                onClick={() => handleNav("/login")}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-[#E86A4D] rounded-full"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleNav("/register")}
                className={`flex-1 py-2.5 text-sm font-medium rounded-full border ${
                  isAuthPage
                    ? "text-white border-[#333333] bg-[#252423]"
                    : "text-[#1A1A1A] border-[#EAE6E0] bg-white"
                }`}
              >
                Register
              </button>
            </div>
          )}
        </div>
      )}
    </header>
  );
}
