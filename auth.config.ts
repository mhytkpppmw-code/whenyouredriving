import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth }) {
      return !!auth?.user;
    },
    signIn({ user, profile }) {
      const allowed = process.env.ADMIN_EMAIL?.trim().toLowerCase();
      if (!allowed) return false;

      const email =
        user.email?.toLowerCase() ??
        (profile as { email?: string } | undefined)?.email?.toLowerCase();

      return email === allowed;
    },
  },
  providers: [],
} satisfies NextAuthConfig;