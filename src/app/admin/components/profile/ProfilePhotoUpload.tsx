
"use client";

import { useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { Camera, LoaderCircle } from "lucide-react";
import { uploadProfilePhoto } from "@/app/admin/services/profileService";

type ProfilePhotoUploadProps = {
  onUploaded: (avatarUrl: string) => void;
};

const MAX_FILE_SIZE = 2 * 1024 * 1024;

const ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

export function ProfilePhotoUpload({
  onUploaded,
}: ProfilePhotoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const input = event.currentTarget;
    const file = input.files?.[0];

    if (!file) return;

    setError("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError("Use a JPG, PNG, or WebP image.");
      input.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError("Your image must be 2 MB or smaller.");
      input.value = "";
      return;
    }

    setIsUploading(true);

    try {
      const result = await uploadProfilePhoto(file);

      // Update the profile page and the topbar.
      onUploaded(result.avatarUrl);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to upload your photo."
      );
    } finally {
      setIsUploading(false);
      input.value = "";
    }
  }

  return (
    <>
      {/* Small camera button overlaid on the avatar */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
        aria-label="Change profile photo"
        title={isUploading ? "Uploading photo..." : "Change profile photo"}
        className="absolute -bottom-1 -right-1 z-10 flex h-9 w-9 items-center justify-center rounded-full border-2 border-[#151b24] bg-teal-400 text-slate-950 shadow-lg transition hover:bg-teal-300 disabled:cursor-wait disabled:opacity-70"
      >
        {isUploading ? (
          <LoaderCircle className="h-4 w-4 animate-spin" />
        ) : (
          <Camera className="h-4 w-4" />
        )}
      </button>

      {/* Hidden file picker */}
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFileChange}
        className="hidden"
        aria-label="Select a new profile photo"
      />

      {/* Small error message only appears when necessary */}
      {error && (
        <p
          role="alert"
          className="absolute left-0 top-full z-20 mt-2 w-56 rounded-lg border border-rose-400/20 bg-[#111b24] p-2 text-xs text-rose-400 shadow-xl"
        >
          {error}
        </p>
      )}
    </>
  );
}
