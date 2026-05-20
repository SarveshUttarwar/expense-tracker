import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Sidebar from "../components/Sidebar";
import {
  getExpenses,
  addExpense,
  createCategory,
  deleteExpense,
} from "../services/api";

export default function Expenses() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));
  const userId = user?.id;

  const [transactions, setTransactions] = useState([]);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    amount: "",
    description: "",
    expense_date: "",
    category_id: "",
    custom_category: "",
    type: "expense",
    is_recurring: false,
    recurrence_interval: "",
  });

  const categories = [
    { id: 1, name: "Food" },
    { id: 2, name: "Transport" },
    { id: 3, name: "Shopping" },
    { id: 4, name: "Rent" },
    { id: 5, name: "Entertainment" },
  ];

  useEffect(() => {
    if (!userId) {
      navigate("/");
      return;
    }
    loadTransactions();
  }, [userId, navigate]);

  const loadTransactions = async () => {
    const data = await getExpenses(userId);
    setTransactions(data);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this transaction?")) return;
    await deleteExpense(id, userId);
    loadTransactions();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    let finalCategoryId = null;

    if (form.type === "expense") {
      finalCategoryId = form.category_id;

      if (form.custom_category.trim()) {
        const newCategory = await createCategory(
          userId,
          form.custom_category
        );
        finalCategoryId = newCategory.id;
      }

      if (!finalCategoryId) {
        alert("Please select or enter a category");
        return;
      }
    }

    await addExpense({
      user_id: userId,
      category_id: finalCategoryId,
      amount: Number(form.amount),
      description: form.description,
      expense_date: form.expense_date,
      type: form.type,
      is_recurring: form.is_recurring,
      recurrence_interval: form.recurrence_interval,
    });

    setForm({
      amount: "",
      description: "",
      expense_date: "",
      category_id: "",
      custom_category: "",
      type: "expense",
      is_recurring: false,
      recurrence_interval: "",
    });

    setShowForm(false);
    loadTransactions();
  };

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white font-['Outfit'] transition-colors duration-300">
      <Sidebar />

      <main className="flex-1 p-6 pb-24 md:p-8 lg:p-10 overflow-y-auto">
        {/* HEADER */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Transactions</h1>
            <p className="mt-1 text-slate-500 dark:text-zinc-400 font-medium">
              Manage your daily expenses and savings
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40 transition-all flex items-center gap-2"
          >
            {showForm ? "✕ Cancel" : "+ Add New"}
          </button>
        </div>

        {/* ADD FORM */}
        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mb-10 grid grid-cols-1 gap-5 rounded-2xl bg-white dark:bg-zinc-900 p-8 shadow-sm border border-slate-200 dark:border-white/10 md:grid-cols-2 animate-in fade-in slide-in-from-top-4 duration-300"
          >
            {/* TYPE */}
            <div className="flex gap-6 col-span-full border-b border-slate-100 dark:border-white/10 pb-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${form.type === 'expense' ? 'border-rose-500' : 'border-slate-300 dark:border-zinc-600'}`}>
                  {form.type === 'expense' && <div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div>}
                </div>
                <input
                  type="radio"
                  className="hidden"
                  checked={form.type === "expense"}
                  onChange={() => setForm({ ...form, type: "expense" })}
                />
                <span className="font-semibold text-slate-700 dark:text-zinc-300 group-hover:text-rose-500 dark:group-hover:text-rose-400">Expense</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer group">
                <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${form.type === 'saving' ? 'border-emerald-500' : 'border-slate-300 dark:border-zinc-600'}`}>
                  {form.type === 'saving' && <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>}
                </div>
                <input
                  type="radio"
                  className="hidden"
                  checked={form.type === "saving"}
                  onChange={() => setForm({ ...form, type: "saving" })}
                />
                <span className="font-semibold text-slate-700 dark:text-zinc-300 group-hover:text-emerald-500 dark:group-hover:text-emerald-400">Saving</span>
              </label>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Date</label>
              <input
                type="date"
                required
                value={form.expense_date}
                onChange={(e) => setForm({ ...form, expense_date: e.target.value })}
                className="w-full rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            {form.type === "expense" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Category</label>
                  <select
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
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
                    placeholder="Or add new category"
                    value={form.custom_category}
                    onChange={(e) => setForm({ ...form, custom_category: e.target.value })}
                    className="w-full rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Amount (₹)</label>
              <input
                type="number"
                placeholder="0.00"
                required
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                className="w-full rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="col-span-full">
              <label className="block text-xs font-semibold text-slate-500 dark:text-zinc-400 mb-1.5 uppercase tracking-wider">Description</label>
              <input
                type="text"
                placeholder="What was this for?"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              />
            </div>

            <div className="flex items-center gap-4 col-span-full mt-2">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 dark:border-zinc-600 dark:bg-zinc-800"
                  checked={form.is_recurring}
                  onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                />
                <span className="font-semibold text-slate-700 dark:text-zinc-300">Make this recurring?</span>
              </label>

              {form.is_recurring && (
                <select
                  value={form.recurrence_interval}
                  onChange={(e) => setForm({ ...form, recurrence_interval: e.target.value })}
                  className="rounded-xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 px-4 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                  required
                >
                  <option value="">Select Interval</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                </select>
              )}
            </div>

            <button
              type="submit"
              className="col-span-full mt-4 rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40 transition-all"
            >
              Save Transaction
            </button>
          </form>
        )}

        {/* TRANSACTIONS TABLE */}
        <div className="overflow-hidden rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 shadow-sm">
          <table className="w-full text-sm">
            <thead className="bg-slate-50/50 dark:bg-zinc-800/20 border-b border-slate-200 dark:border-white/10 text-slate-500 dark:text-zinc-400">
              <tr>
                <th className="p-4 text-left font-bold uppercase tracking-wider text-xs">Date</th>
                <th className="p-4 text-left font-bold uppercase tracking-wider text-xs">Type</th>
                <th className="p-4 text-left font-bold uppercase tracking-wider text-xs">Category</th>
                <th className="p-4 text-left font-bold uppercase tracking-wider text-xs">Amount</th>
                <th className="p-4 text-right font-bold uppercase tracking-wider text-xs">Action</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors"
                >
                  <td className="p-4 text-slate-600 dark:text-zinc-300 font-medium">{t.expense_date}</td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-xs font-bold ${t.type === 'saving' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'}`}>
                      {t.type}
                    </span>
                  </td>
                  <td className="p-4 text-slate-600 dark:text-zinc-300">
                    {t.type === "saving" ? "-" : t.category}
                  </td>
                  <td
                    className={`p-4 font-bold ${t.type === "saving" ? "text-emerald-500" : "text-rose-500"}`}
                  >
                    {t.type === "saving" ? "+" : "-"}₹{t.amount}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}

              {transactions.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="p-8 text-center text-slate-500 dark:text-zinc-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <span className="text-4xl mb-2">🍃</span>
                      <p className="font-medium">No transactions found</p>
                      <p className="text-xs">Click "+ Add New" to create one.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
