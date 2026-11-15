import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Archive,
  ArchiveRestore,
  ArrowRight,
  Building2,
  Info,
  Loader2,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api, type Institution, type InstitutionStatus, type InstitutionTypeRow } from "../../services/api";

const PAGE_SIZE = 10;

const statusLabel: Record<InstitutionStatus, string> = {
  DRAFT: "Draft", ACTIVE: "Active", TRIAL: "Trial", EXPIRING_SOON: "Expiring Soon", EXPIRED: "Expired", ARCHIVED: "Archived",
};
const statusTone: Record<InstitutionStatus, [string, string]> = {
  ACTIVE: ["bg-emerald-50 text-emerald-700", "bg-emerald-500"],
  TRIAL: ["bg-orange-50 text-orange-700", "bg-orange-500"],
  EXPIRING_SOON: ["bg-amber-50 text-amber-700", "bg-amber-500"],
  EXPIRED: ["bg-rose-50 text-rose-700", "bg-rose-500"],
  DRAFT: ["bg-slate-100 text-slate-600", "bg-slate-400"],
  ARCHIVED: ["bg-slate-100 text-slate-500", "bg-slate-400"],
};
const place = (i: Institution) => [i.city, i.state].filter(Boolean).join(", ") || "—";
const fmt = (n: number) => n.toLocaleString("en-IN");
const shortDate = (iso: string | null) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

const controlClass =
  "h-8 rounded-md border border-[#d3dff0] bg-white px-2.5 text-[11px] text-[#17265f] outline-none transition placeholder:text-[#8b9abd] hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

