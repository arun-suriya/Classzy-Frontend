import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Plus } from "lucide-react";
import { api, ApiError } from "../../services/api";
import type { CatalogItem, CatalogKind } from "../../services/api";
import { DataTable, DetailCard, EmptyRow, Field, Panel, PanelTitle, PrimaryButton, RowActions, SearchBox, TableFooter, Toggle, controlClass, tdClass, textareaClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { Err, Pill } from "./TransportShared";

export type Opts = readonly (readonly [string, string])[];
export type FieldDef = {
  key: string; label: string; type: "text" | "area" | "number" | "money" | "select" | "bool" | "color" | "url" | "secret";
  options?: Opts | ((items: CatalogItem[], editId: number | null) => Opts);
  required?: boolean; optional?: boolean; placeholder?: string; def?: string; min?: number; max?: number; wide?: boolean;
};
export type Column = { head: string; render: (it: CatalogItem, all: CatalogItem[]) => ReactNode };

type Props = {
  kind: CatalogKind; institutionId: number | null; title: string; singular: string; addLabel?: string; searchPlaceholder?: string;
  nameLabel?: string; nameOptions?: Opts; code?: { label: string; required?: boolean; placeholder?: string; hint?: string } | null;
  fields: FieldDef[]; columns: Column[]; showStatus?: boolean; minWidth?: number; canDelete?: boolean;
  rowExtra?: (it: CatalogItem, reload: () => Promise<void>) => ReactNode; extraHead?: string;
  onError: (m: string) => void; onNotice: (m: string) => void; aside?: ReactNode;
  prefill?: { key: number; name: string; attrs: Record<string, string> } | null;
};

type Form = { name: string; code: string; active: boolean; attrs: Record<string, string> };

export function CatalogPanel(p: Props) {
  const { kind, institutionId, onError, onNotice } = p;
  const [rows, setRows] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(institutionId !== null);
  const [query, setQuery] = useState("");
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const blank = useCallback((): Form => ({
    name: p.nameOptions ? "" : "", code: "", active: true,
    attrs: Object.fromEntries(p.fields.filter((f) => f.def !== undefined).map((f) => [f.key, f.def as string])),
  }), [p.fields, p.nameOptions]);
  const [form, setForm] = useState<Form>(blank);

  const load = useCallback(async () => {
    if (institutionId === null) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try { setRows(await api.catalog.list(kind)); } catch (e) { onError(errText(e)); } finally { setLoading(false); }
  }, [kind, institutionId, onError]);
  useEffect(() => { void load(); }, [load]);

  const prefillKey = p.prefill?.key;
  useEffect(() => {
    if (!p.prefill) return;
    const pre = p.prefill;
    setEditId(null); setErrors({});
    setForm({ ...blank(), name: pre.name, attrs: { ...blank().attrs, ...pre.attrs } });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillKey]);

  function startNew() { setEditId(null); setForm(blank()); setErrors({}); }
  function startEdit(it: CatalogItem) {
    setEditId(it.id); setErrors({});
    setForm({ name: it.name, code: it.code ?? "", active: it.active, attrs: { ...blank().attrs, ...it.attrs } });
  }
  const setAttr = (k: string, v: string) => { setForm((f) => ({ ...f, attrs: { ...f.attrs, [k]: v } })); setErrors((e) => { const n = { ...e }; delete n[k]; return n; }); };

  async function save() {
    setSaving(true);
    try {
      const body = { name: form.name.trim(), code: form.code.trim() || null, active: form.active, attrs: Object.fromEntries(Object.entries(form.attrs).filter(([, v]) => v !== "")) };
      const saved = editId === null ? await api.catalog.create(kind, body) : await api.catalog.update(kind, editId, body);
      await load(); onNotice(`${p.singular} "${saved.name}" saved.`); onError("");
      if (editId === null) startNew(); else startEdit(saved);
    } catch (e) { if (e instanceof ApiError) setErrors(e.fieldErrors); onError(errText(e)); } finally { setSaving(false); }
  }
  async function remove(it: CatalogItem) {
    if (!window.confirm(`Delete ${p.singular.toLowerCase()} "${it.name}"?`)) return;
    try { await api.catalog.remove(kind, it.id); await load(); onNotice(`${p.singular} "${it.name}" deleted.`); if (editId === it.id) startNew(); } catch (e) { onError(errText(e)); }
  }

  const visible = useMemo(() => rows.filter((r) => `${r.name} ${r.code ?? ""}`.toLowerCase().includes(query.toLowerCase())), [rows, query]);
  const showStatus = p.showStatus ?? true;
  const heads = ["#", p.nameLabel ?? "Name", ...(p.code ? [p.code.label] : []), ...p.columns.map((c) => c.head), ...(showStatus ? ["Status"] : []), ...(p.extraHead ? [p.extraHead] : []), "Actions"];
  const free = p.nameOptions ? p.nameOptions.filter(([v]) => !rows.some((r) => r.name === v && r.id !== editId)) : null;

  function control(f: FieldDef) {
    const v = form.attrs[f.key] ?? "";
    if (f.type === "area") return <textarea className={textareaClass} value={v} maxLength={f.max} placeholder={f.placeholder} onChange={(e) => setAttr(f.key, e.target.value)} />;
    if (f.type === "bool") return <div className="pt-1.5"><Toggle checked={v === "true"} onChange={(x) => setAttr(f.key, String(x))} /></div>;
    if (f.type === "select") {
      const opts = typeof f.options === "function" ? f.options(rows, editId) : (f.options ?? []);
      return <select className={controlClass} value={v} onChange={(e) => setAttr(f.key, e.target.value)}>{!f.required && <option value="">—</option>}{opts.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>;
    }
    if (f.type === "color") {
      return (
        <div className="flex items-center gap-2">
          <input type="color" aria-label={f.label} className="h-8 w-10 cursor-pointer rounded border border-[#cfe0f5] bg-white p-0.5" value={/^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000"} onChange={(e) => setAttr(f.key, e.target.value.toUpperCase())} />
          <input className={controlClass} value={v} maxLength={7} onChange={(e) => setAttr(f.key, e.target.value)} />
        </div>
      );
    }
    const type = f.type === "number" || f.type === "money" ? "number" : f.type === "secret" ? "password" : f.type === "url" ? "url" : "text";
    return <input className={controlClass} type={type} value={v} min={f.min} max={f.max} step={f.type === "money" ? "0.01" : undefined} placeholder={f.placeholder} maxLength={type === "text" ? f.max : undefined}
      autoComplete={f.type === "secret" ? "new-password" : undefined} onChange={(e) => setAttr(f.key, e.target.value)} />;
  }

  return (
    <>
      <Panel>
        <PanelTitle title={p.title} right={<PrimaryButton type="button" onClick={startNew}><Plus size={14} /> {p.addLabel ?? `Add ${p.singular}`}</PrimaryButton>} />
        <div className="px-4 pb-4">
          {p.aside}
          <div className="mb-3 flex flex-wrap items-end gap-3"><SearchBox value={query} onChange={setQuery} placeholder={p.searchPlaceholder ?? `Search ${p.singular.toLowerCase()}s...`} /></div>
          <DataTable heads={heads} min={p.minWidth ?? 760}>
            {loading ? <EmptyRow cols={heads.length} text="Loading..." /> : visible.length === 0 ? <EmptyRow cols={heads.length} text={institutionId === null ? "Choose an institution." : `No ${p.singular.toLowerCase()}s yet.`} /> : visible.map((it, i) => (
              <tr key={it.id} className={editId === it.id ? "bg-blue-50/60" : ""}>
                <td className={tdClass}>{i + 1}</td>
                <td className={`${tdClass} font-semibold text-[#17245e]`}>{it.name}</td>
                {p.code && <td className={tdClass}>{it.code ?? "—"}</td>}
                {p.columns.map((c) => <td key={c.head} className={tdClass}>{c.render(it, rows)}</td>)}
                {showStatus && <td className={tdClass}><Pill tone={it.active ? "green" : "gray"}>{it.active ? "Active" : "Inactive"}</Pill></td>}
                {p.extraHead && <td className={tdClass}>{p.rowExtra?.(it, load)}</td>}
                <td className={tdClass}>{p.canDelete === false
                  ? <button type="button" className="text-[10px] font-semibold text-blue-600 hover:underline" onClick={() => startEdit(it)}>Edit</button>
                  : <RowActions name={it.name} onEdit={() => startEdit(it)} onDelete={() => void remove(it)} />}</td>
              </tr>
            ))}
          </DataTable>
          <TableFooter shown={visible.length} total={rows.length} />
        </div>
      </Panel>

      <DetailCard title={editId === null ? `New ${p.singular}` : `${p.singular} Details`} saving={saving} saveLabel={`Save ${p.singular}`}
        onCancel={() => { const it = rows.find((x) => x.id === editId); if (it) startEdit(it); else startNew(); }} onSave={() => void save()}>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={p.nameLabel ?? "Name"} required>
            {free ? (
              <select className={controlClass} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}>
                <option value="">Select</option>{(editId === null ? free : p.nameOptions!).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
            ) : <input className={controlClass} value={form.name} maxLength={100} onChange={(e) => setForm({ ...form, name: e.target.value })} />}
            <Err errors={errors} k="name" />
          </Field>
          {p.code && (
            <Field label={p.code.label} required={p.code.required} optional={!p.code.required}>
              <input className={controlClass} value={form.code} maxLength={40} placeholder={p.code.placeholder} onChange={(e) => setForm({ ...form, code: e.target.value })} />
              {p.code.hint && <div className="mt-0.5 text-[9px] text-slate-500">{p.code.hint}</div>}
              <Err errors={errors} k="code" />
            </Field>
          )}
          {p.fields.map((f) => (
            <Field key={f.key} label={f.label} required={f.required} optional={f.optional} className={f.wide ? "sm:col-span-2 lg:col-span-3" : ""}>
              {control(f)}
              <Err errors={errors} k={f.key} />
            </Field>
          ))}
          {showStatus && <Field label="Active"><div className="pt-1.5"><Toggle checked={form.active} onChange={(v) => setForm({ ...form, active: v })} /></div></Field>}
        </div>
      </DetailCard>
    </>
  );
}
