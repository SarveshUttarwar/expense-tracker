import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar } from "react-chartjs-2";
import { getDashboardAnalytics, downloadReport, searchExpenses, getCategories } from "../services/api";
import AIEntry from "../components/AIEntry";
import ReceiptUpload from "../components/ReceiptUpload";
import { useTheme } from "../contexts/ThemeContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const now = new Date();
  const defaultMonth = now.getMonth() + 1;
  const defaultYear = now.getFullYear();

  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);
  const [selectedYear, setSelectedYear] = useState(defaultYear);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [categoriesList, setCategoriesList] = useState([]);

  const [currentMonth, setCurrentMonth] = useState({});
  const [previousMonth, setPreviousMonth] = useState({});
  const [savingsCurrent, setSavingsCurrent] = useState(0);
  const [savingsPrevious, setSavingsPrevious] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }
    getCategories(userId).then(setCategoriesList).catch(console.error);
  }, [userId, navigate]);

  useEffect(() => {
    if (!userId) return;
    loadDashboard();
  }, [userId, selectedMonth, selectedYear, startDate, endDate, selectedCategory]);

  const loadDashboard = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const data = await getDashboardAnalytics(
        userId,
        startDate && endDate ? null : selectedMonth,
        startDate && endDate ? null : selectedYear,
        startDate || null,
        endDate || null,
        selectedCategory || null
      );
      const current = {};
      data.current.forEach((d) => {
        current[d.category] = Number(d.total);
      });

      const previous = {};
      data.previous.forEach((d) => {
        previous[d.category] = Number(d.total);
      });

      setCurrentMonth(current);
      setPreviousMonth(previous);
      setSavingsCurrent(Number(data.savings_current || 0));
      setSavingsPrevious(Number(data.savings_previous || 0));
    } catch (err) {
      console.error("Failed to load dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    const q = e.target.value;
    setSearchQuery(q);
    if (q.length < 3) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const results = await searchExpenses(userId, q);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setSearching(false);
    }
  };

  const categories = useMemo(() => {
    return Array.from(
      new Set([
        ...Object.keys(currentMonth),
        ...Object.keys(previousMonth),
      ])
    );
  }, [currentMonth, previousMonth]);

  const totalCurrent = useMemo(() => {
    return Object.values(currentMonth).reduce(
      (a, b) => a + b,
      0
    );
  }, [currentMonth]);

  const totalPrevious = useMemo(() => {
    return Object.values(previousMonth).reduce(
      (a, b) => a + b,
      0
    );
  }, [previousMonth]);

  const expenseChange = useMemo(() => {
    return totalPrevious > 0
      ? ((totalCurrent - totalPrevious) / totalPrevious) * 100
      : 0;
  }, [totalCurrent, totalPrevious]);

  const savingsChange = useMemo(() => {
    return savingsPrevious > 0
      ? ((savingsCurrent - savingsPrevious) / savingsPrevious) * 100
      : 0;
  }, [savingsCurrent, savingsPrevious]);

  const barData = {
    labels: categories,
    datasets: [
      {
        label: "Previous Month",
        data: categories.map((c) => previousMonth[c] || 0),
        backgroundColor: theme === "dark" ? "#3f3f46" : "#cbd5e1",
        borderRadius: 6,
      },
      {
        label: "Current Month",
        data: categories.map((c) => currentMonth[c] || 0),
        backgroundColor: "#6366f1", // indigo-500
        borderRadius: 6,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: { color: theme === "dark" ? "#e5e7eb" : "#475569", font: { family: 'Calibri' } },
      },
      tooltip: {
        backgroundColor: theme === "dark" ? "#18181b" : "#ffffff",
        titleColor: theme === "dark" ? "#ffffff" : "#0f172a",
        bodyColor: theme === "dark" ? "#a1a1aa" : "#475569",
        borderColor: theme === "dark" ? "#27272a" : "#e2e8f0",
        borderWidth: 1,
        padding: 12,
        boxPadding: 6,
      }
    },
    scales: {
      x: {
        ticks: { color: theme === "dark" ? "#a1a1aa" : "#64748b", font: { family: 'Calibri' } },
        grid: { display: false },
      },
      y: {
        ticks: { color: theme === "dark" ? "#a1a1aa" : "#64748b", font: { family: 'Calibri' } },
        grid: { color: theme === "dark" ? "#27272a" : "#f1f5f9" },
      },
    },
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 p-6 pb-24 md:p-8 lg:p-10 overflow-y-auto">
        {/* HEADER */}
        <div className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Financial Overview</h1>
            <p className="mt-1 text-slate-500 dark:text-zinc-400 font-medium">
              Monthly expense & savings comparison
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => downloadReport(userId, "pdf")}
              className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm flex items-center gap-2"
            >
              📄 Export PDF
            </button>
            <button
              onClick={() => downloadReport(userId, "excel")}
              className="rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-zinc-800 hover:border-slate-300 dark:hover:border-white/20 transition-all shadow-sm flex items-center gap-2"
            >
              📊 Export Excel
            </button>
          </div>
        </div>

        {/* SEARCH BAR */}
        <div className="mb-10">
          <div className="relative group">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <span className="text-slate-400 dark:text-zinc-500">🔍</span>
            </div>
            <input
              type="text"
              placeholder="Search by keyword (e.g. 'pizza', 'rent')..."
              value={searchQuery}
              onChange={handleSearch}
              className="w-full rounded-2xl bg-white dark:bg-zinc-900/50 border border-slate-200 dark:border-white/10 pl-12 pr-5 py-4 text-sm focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all shadow-sm group-hover:shadow-md dark:shadow-none placeholder-slate-400 dark:placeholder-zinc-500"
            />
            {searching && (
              <div className="absolute right-5 top-4 text-indigo-500 animate-spin">
                ↻
              </div>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="mt-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 overflow-hidden shadow-lg shadow-slate-200/50 dark:shadow-none animate-in fade-in slide-in-from-top-4 duration-300">
              <div className="p-4 border-b border-slate-100 dark:border-white/5 text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider bg-slate-50/50 dark:bg-zinc-800/20">
                Search Results
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {searchResults.map((r) => (
                      <tr key={r.id} className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors">
                        <td className="p-4 text-slate-500 dark:text-zinc-400 whitespace-nowrap">{r.expense_date}</td>
                        <td className="p-4 font-semibold text-slate-800 dark:text-zinc-200">{r.description}</td>
                        <td className="p-4 text-slate-500 dark:text-zinc-500">
                          <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-zinc-800 text-xs font-medium">{r.category}</span>
                        </td>
                        <td className={`p-4 text-right font-bold whitespace-nowrap ${r.type === 'saving' ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {r.type === 'saving' ? '+' : '-'}₹{r.amount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* FILTERS */}
        <div className="mb-10 p-5 rounded-3xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-sm flex flex-wrap items-center justify-between gap-6">
          <div className="flex flex-wrap items-center gap-6">
            {/* Category Dropdown */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Filter by Category</span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none min-w-[160px]"
              >
                <option value="">All Categories</option>
                {categoriesList.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Month & Year Select (clears date range) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Period</span>
              <div className="flex gap-2">
                <select
                  value={startDate && endDate ? "" : selectedMonth}
                  onChange={(e) => {
                    setStartDate("");
                    setEndDate("");
                    setSelectedMonth(Number(e.target.value));
                  }}
                  className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                >
                  {[
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December"
                  ].map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  value={startDate && endDate ? "" : selectedYear}
                  onChange={(e) => {
                    setStartDate("");
                    setEndDate("");
                    setSelectedYear(Number(e.target.value));
                  }}
                  placeholder="Year"
                  className="w-24 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>

            {/* Custom Date Range (clears Month/Year) */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-widest">Custom Date Range</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                  }}
                  className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
                <span className="text-slate-400 text-xs font-semibold">to</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                  }}
                  className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-3 py-2 text-sm font-medium text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                />
              </div>
            </div>
          </div>

          {/* Reset Filters Button */}
          <button
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setSelectedCategory("");
              setSelectedMonth(defaultMonth);
              setSelectedYear(defaultYear);
            }}
            className="rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 border border-transparent px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 transition-all shadow-sm flex items-center gap-1.5"
          >
            🔄 Reset
          </button>
        </div>

        {/* AI WIDGETS */}
        <div className="mb-10 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <AIEntry userId={userId} onSuccess={loadDashboard} />
          <ReceiptUpload userId={userId} onSuccess={loadDashboard} />
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 dark:text-zinc-400 font-medium animate-pulse">Loading dashboard charts...</p>
            </div>
          </div>
        ) : (
          <>
            {/* KPIs */}
            <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <KPI label="Current Spend" value={`₹${totalCurrent}`} />
              <KPI label="Last Month Spend" value={`₹${totalPrevious}`} />
              <KPI
                label="Expense Change"
                value={`${expenseChange > 0 ? '+' : ''}${expenseChange.toFixed(1)}%`}
                color={expenseChange >= 0 ? "text-rose-500" : "text-emerald-500"}
                trend={expenseChange >= 0 ? "up" : "down"}
              />
              <KPI
                label="Savings This Month"
                value={`₹${savingsCurrent}`}
                color="text-emerald-500"
              />
              <KPI
                label="Savings Change"
                value={`${savingsChange > 0 ? '+' : ''}${savingsChange.toFixed(1)}%`}
                color={savingsChange >= 0 ? "text-emerald-500" : "text-rose-500"}
                trend={savingsChange >= 0 ? "up" : "down"}
              />
            </div>

            {/* BAR CHART */}
            <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-6 sm:p-8 shadow-sm">
              <h2 className="mb-6 text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <span className="text-indigo-500">📊</span> Category-wise Comparison
              </h2>
              <div className="h-[400px] w-full">
                <Bar data={barData} options={{...barOptions, maintainAspectRatio: false}} />
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function KPI({ label, value, color = "text-slate-900 dark:text-white", trend = null }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-5 shadow-sm transition-all hover:border-slate-300 dark:hover:border-zinc-700">
      <p className="text-xs font-bold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">{label}</p>
      
      <div className="mt-4 flex items-end justify-between">
        <p className={`text-2xl font-bold tracking-tight ${color}`}>
          {value}
        </p>
        
        {trend && (
          <div className={`flex items-center justify-center w-7 h-7 rounded-lg text-xs font-bold ${trend === 'up' && color.includes('rose') ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : trend === 'up' && color.includes('emerald') ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500' : trend === 'down' && color.includes('rose') ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500' : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500'}`}>
            {trend === 'up' ? '↗' : '↘'}
          </div>
        )}
      </div>
    </div>
  );
}
