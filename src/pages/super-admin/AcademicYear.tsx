import { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { AcademicYear as Year, AcademicYearInput } from "../../services/api";
import {
  AcademicHeader, AcademicTabs, Breadcrumb, DataTable, DetailCard, EmptyRow, Field, Notice, Panel,
  PrimaryButton, RowActions, SearchBox, StatusPill, TableFooter, Toggle, controlClass, fmtDate, tdClass, textareaClass,
} from "./AcademicShared";
import { ContextBar, errText, useActiveInstitution } from "./SettingsShared";

const blank: AcademicYearInput = { name: "", shortName: "", startDate: "", endDate: "", current: false, active: true, description: "" };

export default function AcademicYear() {
  const inst = useActiveInstitution();
  const institutionId = inst.institutionId;
  const [years, setYears] = useState<Year[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<AcademicYearInput>(blank);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);

  const toForm = (y: Year): AcademicYearInput => ({
    name: y.name, shortName: y.shortName ?? "", startDate: y.startDate, endDate: y.endDate,
    current: y.current, active: y.active, description: y.description ?? "",
  });

  const load = useCallback(async (select?: number | "keep") => {
    if (institutionId === null) { setYears([]); setLoading(false); return; }
    setLoading(true);
    try {
      const list = await api.years.list();
      setYears(list);
      setError("");
      setEditingId((prev) => {
        const target = select === undefined || select === "keep" ? prev : select;
        const found = list.find((y) => y.id === target) ?? (select === undefined ? list.find((y) => y.current) ?? list[0] : undefined);
        setForm(found ? toForm(found) : { ...blank });
        return found ? found.id : null;
      });
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }, [institutionId]);

  useEffect(() => { void load(); }, [load]);

  const visible = useMemo(
    () => years.filter((y) =>
      y.name.toLowerCase().includes(query.toLowerCase()) &&
      (statusFilter === "All" || (statusFilter === "Active" ? y.active : !y.active))),
    [years, query, statusFilter],
  );

  const set = <K extends keyof AcademicYearInput>(k: K, v: AcademicYearInput[K]) => { setForm((f) => ({ ...f, [k]: v })); setError(""); setNotice(""); };

  function startNew() { setEditingId(null); setForm({ ...blank }); setError(""); setNotice(""); }
  function edit(y: Year) { setEditingId(y.id); setForm(toForm(y)); setError(""); setNotice(""); }

  async function remove(y: Year) {
    if (y.current) { setError("The current academic year can't be deleted. Mark another year as current first."); return; }
    if (!window.confirm(`Delete academic year ${y.name}?`)) return;
    try {
      await api.years.remove(y.id);
      setNotice(`Academic year ${y.name} deleted.`);
      await load(editingId === y.id ? undefined : "keep");
      if (editingId === y.id) startNew();
    } catch (e) { setError(errText(e)); }
  }

  async function save() {
    if (!form.name.trim() || !form.startDate || !form.endDate) { setError("Please complete Year Name, Start Date and End Date."); return; }
    if (form.endDate <= form.startDate) { setError("End Date must be after the Start Date."); return; }
    setSaving(true);
    try {
      const body: AcademicYearInput = {
        ...form, name: form.name.trim(),
        shortName: form.shortName?.trim() || null, description: form.description?.trim() || null,
      };
      const saved = editingId === null ? await api.years.create(body) : await api.years.update(editingId, body);
      setNotice(`Academic year ${saved.name} saved.`);
      setError("");
      await load(saved.id);
    } catch (e) {
      setError(errText(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={1} title="Academic Year" subtitle="Create and manage academic years for the institution." right={<ContextBar inst={inst} />} />
        <Breadcrumb trail={["Institutions", "Institution Settings", "Academic Settings", "Academic Year"]} />
        <AcademicTabs active="year" />

        {error && <Notice tone="error"><span className="font-bold">Please review:</span> {error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {institutionId === null && <Notice tone="info">{inst.isSuper ? "Create an institution first, then choose it above." : "Your account isn't linked to an institution."}</Notice>}

        <Panel className="p-4">
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <div className="flex min-w-0 flex-1 flex-wrap items-end gap-3">
              <SearchBox value={query} onChange={setQuery} placeholder="Search academic years..." />
              <Field label="Status" className="w-[140px]">
                <select className={controlClass} value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option>All</option><option>Active</option><option>Inactive</option>
                </select>
              </Field>
            </div>
            <PrimaryButton type="button" onClick={startNew} disabled={institutionId === null}><Plus size={14} /> Add Academic Year</PrimaryButton>
          </div>

          <DataTable heads={["#", "Year Name", "Start Date", "End Date", "Current Year", "Status", "Actions"]} min={600}>
            {loading && <EmptyRow cols={7} text="Loading academic years..." />}
            {!loading && visible.length === 0 && <EmptyRow cols={7} text={years.length === 0 ? "No academic years yet. Add the first one below." : "No academic years match your search."} />}
            {!loading && visible.map((y, i) => (
              <tr key={y.id} className={`hover:bg-blue-50/50 ${editingId === y.id ? "bg-blue-50/60" : ""}`}>
                <td className={tdClass}>{i + 1}</td>
                <td className={`${tdClass} font-semibold text-[#17245e]`}>{y.name}</td>
                <td className={tdClass}>{fmtDate(y.startDate)}</td>
                <td className={tdClass}>{fmtDate(y.endDate)}</td>
                <td className={tdClass}>{y.current ? <StatusPill status="Current" /> : <span className="text-slate-400">—</span>}</td>
                <td className={tdClass}><StatusPill status={y.active ? "Active" : "Inactive"} /></td>
                <td className={tdClass}><RowActions name={y.name} onEdit={() => edit(y)} onDelete={() => void remove(y)} /></td>
              </tr>
            ))}
          </DataTable>
          <TableFooter shown={visible.length} total={years.length} />
        </Panel>

        <DetailCard
          title={editingId === null ? "New Academic Year" : "Academic Year Details"}
          saving={saving}
          onCancel={() => { const y = years.find((x) => x.id === editingId); if (y) edit(y); else startNew(); }}
          onSave={() => void save()}
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Year Name" required><input className={controlClass} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. 2026 - 2027" /></Field>
            <Field label="Start Date" required><input type="date" className={controlClass} value={form.startDate} onChange={(e) => set("startDate", e.target.value)} /></Field>
            <Field label="End Date" required><input type="date" className={controlClass} value={form.endDate} min={form.startDate} onChange={(e) => set("endDate", e.target.value)} /></Field>
            <Field label="Status">
              <div className="flex h-8 items-center gap-5">
                <Toggle checked={form.active} onChange={(v) => set("active", v)} />
                <label className="flex items-center gap-1.5 text-[10px] text-[#344477]">
                  <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={form.current} onChange={(e) => set("current", e.target.checked)} /> Set as current year
                </label>
              </div>
            </Field>
            <Field label="Short Name"><input className={controlClass} value={form.shortName ?? ""} onChange={(e) => set("shortName", e.target.value)} placeholder="e.g. AY2026" /></Field>
            <Field label="Description" className="sm:col-span-1 lg:col-span-3">
              <textarea className={textareaClass} value={form.description ?? ""} onChange={(e) => set("description", e.target.value)} placeholder="Short description (optional)" />
            </Field>
          </div>
        </DetailCard>

        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400"><CalendarDays size={10} className="mr-1 inline" />© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
