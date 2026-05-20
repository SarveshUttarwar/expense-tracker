import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import { getCategoryAnalytics } from "../services/api";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useTheme } from "../contexts/ThemeContext";

export default function Categories() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const [categories, setCategories] = useState([]);
  const [savings, setSavings] = useState(0);
  const [loading, setLoading] = useState(true);

  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const COLORS = [
    "#6366f1", // indigo
    "#14b8a6", // teal
    "#f59e0b", // amber
    "#f43f5e", // rose
    "#0ea5e9", // sky
    "#8b5cf6", // violet
    "#10b981", // emerald
  ];

  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }
    loadAnalytics();
  }, [userId, navigate, month, year]);

  const loadAnalytics = async () => {
    setLoading(true);
    const res = await getCategoryAnalytics(userId, month, year);

    setCategories(res.categories || []);
    setSavings(res.savings || 0);

    setLoading(false);
  };

  const combinedData = [
    ...categories,
    ...(savings > 0 ? [{ category: "Savings", total: savings }] : []),
  ];

  const totalSpend = combinedData.reduce(
    (sum, d) => sum + Number(d.total),
    0
  );

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white font-['Outfit'] transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 p-8 lg:p-10 space-y-10 overflow-y-auto">
        {/* HEADER */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Category Analytics</h1>
          <p className="mt-1 text-slate-500 dark:text-zinc-400 font-medium">
            Expense & savings distribution
          </p>
        </div>

        {/* FILTER */}
        <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-slate-200 dark:border-white/10">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-500 dark:text-zinc-400 uppercase tracking-wider ml-2">Period:</span>
            <select
              value={month}
              onChange={(e) => setMonth(Number(e.target.value))}
              className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              {months.map((m, i) => (
                <option key={i} value={i + 1}>
                  {m}
                </option>
              ))}
            </select>

            <input
              type="number"
              value={year}
              onChange={(e) => setYear(Number(e.target.value))}
              className="w-24 rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-2 text-sm font-medium text-slate-700 dark:text-zinc-200 focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>

          <span className="text-sm text-indigo-500 font-semibold px-4 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-500/10 ml-auto">
            Viewing: {months[month - 1]} {year}
          </span>
        </div>

        {loading ? (
          <div className="flex h-96 items-center justify-center">
            <div className="flex flex-col items-center gap-4">
              <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <p className="text-slate-500 dark:text-zinc-400 font-medium animate-pulse">Loading analytics...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {/* PIE CHART */}
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-8 shadow-sm hover:shadow-md dark:shadow-none transition-shadow">
              <h2 className="mb-6 text-lg font-bold flex items-center gap-2">
                <span className="text-indigo-500">🥧</span> Distribution
              </h2>

              <ResponsiveContainer width="100%" height={320}>
                <PieChart>
                  <Pie
                    data={combinedData}
                    dataKey="total"
                    nameKey="category"
                    innerRadius={80}
                    outerRadius={110}
                    paddingAngle={5}
                    stroke="none"
                  >
                    {combinedData.map((_, i) => (
                      <Cell
                        key={i}
                        fill={COLORS[i % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(v) => `₹${v}`} 
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
                      borderColor: theme === 'dark' ? '#27272a' : '#e2e8f0',
                      borderRadius: '12px',
                      color: theme === 'dark' ? '#ffffff' : '#0f172a',
                      boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                  />
                  <Legend wrapperStyle={{ paddingTop: '20px' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* BAR CHART */}
            <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-8 shadow-sm hover:shadow-md dark:shadow-none transition-shadow">
              <h2 className="mb-6 text-lg font-bold flex items-center gap-2">
                <span className="text-teal-500">📊</span> Spend by Category
              </h2>

              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={combinedData}>
                  <XAxis
                    dataKey="category"
                    tick={{ fill: theme === 'dark' ? "#a1a1aa" : "#64748b", fontSize: 12, fontFamily: 'Outfit' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: theme === 'dark' ? "#a1a1aa" : "#64748b", fontSize: 12, fontFamily: 'Outfit' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    formatter={(v) => `₹${v}`}
                    cursor={{fill: theme === 'dark' ? '#27272a' : '#f1f5f9'}}
                    contentStyle={{
                      backgroundColor: theme === 'dark' ? '#18181b' : '#ffffff',
                      borderColor: theme === 'dark' ? '#27272a' : '#e2e8f0',
                      borderRadius: '12px',
                      color: theme === 'dark' ? '#ffffff' : '#0f172a',
                    }}
                  />
                  <Bar
                    dataKey="total"
                    radius={[6, 6, 6, 6]}
                    fill="#6366f1"
                    barSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* TABLE */}
            <div className="xl:col-span-2 rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-8 shadow-sm">
              <h2 className="mb-6 text-lg font-bold flex items-center gap-2">
                <span className="text-amber-500">📋</span> Detailed Breakdown
              </h2>

              <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-white/10">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/50 dark:bg-zinc-800/20 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400">
                    <tr>
                      <th className="py-4 px-6 text-left font-bold uppercase tracking-wider text-xs">Category</th>
                      <th className="py-4 px-6 text-left font-bold uppercase tracking-wider text-xs">Amount</th>
                      <th className="py-4 px-6 text-left font-bold uppercase tracking-wider text-xs">% of Total</th>
                      <th className="py-4 px-6 text-left font-bold uppercase tracking-wider text-xs">Visual</th>
                    </tr>
                  </thead>
                  <tbody>
                    {combinedData.map((d, index) => (
                      <tr
                        key={d.category}
                        className="border-b border-slate-100 dark:border-white/5 last:border-0 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                      >
                        <td className="py-4 px-6 font-semibold flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full" style={{backgroundColor: COLORS[index % COLORS.length]}}></div>
                          {d.category}
                        </td>
                        <td className="py-4 px-6 font-bold text-slate-700 dark:text-slate-200">₹{d.total}</td>
                        <td className="py-4 px-6 font-medium text-slate-500 dark:text-zinc-400">
                          {totalSpend
                            ? ((d.total / totalSpend) * 100).toFixed(1)
                            : 0}
                          %
                        </td>
                        <td className="py-4 px-6 w-1/3">
                          <div className="w-full bg-slate-100 dark:bg-zinc-800 rounded-full h-2 overflow-hidden">
                            <div 
                              className="h-2 rounded-full" 
                              style={{
                                width: `${totalSpend ? ((d.total / totalSpend) * 100) : 0}%`,
                                backgroundColor: COLORS[index % COLORS.length]
                              }}
                            ></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {combinedData.length === 0 && (
                      <tr>
                        <td colSpan="4" className="py-8 px-6 text-center text-slate-500">
                          No data available for this period.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
