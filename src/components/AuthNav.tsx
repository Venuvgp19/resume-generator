"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";

export function AuthNav() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-16 bg-gray-900" />;
  }

  return (
    <nav className="bg-gray-900 text-white px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <Link href="/" className="text-xl font-bold">
          ResumeForge
        </Link>

        <div className="flex items-center gap-4">
          {session?.user ? (
            <>
              <span className="text-gray-300">{session.user.name || session.user.email}</span>
              <button
                onClick={() => signOut({ callbackUrl: "/auth/signin" })}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-sm font-medium"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-sm font-medium"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
