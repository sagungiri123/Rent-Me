import React, { useState } from "react";
import { LogOut, User as UserIcon } from "lucide-react";
import { api } from "../lib/api";
import { useAuth } from "../context/AuthContext";

interface ProfileViewProps {
  onLogout: () => void;
  onNotify: (msg: string, tone?: "success" | "error") => void;
}

export function ProfileView({ onLogout, onNotify }: ProfileViewProps) {
  const { user, refreshUser, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [collegeName, setCollegeName] = useState(user?.collegeName || "");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("phone", phone);
      if (user.role === "student") {
        fd.append("collegeName", collegeName);
      }
      if (avatarFile) {
        fd.append("avatar", avatarFile);
      }
      await api.updateProfile(fd);
      await refreshUser();
      setAvatarFile(null);
      onNotify("Profile details saved.", "success");
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Could not update profile", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    logout();
    onNotify("Signed out cleanly.", "success");
    onLogout();
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 pb-20 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-6 border-b border-[#E6E3DC]">
        <div>
          <h1 className="font-display text-3xl font-semibold text-[#1C1F22]">Account Profile</h1>
          <p className="text-sm text-[#5A5E63] mt-1 capitalize">
            {user.role} account · {user.email}
          </p>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#9A3412] bg-white hover:bg-[#FEF2F2] border border-[#E6E3DC] rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign Out
        </button>
      </div>

      <form
        onSubmit={handleSave}
        className="bg-white border border-[#E6E3DC] rounded-xl p-6 sm:p-8 space-y-6"
      >
        <div className="flex items-center gap-4 pb-5 border-b border-[#EFECE6]">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt={user.name}
              referrerPolicy="no-referrer"
              className="w-16 h-16 rounded-full object-cover border border-[#E6E3DC]"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#F2F0EB] border border-[#E6E3DC] flex items-center justify-center text-[#264D3B]">
              <UserIcon className="w-7 h-7" />
            </div>
          )}
          <div className="space-y-1">
            <label htmlFor="profile-avatar" className="block text-xs font-medium text-[#5A5E63]">
              Update Profile Photo
            </label>
            <input
              id="profile-avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="text-xs text-[#5A5E63]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="profile-name" className="block text-xs font-medium text-[#5A5E63] mb-1.5">
              Full Name
            </label>
            <input
              id="profile-name"
              type="text"
              required
              maxLength={50}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-11 px-3.5 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg"
            />
          </div>

          <div>
            <label htmlFor="profile-phone" className="block text-xs font-medium text-[#5A5E63] mb-1.5">
              Phone Number
            </label>
            <input
              id="profile-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+977-98XXXXXXXX"
              className="w-full h-11 px-3.5 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg"
            />
          </div>
        </div>

        {user.role === "student" && (
          <div>
            <label htmlFor="profile-college" className="block text-xs font-medium text-[#5A5E63] mb-1.5">
              College / University
            </label>
            <input
              id="profile-college"
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. Pulchowk Engineering Campus"
              className="w-full h-11 px-3.5 text-sm bg-[#FAF9F6] border border-[#DDD9D0] rounded-lg"
            />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 text-sm font-semibold text-white bg-[#264D3B] hover:bg-[#1C3B2D] rounded-lg transition-colors disabled:opacity-60 cursor-pointer"
          >
            {saving ? "Saving..." : "Save Profile"}
          </button>
        </div>
      </form>
    </div>
  );
}
