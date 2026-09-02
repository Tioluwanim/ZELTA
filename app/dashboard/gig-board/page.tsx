"use client";

import React, { useState, useCallback } from "react";
import PageHeader from "@/components/PageHeader";
import { apiFetch } from "@/hooks/useFetch";
import {
  MessageSquare, Sparkles, MapPin, DollarSign, Clock,
  CheckCircle, XCircle, Loader2, RefreshCw, Plus, Briefcase,
  ChevronRight, AlertCircle,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────
interface ExtractedGig {
  id: string;
  task: string;
  location: string;
  payout: number;
  payout_raw: string;
  time_estimate?: string;
  skills_required?: string[];
  status: "OPEN" | "CLAIMED" | "COMPLETED";
  raw_text: string;
  extracted_at: string;
  poster?: string;
}

interface GigExtractResponse {
  success: boolean;
  gig?: ExtractedGig;
  error?: string;
}

interface GigListResponse {
  success: boolean;
  gigs: ExtractedGig[];
  total: number;
}

// ─── Status badge ─────────────────────────────────────────────────
function StatusBadge({ status }: { status: ExtractedGig["status"] }) {
  const cfg = {
    OPEN: "bg-emerald-100 text-emerald-700",
    CLAIMED: "bg-amber-100 text-amber-700",
    COMPLETED: "bg-gray-100 text-gray-500",
  }[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${cfg}`}>
      {status}
    </span>
  );
}

// ─── Gig Card ─────────────────────────────────────────────────────
function GigCard({
  gig,
  onClaim,
  claiming,
}: {
  gig: ExtractedGig;
  onClaim: (id: string) => void;
  claiming: string | null;
}) {
  const date = new Date(gig.extracted_at).toLocaleDateString("en-NG", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50">
            <Briefcase className="h-5 w-5 text-emerald-500" />
          </div>
          <div>
            <h3 className="font-bold text-gray-900 leading-snug">{gig.task}</h3>
            {gig.poster && (
              <p className="text-xs text-gray-400 mt-0.5">Posted by {gig.poster}</p>
            )}
          </div>
        </div>
        <StatusBadge status={gig.status} />
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
        <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
          <DollarSign className="h-4 w-4 text-emerald-500 shrink-0" />
          <div>
            <p className="text-[10px] text-gray-400">Payout</p>
            <p className="text-sm font-bold text-emerald-600">₦{gig.payout.toLocaleString()}</p>
          </div>
        </div>
        {gig.location && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
            <MapPin className="h-4 w-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">Location</p>
              <p className="text-sm font-medium text-gray-700 truncate">{gig.location}</p>
            </div>
          </div>
        )}
        {gig.time_estimate && (
          <div className="flex items-center gap-2 rounded-xl bg-gray-50 px-3 py-2">
            <Clock className="h-4 w-4 text-gray-400 shrink-0" />
            <div>
              <p className="text-[10px] text-gray-400">Duration</p>
              <p className="text-sm font-medium text-gray-700">{gig.time_estimate}</p>
            </div>
          </div>
        )}
      </div>

      {gig.skills_required && gig.skills_required.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {gig.skills_required.map((skill) => (
            <span
              key={skill}
              className="rounded-full border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-600"
            >
              {skill}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <p className="text-xs text-gray-400">{date}</p>
        {gig.status === "OPEN" && (
          <button
            onClick={() => onClaim(gig.id)}
            disabled={claiming === gig.id}
            className="flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
          >
            {claiming === gig.id ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <CheckCircle className="h-3.5 w-3.5" />
            )}
            {claiming === gig.id ? "Claiming..." : "Claim Gig"}
          </button>
        )}
        {gig.status === "CLAIMED" && (
          <span className="text-xs font-medium text-amber-600">Claimed ✓</span>
        )}
      </div>
    </div>
  );
}

// ─── Extract Form ─────────────────────────────────────────────────
function ExtractForm({ onExtracted }: { onExtracted: (gig: ExtractedGig) => void }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const EXAMPLES = [
    "Need someone to debug my Python code at the library. Will pay 15k when done.",
    "Looking for a graphic designer to make posters for my business. Budget is 8,000 naira.",
    "Anyone who can help move my stuff from SUB to New Hostel today? Paying 5000.",
    "Need typist for my project write-up ASAP. 3000 naira. DM me.",
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || text.trim().length < 10) {
      setError("Please paste a WhatsApp message to extract a gig.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const result = await apiFetch<GigExtractResponse>("/api/gig/extract", {
        method: "POST",
        body: JSON.stringify({ raw_text: text.trim() }),
      });
      if (result.gig) {
        onExtracted(result.gig);
        setText("");
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(result.error || "Could not extract a gig from this message.");
      }
    } catch (err) {
      setError((err as Error).message || "Extraction failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-100">
          <MessageSquare className="h-4 w-4 text-emerald-600" />
        </div>
        <div>
          <h2 className="font-bold text-gray-900">Extract Gig from WhatsApp</h2>
          <p className="text-xs text-gray-500">Paste any informal campus message — Gemini Flash will clean it up</p>
        </div>
      </div>

      {/* Example buttons */}
      <div className="mb-3">
        <p className="mb-2 text-xs font-semibold text-gray-500">Try an example:</p>
        <div className="flex flex-wrap gap-2">
          {EXAMPLES.map((ex, i) => (
            <button
              key={i}
              onClick={() => setText(ex)}
              className="rounded-full border border-gray-200 bg-gray-50 px-3 py-1 text-[10px] font-medium text-gray-600 transition hover:border-emerald-300 hover:text-emerald-700"
            >
              Example {i + 1}
            </button>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={`Paste WhatsApp message here...\n\ne.g. "Need someone to debug my code at the library. Payout is 15k"`}
          rows={4}
          className="w-full resize-none rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100"
        />
        {error && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500" />
            <p className="text-xs text-red-600">{error}</p>
          </div>
        )}
        {success && (
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-2">
            <CheckCircle className="h-4 w-4 shrink-0 text-emerald-500" />
            <p className="text-xs text-emerald-700">Gig extracted and added to the board!</p>
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-emerald-500 py-3 text-sm font-bold text-white transition hover:bg-emerald-600 disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Extracting with Gemini Flash...</>
          ) : (
            <><Sparkles className="h-4 w-4" /> Extract Gig</>
          )}
        </button>
      </form>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────
const SEED_GIGS: ExtractedGig[] = [
  {
    id: "seed-1",
    task: "Debug Python code",
    location: "University Library",
    payout: 15000,
    payout_raw: "15k",
    time_estimate: "2-3 hours",
    skills_required: ["Python", "Debugging"],
    status: "OPEN",
    raw_text: "Need someone to debug my Python code at the library. Payout is 15k",
    extracted_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
    poster: "WhatsApp Group",
  },
  {
    id: "seed-2",
    task: "Design social media flyers",
    location: "Remote / Online",
    payout: 8000,
    payout_raw: "8000",
    time_estimate: "1 day",
    skills_required: ["Canva", "Graphic Design"],
    status: "OPEN",
    raw_text: "Looking for a graphic designer to make flyers. 8000 naira.",
    extracted_at: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    poster: "CS WhatsApp",
  },
  {
    id: "seed-3",
    task: "Help move items from SUB to New Hostel",
    location: "SUB → New Hostel",
    payout: 5000,
    payout_raw: "5000",
    time_estimate: "1-2 hours",
    skills_required: ["Physical help"],
    status: "CLAIMED",
    raw_text: "Anyone who can help move my stuff today? Paying 5000.",
    extracted_at: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    poster: "Level 300 Group",
  },
];

export default function GigBoardPage() {
  const [gigs, setGigs] = useState<ExtractedGig[]>(SEED_GIGS);
  const [claiming, setClaiming] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | "OPEN" | "CLAIMED">("ALL");
  const [refreshing, setRefreshing] = useState(false);

  const handleExtracted = useCallback((gig: ExtractedGig) => {
    setGigs((prev) => [gig, ...prev]);
  }, []);

  const handleClaim = useCallback(async (id: string) => {
    setClaiming(id);
    try {
      await apiFetch(`/api/gig/${id}/claim`, { method: "POST" });
      setGigs((prev) =>
        prev.map((g) => (g.id === id ? { ...g, status: "CLAIMED" as const } : g))
      );
    } catch {
      // Optimistic update even if backend isn't wired yet
      setGigs((prev) =>
        prev.map((g) => (g.id === id ? { ...g, status: "CLAIMED" as const } : g))
      );
    } finally {
      setClaiming(null);
    }
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const result = await apiFetch<GigListResponse>("/api/gig/list");
      if (result.gigs?.length) {
        setGigs(result.gigs);
      }
    } catch {
      // silently fail — seed data still shows
    } finally {
      setRefreshing(false);
    }
  };

  const filtered = filter === "ALL" ? gigs : gigs.filter((g) => g.status === filter);
  const openCount = gigs.filter((g) => g.status === "OPEN").length;

  return (
    <div className="px-3 pb-10 lg:px-0">
      <PageHeader
        title="Opportunity Engine"
        description="Legitimate, skill-fit gigs matched to close a shortfall your Twin sees coming"
      />

      {/* Stats row */}
      <div className="mt-5 grid grid-cols-3 gap-3">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
          <p className="text-xs text-emerald-600">Open Gigs</p>
          <p className="text-2xl font-bold text-emerald-700">{openCount}</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-4">
          <p className="text-xs text-gray-500">Total Listed</p>
          <p className="text-2xl font-bold text-gray-700">{gigs.length}</p>
        </div>
        <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
          <p className="text-xs text-amber-600">Avg. Payout</p>
          <p className="text-2xl font-bold text-amber-700">
            ₦{gigs.length ? Math.round(gigs.reduce((s, g) => s + g.payout, 0) / gigs.length).toLocaleString() : 0}
          </p>
        </div>
      </div>

      {/* Extract form */}
      <div className="mt-5">
        <ExtractForm onExtracted={handleExtracted} />
      </div>

      {/* Board header */}
      <div className="mt-6 flex items-center justify-between">
        <div className="flex gap-2">
          {(["ALL", "OPEN", "CLAIMED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? "bg-gray-900 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-500 transition hover:bg-gray-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Gig list */}
      <div className="mt-3 space-y-4">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-12 text-center">
            <Briefcase className="mx-auto h-8 w-8 text-gray-300" />
            <p className="mt-3 text-sm font-medium text-gray-500">No gigs here yet</p>
            <p className="mt-1 text-xs text-gray-400">
              Paste a WhatsApp message above to extract and post the first one.
            </p>
          </div>
        ) : (
          filtered.map((gig) => (
            <GigCard key={gig.id} gig={gig} onClaim={handleClaim} claiming={claiming} />
          ))
        )}
      </div>

      {/* How it works */}
      <div className="mt-6 rounded-2xl border border-gray-100 bg-white p-5">
        <h3 className="mb-3 font-bold text-gray-800">How the Gig Board works</h3>
        <div className="space-y-3">
          {[
            { n: "1", t: "Copy a message from any campus WhatsApp group" },
            { n: "2", t: "Paste it into the box above — Gemini Flash parses task, location, and payout" },
            { n: "3", t: "The structured gig card appears on the board for all students to claim" },
            { n: "4", t: "Claim a gig and the payer receives your Squad payment link" },
          ].map(({ n, t }) => (
            <div key={n} className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                {n}
              </span>
              <p className="text-sm text-gray-600">{t}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
