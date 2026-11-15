import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus } from "lucide-react";
import { api, ApiError } from "../../services/api";
import type { CommChannel, CommTemplateBody, CommTemplateRow, CommVariable } from "../../services/api";
import { DataTable, DetailCard, EmptyRow, Field, Panel, PanelTitle, PrimaryButton, RowActions, SearchBox, TableFooter, Toggle, controlClass, fmtDate, tdClass, textareaClass } from "./AcademicShared";
import { errText, useActiveInstitution } from "./SettingsShared";
import { CommFrame, categoryLabels } from "./CommunicationShared";

const channelName: Record<CommChannel, string> = { EMAIL: "Email", SMS: "SMS", PUSH: "Push" };
const categoryKeys = Object.keys(categoryLabels);

/** List + editor for the templates of one channel. Also used inside the SMS and Push pages. */
export function TemplatesPanel({ channel, institutionId, onError, onNotice }: { channel: CommChannel; institutionId: number | null; onError: (m: string) => void; onNotice: (m: string) => void }) {
  const [rows, setRows] = useState<CommTemplateRow[]>([]);
  const [variables, setVariables] = useState<CommVariable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const blank = useCallback((): CommTemplateBody => ({ channel, name: "", category: "GENERAL", title: channel === "SMS" ? null : "", body: "", active: true }), [channel]);
  const [form, setForm] = useState<CommTemplateBody>(blank);
  const [editId, setEditId] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [status, setStatus] = useState("All");

  const load = useCallback(async () => {
    if (institutionId === null) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [list, vars] = await Promise.all([api.communication.templates.list(channel), api.communication.variables()]);
      setRows(list); setVariables(vars); onError("");
    } catch (e) { onError(errText(e)); } finally { setLoading(false); }
  }, [channel, institutionId, onError]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setEditId(null); setForm(blank()); setFieldErrors({}); }, [blank]);

  const set = <K extends keyof CommTemplateBody>(k: K, v: CommTemplateBody[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setFieldErrors((e) => { if (!(k in e)) return e; const n = { ...e }; delete n[k]; return n; });
    onError(""); onNotice("");
  };
  const startNew = () => { setEditId(null); setForm(blank()); setFieldErrors({}); onError(""); };
  const startEdit = (t: CommTemplateRow) => { setEditId(t.id); setForm({ channel: t.channel, name: t.name, category: t.category, title: t.title, body: t.body, active: t.active }); setFieldErrors({}); onError(""); };

  async function save() {
    setSaving(true);
    try {
      const saved = editId === null ? await api.communication.templates.create(form) : await api.communication.templates.update(editId, form);
      setRows(await api.communication.templates.list(channel)); onNotice(`${saved.name} saved.`); onError("");
      if (editId === null) startNew(); else startEdit(saved);
    } catch (e) {
      if (e instanceof ApiError) setFieldErrors(e.fieldErrors);
      onError(errText(e));
    } finally { setSaving(false); }
  }
  async function toggle(t: CommTemplateRow) {
    try { await api.communication.templates.update(t.id, { channel: t.channel, name: t.name, category: t.category, title: t.title, body: t.body, active: !t.active }); setRows(await api.communication.templates.list(channel)); }
    catch (e) { onError(errText(e)); }
  }
  async function remove(t: CommTemplateRow) {
    if (!window.confirm(`Delete template ${t.name}?`)) return;
    try { await api.communication.templates.remove(t.id); setRows(await api.communication.templates.list(channel)); onNotice(`${t.name} deleted.`); if (editId === t.id) startNew(); }
    catch (e) { onError(errText(e)); }
  }

  const visible = useMemo(() => rows.filter((t) =>
    (t.name.toLowerCase().includes(query.toLowerCase()) || t.body.toLowerCase().includes(query.toLowerCase())) &&
    (category === "All" || t.category === category) && (status === "All" || (status === "Active" ? t.active : !t.active))), [rows, query, category, status]);

  const hasTitle = channel !== "SMS";
  const titleLabel = channel === "EMAIL" ? "Subject" : "Title";
  const max = channel === "SMS" ? 640 : 2000;
  const heads = hasTitle ? ["#", "Template Name", "Category", titleLabel, "Message", "Status", "Last Modified", "Actions"] : ["#", "Template Name", "Category", "Message", "Status", "Last Modified", "Actions"];
  const FE = ({ k }: { k: string }) => (fieldErrors[k] ? <div className="mt-0.5 text-[9px] font-semibold text-rose-600">{fieldErrors[k]}</div> : null);
  const cut = (s: string, n: number) => (s.length > n ? `${s.slice(0, n)}…` : s);

  return (
    <>
      <Panel>
        <PanelTitle title={`${channelName[channel]} Templates`} right={<PrimaryButton type="button" onClick={startNew}><Plus size={14} /> Add Template</PrimaryButton>} />
        <div className="px-4 pb-4">
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <SearchBox value={query} onChange={setQuery} placeholder="Search templates..." />
            <Field label="Category" className="w-[170px]">
              <select className={controlClass} value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="All">All Categories</option>{categoryKeys.map((k) => <option key={k} value={k}>{categoryLabels[k]}</option>)}
              </select>
            </Field>
            <Field label="Status" className="w-[120px]">
              <select className={controlClass} value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option><option>Active</option><option>Inactive</option></select>
            </Field>
          </div>
          <DataTable heads={heads} min={hasTitle ? 900 : 780}>
            {loading && <EmptyRow cols={heads.length} text="Loading templates..." />}
            {!loading && visible.length === 0 && <EmptyRow cols={heads.length} text={rows.length === 0 ? "No templates yet." : "No templates match your filters."} />}
            {!loading && visible.map((t, i) => (
              <tr key={t.id} className={`hover:bg-blue-50/50 ${editId === t.id ? "bg-blue-50/60" : ""}`}>
                <td className={tdClass}>{i + 1}</td>
                <td className={`${tdClass} font-semibold text-[#17245e]`}>{t.name}</td>
                <td className={tdClass}>{categoryLabels[t.category] ?? t.category}</td>
                {hasTitle && <td className={tdClass}>{cut(t.title ?? "", 36)}</td>}
                <td className={tdClass}>{cut(t.body.replace(/\s+/g, " "), 60)}</td>
                <td className={tdClass}><Toggle checked={t.active} onChange={() => void toggle(t)} label="" /></td>
                <td className={tdClass}>{fmtDate(t.updatedAt.slice(0, 10))}</td>
                <td className={tdClass}><RowActions name={t.name} onEdit={() => startEdit(t)} onDelete={() => void remove(t)} /></td>
              </tr>
            ))}
          </DataTable>
          <TableFooter shown={visible.length} total={rows.length} />
        </div>
      </Panel>

      <DetailCard title={editId === null ? "Create Template" : "Edit Template"} saving={saving} onCancel={() => { const t = rows.find((x) => x.id === editId); if (t) startEdit(t); else startNew(); }} onSave={() => void save()} saveLabel="Save Template">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Template Name" required><input className={controlClass} value={form.name} maxLength={100} onChange={(e) => set("name", e.target.value)} /><FE k="name" /></Field>
          <Field label="Category" required>
            <select className={controlClass} value={form.category} onChange={(e) => set("category", e.target.value)}>{categoryKeys.map((k) => <option key={k} value={k}>{categoryLabels[k]}</option>)}</select><FE k="category" />
          </Field>
          {hasTitle && <Field label={titleLabel} required className="sm:col-span-2"><input className={controlClass} value={form.title ?? ""} maxLength={150} onChange={(e) => set("title", e.target.value)} /><FE k="title" /></Field>}
          <Field label="Message" required className="sm:col-span-2">
            <textarea className={`${textareaClass} min-h-[110px]`} value={form.body} maxLength={max} onChange={(e) => set("body", e.target.value)} />
            <div className="mt-0.5 flex justify-between text-[9px] text-slate-400"><FE k="body" /><span>{form.body.length}/{max}</span></div>
          </Field>
        </div>
        <div className="mt-2">
          <div className="mb-1 text-[10px] font-bold text-[#17245e]">Insert variable</div>
          <div className="flex flex-wrap gap-1.5">
            {variables.map((v) => (
              <button key={v.name} type="button" title={v.description} onClick={() => set("body", `${form.body}${form.body && !form.body.endsWith(" ") ? " " : ""}${v.name}`)}
                className="rounded-full border border-[#cfe0f5] bg-white px-2 py-0.5 text-[10px] font-semibold text-[#34467a] hover:border-blue-300 hover:bg-blue-50">{v.name}</button>
            ))}
          </div>
        </div>
        <div className="mt-3"><Toggle checked={form.active} onChange={(v) => set("active", v)} /></div>
      </DetailCard>
    </>
  );
}

