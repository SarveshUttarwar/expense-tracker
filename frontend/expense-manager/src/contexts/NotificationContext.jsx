import { createContext, useContext, useState, useCallback } from "react";

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const showNotification = useCallback((message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto remove after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeNotification = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      
      {/* Toast container */}
      <div className="fixed top-5 right-5 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => {
          let bgColor = "bg-white dark:bg-zinc-900 border-slate-200 dark:border-white/10 text-slate-800 dark:text-zinc-150";
          let icon = "ℹ️";
          let progressColor = "bg-indigo-500";
          
          if (t.type === "success") {
            bgColor = "bg-emerald-50 dark:bg-emerald-950/70 border-emerald-200 dark:border-emerald-500/20 text-emerald-800 dark:text-emerald-300";
            icon = "✅";
            progressColor = "bg-emerald-500";
          } else if (t.type === "error") {
            bgColor = "bg-rose-50 dark:bg-rose-950/70 border-rose-200 dark:border-rose-500/20 text-rose-800 dark:text-rose-300";
            icon = "🚨";
            progressColor = "bg-rose-500";
          } else if (t.type === "warning") {
            bgColor = "bg-amber-50 dark:bg-amber-950/70 border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300";
            icon = "⚠️";
            progressColor = "bg-amber-500";
          }

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start gap-3 p-4 rounded-2xl border shadow-lg animate-in slide-in-from-right-5 fade-in duration-300 relative overflow-hidden ${bgColor}`}
            >
              <span className="text-lg leading-none mt-0.5 shrink-0">{icon}</span>
              <div className="flex-1 text-xs font-semibold pr-4 leading-relaxed whitespace-pre-line">
                {t.message}
              </div>
              <button
                onClick={() => removeNotification(t.id)}
                className="text-slate-400 hover:text-slate-650 dark:hover:text-slate-200 transition-colors text-xs font-bold leading-none shrink-0"
              >
                ✕
              </button>
              
              {/* Progress bar animation */}
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-100/50 dark:bg-zinc-800/50">
                <div
                  className={`h-full ${progressColor} animate-[toast-progress_4s_linear_forwards]`}
                />
              </div>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
}
