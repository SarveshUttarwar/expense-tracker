import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { getUserStats, resetPassword } from "../services/api";

export default function Profile() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;
  const username = user?.username;

  const [stats, setStats] = useState({
    total_expenses: 0,
    total_spent: 0,
    total_categories: 0,
    total_goals: 0,
  });
  const [loading, setLoading] = useState(true);

  // Form States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }
    loadStats();
  }, [userId, navigate]);

  const loadStats = async () => {
    try {
      const data = await getUserStats(userId);
      setStats(data);
    } catch (err) {
      console.error("Failed to load user stats", err);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSuccessMsg("");
    setErrorMsg("");

    if (newPassword !== confirmPassword) {
      setErrorMsg("Passwords do not match");
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg("Password must be at least 6 characters long");
      return;
    }

    setUpdating(true);
    try {
      await resetPassword(username, newPassword);
      setSuccessMsg("Password updated successfully!");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setErrorMsg(err.message || "Failed to update password");
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 p-6 pb-24 md:p-8 lg:p-10 overflow-y-auto">
        <h1 className="text-3xl font-bold tracking-tight">User Profile</h1>
        <p className="mt-1 mb-8 text-slate-500 dark:text-zinc-400 font-medium">
          Manage your account credentials and view usage stats
        </p>

        {/* PROFILE CARD */}
        <div className="mb-10 rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm border border-slate-200 dark:border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16 group-hover:scale-110 transition-transform duration-700 pointer-events-none"></div>

          <div className="flex flex-col md:flex-row items-center gap-6 relative z-10">
            <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500 to-purple-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-500/30 uppercase">
              {username ? username.charAt(0) : "U"}
            </div>
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-black tracking-tight text-slate-800 dark:text-white">{username}</h2>
              <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 mt-1">Expense Pro Member</p>
              <div className="mt-3 flex flex-wrap gap-2 justify-center md:justify-start">
                <span className="px-3 py-1 bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300 text-xs font-bold rounded-lg border border-slate-200/50 dark:border-white/5">
                  ID: #{userId}
                </span>
                <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-bold rounded-lg">
                  Status: Active
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* STATISTICS GRID */}
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span>📊</span> Account Statistics
        </h3>
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-10">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-28 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Expenses Logged</h4>
              <p className="text-3xl font-black text-slate-800 dark:text-white mt-1">{stats.total_expenses}</p>
            </div>
            <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Total Spent</h4>
              <p className="text-3xl font-black text-slate-800 dark:text-white mt-1">₹{stats.total_spent.toLocaleString()}</p>
            </div>
            <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Categories Used</h4>
              <p className="text-3xl font-black text-slate-800 dark:text-white mt-1">{stats.total_categories}</p>
            </div>
            <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm hover:shadow-md transition-all">
              <h4 className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest mb-1">Active Goals</h4>
              <p className="text-3xl font-black text-slate-800 dark:text-white mt-1">{stats.total_goals}</p>
            </div>
          </div>
        )}

        {/* CHANGE PASSWORD */}
        <div className="rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm border border-slate-200 dark:border-white/10 max-w-xl">
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <span>🔒</span> Update Password
          </h3>

          <form onSubmit={handleChangePassword} className="space-y-5">
            {successMsg && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-sm font-semibold rounded-xl">
                {successMsg}
              </div>
            )}
            {errorMsg && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-sm font-semibold rounded-xl">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                New Password
              </label>
              <input
                type="password"
                placeholder="Enter at least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">
                Confirm New Password
              </label>
              <input
                type="password"
                placeholder="Re-enter new password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={updating}
              className="rounded-xl bg-indigo-600 py-3 px-6 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {updating ? "Saving Changes..." : "Save Password"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
