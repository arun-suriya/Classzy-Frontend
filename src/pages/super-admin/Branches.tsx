import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Building2, GitBranch, Info, Loader2, MapPin, Pencil, Plus, Search, Star, Trash2, X } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api, type Branch, type BranchInput, type BranchKind, type BranchStatus, type Institution } from "../../services/api";

const card = "min-w-0 overflow-hidden rounded-xl border border-[#d8e9fb] bg-white shadow-[0_1px_6px_rgba(37,99,235,0.05)]";
const control = "h-8 w-full rounded-md border border-[#d3dff0] bg-white px-2.5 text-[11px] text-[#17265f] outline-none transition placeholder:text-[#8b9abd] hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-50 disabled:text-slate-500";
const th = "border border-blue-100 px-2 py-2 font-bold";
const td = "border border-blue-50 px-2 py-2";
const label = "text-[10px] font-bold text-[#17245e]";
const btn = "inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-semibold transition";
const states = ["Andhra Pradesh", "Karnataka", "Kerala", "Maharashtra", "Tamil Nadu", "Telangana", "Delhi", "Gujarat", "Rajasthan", "West Bengal"];

type FormState = {
  institutionId: string; name: string; code: string; branchType: BranchKind; main: boolean; status: BranchStatus; headName: string;
  phone: string; email: string; address: string; city: string; state: string; pinCode: string; establishmentYear: string; notes: string;
};
const empty = (institutionId = ""): FormState => ({
  institutionId, name: "", code: "", branchType: "BRANCH", main: false, status: "ACTIVE", headName: "", phone: "", email: "",
  address: "", city: "", state: "", pinCode: "", establishmentYear: "", notes: "",
});
const orNull = (v: string) => (v.trim() === "" ? null : v.trim());
const place = (b: Branch) => [b.city, b.state].filter(Boolean).join(", ") || "—";

