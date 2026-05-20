import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser, signupUser, resetPassword } from "../services/api";

export default function Login() {
  const navigate = useNavigate();

  const [isSignup, setIsSignup] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
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
      if (isForgotPassword) {
        // Reset password
        await resetPassword(username, password);
        setSuccess("Password reset successfully! You can now log in.");
        setTimeout(() => {
          setIsForgotPassword(false);
          setPassword("");
        }, 1500);
      } else if (isSignup) {
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
    <div className="relative flex min-h-screen items-center justify-center bg-slate-50 dark:bg-zinc-950 transition-colors duration-300 px-4 py-8 overflow-hidden">
      {/* Premium crisp grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] dark:bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:3.5rem_3.5rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] opacity-40 pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="rounded-2xl border border-slate-200 dark:border-zinc-800 bg-white/95 dark:bg-zinc-900/95 p-8 sm:p-10 shadow-xl shadow-slate-200/50 dark:shadow-none backdrop-blur-md">
          <div className="mb-8 text-center">
            <div className="mx-auto w-10 h-10 rounded-lg bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20 mb-4">
              <span className="text-white font-bold text-xl leading-none">E</span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
              {isForgotPassword
                ? "Reset Password"
                : isSignup
                ? "Create Account"
                : "Welcome Back"}
            </h1>
            <p className="mt-1.5 text-xs text-slate-500 dark:text-zinc-400">
              {isForgotPassword
                ? "Enter your details to reset your password"
                : isSignup
                ? "Sign up to track and manage your goals"
                : "Sign in to manage your finances seamlessly"}
            </p>
          </div>

          {error && (
            <div className="mb-6 rounded-lg bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 px-4 py-3 text-xs font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-2">
              <span className="font-bold">!</span> {error}
            </div>
          )}

          {success && (
            <div className="mb-6 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 px-4 py-3 text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
              <span className="font-bold">✓</span> {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full rounded-lg bg-slate-50/50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-3.5 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all outline-none"
                placeholder="Enter username"
                required
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-[10px] font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
                  {isForgotPassword ? "New Password" : "Password"}
                </label>
                {!isSignup && !isForgotPassword && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsForgotPassword(true);
                      setError("");
                      setSuccess("");
                    }}
                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-lg bg-slate-50/50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 px-3.5 py-2.5 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-zinc-500 focus:border-indigo-600 focus:ring-1 focus:ring-indigo-600 transition-all outline-none"
                placeholder={isForgotPassword ? "Enter new password" : "Enter password"}
                required
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading
                ? isForgotPassword
                  ? "Resetting Password..."
                  : isSignup
                  ? "Creating Account..."
                  : "Signing in..."
                : isForgotPassword
                ? "Reset Password"
                : isSignup
                ? "Sign Up"
                : "Sign In"}
            </button>
          </form>

          <div className="mt-6 text-center">
            {isForgotPassword ? (
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setError("");
                  setSuccess("");
                }}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300 transition-colors"
              >
                Back to Sign In
              </button>
            ) : (
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
            )}
          </div>

          <p className="mt-8 text-center text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">
            Cloud database sync active
          </p>
        </div>
      </div>
    </div>
  );
}
