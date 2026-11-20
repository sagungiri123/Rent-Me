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

    if (path === "/login" || path === "/register") {
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
    <div className="min-h-screen flex flex-col bg-[#FAF9F6] text-[#1C1F22]">
      <Navbar
        currentPath={path}
        onNavigate={navigate}
        onSelectDistrict={handleSelectDistrict}
      />

      <main className="flex-1">{renderMain()}</main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-[#E6E3DC] bg-[#F5F3EE]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-1">
            <p className="font-display text-lg font-bold text-[#1C1F22]">RentMe</p>
            <p className="text-xs text-[#5A5E63]">
              Direct student housing across Kathmandu, Lalitpur, and Bhaktapur.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-[#5A5E63]">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="hover:text-[#1C1F22] cursor-pointer"
            >
              Explore Rooms
            </button>
            <button
              type="button"
              onClick={() => handleSelectDistrict("Kathmandu")}
              className="hover:text-[#1C1F22] cursor-pointer"
            >
              Kathmandu
            </button>
            <button
              type="button"
              onClick={() => handleSelectDistrict("Lalitpur")}
              className="hover:text-[#1C1F22] cursor-pointer"
            >
              Lalitpur
            </button>
            <button
              type="button"
              onClick={() => handleSelectDistrict("Bhaktapur")}
              className="hover:text-[#1C1F22] cursor-pointer"
            >
              Bhaktapur
            </button>
            <button
              type="button"
              onClick={() => navigate(user ? "/profile" : "/login")}
              className="hover:text-[#1C1F22] cursor-pointer"
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
          className={`fixed bottom-5 right-5 z-50 max-w-sm flex items-center gap-3 px-4 py-3 rounded-xl border text-sm font-medium shadow-lg ${
            toast.tone === "error"
              ? "bg-[#FEF2F2] text-[#9A3412] border-[#FECACA]"
              : "bg-[#1C1F22] text-white border-[#2E3338]"
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
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="h-40 bg-white border border-[#E6E3DC] rounded-xl animate-pulse" />
    </div>
  );
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
    <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
      <h1 className="font-display text-3xl font-semibold text-[#1C1F22]">{title}</h1>
      <p className="text-sm text-[#5A5E63]">{description}</p>
      <button
        type="button"
        onClick={onAction}
        className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg cursor-pointer"
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
