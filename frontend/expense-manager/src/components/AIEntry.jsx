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
            const data = await parseAIExpense(text);
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
        <div className="relative overflow-hidden rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 p-8 shadow-sm group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-fuchsia-500/10 dark:from-indigo-500/20 dark:to-fuchsia-500/20 rounded-full blur-2xl -mr-10 -mt-10 group-hover:scale-150 transition-transform duration-700 pointer-events-none"></div>

            <h2 className="mb-2 text-xl font-bold flex items-center gap-2 relative z-10 text-slate-800 dark:text-white">
                <span className="text-2xl animate-pulse text-indigo-500">✨</span> AI Smart Entry
            </h2>
            <p className="mb-6 text-sm font-medium text-slate-500 dark:text-zinc-400 relative z-10">
                Type or speak naturally (e.g. "I spent 500 on dinner")
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

            <div className="flex gap-3 relative z-10">
                <textarea
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    placeholder="What did you spend on?"
                    className="flex-1 rounded-2xl bg-slate-50 dark:bg-zinc-800/50 border border-slate-200 dark:border-white/10 p-4 text-sm focus:ring-4 focus:ring-indigo-500/10 dark:focus:ring-indigo-500/20 focus:border-indigo-500 outline-none h-24 resize-none transition-all placeholder-slate-400 dark:placeholder-zinc-500"
                />
                <button
                    onClick={startVoice}
                    className={`shrink-0 w-14 rounded-2xl border flex items-center justify-center transition-all ${isListening ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-500/20 dark:border-rose-500/30' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-indigo-500 dark:bg-zinc-800/50 dark:border-white/10 dark:text-zinc-400 dark:hover:text-indigo-400'}`}
                    title="Dictate with voice"
                >
                    <span className={`text-2xl ${isListening ? 'animate-pulse' : ''}`}>
                        {isListening ? "🎙️" : "🎤"}
                    </span>
                </button>
            </div>

            <button
                onClick={handleParse}
                disabled={loading || !text.trim()}
                className="mt-5 w-full rounded-2xl bg-indigo-600 py-3.5 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-600/40 focus:ring-4 focus:ring-indigo-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed relative z-10 flex justify-center items-center gap-2"
            >
                {loading ? (
                    <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Analyzing Intent...
                    </>
                ) : (
                    "Process via AI"
                )}
            </button>
        </div>
    );
}
