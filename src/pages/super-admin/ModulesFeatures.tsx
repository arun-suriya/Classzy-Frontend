import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Building2, BookOpen, Bus, CalendarCheck, Check, Cog, Search, FileText, GraduationCap, Heart, IndianRupee, Layers, Megaphone, MoreVertical, Puzzle, SlidersHorizontal, User, Users, UsersRound, X } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { ModuleAccessRow, ModuleAuditItem, ModuleDetail, ModuleRow, ModulesOverview, ModuleUsage } from "../../services/api";
import { DataTable, EmptyRow, Field, Notice, OutlineButton, Panel, PrimaryButton, Toggle, controlClass, tdClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { UsersHeader } from "./UserShared";

const icons: Record<string, ReactNode> = {
  users: <Users size={15} />, user: <User size={15} />, "users-round": <UsersRound size={15} />, "graduation-cap": <GraduationCap size={15} />,
  "file-text": <FileText size={15} />, "calendar-check": <CalendarCheck size={15} />, "indian-rupee": <IndianRupee size={15} />, "book-open": <BookOpen size={15} />,
  bus: <Bus size={15} />, building: <Building2 size={15} />, heart: <Heart size={15} />, megaphone: <Megaphone size={15} />,
};
const iconBox: Record<string, string> = {
  CORE: "bg-blue-50 text-blue-600", ACADEMIC: "bg-violet-50 text-violet-600", FINANCE: "bg-emerald-50 text-emerald-600",
  ADMINISTRATION: "bg-orange-50 text-orange-600", COMMUNICATION: "bg-cyan-50 text-cyan-600", INTEGRATION: "bg-pink-50 text-pink-600", REPORTS: "bg-amber-50 text-amber-600",
};
const catLabel: Record<string, string> = { CORE: "Core", ACADEMIC: "Academic", ADMINISTRATION: "Administration", COMMUNICATION: "Communication", FINANCE: "Finance", INTEGRATION: "Integration", REPORTS: "Reports & Analytics" };
const catPill: Record<string, string> = {
  CORE: "bg-blue-50 text-blue-700", ACADEMIC: "bg-violet-50 text-violet-700", FINANCE: "bg-emerald-50 text-emerald-700",
  ADMINISTRATION: "bg-orange-50 text-orange-700", COMMUNICATION: "bg-cyan-50 text-cyan-700", INTEGRATION: "bg-pink-50 text-pink-700", REPORTS: "bg-amber-50 text-amber-700",
};
const tabs = [["ALL", "All Modules"], ["CORE", "Core Modules"], ["ACADEMIC", "Academic"], ["ADMINISTRATION", "Administration"], ["COMMUNICATION", "Communication"], ["FINANCE", "Finance"], ["INTEGRATION", "Integration"], ["REPORTS", "Reports & Analytics"]] as const;
const panelTabs = ["Features", "Configuration", "Access Control", "Usage", "Audit Log"] as const;
type PanelTab = (typeof panelTabs)[number];
const PAGE = 12;

const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—");

function Stat({ label, value, sub, icon, box }: { label: string; value: string | number; sub: string; icon: ReactNode; box: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white px-4 py-3.5">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${box}`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] text-[#17245e]">{label}</div>
        <div className="text-[22px] font-extrabold leading-7 text-[#101b69]">{value}</div>
        <div className="text-[10px] font-semibold text-emerald-600">{sub}</div>
      </div>
    </div>
  );
}

export default function ModulesFeatures() {
  const [data, setData] = useState<ModulesOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cat, setCat] = useState("ALL");
  const [q, setQ] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("POSITION");
  const [page, setPage] = useState(1);
  const [menu, setMenu] = useState<string | null>(null);

  const [sel, setSel] = useState<string | null>(null);
  const [detail, setDetail] = useState<ModuleDetail | null>(null);
  const [ptab, setPtab] = useState<PanelTab>("Features");
  const [feat, setFeat] = useState<Record<string, boolean>>({});
  const [set, setSet] = useState<Record<string, string>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [meta, setMeta] = useState({ name: "", category: "CORE", description: "" });
  const [access, setAccess] = useState<ModuleAccessRow[]>([]);
  const [usage, setUsage] = useState<ModuleUsage | null>(null);
  const [audit, setAudit] = useState<ModuleAuditItem[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulk, setBulk] = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    try { setData(await api.modules.overview()); setError(""); } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const open = useCallback(async (code: string, tab: PanelTab = "Features") => {
    setSel(code); setPtab(tab); setErrs({}); setMenu(null);
    try {
      const d = await api.modules.detail(code);
      setDetail(d);
      setFeat(Object.fromEntries(d.features.map((f) => [f.code, f.enabled])));
      setSet(d.settings);
      setMeta({ name: d.module.name, category: d.module.category, description: d.module.description });
    } catch (e) { setError(errText(e)); }
  }, []);
  useEffect(() => { if (data && !sel && data.modules.length) void open(data.modules[0].code); }, [data, sel, open]);

  useEffect(() => {
    if (!sel) return;
    if (ptab === "Access Control") api.modules.access(sel).then(setAccess).catch((e) => setError(errText(e)));
    if (ptab === "Usage") api.modules.usage(sel).then(setUsage).catch((e) => setError(errText(e)));
    if (ptab === "Audit Log") api.modules.audit(sel).then(setAudit).catch((e) => setError(errText(e)));
  }, [sel, ptab]);

  const rows = useMemo(() => {
    const list = (data?.modules ?? []).filter((m) =>
      (cat === "ALL" || m.category === cat) &&
      (type === "ALL" || (type === "CORE" ? m.category === "CORE" : m.category !== "CORE")) &&
      (status === "ALL" || (status === "ENABLED") === m.enabled) &&
      (!q.trim() || `${m.name} ${m.description}`.toLowerCase().includes(q.trim().toLowerCase())));
    if (sort === "NAME") list.sort((a, b) => a.name.localeCompare(b.name));
    if (sort === "CATEGORY") list.sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name));
    if (sort === "FEATURES") list.sort((a, b) => b.featuresTotal - a.featuresTotal);
    return list;
  }, [data, cat, type, status, q, sort]);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages);
  const shown = rows.slice((cur - 1) * PAGE, cur * PAGE);
  const reset = () => { setQ(""); setType("ALL"); setStatus("ALL"); setSort("POSITION"); setCat("ALL"); setPage(1); };

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 3500); };
  const toggleModule = async (m: ModuleRow, on: boolean) => {
    try { await api.modules.setStatus(m.code, on); await load(); if (sel === m.code) await open(m.code, ptab); flash(`${m.name} ${on ? "enabled" : "disabled"}.`); } catch (e) { setError(errText(e)); }
  };

  const dirty = !!detail && (detail.features.some((f) => feat[f.code] !== f.enabled) || Object.keys(set).some((k) => set[k] !== detail.settings[k]));
  const save = async () => {
    if (!sel) return;
    setSaving(true); setErrs({});
    try {
      const d = await api.modules.save(sel, { features: feat, settings: set });
      setDetail(d); setFeat(Object.fromEntries(d.features.map((f) => [f.code, f.enabled]))); setSet(d.settings);
      await load(); flash("Module configuration saved.");
    } catch (e) {
      const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors;
      if (fe) setErrs(fe); else setError(errText(e));
    } finally { setSaving(false); }
  };
  const cancel = () => { if (detail) { setFeat(Object.fromEntries(detail.features.map((f) => [f.code, f.enabled]))); setSet(detail.settings); setErrs({}); } };
  const saveMeta = async () => {
    if (!sel) return;
    setSaving(true); setErrs({});
    try { const d = await api.modules.meta(sel, meta); setDetail(d); await load(); flash("Module details saved."); }
    catch (e) { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; if (fe) setErrs(fe); else setError(errText(e)); }
    finally { setSaving(false); }
  };
  const resetModule = async (code: string) => {
    if (!window.confirm("Reset this module's features and settings to their defaults?")) return;
    try { await api.modules.reset(code); await load(); await open(code, "Features"); flash("Module reset to defaults."); } catch (e) { setError(errText(e)); }
  };
  const grant = async (r: ModuleAccessRow, on: boolean) => {
    if (!sel) return;
    try { const u = await api.modules.setAccess(sel, r.institutionId, on); setAccess((a) => a.map((x) => (x.institutionId === u.institutionId ? u : x))); await load(); } catch (e) { setError(errText(e)); }
  };
  const applyBulk = async () => {
    const changed = Object.fromEntries(Object.entries(bulk).filter(([c, v]) => data?.modules.find((m) => m.code === c)?.enabled !== v));
    if (!Object.keys(changed).length) { setBulkOpen(false); return; }
    try { setData(await api.modules.bulk(changed)); setBulkOpen(false); if (sel) await open(sel, ptab); flash("Modules updated."); } catch (e) { setError(errText(e)); }
  };

  const s = data?.stats;
  const m = detail?.module;
  const fieldErr = (k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);

  return (
    <AdminLayout activeItem="Modules & Features">
      <div className="space-y-4" onClick={() => setMenu(null)}>
        <UsersHeader title="Modules & Features" subtitle="Manage modules, features and configurations available across the platform."
          right={<PrimaryButton onClick={() => { setBulk(Object.fromEntries((data?.modules ?? []).map((x) => [x.code, x.enabled]))); setBulkOpen(true); }}><SlidersHorizontal size={13} /> Configure Modules</PrimaryButton>} />
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Stat label="Total Modules" value={s?.modules ?? "—"} sub={s ? `${s.modulesEnabled} enabled` : ""} icon={<Layers size={22} />} box="bg-blue-50 text-blue-600" />
          <Stat label="Total Features" value={s?.features ?? "—"} sub={s ? `${s.featuresEnabled} enabled` : ""} icon={<Puzzle size={22} />} box="bg-emerald-50 text-emerald-600" />
          <Stat label="Institutions Using Modules" value={s?.institutionsUsing ?? "—"} sub={s ? `+${s.institutionsNewThisMonth} this month` : ""} icon={<Building2 size={22} />} box="bg-violet-50 text-violet-600" />
          <Stat label="Custom Configurations" value={s?.customConfigs ?? "—"} sub={s ? `${s.updatedThisMonth} updated this month` : ""} icon={<Cog size={22} />} box="bg-orange-50 text-orange-600" />
        </div>

        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.55fr)_minmax(380px,1fr)]">
          <Panel>
            <div className="flex flex-wrap gap-1 border-b border-[#e3eefc] px-3 pt-2">
              {tabs.map(([k, l]) => (
                <button key={k} type="button" onClick={() => { setCat(k); setPage(1); }}
                  className={`rounded-t-md px-3 py-2 text-[11px] font-semibold ${cat === k ? "border-b-2 border-blue-600 text-blue-600" : "text-[#33477c] hover:text-blue-600"}`}>{l}</button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 px-4 py-3">
              <div className="relative min-w-[180px] flex-1">
                <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Search modules..." className={`${controlClass} pl-8`} />
              </div>
              <select value={type} onChange={(e) => { setType(e.target.value); setPage(1); }} className={`${controlClass} w-auto`}>
                <option value="ALL">Module Type: All</option><option value="CORE">Core</option><option value="OPTIONAL">Optional</option>
              </select>
              <select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className={`${controlClass} w-auto`}>
                <option value="ALL">Status: All</option><option value="ENABLED">Enabled</option><option value="DISABLED">Disabled</option>
              </select>
              <select value={sort} onChange={(e) => setSort(e.target.value)} className={`${controlClass} w-auto`}>
                <option value="POSITION">Sort By: Default</option><option value="NAME">Name</option><option value="CATEGORY">Category</option><option value="FEATURES">Features</option>
              </select>
              <button type="button" onClick={reset} className="text-[11px] font-semibold text-blue-600 hover:underline">Reset</button>
            </div>
            <DataTable heads={["#", "Module Name", "Category", "Description", "Status", "Features", "Action"]} min={820}>
              {loading ? <EmptyRow cols={7} text="Loading…" /> : shown.length === 0 ? <EmptyRow cols={7} text="No modules match your filters." /> : shown.map((r, i) => (
                <tr key={r.code} onClick={() => void open(r.code)} className={`cursor-pointer border-t border-[#eef4fd] hover:bg-[#f5f9ff] ${sel === r.code ? "bg-[#eef6ff]" : ""}`}>
                  <td className={tdClass}>{(cur - 1) * PAGE + i + 1}</td>
                  <td className={tdClass}><span className="flex items-center gap-2 font-semibold text-[#17245e]"><span className={`grid h-7 w-7 place-items-center rounded-md ${iconBox[r.category] ?? iconBox.CORE}`}>{icons[r.icon] ?? <Layers size={15} />}</span>{r.name}</span></td>
                  <td className={tdClass}><span className={`rounded px-2 py-0.5 text-[9px] font-semibold ${catPill[r.category] ?? catPill.CORE}`}>{catLabel[r.category] ?? r.category}</span></td>
                  <td className={`${tdClass} max-w-[220px] text-slate-600`}>{r.description}</td>
                  <td className={tdClass} onClick={(e) => e.stopPropagation()}><Toggle checked={r.enabled} onChange={(v) => void toggleModule(r, v)} /></td>
                  <td className={`${tdClass} font-semibold`}>{r.featuresEnabled} / {r.featuresTotal}</td>
                  <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                    <span className="relative flex items-center gap-2 text-slate-500">
                      <button type="button" title="Configure" onClick={() => void open(r.code, "Configuration")} className="hover:text-blue-600"><Cog size={14} /></button>
                      <button type="button" title="Institution access" onClick={() => void open(r.code, "Access Control")} className="hover:text-blue-600"><Users size={14} /></button>
                      <button type="button" title="More" onClick={(e) => { e.stopPropagation(); setMenu(menu === r.code ? null : r.code); }} className="hover:text-blue-600"><MoreVertical size={14} /></button>
                      {menu === r.code && (
                        <div className="absolute right-0 top-5 z-10 w-44 rounded-md border border-[#d8e9fb] bg-white py-1 text-[11px] shadow-lg">
                          <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => void toggleModule(r, !r.enabled)}>{r.enabled ? "Disable module" : "Enable module"}</button>
                          <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => void open(r.code, "Configuration")}>Edit module</button>
                          <button type="button" className="block w-full px-3 py-1.5 text-left hover:bg-blue-50" onClick={() => void open(r.code, "Audit Log")}>View audit log</button>
                          <button type="button" className="block w-full px-3 py-1.5 text-left text-rose-600 hover:bg-rose-50" onClick={() => void resetModule(r.code)}>Reset to defaults</button>
                        </div>
                      )}
                    </span>
                  </td>
                </tr>
              ))}
            </DataTable>
            <div className="flex items-center justify-between px-4 py-3 text-[11px] text-[#33477c]">
              <span>{rows.length === 0 ? "Showing 0 of 0" : `Showing ${(cur - 1) * PAGE + 1}-${Math.min(cur * PAGE, rows.length)} of ${rows.length}`}</span>
              <span className="flex items-center gap-1">
                <button type="button" disabled={cur <= 1} onClick={() => setPage(cur - 1)} className="rounded border border-[#d8e9fb] px-2 py-0.5 disabled:opacity-40">‹</button>
                <span className="rounded bg-blue-600 px-2 py-0.5 text-white">{cur}</span>
                <button type="button" disabled={cur >= pages} onClick={() => setPage(cur + 1)} className="rounded border border-[#d8e9fb] px-2 py-0.5 disabled:opacity-40">›</button>
              </span>
            </div>
          </Panel>

          <Panel>
            {!m || !detail ? <div className="p-6 text-[12px] text-slate-500">Select a module to see its features.</div> : (
              <div>
                <div className="flex items-start justify-between gap-3 px-4 pt-4">
                  <div className="flex items-center gap-3">
                    <span className={`grid h-10 w-10 place-items-center rounded-lg ${iconBox[m.category] ?? iconBox.CORE}`}>{icons[m.icon] ?? <Layers size={18} />}</span>
                    <div>
                      <div className="flex items-center gap-2"><h2 className="text-[15px] font-extrabold text-[#101b69]">{m.name}</h2>
                        <span className={`rounded px-2 py-0.5 text-[9px] font-semibold ${m.enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{m.enabled ? "Enabled" : "Disabled"}</span></div>
                      <p className="text-[11px] text-slate-600">{m.description}</p>
                    </div>
                  </div>
                  <OutlineButton onClick={() => setPtab("Configuration")}>Edit Module</OutlineButton>
                </div>
                <div className="mt-3 flex flex-wrap gap-1 border-b border-[#e3eefc] px-3">
                  {panelTabs.map((t) => (
                    <button key={t} type="button" onClick={() => setPtab(t)} className={`px-3 py-2 text-[11px] font-semibold ${ptab === t ? "border-b-2 border-blue-600 text-blue-600" : "text-[#33477c]"}`}>{t}</button>
                  ))}
                </div>

                {ptab === "Features" && (
                  <div className="space-y-4 p-4">
                    <h3 className="text-[13px] font-extrabold text-[#101b69]">Features ({detail.features.length})</h3>
                    {fieldErr("features")}
                    <DataTable heads={["#", "Feature Name", "Description", "Status"]} min={420}>
                      {detail.features.map((f, i) => (
                        <tr key={f.code} className="border-t border-[#eef4fd]">
                          <td className={tdClass}>{i + 1}</td>
                          <td className={`${tdClass} font-semibold text-[#17245e]`}>{f.name}</td>
                          <td className={`${tdClass} text-slate-600`}>{f.description}</td>
                          <td className={tdClass}><Toggle checked={!!feat[f.code]} onChange={(v) => setFeat((p) => ({ ...p, [f.code]: v }))} /></td>
                        </tr>
                      ))}
                    </DataTable>
                    <div>
                      <h3 className="mb-2 text-[13px] font-extrabold text-[#101b69]">Module Settings</h3>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="Default Status"><Toggle checked={set.defaultStatus === "true"} onChange={(v) => setSet((p) => ({ ...p, defaultStatus: String(v) }))} label={set.defaultStatus === "true" ? "Enabled" : "Disabled"} /></Field>
                        <Field label="Allow Custom Fields"><Toggle checked={set.allowCustomFields === "true"} onChange={(v) => setSet((p) => ({ ...p, allowCustomFields: String(v) }))} label={set.allowCustomFields === "true" ? "Enabled" : "Disabled"} /></Field>
                        <Field label={`Max Attachments per ${detail.recordNoun}`}>
                          <input type="number" min={1} max={100} value={set.maxAttachments ?? ""} onChange={(e) => setSet((p) => ({ ...p, maxAttachments: e.target.value }))} className={controlClass} />{fieldErr("maxAttachments")}
                        </Field>
                        <Field label="Data Retention (Years)">
                          <input type="number" min={1} max={50} value={set.retentionYears ?? ""} onChange={(e) => setSet((p) => ({ ...p, retentionYears: e.target.value }))} className={controlClass} />{fieldErr("retentionYears")}
                        </Field>
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <OutlineButton onClick={cancel} disabled={!dirty || saving}>Cancel</OutlineButton>
                      <PrimaryButton onClick={() => void save()} disabled={!dirty || saving}><Check size={13} /> {saving ? "Saving…" : "Save Changes"}</PrimaryButton>
                    </div>
                  </div>
                )}

                {ptab === "Configuration" && (
                  <div className="space-y-3 p-4">
                    <Field label="Module Name" required><input value={meta.name} onChange={(e) => setMeta({ ...meta, name: e.target.value })} className={controlClass} />{fieldErr("name")}</Field>
                    <Field label="Category" required>
                      <select value={meta.category} onChange={(e) => setMeta({ ...meta, category: e.target.value })} className={controlClass}>
                        {Object.entries(catLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                      </select>{fieldErr("category")}
                    </Field>
                    <Field label="Description" required><textarea rows={3} value={meta.description} onChange={(e) => setMeta({ ...meta, description: e.target.value })} className={controlClass} />{fieldErr("description")}</Field>
                    <div className="flex items-center justify-between">
                      <button type="button" onClick={() => void resetModule(m.code)} className="text-[11px] font-semibold text-rose-600 hover:underline">Reset to defaults</button>
                      <PrimaryButton onClick={() => void saveMeta()} disabled={saving}>{saving ? "Saving…" : "Save Details"}</PrimaryButton>
                    </div>
                  </div>
                )}

                {ptab === "Access Control" && (
                  <div className="space-y-2 p-4">
                    <p className="text-[11px] text-slate-600">Choose which institutions can use {m.name}.{!m.enabled && " This module is disabled platform-wide, so it can't be granted."}</p>
                    <DataTable heads={["Institution", "Access"]} min={300}>
                      {access.length === 0 ? <EmptyRow cols={2} text="No institutions." /> : access.map((r) => (
                        <tr key={r.institutionId} className="border-t border-[#eef4fd]">
                          <td className={`${tdClass} font-semibold text-[#17245e]`}>{r.institutionName}</td>
                          <td className={tdClass}><Toggle checked={r.enabled} onChange={(v) => void grant(r, v)} /></td>
                        </tr>
                      ))}
                    </DataTable>
                  </div>
                )}

                {ptab === "Usage" && (
                  <div className="grid gap-3 p-4 sm:grid-cols-2">
                    <Stat label="Institutions using" value={usage ? `${usage.institutions} / ${usage.totalInstitutions}` : "—"} sub="" icon={<Building2 size={20} />} box="bg-violet-50 text-violet-600" />
                    <Stat label="Features enabled" value={usage ? `${usage.featuresEnabled} / ${usage.featuresTotal}` : "—"} sub="" icon={<Puzzle size={20} />} box="bg-emerald-50 text-emerald-600" />
                    <p className="text-[11px] text-slate-600 sm:col-span-2">Last changed: {when(usage?.lastChanged ?? null)}</p>
                  </div>
                )}

                {ptab === "Audit Log" && (
                  <div className="p-4">
                    <DataTable heads={["When", "By", "Change"]} min={380}>
                      {audit.length === 0 ? <EmptyRow cols={3} text="No changes recorded yet." /> : audit.map((a, i) => (
                        <tr key={i} className="border-t border-[#eef4fd]"><td className={tdClass}>{when(a.at)}</td><td className={tdClass}>{a.actor ?? "—"}</td><td className={tdClass}>{a.description}</td></tr>
                      ))}
                    </DataTable>
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {bulkOpen && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-md overflow-auto rounded-xl bg-white p-5 shadow-xl">
            <div className="mb-3 flex items-center justify-between"><h2 className="text-[15px] font-extrabold text-[#101b69]">Configure Modules</h2>
              <button type="button" aria-label="Close" onClick={() => setBulkOpen(false)}><X size={16} /></button></div>
            <ul className="divide-y divide-[#eef4fd]">
              {(data?.modules ?? []).map((x) => (
                <li key={x.code} className="flex items-center justify-between py-2 text-[12px] text-[#17245e]"><span>{x.name}</span>
                  <Toggle checked={!!bulk[x.code]} onChange={(v) => setBulk((p) => ({ ...p, [x.code]: v }))} /></li>
              ))}
            </ul>
            <div className="mt-4 flex justify-end gap-2"><OutlineButton onClick={() => setBulkOpen(false)}>Cancel</OutlineButton><PrimaryButton onClick={() => void applyBulk()}>Apply</PrimaryButton></div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
