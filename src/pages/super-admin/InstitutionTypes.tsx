import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, CheckCircle2, Info, Layers, Loader2, Lock, Pencil, Plus, Power, Trash2, X } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api, type InstitutionTypeRow } from "../../services/api";

const card = "min-w-0 overflow-hidden rounded-xl border border-[#d8e9fb] bg-white shadow-[0_1px_6px_rgba(37,99,235,0.05)]";
const control = "h-8 w-full rounded-md border border-[#d3dff0] bg-white px-2.5 text-[11px] text-[#17265f] outline-none transition placeholder:text-[#8b9abd] hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const th = "border border-blue-100 px-2 py-2 font-bold";
const td = "border border-blue-50 px-2 py-2";
const btn = "inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-semibold transition disabled:cursor-not-allowed disabled:opacity-40";

export default function InstitutionTypes() {
  const [rows, setRows] = useState<InstitutionTypeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<InstitutionTypeRow | "new" | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await api.institutionTypes.list());
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load institution types.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function openForm(target: InstitutionTypeRow | "new") {
    setEditing(target);
    setName(target === "new" ? "" : target.name);
    setDescription(target === "new" ? "" : target.description ?? "");
    setNotice("");
    setError("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || !editing) return;
    if (!name.trim()) return setError("Please enter a type name.");
    setSaving(true);
    setError("");
    try {
      const body = { name: name.trim(), description: description.trim() || null };
      if (editing === "new") await api.institutionTypes.create(body);
      else await api.institutionTypes.update(editing.id, { ...body, active: editing.active });
      setNotice(`"${body.name}" was ${editing === "new" ? "added" : "updated"}.`);
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the type.");
    } finally {
      setSaving(false);
    }
  }

  async function run(row: InstitutionTypeRow, work: () => Promise<unknown>, success: string) {
    setBusyId(row.id);
    setError("");
    setNotice("");
    try {
      await work();
      setNotice(success);
      setConfirmId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "That action failed.");
      setConfirmId(null);
    } finally {
      setBusyId(null);
    }
  }

  const active = rows.filter((r) => r.active).length;
  const using = rows.reduce((n, r) => n + r.institutionCount, 0);
  const kpis = [
    { label: "Total Types", value: rows.length, icon: Layers, box: "bg-blue-50 text-blue-600" },
    { label: "Active Types", value: active, icon: CheckCircle2, box: "bg-emerald-50 text-emerald-600" },
    { label: "Institutions Using Types", value: using, icon: Building2, box: "bg-purple-50 text-purple-600" },
  ];

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d8e9fb] bg-white/95 px-4 py-3 shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
          <div className="flex min-w-0 items-center gap-3">
            <Layers size={36} strokeWidth={2.2} className="shrink-0 text-blue-600" />
            <div className="min-w-0">
              <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.5px] text-[#111b70]">Institution Types</h1>
              <p className="mt-0.5 text-[11px] leading-4 text-[#425585]">The kinds of institutions you onboard. Active types appear in the Add Institution form.</p>
            </div>
          </div>
          <button type="button" onClick={() => openForm("new")} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#0875fb] px-3.5 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-700"><Plus size={15} /> Add Type</button>
        </div>

        {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] leading-5 text-rose-700"><span><span className="font-bold">Please review:</span> {error}</span><button type="button" className="ml-auto" onClick={() => setError("")} aria-label="Dismiss"><X size={14} /></button></div>}
        {notice && <div role="status" className="flex items-start gap-2 rounded-lg border border-[#d8e9fb] bg-gradient-to-r from-[#eff6ff] to-[#f8fcff] px-4 py-2.5 text-[11px] leading-5 text-blue-800"><Info size={15} className="mt-0.5 shrink-0" />{notice}<button type="button" className="ml-auto text-blue-600" onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button></div>}

        <section className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {kpis.map(({ label, value, icon: Icon, box }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-lg border border-blue-100 bg-white p-2.5">
              <div className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl ${box}`}><Icon size={22} /></div>
              <div><p className="text-[10px] text-[#25356b]">{label}</p><p className="mt-0.5 text-[20px] font-extrabold leading-tight text-[#0d195d]">{loading ? "…" : value}</p></div>
            </div>
          ))}
        </section>

        {editing && (
          <form onSubmit={submit} className={`${card} p-4`}>
            <h2 className="mb-3 text-[13px] font-bold text-[#111b69]">{editing === "new" ? "Add institution type" : `Edit “${editing.name}”`}</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
              <label className="text-[10px] font-bold text-[#17245e]">Type name <span className="text-rose-500">*</span>
                <input className={`${control} mt-1 font-normal`} value={name} maxLength={80} autoFocus onChange={(e) => setName(e.target.value)} placeholder="E.g. Play School" />
              </label>
              <label className="text-[10px] font-bold text-[#17245e]">Description <span className="font-normal text-slate-500">(Optional)</span>
                <input className={`${control} mt-1 font-normal`} value={description} maxLength={300} onChange={(e) => setDescription(e.target.value)} placeholder="Who is this type for?" />
              </label>
            </div>
            {editing !== "new" && <p className="mt-2 text-[9px] text-[#6678a6]">Code <span className="font-semibold">{editing.code}</span> stays the same when you rename a type.</p>}
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-md border border-blue-300 bg-white px-4 py-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving && <Loader2 size={13} className="animate-spin" />}{editing === "new" ? "Add type" : "Save changes"}</button>
            </div>
          </form>
        )}

        <section className={card}>
          <div className="overflow-x-auto px-2 pb-2 pt-2">
            <table className="w-full min-w-[760px] border-collapse text-left text-[10px]">
              <thead><tr className="bg-[#f5f9ff] text-[#13205f]">{["Type", "Code", "Description", "Institutions", "Status", "Actions"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={6} className={`${td} py-10 text-center text-[#52638f]`}><Loader2 size={16} className="mr-2 inline animate-spin" />Loading…</td></tr>
                  : rows.length === 0 ? <tr><td colSpan={6} className={`${td} py-10 text-center text-[#52638f]`}>No types yet.</td></tr>
                  : rows.map((r) => {
                    const busy = busyId === r.id;
                    return <tr key={r.id} className="hover:bg-blue-50/50">
                      <td className={td}>
                        <span className="text-[11px] font-bold text-[#15215e]">{r.name}</span>
                        {r.systemType && <span title="Built-in type" className="ml-2 inline-flex items-center gap-0.5 rounded bg-slate-100 px-1.5 py-0.5 text-[8px] font-semibold text-slate-500"><Lock size={9} /> Built-in</span>}
                      </td>
                      <td className={`${td} font-mono text-[9px] text-[#52638f]`}>{r.code}</td>
                      <td className={`${td} max-w-[280px] text-[#455a8c]`}>{r.description ?? "—"}</td>
                      <td className={`${td} text-[#273a77]`}>{r.institutionCount}</td>
                      <td className={td}><span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-medium ${r.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"}`}><span className={`h-2 w-2 rounded-full ${r.active ? "bg-emerald-500" : "bg-slate-400"}`} />{r.active ? "Active" : "Inactive"}</span></td>
                      <td className={td}>
                        {busy ? <Loader2 size={14} className="animate-spin text-blue-600" />
                          : confirmId === r.id ? (
                            <span className="text-[9px] text-rose-700">Delete this type? <button type="button" className="font-bold underline" onClick={() => run(r, () => api.institutionTypes.remove(r.id), `"${r.name}" was deleted.`)}>Yes</button> <button type="button" className="font-semibold text-[#455a8c]" onClick={() => setConfirmId(null)}>No</button></span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              <button type="button" className={`${btn} bg-blue-50 text-blue-600 hover:bg-blue-100`} onClick={() => openForm(r)}><Pencil size={11} /> Edit</button>
                              <button type="button" className={`${btn} bg-slate-100 text-slate-600 hover:bg-slate-200`} disabled={r.code === "OTHER" && r.active}
                                title={r.code === "OTHER" ? "The Other type is the fallback and stays active" : undefined}
                                onClick={() => run(r, () => api.institutionTypes.update(r.id, { name: r.name, description: r.description, active: !r.active }), `"${r.name}" is now ${r.active ? "inactive" : "active"}.`)}><Power size={11} /> {r.active ? "Deactivate" : "Activate"}</button>
                              <button type="button" className={`${btn} bg-rose-50 text-rose-600 hover:bg-rose-100`} disabled={r.systemType || r.institutionCount > 0}
                                title={r.systemType ? "Built-in types can't be deleted" : r.institutionCount > 0 ? "In use. Deactivate it instead" : undefined}
                                onClick={() => setConfirmId(r.id)}><Trash2 size={11} /> Delete</button>
                            </div>
                          )}
                      </td>
                    </tr>;
                  })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-blue-50 px-3 py-2 text-[9px] text-[#6678a6]">Built-in types and types that institutions use can't be deleted. Deactivate a type to hide it from new institutions; existing ones keep it.</p>
        </section>
      </div>
    </AdminLayout>
  );
}
