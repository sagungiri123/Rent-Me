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
      active
        ? "text-[#1C1F22] border-[#264D3B]"
        : "text-[#5A5E63] border-transparent hover:text-[#1C1F22] hover:border-[#C5C1B8]"
    }`;

  return (
    <header className="sticky top-0 z-40 bg-[#FAF9F6]/95 backdrop-blur-sm border-b border-[#E6E3DC]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <button
          type="button"
          onClick={() => handleNav("/")}
          className="font-display text-2xl font-bold tracking-tight text-[#1C1F22] whitespace-nowrap shrink-0 cursor-pointer"
        >
          RentMe
        </button>

        {/* Zone 2: 4–5 Clean Single-Line Nav Links */}
        <nav aria-label="Primary" className="hidden md:flex items-center gap-7">
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

        {/* Zone 3: 1 Primary Action Button */}
        <div className="flex items-center gap-3 shrink-0">
          {!user ? (
            <button
              type="button"
              onClick={() => handleNav("/login")}
              className="hidden md:inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign In
            </button>
          ) : user.role === "owner" ? (
            <button
              type="button"
              onClick={() => handleNav("/owner")}
              className="hidden md:inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              List a Room
            </button>
          ) : user.role === "admin" ? (
            <button
              type="button"
              onClick={() => handleNav("/admin")}
              className="hidden md:inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Admin Console
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleNav("/saved")}
              className="hidden md:inline-flex items-center justify-center px-5 py-2.5 text-sm font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Saved Rooms
            </button>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-[#E6E3DC] text-[#1C1F22] bg-white cursor-pointer"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-[#E6E3DC] bg-[#FAF9F6] px-4 py-4 space-y-2">
          <button
            type="button"
            onClick={() => handleNav("/")}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#1C1F22] rounded-lg hover:bg-[#F2F0EB]"
          >
            Explore Listings
          </button>
          <button
            type="button"
            onClick={() => handleDistrictNav("Kathmandu")}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#5A5E63] rounded-lg hover:bg-[#F2F0EB]"
          >
            Kathmandu
          </button>
          <button
            type="button"
            onClick={() => handleDistrictNav("Lalitpur")}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#5A5E63] rounded-lg hover:bg-[#F2F0EB]"
          >
            Lalitpur
          </button>
          <button
            type="button"
            onClick={() => handleDistrictNav("Bhaktapur")}
            className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#5A5E63] rounded-lg hover:bg-[#F2F0EB]"
          >
            Bhaktapur
          </button>
          {user?.role === "student" && (
            <button
              type="button"
              onClick={() => handleNav("/saved")}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#1C1F22] rounded-lg hover:bg-[#F2F0EB]"
            >
              Saved Rooms ({savedIds.size})
            </button>
          )}
          {user?.role === "owner" && (
            <button
              type="button"
              onClick={() => handleNav("/owner")}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#1C1F22] rounded-lg hover:bg-[#F2F0EB]"
            >
              Owner Hub & My Listings
            </button>
          )}
          {user?.role === "admin" && (
            <button
              type="button"
              onClick={() => handleNav("/admin")}
              className="block w-full text-left px-3 py-2.5 text-sm font-medium text-[#1C1F22] rounded-lg hover:bg-[#F2F0EB]"
            >
              Admin Moderation Console
            </button>
          )}
          {user ? (
            <button
              type="button"
              onClick={() => handleNav("/profile")}
              className="block w-full text-left px-3 py-2.5 text-sm font-semibold text-[#264D3B] rounded-lg hover:bg-[#F2F0EB]"
            >
              Profile ({user.name})
            </button>
          ) : (
            <div className="pt-2 border-t border-[#E6E3DC] flex gap-2">
              <button
                type="button"
                onClick={() => handleNav("/login")}
                className="flex-1 py-2.5 text-sm font-semibold text-white bg-[#264D3B] rounded-lg"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleNav("/register")}
                className="flex-1 py-2.5 text-sm font-semibold text-[#1C1F22] bg-white border border-[#D8D4CB] rounded-lg"
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
