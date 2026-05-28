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