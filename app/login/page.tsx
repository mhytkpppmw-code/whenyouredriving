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