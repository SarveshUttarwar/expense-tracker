import { useState } from "react";
import { processReceipt, createCategory, addExpense } from "../services/api";

export default function ReceiptUpload({ userId, onSuccess }) {
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState(null);
    const [notification, setNotification] = useState(null);

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // preview
        setPreview(URL.createObjectURL(file));
        setLoading(true);
        setNotification(null);

        try {
            const data = await processReceipt(file);
            if (data) {
                // AI returns { amount, vendor, date, category }
                const catId = await createCategory(userId, data.category || "General");

                await addExpense({
                    user_id: userId,
                    category_id: catId.id,
                    amount: data.amount,
                    description: `Receipt from ${data.vendor}`,
                    expense_date: data.date || new Date().toISOString().split('T')[0],
                    type: "expense",
                });

                showNotification("success", "Receipt processed successfully!");
                setPreview(null);
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            showNotification("error", "Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-8 shadow-sm group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-teal-500/10 dark:from-indigo-500/20 dark:to-teal-500/20 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>

            <h2 className="mb-2 text-xl font-bold flex items-center gap-2 relative z-10 text-slate-800 dark:text-white">
                <span className="text-2xl text-teal-500">📷</span> Receipt OCR
            </h2>
            <p className="mb-6 text-sm font-medium text-slate-500 dark:text-zinc-400 relative z-10">
                Upload a picture of your receipt to auto-extract details
            </p>

            {notification && (
                <div className={`mb-4 px-4 py-3 rounded-2xl text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 relative z-10 ${
                    notification.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                        : 'bg-rose-50 text-rose-600 border border-rose-200 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                }`}>
                    <span className="text-lg">{notification.type === 'success' ? '🎉' : '⚠️'}</span>
                    {notification.message}
                </div>
            )}

            <div className="relative group/upload border-2 border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50 dark:bg-zinc-800/30 rounded-2xl p-8 transition-colors flex flex-col items-center justify-center text-center z-10 min-h-[148px]">
                {preview ? (
                    <div className="relative w-full flex justify-center">
                        <img src={preview} className="h-32 rounded-xl object-cover shadow-md" alt="Receipt preview" />
                        {loading && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-xl flex items-center justify-center backdrop-blur-sm">
                                <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="text-4xl mb-3 text-slate-400 dark:text-zinc-600 group-hover/upload:text-indigo-500 group-hover/upload:scale-110 transition-all duration-300">
                            🧾
                        </div>
                        <p className="text-sm font-semibold text-slate-600 dark:text-zinc-300 group-hover/upload:text-indigo-600 dark:group-hover/upload:text-indigo-400">
                            {loading ? "Processing image..." : "Click or drag receipt here"}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-zinc-500 mt-1">
                            PNG, JPG, JPEG up to 5MB
                        </p>
                    </>
                )}

                <input
                    type="file"
                    accept="image/*"
                    onChange={handleUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    disabled={loading}
                    title="Upload receipt"
                />
            </div>
        </div>
    );
}