const tabs = [
  { key: "email", label: "Email Templates" }, { key: "sms", label: "SMS Templates" }, { key: "push", label: "Push Templates" }, { key: "variables", label: "Template Variables" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

export default function MessageTemplates() {
  const inst = useActiveInstitution();
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "email") as TabKey;
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [variables, setVariables] = useState<CommVariable[]>([]);

  useEffect(() => {
    if (tab !== "variables" || inst.institutionId === null) return;
    api.communication.variables().then(setVariables).catch((e) => setError(errText(e)));
  }, [tab, inst.institutionId]);

  const channel: CommChannel | null = tab === "email" ? "EMAIL" : tab === "sms" ? "SMS" : tab === "push" ? "PUSH" : null;

  return (
    <CommFrame step={4} title="Templates" subtitle="Manage communication templates for different scenarios." crumb="Templates" nav="templates" inst={inst}
      tabs={tabs} tab={tab} onTab={(k) => { setParams({ tab: k }); setError(""); setNotice(""); }} error={error} notice={notice}>
      {channel && inst.institutionId !== null && <TemplatesPanel key={channel} channel={channel} institutionId={inst.institutionId} onError={setError} onNotice={setNotice} />}
      {tab === "variables" && (
        <Panel>
          <PanelTitle title="Template Variables" />
          <div className="px-4 pb-4">
            <p className="mb-2 text-[10px] text-slate-500">Type these placeholders in a template. They are replaced with real values when a message is sent.</p>
            <DataTable heads={["Variable", "Description"]} min={420}>
              {variables.length === 0 && <EmptyRow cols={2} text="No variables." />}
              {variables.map((v) => <tr key={v.name}><td className={`${tdClass} font-mono font-semibold text-[#17245e]`}>{v.name}</td><td className={tdClass}>{v.description}</td></tr>)}
            </DataTable>
          </div>
        </Panel>
      )}
    </CommFrame>
  );
}
