import { useCallback, useEffect, useMemo, useState } from "react";
import { Briefcase, CalendarOff, GraduationCap, Plus, UserCheck, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../services/api";
import type { SfAppraisal, SfApplicant, SfCycle, SfDept, SfLeave, SfOptions, SfOverview, SfStaff, SfTraining, SfVacancy } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout from "./SchoolLayout";
import { FieldErr, Kpi, Tabs, fieldErrs, shortDay, t12, tint } from "./DeskShared";
import { Item, Menu, Modal, Pager, Table, td } from "./SchoolUi";

const TABS = ["Overview", "Staff Directory", "Leave Management", "Performance", "Training & Development", "Recruitment"] as const;
type Tab = (typeof TABS)[number];
const LV: Record<string, [string, string]> = { PENDING: ["Pending", "bg-amber-100 text-amber-800"], APPROVED: ["Approved", "bg-emerald-100 text-emerald-700"], REJECTED: ["Rejected", "bg-rose-100 text-rose-700"], CANCELLED: ["Cancelled", "bg-slate-100 text-slate-600"] };
const AP: Record<string, [string, string]> = { NOT_STARTED: ["Not Started", "bg-slate-100 text-slate-600"], IN_PROGRESS: ["In Progress", "bg-amber-100 text-amber-800"], COMPLETED: ["Completed", "bg-emerald-100 text-emerald-700"] };
const TR: Record<string, [string, string]> = { SCHEDULED: ["Scheduled", "bg-sky-100 text-sky-700"], COMPLETED: ["Completed", "bg-emerald-100 text-emerald-700"], CANCELLED: ["Cancelled", "bg-slate-100 text-slate-600"] };
const VC: Record<string, [string, string]> = { OPEN: ["Open", "bg-emerald-100 text-emerald-700"], CLOSED: ["Closed", "bg-slate-100 text-slate-600"] };
const AS: Record<string, [string, string]> = { APPLIED: ["Applied", "bg-sky-100 text-sky-700"], SHORTLISTED: ["Shortlisted", "bg-amber-100 text-amber-800"], REJECTED: ["Rejected", "bg-rose-100 text-rose-700"], HIRED: ["Hired", "bg-emerald-100 text-emerald-700"] };
const SA: Record<string, [string, string]> = { true: ["Active", "bg-emerald-100 text-emerald-700"], false: ["Inactive", "bg-slate-100 text-slate-600"] };

type Ctx = { opts: SfOptions; flash: (m: string) => void; onError: (m: string) => void; go: (t: Tab) => void; refreshOpts: () => void };

function Actions({ onCancel, onSave, busy, label }: { onCancel: () => void; onSave: () => void; busy: boolean; label: string }) {
  return <div className="flex justify-end gap-2"><OutlineButton type="button" onClick={onCancel}>Cancel</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={onSave}>{busy ? "Saving…" : label}</PrimaryButton></div>;
}

// ------------------------------------------------------------------ staff form
function StaffForm({ c, staff, onClose, onSaved }: { c: Ctx; staff: SfStaff | null; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({ fullName: staff?.name ?? "", email: staff?.email ?? "", phone: staff?.phone ?? "", departmentId: staff?.departmentId ?? null as number | null, designation: staff?.designation ?? "", staffType: staff?.staffType ?? "", joiningDate: staff?.joiningDate ?? c.opts.today });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => {
    setBusy(true); setErrs({});
    try { if (staff) await api.schoolStaff.update(staff.id, f); else { const r = await api.schoolStaff.create(f); onSaved(`Staff added with ID ${r.code}.`); return; } onSaved("Staff updated."); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={staff ? `Edit ${staff.code}` : "Add Staff"} wide onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Full Name" required><input value={f.fullName} maxLength={200} onChange={(e) => setF({ ...f, fullName: e.target.value })} placeholder="Enter full name" className={controlClass} /><FieldErr errs={errs} k="fullName" /></Field>
        <Field label="Work Email" required><input type="email" value={f.email} maxLength={200} onChange={(e) => setF({ ...f, email: e.target.value })} placeholder="Enter work email" className={controlClass} /><FieldErr errs={errs} k="email" /></Field>
        <Field label="Phone" optional><input value={f.phone} maxLength={30} onChange={(e) => setF({ ...f, phone: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="phone" /></Field>
        <Field label="Department" required><select value={f.departmentId ?? ""} onChange={(e) => setF({ ...f, departmentId: e.target.value ? Number(e.target.value) : null })} className={controlClass}><option value="">Select department</option>{c.opts.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select><FieldErr errs={errs} k="departmentId" /></Field>
        <Field label="Staff Type" required><select value={f.staffType} onChange={(e) => setF({ ...f, staffType: e.target.value, designation: "" })} className={controlClass}><option value="">Select staff type</option>{c.opts.staffTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select><FieldErr errs={errs} k="staffType" /></Field>
        <Field label="Designation" required><select value={f.designation} disabled={!f.staffType} onChange={(e) => setF({ ...f, designation: e.target.value })} className={controlClass}><option value="">{f.staffType ? "Select designation" : "Choose a staff type first"}</option>{c.opts.designations.filter((d) => d.staffType === f.staffType).map((d) => <option key={d.name} value={d.name}>{d.name}</option>)}</select><FieldErr errs={errs} k="designation" /></Field>
        <Field label="Joining Date" required><input type="date" value={f.joiningDate} onChange={(e) => setF({ ...f, joiningDate: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="joiningDate" /></Field>
      </div>
      {c.opts.departments.length === 0 && <Notice tone="info">There are no departments yet. Close this and use Department Management on the Overview tab first.</Notice>}
      <p className="text-[11px] text-slate-500">This adds the person to the staff list. It doesn't create a login; sign-in accounts are managed in Settings.</p>
      <Actions onCancel={onClose} onSave={() => void save()} busy={busy} label={staff ? "Save Changes" : "Save Staff"} />
    </Modal>
  );
}

// ------------------------------------------------------------------ departments
function DeptModal({ c, onClose }: { c: Ctx; onClose: () => void }) {
  const [rows, setRows] = useState<SfDept[] | null>(null);
  const [edit, setEdit] = useState<{ id: number | null; name: string; headId: number | null } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const load = useCallback(() => { api.schoolStaff.departments().then(setRows).catch((e) => c.onError(errText(e))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  const save = async () => {
    if (!edit) return; setErrs({});
    try { if (edit.id === null) await api.schoolStaff.addDept({ name: edit.name, headId: edit.headId }); else await api.schoolStaff.updateDept(edit.id, { name: edit.name, headId: edit.headId }); setEdit(null); load(); c.refreshOpts(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); }
  };
  const del = async (d: SfDept) => { if (!window.confirm(`Delete the department "${d.name}"?`)) return; try { await api.schoolStaff.deleteDept(d.id); load(); c.refreshOpts(); } catch (e) { c.onError(errText(e)); } };
  return (
    <Modal title="Department Management" wide onClose={onClose}>
      <div className="flex justify-end"><PrimaryButton type="button" onClick={() => { setErrs({}); setEdit({ id: null, name: "", headId: null }); }}><Plus size={14} />Add Department</PrimaryButton></div>
      {edit && (
        <div className="grid gap-3 rounded-lg border border-[#cfe0f6] bg-[#fbfdff] p-3 sm:grid-cols-[1fr_1fr_auto]">
          <Field label="Name" required><input value={edit.name} maxLength={80} onChange={(e) => setEdit({ ...edit, name: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="name" /></Field>
          <Field label="Head of Department" optional><select value={edit.headId ?? ""} onChange={(e) => setEdit({ ...edit, headId: e.target.value ? Number(e.target.value) : null })} className={controlClass}><option value="">None</option>{c.opts.staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><FieldErr errs={errs} k="headId" /></Field>
          <div className="flex items-end gap-2"><OutlineButton type="button" onClick={() => setEdit(null)}>Cancel</OutlineButton><PrimaryButton type="button" onClick={() => void save()}>Save</PrimaryButton></div>
        </div>
      )}
      <Table heads={["Department", "Head", "Staff", ""]} colSpan={4} empty={rows && rows.length === 0 ? "No departments yet." : !rows ? "Loading…" : undefined}>
        {rows?.map((d) => <tr key={d.id}><td className={td}>{d.name}</td><td className={td}>{d.head ?? "—"}</td><td className={td}>{d.staff}</td><td className={td}><button type="button" className="mr-3 text-[12px] font-semibold text-blue-600" onClick={() => { setErrs({}); setEdit({ id: d.id, name: d.name, headId: d.headId }); }}>Edit</button><button type="button" className="text-[12px] font-semibold text-rose-600" onClick={() => void del(d)}>Delete</button></td></tr>)}
      </Table>
      <p className="text-[11px] text-slate-500">The head of a department becomes the default reviewer when an appraisal cycle starts.</p>
    </Modal>
  );
}

// ------------------------------------------------------------------ overview
function OverviewTab({ c, bump }: { c: Ctx; bump: number }) {
  const [ov, setOv] = useState<SfOverview | null>(null);
  const [add, setAdd] = useState(false);
  const [dept, setDept] = useState(false);
  const [n, setN] = useState(0);
  useEffect(() => { api.schoolStaff.overview().then(setOv).catch((e) => c.onError(errText(e))); }, [bump, n]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={<Users size={26} className="text-blue-600" />} value={ov?.total ?? "–"} label="Total Staff" tone="bg-sky-50" />
        <Kpi icon={<GraduationCap size={26} className="text-emerald-600" />} value={ov?.teaching ?? "–"} label="Teaching" tone="bg-emerald-50" />
        <Kpi icon={<Briefcase size={26} className="text-violet-600" />} value={ov?.nonTeaching ?? "–"} label="Non-Teaching" tone="bg-violet-50" />
        <Kpi icon={<CalendarOff size={26} className="text-orange-500" />} value={ov?.onLeave ?? "–"} label="On Leave Today" tone="bg-orange-50" />
      </div>
      <div className="grid gap-5 lg:grid-cols-[1fr_240px]">
        <div>
          <h3 className="mb-2 text-[16px] font-extrabold text-[#101b69]">Upcoming Leave</h3>
          <Table heads={["Staff", "Leave Type", "From", "To", "Status"]} colSpan={5} empty={ov && ov.upcoming.length === 0 ? "No upcoming leave." : !ov ? "Loading…" : undefined}>
            {ov?.upcoming.map((l) => <tr key={l.id}><td className={td}>{l.staff}</td><td className={td}>{l.typeLabel}</td><td className={td}>{shortDay(l.from)}</td><td className={td}>{shortDay(l.to)}</td><td className={td}>{tint(LV, l.status)}</td></tr>)}
          </Table>
        </div>
        <div className="space-y-3 pt-8">
          <PrimaryButton type="button" className="w-full justify-center" onClick={() => setAdd(true)}><Plus size={14} />Add Staff</PrimaryButton>
          <OutlineButton type="button" className="w-full justify-center" onClick={() => setDept(true)}>Department Management</OutlineButton>
        </div>
      </div>
      {add && <StaffForm c={c} staff={null} onClose={() => setAdd(false)} onSaved={(m) => { setAdd(false); c.flash(m); c.refreshOpts(); setN((x) => x + 1); }} />}
      {dept && <DeptModal c={c} onClose={() => { setDept(false); setN((x) => x + 1); }} />}
    </div>
  );
}

// ------------------------------------------------------------------ directory
function DirectoryTab({ c }: { c: Ctx }) {
  const [q, setQ] = useState(""), [dq, setDq] = useState("");
  const [dept, setDept] = useState<number | null>(null);
  const [type, setType] = useState(""), [status, setStatus] = useState("ACTIVE");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ items: SfStaff[]; total: number } | null>(null);
  const [form, setForm] = useState<{ staff: SfStaff | null } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const size = 10;
  useEffect(() => { const t = setTimeout(() => { setDq(q); setPage(0); }, 300); return () => clearTimeout(t); }, [q]);
  const load = useCallback(() => { api.schoolStaff.directory({ q: dq, departmentId: dept, type, status, page, size }).then(setData).catch((e) => c.onError(errText(e))); }, [dq, dept, type, status, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  const toggle = async (s: SfStaff) => {
    if (s.active && !window.confirm(`Deactivate ${s.name}? They stay on record but are removed from active lists.`)) return;
    try { await api.schoolStaff.setActive(s.id, !s.active); c.flash(s.active ? "Staff deactivated." : "Staff reactivated."); c.refreshOpts(); load(); } catch (e) { c.onError(errText(e)); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Search" className="w-60"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search staff by name or ID" className={controlClass} /></Field>
        <Field label="Department" className="w-44"><select value={dept ?? ""} onChange={(e) => { setDept(e.target.value ? Number(e.target.value) : null); setPage(0); }} className={controlClass}><option value="">All</option>{c.opts.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        <Field label="Staff Type" className="w-40"><select value={type} onChange={(e) => { setType(e.target.value); setPage(0); }} className={controlClass}><option value="">All</option>{c.opts.staffTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select></Field>
        <Field label="Status" className="w-36"><select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className={controlClass}><option value="">All</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field>
        <PrimaryButton type="button" className="ml-auto" onClick={() => setForm({ staff: null })}><Plus size={14} />Add Staff</PrimaryButton>
      </div>
      <Table heads={["Staff ID", "Name", "Department", "Role", "Status", ""]} colSpan={6} empty={data && data.items.length === 0 ? "No staff match these filters." : !data ? "Loading…" : undefined}>
        {data?.items.map((s) => (
          <tr key={s.id}><td className={td}>{s.code}</td><td className={td}>{s.name}<div className="text-[11px] text-slate-500">{s.email ?? ""}</div></td><td className={td}>{s.department ?? "—"}</td><td className={td}>{s.designation ?? s.typeLabel}</td>
            <td className={td}>{tint(SA, String(s.active))}{s.onLeave && <span className="ml-1 rounded-md bg-yellow-100 px-2 py-1 text-[10px] font-semibold text-yellow-800">On leave</span>}</td>
            <td className={td}><Menu id={`s${s.id}`} open={menu} setOpen={setMenu}><Item onClick={() => setForm({ staff: s })}>Edit</Item><Item danger={s.active} onClick={() => void toggle(s)}>{s.active ? "Deactivate" : "Reactivate"}</Item></Menu></td></tr>
        ))}
      </Table>
      <Pager page={page} size={size} total={data?.total ?? 0} set={setPage} />
      {form && <StaffForm c={c} staff={form.staff} onClose={() => setForm(null)} onSaved={(m) => { setForm(null); c.flash(m); c.refreshOpts(); load(); }} />}
    </div>
  );
}

// ------------------------------------------------------------------ leave
function LeaveTab({ c }: { c: Ctx }) {
  const [from, setFrom] = useState(`${c.opts.today.slice(0, 8)}01`);
  const [to, setTo] = useState(() => { const d = new Date(Number(c.opts.today.slice(0, 4)), Number(c.opts.today.slice(5, 7)), 0); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; });
  const [status, setStatus] = useState("");
  const [rows, setRows] = useState<SfLeave[] | null>(null);
  const [review, setReview] = useState<SfLeave | null>(null);
  const [add, setAdd] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const load = useCallback(() => { api.schoolStaff.leaves(from, to, status).then(setRows).catch((e) => c.onError(errText(e))); }, [from, to, status]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setRows(null); load(); }, [load]);
  const act = async (l: SfLeave, a: "approve" | "reject" | "cancel", ok: string) => { setBusy(true); try { await api.schoolStaff.decide(l.id, a); c.flash(ok); setReview(null); load(); } catch (e) { c.onError(errText(e)); } finally { setBusy(false); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From" className="w-40"><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={controlClass} /></Field>
        <Field label="To" className="w-40"><input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className={controlClass} /></Field>
        <Field label="Status" className="w-40"><select value={status} onChange={(e) => setStatus(e.target.value)} className={controlClass}><option value="">All</option>{Object.entries(LV).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select></Field>
        <PrimaryButton type="button" className="ml-auto" onClick={() => setAdd(true)}><Plus size={14} />Record Leave</PrimaryButton>
      </div>
      <Table heads={["Staff", "Leave Type", "From", "To", "Status", ""]} colSpan={6} empty={rows && rows.length === 0 ? "No leave in this range." : !rows ? "Loading…" : undefined}>
        {rows?.map((l) => (
          <tr key={l.id}><td className={td}>{l.staff}<div className="text-[11px] text-slate-500">{l.code}</div></td><td className={td}>{l.typeLabel}</td><td className={td}>{shortDay(l.from)}</td><td className={td}>{shortDay(l.to)}</td><td className={td}>{tint(LV, l.status)}</td>
            <td className={td}>{l.status === "PENDING" ? <button type="button" onClick={() => setReview(l)} className="rounded-md border border-blue-400 px-4 py-1 text-[12px] font-semibold text-blue-600 hover:bg-blue-50">Review</button>
              : l.status === "APPROVED" ? <Menu id={`l${l.id}`} open={menu} setOpen={setMenu}><Item danger onClick={() => { if (window.confirm("Cancel this approved leave?")) void act(l, "cancel", "Leave cancelled."); }}>Cancel leave</Item></Menu> : null}</td></tr>
        ))}
      </Table>
      {review && (
        <Modal title="Review Leave" onClose={() => setReview(null)}>
          <dl className="grid grid-cols-[100px_1fr] gap-y-1.5 text-[13px]"><dt className="text-slate-500">Staff</dt><dd>{review.staff} ({review.code})</dd><dt className="text-slate-500">Type</dt><dd>{review.typeLabel}</dd><dt className="text-slate-500">Dates</dt><dd>{shortDay(review.from)} – {shortDay(review.to)} ({review.days} day{review.days === 1 ? "" : "s"})</dd><dt className="text-slate-500">Reason</dt><dd>{review.reason ?? "—"}</dd></dl>
          <div className="flex justify-end gap-2"><OutlineButton type="button" disabled={busy} onClick={() => void act(review, "reject", "Leave rejected.")}>Reject</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={() => void act(review, "approve", "Leave approved.")}>Approve</PrimaryButton></div>
        </Modal>
      )}
      {add && <LeaveForm c={c} onClose={() => setAdd(false)} onSaved={() => { setAdd(false); c.flash("Leave recorded and waiting for review."); load(); }} />}
    </div>
  );
}
function LeaveForm({ c, onClose, onSaved }: { c: Ctx; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ teacherId: null as number | null, type: "CASUAL", from: c.opts.today, to: c.opts.today, reason: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setErrs({}); try { await api.schoolStaff.addLeave(f); onSaved(); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); } };
  return (
    <Modal title="Record Staff Leave" onClose={onClose}>
      <Field label="Staff" required><select value={f.teacherId ?? ""} onChange={(e) => setF({ ...f, teacherId: e.target.value ? Number(e.target.value) : null })} className={controlClass}><option value="">Select staff</option>{c.opts.staff.filter((s) => s.active).map((s) => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}</select><FieldErr errs={errs} k="teacherId" /></Field>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Leave Type" required><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={controlClass}>{c.opts.leaveTypes.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}</select><FieldErr errs={errs} k="type" /></Field>
        <Field label="From" required><input type="date" value={f.from} onChange={(e) => setF({ ...f, from: e.target.value, to: f.to < e.target.value ? e.target.value : f.to })} className={controlClass} /><FieldErr errs={errs} k="from" /></Field>
        <Field label="To" required><input type="date" value={f.to} min={f.from} onChange={(e) => setF({ ...f, to: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="to" /></Field>
      </div>
      <Field label="Reason" optional><input value={f.reason} maxLength={300} onChange={(e) => setF({ ...f, reason: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="reason" /></Field>
      <Actions onCancel={onClose} onSave={() => void save()} busy={busy} label="Submit for Review" />
    </Modal>
  );
}

// ------------------------------------------------------------------ performance
function AppraisalModal({ c, a, onClose, onSaved }: { c: Ctx; a: SfAppraisal; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ reviewerId: a.reviewerId, dueDate: a.dueDate, status: a.status, rating: a.rating === null ? "" : String(a.rating), comments: a.comments ?? "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setErrs({}); try { await api.schoolStaff.updateAppraisal(a.id, { reviewerId: f.reviewerId, dueDate: f.dueDate, status: f.status, rating: f.rating === "" ? null : Number(f.rating), comments: f.comments }); onSaved(); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); } };
  return (
    <Modal title={`Appraisal – ${a.staff}`} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Reviewer" optional><select value={f.reviewerId ?? ""} onChange={(e) => setF({ ...f, reviewerId: e.target.value ? Number(e.target.value) : null })} className={controlClass}><option value="">Not assigned</option>{c.opts.staff.filter((s) => s.active && s.id !== a.teacherId).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><FieldErr errs={errs} k="reviewerId" /></Field>
        <Field label="Due Date" required><input type="date" value={f.dueDate} onChange={(e) => setF({ ...f, dueDate: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="dueDate" /></Field>
        <Field label="Status" required><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={controlClass}>{Object.entries(AP).map(([k, v]) => <option key={k} value={k}>{v[0]}</option>)}</select><FieldErr errs={errs} k="status" /></Field>
        <Field label="Rating (1–5)" optional><input type="number" min={1} max={5} step={0.5} value={f.rating} onChange={(e) => setF({ ...f, rating: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="rating" /></Field>
      </div>
      <Field label="Comments" optional><textarea value={f.comments} maxLength={1000} rows={3} onChange={(e) => setF({ ...f, comments: e.target.value })} className={`${controlClass} h-auto py-2`} /><FieldErr errs={errs} k="comments" /></Field>
      <Actions onCancel={onClose} onSave={() => void save()} busy={busy} label="Save" />
    </Modal>
  );
}

function PerformanceTab({ c }: { c: Ctx }) {
  const [cycles, setCycles] = useState<SfCycle[] | null>(null);
  const [cycleId, setCycleId] = useState<number | null>(null);
  const [dept, setDept] = useState<number | null>(null);
  const [rows, setRows] = useState<SfAppraisal[] | null>(null);
  const [edit, setEdit] = useState<SfAppraisal | null>(null);
  const [start, setStart] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const loadCycles = useCallback((pick?: number) => { api.schoolStaff.cycles().then((l) => { setCycles(l); setCycleId((cur) => (pick ?? (l.some((x) => x.id === cur) ? cur : l[0]?.id ?? null))); }).catch((e) => c.onError(errText(e))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => loadCycles(), [loadCycles]);
  const load = useCallback(() => { if (cycleId === null) { setRows([]); return; } api.schoolStaff.appraisals(cycleId, dept).then(setRows).catch((e) => c.onError(errText(e))); }, [cycleId, dept]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setRows(null); load(); }, [load]);
  const cur = cycles?.find((x) => x.id === cycleId) ?? null;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Appraisal Cycle" className="w-48"><select value={cycleId ?? ""} onChange={(e) => setCycleId(e.target.value ? Number(e.target.value) : null)} className={controlClass}>{cycles && cycles.length === 0 && <option value="">No cycles yet</option>}{cycles?.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Department" className="w-48"><select value={dept ?? ""} onChange={(e) => setDept(e.target.value ? Number(e.target.value) : null)} className={controlClass}><option value="">All</option>{c.opts.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></Field>
        {cur && <span className="pb-2 text-[12px] text-slate-600">{cur.completed} of {cur.total} completed{" · "}<Menu id="cy" open={menu} setOpen={setMenu}><Item danger onClick={() => { if (window.confirm(`Delete the cycle "${cur.name}"? This only works while no appraisal has started.`)) void api.schoolStaff.deleteCycle(cur.id).then(() => { c.flash("Cycle deleted."); loadCycles(); }).catch((e) => c.onError(errText(e))); }}>Delete cycle</Item></Menu></span>}
        <PrimaryButton type="button" className="ml-auto" onClick={() => setStart(true)}>Start Appraisal Cycle</PrimaryButton>
      </div>
      <Table heads={["Staff", "Reviewer", "Due Date", "Status", "Rating", ""]} colSpan={6} empty={rows && rows.length === 0 ? (cycleId === null ? "Start an appraisal cycle to begin." : "No appraisals match this filter.") : !rows ? "Loading…" : undefined}>
        {rows?.map((a) => <tr key={a.id}><td className={td}>{a.staff}<div className="text-[11px] text-slate-500">{a.department ?? ""}</div></td><td className={td}>{a.reviewer ?? "—"}</td><td className={td}>{shortDay(a.dueDate)}</td><td className={td}>{tint(AP, a.status)}</td><td className={td}>{a.rating ?? "—"}</td><td className={td}><button type="button" onClick={() => setEdit(a)} className="text-[12px] font-semibold text-blue-600">Update</button></td></tr>)}
      </Table>
      <p className="text-[11px] text-slate-500">An appraisal here records the reviewer, rating and comments. There are no appraisal forms or self-reviews.</p>
      {edit && <AppraisalModal c={c} a={edit} onClose={() => setEdit(null)} onSaved={() => { setEdit(null); c.flash("Appraisal updated."); load(); loadCycles(); }} />}
      {start && <CycleModal c={c} onClose={() => setStart(false)} onSaved={(id, n) => { setStart(false); c.flash(`Cycle started for ${n} staff.`); loadCycles(id); }} />}
    </div>
  );
}
function CycleModal({ c, onClose, onSaved }: { c: Ctx; onClose: () => void; onSaved: (id: number, n: number) => void }) {
  const d = new Date(c.opts.today + "T00:00:00");
  const [f, setF] = useState({ name: d.toLocaleDateString("en-IN", { month: "short", year: "numeric" }), dueDate: "", departmentId: null as number | null });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setErrs({}); try { const r = await api.schoolStaff.startCycle(f); onSaved(r.id, r.created); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); } };
  return (
    <Modal title="Start Appraisal Cycle" onClose={onClose}>
      <Field label="Cycle name" required><input value={f.name} maxLength={60} onChange={(e) => setF({ ...f, name: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="name" /></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Due date" required><input type="date" value={f.dueDate} min={c.opts.today} onChange={(e) => setF({ ...f, dueDate: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="dueDate" /></Field>
        <Field label="Department" optional><select value={f.departmentId ?? ""} onChange={(e) => setF({ ...f, departmentId: e.target.value ? Number(e.target.value) : null })} className={controlClass}><option value="">All departments</option>{c.opts.departments.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select><FieldErr errs={errs} k="departmentId" /></Field>
      </div>
      <p className="text-[11px] text-slate-500">One appraisal is created for every active staff member in scope. The department head is the default reviewer.</p>
      <Actions onCancel={onClose} onSave={() => void save()} busy={busy} label="Start Cycle" />
    </Modal>
  );
}

// ------------------------------------------------------------------ training
function TrainingModal({ c, t, onClose, onSaved }: { c: Ctx; t: SfTraining | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ title: t?.title ?? "", date: t?.date ?? c.opts.today, time: t?.time ?? "", venue: t?.venue ?? "", trainer: t?.trainer ?? "", description: t?.description ?? "", teacherIds: t?.teacherIds ?? [] as number[] });
  const [dept, setDept] = useState<number | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const pool = useMemo(() => c.opts.staff.filter((s) => s.active && (dept === null || s.departmentId === dept)), [c.opts.staff, dept]);
  const toggle = (id: number) => setF((x) => ({ ...x, teacherIds: x.teacherIds.includes(id) ? x.teacherIds.filter((i) => i !== id) : [...x.teacherIds, id] }));
  const save = async () => { setBusy(true); setErrs({}); try { if (t) await api.schoolStaff.updateTraining(t.id, f); else await api.schoolStaff.addTraining(f); onSaved(); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); } };
  return (
    <Modal title={t ? "Edit Training" : "Schedule Training"} wide onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Programme" required className="sm:col-span-3"><input value={f.title} maxLength={150} onChange={(e) => setF({ ...f, title: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="title" /></Field>
        <Field label="Date" required><input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="date" /></Field>
        <Field label="Start time" optional><input type="time" value={f.time} onChange={(e) => setF({ ...f, time: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="time" /></Field>
        <Field label="Venue" optional><input value={f.venue} maxLength={100} onChange={(e) => setF({ ...f, venue: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="venue" /></Field>
        <Field label="Trainer" optional><input value={f.trainer} maxLength={100} onChange={(e) => setF({ ...f, trainer: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="trainer" /></Field>
        <Field label="Notes" optional className="sm:col-span-2"><input value={f.description} maxLength={500} onChange={(e) => setF({ ...f, description: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="description" /></Field>
      </div>
      <div>
        <div className="mb-1 flex flex-wrap items-center gap-2 text-[12px] font-semibold text-[#13205f]">Participants ({f.teacherIds.length})
          <select aria-label="Filter by department" value={dept ?? ""} onChange={(e) => setDept(e.target.value ? Number(e.target.value) : null)} className="h-8 rounded border border-[#cfe0f6] px-2 text-[12px] font-normal"><option value="">All departments</option>{c.opts.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
          <button type="button" className="font-normal text-blue-600" onClick={() => setF((x) => ({ ...x, teacherIds: [...new Set([...x.teacherIds, ...pool.map((s) => s.id)])] }))}>Select shown</button>
          <button type="button" className="font-normal text-blue-600" onClick={() => setF((x) => ({ ...x, teacherIds: x.teacherIds.filter((i) => !pool.some((s) => s.id === i)) }))}>Clear shown</button></div>
        <div className="grid max-h-44 gap-1 overflow-auto rounded-lg border border-[#cfe0f6] p-2 sm:grid-cols-2">{pool.map((s) => <label key={s.id} className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={f.teacherIds.includes(s.id)} onChange={() => toggle(s.id)} />{s.name} <span className="text-slate-400">{s.code}</span></label>)}{pool.length === 0 && <p className="text-[12px] text-slate-500">No staff to show.</p>}</div>
        <FieldErr errs={errs} k="teacherIds" />
      </div>
      <Actions onCancel={onClose} onSave={() => void save()} busy={busy} label={t ? "Save Changes" : "Schedule"} />
    </Modal>
  );
}
function TrainingTab({ c }: { c: Ctx }) {
  const [rows, setRows] = useState<SfTraining[] | null>(null);
  const [form, setForm] = useState<{ t: SfTraining | null } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const load = useCallback(() => { api.schoolStaff.trainings().then(setRows).catch((e) => c.onError(errText(e))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); c.flash(ok); load(); } catch (e) { c.onError(errText(e)); } };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><PrimaryButton type="button" onClick={() => setForm({ t: null })}><Plus size={14} />Schedule Training</PrimaryButton></div>
      <Table heads={["Program", "Date", "Participants", "Status", ""]} colSpan={5} empty={rows && rows.length === 0 ? "No trainings scheduled yet." : !rows ? "Loading…" : undefined}>
        {rows?.map((t) => (
          <tr key={t.id}><td className={td}>{t.title}<div className="text-[11px] text-slate-500">{[t.trainer, t.venue].filter(Boolean).join(" · ")}</div></td><td className={td}>{shortDay(t.date)}{t.time ? ` · ${t12(t.time)}` : ""}</td><td className={td}>{t.participants}</td><td className={td}>{tint(TR, t.status)}</td>
            <td className={td}><Menu id={`t${t.id}`} open={menu} setOpen={setMenu}><Item onClick={() => setForm({ t })}>Edit</Item>{t.status === "CANCELLED" ? <Item onClick={() => void run(() => api.schoolStaff.cancelTraining(t.id, false), "Training restored.")}>Restore</Item> : <Item onClick={() => void run(() => api.schoolStaff.cancelTraining(t.id, true), "Training cancelled.")}>Cancel training</Item>}<Item danger onClick={() => { if (window.confirm(`Delete "${t.title}"?`)) void run(() => api.schoolStaff.deleteTraining(t.id), "Training deleted."); }}>Delete</Item></Menu></td></tr>
        ))}
      </Table>
      <p className="text-[11px] text-slate-500">Status follows the date: scheduled until the day has passed, then completed. Attendance at a session isn't recorded and participants aren't notified.</p>
      {form && <TrainingModal c={c} t={form.t} onClose={() => setForm(null)} onSaved={() => { setForm(null); c.flash(form.t ? "Training updated." : "Training scheduled."); load(); }} />}
    </div>
  );
}

// ------------------------------------------------------------------ recruitment
function VacancyModal({ c, v, onClose, onSaved }: { c: Ctx; v: SfVacancy | null; onClose: () => void; onSaved: () => void }) {
  const [f, setF] = useState({ position: v?.position ?? "", departmentId: v?.departmentId ?? null as number | null, openings: String(v?.openings ?? 1), description: v?.description ?? "", closingDate: v?.closingDate ?? "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setErrs({}); const b = { ...f, openings: f.openings === "" ? null : Number(f.openings) }; try { if (v) await api.schoolStaff.updateVacancy(v.id, b); else await api.schoolStaff.addVacancy(b); onSaved(); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); } };
  return (
    <Modal title={v ? "Edit Vacancy" : "Add Vacancy"} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Position" required><input value={f.position} maxLength={100} onChange={(e) => setF({ ...f, position: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="position" /></Field>
        <Field label="Department" required><select value={f.departmentId ?? ""} onChange={(e) => setF({ ...f, departmentId: e.target.value ? Number(e.target.value) : null })} className={controlClass}><option value="">Select department</option>{c.opts.departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select><FieldErr errs={errs} k="departmentId" /></Field>
        <Field label="Openings" required><input type="number" min={1} max={100} value={f.openings} onChange={(e) => setF({ ...f, openings: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="openings" /></Field>
        <Field label="Closing date" optional><input type="date" value={f.closingDate} min={c.opts.today} onChange={(e) => setF({ ...f, closingDate: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="closingDate" /></Field>
      </div>
      <Field label="Description" optional><textarea value={f.description} maxLength={1000} rows={3} onChange={(e) => setF({ ...f, description: e.target.value })} className={`${controlClass} h-auto py-2`} /><FieldErr errs={errs} k="description" /></Field>
      <Actions onCancel={onClose} onSave={() => void save()} busy={busy} label={v ? "Save Changes" : "Add Vacancy"} />
    </Modal>
  );
}
function ApplicantsModal({ c, v, onClose }: { c: Ctx; v: SfVacancy; onClose: () => void }) {
  const [rows, setRows] = useState<SfApplicant[] | null>(null);
  const blank = { name: "", email: "", phone: "", notes: "", status: "APPLIED" };
  const [f, setF] = useState(blank);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const load = useCallback(() => { api.schoolStaff.applicants(v.id).then(setRows).catch((e) => c.onError(errText(e))); }, [v.id]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  const add = async () => { setErrs({}); try { await api.schoolStaff.addApplicant(v.id, f); setF(blank); load(); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } };
  const setStatus = async (a: SfApplicant, status: string) => { try { await api.schoolStaff.updateApplicant(a.id, { name: a.name, email: a.email ?? "", phone: a.phone ?? "", notes: a.notes ?? "", status }); load(); } catch (e) { c.onError(errText(e)); } };
  const del = async (a: SfApplicant) => { if (!window.confirm(`Remove ${a.name}?`)) return; try { await api.schoolStaff.deleteApplicant(a.id); load(); } catch (e) { c.onError(errText(e)); } };
  return (
    <Modal title={`Applicants – ${v.position}`} wide onClose={onClose}>
      <div className="grid gap-2 rounded-lg border border-[#cfe0f6] bg-[#fbfdff] p-3 sm:grid-cols-4">
        <div><input aria-label="Name" placeholder="Name" value={f.name} maxLength={120} onChange={(e) => setF({ ...f, name: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="name" /></div>
        <div><input aria-label="Email" placeholder="Email" value={f.email} maxLength={200} onChange={(e) => setF({ ...f, email: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="email" /></div>
        <div><input aria-label="Phone" placeholder="Phone" value={f.phone} maxLength={30} onChange={(e) => setF({ ...f, phone: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="phone" /></div>
        <PrimaryButton type="button" onClick={() => void add()}><Plus size={14} />Add</PrimaryButton>
      </div>
      <Table heads={["Applicant", "Contact", "Applied", "Status", ""]} colSpan={5} empty={rows && rows.length === 0 ? "No applicants yet." : !rows ? "Loading…" : undefined}>
        {rows?.map((a) => <tr key={a.id}><td className={td}>{a.name}</td><td className={td}>{[a.email, a.phone].filter(Boolean).join(" · ")}</td><td className={td}>{shortDay(a.appliedAt)}</td>
          <td className={td}><select aria-label={`Status for ${a.name}`} value={a.status} onChange={(e) => void setStatus(a, e.target.value)} className="h-8 rounded border border-[#cfe0f6] px-2 text-[12px]">{Object.entries(AS).map(([k, x]) => <option key={k} value={k}>{x[0]}</option>)}</select></td>
          <td className={td}><button type="button" className="text-[12px] font-semibold text-rose-600" onClick={() => void del(a)}>Remove</button></td></tr>)}
      </Table>
      <p className="text-[11px] text-slate-500">Marking someone Hired only records the outcome. Add them to the staff list yourself when they join.</p>
    </Modal>
  );
}
function RecruitmentTab({ c }: { c: Ctx }) {
  const [rows, setRows] = useState<SfVacancy[] | null>(null);
  const [form, setForm] = useState<{ v: SfVacancy | null } | null>(null);
  const [apps, setApps] = useState<SfVacancy | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const load = useCallback(() => { api.schoolStaff.vacancies().then(setRows).catch((e) => c.onError(errText(e))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); c.flash(ok); load(); } catch (e) { c.onError(errText(e)); } };
  return (
    <div className="space-y-4">
      <div className="flex justify-end"><PrimaryButton type="button" onClick={() => setForm({ v: null })}><Plus size={14} />Add Vacancy</PrimaryButton></div>
      <Table heads={["Position", "Department", "Applicants", "Status", ""]} colSpan={5} empty={rows && rows.length === 0 ? "No vacancies yet." : !rows ? "Loading…" : undefined}>
        {rows?.map((v) => (
          <tr key={v.id}><td className={td}>{v.position}<div className="text-[11px] text-slate-500">{v.openings} opening{v.openings === 1 ? "" : "s"}{v.hired ? ` · ${v.hired} hired` : ""}{v.closingDate ? ` · closes ${shortDay(v.closingDate)}` : ""}</div></td><td className={td}>{v.department ?? "—"}</td>
            <td className={td}><button type="button" className="font-semibold text-blue-600" onClick={() => setApps(v)}>{v.applicants}</button></td><td className={td}>{tint(VC, v.status)}</td>
            <td className={td}><Menu id={`v${v.id}`} open={menu} setOpen={setMenu}><Item onClick={() => setApps(v)}>Applicants</Item><Item onClick={() => setForm({ v })}>Edit</Item><Item onClick={() => void run(() => api.schoolStaff.setVacancyOpen(v.id, v.status !== "OPEN"), v.status === "OPEN" ? "Vacancy closed." : "Vacancy reopened.")}>{v.status === "OPEN" ? "Close vacancy" : "Reopen vacancy"}</Item><Item danger onClick={() => { if (window.confirm(`Delete "${v.position}" and its applicants?`)) void run(() => api.schoolStaff.deleteVacancy(v.id), "Vacancy deleted."); }}>Delete</Item></Menu></td></tr>
        ))}
      </Table>
      {form && <VacancyModal c={c} v={form.v} onClose={() => setForm(null)} onSaved={() => { setForm(null); c.flash(form.v ? "Vacancy updated." : "Vacancy added."); load(); }} />}
      {apps && <ApplicantsModal c={c} v={apps} onClose={() => { setApps(null); load(); }} />}
    </div>
  );
}

// ------------------------------------------------------------------ page
export default function StaffDesk() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t === params.get("tab")) ?? "Overview";
  const go = useCallback((t: Tab) => setParams(t === "Overview" ? {} : { tab: t }), [setParams]);
  const [opts, setOpts] = useState<SfOptions | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bump, setBump] = useState(0);
  const onError = useCallback((m: string) => { setError(m); setNotice(""); }, []);
  const flash = useCallback((m: string) => { setNotice(m); setError(""); setTimeout(() => setNotice(""), 6000); }, []);
  const refreshOpts = useCallback(() => { api.schoolStaff.options().then((o) => { setOpts(o); setBump((b) => b + 1); }).catch((e) => setError(errText(e))); }, []);
  useEffect(refreshOpts, [refreshOpts]);
  const ctx: Ctx | null = opts ? { opts, flash, onError, go, refreshOpts } : null;
  return (
    <SchoolLayout>
      <div className="space-y-4">
        <h1 className="flex items-center gap-2 text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]"><UserCheck size={26} className="text-blue-600" />Staff Management</h1>
        <Tabs tabs={TABS} active={tab} onPick={(t) => { setError(""); go(t); }} />
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {!ctx && !error && <p className="text-[13px] text-slate-500">Loading…</p>}
        {ctx && (
          <div className="rounded-xl border border-[#d8e9fb] bg-white p-5">
            {tab === "Overview" && <OverviewTab c={ctx} bump={bump} />}
            {tab === "Staff Directory" && <DirectoryTab c={ctx} />}
            {tab === "Leave Management" && <LeaveTab c={ctx} />}
            {tab === "Performance" && <PerformanceTab c={ctx} />}
            {tab === "Training & Development" && <TrainingTab c={ctx} />}
            {tab === "Recruitment" && <RecruitmentTab c={ctx} />}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
