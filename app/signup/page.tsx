"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If a session came back, the user is fully signed in (email confirmation is off).
    // Send them to checkout so the bundle they were building can be completed.
    if (data.session) {
      router.push("/checkout");
      router.refresh();
      return;
    }

    // Fallback: no session means email confirmation is enabled at the Supabase level.
    // Direct them to log in.
    router.push("/login");
  };

  return (
    <main className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-navy-100 p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Create your account</h1>
          <p className="text-navy-600 mb-6">
            Sign up to purchase bundles and access your downloads anytime.
          </p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg border border-navy-200 bg-bone-50 text-navy-900 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-navy-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                className="w-full px-4 py-3 rounded-lg border border-navy-200 bg-bone-50 text-navy-900 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent"
              />
              <p className="text-xs text-navy-500 mt-1">At least 8 characters.</p>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-navy-700 mb-1">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-lg border border-navy-200 bg-bone-50 text-navy-900 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="text-sm text-r
cat > app/signup/page.tsx << 'EOF'
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setError(error.message);
      return;
    }

    // If a session came back, the user is fully signed in (email confirmation is off).
    // Send them to checkout so the bundle they were building can be completed.
    if (data.session) {
      router.push("/checkout");
      router.refresh();
      return;
    }

    // Fallback: no session means email confirmation is enabled at the Supabase level.
    // Direct them to log in.
    router.push("/login");
  };

  return (
    <main className="min-h-[calc(100vh-200px)] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl border border-navy-100 p-8 shadow-sm">
          <h1 className="text-3xl font-bold text-navy-900 mb-2">Create your account</h1>
          <p className="text-navy-600 mb-6">
            Sign up to purchase bundles and access your downloads anytime.
          </p>

          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-navy-700 mb-1">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-lg border border-navy-200 bg-bone-50 text-navy-900 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-navy-700 mb-1">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
                className="w-full px-4 py-3 rounded-lg border border-navy-200 bg-bone-50 text-navy-900 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent"
              />
              <p className="text-xs text-navy-500 mt-1">At least 8 characters.</p>
            </div>

            <div>
              <label htmlFor="confirm" className="block text-sm font-medium text-navy-700 mb-1">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-lg border border-navy-200 bg-bone-50 text-navy-900 focus:outline-none focus:ring-2 focus:ring-electric-500 focus:border-transparent"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-navy-900 text-bone-50 font-semibold py-3 rounded-lg hover:bg-navy-800 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-navy-600">
            Already have an account?{" "}
            <Link href="/login" className="text-electric-600 font-semibold hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
