import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import type { ReactNode } from "react";
import { Cloud, Clock, Database, Download, MoreVertical, Pencil, Plus, Server, Settings, Share2, ShieldCheck, Activity, X } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api } from "../../services/api";
import type { Institution, SysBackup, SysInstance, SysIntegration, SysOverview, SysSecurityRow } from "../../services/api";
import { DataTable, EmptyRow, Field, Notice, OutlineButton, Panel, PrimaryButton, Toggle, controlClass, tdClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { UsersHeader } from "./UserShared";

const tabs = ["Overview", "Instances & Environments", "Integrations", "Data Management", "Security & Access", "System Configuration", "Monitoring", "Backup & Restore"] as const;
type Tab = (typeof tabs)[number];
const backupLabel: Record<string, string> = { FULL: "Full Backup", DATABASE: "Database Backup", CONFIGURATION: "Configuration Backup" };
const envLabel: Record<string, string> = { PROD: "PROD", QA: "QA", PREVIEW: "Preview", DEV: "Dev" };

const fmtDT = (iso: string | null) => (iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: true }) : "—");
const fmtD = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const bytes = (n: number) => (n >= 1073741824 ? `${(n / 1073741824).toFixed(2)} GB` : n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);

type Tone = "green" | "orange" | "red" | "gray" | "blue";
const toneCls: Record<Tone, string> = { green: "bg-emerald-50 text-emerald-700", orange: "bg-orange-50 text-orange-600", red: "bg-rose-50 text-rose-600", gray: "bg-slate-100 text-slate-600", blue: "bg-blue-50 text-blue-600" };
const dotCls: Record<Tone, string> = { green: "bg-emerald-500", orange: "bg-orange-500", red: "bg-rose-500", gray: "bg-slate-400", blue: "bg-blue-500" };
const Pill = ({ tone, children }: { tone: Tone; children: ReactNode }) => <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-[9px] font-medium ${toneCls[tone]}`}><span className={`h-2 w-2 rounded-full ${dotCls[tone]}`} />{children}</span>;
const instTone = (s: string): [Tone, string] => (s === "ACTIVE" ? ["green", "Active"] : s === "REFRESHING" ? ["orange", "Refreshing"] : ["gray", "Stopped"]);
const integTone = (s: string): [Tone, string] => (s === "ACTIVE" ? ["green", "Active"] : s === "ISSUE" ? ["orange", "Issue"] : ["gray", "Disabled"]);
const svcTone = (s: string): [Tone, string] => (s === "HEALTHY" ? ["green", "Healthy"] : s === "DEGRADED" ? ["orange", "Degraded"] : s === "DOWN" ? ["red", "Down"] : ["gray", "Not configured"]);

function Title({ icon, title, right }: { icon: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-3.5">
      <div className="flex items-center gap-2.5"><span className="text-blue-600">{icon}</span><h2 className="text-[14px] font-extrabold tracking-[-0.2px] text-[#101b69]">{title}</h2></div>
      <div className="flex gap-2">{right}</div>
    </div>
  );
}
const Small = ({ children, onClick, solid }: { children: ReactNode; onClick: () => void; solid?: boolean }) => (
  <button type="button" onClick={onClick} className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold ${solid ? "bg-[#0875fb] text-white hover:bg-blue-700" : "border border-blue-300 bg-white text-blue-600 hover:bg-blue-50"}`}>{children}</button>
);
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[92vh] w-full max-w-md space-y-3 overflow-auto rounded-xl bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between"><h2 className="text-[15px] font-extrabold text-[#101b69]">{title}</h2><button type="button" aria-label="Close" onClick={onClose}><X size={16} /></button></div>
        {children}
      </div>
    </div>
  );
}
function Menu({ id, open, setOpen, children }: { id: string; open: string | null; setOpen: (v: string | null) => void; children: ReactNode }) {
  return (
    <span className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <button type="button" title="More" className="text-slate-600" onClick={() => setOpen(open === id ? null : id)}><MoreVertical size={14} /></button>
      {open === id && <div className="absolute right-0 top-5 z-10 w-40 rounded-md border border-[#d8e9fb] bg-white py-1 text-[11px] text-[#17245e] shadow-lg" onClick={() => setOpen(null)}>{children}</div>}
    </span>
  );
}
const Item = ({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: ReactNode }) => <button type="button" onClick={onClick} className={`block w-full px-3 py-1.5 text-left ${danger ? "text-rose-600 hover:bg-rose-50" : "hover:bg-blue-50"}`}>{children}</button>;

