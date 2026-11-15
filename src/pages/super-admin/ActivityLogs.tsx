import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Activity, ArrowRight, Loader2, RefreshCw } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api, type ActivityEntry, type HealthLogRow, type HealthSnapshot, type HealthStatus } from "../../services/api";

const SIZE = 20;
const actions: [string, string][] = [
  ["", "All activity"], ["INSTITUTION_CREATED", "Institution created"], ["INSTITUTION_DRAFT", "Draft saved"],
  ["INSTITUTION_UPDATED", "Institution updated"], ["INSTITUTION_ARCHIVED", "Archived"], ["INSTITUTION_RESTORED", "Restored"],
  ["INSTITUTION_DELETED", "Deleted"], ["PAYMENT_RECEIVED", "Payments"], ["LOGIN", "Sign-ins"], ["LOGIN_FAILED", "Failed sign-ins"],
];
const actionLabel = (a: string) => actions.find(([v]) => v === a)?.[1] ?? a.toLowerCase().replace(/_/g, " ");
const tone = (a: string) =>
  a === "LOGIN_FAILED" || a === "INSTITUTION_ARCHIVED" ? "bg-orange-50 text-orange-700"
  : a === "INSTITUTION_DELETED" || a === "PAYMENT_DELETED" ? "bg-rose-50 text-rose-700"
  : a === "PAYMENT_RECEIVED" || a === "INSTITUTION_RESTORED" ? "bg-emerald-50 text-emerald-700"
  : a === "LOGIN" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700";
const when = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true });
const healthTone: Record<HealthStatus, [string, string, string]> = {
  OPERATIONAL: ["Operational", "bg-emerald-50 text-emerald-700", "bg-emerald-500"],
  DEGRADED: ["Degraded", "bg-amber-50 text-amber-700", "bg-amber-500"],
  DOWN: ["Down", "bg-rose-50 text-rose-700", "bg-rose-500"],
  NOT_CONFIGURED: ["Not configured", "bg-slate-100 text-slate-500", "bg-slate-300"],
};
const card = "min-w-0 overflow-hidden rounded-xl border border-[#d8e9fb] bg-white shadow-[0_1px_6px_rgba(37,99,235,0.05)]";
const th = "border border-blue-100 px-2 py-2 font-bold";
const td = "border border-blue-50 px-2 py-2";
const control = "h-8 rounded-md border border-[#d3dff0] bg-white px-2.5 text-[11px] text-[#17265f] outline-none hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function Pager({ page, total, onPage }: { page: number; total: number; onPage: (p: number) => void }) {
  const pages = Math.max(1, Math.ceil(total / SIZE));
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-50 px-3 py-2 text-[10px] text-[#52638f]">
      <span>{total === 0 ? 0 : page * SIZE + 1}–{Math.min((page + 1) * SIZE, total)} of {total}</span>
      <div className="flex items-center gap-1.5">
        <button type="button" disabled={page <= 0} onClick={() => onPage(page - 1)} className="rounded border border-blue-100 px-2.5 py-1 font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40">Previous</button>
        <span>Page {page + 1} of {pages}</span>
        <button type="button" disabled={page + 1 >= pages} onClick={() => onPage(page + 1)} className="inline-flex items-center gap-1 rounded border border-blue-100 px-2.5 py-1 font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40">Next <ArrowRight size={11} /></button>
      </div>
    </div>
  );
}

