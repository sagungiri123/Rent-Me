import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import type { District, ListingFilters } from "./types";
import { Navbar } from "./components/Navbar";
import { ExploreView } from "./components/ExploreView";
import { ListingDetailView } from "./components/ListingDetailView";
import { AuthView } from "./components/AuthView";
import { SavedListingsView } from "./components/SavedListingsView";
import { OwnerDashboardView } from "./components/OwnerDashboardView";
import { AdminDashboardView } from "./components/AdminDashboardView";
import { ProfileView } from "./components/ProfileView";
import { LoadingSkeleton } from "./components/LoadingSkeleton";

const INITIAL_FILTERS: ListingFilters = {
  district: "",
  area: "",
  minRent: "",
  maxRent: "",
  roomType: "",
  amenities: [],
  nearbyCollege: "",
  sort: "newest",
  page: 1,
};

interface ToastState {
  id: number;
  message: string;
  tone: "success" | "error";
}

function RentMeAppShell() {
  const { user, loading } = useAuth();
  const [path, setPath] = useState<string>(() => window.location.pathname || "/");
  const [filters, setFilters] = useState<ListingFilters>(INITIAL_FILTERS);
  const [toast, setToast] = useState<ToastState | null>(null);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname || "/");
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = useCallback((nextPath: string) => {
    if (window.location.pathname !== nextPath) {
      window.history.pushState({}, "", nextPath);
    }
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, []);

  const notify = useCallback((message: string, tone: "success" | "error" = "success") => {
    const id = Date.now();
    setToast({ id, message, tone });
    window.setTimeout(() => {
      setToast((curr) => (curr?.id === id ? null : curr));
    }, 4200);
  }, []);

  const handleSelectDistrict = useCallback(
    (district: District) => {
      setFilters((prev) => ({ ...prev, district, page: 1 }));
      navigate("/");
      window.setTimeout(() => {
        document.getElementById("catalog")?.scrollIntoView({ behavior: "smooth" });
      }, 60);
    },
    [navigate]
  );

  const listingMatch = path.match(/^\/listings\/([^/]+)$/);
  const activeListingId = listingMatch ? decodeURIComponent(listingMatch[1]) : null;
  const isAuthRoute = path === "/login" || path === "/register";

  const renderMain = () => {
    if (activeListingId) {
      return (
        <ListingDetailView
          listingId={activeListingId}
          onBack={() => navigate("/")}
          onNavigate={navigate}
          onNotify={notify}
        />
      );
    }

    if (isAuthRoute) {
      return (
        <AuthView
          mode={path === "/register" ? "register" : "login"}
          onSwitchMode={(m) => navigate(m === "register" ? "/register" : "/login")}
          onSuccess={(role) => {
            if (role === "owner") navigate("/owner");
            else if (role === "admin") navigate("/admin");
            else navigate("/");
          }}
          onNotify={notify}
        />
      );
    }

    if (path === "/saved") {
      if (loading) return <LoadingFrame />;
      if (!user || user.role !== "student") {
        return (
          <RoleNotice
            title="Student Sign-In Required"
            description="Sign in with a student account to view and manage your saved rooms shortlist."
            actionLabel={user ? "Back to Explore" : "Sign In"}
            onAction={() => navigate(user ? "/" : "/login")}
          />
        );
      }
      return (
        <SavedListingsView
          onOpenListing={(id) => navigate(`/listings/${id}`)}
          onExplore={() => navigate("/")}
          onNotify={notify}
        />
      );
    }

    if (path === "/owner") {
      if (loading) return <LoadingFrame />;
      if (!user || user.role !== "owner") {
        return (
          <RoleNotice
            title="Owner Hub Access"
            description="Sign in or register as a property owner to verify your identity and list rooms across Kathmandu Valley."
            actionLabel={user ? "Back to Explore" : "Owner Sign In"}
            onAction={() => navigate(user ? "/" : "/login")}
          />
        );
      }
      return (
        <OwnerDashboardView
          onOpenListing={(id) => navigate(`/listings/${id}`)}
          onNotify={notify}
        />
      );
    }

    if (path === "/admin") {
      if (loading) return <LoadingFrame />;
      if (!user || user.role !== "admin") {
        return (
          <RoleNotice
            title="Admin Moderation Console"
            description="This console is restricted to RentMe administrators."
            actionLabel={user ? "Back to Explore" : "Admin Sign In"}
            onAction={() => navigate(user ? "/" : "/login")}
          />
        );
      }
      return (
        <AdminDashboardView
          onOpenListing={(id) => navigate(`/listings/${id}`)}
          onNotify={notify}
        />
      );
    }

    if (path === "/profile") {
      if (loading) return <LoadingFrame />;
      if (!user) {
        return (
          <RoleNotice
            title="Sign In to View Profile"
            description="Manage your contact phone, college details, and profile photo."
            actionLabel="Sign In"
            onAction={() => navigate("/login")}
          />
        );
      }
      return <ProfileView onLogout={() => navigate("/")} onNotify={notify} />;
    }

    return (
      <ExploreView
        filters={filters}
        onChangeFilters={setFilters}
        onResetFilters={() => setFilters(INITIAL_FILTERS)}
        onOpenListing={(id) => navigate(`/listings/${id}`)}
        onNavigate={navigate}
        onNotify={notify}
      />
    );
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        isAuthRoute ? "bg-[#2B3445] text-white" : "bg-[#FFFFFF] text-[#1A1A1A]"
      }`}
    >
      <Navbar
        currentPath={path}
        onNavigate={navigate}
        onSelectDistrict={handleSelectDistrict}
      />

      <main className="flex-1">{renderMain()}</main>

      {/* Quiet Editorial Footer */}
      <footer
        className={
          isAuthRoute
            ? "border-t border-[#3B465A] bg-[#242C3B]"
            : "border-t border-[#EAE6E0] bg-[#F7F5F2]"
        }
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <p
              className={`font-display text-xl font-medium ${
                isAuthRoute ? "text-white" : "text-[#1A1A1A]"
              }`}
            >
              Rent<em className="italic font-normal text-[#E86A4D]">Me</em>
            </p>
            <p className={`text-xs ${isAuthRoute ? "text-[#B4BECE]" : "text-[#666666]"}`}>
              Direct student housing across Kathmandu, Lalitpur, and Bhaktapur.
            </p>
          </div>
          <div
            className={`flex flex-wrap items-center gap-6 text-xs font-medium ${
              isAuthRoute ? "text-[#C5CDD9]" : "text-[#666666]"
            }`}
          >
            <button
              type="button"
              onClick={() => navigate("/")}
              className={`${isAuthRoute ? "hover:text-white" : "hover:text-[#E86A4D]"} transition-colors cursor-pointer`}
            >
              Explore Rooms
            </button>
            <button
              type="button"
              onClick={() => handleSelectDistrict("Kathmandu")}
              className={`${isAuthRoute ? "hover:text-white" : "hover:text-[#E86A4D]"} transition-colors cursor-pointer`}
            >
              Kathmandu
            </button>
            <button
              type="button"
              onClick={() => handleSelectDistrict("Lalitpur")}
              className={`${isAuthRoute ? "hover:text-white" : "hover:text-[#E86A4D]"} transition-colors cursor-pointer`}
            >
              Lalitpur
            </button>
            <button
              type="button"
              onClick={() => handleSelectDistrict("Bhaktapur")}
              className={`${isAuthRoute ? "hover:text-white" : "hover:text-[#E86A4D]"} transition-colors cursor-pointer`}
            >
              Bhaktapur
            </button>
            <button
              type="button"
              onClick={() => navigate(user ? "/profile" : "/login")}
              className={`${isAuthRoute ? "hover:text-white" : "hover:text-[#E86A4D]"} transition-colors cursor-pointer`}
            >
              {user ? "Account" : "Sign In"}
            </button>
          </div>
        </div>
      </footer>

      {/* Toast Notification */}
      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 right-6 z-50 max-w-sm flex items-center gap-3 px-5 py-3.5 rounded-full border text-sm font-medium shadow-[0_18px_40px_-14px_rgba(26,26,26,0.35)] ${
            toast.tone === "error"
              ? "bg-[#FEF2F2] text-[#B8452C] border-[#FECACA]"
              : "bg-[#1C1B1A] text-white border-[#333333]"
          }`}
        >
          <span>{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            aria-label="Dismiss notification"
            className="opacity-70 hover:opacity-100 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

function LoadingFrame() {
  return <LoadingSkeleton variant="page-frame" />;
}

function RoleNotice({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="max-w-xl mx-auto px-4 py-24 text-center space-y-5">
      <h1 className="font-display text-3xl sm:text-4xl font-medium text-[#1A1A1A]">{title}</h1>
      <p className="text-sm text-[#666666] leading-relaxed">{description}</p>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center px-6 py-3 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full transition-colors shadow-[0_10px_24px_-10px_rgba(232,106,77,0.65)] cursor-pointer"
      >
        {actionLabel}
      </button>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <RentMeAppShell />
    </AuthProvider>
  );
}