type InstForm = { id: number | null; name: string; institutionId: string; kind: string; environment: string; version: string; status: string; notes: string };
type IntForm = { id: number | null; name: string; type: string; source: string; target: string; endpoint: string };

export default function SystemManagement() {
  const [urlParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(() => { const q = (urlParams.get("tab") ?? "").toLowerCase(); return (q && tabs.find((t) => t.toLowerCase().startsWith(q))) || "Overview"; });
  const [data, setData] = useState<SysOverview | null>(null);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [inst, setInst] = useState<InstForm | null>(null);
  const [integ, setInteg] = useState<IntForm | null>(null);
  const [sec, setSec] = useState<{ row: SysSecurityRow; values: Record<string, string> } | null>(null);
  const [backupOpen, setBackupOpen] = useState(false);
  const [backupType, setBackupType] = useState("FULL");
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [errs, setErrs] = useState<Record<string, string>>({});

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 4000); };
  const fieldErrs = (e: unknown) => (e as { fieldErrors?: Record<string, string> }).fieldErrors;
  const load = useCallback(async () => { try { const o = await api.sysmgmt.overview(); setData(o); setCfg(o.config); setError(""); } catch (e) { setError(errText(e)); } }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { api.institutions.list({ status: "ALL" }).then((l) => setInstitutions(l.filter((i) => i.status !== "ARCHIVED"))).catch(() => { /* optional */ }); }, []);

  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); flash(ok); await load(); } catch (e) { setError(errText(e)); } };
  const saveBlob = (b: Blob, name: string) => { const url = URL.createObjectURL(b); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
  const exportData = async (code: string) => { try { saveBlob(await api.sysmgmt.file(`/data/${code}/export`), `classzy-${code.toLowerCase()}.csv`); flash("Export downloaded."); } catch (e) { setError(errText(e)); } };
  const downloadBackup = async (b: SysBackup) => { try { saveBlob(await api.sysmgmt.file(`/backups/${b.id}/download`), `classzy-${b.type.toLowerCase()}-backup-${b.createdAt.slice(0, 10)}.zip`); } catch (e) { setError(errText(e)); } };

  const h = data?.header;
  const all = tab !== "Overview";
  const slice = <T,>(l: T[]) => (all ? l : l.slice(0, 5));
  const e1 = (k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);

  const saveInst = async () => {
    if (!inst) return; setBusy(true); setErrs({});
    const body = { name: inst.name, institutionId: inst.institutionId ? Number(inst.institutionId) : null, kind: inst.kind, environment: inst.environment, version: inst.version, status: inst.status, notes: inst.notes };
    try { if (inst.id) await api.sysmgmt.updateInstance(inst.id, body); else await api.sysmgmt.createInstance(body); setInst(null); flash("Instance saved."); await load(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else setError(errText(e)); } finally { setBusy(false); }
  };
  const saveInteg = async () => {
    if (!integ) return; setBusy(true); setErrs({});
    const body = { name: integ.name, type: integ.type, source: integ.source, target: integ.target, endpoint: integ.endpoint };
    try { if (integ.id) await api.sysmgmt.updateIntegration(integ.id, body); else await api.sysmgmt.createIntegration(body); setInteg(null); flash("Integration saved."); await load(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else setError(errText(e)); } finally { setBusy(false); }
  };
  const saveSec = async () => {
    if (!sec) return; setBusy(true); setErrs({});
    try { await api.sysmgmt.saveSecurity(sec.values); setSec(null); flash("Security setting saved."); await load(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else setError(errText(e)); } finally { setBusy(false); }
  };
  const saveCfg = async () => {
    setBusy(true); setErrs({});
    try { await api.sysmgmt.saveConfig(cfg); flash("System configuration saved."); await load(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else setError(errText(e)); } finally { setBusy(false); }
  };
  const doBackup = async () => {
    setBusy(true);
    try { const b = await api.sysmgmt.runBackup(backupType); setBackupOpen(false); flash(b.status === "SUCCESS" ? `${backupLabel[b.type]} completed (${b.tables} tables, ${bytes(b.sizeBytes)}).` : `Backup failed: ${b.note ?? ""}`); await load(); }
    catch (e) { setError(errText(e)); } finally { setBusy(false); }
  };
  const editInst = (i: SysInstance) => { setErrs({}); setInst({ id: i.id, name: i.name, institutionId: i.institutionId ? String(i.institutionId) : "", kind: i.kind, environment: i.environment, version: i.version ?? "", status: i.status, notes: i.notes ?? "" }); };
  const editInteg = (i: SysIntegration) => { setErrs({}); setInteg({ id: i.id, name: i.name, type: i.type, source: i.source ?? "", target: i.target ?? "", endpoint: i.endpoint ?? "" }); };
  const newInst = () => { setErrs({}); setInst({ id: null, name: "", institutionId: "", kind: "PRODUCTION", environment: "PROD", version: "", status: "ACTIVE", notes: "" }); };
  const newInteg = () => { setErrs({}); setInteg({ id: null, name: "", type: "API", source: "", target: "", endpoint: "" }); };

  const show = (t: Tab) => tab === "Overview" || tab === t;

  return (
    <AdminLayout activeItem="System Management">
      <div className="space-y-4" onClick={() => setMenu(null)}>
        <UsersHeader title="System Management" subtitle="Configure, monitor and maintain the platform for optimal performance, security and reliability." />
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white px-4 py-3.5"><span className="grid h-12 w-12 place-items-center rounded-lg bg-blue-50 text-blue-600"><Settings size={22} /></span>
            <div><div className="text-[11px] font-semibold text-[#17245e]">System Health</div>
              <div className={`flex items-center gap-1.5 text-[16px] font-extrabold ${h?.health.status === "OPERATIONAL" ? "text-emerald-600" : h?.health.status === "DOWN" ? "text-rose-600" : "text-orange-500"}`}><span className="h-2.5 w-2.5 rounded-full bg-current" />{h?.health.label ?? "—"}</div>
              <div className="text-[10px] text-slate-500">{h?.health.detail}</div></div></div>
          <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white px-4 py-3.5"><span className="grid h-12 w-12 place-items-center rounded-lg bg-violet-50 text-violet-600"><Server size={22} /></span>
            <div><div className="text-[11px] font-semibold text-[#17245e]">Total Instances</div><div className="text-[22px] font-extrabold leading-7 text-[#101b69]">{h?.instances ?? "—"}</div><div className="text-[10px] font-semibold text-emerald-600">{h ? `↑ ${h.instancesNew} new this month` : ""}</div></div></div>
          <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white px-4 py-3.5"><span className="grid h-12 w-12 place-items-center rounded-lg bg-sky-50 text-sky-600"><Cloud size={22} /></span>
            <div className="min-w-0 flex-1"><div className="text-[11px] font-semibold text-[#17245e]">Storage Usage</div><div className="text-[20px] font-extrabold leading-7 text-[#101b69]">{h ? bytes(h.storageUsed) : "—"}</div>
              <div className="flex items-center gap-2"><span className="h-2 flex-1 rounded-full bg-[#e8f0fb]"><span className="block h-2 rounded-full bg-blue-600" style={{ width: `${Math.max(2, h?.storagePercent ?? 0)}%` }} /></span><span className="text-[10px] text-[#17245e]">{h?.storagePercent ?? 0}% of {h?.capacityGb} GB</span></div></div></div>
          <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white px-4 py-3.5" title={h?.issues.join("\n")}><span className="grid h-12 w-12 place-items-center rounded-lg bg-emerald-50 text-emerald-600"><ShieldCheck size={22} /></span>
            <div><div className="text-[11px] font-semibold text-[#17245e]">Security Status</div>
              <div className={`text-[16px] font-extrabold ${h?.security.status === "OK" ? "text-emerald-600" : h?.security.status === "RISK" ? "text-rose-600" : "text-orange-500"}`}>{h?.security.label ?? "—"}</div>
              <div className="text-[10px] text-slate-500">{h?.security.detail}</div></div></div>
          <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white px-4 py-3.5"><span className="grid h-12 w-12 place-items-center rounded-lg bg-violet-50 text-violet-600"><Clock size={22} /></span>
            <div><div className="text-[11px] font-semibold text-[#17245e]">Last Backup</div><div className="text-[14px] font-extrabold text-[#101b69]">{h?.lastBackup ? fmtDT(h.lastBackup.createdAt) : "None yet"}</div>
              <div className="flex items-center gap-1.5 text-[10px] text-emerald-600">{h?.lastBackup && <><span className="h-2 w-2 rounded-full bg-emerald-500" />Successful</>}</div></div></div>
        </div>
        {h && h.issues.length > 0 && <Notice tone="info">{h.issues.map((i, k) => <div key={k}>• {i}</div>)}</Notice>}

        <Panel>
          <div className="flex flex-wrap border-b border-[#e3eefc] bg-[#f5f9ff] px-2">
            {tabs.map((t) => <button key={t} type="button" onClick={() => setTab(t)} className={`px-4 py-3 text-[11px] font-semibold ${tab === t ? "border-b-2 border-blue-600 text-blue-600" : "text-[#17245e] hover:text-blue-600"}`}>{t}</button>)}
          </div>
        </Panel>

        <div className={`grid gap-4 ${tab === "Overview" ? "xl:grid-cols-2" : ""}`}>
          {show("Instances & Environments") && (
            <Panel>
              <Title icon={<Server size={17} />} title="Instances & Environments" right={<>{!all && <Small onClick={() => setTab("Instances & Environments")}>Manage Environments</Small>}<Small solid onClick={newInst}><Plus size={12} /> Create Instance</Small></>} />
              <div className="px-3 pb-3"><DataTable heads={["#", "Instance Name", "Type", "Environment", "Version", "Status", "Last Refresh", "Action"]} min={700}>
                {(data?.instances.length ?? 0) === 0 ? <EmptyRow cols={8} text="No instances recorded yet. Use Create Instance to add one." /> : slice(data?.instances ?? []).map((i, n) => { const [t, l] = instTone(i.status); return (
                  <tr key={i.id} className="border-t border-[#eef4fd]"><td className={tdClass}>{n + 1}</td><td className={`${tdClass} font-medium text-[#17245e]`}>{i.name}</td><td className={tdClass}>{i.kind === "PRODUCTION" ? "Production" : "Non-Prod"}</td><td className={tdClass}>{envLabel[i.environment]}</td><td className={tdClass}>{i.version ?? "—"}</td>
                    <td className={tdClass}><Pill tone={t}>{l}</Pill></td><td className={tdClass}>{fmtD(i.lastRefresh)}</td>
                    <td className={tdClass}><Menu id={`i${i.id}`} open={menu} setOpen={setMenu}><Item onClick={() => editInst(i)}>Edit</Item><Item onClick={() => void run(() => api.sysmgmt.refreshInstance(i.id), "Refresh recorded.")}>Record refresh</Item>
                      <Item danger onClick={() => { if (window.confirm(`Delete ${i.name}?`)) void run(() => api.sysmgmt.removeInstance(i.id), "Instance deleted."); }}>Delete</Item></Menu></td></tr>); })}
              </DataTable></div>
            </Panel>
          )}

          {show("Integrations") && (
            <Panel>
              <Title icon={<Share2 size={17} />} title="Integrations" right={<Small solid onClick={newInteg}><Plus size={12} /> Add Integration</Small>} />
              <div className="px-3 pb-3"><DataTable heads={["#", "Integration Name", "Type", "Source", "Target", "Status", "Last Run", "Action"]} min={700}>
                {(data?.integrations.length ?? 0) === 0 ? <EmptyRow cols={8} text="No integrations yet. Use Add Integration." /> : slice(data?.integrations ?? []).map((i, n) => { const [t, l] = integTone(i.status); return (
                  <tr key={i.id} className="border-t border-[#eef4fd]"><td className={tdClass}>{n + 1}</td><td className={`${tdClass} font-medium text-[#17245e]`}>{i.name}</td><td className={tdClass}>{i.type === "DEVICE" ? "Device" : i.type}</td><td className={tdClass}>{i.source ?? "—"}</td><td className={tdClass}>{i.target ?? "—"}</td>
                    <td className={tdClass} title={i.message ?? ""}><Pill tone={t}>{l}</Pill></td><td className={tdClass}>{fmtDT(i.lastRun)}</td>
                    <td className={tdClass}><Menu id={`g${i.id}`} open={menu} setOpen={setMenu}><Item onClick={() => editInteg(i)}>Edit</Item><Item onClick={() => void run(() => api.sysmgmt.testIntegration(i.id), "Test finished.")}>Test connection</Item>
                      <Item onClick={() => void run(() => api.sysmgmt.toggleIntegration(i.id), i.status === "DISABLED" ? "Enabled." : "Disabled.")}>{i.status === "DISABLED" ? "Enable" : "Disable"}</Item>
                      <Item danger onClick={() => { if (window.confirm(`Delete ${i.name}?`)) void run(() => api.sysmgmt.removeIntegration(i.id), "Integration deleted."); }}>Delete</Item></Menu></td></tr>); })}
              </DataTable></div>
            </Panel>
          )}

          {show("Data Management") && (
            <Panel>
              <Title icon={<Database size={17} />} title="Data Management" right={!all ? <Small solid onClick={() => setTab("Data Management")}><Plus size={12} /> Manage Data</Small> : undefined} />
              <div className="px-3 pb-3"><DataTable heads={["#", "Data Type", "Total Records", "Last Updated", "Status", "Action"]} min={560}>
                {(data?.data ?? []).map((d, n) => (
                  <tr key={d.code} className="border-t border-[#eef4fd]"><td className={tdClass}>{n + 1}</td><td className={`${tdClass} font-medium text-[#17245e]`}>{d.name}</td><td className={tdClass}>{d.total.toLocaleString("en-IN")}</td><td className={tdClass}>{fmtDT(d.lastUpdated)}</td>
                    <td className={tdClass}><Pill tone={d.status === "AVAILABLE" ? "green" : "gray"}>{d.status === "AVAILABLE" ? "Available" : "No data"}</Pill></td>
                    <td className={tdClass}><Menu id={`d${d.code}`} open={menu} setOpen={setMenu}><Item onClick={() => void exportData(d.code)}>Export CSV</Item></Menu></td></tr>
                ))}
              </DataTable></div>
              {all && <p className="px-4 pb-3 text-[10px] text-slate-500">Counts are live. "Last Updated" is blank where a table doesn't record when rows change.</p>}
            </Panel>
          )}

          {show("Security & Access") && (
            <Panel>
              <Title icon={<ShieldCheck size={17} />} title="Security & Access Control" right={!all ? <Small solid onClick={() => setTab("Security & Access")}>Configure Security</Small> : undefined} />
              <div className="px-3 pb-3"><DataTable heads={["#", "Settings", "Status", "Current", "Last Updated", "Action"]} min={600}>
                {(data?.security ?? []).map((s, n) => (
                  <tr key={s.key} className="border-t border-[#eef4fd]"><td className={tdClass}>{n + 1}</td><td className={`${tdClass} font-medium text-[#17245e]`}>{s.label}</td><td className={tdClass}><Pill tone={s.enabled ? "green" : "gray"}>{s.enabled ? "Enabled" : "Disabled"}</Pill></td>
                    <td className={`${tdClass} max-w-[150px]`}>{s.summary}</td><td className={tdClass}>{fmtD(s.updatedAt)}</td>
                    <td className={tdClass}><button type="button" title="Edit" className="text-blue-600" onClick={() => { setErrs({}); setSec({ row: s, values: { ...s.values } }); }}><Pencil size={14} /></button></td></tr>
                ))}
              </DataTable></div>
              {all && <p className="px-4 pb-3 text-[10px] text-slate-500">These settings are saved but not enforced on sign-in yet.</p>}
            </Panel>
          )}

          {show("Monitoring") && (
            <Panel>
              <Title icon={<Activity size={17} />} title="Monitoring & System Health" right={all ? <Small solid onClick={() => void run(() => api.sysmgmt.runChecks(), "Checks complete.")}>Run checks now</Small> : <Small solid onClick={() => setTab("Monitoring")}>View All</Small>} />
              <div className="px-3 pb-3"><DataTable heads={["#", "Service", "Status", "Uptime (30d)", "Response Time", "Last Checked"]} min={620}>
                {(data?.monitoring ?? []).map((s, n) => { const [t, l] = svcTone(s.status); return (
                  <tr key={s.name} className="border-t border-[#eef4fd]" title={s.detail}><td className={tdClass}>{n + 1}</td><td className={`${tdClass} font-medium text-[#17245e]`}>{s.name}</td><td className={tdClass}><Pill tone={t}>{l}</Pill></td>
                    <td className={tdClass}>{s.uptime === null ? "—" : `${s.uptime}%`}</td><td className={tdClass}>{s.responseMs === null ? "—" : `${s.responseMs} ms`}</td><td className={tdClass}>{fmtDT(s.lastChecked)}</td></tr>); })}
              </DataTable></div>
              {all && <p className="px-4 pb-3 text-[10px] text-slate-500">Uptime comes from the health checks recorded every 5 minutes. Email and payment gateway show "Not configured" until they're connected.</p>}
            </Panel>
          )}

          {show("Backup & Restore") && (
            <Panel>
              <Title icon={<Cloud size={17} />} title="Backup & Restore" right={<Small solid onClick={() => setBackupOpen(true)}>Run Backup</Small>} />
              <div className="px-3 pb-3"><DataTable heads={["#", "Backup Type", "Created", "Size", "Status", "Action"]} min={600}>
                {(data?.backups.length ?? 0) === 0 ? <EmptyRow cols={6} text="No backups yet. Use Run Backup." /> : slice(data?.backups ?? []).map((b, n) => (
                  <tr key={b.id} className="border-t border-[#eef4fd]" title={b.note ?? ""}><td className={tdClass}>{n + 1}</td><td className={`${tdClass} font-medium text-[#17245e]`}>{backupLabel[b.type]}</td><td className={tdClass}>{fmtDT(b.createdAt)}</td><td className={tdClass}>{b.status === "SUCCESS" ? bytes(b.sizeBytes) : "—"}</td>
                    <td className={tdClass}><Pill tone={b.status === "SUCCESS" ? "green" : "red"}>{b.status === "SUCCESS" ? "Successful" : "Failed"}</Pill></td>
                    <td className={tdClass}><span className="flex items-center gap-2">{b.status === "SUCCESS" && <button type="button" title="Download" className="text-blue-600" onClick={() => void downloadBackup(b)}><Download size={14} /></button>}
                      <Menu id={`b${b.id}`} open={menu} setOpen={setMenu}><Item danger onClick={() => { if (window.confirm("Delete this backup?")) void run(() => api.sysmgmt.removeBackup(b.id), "Backup deleted."); }}>Delete</Item></Menu></span></td></tr>
                ))}
              </DataTable></div>
              {all && <p className="px-4 pb-3 text-[10px] text-slate-500">Backups are ZIP files of CSV exports (passwords, secrets and file contents excluded). They are not scheduled and can't be restored from here.</p>}
            </Panel>
          )}

          {tab === "System Configuration" && (
            <Panel>
              <Title icon={<Settings size={17} />} title="System Configuration" />
              <div className="grid gap-3 px-4 pb-3 sm:grid-cols-2">
                <Field label="Storage capacity (GB)"><input type="number" min={1} value={cfg.storageCapacityGb ?? ""} onChange={(e) => setCfg({ ...cfg, storageCapacityGb: e.target.value })} className={controlClass} />{e1("storageCapacityGb")}</Field>
                <Field label="Log retention (days)"><input type="number" min={7} value={cfg.logRetentionDays ?? ""} onChange={(e) => setCfg({ ...cfg, logRetentionDays: e.target.value })} className={controlClass} />{e1("logRetentionDays")}</Field>
                <Field label="Backup retention (days)"><input type="number" min={1} value={cfg.backupRetentionDays ?? ""} onChange={(e) => setCfg({ ...cfg, backupRetentionDays: e.target.value })} className={controlClass} />{e1("backupRetentionDays")}</Field>
                <Field label="Maintenance mode"><Toggle checked={cfg.maintenanceMode === "true"} onChange={(v) => setCfg({ ...cfg, maintenanceMode: String(v) })} label={cfg.maintenanceMode === "true" ? "On" : "Off"} /></Field>
                <Field label="Maintenance message" className="sm:col-span-2"><textarea rows={2} value={cfg.maintenanceMessage ?? ""} onChange={(e) => setCfg({ ...cfg, maintenanceMessage: e.target.value })} className={controlClass} />{e1("maintenanceMessage")}</Field>
              </div>
              <div className="flex items-center justify-between px-4 pb-4"><p className="text-[10px] text-slate-500">Storage capacity drives the Storage Usage percentage and backup retention is applied when a backup runs. Maintenance mode is saved but doesn't block anyone yet.</p><PrimaryButton onClick={() => void saveCfg()} disabled={busy}>Save Changes</PrimaryButton></div>
            </Panel>
          )}
        </div>
      </div>

      {inst && (
        <Modal title={inst.id ? "Edit Instance" : "Create Instance"} onClose={() => setInst(null)}>
          <Field label="Instance name" required><input value={inst.name} onChange={(e) => setInst({ ...inst, name: e.target.value })} className={controlClass} />{e1("name")}</Field>
          <Field label="Institution" optional><select value={inst.institutionId} onChange={(e) => setInst({ ...inst, institutionId: e.target.value })} className={controlClass}><option value="">—</option>{institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select>{e1("institutionId")}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><select value={inst.kind} onChange={(e) => setInst({ ...inst, kind: e.target.value })} className={controlClass}><option value="PRODUCTION">Production</option><option value="NON_PROD">Non-Prod</option></select></Field>
            <Field label="Environment"><select value={inst.environment} onChange={(e) => setInst({ ...inst, environment: e.target.value })} className={controlClass}>{Object.entries(envLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Version" optional><input value={inst.version} onChange={(e) => setInst({ ...inst, version: e.target.value })} placeholder="v2.5.1" className={controlClass} />{e1("version")}</Field>
            <Field label="Status"><select value={inst.status} onChange={(e) => setInst({ ...inst, status: e.target.value })} className={controlClass}><option value="ACTIVE">Active</option><option value="REFRESHING">Refreshing</option><option value="STOPPED">Stopped</option></select></Field>
          </div>
          <Field label="Notes" optional><textarea rows={2} value={inst.notes} onChange={(e) => setInst({ ...inst, notes: e.target.value })} className={controlClass} />{e1("notes")}</Field>
          <p className="text-[10px] text-slate-500">This records an instance for tracking. It doesn't create or change any server.</p>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setInst(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void saveInst()} disabled={busy}>Save</PrimaryButton></div>
        </Modal>
      )}

      {integ && (
        <Modal title={integ.id ? "Edit Integration" : "Add Integration"} onClose={() => setInteg(null)}>
          <Field label="Name" required><input value={integ.name} onChange={(e) => setInteg({ ...integ, name: e.target.value })} className={controlClass} />{e1("name")}</Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Type"><select value={integ.type} onChange={(e) => setInteg({ ...integ, type: e.target.value })} className={controlClass}><option value="API">API</option><option value="SAP">SAP</option><option value="DEVICE">Device</option><option value="OTHER">Other</option></select></Field>
            <Field label="Source" optional><input value={integ.source} onChange={(e) => setInteg({ ...integ, source: e.target.value })} className={controlClass} />{e1("source")}</Field>
            <Field label="Target" optional><input value={integ.target} onChange={(e) => setInteg({ ...integ, target: e.target.value })} className={controlClass} />{e1("target")}</Field>
          </div>
          <Field label="Health check URL" optional><input value={integ.endpoint} onChange={(e) => setInteg({ ...integ, endpoint: e.target.value })} placeholder="https://api.example.com/health" className={controlClass} />{e1("endpoint")}</Field>
          <p className="text-[10px] text-slate-500">With a URL, "Test connection" calls it and records the result. Private and local addresses can't be tested.</p>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setInteg(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void saveInteg()} disabled={busy}>Save</PrimaryButton></div>
        </Modal>
      )}

      {sec && (
        <Modal title={`Edit ${sec.row.label}`} onClose={() => setSec(null)}>
          {Object.keys(sec.values).map((k) => (
            <div key={k}>
              {k === "passwordMinLength" && <Field label="Minimum password length"><input type="number" min={6} max={32} value={sec.values[k]} onChange={(e) => setSec({ ...sec, values: { ...sec.values, [k]: e.target.value } })} className={controlClass} /></Field>}
              {k === "sessionTimeoutMinutes" && <Field label="Session timeout (minutes)"><input type="number" min={5} max={1440} value={sec.values[k]} onChange={(e) => setSec({ ...sec, values: { ...sec.values, [k]: e.target.value } })} className={controlClass} /></Field>}
              {(k === "mfaRequired" || k === "ssoEnabled") && <Field label={k === "mfaRequired" ? "Require MFA for admins" : "Enable single sign-on"}><Toggle checked={sec.values[k] === "true"} onChange={(v) => setSec({ ...sec, values: { ...sec.values, [k]: String(v) } })} label={sec.values[k] === "true" ? "On" : "Off"} /></Field>}
              {k === "ipAllowlist" && <Field label="Allowed IPs / ranges"><textarea rows={3} value={sec.values[k]} onChange={(e) => setSec({ ...sec, values: { ...sec.values, [k]: e.target.value } })} placeholder="203.0.113.5, 10.0.0.0/24 (empty = no restriction)" className={controlClass} /></Field>}
              {e1(k)}
            </div>
          ))}
          <p className="text-[10px] text-slate-500">Saved for the platform. It isn't enforced on sign-in yet.</p>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setSec(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void saveSec()} disabled={busy}>Save</PrimaryButton></div>
        </Modal>
      )}

      {backupOpen && (
        <Modal title="Run Backup" onClose={() => setBackupOpen(false)}>
          {([["FULL", "Full Backup", "All platform data and configuration"], ["DATABASE", "Database Backup", "Business data (institutions, users, students, finance…)"], ["CONFIGURATION", "Configuration Backup", "Settings, modules and catalog"]] as const).map(([k, l, d]) => (
            <label key={k} className="flex cursor-pointer items-start gap-3 rounded-lg border border-[#d8e9fb] p-3 text-[12px] text-[#17245e]"><input type="radio" name="bk" checked={backupType === k} onChange={() => setBackupType(k)} className="mt-0.5 h-4 w-4 accent-blue-600" /><span><span className="font-semibold">{l}</span><br /><span className="text-[11px] text-slate-500">{d}</span></span></label>
          ))}
          <p className="text-[10px] text-slate-500">Creates a ZIP of CSV files you can download. Passwords, secrets and file contents are left out.</p>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setBackupOpen(false)}>Cancel</OutlineButton><PrimaryButton onClick={() => void doBackup()} disabled={busy}>{busy ? "Running…" : "Run Backup"}</PrimaryButton></div>
        </Modal>
      )}
    </AdminLayout>
  );
}
