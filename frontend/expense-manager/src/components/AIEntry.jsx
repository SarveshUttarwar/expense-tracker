import { useState } from "react";
import { parseAIExpense, createCategory, addExpense } from "../services/api";

export default function AIEntry({ userId, onSuccess }) {
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(false);
    const [isListening, setIsListening] = useState(false);
    const [notification, setNotification] = useState(null);

    const showNotification = (type, message) => {
        setNotification({ type, message });
        setTimeout(() => setNotification(null), 4000);
    };

    const handleParse = async () => {
        if (!text.trim()) return;
        setLoading(true);
        setNotification(null);

        try {
            const data = await parseAIExpense(text, userId);
            if (data) {
                const catId = await createCategory(userId, data.category || "General");

                await addExpense({
                    user_id: userId,
                    category_id: catId.id,
                    amount: data.amount,
                    description: data.description,
                    expense_date: new Date().toISOString().split('T')[0],
                    type: data.type || "expense",
                });

                showNotification("success", "Expense added automatically!");
                setText("");
                if (onSuccess) onSuccess();
            }
        } catch (err) {
            showNotification("error", "Failed: " + err.message);
        } finally {
            setLoading(false);
        }
    };

    const startVoice = () => {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
            showNotification("error", "Browser doesn't support speech recognition.");
            return;
        }

        const recognition = new SpeechRecognition();
        recognition.lang = 'en-US';

        recognition.onstart = () => setIsListening(true);
        recognition.onend = () => setIsListening(false);

        recognition.onresult = (event) => {
            const transcript = event.results[0][0].transcript;
            setText(transcript);
        };

        recognition.start();
    };

    return (
        <div className="relative overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-6 shadow-sm hover:border-slate-300 dark:hover:border-zinc-700 transition-all">
            <h2 className="mb-1 text-lg font-bold flex items-center gap-2 text-slate-850 dark:text-white">
                <span className="text-xl text-indigo-500">✨</span> AI Smart Entry
            </h2>
            <p className="mb-5 text-xs font-semibold text-slate-500 dark:text-zinc-400">
                Type or speak naturally (e.g. "I spent 500 on dinner")
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

            <div className="flex gap-2.5">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What did you spend on?"
                    className="flex-1 rounded-lg bg-slate-50/50 dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 p-3 text-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none h-20 resize-none transition-all placeholder-slate-400 dark:placeholder-zinc-500"
                />
                <button
                    onClick={startVoice}
                    className={`shrink-0 w-12 rounded-lg border flex items-center justify-center transition-all ${isListening ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-500/20 dark:border-rose-500/30' : 'bg-slate-50 border-slate-200 text-slate-450 hover:bg-slate-100 hover:text-indigo-500 dark:bg-zinc-950 dark:border-zinc-800 dark:text-zinc-400 dark:hover:text-indigo-400'}`}
                    title="Dictate with voice"
                >
                    <span className={`text-xl ${isListening ? 'animate-pulse' : ''}`}>
                        {isListening ? "🎙️" : "🎤"}
                    </span>
                </button>
            </div>

            <button
                onClick={handleParse}
                disabled={loading || !text.trim()}
                className="mt-4 w-full rounded-lg bg-indigo-600 py-3 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-2"
            >
                {loading ? (
                    <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Analyzing Intent...
                    </>
                ) : (
                    "Process via AI"
                )}
            </button>
        </div>
    );
}
