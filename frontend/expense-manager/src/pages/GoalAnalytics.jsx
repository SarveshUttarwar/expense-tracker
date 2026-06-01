import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { useTheme } from "../contexts/ThemeContext";
import { getAllGoalsSummary, getCategories } from "../services/api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function GoalAnalytics() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const now = new Date();
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [viewMode, setViewMode] = useState("all-time"); // 'monthly' | 'yearly' | 'all-time'
  const [selectedMonth, setSelectedMonth] = useState(now.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(now.getFullYear());
  const [selectedCategory, setSelectedCategory] = useState("");
  const [achievementStatus, setAchievementStatus] = useState("all"); // 'all' | 'completed' | 'missed'
  const [startDate, setStartDate] = useState(""); // YYYY-MM
  const [endDate, setEndDate] = useState(""); // YYYY-MM

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }
    loadData();
  }, [userId]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [goalsRes, catsRes] = await Promise.all([
        getAllGoalsSummary(userId),
        getCategories(userId)
      ]);
      setGoals(goalsRes);
      setCategories(catsRes);
    } catch (err) {
      console.error("Failed to load analytics data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Base processed goals (attaching isSavings and isMet)
  const processedGoals = goals.map(g => {
    const isSavings = ["savings", "saving"].includes(g.category_name.toLowerCase());
    const isMet = isSavings ? (g.spent >= g.monthly_goal) : (g.spent <= g.monthly_goal);
    return {
      ...g,
      isSavings,
      isMet
    };
  });

  // ==========================================
  // TOP SUMMARY CARDS STATS (ALL-TIME OVERALL vs CURRENT MONTH)
  // ==========================================
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const currentMonthGoals = processedGoals.filter(g => `${g.year}-${String(g.month).padStart(2, "0")}` === currentMonthKey);
  const currentMonthCreated = currentMonthGoals.length;
  const currentMonthCompleted = currentMonthGoals.filter(g => g.isMet).length;
  const currentMonthRate = currentMonthCreated > 0 ? (currentMonthCompleted / currentMonthCreated) * 100 : 0;

  const allTimeCreatedTotal = processedGoals.length;
  const allTimeCompletedTotal = processedGoals.filter(g => g.isMet).length;
  const allTimeMissedTotal = allTimeCreatedTotal - allTimeCompletedTotal;
  const allTimeSuccessRate = allTimeCreatedTotal > 0 ? (allTimeCompletedTotal / allTimeCreatedTotal) * 100 : 0;

  // ==========================================
  // STREAKS & SPECIAL INSIGHTS (ALL-TIME DATA)
  // ==========================================
  const monthlyGroups = {};
  processedGoals.forEach((g) => {
    const key = `${g.year}-${String(g.month).padStart(2, "0")}`;
    if (!monthlyGroups[key]) {
      monthlyGroups[key] = {
        key,
        year: g.year,
        month: g.month,
        goals: [],
        created: 0,
        completed: 0,
      };
    }
    monthlyGroups[key].goals.push(g);
    monthlyGroups[key].created++;
    if (g.isMet) {
      monthlyGroups[key].completed++;
    }
  });

  const sortedMonths = Object.values(monthlyGroups).sort((a, b) => a.key.localeCompare(b.key));
  
  // Calculate Streak
  let longestStreak = 0;
  let tempStreak = 0;
  sortedMonths.forEach(m => {
    if (m.created > 0 && m.completed === m.created) {
      tempStreak++;
      longestStreak = Math.max(longestStreak, tempStreak);
    } else {
      tempStreak = 0;
    }
  });

  let currentStreak = 0;
  for (let i = sortedMonths.length - 1; i >= 0; i--) {
    const m = sortedMonths[i];
    if (m.created > 0 && m.completed === m.created) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Best/Worst Performing Month
  let bestMonth = null;
  let worstMonth = null;
  let highestRate = -1;
  let lowestRate = 101;
  sortedMonths.forEach(m => {
    if (m.created > 0) {
      const rate = (m.completed / m.created) * 100;
      if (rate > highestRate) {
        highestRate = rate;
        bestMonth = m;
      }
      if (rate < lowestRate) {
        lowestRate = rate;
        worstMonth = m;
      }
    }
  });

  // Completed/Missed Category Frequency
  const categoryStats = {};
  processedGoals.forEach(g => {
    if (!categoryStats[g.category_name]) {
      categoryStats[g.category_name] = { name: g.category_name, completed: 0, missed: 0 };
    }
    if (g.isMet) {
      categoryStats[g.category_name].completed++;
    } else {
      categoryStats[g.category_name].missed++;
    }
  });

  let mostCompletedCategory = null;
  let mostMissedCategory = null;
  let maxCompleted = -1;
  let maxMissed = -1;

  Object.values(categoryStats).forEach(c => {
    if (c.completed > maxCompleted) {
      maxCompleted = c.completed;
      mostCompletedCategory = c;
    }
    if (c.missed > maxMissed) {
      maxMissed = c.missed;
      mostMissedCategory = c;
    }
  });

  // ==========================================
  // APPLY SELECTED FILTERS TO TARGET DATASET
  // ==========================================
  const filteredGoals = processedGoals.filter(g => {
    // 1. View Mode Filter
    if (viewMode === "monthly") {
      if (g.month !== selectedMonth || g.year !== selectedYear) return false;
    } else if (viewMode === "yearly") {
      if (g.year !== selectedYear) return false;
    }

    // 2. Category Filter
    if (selectedCategory && g.category_name.toLowerCase() !== selectedCategory.toLowerCase()) return false;

    // 3. Date Range Filter (Apply only to All-Time and Yearly view options for custom bounds)
    if (viewMode === "all-time" || viewMode === "yearly") {
      const goalKey = `${g.year}-${String(g.month).padStart(2, "0")}`;
      if (startDate && goalKey < startDate) return false;
      if (endDate && goalKey > endDate) return false;
    }

    // 4. Achievement Status Filter
    if (achievementStatus === "completed" && !g.isMet) return false;
    if (achievementStatus === "missed" && g.isMet) return false;

    return true;
  });

  // ==========================================
  // CALCULATE SCREEN METRICS
  // ==========================================
  const viewCreated = filteredGoals.length;
  const viewCompleted = filteredGoals.filter(g => g.isMet).length;
  const viewMissed = viewCreated - viewCompleted;
  const viewSuccessRate = viewCreated > 0 ? (viewCompleted / viewCreated) * 100 : 0;

  // Monthly breakdown for selected year (Yearly View metrics)
  const yearlyMonthsList = Array.from({ length: 12 }, (_, i) => i + 1);
  const yearlyMonthlyStats = yearlyMonthsList.map(m => {
    const monthGoals = filteredGoals.filter(g => g.month === m && g.year === selectedYear);
    const created = monthGoals.length;
    const completed = monthGoals.filter(g => g.isMet).length;
    const missed = created - completed;
    const rate = created > 0 ? (completed / created) * 100 : 0;
    return {
      month: m,
      monthName: months[m - 1],
      created,
      completed,
      missed,
      rate
    };
  });

  const activeMonthsInYear = yearlyMonthlyStats.filter(m => m.created > 0);
  const avgCreatedPerMonth = activeMonthsInYear.length > 0 
    ? (activeMonthsInYear.reduce((sum, m) => sum + m.created, 0) / activeMonthsInYear.length) 
    : 0;
  const avgCompletedPerMonth = activeMonthsInYear.length > 0 
    ? (activeMonthsInYear.reduce((sum, m) => sum + m.completed, 0) / activeMonthsInYear.length) 
    : 0;
  const avgMonthlyCompletionRate = activeMonthsInYear.length > 0 
    ? (activeMonthsInYear.reduce((sum, m) => sum + m.rate, 0) / activeMonthsInYear.length) 
    : 0;

  // All-time yearly summaries
  const allTimeYearlyGroups = {};
  filteredGoals.forEach(g => {
    if (!allTimeYearlyGroups[g.year]) {
      allTimeYearlyGroups[g.year] = { year: g.year, created: 0, completed: 0 };
    }
    allTimeYearlyGroups[g.year].created++;
    if (g.isMet) {
      allTimeYearlyGroups[g.year].completed++;
    }
  });
  const allTimeYearlyStats = Object.values(allTimeYearlyGroups).sort((a, b) => a.year - b.year);

  // ==========================================
  // CHART CONFIGURATIONS
  // ==========================================
  // 1. Trend monthly chart datasets (for All-Time view / Date range)
  const trendMonths = sortedMonths.filter(m => {
    if (startDate && m.key < startDate) return false;
    if (endDate && m.key > endDate) return false;
    return true;
  });

  const trendChartData = {
    labels: trendMonths.map(m => `${months[m.month - 1].substring(0, 3)} ${m.year}`),
    datasets: [
      {
        label: "Goals Created",
        data: trendMonths.map(m => m.created),
        backgroundColor: "rgba(99, 102, 241, 0.55)",
        borderColor: "rgb(99, 102, 241)",
        borderWidth: 1.5,
        borderRadius: 6
      },
      {
        label: "Goals Completed",
        data: trendMonths.map(m => m.completed),
        backgroundColor: "rgba(16, 185, 129, 0.55)",
        borderColor: "rgb(16, 185, 129)",
        borderWidth: 1.5,
        borderRadius: 6
      }
    ]
  };

  const successRateChartData = {
    labels: trendMonths.map(m => `${months[m.month - 1].substring(0, 3)} ${m.year}`),
    datasets: [
      {
        label: "Success Rate (%)",
        data: trendMonths.map(m => (m.completed / m.created) * 100),
        borderColor: "rgb(139, 92, 246)",
        backgroundColor: "rgba(139, 92, 246, 0.05)",
        fill: true,
        tension: 0.35,
        borderWidth: 2.5
      }
    ]
  };

  // Yearly monthly breakdown chart
  const yearlyBreakdownChartData = {
    labels: yearlyMonthlyStats.map(m => m.monthName.substring(0, 3)),
    datasets: [
      {
        label: "Goals Set",
        data: yearlyMonthlyStats.map(m => m.created),
        backgroundColor: "rgba(79, 70, 229, 0.6)",
        borderRadius: 4
      },
      {
        label: "Goals Met",
        data: yearlyMonthlyStats.map(m => m.completed),
        backgroundColor: "rgba(16, 185, 129, 0.6)",
        borderRadius: 4
      }
    ]
  };

  // Year-over-Year trend chart data
  const yoyChartData = {
    labels: allTimeYearlyStats.map(y => String(y.year)),
    datasets: [
      {
        label: "Yearly Success Rate (%)",
        data: allTimeYearlyStats.map(y => (y.completed / y.created) * 100),
        borderColor: "rgb(236, 72, 153)",
        backgroundColor: "rgba(236, 72, 153, 0.1)",
        fill: true,
        tension: 0.25,
        borderWidth: 3
      }
    ]
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 p-6 pb-24 md:p-8 lg:p-10 overflow-y-auto">
        {/* ================= HEADER ================= */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Goal Analytics</h1>
            <p className="mt-1 text-slate-500 dark:text-zinc-400 font-medium">
              Track and evaluate your spending discipline and financial goals over time
            </p>
          </div>
          <button
            onClick={() => navigate("/goals")}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-zinc-800 hover:bg-slate-350 dark:hover:bg-zinc-750 font-bold text-sm text-slate-700 dark:text-zinc-200 transition-all cursor-pointer"
          >
            ← Back to Goals
          </button>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 dark:text-zinc-400 font-medium animate-pulse">Analyzing historical records...</p>
            </div>
          </div>
        ) : goals.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 dark:border-zinc-700 bg-slate-50/50 dark:bg-zinc-900/50 p-16 text-center flex flex-col items-center">
            <span className="text-5xl mb-4">📊</span>
            <p className="text-xl font-bold text-slate-700 dark:text-zinc-300">No Analytics Available</p>
            <p className="text-sm text-slate-500 dark:text-zinc-500 mt-2 max-w-sm">
              Please define spending or savings goals in the Goals module to populate statistics, streaks, and trend visualizations.
            </p>
          </div>
        ) : (
          <div className="space-y-8 animate-in fade-in duration-350">
            
            {/* ================= SUMMARY CARDS (TOP OF DASHBOARD) ================= */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-5">
              <div className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Total Set</span>
                <p className="text-2xl font-black text-slate-800 dark:text-white mt-1">{allTimeCreatedTotal}</p>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-1 block">Lifetime goals set</span>
              </div>
              <div className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Total Completed</span>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{allTimeCompletedTotal}</p>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-1 block">Within target limits</span>
              </div>
              <div className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Total Missed</span>
                <p className="text-2xl font-black text-rose-500 dark:text-rose-400 mt-1">{allTimeMissedTotal}</p>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-1 block">Surpassed budget/target</span>
              </div>
              <div className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Success Rate</span>
                <p className="text-2xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{allTimeSuccessRate.toFixed(1)}%</p>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-1 block">Lifetime completion rate</span>
              </div>
              <div className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Current Month Rate</span>
                <p className="text-2xl font-black text-violet-600 dark:text-violet-400 mt-1">{currentMonthRate.toFixed(1)}%</p>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-1 block">{months[now.getMonth()]} {now.getFullYear()}</span>
              </div>
              <div className="p-5 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-2xl shadow-sm">
                <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Current Month Status</span>
                <p className="text-base font-black text-slate-800 dark:text-white mt-2">
                  {currentMonthCreated > 0 ? `${currentMonthCompleted} of ${currentMonthCreated} Met` : "No Goals Set"}
                </p>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-1 block">Goal completion tally</span>
              </div>
            </div>

            {/* ================= FILTER PANEL ================= */}
            <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-zinc-800 rounded-xl">
                  {["monthly", "yearly", "all-time"].map(mode => (
                    <button
                      key={mode}
                      onClick={() => setViewMode(mode)}
                      className={`px-4 py-2 text-xs font-bold capitalize rounded-lg transition-all cursor-pointer ${
                        viewMode === mode 
                          ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-white"
                      }`}
                    >
                      {mode.replace("-", " ")}
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {viewMode === "monthly" && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedMonth}
                        onChange={(e) => setSelectedMonth(Number(e.target.value))}
                        className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 outline-none"
                      >
                        {months.map((m, i) => (
                          <option key={i} value={i + 1}>{m}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        value={selectedYear}
                        onChange={(e) => setSelectedYear(Number(e.target.value))}
                        className="w-20 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 outline-none"
                      />
                    </div>
                  )}

                  {viewMode === "yearly" && (
                    <input
                      type="number"
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(Number(e.target.value))}
                      className="w-24 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 outline-none"
                    />
                  )}

                  {/* Category Filter */}
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 outline-none"
                  >
                    <option value="">All Categories</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>

                  {/* Status Filter */}
                  <select
                    value={achievementStatus}
                    onChange={(e) => setAchievementStatus(e.target.value)}
                    className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-3.5 py-2 text-xs font-semibold text-slate-700 dark:text-zinc-200 outline-none"
                  >
                    <option value="all">All Achievements</option>
                    <option value="completed">Completed / Met</option>
                    <option value="missed">Missed / Overspent</option>
                  </select>
                </div>
              </div>

              {(viewMode === "all-time" || viewMode === "yearly") && (
                <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-slate-150 dark:border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider">Date Range:</span>
                    <input
                      type="month"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-200 font-semibold outline-none"
                    />
                    <span className="text-slate-400 dark:text-zinc-600 font-bold text-sm">to</span>
                    <input
                      type="month"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-3 py-1.5 text-xs text-slate-700 dark:text-zinc-200 font-semibold outline-none"
                    />
                    {(startDate || endDate) && (
                      <button
                        onClick={() => { setStartDate(""); setEndDate(""); }}
                        className="text-xs font-bold text-rose-500 hover:underline cursor-pointer"
                      >
                        Clear Range
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* ================= MAIN DASHBOARD CONTENT ================= */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              
              {/* Left/Middle Column (Charts and Reports) */}
              <div className="lg:col-span-2 space-y-8">
                {filteredGoals.length === 0 ? (
                  <div className="p-16 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl text-center shadow-sm">
                    <span className="text-4xl">🔍</span>
                    <h4 className="text-lg font-bold text-slate-800 dark:text-zinc-200 mt-2">No Matching Data</h4>
                    <p className="text-xs text-slate-500 mt-1">Adjust your filters or select a different period to display insights.</p>
                  </div>
                ) : (
                  <>
                    {/* View Mode Contextual Analytics */}
                    {viewMode === "monthly" && (
                      <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm space-y-6">
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-black text-slate-800 dark:text-white">
                            {months[selectedMonth - 1]} {selectedYear} Performance List
                          </h3>
                          <span className="text-xs font-bold px-3 py-1 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-full">
                            {viewSuccessRate.toFixed(0)}% Completion Rate
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 dark:bg-zinc-800/25 rounded-2xl">
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">Goals Set</span>
                            <p className="text-lg font-black mt-0.5">{viewCreated}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">Completed</span>
                            <p className="text-lg font-black text-emerald-600 mt-0.5">{viewCompleted}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">Missed</span>
                            <p className="text-lg font-black text-rose-500 mt-0.5">{viewMissed}</p>
                          </div>
                          <div>
                            <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase tracking-wider font-bold">Success Ratio</span>
                            <p className="text-lg font-black text-indigo-600 dark:text-indigo-400 mt-0.5">{viewSuccessRate.toFixed(1)}%</p>
                          </div>
                        </div>

                        {/* List of active filtered goals */}
                        <div className="space-y-4">
                          {filteredGoals.map((g) => (
                            <div
                              key={g.id}
                              className={`p-4 rounded-2xl border flex items-center justify-between gap-4 ${
                                g.isMet
                                  ? "border-emerald-100 dark:border-emerald-950/20 bg-emerald-50/10"
                                  : g.isSavings 
                                    ? "border-amber-100 dark:border-amber-950/20 bg-amber-50/10"
                                    : "border-rose-100 dark:border-rose-950/20 bg-rose-50/10"
                              }`}
                            >
                              <div>
                                <span className="text-sm font-bold block text-slate-800 dark:text-zinc-100">{g.category_name}</span>
                                <span className="text-xs text-slate-400 dark:text-zinc-500 mt-0.5 block">
                                  {g.isSavings ? "Savings Target" : "Budget Limit"}: ₹{g.monthly_goal}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className={`text-sm font-black block ${g.isMet ? "text-emerald-600" : g.isSavings ? "text-amber-600" : "text-rose-600"}`}>
                                  Actual: ₹{g.spent}
                                </span>
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                                  g.isMet 
                                    ? "bg-emerald-100 dark:bg-emerald-500/10 text-emerald-600"
                                    : g.isSavings 
                                      ? "bg-amber-100 dark:bg-amber-500/10 text-amber-600" 
                                      : "bg-rose-100 dark:bg-rose-500/10 text-rose-600"
                                }`}>
                                  {g.isMet ? "Achieved" : "Not Met"}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {viewMode === "yearly" && (
                      <div className="space-y-8">
                        {/* Yearly summary details card */}
                        <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm space-y-6">
                          <h3 className="text-lg font-black text-slate-800 dark:text-white">Year {selectedYear} Insights</h3>
                          
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
                            <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-2xl">
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Yearly Completion Rate</span>
                              <p className="text-xl font-black text-indigo-600 dark:text-indigo-400 mt-1">{viewSuccessRate.toFixed(1)}%</p>
                              <span className="text-[10px] text-slate-500 mt-0.5 block">{viewCompleted} met of {viewCreated} goals</span>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-2xl">
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Avg Goals Set / Mo</span>
                              <p className="text-xl font-black text-slate-850 dark:text-white mt-1">{avgCreatedPerMonth.toFixed(1)}</p>
                              <span className="text-[10px] text-slate-500 mt-0.5 block">Active months: {activeMonthsInYear.length}</span>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-2xl">
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Avg Goals Met / Mo</span>
                              <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1">{avgCompletedPerMonth.toFixed(1)}</p>
                              <span className="text-[10px] text-slate-500 mt-0.5 block">Consistent goals achievements</span>
                            </div>
                            <div className="p-4 bg-slate-50 dark:bg-zinc-800/30 rounded-2xl">
                              <span className="text-[10px] text-slate-400 dark:text-zinc-500 font-bold uppercase tracking-wider">Avg Monthly Completion</span>
                              <p className="text-xl font-black text-violet-600 dark:text-violet-400 mt-1">{avgMonthlyCompletionRate.toFixed(1)}%</p>
                              <span className="text-[10px] text-slate-500 mt-0.5 block">Averaged monthly rate</span>
                            </div>
                          </div>

                          {/* Yearly Monthly Breakdown Chart */}
                          <div className="pt-4">
                            <h4 className="text-sm font-bold text-slate-700 dark:text-zinc-300 mb-4">Set vs Met Goals monthly breakdown</h4>
                            <div className="h-64">
                              <Bar 
                                data={yearlyBreakdownChartData} 
                                options={{
                                  responsive: true,
                                  maintainAspectRatio: false,
                                  scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Chart visualizations for Trends */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-4">Goal Completion Trend</h4>
                        <div className="h-64">
                          <Bar 
                            data={trendChartData} 
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: { y: { beginAtZero: true, ticks: { precision: 0 } } }
                            }}
                          />
                        </div>
                      </div>
                      
                      <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-4">Success Rate Trend</h4>
                        <div className="h-64">
                          <Line 
                            data={successRateChartData} 
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: { y: { beginAtZero: true, max: 100 } }
                            }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* All-time YoY Year-over-Year chart */}
                    {viewMode === "all-time" && allTimeYearlyStats.length > 1 && (
                      <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm">
                        <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-200 mb-4">Year-over-Year Success Trend</h4>
                        <div className="h-60">
                          <Line 
                            data={yoyChartData} 
                            options={{
                              responsive: true,
                              maintainAspectRatio: false,
                              scales: { y: { beginAtZero: true, max: 100 } }
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Right Column (Sidebar Analytics & Insights) */}
              <div className="space-y-8">
                
                {/* Streak metrics */}
                <div className="p-6 bg-gradient-to-br from-indigo-600 to-purple-650 text-white rounded-3xl shadow-lg relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none -mr-8 -mt-8"></div>
                  
                  <h3 className="text-base font-bold tracking-wide uppercase text-indigo-200">Consistency Streaks</h3>
                  
                  <div className="mt-6 flex items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] text-indigo-150 uppercase tracking-widest font-extrabold block">Current Streak</span>
                      <span className="text-3xl font-black">{currentStreak}</span>
                      <span className="text-xs text-indigo-100 block">Consecutive Months</span>
                    </div>
                    
                    <div className="w-px h-12 bg-white/20"></div>

                    <div className="space-y-1">
                      <span className="text-[10px] text-indigo-150 uppercase tracking-widest font-extrabold block">Longest Streak</span>
                      <span className="text-3xl font-black">{longestStreak}</span>
                      <span className="text-xs text-indigo-100 block">Months Unbeaten</span>
                    </div>
                  </div>

                  <p className="text-xs text-indigo-100 mt-6 leading-relaxed font-medium">
                    🔥 Keep meeting 100% of your targets to increase your streak! Consistency builds financial freedom.
                  </p>
                </div>

                {/* Advanced Insights card list */}
                <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm space-y-6">
                  <h3 className="text-base font-black text-slate-800 dark:text-white">Advanced Insights</h3>

                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">📈</div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Best Month</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                          {bestMonth ? `${months[bestMonth.month - 1]} ${bestMonth.year}` : "N/A"}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500 block">
                          {bestMonth ? `${bestMonth.successRate.toFixed(0)}% goals achieved` : "No goals recorded"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-450 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">📉</div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Worst Month</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                          {worstMonth ? `${months[worstMonth.month - 1]} ${worstMonth.year}` : "N/A"}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500 block">
                          {worstMonth ? `${worstMonth.successRate.toFixed(0)}% goals achieved` : "No goals recorded"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">🎯</div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Most Met Category</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                          {mostCompletedCategory ? mostCompletedCategory.name : "N/A"}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500 block">
                          {mostCompletedCategory ? `${mostCompletedCategory.completed} completions` : "No targets achieved"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 rounded-xl flex items-center justify-center font-bold text-lg shrink-0">⚠️</div>
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider block">Most Overspent Category</span>
                        <span className="text-sm font-bold text-slate-800 dark:text-zinc-200">
                          {mostMissedCategory ? mostMissedCategory.name : "N/A"}
                        </span>
                        <span className="text-[10px] text-slate-500 dark:text-zinc-500 block">
                          {mostMissedCategory ? `${mostMissedCategory.missed} targets missed` : "No budgets exceeded"}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* All-time performance averages */}
                <div className="p-6 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 rounded-3xl shadow-sm space-y-6">
                  <h3 className="text-base font-black text-slate-800 dark:text-white">All-Time Performance</h3>
                  
                  <div className="space-y-4">
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      <span>Total Goals Created:</span>
                      <span className="text-slate-850 dark:text-white font-bold">{allTimeCreatedTotal}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      <span>Total Goals Completed:</span>
                      <span className="text-emerald-600 font-bold">{allTimeCompletedTotal}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      <span>Total Goals Missed:</span>
                      <span className="text-rose-500 font-bold">{allTimeMissedTotal}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      <span>Overall Success Rate:</span>
                      <span className="text-indigo-600 dark:text-indigo-400 font-bold">{allTimeSuccessRate.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-500 dark:text-zinc-400">
                      <span>Lifetime Goal Achievement:</span>
                      <span className="text-violet-600 dark:text-violet-400 font-bold">{allTimeSuccessRate.toFixed(1)}%</span>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>
        )}
      </main>
    </div>
  );
}
