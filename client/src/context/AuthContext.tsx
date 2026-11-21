import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { api, getStoredToken, setStoredToken } from "../lib/api";
import type { User } from "../types";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  savedIds: Set<string>;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: {
    name: string;
    email: string;
    password: string;
    role: "student" | "owner";
    phone?: string;
    collegeName?: string;
  }) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  toggleSave: (listingId: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function extractSavedIds(user: User | null): Set<string> {
  const ids = new Set<string>();
  if (!user?.savedListings) return ids;
  for (const item of user.savedListings) {
    if (typeof item === "string") {
      ids.add(item);
    } else if (item && typeof item === "object" && "_id" in item) {
      ids.add(item._id);
    }
  }
  return ids;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  const refreshUser = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setSavedIds(new Set());
      setLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
      setSavedIds(extractSavedIds(me));
    } catch {
      setStoredToken(null);
      setUser(null);
      setSavedIds(new Set());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const login = useCallback(async (email: string, password: string) => {
    const { user: loggedInUser, token } = await api.login({ email, password });
    setStoredToken(token);
    setUser(loggedInUser);
    setSavedIds(extractSavedIds(loggedInUser));
    return loggedInUser;
  }, []);

  const register = useCallback(
    async (payload: {
      name: string;
      email: string;
      password: string;
      role: "student" | "owner";
      phone?: string;
      collegeName?: string;
    }) => {
      const { user: createdUser, token } = await api.register(payload);
      setStoredToken(token);
      setUser(createdUser);
      setSavedIds(extractSavedIds(createdUser));
      return createdUser;
    },
    []
  );

  const logout = useCallback(() => {
    setStoredToken(null);
    setUser(null);
    setSavedIds(new Set());
  }, []);

  const toggleSave = useCallback(async (listingId: string) => {
    const saved = await api.toggleSaveListing(listingId);
    setSavedIds((prev) => {
      const next = new Set(prev);
      if (saved) next.add(listingId);
      else next.delete(listingId);
      return next;
    });
    return saved;
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        savedIds,
        login,
        register,
        logout,
        refreshUser,
        toggleSave,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
