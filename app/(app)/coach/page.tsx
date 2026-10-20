"use client";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import Zel from "@/components/Zel";
import { Pill } from "@/components/ui";
import { api } from "@/lib/api";
import { markAsked } from "@/lib/streak";
import type { CopilotAnswer, CopilotMessage } from "@/lib/types";

interface Turn { role: "user" | "assistant"; text: string; meta?: CopilotAnswer; error?: boolean }
const CHIPS = ["Can I afford ₦5,000 today?", "Where is my money going?", "How much should I set aside this week?"];
const VERDICT: Record<string, { tone: "mint" | "danfo" | "indigo"; label: string }> = {
  SAVE: { tone: "mint", label: "Set it aside" }, INVEST: { tone: "indigo", label: "Put it to work" }, HOLD: { tone: "danfo", label: "Hold for now" },
};

export default function CoachPage() {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [text, setText] = useState(""); const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [turns, busy]);

  async function send(q: string) {
    const question = q.trim();
    if (!question || busy) return;
    const history: CopilotMessage[] = turns.filter((t) => !t.error).map((t) => ({ role: t.role, content: t.text }));
    setTurns((t) => [...t, { role: "user", text: question }]); setText(""); setBusy(true);
    try {
      const meta = await api.ask(question, history);
      setTurns((t) => [...t, { role: "assistant", text: meta.answer, meta }]);
      markAsked();
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", text: e instanceof Error ? e.message : "Zel could not answer. Try again.", error: true }]);
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-4rem-var(--top))] max-w-2xl flex-col px-4 pt-4 md:h-[calc(100dvh-var(--top))]">
      <header className="flex items-center gap-3 pb-3"><Zel mood={busy ? "think" : "happy"} size={56} /><div><h1 className="text-2xl font-bold">Coach</h1><p className="text-sm text-soft">Answers use your own numbers. Not financial advice.</p></div></header>
      <div className="flex-1 space-y-3 overflow-y-auto pb-3" aria-live="polite">
        {turns.length === 0 && (
          <div className="grid gap-2 pt-6"><p className="text-center text-soft">Ask Zel anything about your money.</p>
            {CHIPS.map((c) => <button key={c} onClick={() => void send(c)} className="min-h-12 rounded-2xl border-2 border-line bg-paper px-4 text-left font-semibold hover:border-indigo">{c}</button>)}</div>)}
        {turns.map((t, i) => t.role === "user" ? (
          <div key={i} className="flex justify-end"><p className="pop max-w-[85%] rounded-3xl rounded-br-lg bg-indigo px-4 py-3 text-[17px] text-white">{t.text}</p></div>
        ) : (
          <div key={i} className="flex items-end gap-2"><Zel mood={t.error ? "worried" : "happy"} size={40} />
            <div className={`pop max-w-[85%] space-y-2 rounded-3xl rounded-bl-lg border-2 px-4 py-3 text-[17px] ${t.error ? "border-coral bg-coral-tint" : "border-line bg-paper"}`} role={t.error ? "alert" : undefined}>
              <p className="whitespace-pre-wrap">{t.text}</p>
              {t.meta && <div className="flex flex-wrap items-center gap-2">
                {VERDICT[t.meta.verdict] && <Pill tone={VERDICT[t.meta.verdict].tone}>{VERDICT[t.meta.verdict].label}</Pill>}
                {t.meta.context_pills.map((p) => <Pill key={p.label} tone="indigo">{p.label}: {p.value}</Pill>)}</div>}
              {t.meta && t.meta.sources.length > 0 && <p className="text-sm text-soft">Based on: {t.meta.sources.join(", ")}</p>}
              {t.error && i === turns.length - 1 && <button className="font-semibold text-indigo underline" onClick={() => void send(turns[i - 1]?.text ?? "")}>Try again</button>}
            </div></div>))}
        {busy && <div className="flex items-center gap-2 text-soft"><Zel mood="think" size={40} bob />Zel is working it out…</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="flex gap-2 pb-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about your money" aria-label="Your question" maxLength={500}
          className="min-h-12 flex-1 rounded-2xl border-2 border-line bg-paper px-4 text-[17px] outline-none focus:border-indigo" />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="btn grid h-12 w-14 place-items-center rounded-2xl bg-indigo text-white shadow-[0_4px_0_0_var(--indigo-deep)] disabled:opacity-50"><Send size={22} /></button>
      </form>
    </main>
  );
}
