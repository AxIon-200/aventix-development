"use client";

import { useEffect, useState } from "react";
import { authErrorMessage, AuthClientError, publicAuthClient, type AccountSession, type AuthErrorCode, type PersonalAccountProfile } from "@/lib/auth/client";
import AccountGate from "./AccountGate";

const returnTo = "/dashboard/profile";

export default function AttendeeProfile({ session, onAccessRejected }: {
  session: AccountSession; onAccessRejected: (code: AuthErrorCode, expectedUserId: string) => void;
}) {
  const [profile, setProfile] = useState<PersonalAccountProfile | null>(null);
  const [error, setError] = useState<AuthClientError | null>(null);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        if (!publicAuthClient.getProfile) throw new AuthClientError("UNAVAILABLE");
        const current = await publicAuthClient.getProfile();
        if (current.id !== session.userId || current.role !== "ATTENDEE") throw new AuthClientError("INVALID_RESPONSE");
        if (active) setProfile(current);
      } catch (cause) {
        if (active) {
          const issue = cause instanceof AuthClientError ? cause : new AuthClientError("UNAVAILABLE");
          if (["AUTHENTICATION_REQUIRED", "ACCOUNT_DISABLED", "EMAIL_VERIFICATION_REQUIRED",
            "TERMS_ACCEPTANCE_REQUIRED", "PASSWORD_RESET_REQUIRED"].includes(issue.code)) {
            onAccessRejected(issue.code, session.userId);
          } else setError(issue);
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [session.userId, onAccessRejected, revision]);

  const refresh = () => {
    setProfile(null);
    setError(null);
    setLoading(true);
    setRevision(value => value + 1);
  };

  return <section aria-labelledby="personal-profile-title" className="rounded-2xl border border-slate-700 bg-[#151b23] p-5 sm:p-8">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 id="personal-profile-title" className="text-xl font-semibold sm:text-2xl">Personal account profile</h2>
        <p className="mt-2 text-sm text-slate-300">Details for the attendee account you are using now.</p>
      </div>
      {!loading && <button type="button" onClick={refresh} className="rounded-lg border border-[#66fcf1] px-4 py-2 text-sm font-medium text-[#66fcf1] hover:bg-[#66fcf1]/10">Refresh details</button>}
    </div>
    {loading ? <p role="status" className="mt-8 text-slate-300">Loading your personal account profile…</p>
      : error ? <div className="mt-6 space-y-3">
        <AccountGate code={error.code} returnTo={returnTo} />
        {error.code === "INVALID_RESPONSE" && <p className="text-sm text-slate-300">We could not confirm that these details belong to your current account.</p>}
      </div>
      : profile ? <dl className="mt-8 grid gap-6 sm:grid-cols-2">
        <div className="min-w-0"><dt className="text-sm text-slate-400">First name</dt><dd className="mt-1 break-words text-lg font-medium">{profile.firstName}</dd></div>
        <div className="min-w-0"><dt className="text-sm text-slate-400">Last name</dt><dd className="mt-1 break-words text-lg font-medium">{profile.lastName}</dd></div>
        <div className="min-w-0"><dt className="text-sm text-slate-400">Email address <span className="text-xs">(read only)</span></dt><dd className="mt-1 break-all text-lg font-medium">{profile.email}</dd></div>
        <div className="min-w-0"><dt className="text-sm text-slate-400">Phone number</dt><dd className="mt-1 break-words text-lg font-medium">{profile.phoneNumber ?? "Not provided"}</dd></div>
      </dl> : <p role="alert" className="mt-6 text-amber-200">{authErrorMessage(new AuthClientError("UNAVAILABLE"))}</p>}
  </section>;
}
