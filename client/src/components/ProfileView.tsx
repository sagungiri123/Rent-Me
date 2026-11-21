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
    <div className="bg-[#FFFFFF]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-14 pb-24 space-y-10">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 pb-8 border-b border-[#EAE6E0]">
          <div className="space-y-1.5">
            <h1 className="font-display text-3xl sm:text-4xl font-medium tracking-[-0.02em] text-[#1A1A1A]">
              Account <em className="italic font-normal text-[#E86A4D]">Profile</em>
            </h1>
            <p className="text-sm text-[#666666] capitalize">
              {user.role} account · {user.email}
            </p>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium text-[#B8452C] bg-[#FFFFFF] hover:bg-[#FEF2F2] border border-[#EAE6E0] rounded-full whitespace-nowrap shrink-0 cursor-pointer transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>

        <form
          onSubmit={handleSave}
          className="bg-[#FFFFFF] border border-[#EAE6E0] rounded-2xl p-6 sm:p-8 shadow-[0_20px_50px_-24px_rgba(26,26,26,0.10)] space-y-7"
        >
          <div className="flex items-center gap-5 pb-6 border-b border-[#F2EFEA]">
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                referrerPolicy="no-referrer"
                className="w-16 h-16 rounded-full object-cover border border-[#EAE6E0]"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-[#F7F5F2] border border-[#EAE6E0] flex items-center justify-center text-[#E86A4D]">
                <UserIcon className="w-7 h-7" />
              </div>
            )}
            <div className="space-y-1.5">
              <label htmlFor="profile-avatar" className="block text-xs font-medium text-[#666666]">
                Update Profile Photo
              </label>
              <input
                id="profile-avatar"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
                className="text-xs text-[#666666]"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="profile-name" className="block text-xs font-medium text-[#666666] mb-2">
                Full Name
              </label>
              <input
                id="profile-name"
                type="text"
                required
                maxLength={50}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-11 px-4 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
              />
            </div>

            <div>
              <label htmlFor="profile-phone" className="block text-xs font-medium text-[#666666] mb-2">
                Phone Number
              </label>
              <input
                id="profile-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+977-98XXXXXXXX"
                className="w-full h-11 px-4 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
              />
            </div>
          </div>

          {user.role === "student" && (
            <div>
              <label htmlFor="profile-college" className="block text-xs font-medium text-[#666666] mb-2">
                College / University
              </label>
              <input
                id="profile-college"
                type="text"
                value={collegeName}
                onChange={(e) => setCollegeName(e.target.value)}
                placeholder="e.g. Pulchowk Engineering Campus"
                className="w-full h-11 px-4 text-sm bg-[#F7F5F2] border border-[#EAE6E0] rounded-xl text-[#1A1A1A]"
              />
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-3 text-sm font-medium text-white bg-[#E86A4D] hover:bg-[#D5583B] rounded-full transition-colors shadow-[0_10px_24px_-10px_rgba(232,106,77,0.65)] disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