function StatusPill({ status }: { status: InstitutionStatus }) {
  const [box, dot] = statusTone[status];
  return (
    <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-[9px] font-medium ${box}`}>
      <span className={`h-2 w-2 rounded-full ${dot}`} />{statusLabel[status]}
    </span>
  );
}

function Avatar({ item }: { item: Institution }) {
  const initials = item.name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join("");
  return (
    <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br from-blue-50 to-sky-100 text-[11px] font-bold text-blue-700">
      {item.hasLogo
        ? <img src={api.institutions.imageUrl(item.id, "logo", item.updatedAt)} alt="" className="h-full w-full object-contain" />
        : initials || <Building2 size={16} />}
    </span>
  );
}

/** archivedView=true is the "Archive" page (sidebar > Institutions > Archive): it opens on the Archived tab. */
export default function AllInstitutions({ archivedView = false }: { archivedView?: boolean }) {
  const navigate = useNavigate();
  const routerLocation = useLocation();
  const [items, setItems] = useState<Institution[]>([]);
  const [types, setTypes] = useState<InstitutionTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState((routerLocation.state as { notice?: string } | null)?.notice ?? "");
  const [tab, setTab] = useState<"active" | "archived">(archivedView ? "archived" : "active");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [confirm, setConfirm] = useState<{ id: number; action: "archive" | "delete" } | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setError("");
    try {
      setItems(await api.institutions.list({ status: "ALL" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load institutions.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { api.institutionTypes.list().then(setTypes).catch(() => undefined); }, []);
  const typeLabel = (code: string) => types.find((t) => t.code === code)?.name ?? code;

  const activeItems = useMemo(() => items.filter((i) => i.status !== "ARCHIVED"), [items]);
  const archivedItems = useMemo(() => items.filter((i) => i.status === "ARCHIVED"), [items]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tab === "active" ? activeItems : archivedItems).filter((i) =>
      (!type || i.institutionType === type) &&
      (tab === "archived" || !status || i.status === status) &&
      (!q || [i.name, i.city, i.state, i.email, i.contactName].some((v) => v?.toLowerCase().includes(q))));
  }, [tab, activeItems, archivedItems, search, type, status]);

  const pages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const current = Math.min(page, pages);
  const rows = visible.slice((current - 1) * PAGE_SIZE, current * PAGE_SIZE);

  function switchTab(next: "active" | "archived") {
    setTab(next); setPage(1); setConfirm(null); setStatus(""); setNotice(""); setError("");
  }

  async function run(id: number, work: () => Promise<unknown>, success: string) {
    setBusyId(id); setError(""); setNotice("");
    try {
      await work();
      setNotice(success);
      setConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That action failed.");
      setConfirm(null);
    } finally {
      setBusyId(null);
    }
  }

  const iconBtn = "inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-semibold transition disabled:opacity-60";

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-2.5">
        {/* Title */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d8e9fb] bg-white/95 px-4 py-3 shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
          <div className="flex min-w-0 items-center gap-3">
            <Building2 size={36} strokeWidth={2.2} className="shrink-0 text-blue-600" />
            <div className="min-w-0">
              <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.5px] text-[#111b70]">{archivedView ? "Archived Institutions" : "All Institutions"}</h1>
              <p className="mt-0.5 text-[11px] leading-4 text-[#425585]">Search, edit, archive and restore every institution on the platform.</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate("/institutions/new")} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#0875fb] px-3.5 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-700"><Plus size={15} /> Add Institution</button>
        </div>

        {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] leading-5 text-rose-700"><span className="font-bold">Please review:</span> {error}</div>}
        {notice && (
          <div role="status" className="flex items-start gap-2 rounded-lg border border-[#d8e9fb] bg-gradient-to-r from-[#eff6ff] to-[#f8fcff] px-4 py-2.5 text-[11px] leading-5 text-blue-800">
            <Info size={15} className="mt-0.5 shrink-0" />{notice}
            <button type="button" className="ml-auto text-blue-600" onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={15} /></button>
          </div>
        )}

        <section className="min-w-0 overflow-hidden rounded-xl border border-[#d8e9fb] bg-white shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
          {/* Tabs + filters */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-50 px-3 py-2.5">
            <div className="flex gap-1 rounded-lg bg-[#f5f9ff] p-1">
              {([["active", "Institutions", activeItems.length], ["archived", "Archived", archivedItems.length]] as const).map(([key, label, n]) => (
                <button key={key} type="button" onClick={() => switchTab(key)}
                  className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${tab === key ? "bg-white text-blue-700 shadow-sm" : "text-[#455a8c] hover:text-blue-700"}`}>
                  {label} <span className={`ml-1 rounded-full px-1.5 py-0.5 text-[9px] ${tab === key ? "bg-blue-50 text-blue-700" : "bg-white text-[#6678a6]"}`}>{n}</span>
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b9abd]" />
                <input className={`${controlClass} w-[220px] pl-8`} placeholder="Search name, city, email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
              </div>
              <select className={controlClass} value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} aria-label="Filter by type">
                <option value="">All types</option>
                {types.map((t) => <option key={t.code} value={t.code}>{t.name}</option>)}
              </select>
              {tab === "active" && (
                <select className={controlClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} aria-label="Filter by status">
                  <option value="">All statuses</option>
                  {(["ACTIVE", "TRIAL", "EXPIRING_SOON", "EXPIRED", "DRAFT"] as InstitutionStatus[]).map((s) => <option key={s} value={s}>{statusLabel[s]}</option>)}
                </select>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto px-2 pb-2 pt-2">
            <table className="w-full min-w-[980px] border-collapse text-left text-[10px]">
              <thead>
                <tr className="bg-[#f5f9ff] text-[#13205f]">
                  {["Institution", "Type", "Location", "Contact", "Plan", "Valid Till", "Students", "Teachers", "Status", "Actions"].map((h) => (
                    <th key={h} className="border border-blue-100 px-2 py-2 font-bold">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={10} className="border border-blue-50 px-2 py-10 text-center text-[#52638f]"><Loader2 size={16} className="mr-2 inline animate-spin" />Loading institutions…</td></tr>
                ) : rows.length === 0 ? (
                  <tr><td colSpan={10} className="border border-blue-50 px-2 py-10 text-center text-[11px] text-[#52638f]">
                    {tab === "archived" ? "No archived institutions." : items.length === 0 ? "No institutions yet. Click “Add Institution” to create one." : "No institutions match your filters."}
                  </td></tr>
                ) : rows.map((item) => {
                  const busy = busyId === item.id;
                  const asking = confirm?.id === item.id ? confirm.action : null;
                  return (
                    <tr key={item.id} className="hover:bg-blue-50/50">
                      <td className="border border-blue-50 px-2 py-2">
                        <div className="flex min-w-[200px] items-center gap-2.5">
                          <Avatar item={item} />
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-bold text-[#15215e]">{item.name}</p>
                            <p className="truncate text-[9px] text-[#52638f]">{item.email ?? "—"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="border border-blue-50 px-2 py-2 text-[#455a8c]">{typeLabel(item.institutionType)}</td>
                      <td className="border border-blue-50 px-2 py-2 text-[#455a8c]">{place(item)}</td>
                      <td className="border border-blue-50 px-2 py-2 text-[#455a8c]">{item.contactName ?? "—"}</td>
                      <td className="border border-blue-50 px-2 py-2 text-[#455a8c]">{item.planType ? item.planType[0] + item.planType.slice(1).toLowerCase() : "—"}</td>
                      <td className="whitespace-nowrap border border-blue-50 px-2 py-2 text-[#455a8c]">{shortDate(item.subscriptionEnd)}</td>
                      <td className="border border-blue-50 px-2 py-2 text-[#273a77]">{fmt(item.studentCount)}</td>
                      <td className="border border-blue-50 px-2 py-2 text-[#273a77]">{fmt(item.teacherCount)}</td>
                      <td className="border border-blue-50 px-2 py-2"><StatusPill status={item.status} /></td>
                      <td className="border border-blue-50 px-2 py-2">
                        {busy ? <Loader2 size={14} className="animate-spin text-blue-600" /> : asking ? (
                          <span className="inline-flex flex-wrap items-center gap-1.5 text-[9px] text-rose-700">
                            {asking === "archive" ? "Archive this institution?" : "Delete forever?"}
                            <button type="button" className="font-bold underline"
                              onClick={() => asking === "archive"
                                ? run(item.id, () => api.institutions.archive(item.id), `"${item.name}" was archived. Find it under the Archived tab.`)
                                : run(item.id, () => api.institutions.deletePermanently(item.id), `"${item.name}" was deleted permanently.`)}>
                              Yes
                            </button>
                            <button type="button" className="font-semibold text-[#455a8c]" onClick={() => setConfirm(null)}>No</button>
                          </span>
                        ) : item.status === "ARCHIVED" ? (
                          <div className="flex flex-wrap gap-1">
                            <button type="button" className={`${iconBtn} bg-emerald-50 text-emerald-700 hover:bg-emerald-100`}
                              onClick={() => run(item.id, () => api.institutions.restore(item.id), `"${item.name}" was restored.`)}><ArchiveRestore size={11} /> Restore</button>
                            <button type="button" className={`${iconBtn} bg-rose-50 text-rose-600 hover:bg-rose-100`} onClick={() => setConfirm({ id: item.id, action: "delete" })}><Trash2 size={11} /> Delete</button>
                          </div>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            <button type="button" className={`${iconBtn} bg-blue-50 text-blue-600 hover:bg-blue-100`} onClick={() => navigate(`/institutions/${item.id}/edit`)}><Pencil size={11} /> Edit</button>
                            <button type="button" className={`${iconBtn} bg-slate-100 text-slate-600 hover:bg-slate-200`} onClick={() => setConfirm({ id: item.id, action: "archive" })}><Archive size={11} /> Archive</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-50 px-3 py-2 text-[10px] text-[#52638f]">
            <span>Showing {visible.length === 0 ? 0 : (current - 1) * PAGE_SIZE + 1}–{Math.min(current * PAGE_SIZE, visible.length)} of {visible.length}</span>
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={current <= 1} onClick={() => setPage(current - 1)} className="rounded border border-blue-100 px-2.5 py-1 font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40">Previous</button>
              <span>Page {current} of {pages}</span>
              <button type="button" disabled={current >= pages} onClick={() => setPage(current + 1)} className="inline-flex items-center gap-1 rounded border border-blue-100 px-2.5 py-1 font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40">Next <ArrowRight size={11} /></button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
