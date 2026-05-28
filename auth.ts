import NextAuth from "next-auth";
import Apple from "next-auth/providers/apple";
import { authConfig } from "@/auth.config";
import { getAppleClientSecret } from "@/lib/apple-secret";

function getAppleProvider() {
  const clientId = process.env.AUTH_APPLE_ID;
  if (!clientId) return null;

  const clientSecret =
    process.env.AUTH_APPLE_SECRET ?? getAppleClientSecret();

  return Apple({ clientId, clientSecret });
}

const apple = getAppleProvider();

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  trustHost: true,
  providers: apple ? [apple] : [],
});