export default function ActivityLogs() {
  const [params, setParams] = useSearchParams();
  const tab = params.get("tab") === "health" ? "health" : "activity";
  const setTab = (t: "activity" | "health") => setParams(t === "health" ? { tab: "health" } : {});

  // activity
  const [action, setAction] = useState("");
  const [aPage, setAPage] = useState(0);
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [aTotal, setATotal] = useState(0);
  const [aLoading, setALoading] = useState(true);

  // health
  const [hPage, setHPage] = useState(0);
  const [logs, setLogs] = useState<HealthLogRow[]>([]);
  const [hTotal, setHTotal] = useState(0);
  const [snapshot, setSnapshot] = useState<HealthSnapshot | null>(null);
  const [running, setRunning] = useState(false);
  const [hLoading, setHLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (tab !== "activity") return;
    let cancelled = false;
    setALoading(true);
    api.activity.list({ page: aPage, size: SIZE, action: action || undefined })
      .then((r) => { if (!cancelled) { setEntries(r.items); setATotal(r.total); setError(""); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load activity."); })
      .finally(() => { if (!cancelled) setALoading(false); });
    return () => { cancelled = true; };
  }, [tab, aPage, action]);

  const loadLogs = useCallback(async (page: number) => {
    setHLoading(true);
    try {
      const r = await api.system.healthLogs({ page, size: SIZE });
      setLogs(r.items); setHTotal(r.total);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load health logs.");
    } finally {
      setHLoading(false);
    }
  }, []);

  const runCheck = useCallback(async () => {
    setRunning(true);
    try {
      setSnapshot(await api.system.runHealthCheck());   // runs the checks and saves a log row
      setHPage(0);
      await loadLogs(0);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "The health check failed.");
    } finally {
      setRunning(false);
    }
  }, [loadLogs]);

  // Opening the Health tab runs one check, so there is always a fresh entry at the top.
  useEffect(() => { if (tab === "health") void runCheck(); }, [tab, runCheck]);

  return (
    <AdminLayout activeItem="Audit Logs">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d8e9fb] bg-white/95 px-4 py-3 shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
          <div className="flex min-w-0 items-center gap-3">
            <Activity size={36} strokeWidth={2.2} className="shrink-0 text-blue-600" />
            <div className="min-w-0">
              <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.5px] text-[#111b70]">Activity & System Logs</h1>
              <p className="mt-0.5 text-[11px] leading-4 text-[#425585]">Who did what on the platform, and how the system has been running.</p>
            </div>
          </div>
        </div>

        {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] leading-5 text-rose-700"><span className="font-bold">Please review:</span> {error}</div>}

        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-50 px-3 py-2.5">
            <div className="flex gap-1 rounded-lg bg-[#f5f9ff] p-1">
              {([["activity", "Recent Activity"], ["health", "System Health"]] as const).map(([k, label]) => (
                <button key={k} type="button" onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${tab === k ? "bg-white text-blue-700 shadow-sm" : "text-[#455a8c] hover:text-blue-700"}`}>{label}</button>
              ))}
            </div>
            {tab === "activity"
              ? <select className={control} value={action} onChange={(e) => { setAction(e.target.value); setAPage(0); }} aria-label="Filter activity">{actions.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              : <button type="button" onClick={() => void runCheck()} disabled={running} className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-2 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-60">{running ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Run check now</button>}
          </div>

          {tab === "activity" ? (
            <>
              <div className="overflow-x-auto px-2 pb-2 pt-2">
                <table className="w-full min-w-[760px] border-collapse text-left text-[10px]">
                  <thead><tr className="bg-[#f5f9ff] text-[#13205f]">{["Time", "Event", "Details", "By"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {aLoading ? <tr><td colSpan={4} className={`${td} py-10 text-center text-[#52638f]`}><Loader2 size={16} className="mr-2 inline animate-spin" />Loading…</td></tr>
                      : entries.length === 0 ? <tr><td colSpan={4} className={`${td} py-10 text-center text-[#52638f]`}>No activity found.</td></tr>
                      : entries.map((e) => <tr key={e.id} className="hover:bg-blue-50/50">
                        <td className={`${td} whitespace-nowrap text-[#455a8c]`}>{when(e.createdAt)}</td>
                        <td className={td}><span className={`whitespace-nowrap rounded px-2 py-1 text-[9px] font-medium ${tone(e.action)}`}>{actionLabel(e.action)}</span></td>
                        <td className={`${td} text-[#33477c]`}>{e.description}</td>
                        <td className={`${td} text-[#455a8c]`}>{e.actorEmail ?? "System"}</td>
                      </tr>)}
                  </tbody>
                </table>
              </div>
              <Pager page={aPage} total={aTotal} onPage={setAPage} />
            </>
          ) : (
            <>
              {snapshot && (
                <div className="grid grid-cols-2 gap-2 p-3 sm:grid-cols-3 xl:grid-cols-5">
                  {snapshot.checks.map((c) => {
                    const [label, box, dot] = healthTone[c.status];
                    return <div key={c.name} className="rounded-lg border border-blue-100 p-2.5">
                      <p className="text-[10px] font-bold text-[#15215e]">{c.name}</p>
                      <span className={`mt-1.5 inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-medium ${box}`}><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span>
                      <p className="mt-1.5 text-[9px] leading-4 text-[#52638f]">{c.detail}</p>
                    </div>;
                  })}
                </div>
              )}
              <div className="overflow-x-auto px-2 pb-2 pt-1">
                <table className="w-full min-w-[760px] border-collapse text-left text-[10px]">
                  <thead><tr className="bg-[#f5f9ff] text-[#13205f]">{["Checked at", "Overall", "Database", "Memory used", "Disk free", "Details"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                  <tbody>
                    {hLoading ? <tr><td colSpan={6} className={`${td} py-10 text-center text-[#52638f]`}><Loader2 size={16} className="mr-2 inline animate-spin" />Loading…</td></tr>
                      : logs.length === 0 ? <tr><td colSpan={6} className={`${td} py-10 text-center text-[#52638f]`}>No health checks logged yet.</td></tr>
                      : logs.map((l) => {
                        const [label, box, dot] = healthTone[l.overall];
                        return <tr key={l.id} className="hover:bg-blue-50/50">
                          <td className={`${td} whitespace-nowrap text-[#455a8c]`}>{when(l.checkedAt)}</td>
                          <td className={td}><span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-medium ${box}`}><span className={`h-2 w-2 rounded-full ${dot}`} />{label}</span></td>
                          <td className={`${td} text-[#455a8c]`}>{l.databaseOk ? (l.databaseMs !== null ? `${l.databaseMs} ms` : "OK") : "Down"}</td>
                          <td className={`${td} text-[#455a8c]`}>{l.memoryUsedPct !== null ? `${l.memoryUsedPct}%` : "—"}</td>
                          <td className={`${td} text-[#455a8c]`}>{l.diskFreePct !== null ? `${l.diskFreePct}%` : "—"}</td>
                          <td className={`${td} text-[#52638f]`}>{l.detail ?? "—"}</td>
                        </tr>;
                      })}
                  </tbody>
                </table>
              </div>
              <Pager page={hPage} total={hTotal} onPage={(p) => { setHPage(p); void loadLogs(p); }} />
              <p className="border-t border-blue-50 px-3 py-2 text-[9px] text-[#6678a6]">The server checks itself every 5 minutes and keeps 30 days of history. Email and payment gateway show “Not configured” until those services are integrated.</p>
            </>
          )}
        </section>
      </div>
    </AdminLayout>
  );
}
