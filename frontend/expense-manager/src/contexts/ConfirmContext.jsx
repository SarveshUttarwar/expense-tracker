import { createContext, useContext, useState, useCallback } from "react";

const ConfirmContext = createContext();

export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    options: {},
    resolve: null
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve
      });
    });
  }, []);

  const handleConfirm = () => {
    if (confirmState.resolve) {
      confirmState.resolve(true);
    }
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleCancel = () => {
    if (confirmState.resolve) {
      confirmState.resolve(false);
    }
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  const { isOpen, options } = confirmState;
  const { 
    title = "Are you sure?", 
    message = "", 
    confirmLabel = "Confirm", 
    cancelLabel = "Cancel", 
    type = "danger" 
  } = options;

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      
      {isOpen && (
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            onClick={handleCancel}
            className="absolute inset-0 bg-slate-900/40 dark:bg-black/60 backdrop-blur-sm transition-opacity duration-300 animate-in fade-in"
          ></div>
          
          {/* Dialog Container */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-white/10 w-full max-w-md rounded-3xl shadow-2xl p-6 relative z-10 scale-100 transition-all duration-300 animate-in fade-in zoom-in-95">
            
            {/* Header / Icon */}
            <div className="flex items-start gap-4">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                type === "danger" 
                  ? "bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400" 
                  : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-450"
              }`}>
                {type === "danger" ? (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-black text-slate-800 dark:text-white leading-6 tracking-tight">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-zinc-400 font-semibold leading-relaxed">
                  {message}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-sm font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                {cancelLabel}
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className={`px-5 py-2.5 rounded-xl text-sm font-bold text-white shadow-lg transition-all cursor-pointer ${
                  type === "danger"
                    ? "bg-rose-650 hover:bg-rose-550 shadow-rose-600/20 hover:shadow-rose-600/30"
                    : "bg-indigo-650 hover:bg-indigo-550 shadow-indigo-600/20 hover:shadow-indigo-600/30"
                }`}
              >
                {confirmLabel}
              </button>
            </div>
            
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (context === undefined) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return context;
}
