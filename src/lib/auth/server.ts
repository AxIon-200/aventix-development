import "server-only";
import { cookies } from "next/headers";
import { readServerAccount } from "./server-account";

export async function currentServerAccount() {
  return readServerAccount((await cookies()).toString());
}
