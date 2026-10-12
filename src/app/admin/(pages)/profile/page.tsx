"use client";

import {
  changePassword,
  getProfile,
  updateProfile,
} from "@/app/admin/services/profileService";
import { ChangePasswordPayload, UpdateProfilePayload } from "@/app/admin/types/profile";
import { useFetch } from "@/app/admin/hooks/useFetch";
import { useToast } from "@/app/admin/components/ui/ToastProvider";
import { ErrorState } from "@/app/admin/components/ui/ErrorState";
import { PageHeader } from "@/app/admin/components/layout/PageHeader";
import { ProfileSummaryCard } from "@/app/admin/components/profile/ProfileSummaryCard";
import { PersonalInfoForm } from "@/app/admin/components/profile/PersonalInfoForm";
import { SecurityForm } from "@/app/admin/components/profile/SecurityForm";
import { AccountActivityCard } from "@/app/admin/components/profile/AccountActivityCard";
import { ProfileSkeleton } from "@/app/admin/components/profile/ProfileSkeleton";

export default function ProfilePage() {
  const toast = useToast();
  const profile = useFetch(getProfile, []);

  // The forms catch errors themselves (field errors or a banner); the page only
  // handles success: toast, then refetch so every card shows the saved data.
  async function handleSave(values: UpdateProfilePayload) {
    await updateProfile(values);
    toast.success("Profile updated.");
    profile.refetch();
  }

  async function handleChangePassword(values: ChangePasswordPayload) {
    await changePassword(values);
    toast.success("Password changed.");
    profile.refetch();
  }

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Settings / User Profile"
        title="User Profile"
        description="Manage your account information and administrator preferences."
      />

      {profile.error && !profile.data ? (
        <div className="rounded-2xl border border-white/10 bg-white/[0.03]">
          <ErrorState title="Couldn't load your profile" message={profile.error} onRetry={profile.refetch} />
        </div>
      ) : !profile.data ? (
        <ProfileSkeleton />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <ProfileSummaryCard profile={profile.data} />
            <PersonalInfoForm profile={profile.data} onSave={handleSave} />
          </div>
          <SecurityForm onChangePassword={handleChangePassword} />
          <AccountActivityCard profile={profile.data} />
        </>
      )}
    </div>
  );
}
