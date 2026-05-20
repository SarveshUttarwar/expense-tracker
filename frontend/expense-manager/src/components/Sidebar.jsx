import { NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useTheme } from "../contexts/ThemeContext";

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const items = [
    { label: "Dashboard", to: "/dashboard", icon: "📊" },
    { label: "Expenses", to: "/expenses", icon: "💸" },
    { label: "Categories", to: "/categories", icon: "📁" },
    { label: "Goals", to: "/goals", icon: "🎯" },
  ];

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/");
  };

  return (
    <aside
      className={`
        h-screen
        ${collapsed ? "w-20" : "w-64"}
        bg-white/80 dark:bg-zinc-900/80
        backdrop-blur-xl
        border-r border-gray-200 dark:border-white/10
        transition-all duration-300 ease-in-out
        flex flex-col
        shadow-[4px_0_24px_rgba(0,0,0,0.02)] dark:shadow-none
        z-50 relative
      `}
    >
      {/* ================= HEADER ================= */}
      <div className="flex items-center justify-between px-4 py-6">
        {!collapsed && (
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-lg shadow-indigo-600/20 shrink-0">
              <span className="text-white font-bold text-lg leading-none">E</span>
            </div>
            <span className="text-sm font-bold text-slate-800 dark:text-white whitespace-nowrap tracking-wide">
              EXPENSE <span className="text-indigo-600 dark:text-indigo-400">PRO</span>
            </span>
          </div>
        )}

        <button
          onClick={() => setCollapsed(!collapsed)}
          className={`
            text-slate-400 hover:text-indigo-600 dark:text-zinc-400 dark:hover:text-white 
            transition-colors p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800/50
            ${collapsed ? "mx-auto" : ""}
          `}
        >
          {collapsed ? "▶" : "◀"}
        </button>
      </div>

      {/* ================= NAVIGATION ================= */}
      <nav className="flex-1 px-3 space-y-2 mt-4 overflow-y-auto">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `
                flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 group
                ${
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-500 dark:text-zinc-400 hover:bg-slate-50 dark:hover:bg-zinc-800/50 hover:text-slate-900 dark:hover:text-white"
                }
              `
            }
            title={collapsed ? item.label : undefined}
          >
            <span className={`text-lg transition-transform duration-200 group-hover:scale-110 ${collapsed ? "mx-auto" : ""}`}>
              {item.icon}
            </span>
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* ================= BOTTOM SECTION ================= */}
      <div className="px-4 py-6 border-t border-gray-100 dark:border-white/5 space-y-4">
        <button
          onClick={toggleTheme}
          className={`
            flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200
            text-amber-500 dark:text-indigo-300
            hover:bg-amber-50 dark:hover:bg-indigo-500/10
            ${collapsed ? "justify-center" : ""}
          `}
          title={theme === "light" ? "Switch to Dark Mode" : "Switch to Light Mode"}
        >
          <span className="text-lg">
            {theme === "light" ? "☀️" : "🌙"}
          </span>
          {!collapsed && <span>{theme === "light" ? "Light Mode" : "Dark Mode"}</span>}
        </button>

        <button
          onClick={handleLogout}
          className={`
            flex w-full items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200
            text-red-500 dark:text-red-400
            hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-300
            ${collapsed ? "justify-center" : ""}
          `}
          title={collapsed ? "Logout" : undefined}
        >
          <span className="text-lg">⏻</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </aside>
  );
}
