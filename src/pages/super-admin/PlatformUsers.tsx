import { useEffect, useState } from "react";
import { ArrowRight, Loader2, Search, Users } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api, type Institution, type PlatformUser } from "../../services/api";

const SIZE = 20;
type Kind = "STUDENT" | "TEACHER" | "STAFF";
const tabs: [Kind, string][] = [["STUDENT", "Students"], ["TEACHER", "Teachers"], ["STAFF", "Staff"]];
const card = "min-w-0 overflow-hidden rounded-xl border border-[#d8e9fb] bg-white shadow-[0_1px_6px_rgba(37,99,235,0.05)]";
const th = "border border-blue-100 px-2 py-2 font-bold";
const td = "border border-blue-50 px-2 py-2";
const control = "h-8 rounded-md border border-[#d3dff0] bg-white px-2.5 text-[11px] text-[#17265f] outline-none placeholder:text-[#8b9abd] hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";

export default function PlatformUsers() {
  const [kind, setKind] = useState<Kind>("STUDENT");
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [institutionId, setInstitutionId] = useState("");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<PlatformUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => { api.institutions.list({ status: "ALL" }).then(setInstitutions).catch(() => undefined); }, []);
  // wait a moment after typing before searching
  useEffect(() => { const t = setTimeout(() => { setQuery(search); setPage(0); }, 300); return () => clearTimeout(t); }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api.platformUsers.list({ type: kind, search: query || undefined, institutionId: institutionId ? Number(institutionId) : undefined, page, size: SIZE })
      .then((r) => { if (!cancelled) { setRows(r.items); setTotal(r.total); setError(""); } })
      .catch((e) => { if (!cancelled) setError(e instanceof Error ? e.message : "Could not load users."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [kind, query, institutionId, page]);

  const pages = Math.max(1, Math.ceil(total / SIZE));
  const detailHead = kind === "STUDENT" ? "Admission" : kind === "TEACHER" ? "Phone" : "Role";

  return (
    <AdminLayout activeItem="Users">
      <div className="space-y-2.5">
        <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white/95 px-4 py-3 shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
          <Users size={36} strokeWidth={2.2} className="shrink-0 text-blue-600" />
          <div className="min-w-0">
            <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.5px] text-[#111b70]">Users</h1>
            <p className="mt-0.5 text-[11px] leading-4 text-[#425585]">Students, teachers and staff across every institution. Parent accounts will appear here once that feature is added.</p>
          </div>
        </div>

        {error && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] leading-5 text-rose-700"><span className="font-bold">Please review:</span> {error}</div>}

        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-blue-50 px-3 py-2.5">
            <div className="flex gap-1 rounded-lg bg-[#f5f9ff] p-1">
              {tabs.map(([k, label]) => (
                <button key={k} type="button" onClick={() => { setKind(k); setPage(0); }} className={`rounded-md px-3 py-1.5 text-[11px] font-semibold transition ${kind === k ? "bg-white text-blue-700 shadow-sm" : "text-[#455a8c] hover:text-blue-700"}`}>{label}</button>
              ))}
              <span className="rounded-md px-3 py-1.5 text-[11px] font-semibold text-[#a3b0cc]" title="Coming soon">Parents</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b9abd]" />
                <input className={`${control} w-[220px] pl-8`} placeholder="Search name, email…" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <select className={control} value={institutionId} onChange={(e) => { setInstitutionId(e.target.value); setPage(0); }} aria-label="Filter by institution">
                <option value="">All institutions</option>
                {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto px-2 pb-2 pt-2">
            <table className="w-full min-w-[720px] border-collapse text-left text-[10px]">
              <thead><tr className="bg-[#f5f9ff] text-[#13205f]">{["Name", "Email", detailHead, "Institution", "Status"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={5} className={`${td} py-10 text-center text-[#52638f]`}><Loader2 size={16} className="mr-2 inline animate-spin" />Loading…</td></tr>
                  : rows.length === 0 ? <tr><td colSpan={5} className={`${td} py-10 text-center text-[#52638f]`}>No {tabs.find(([k]) => k === kind)?.[1].toLowerCase()} found.</td></tr>
                  : rows.map((u) => <tr key={`${u.type}-${u.id}`} className="hover:bg-blue-50/50">
                    <td className={`${td} font-semibold text-[#15215e]`}>{u.name}</td>
                    <td className={`${td} text-[#455a8c]`}>{u.email ?? "—"}</td>
                    <td className={`${td} text-[#455a8c]`}>{u.detail ?? "—"}</td>
                    <td className={`${td} text-[#455a8c]`}>{u.institutionName ?? "—"}</td>
                    <td className={td}><span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-medium ${u.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><span className={`h-2 w-2 rounded-full ${u.active ? "bg-emerald-500" : "bg-slate-400"}`} />{u.active ? "Active" : "Inactive"}</span></td>
                  </tr>)}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-blue-50 px-3 py-2 text-[10px] text-[#52638f]">
            <span>{total === 0 ? 0 : page * SIZE + 1}–{Math.min((page + 1) * SIZE, total)} of {total}</span>
            <div className="flex items-center gap-1.5">
              <button type="button" disabled={page <= 0} onClick={() => setPage(page - 1)} className="rounded border border-blue-100 px-2.5 py-1 font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40">Previous</button>
              <span>Page {page + 1} of {pages}</span>
              <button type="button" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="inline-flex items-center gap-1 rounded border border-blue-100 px-2.5 py-1 font-semibold text-blue-600 hover:bg-blue-50 disabled:opacity-40">Next <ArrowRight size={11} /></button>
            </div>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
