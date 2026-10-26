import { OrganizerError } from "./organizer-input.js";

export const MAX_EVENT_IMAGE_BYTES = 3 * 1024 * 1024;
export function validateEventImage(data: Buffer | undefined, mimeType: string) {
  if (!Buffer.isBuffer(data) || !data.length || data.length > MAX_EVENT_IMAGE_BYTES) throw new OrganizerError("INVALID_IMAGE", 400);
  const jpeg = data.length >= 4 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff;
  const png = data.length >= 24 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && data.subarray(12, 16).toString("ascii") === "IHDR";
  const webp = data.length >= 12 && data.subarray(0, 4).toString("ascii") === "RIFF"
    && data.subarray(8, 12).toString("ascii") === "WEBP";
  if (!((mimeType === "image/jpeg" && jpeg) || (mimeType === "image/png" && png) ||
    (mimeType === "image/webp" && webp))) throw new OrganizerError("INVALID_IMAGE", 400);
}
