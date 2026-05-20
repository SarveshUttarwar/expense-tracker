import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  getGoalsSummary,
  saveGoal,
  createCategory,
  getCategories,
} from "../services/api";

export default function Goals() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  /* ===============================
     ADD / EDIT GOAL STATE
     =============================== */
  const [categoryId, setCategoryId] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [editingCategory, setEditingCategory] = useState(null);

  /* Real categories fetched from the backend */
  const [categories, setCategories] = useState([]);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }
    loadCategories();
    loadGoals();
  }, [userId, navigate, month, year]);

  const loadCategories = async () => {
    try {
      const data = await getCategories(userId);
      setCategories(data);
    } catch (_) {
      // silently fail — form still works with custom category
    }
  };

  const loadGoals = async () => {
    setLoading(true);
    const data = await getGoalsSummary(userId, month, year);
    setGoals(data);
    setLoading(false);
  };

  /* ===============================
     SAVE / UPDATE GOAL
     =============================== */
  const handleSaveGoal = async (e) => {
    e.preventDefault();

    let finalCategoryId = categoryId;

    if (customCategory.trim()) {
      const newCat = await createCategory(userId, customCategory);
      finalCategoryId = newCat.id;
      // Reload categories so the new one shows in dropdown
      loadCategories();
    }

    await saveGoal({
      user_id: userId,
      category_id: Number(finalCategoryId),
      monthly_goal: Number(goalAmount),
      month,
      year,
    });

    setCategoryId("");
    setCustomCategory("");
    setGoalAmount("");
    setEditingCategory(null);
    loadGoals();
  };

  const handleEdit = (goal) => {
    // Find the real category ID from the fetched categories list
    const cat = categories.find(
      (c) => c.name.toLowerCase() === goal.category.toLowerCase()
    );
    if (cat) setCategoryId(String(cat.id));
    setGoalAmount(goal.goal);
    setEditingCategory(goal.category);
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 p-6 pb-24 md:p-8 lg:p-10 overflow-y-auto">
        <h1 className="text-3xl font-bold tracking-tight">Spending Goals</h1>
        <p className="mt-1 mb-8 text-slate-500 dark:text-zinc-400 font-medium">
          Set targets and track your monthly budget progress
        </p>

        {/* ================= FILTER ================= */}
        <div className="mb-8 flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider ml-2">Period:</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {months.map((m, i) => (
                <option key={i} value={i + 1}>{m}</option>
              ))}
            </select>

            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* ================= ADD / EDIT FORM ================= */}
        <div className="mb-10 rounded-3xl bg-white dark:bg-zinc-900 p-8 shadow-sm border border-slate-200 dark:border-white/10 relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 dark:from-indigo-500/20 dark:to-purple-500/20 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>
          
          <h2 className="mb-6 text-lg font-bold flex items-center gap-2 relative z-10">
            <span className="text-indigo-500">🎯</span>
            {editingCategory ? `Edit Goal (${editingCategory})` : "Add / Update Goal"}
          </h2>

          <form
            onSubmit={handleSaveGoal}
            className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 relative z-10"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Category</label>
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="">Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Custom Category</label>
              <input
                type="text"
                placeholder="Or custom category"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Monthly Goal (₹)</label>
              <input
                type="number"
                placeholder="0.00"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                required
                className="w-full rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-end">
              <button className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40 transition-all">
                {editingCategory ? "Update Goal" : "Save Goal"}
              </button>
            </div>
          </form>
        </div>

        {/* ================= GOALS LIST ================= */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 dark:text-zinc-400 font-medium animate-pulse">Loading goals...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {goals.map((g) => {
              const remaining = g.goal - g.spent;
              const percent = Math.min((g.spent / g.goal) * 100, 100);
              const isOver = remaining < 0 && g.category.toLowerCase() !== "savings";
              const isSavings = g.category.toLowerCase() === "savings";

              return (
                <div
                  key={g.category}
                  className={`relative overflow-hidden rounded-3xl p-6 border shadow-sm transition-all hover:shadow-md ${isOver
                    ? "border-rose-200 dark:border-rose-500/30 bg-rose-50/50 dark:bg-rose-500/5"
                    : "border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900"
                    }`}
                >
                  <div className="mb-4 flex justify-between items-start">
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-zinc-100">{g.category}</h3>
                      {isSavings ? (
                        <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-500/10 px-2 py-1 rounded-md inline-block mt-1">Target: ₹{g.goal}</span>
                      ) : (
                        <span className={`text-xs font-semibold px-2 py-1 rounded-md inline-block mt-1 ${isOver ? "text-rose-600 dark:text-rose-400 bg-rose-100 dark:bg-rose-500/10" : "text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-500/10"}`}>
                          Budget: ₹{g.goal}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleEdit(g)}
                      className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                      title="Edit Goal"
                    >
                      ✏️
                    </button>
                  </div>

                  <div className="mb-6 flex justify-between items-end">
                    <div>
                      <p className={`text-3xl font-black tracking-tight ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-white'}`}>
                        ₹{isSavings ? g.spent : Math.abs(remaining)}
                      </p>
                      <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-500 uppercase tracking-widest mt-1">
                        {isSavings ? "Total Saved" : (isOver ? "Over Budget" : "Remaining")}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full border-4 ${isOver ? 'border-rose-100 dark:border-rose-900/50' : 'border-indigo-50 dark:border-indigo-900/50'}`}>
                        <p className={`text-sm font-bold ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-indigo-600 dark:text-indigo-400'}`}>
                          {percent.toFixed(0)}%
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="h-2.5 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden shadow-inner">
                    <div
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${isSavings
                        ? "bg-gradient-to-r from-emerald-400 to-emerald-500"
                        : isOver ? "bg-gradient-to-r from-rose-400 to-rose-500" : "bg-gradient-to-r from-indigo-400 to-indigo-500"
                        }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  {!isSavings && (
                    <div className="mt-4 flex justify-between text-xs font-semibold text-slate-500 dark:text-zinc-500">
                      <span>Spent: <span className="text-slate-700 dark:text-zinc-300">₹{g.spent}</span></span>
                      <span>Total: <span className="text-slate-700 dark:text-zinc-300">₹{g.goal}</span></span>
                    </div>
                  )}
                </div>
              );
            })}
            
            {goals.length === 0 && (
              <div className="col-span-full rounded-3xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/50 p-12 text-center flex flex-col items-center">
                <span className="text-4xl mb-4">🎯</span>
                <p className="text-lg font-bold text-slate-700 dark:text-zinc-300">No goals set for this month</p>
                <p className="text-sm text-slate-500 dark:text-zinc-500 mt-2 max-w-sm">Use the form above to set your first budget or savings goal and start tracking your progress.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
