$utf8 = New-Object System.Text.UTF8Encoding $false
$root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path

function Write-Utf8File($relativePath, $content) {
  $path = Join-Path $root $relativePath
  $dir = Split-Path $path -Parent
  if ($dir -and -not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
  [System.IO.File]::WriteAllText($path, $content.TrimStart(), $utf8)
  Write-Host "Wrote $relativePath"
}

Write-Utf8File "lib\apple-secret.ts" @'
import jwt from "jsonwebtoken";

export function getAppleClientSecret(): string {
  const privateKey = process.env.AUTH_APPLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!privateKey || !process.env.AUTH_APPLE_TEAM_ID || !process.env.AUTH_APPLE_KEY_ID || !process.env.AUTH_APPLE_ID) {
    throw new Error("Apple Sign In environment variables are not configured.");
  }

  return jwt.sign({}, privateKey, {
    algorithm: "ES256",
    expiresIn: "180d",
    issuer: process.env.AUTH_APPLE_TEAM_ID,
    audience: "https://appleid.apple.com",
    subject: process.env.AUTH_APPLE_ID,
    keyid: process.env.AUTH_APPLE_KEY_ID,
  });
}
'@

Write-Utf8File "auth.config.ts" @'
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
'@

Write-Utf8File "auth.ts" @'
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
'@

Write-Utf8File "middleware.ts" @'
import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";

export const { auth: middleware } = NextAuth(authConfig);

export const config = {
  matcher: ["/admin/:path*"],
};
'@

Write-Utf8File "app\api\auth\[...nextauth]\route.ts" @'
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
'@

Write-Utf8File "app\login\page.tsx" @'
import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function LoginPage() {
  const session = await auth();
  if (session) redirect("/admin");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6">
      <h1 className="text-xl font-medium text-white">Admin sign in</h1>
      <form
        action={async () => {
          "use server";
          await signIn("apple", { redirectTo: "/admin" });
        }}
      >
        <button
          type="submit"
          className="rounded-lg bg-white px-6 py-3 text-sm font-semibold text-black transition hover:bg-slate-200"
        >
          Sign in with Apple
        </button>
      </form>
    </main>
  );
}
'@

Write-Utf8File "app\admin\page.tsx" @'
import { auth, signOut } from "@/auth";
import { redirect } from "next/navigation";

export default async function AdminPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-black px-6 text-white">
      <p className="text-lg">Admin</p>
      <p className="text-sm text-slate-400">
        {session.user?.email ?? "Signed in with Apple"}
      </p>
      <form
        action={async () => {
          "use server";
          await signOut({ redirectTo: "/" });
        }}
      >
        <button
          type="submit"
          className="rounded-lg border border-slate-600 px-4 py-2 text-sm text-slate-300 hover:bg-slate-900"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
'@