export default function Branches() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [institutionFilter, setInstitutionFilter] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [kind, setKind] = useState("");
  const [editing, setEditing] = useState<Branch | "new" | null>(null);
  const [form, setForm] = useState<FormState>(empty());
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const [b, i] = await Promise.all([api.branches.list(), api.institutions.list({ status: "ALL" })]);
      setBranches(b);
      setInstitutions(i.filter((x) => x.status !== "ARCHIVED"));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load branches.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return branches.filter((b) =>
      (!institutionFilter || b.institutionId === Number(institutionFilter)) &&
      (!status || b.status === status) && (!kind || b.branchType === kind) &&
      (!q || [b.name, b.code, b.city, b.headName, b.institutionName].some((v) => v?.toLowerCase().includes(q))));
  }, [branches, institutionFilter, status, kind, search]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((f) => ({ ...f, [key]: value }));

  function openForm(target: Branch | "new") {
    setEditing(target);
    setNotice("");
    setError("");
    if (target === "new") {
      setForm(empty(institutionFilter));
    } else {
      setForm({
        institutionId: String(target.institutionId), name: target.name, code: target.code ?? "", branchType: target.branchType, main: target.main,
        status: target.status, headName: target.headName ?? "", phone: target.phone ?? "", email: target.email ?? "", address: target.address ?? "",
        city: target.city ?? "", state: target.state ?? "", pinCode: target.pinCode ?? "",
        establishmentYear: target.establishmentYear ? String(target.establishmentYear) : "", notes: target.notes ?? "",
      });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || !editing) return;
    if (editing === "new" && !form.institutionId) return setError("Please choose the institution this branch belongs to.");
    if (!form.name.trim()) return setError("Please enter the branch name.");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return setError("Please enter a valid email address.");
    if (form.phone && !/^[0-9]{6,15}$/.test(form.phone.trim())) return setError("Phone number must be 6-15 digits.");
    setSaving(true);
    setError("");
    const body: BranchInput = {
      institutionId: editing === "new" ? Number(form.institutionId) : undefined,
      name: form.name.trim(), code: orNull(form.code), branchType: form.branchType, main: form.main, status: form.status,
      headName: orNull(form.headName), phone: orNull(form.phone), email: orNull(form.email), address: orNull(form.address),
      city: orNull(form.city), state: orNull(form.state), pinCode: orNull(form.pinCode),
      establishmentYear: form.establishmentYear.trim() ? Number(form.establishmentYear) : null, notes: orNull(form.notes),
    };
    try {
      if (editing === "new") await api.branches.create(body);
      else await api.branches.update(editing.id, body);
      setNotice(`"${body.name}" was ${editing === "new" ? "added" : "updated"}.`);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the branch.");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSaving(false);
    }
  }

  async function remove(b: Branch) {
    setBusyId(b.id);
    setError("");
    try {
      await api.branches.remove(b.id);
      setNotice(`"${b.name}" was deleted.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the branch.");
    } finally {
      setBusyId(null);
      setConfirmId(null);
    }
  }

  const total = branches.length;
  const activeCount = branches.filter((b) => b.status === "ACTIVE").length;
  const campuses = branches.filter((b) => b.branchType === "CAMPUS").length;
  const withBranches = new Set(branches.map((b) => b.institutionId)).size;
  const kpis = [
    { label: "Total Branches & Campuses", value: total, icon: GitBranch, box: "bg-blue-50 text-blue-600" },
    { label: "Active", value: activeCount, icon: Star, box: "bg-emerald-50 text-emerald-600" },
    { label: "Campuses", value: campuses, icon: MapPin, box: "bg-orange-50 text-orange-600" },
    { label: "Institutions With Branches", value: withBranches, icon: Building2, box: "bg-purple-50 text-purple-600" },
  ];
  const editingMain = editing !== "new" && editing?.main === true;

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d8e9fb] bg-white/95 px-4 py-3 shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
          <div className="flex min-w-0 items-center gap-3">
            <GitBranch size={36} strokeWidth={2.2} className="shrink-0 text-blue-600" />
            <div className="min-w-0">
              <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.5px] text-[#111b70]">Branches & Campuses</h1>
              <p className="mt-0.5 text-[11px] leading-4 text-[#425585]">Manage the campuses and branches of each institution. Every institution has one main branch.</p>
            </div>
          </div>
          <button type="button" onClick={() => openForm("new")} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#0875fb] px-3.5 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-700"><Plus size={15} /> Add Branch</button>
        </div>

        {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] leading-5 text-rose-700"><span><span className="font-bold">Please review:</span> {error}</span><button type="button" className="ml-auto" onClick={() => setError("")} aria-label="Dismiss"><X size={14} /></button></div>}
        {notice && <div role="status" className="flex items-start gap-2 rounded-lg border border-[#d8e9fb] bg-gradient-to-r from-[#eff6ff] to-[#f8fcff] px-4 py-2.5 text-[11px] leading-5 text-blue-800"><Info size={15} className="mt-0.5 shrink-0" />{notice}<button type="button" className="ml-auto text-blue-600" onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button></div>}

        <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {kpis.map(({ label: l, value, icon: Icon, box }) => (
            <div key={l} className="flex min-w-0 items-center gap-2.5 rounded-lg border border-blue-100 bg-white p-2.5">
              <div className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl ${box}`}><Icon size={22} /></div>
              <div className="min-w-0"><p className="truncate text-[10px] text-[#25356b]">{l}</p><p className="mt-0.5 text-[20px] font-extrabold leading-tight text-[#0d195d]">{loading ? "…" : value}</p></div>
            </div>
          ))}
        </section>

        {editing && (
          <form onSubmit={submit} className={`${card} p-4`}>
            <h2 className="mb-3 text-[13px] font-bold text-[#111b69]">{editing === "new" ? "Add branch or campus" : `Edit “${editing.name}”`}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <label className={`${label} xl:col-span-2`}>Institution <span className="text-rose-500">*</span>
                <select className={`${control} mt-1 font-normal`} value={form.institutionId} disabled={editing !== "new"} onChange={(e) => set("institutionId", e.target.value)}>
                  <option value="">Select institution</option>
                  {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </label>
              <label className={`${label} xl:col-span-2`}>Branch name <span className="text-rose-500">*</span>
                <input className={`${control} mt-1 font-normal`} value={form.name} maxLength={150} onChange={(e) => set("name", e.target.value)} placeholder="E.g. Whitefield Campus" />
              </label>
              <label className={label}>Branch code <span className="font-normal text-slate-500">(Optional)</span>
                <input className={`${control} mt-1 font-normal uppercase`} value={form.code} maxLength={30} onChange={(e) => set("code", e.target.value)} placeholder="E.g. WF01" />
              </label>
              <label className={label}>Type
                <select className={`${control} mt-1 font-normal`} value={form.branchType} onChange={(e) => set("branchType", e.target.value as BranchKind)}><option value="BRANCH">Branch</option><option value="CAMPUS">Campus</option></select>
              </label>
              <label className={label}>Status
                <select className={`${control} mt-1 font-normal`} value={form.status} onChange={(e) => set("status", e.target.value as BranchStatus)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
              </label>
              <label className={label}>Established <span className="font-normal text-slate-500">(Optional)</span>
                <input type="number" className={`${control} mt-1 font-normal`} value={form.establishmentYear} min={1800} max={new Date().getFullYear()} onChange={(e) => set("establishmentYear", e.target.value)} placeholder="Year" />
              </label>
              <label className={`${label} xl:col-span-2`}>Head / Principal <span className="font-normal text-slate-500">(Optional)</span>
                <input className={`${control} mt-1 font-normal`} value={form.headName} maxLength={150} onChange={(e) => set("headName", e.target.value)} />
              </label>
              <label className={label}>Phone <span className="font-normal text-slate-500">(Optional)</span>
                <input type="tel" className={`${control} mt-1 font-normal`} value={form.phone} maxLength={15} onChange={(e) => set("phone", e.target.value)} placeholder="Digits only" />
              </label>
              <label className={label}>Email <span className="font-normal text-slate-500">(Optional)</span>
                <input type="email" className={`${control} mt-1 font-normal`} value={form.email} maxLength={200} onChange={(e) => set("email", e.target.value)} />
              </label>
              <label className={`${label} sm:col-span-2 xl:col-span-4`}>Address <span className="font-normal text-slate-500">(Optional)</span>
                <input className={`${control} mt-1 font-normal`} value={form.address} maxLength={500} onChange={(e) => set("address", e.target.value)} />
              </label>
              <label className={label}>City
                <input className={`${control} mt-1 font-normal`} value={form.city} maxLength={80} onChange={(e) => set("city", e.target.value)} />
              </label>
              <label className={label}>State
                <select className={`${control} mt-1 font-normal`} value={form.state} onChange={(e) => set("state", e.target.value)}><option value="">Select state</option>{states.map((s) => <option key={s}>{s}</option>)}</select>
              </label>
              <label className={label}>PIN code
                <input className={`${control} mt-1 font-normal`} value={form.pinCode} maxLength={12} onChange={(e) => set("pinCode", e.target.value)} />
              </label>
              <label className={`${label} flex items-end pb-1.5`}>
                <span className="flex items-center gap-2 font-normal">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={form.main} disabled={editingMain} onChange={(e) => set("main", e.target.checked)} />
                  <span className="text-[11px] text-[#17265f]">Main branch of this institution</span>
                </span>
              </label>
              <label className={`${label} sm:col-span-2 xl:col-span-4`}>Notes <span className="font-normal text-slate-500">(Optional)</span>
                <input className={`${control} mt-1 font-normal`} value={form.notes} maxLength={500} onChange={(e) => set("notes", e.target.value)} />
              </label>
            </div>
            {editingMain && <p className="mt-2 text-[9px] text-[#6678a6]">This is the main branch. To change it, open another branch and mark that one as main.</p>}
            {!editingMain && form.main && <p className="mt-2 text-[9px] text-[#6678a6]">Marking this as main will replace the institution's current main branch.</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-blue-300 bg-white px-4 py-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving && <Loader2 size={13} className="animate-spin" />}{editing === "new" ? "Add branch" : "Save changes"}</button>
            </div>
          </form>
        )}

        <section className={card}>
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-50 px-3 py-2.5">
            <div className="relative">
              <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#8b9abd]" />
              <input className={`${control} w-[240px] pl-8`} placeholder="Search branch, city, head, institution…" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select className={`${control} !w-[200px]`} value={institutionFilter} onChange={(e) => setInstitutionFilter(e.target.value)} aria-label="Filter by institution">
                <option value="">All institutions</option>
                {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <select className={`${control} !w-auto`} value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Filter by type"><option value="">All types</option><option value="CAMPUS">Campus</option><option value="BRANCH">Branch</option></select>
              <select className={`${control} !w-auto`} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status"><option value="">All statuses</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select>
            </div>
          </div>

          <div className="overflow-x-auto px-2 pb-2 pt-2">
            <table className="w-full min-w-[980px] border-collapse text-left text-[10px]">
              <thead><tr className="bg-[#f5f9ff] text-[#13205f]">{["Branch", "Institution", "Type", "Location", "Head", "Contact", "Status", "Actions"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={8} className={`${td} py-10 text-center text-[#52638f]`}><Loader2 size={16} className="mr-2 inline animate-spin" />Loading…</td></tr>
                  : visible.length === 0 ? <tr><td colSpan={8} className={`${td} py-10 text-center text-[11px] text-[#52638f]`}>{branches.length === 0 ? "No branches yet. Click “Add Branch” to create one." : "No branches match your filters."}</td></tr>
                  : visible.map((b) => (
                    <tr key={b.id} className="hover:bg-blue-50/50">
                      <td className={td}>
                        <div className="flex min-w-[170px] items-center gap-1.5">
                          <span className="text-[11px] font-bold text-[#15215e]">{b.name}</span>
                          {b.main && <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-1.5 py-0.5 text-[8px] font-semibold text-amber-700"><Star size={9} /> Main</span>}
                        </div>
                        {b.code && <p className="font-mono text-[9px] text-[#6678a6]">{b.code}</p>}
                      </td>
                      <td className={`${td} text-[#33477c]`}>{b.institutionName}</td>
                      <td className={`${td} text-[#455a8c]`}>{b.branchType === "CAMPUS" ? "Campus" : "Branch"}</td>
                      <td className={`${td} text-[#455a8c]`}>{place(b)}</td>
                      <td className={`${td} text-[#455a8c]`}>{b.headName ?? "—"}</td>
                      <td className={`${td} text-[#455a8c]`}>{b.phone ?? b.email ?? "—"}</td>
                      <td className={td}><span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-medium ${b.status === "ACTIVE" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><span className={`h-2 w-2 rounded-full ${b.status === "ACTIVE" ? "bg-emerald-500" : "bg-slate-400"}`} />{b.status === "ACTIVE" ? "Active" : "Inactive"}</span></td>
                      <td className={td}>
                        {busyId === b.id ? <Loader2 size={14} className="animate-spin text-blue-600" />
                          : confirmId === b.id ? <span className="text-[9px] text-rose-700">Delete? <button type="button" className="font-bold underline" onClick={() => remove(b)}>Yes</button> <button type="button" className="font-semibold text-[#455a8c]" onClick={() => setConfirmId(null)}>No</button></span>
                          : <div className="flex flex-wrap gap-1">
                            <button type="button" className={`${btn} bg-blue-50 text-blue-600 hover:bg-blue-100`} onClick={() => openForm(b)}><Pencil size={11} /> Edit</button>
                            <button type="button" className={`${btn} bg-rose-50 text-rose-600 hover:bg-rose-100`} onClick={() => setConfirmId(b.id)}><Trash2 size={11} /> Delete</button>
                          </div>}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <p className="border-t border-blue-50 px-3 py-2 text-[9px] text-[#6678a6]">Showing {visible.length} of {total}. The first branch you add to an institution becomes its main branch automatically.</p>
        </section>
      </div>
    </AdminLayout>
  );
}
