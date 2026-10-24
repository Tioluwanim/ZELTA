"use client";
import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import Zel from "@/components/Zel";
import { Pill } from "@/components/ui";
import { api } from "@/lib/api";
import { markAsked } from "@/lib/streak";
import { titleCase } from "@/lib/format";
import type { CopilotAnswer, CopilotMessage } from "@/lib/types";

interface Turn { role: "user" | "assistant"; text: string; meta?: CopilotAnswer; suggestions?: string[]; tools?: string[]; warnings?: string[]; error?: boolean }
const TOOL: Record<string, string> = { estimate_runway: "your runway", get_current_position: "your position", get_spending_habits: "your habits", get_forecast: "your forecast", get_buffer: "your buffer", get_recommendations: "your plan", check_action: "the Guardian", run_whatif: "a what-if", can_i_afford: "affordability" };
const CHIPS = ["How long will my money last?", "Can I afford ₦5,000 today?", "What if I spend ₦2,000 less each week?"];
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
      try {
        const r = await api.agent(question);
        setTurns((t) => [...t, { role: "assistant", text: r.text, suggestions: r.suggestions, warnings: r.warnings,
          tools: [...new Set(r.tools.filter((x) => x.ok).map((x) => TOOL[x.tool] ?? titleCase(x.tool)))] }]);
      } catch {
        const meta = await api.ask(question, history);
        setTurns((t) => [...t, { role: "assistant", text: meta.answer, meta }]);
      }
      markAsked();
    } catch (e) {
      setTurns((t) => [...t, { role: "assistant", text: e instanceof Error ? e.message : "Zel could not answer. Try again.", error: true }]);
    } finally { setBusy(false); }
  }

  return (
    <main className="mx-auto flex h-[calc(100dvh-4rem-var(--top))] max-w-2xl flex-col px-4 pt-4 md:h-[calc(100dvh-var(--top))]">
      <header className="flex items-center gap-3 pb-3"><Zel mood={busy ? "think" : "happy"} size={56} /><div><h1 className="text-3xl font-extrabold">Coach</h1><p className="text-sm text-soft">Answers use your own numbers. Not financial advice.</p></div></header>
      <div className="flex-1 space-y-3 overflow-y-auto pb-3" aria-live="polite">
        {turns.length === 0 && (
          <div className="grid gap-2 pt-6"><p className="text-center text-soft">Ask Zel anything about your money.</p>
            {CHIPS.map((c) => <button key={c} onClick={() => void send(c)} className="min-h-12 rounded-[14px] border-[1.5px] border-line bg-paper px-4 text-left font-semibold hover:border-indigo">{c}</button>)}</div>)}
        {turns.map((t, i) => t.role === "user" ? (
          <div key={i} className="flex justify-end"><p className="cloth batani pop max-w-[85%] overflow-hidden rounded-[22px] rounded-br-md bg-dye-2 px-4 py-3 text-[17px] text-resist" style={{ ["--stitch" as string]: "rgba(245,239,226,.12)" }}>{t.text}</p></div>
        ) : (
          <div key={i} className="flex items-end gap-2"><Zel mood={t.error ? "worried" : "happy"} size={40} />
            <div className={`pop max-w-[85%] space-y-2 rounded-[22px] rounded-bl-md border-[1.5px] px-4 py-3 text-[17px] ${t.error ? "border-coral bg-coral-tint" : "border-line bg-paper"}`} role={t.error ? "alert" : undefined}>
              <p className="whitespace-pre-wrap">{t.text}</p>
              {t.meta && <div className="flex flex-wrap items-center gap-2">
                {VERDICT[t.meta.verdict] && <Pill tone={VERDICT[t.meta.verdict].tone}>{VERDICT[t.meta.verdict].label}</Pill>}
                {t.meta.context_pills.map((p) => <Pill key={p.label} tone="indigo">{p.label}: {p.value}</Pill>)}</div>}
              {t.tools && t.tools.length > 0 && <p className="text-sm text-soft">Worked out from {t.tools.join(", ")}.</p>}
              {t.warnings?.filter((x) => !/sample/i.test(x)).map((x) => <p key={x} className="text-sm text-soft">{x}</p>)}
              {t.suggestions && i === turns.length - 1 && <div className="flex flex-wrap gap-2 pt-1">{t.suggestions.map((c) => <button key={c} onClick={() => void send(c)} className="min-h-10 rounded-full border-[1.5px] border-indigo/30 bg-indigo-tint px-3 text-[15px] font-semibold text-indigo">{c}</button>)}</div>}
              {t.meta && t.meta.sources.length > 0 && <p className="text-sm text-soft">Based on: {t.meta.sources.join(", ")}</p>}
              {t.error && i === turns.length - 1 && <button className="font-semibold text-indigo underline" onClick={() => void send(turns[i - 1]?.text ?? "")}>Try again</button>}
            </div></div>))}
        {busy && <div className="flex items-center gap-2 text-soft"><Zel mood="think" size={40} bob />Zel is working it out…</div>}
        <div ref={end} />
      </div>
      <form onSubmit={(e) => { e.preventDefault(); void send(text); }} className="flex gap-2 pb-3">
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask about your money" aria-label="Your question" maxLength={500}
          className="min-h-12 flex-1 rounded-[14px] border-[1.5px] border-line bg-paper px-4 text-[17px] outline-none focus:border-indigo" />
        <button type="submit" disabled={busy || !text.trim()} aria-label="Send" className="btn grid h-12 w-14 place-items-center rounded-[14px] bg-indigo text-white disabled:opacity-50"><Send size={22} /></button>
      </form>
    </main>
  );
}
