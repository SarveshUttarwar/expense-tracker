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
            const data = await processReceipt(file, userId);
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
        <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
            <h2 className="mb-1 text-lg font-bold flex items-center gap-2 text-slate-855 dark:text-white">
                <span className="text-xl text-teal-500">📷</span> Receipt OCR
            </h2>
            <p className="mb-5 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                Upload a picture of your receipt to auto-extract details
            </p>

            {notification && (
                <div className={`mb-4 px-3.5 py-2.5 rounded-lg text-xs font-semibold flex items-center gap-2.5 animate-in fade-in slide-in-from-top-2 duration-300 ${
                    notification.type === 'success' 
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20' 
                        : 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:border-rose-500/20'
                }`}>
                    <span className="text-base">{notification.type === 'success' ? '🎉' : '⚠️'}</span>
                    {notification.message}
                </div>
            )}

            <div className="relative group/upload border border-dashed border-slate-300 dark:border-zinc-700 hover:border-indigo-500 dark:hover:border-indigo-500 bg-slate-50/50 dark:bg-zinc-950 rounded-lg p-6 transition-colors flex flex-col items-center justify-center text-center min-h-[140px]">
                {preview ? (
                    <div className="relative w-full flex justify-center">
                        <img src={preview} className="h-28 rounded-lg object-cover shadow-sm" alt="Receipt preview" />
                        {loading && (
                            <div className="absolute inset-0 bg-white/50 dark:bg-black/50 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="text-3xl mb-2 text-slate-400 dark:text-zinc-600 group-hover/upload:text-indigo-500 group-hover/upload:scale-105 transition-all duration-300">
                            🧾
                        </div>
                        <p className="text-xs font-bold text-slate-600 dark:text-zinc-300 group-hover/upload:text-indigo-600 dark:group-hover/upload:text-indigo-400 uppercase tracking-wider">
                            {loading ? "Processing image..." : "Upload Receipt Image"}
                        </p>
                        <p className="text-[10px] text-slate-400 dark:text-zinc-500 mt-1">
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
