import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronLeft, ChevronRight, Lock, MoreVertical, Pencil, Plus, X } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api, session } from "../../services/api";
import type { Institution, UserDetail, UserActivity, UserRow, UserStatus, UserSummary } from "../../services/api";
import { Field, Notice, OutlineButton, Panel, PrimaryButton, SearchBox, controlClass, tdClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { Avatar, TempPassword, TypePill, UserStatusPill, UsersHeader, fmtDateTime, statusLabels, typeLabel, useRoles } from "./UserShared";
import { Pill } from "./TransportShared";

const tabs: readonly (readonly [string, string])[] = [["", "All Users"], ["STUDENT", "Students"], ["TEACHER", "Teachers"], ["PARENT", "Parents"], ["STAFF", "Staff"], ["ADMINISTRATOR", "Administrators"]];
const SIZE = 10;
const detailTabs = ["Overview", "Roles & Permissions", "Activity", "Audit Log"] as const;
type DetailTab = (typeof detailTabs)[number];

function pageList(page: number, pages: number): (number | "…")[] {
  if (pages <= 7) return Array.from({ length: pages }, (_, i) => i + 1);
  const out: (number | "…")[] = [1];
  if (page > 3) out.push("…");
  for (let p = Math.max(2, page - 1); p <= Math.min(pages - 1, page + 1); p++) out.push(p);
  if (page < pages - 2) out.push("…");
  out.push(pages);
  return out;
}

function Stat({ label, value, fresh, tone }: { label: string; value: number; fresh: number; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white px-4 py-3">
      <span className={`h-10 w-10 shrink-0 rounded-lg ${tone}`} />
      <div>
        <div className="text-[11px] text-slate-600">{label}</div>
        <div className="text-[22px] font-extrabold leading-6 text-[#101b69]">{value.toLocaleString("en-IN")}</div>
        <div className="text-[10px] font-semibold text-emerald-600">+{fresh.toLocaleString("en-IN")} this month</div>
      </div>
    </div>
  );
}

export default function Users() {
  const navigate = useNavigate();
  const isSuper = session.user()?.role === "SUPER_ADMIN";
  const { roles, modules, name: roleName } = useRoles();

  const [tab, setTab] = useState("");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [instFilter, setInstFilter] = useState<number | null>(null);
  const [status, setStatus] = useState("");
  const [role, setRole] = useState("");
  const [page, setPage] = useState(0);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [rows, setRows] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<UserSummary | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [temp, setTemp] = useState<{ who: string; password: string } | null>(null);
  const [menuId, setMenuId] = useState<number | null>(null);

  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("Overview");
  const [activity, setActivity] = useState<UserActivity[] | null>(null);

  useEffect(() => { const t = setTimeout(() => { setQ(search); setPage(0); }, 300); return () => clearTimeout(t); }, [search]);
  useEffect(() => {
    if (!isSuper) return;
    api.institutions.list({ status: "ALL" }).then((l) => setInstitutions(l.filter((i) => i.status !== "ARCHIVED"))).catch(() => { /* filter just stays empty */ });
  }, [isSuper]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, s] = await Promise.all([
        api.userAdmin.list({ type: tab, institutionId: instFilter, status, role, q, page, size: SIZE }),
        api.userAdmin.summary(instFilter),
      ]);
      setRows(p.items); setTotal(p.total); setSummary(s); setError("");
    } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [tab, instFilter, status, role, q, page]);
  useEffect(() => { void load(); }, [load]);

  const loadDetail = useCallback(async (id: number) => {
    try { setDetail(await api.userAdmin.get(id)); } catch (e) { setError(errText(e)); setSelectedId(null); }
  }, []);
  useEffect(() => { if (selectedId === null) { setDetail(null); return; } void loadDetail(selectedId); }, [selectedId, loadDetail]);
  useEffect(() => {
    setActivity(null);
    if (selectedId === null || (detailTab !== "Activity" && detailTab !== "Audit Log")) return;
    api.userAdmin.activity(selectedId, detailTab === "Activity" ? "ACTIVITY" : "AUDIT").then(setActivity).catch((e) => setError(errText(e)));
  }, [selectedId, detailTab]);

  async function changeStatus(id: number, name: string, next: UserStatus) {
    setMenuId(null);
    if (!window.confirm(`Set ${name} to ${statusLabels[next].toLowerCase()}?`)) return;
    try { await api.userAdmin.setStatus(id, next); setNotice(`${name} is now ${statusLabels[next].toLowerCase()}.`); setError(""); await load(); if (selectedId === id) await loadDetail(id); } catch (e) { setError(errText(e)); }
  }
  async function reset(id: number, name: string) {
    setMenuId(null);
    if (!window.confirm(`Generate a new password for ${name}? Their current password stops working.`)) return;
    try { const r = await api.userAdmin.resetPassword(id); if (r.temporaryPassword) setTemp({ who: name, password: r.temporaryPassword }); setNotice(""); setError(""); } catch (e) { setError(errText(e)); }
  }

  const pages = Math.max(1, Math.ceil(total / SIZE));
  const from = total === 0 ? 0 : page * SIZE + 1;
  const to = Math.min(total, (page + 1) * SIZE);
  const bt = summary?.byType ?? {};
  const nt = summary?.newThisMonth ?? {};

  const access = useMemo(() => {
    if (!detail) return [];
    const mine = roles.filter((r) => detail.roles.includes(r.code));
    return modules.map((m) => {
      const levels = mine.flatMap((r) => r.permissions.filter((p) => p.module === m).map((p) => p.level));
      return { module: m, level: levels.includes("MANAGE") ? "Manage" : levels.length ? "View" : "None" };
    });
  }, [detail, roles, modules]);

  return (
    <AdminLayout activeItem="Users">
      <div className="space-y-3">
        <UsersHeader title="Users" subtitle="Manage all users across institutions. Create, edit, deactivate users and manage their roles and access."
          right={<Link to="/users/new"><PrimaryButton type="button"><Plus size={14} /> Add User</PrimaryButton></Link>} />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Total Users" value={summary?.total ?? 0} fresh={nt.TOTAL ?? 0} tone="bg-blue-100" />
          <Stat label="Students" value={bt.STUDENT ?? 0} fresh={nt.STUDENT ?? 0} tone="bg-emerald-100" />
          <Stat label="Teachers" value={bt.TEACHER ?? 0} fresh={nt.TEACHER ?? 0} tone="bg-orange-100" />
          <Stat label="Parents" value={bt.PARENT ?? 0} fresh={nt.PARENT ?? 0} tone="bg-rose-100" />
          <Stat label="Staff / Admin" value={(bt.STAFF ?? 0) + (bt.ADMINISTRATOR ?? 0)} fresh={(nt.STAFF ?? 0) + (nt.ADMINISTRATOR ?? 0)} tone="bg-violet-100" />
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {temp && <TempPassword who={temp.who} password={temp.password} onClose={() => setTemp(null)} />}

        <div className={`grid gap-3 ${selectedId !== null ? "xl:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
          <Panel>
            <div className="overflow-x-auto px-4 pt-3">
              <div className="flex min-w-[560px] gap-1 border-b border-[#d8e9fb]">
                {tabs.map(([k, l]) => (
                  <button key={k || "all"} type="button" onClick={() => { setTab(k); setPage(0); }} aria-current={tab === k ? "page" : undefined}
                    className={`px-4 py-2 text-[11px] font-semibold ${tab === k ? "border-b-2 border-blue-600 text-blue-700" : "text-[#34467a] hover:text-blue-700"}`}>{l}</button>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3 px-4 py-3">
              <SearchBox value={search} onChange={setSearch} placeholder="Search by name, email, phone or ID..." />
              {isSuper && (
                <Field label="Institution" className="w-[170px]">
                  <select className={controlClass} value={instFilter ?? ""} onChange={(e) => { setInstFilter(e.target.value ? Number(e.target.value) : null); setPage(0); }}>
                    <option value="">All Institutions</option>{institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                  </select>
                </Field>
              )}
              <Field label="Status" className="w-[130px]">
                <select className={controlClass} value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }}>
                  <option value="">All Status</option>{(Object.keys(statusLabels) as UserStatus[]).map((s) => <option key={s} value={s}>{statusLabels[s]}</option>)}
                </select>
              </Field>
              <Field label="Role" className="w-[160px]">
                <select className={controlClass} value={role} onChange={(e) => { setRole(e.target.value); setPage(0); }}>
                  <option value="">All Roles</option>{roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                </select>
              </Field>
            </div>

            <div className="overflow-x-auto px-4">
              <table className="w-full min-w-[860px] border-collapse text-left text-[10px]">
                <thead><tr className="bg-[#f5f9ff] text-[#13205f]">{["#", "Name", "Email", "User Type", "Role(s)", ...(isSuper ? ["Institution"] : []), "Status", "Last Login", "Actions"].map((h) => <th key={h} className="border border-blue-100 px-2 py-2 font-bold">{h}</th>)}</tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={9} className="px-2 py-8 text-center text-slate-400">Loading...</td></tr>
                    : rows.length === 0 ? <tr><td colSpan={9} className="px-2 py-8 text-center text-slate-400">No users found.</td></tr>
                    : rows.map((u, i) => (
                      <tr key={u.id} onClick={() => { setSelectedId(u.id); setDetailTab("Overview"); }} className={`cursor-pointer hover:bg-blue-50/50 ${selectedId === u.id ? "bg-blue-50" : ""}`}>
                        <td className={tdClass}>{page * SIZE + i + 1}</td>
                        <td className={tdClass}><span className="flex items-center gap-2"><Avatar name={u.fullName} /><span className="font-semibold text-[#17245e]">{u.fullName}</span></span></td>
                        <td className={tdClass}>{u.email}</td>
                        <td className={tdClass}><TypePill type={u.userType} /></td>
                        <td className={tdClass}>{u.roles.length ? roleName(u.roles[0]) + (u.roles.length > 1 ? ` +${u.roles.length - 1}` : "") : "—"}</td>
                        {isSuper && <td className={tdClass}>{u.institutionName ?? "—"}</td>}
                        <td className={tdClass}><UserStatusPill status={u.status} /></td>
                        <td className={tdClass}>{fmtDateTime(u.lastLogin)}</td>
                        <td className={tdClass} onClick={(e) => e.stopPropagation()}>
                          <span className="relative inline-flex items-center gap-2.5">
                            <button type="button" aria-label={`Edit ${u.fullName}`} onClick={() => navigate(`/users/${u.id}/edit`)} className="text-[#152b70] hover:text-blue-600"><Pencil size={13} /></button>
                            <button type="button" aria-label={`Reset password for ${u.fullName}`} onClick={() => void reset(u.id, u.fullName)} className="text-[#152b70] hover:text-blue-600"><Lock size={13} /></button>
                            <button type="button" aria-label={`More actions for ${u.fullName}`} onClick={() => setMenuId(menuId === u.id ? null : u.id)} className="text-[#152b70] hover:text-blue-600"><MoreVertical size={13} /></button>
                            {menuId === u.id && (
                              <span className="absolute right-0 top-5 z-10 flex w-32 flex-col rounded-md border border-[#d8e9fb] bg-white py-1 text-left shadow-lg">
                                {(Object.keys(statusLabels) as UserStatus[]).filter((s) => s !== u.status).map((s) => (
                                  <button key={s} type="button" className="px-3 py-1.5 text-left text-[11px] text-[#17245e] hover:bg-blue-50" onClick={() => void changeStatus(u.id, u.fullName, s)}>Set {statusLabels[s].toLowerCase()}</button>
                                ))}
                              </span>
                            )}
                          </span>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[11px] text-blue-700">
              <span>Showing {from}-{to} of {total.toLocaleString("en-IN")}</span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => setPage(page - 1)} className="grid h-7 w-7 place-items-center rounded border border-blue-100 text-blue-600 disabled:opacity-40"><ChevronLeft size={13} /></button>
                {pageList(page + 1, pages).map((p, i) => p === "…" ? <span key={`e${i}`} className="px-1 text-slate-400">…</span> : (
                  <button key={p} type="button" onClick={() => setPage(p - 1)} className={`grid h-7 min-w-7 place-items-center rounded border px-1.5 text-[11px] font-semibold ${p === page + 1 ? "border-blue-600 bg-blue-600 text-white" : "border-blue-100 text-blue-700 hover:bg-blue-50"}`}>{p}</button>
                ))}
                <button type="button" aria-label="Next page" disabled={page + 1 >= pages} onClick={() => setPage(page + 1)} className="grid h-7 w-7 place-items-center rounded border border-blue-100 text-blue-600 disabled:opacity-40"><ChevronRight size={13} /></button>
              </div>
            </div>
          </Panel>

          {selectedId !== null && (
            <Panel className="h-fit">
              <div className="flex items-center justify-between px-4 pb-2 pt-3.5">
                <h2 className="text-[14px] font-extrabold text-[#101b69]">User Details</h2>
                <button type="button" aria-label="Close details" onClick={() => setSelectedId(null)} className="text-slate-500 hover:text-slate-900"><X size={16} /></button>
              </div>
              {!detail ? <p className="px-4 pb-6 text-[11px] text-slate-400">Loading...</p> : (
                <div className="space-y-3 px-4 pb-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={detail.fullName} size={56} />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2"><span className="text-[14px] font-extrabold text-[#101b69]">{detail.fullName}</span><UserStatusPill status={detail.status} /></div>
                      <div className="text-[11px] text-slate-600">{typeLabel(detail.userType)}{detail.roles[0] ? ` | ${roleName(detail.roles[0])}` : ""}</div>
                      <div className="text-[11px] text-slate-500">{detail.institutionName ?? "—"}</div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 border-b border-[#d8e9fb]">
                    {detailTabs.map((t) => <button key={t} type="button" onClick={() => setDetailTab(t)} className={`pb-1.5 text-[11px] font-semibold ${detailTab === t ? "border-b-2 border-blue-600 text-blue-700" : "text-[#34467a]"}`}>{t}</button>)}
                  </div>

                  {detailTab === "Overview" && (
                    <div className="space-y-4 text-[11px]">
                      <KV title="Contact Information" rows={[["Email", detail.email], ["Phone", `${detail.phoneCode} ${detail.phone}`], ["Location", [detail.city, detail.state].filter(Boolean).join(", ") || "—"]]} />
                      <KV title="Account Information" rows={[["User ID", detail.userCode], ["User Type", typeLabel(detail.userType)], ["Primary Role", detail.roles[0] ? roleName(detail.roles[0]) : "—"],
                        ["Additional Roles", detail.roles.slice(1).map(roleName).join(", ") || "—"], ["Status", statusLabels[detail.status]], ["Created On", fmtDateTime(detail.createdAt)], ["Last Login", fmtDateTime(detail.lastLogin)]]} />
                      <KV title="Institution" rows={[["Institution Name", detail.institutionName ?? "—"], ["Institution Code", detail.institutionCode ?? "—"], ["Institution Type", detail.institutionType ? detail.institutionType.replace("_", " ").toLowerCase().replace(/^./, (c) => c.toUpperCase()) : "—"]]} />
                    </div>
                  )}
                  {detailTab === "Roles & Permissions" && (
                    <div className="space-y-2 text-[11px]">
                      <div className="flex flex-wrap gap-1.5">{detail.roles.map((r, i) => <Pill key={r} tone={i === 0 ? "blue" : "gray"}>{roleName(r)}{i === 0 ? " (primary)" : ""}</Pill>)}</div>
                      <table className="w-full border-collapse text-[10px]"><tbody>{access.map((a) => (
                        <tr key={a.module}><td className="border border-blue-50 px-2 py-1.5 text-[#33477c]">{a.module}</td><td className="border border-blue-50 px-2 py-1.5"><Pill tone={a.level === "Manage" ? "green" : a.level === "View" ? "blue" : "gray"}>{a.level}</Pill></td></tr>
                      ))}</tbody></table>
                      <p className="text-[10px] text-slate-500">Shown for reference. What a user can open today follows their account type; per-module permissions are not enforced yet.</p>
                    </div>
                  )}
                  {(detailTab === "Activity" || detailTab === "Audit Log") && (
                    <ul className="space-y-2 text-[11px]">
                      {activity === null ? <li className="text-slate-400">Loading...</li> : activity.length === 0 ? <li className="text-slate-400">Nothing recorded yet.</li> : activity.map((a, i) => (
                        <li key={i} className="rounded border border-[#e1ecfa] px-2.5 py-1.5"><div className="font-semibold text-[#17245e]">{a.description}</div><div className="text-[10px] text-slate-500">{fmtDateTime(a.at)}{a.actor ? ` · ${a.actor}` : ""}</div></li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap gap-2 pt-1">
                    <OutlineButton type="button" onClick={() => void reset(detail.id, detail.fullName)}>Reset Password</OutlineButton>
                    {detail.status === "ACTIVE"
                      ? <button type="button" onClick={() => void changeStatus(detail.id, detail.fullName, "INACTIVE")} className="rounded-md border border-rose-300 px-3 py-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">Deactivate</button>
                      : <OutlineButton type="button" onClick={() => void changeStatus(detail.id, detail.fullName, "ACTIVE")}>Activate</OutlineButton>}
                    <PrimaryButton type="button" onClick={() => navigate(`/users/${detail.id}/edit`)}>Edit User</PrimaryButton>
                  </div>
                </div>
              )}
            </Panel>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}

function KV({ title, rows }: { title: string; rows: (readonly [string, string])[] }) {
  return (
    <div>
      <div className="mb-1.5 text-[12px] font-extrabold text-[#101b69]">{title}</div>
      <dl className="space-y-1">{rows.map(([k, v]) => <div key={k} className="grid grid-cols-[110px_1fr] gap-2"><dt className="text-slate-500">{k}</dt><dd className="break-words text-[#17245e]">{v}</dd></div>)}</dl>
    </div>
  );
}

