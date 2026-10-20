import { z } from "zod";

export const profileName = z.string().trim().refine(value => value.isWellFormed() && !value.includes("\u0000")
  && [...value].length >= 1 && [...value].length <= 100);

export const profilePhone = z.string().regex(/^(?:09[0-9]{9}|\+639[0-9]{9})$/)
  .transform(value => value.startsWith("09") ? `+63${value.slice(1)}` : value);
