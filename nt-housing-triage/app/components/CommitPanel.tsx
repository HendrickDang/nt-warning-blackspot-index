"use client";

import { useEffect, useState } from "react";
import { dialNarrative } from "@/lib/explainer";
import type { EquitySummary, RankedJob } from "@/lib/engine/types";

interface AuditEntry {
  id: string;
  at: string;
  lambda: number;
  narrative: string;
  order: { id: string; community: string; safety: string; needRank: number }[];
}

interface Props {
  lambda: number;
  ranked: RankedJob[];
  summary: EquitySummary;
}

const STORAGE_KEY = "nt-triage-audit";

export default function CommitPanel({ lambda, ranked, summary }: Props) {
  const [entries, setEntries] = useState<AuditEntry[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setEntries(JSON.parse(raw) as AuditEntry[]);
    } catch {
      /* ignore */
    }
  }, []);

  function commit() {
    const entry: AuditEntry = {
      id: `commit-${Date.now()}`,
      at: new Date().toISOString(),
      lambda,
      narrative: dialNarrative(summary),
      order: ranked.map((r) => ({
        id: r.job.id,
        community: r.job.community.name,
        safety: r.job.report.safety_level,
        needRank: r.needRank,
      })),
    };
    const next = [entry, ...entries].slice(0, 10);
    setEntries(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="panel p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Commit schedule</h2>
        <span className="text-[11px] text-[var(--muted)]">audited decisions</span>
      </div>
      <p className="mt-1 text-[11px] text-[var(--muted)]">
        The dial is a recommendation. A human commits the schedule, and the choice is recorded.
      </p>
      <button
        onClick={commit}
        className="mt-3 w-full rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-semibold text-slate-950 transition hover:brightness-110"
      >
        Commit this schedule at λ = {lambda.toFixed(2)}
      </button>

      <div className="mt-3 max-h-52 space-y-2 overflow-y-auto">
        {entries.length === 0 && (
          <p className="text-[11px] text-[var(--muted)]">No committed schedules yet.</p>
        )}
        {entries.map((e) => (
          <div key={e.id} className="rounded-lg border border-[var(--border)] bg-[var(--panel-2)] p-2.5 text-[11px]">
            <div className="flex items-center justify-between text-[var(--muted)]">
              <span>{new Date(e.at).toLocaleString("en-AU")}</span>
              <span className="chip">λ {e.lambda.toFixed(2)}</span>
            </div>
            <p className="mt-1 text-slate-200">{e.narrative}</p>
            <p className="mt-1 text-[var(--muted)]">
              Top: {e.order.slice(0, 3).map((o) => `${o.community} (${o.id})`).join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
