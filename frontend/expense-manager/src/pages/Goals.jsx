import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie, Line } from "react-chartjs-2";
import { useTheme } from "../contexts/ThemeContext";
import {
  getGoalsSummary,
  saveGoal,
  createCategory,
  getCategories,
  deleteGoal,
} from "../services/api";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function Goals() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [visualization, setVisualization] = useState("progress");
  const [trendData, setTrendData] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);
  const [filterCategoryId, setFilterCategoryId] = useState("");

  const filteredGoals = filterCategoryId
    ? goals.filter(g => g.category.toLowerCase() === filterCategoryId.toLowerCase())
    : goals;

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

  const loadTrendData = async () => {
    if (!userId) return;
    setTrendLoading(true);
    try {
      const monthsList = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(year, month - 1 - i, 1);
        monthsList.push({ m: d.getMonth() + 1, y: d.getFullYear() });
      }

      const summaries = await Promise.all(
        monthsList.map(async ({ m, y }) => {
          const res = await getGoalsSummary(userId, m, y);
          const categoryFilteredGoals = filterCategoryId
            ? res.filter(g => g.category.toLowerCase() === filterCategoryId.toLowerCase())
            : res;

          const totalBudget = categoryFilteredGoals.filter(g => !["savings", "saving"].includes(g.category.toLowerCase())).reduce((a, b) => a + b.goal, 0);
          const totalSpent = categoryFilteredGoals.filter(g => !["savings", "saving"].includes(g.category.toLowerCase())).reduce((a, b) => a + b.spent, 0);
          const savingsObj = categoryFilteredGoals.find(g => ["savings", "saving"].includes(g.category.toLowerCase()));
          const totalSaved = savingsObj ? savingsObj.spent : 0;
          
          const ms = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          return {
            label: `${ms[m - 1]} ${y}`,
            budget: totalBudget,
            spent: totalSpent,
            saved: totalSaved
          };
        })
      );
      setTrendData(summaries);
    } catch (err) {
      console.error("Failed to load trend data:", err);
    } finally {
      setTrendLoading(false);
    }
  };

  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }
    loadCategories();
    loadGoals();
  }, [userId, navigate, month, year]);

  useEffect(() => {
    if (visualization === "trend") {
      loadTrendData();
    }
  }, [userId, month, year, visualization, filterCategoryId]);

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

  const handleDeleteGoal = async (goalId) => {
    if (!confirm("Are you sure you want to delete this spending goal?")) return;
    try {
      await deleteGoal(goalId, userId);
      loadGoals();
    } catch (err) {
      alert(err.message || "Failed to delete goal");
    }
  };

  const handleCancelEdit = () => {
    setCategoryId("");
    setCustomCategory("");
    setGoalAmount("");
    setEditingCategory(null);
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

        {/* ================= FILTER & VISUALIZATION SELECTION ================= */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10">
          <div className="flex flex-wrap items-center gap-4">
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

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider md:ml-4">Category:</span>
              <div className="relative flex items-center gap-1.5">
                <select
                  value={filterCategoryId}
                  onChange={(e) => setFilterCategoryId(e.target.value)}
                  className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  <option value="">All Categories</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                </select>
                {filterCategoryId && (
                  <button
                    type="button"
                    onClick={() => setFilterCategoryId("")}
                    className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors font-bold text-xs"
                    title="Clear Category Filter"
                  >
                    ✕
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider md:ml-4">Visualization:</span>
              <select
                value={visualization}
                onChange={(e) => setVisualization(e.target.value)}
                className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
              >
                <option value="progress">Progress View</option>
                <option value="kpi">KPI Cards</option>
                <option value="pie">Pie Chart</option>
                <option value="bar">Bar Chart</option>
                <option value="line">Line Graph</option>
                <option value="trend">Monthly Trend Comparison</option>
              </select>
            </div>
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
            <div className="flex items-end gap-3">
              <button className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40 transition-all">
                {editingCategory ? "Update Goal" : "Save Goal"}
              </button>
              {editingCategory && (
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="w-full rounded-xl bg-slate-200 dark:bg-zinc-800 py-3 text-sm font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-300 dark:hover:bg-zinc-750 transition-all"
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ================= GOALS DATA VISUALIZATIONS ================= */}
        {loading ? (
          <div className="flex h-64 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 dark:text-zinc-400 font-medium animate-pulse">Loading goals...</p>
            </div>
          </div>
        ) : goals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/50 p-12 text-center flex flex-col items-center">
            <span className="text-4xl mb-4">🎯</span>
            <p className="text-lg font-bold text-slate-700 dark:text-zinc-300">No goals set for this month</p>
            <p className="text-sm text-slate-500 dark:text-zinc-500 mt-2 max-w-sm">Use the form above to set your first budget or savings goal and start tracking your progress.</p>
          </div>
        ) : filteredGoals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/50 p-12 text-center flex flex-col items-center">
            <span className="text-4xl mb-4">🔍</span>
            <p className="text-lg font-bold text-slate-700 dark:text-zinc-300">No goals matching the selected category</p>
            <p className="text-sm text-slate-500 dark:text-zinc-500 mt-2 max-w-sm">Clear the category filter or set a goal for this category to view it.</p>
          </div>
        ) : (
          <div>
            {visualization === "progress" && (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredGoals.map((g) => {
                  const remaining = g.goal - g.spent;
                  const percent = Math.min((g.spent / g.goal) * 100, 100);
                  const isOver = remaining < 0 && !["savings", "saving"].includes(g.category.toLowerCase());
                  const isSavings = ["savings", "saving"].includes(g.category.toLowerCase());

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
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleEdit(g)}
                            className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 rounded-lg transition-colors"
                            title="Edit Goal"
                          >
                            ✏️
                          </button>
                          <button
                            onClick={() => handleDeleteGoal(g.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-55/10 rounded-lg transition-colors"
                            title="Delete Goal"
                          >
                            🗑️
                          </button>
                        </div>
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
              </div>
            )}

            {visualization === "kpi" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Total Monthly Budget Limit</h4>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">₹{filteredGoals.filter(g => !["savings", "saving"].includes(g.category.toLowerCase())).reduce((a, b) => a + b.goal, 0)}</p>
                </div>
                <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Total Spent against Budget</h4>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">₹{filteredGoals.filter(g => !["savings", "saving"].includes(g.category.toLowerCase())).reduce((a, b) => a + b.spent, 0)}</p>
                </div>
                <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Remaining Budget Limit</h4>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">₹{
                    filteredGoals.filter(g => !["savings", "saving"].includes(g.category.toLowerCase())).reduce((a, b) => a + (b.goal - b.spent), 0)
                  }</p>
                </div>
                <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Savings Goal Target</h4>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">₹{filteredGoals.find(g => ["savings", "saving"].includes(g.category.toLowerCase()))?.goal || 0}</p>
                </div>
                <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
                  <h4 className="text-xs font-semibold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mb-2">Total Saved this Month</h4>
                  <p className="text-3xl font-black text-slate-800 dark:text-white">₹{filteredGoals.find(g => ["savings", "saving"].includes(g.category.toLowerCase()))?.spent || 0}</p>
                </div>
              </div>
            )}

            {visualization === "pie" && (
              <div className="max-w-md mx-auto p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
                <h3 className="text-center font-bold mb-6 text-slate-800 dark:text-zinc-200">Spending Breakdown by Category</h3>
                <Pie
                  data={{
                    labels: filteredGoals.map(g => g.category),
                    datasets: [{
                      data: filteredGoals.map(g => g.spent),
                      backgroundColor: [
                        "#6366f1", "#10b981", "#ef4444", "#f59e0b", "#8b5cf6", "#06b6d4"
                      ]
                    }]
                  }}
                />
              </div>
            )}

            {visualization === "bar" && (
              <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
                <h3 className="font-bold mb-6 text-slate-800 dark:text-zinc-200">Budget Limit vs Actual Spent</h3>
                <Bar
                  data={{
                    labels: filteredGoals.map(g => g.category),
                    datasets: [
                      {
                        label: "Monthly Budget Limit",
                        data: filteredGoals.map(g => g.goal),
                        backgroundColor: "#6366f1",
                      },
                      {
                        label: "Actual Spent",
                        data: filteredGoals.map(g => g.spent),
                        backgroundColor: "#ef4444",
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    scales: {
                      y: { beginAtZero: true }
                    }
                  }}
                />
              </div>
            )}

            {visualization === "line" && (
              <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
                <h3 className="font-bold mb-6 text-slate-800 dark:text-zinc-200">Budget Limit and Spending Line Graph</h3>
                <Line
                  data={{
                    labels: filteredGoals.map(g => g.category),
                    datasets: [
                      {
                        label: "Monthly Budget Limit",
                        data: filteredGoals.map(g => g.goal),
                        borderColor: "#6366f1",
                        backgroundColor: "rgba(99, 102, 241, 0.1)",
                        fill: true,
                        tension: 0.3
                      },
                      {
                        label: "Actual Spent",
                        data: filteredGoals.map(g => g.spent),
                        borderColor: "#ef4444",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        fill: true,
                        tension: 0.3
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    scales: {
                      y: { beginAtZero: true }
                    }
                  }}
                />
              </div>
            )}

            {visualization === "trend" && (
              <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
                <h3 className="font-bold mb-6 text-slate-800 dark:text-zinc-200">Historical 6-Month Budget vs Spent vs Saved Trend</h3>
                {trendLoading ? (
                  <p className="text-center text-slate-500 animate-pulse py-12">Loading trend comparison data...</p>
                ) : (
                  <Line
                    data={{
                      labels: trendData.map(d => d.label),
                      datasets: [
                        {
                          label: "Total Budget Limit",
                          data: trendData.map(d => d.budget),
                          borderColor: "#6366f1",
                          backgroundColor: "rgba(99, 102, 241, 0.05)",
                          tension: 0.2
                        },
                        {
                          label: "Actual Spent",
                          data: trendData.map(d => d.spent),
                          borderColor: "#ef4444",
                          backgroundColor: "rgba(239, 68, 68, 0.05)",
                          tension: 0.2
                        },
                        {
                          label: "Total Saved",
                          data: trendData.map(d => d.saved),
                          borderColor: "#10b981",
                          backgroundColor: "rgba(16, 185, 129, 0.05)",
                          tension: 0.2
                        }
                      ]
                    }}
                    options={{
                      responsive: true,
                      scales: {
                        y: { beginAtZero: true }
                      }
                    }}
                  />
                )}
              </div>
            )}
          </div>
        )}}
      </main>
    </div>
  );
}
