import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, signupUser } from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (isSignup) {
        // Register new user
        const newUser = await signupUser(username, password);
        // Automatically login the new user
        localStorage.setItem("user", JSON.stringify(newUser));
        setSuccess("Account created successfully! Logging in...");
        setTimeout(() => {
          navigate("/dashboard");
        }, 1000);
      } else {
        // Login existing user
        const user = await loginUser(username, password);
        localStorage.setItem("user", JSON.stringify(user));
        navigate("/dashboard");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 transition-colors duration-300">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-100/50 dark:bg-indigo-900/20 blur-3xl opacity-50"></div>
        <div className="absolute -bottom-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-purple-100/50 dark:bg-purple-900/20 blur-3xl opacity-50"></div>
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-3xl border border-white/40 dark:border-white/10 bg-white/70 dark:bg-zinc-900/70 p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-2xl backdrop-blur-xl">
          <div className="mb-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/30 mb-4">
              <span className="text-white font-bold text-2xl leading-none">E</span>
            </div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-white tracking-tight">
              {isSignup ? "Create Account" : "Welcome Back"}
            </h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400">
              {isSignup
                ? "Sign up to track and manage your goals"
                : "Sign in to manage your finances seamlessly"}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="font-bold">!</span> {error}
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 px-4 py-3 text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
              <span className="font-bold">✓</span> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 transition-all outline-none"
                placeholder="Enter your username"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-zinc-400 mb-1.5 uppercase tracking-wide">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl bg-white dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 transition-all outline-none"
                placeholder="Enter your password"
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading
                ? isSignup
                  ? "Creating Account..."
                  : "Signing in..."
                : isSignup
                ? "Sign Up"
                : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => {
                setIsSignup(!isSignup);
                setError("");
                setSuccess("");
              }}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
            >
              {isSignup
                ? "Already have an account? Sign In"
                : "Don't have an account? Sign Up"}
            </button>
          </div>

          <p className="mt-8 text-center text-xs font-medium text-slate-400 dark:text-zinc-500">
            Cloud database sync active
          </p>
        </div>
      </div>
    </div>
  );
}
