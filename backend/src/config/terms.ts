import { z } from "zod";

const currentTerms = z.object({
  version: z.string().min(1).refine(value => value.trim() === value),
  documentUrl: z.url({ protocol: /^https?$/ }).refine(value => {
    const url = new URL(value);
    return !url.username && !url.password;
  }),
}).strict();

export type CurrentTerms = Readonly<z.infer<typeof currentTerms>>;

// Call once per application instance. Never default to fixture terms or invent
// consent; only the owner can supply the reviewed document and its version.
export function loadCurrentTerms(value: CurrentTerms = {
  version: process.env.CURRENT_TERMS_VERSION ?? "",
  documentUrl: process.env.CURRENT_TERMS_DOCUMENT_URL ?? "",
}): CurrentTerms | undefined {
  if (!value.version && !value.documentUrl) return undefined;
  const parsed = currentTerms.safeParse(value);
  if (!parsed.success) throw new Error("Configure a nonempty CURRENT_TERMS_VERSION and valid HTTP(S) CURRENT_TERMS_DOCUMENT_URL together");
  return Object.freeze(parsed.data);
}
