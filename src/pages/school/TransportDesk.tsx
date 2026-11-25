import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Bus, MapPin, Plus, Route as RouteIcon, Trash2, Users } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import { api } from "../../services/api";
import type { ExTable, TrAllocation, TrLive, TrOptions, TrOverview, TrRoute, TrStaff, TrStop } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout from "./SchoolLayout";
import { FieldErr, Kpi, ReportView, StudentPicker, Tabs, fieldErrs, shortDay, t12, tint } from "./DeskShared";
import { Item, Menu, Modal, Pager, Table, td } from "./SchoolUi";

const TABS = ["Overview", "Routes & Stops", "Student Allocation", "Live Tracking", "Transport Staff", "Reports"] as const;
type Tab = (typeof TABS)[number];
const TS: Record<string, [string, string]> = { SCHEDULED: ["Scheduled", "bg-slate-100 text-slate-600"], ON_TIME: ["On Time", "bg-emerald-100 text-emerald-700"], DELAYED: ["Delayed", "bg-rose-100 text-rose-700"], COMPLETED: ["Completed", "bg-sky-100 text-sky-700"], CANCELLED: ["Cancelled", "bg-slate-200 text-slate-600"] };
const RS: Record<string, [string, string]> = { ACTIVE: ["Active", "bg-emerald-100 text-emerald-700"], INACTIVE: ["Inactive", "bg-slate-100 text-slate-600"], ON_LEAVE: ["On leave", "bg-yellow-100 text-yellow-800"], MAINTENANCE: ["Maintenance", "bg-yellow-100 text-yellow-800"] };
const trip = (t: string) => (t === "PICKUP" ? "Pickup" : "Drop-off");

type Ctx = { opts: TrOptions; flash: (m: string) => void; onError: (m: string) => void; go: (t: Tab) => void; refresh: () => Promise<void> };
const Actions = ({ onCancel, onSave, busy, label }: { onCancel: () => void; onSave: () => void; busy: boolean; label: string }) => <div className="flex justify-end gap-2"><OutlineButton type="button" onClick={onCancel}>Cancel</OutlineButton><PrimaryButton type="button" disabled={busy} onClick={onSave}>{busy ? "Saving…" : label}</PrimaryButton></div>;

// ------------------------------------------------------------------ overview
function OverviewTab({ c }: { c: Ctx }) {
  const [ov, setOv] = useState<TrOverview | null>(null);
  useEffect(() => { api.schoolTransit.overview().then(setOv).catch((e) => c.onError(errText(e))); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Kpi icon={<RouteIcon size={26} className="text-blue-600" />} value={ov?.routes ?? "–"} label="Routes" tone="bg-sky-50" />
        <Kpi icon={<Bus size={26} className="text-emerald-600" />} value={ov?.vehicles ?? "–"} label="Vehicles" tone="bg-emerald-50" />
        <Kpi icon={<Users size={26} className="text-violet-600" />} value={ov ? ov.students.toLocaleString("en-IN") : "–"} label="Students" tone="bg-violet-50" />
      </div>
      <div>
        <h3 className="mb-2 text-[18px] font-extrabold text-[#101b69]">Today's Trips</h3>
        <Table heads={["Route", "Bus", "Status"]} colSpan={3} empty={ov && ov.trips.length === 0 ? "No active routes yet. Add one under Routes & Stops." : !ov ? "Loading…" : undefined}>
          {ov?.trips.map((t) => <tr key={t.routeId}><td className={td}>{t.route} <span className="text-[11px] text-slate-500">({trip(t.tripType)})</span></td><td className={td}>{t.vehicle ?? "—"}</td><td className={td}>{tint(TS, t.status)}{t.status === "DELAYED" && <span className="ml-2 text-[12px] text-rose-700">+{t.delayMinutes} min</span>}</td></tr>)}
        </Table>
        <p className="mt-2 text-[11px] text-slate-500">Trip status is whatever was last set on Live Tracking today. Routes nobody has updated show as Scheduled. There is no GPS feed.</p>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ vehicle + route forms
function VehicleModal({ c, onClose, onSaved }: { c: Ctx; onClose: () => void; onSaved: (id: number) => void }) {
  const [f, setF] = useState({ vehicleNo: "", registrationNo: "", type: "BUS", make: "", model: "", seatingCapacity: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const save = async () => { setBusy(true); setErrs({}); try { const r = await api.schoolTransit.addVehicle({ ...f, seatingCapacity: f.seatingCapacity === "" ? null : Number(f.seatingCapacity) }); onSaved(r.id); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); } };
  return (
    <Modal title="Add Vehicle" onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Vehicle No." required><input value={f.vehicleNo} maxLength={20} placeholder="e.g. BUS-01" onChange={(e) => setF({ ...f, vehicleNo: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="vehicleNo" /></Field>
        <Field label="Registration No." required><input value={f.registrationNo} maxLength={20} onChange={(e) => setF({ ...f, registrationNo: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="registrationNo" /></Field>
        <Field label="Type" required><select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} className={controlClass}>{c.opts.vehicleTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select><FieldErr errs={errs} k="type" /></Field>
        <Field label="Seats" required><input type="number" min={1} max={100} value={f.seatingCapacity} onChange={(e) => setF({ ...f, seatingCapacity: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="seatingCapacity" /></Field>
        <Field label="Make" required><input value={f.make} maxLength={50} onChange={(e) => setF({ ...f, make: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="make" /></Field>
        <Field label="Model" required><input value={f.model} maxLength={50} onChange={(e) => setF({ ...f, model: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="model" /></Field>
      </div>
      <Actions onCancel={onClose} onSave={() => void save()} busy={busy} label="Add Vehicle" />
    </Modal>
  );
}

function RouteForm({ c, route, onClose, onSaved }: { c: Ctx; route: TrRoute | null; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({ name: route?.name ?? "", code: route?.code ?? "", vehicleId: route?.vehicleId ?? null as number | null, tripType: route?.tripType ?? "PICKUP", stops: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [veh, setVeh] = useState(false);
  const save = async () => {
    setBusy(true); setErrs({});
    try { if (route) { await api.schoolTransit.updateRoute(route.id, f); onSaved("Route updated."); } else { await api.schoolTransit.createRoute(f); onSaved("Route added."); } }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={route ? "Edit Route" : "Add Route"} wide onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Route Name" required><input value={f.name} maxLength={100} placeholder="e.g., West Zone" onChange={(e) => setF({ ...f, name: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="name" /></Field>
        <Field label="Route Code" required><input value={f.code} maxLength={20} placeholder="e.g., WZ-01" onChange={(e) => setF({ ...f, code: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="code" /></Field>
        <Field label="Vehicle" required><div className="flex gap-2"><select value={f.vehicleId ?? ""} onChange={(e) => setF({ ...f, vehicleId: e.target.value ? Number(e.target.value) : null })} className={controlClass}><option value="">Select Vehicle</option>{c.opts.vehicles.filter((v) => v.status === "ACTIVE").map((v) => <option key={v.id} value={v.id}>{v.number} · {v.capacity} seats</option>)}</select><OutlineButton type="button" onClick={() => setVeh(true)}>New</OutlineButton></div><FieldErr errs={errs} k="vehicleId" /></Field>
        <Field label="Trip Type" required>
          <div className="flex h-10 items-center gap-5">{c.opts.tripTypes.map((t) => <label key={t.code} className="flex items-center gap-2 text-[13px]"><input type="radio" name="tripType" checked={f.tripType === t.code} onChange={() => setF({ ...f, tripType: t.code })} />{t.label}</label>)}</div><FieldErr errs={errs} k="tripType" /></Field>
      </div>
      {!route && <Field label="Stops" required><textarea value={f.stops} rows={3} placeholder="e.g., Greenfield Apartments, City Park, School" onChange={(e) => setF({ ...f, stops: e.target.value })} className={`${controlClass} h-auto py-2`} /><FieldErr errs={errs} k="stops" /><p className="mt-1 text-[11px] text-slate-500">In order, separated by commas or new lines. Set arrival times afterwards in Manage Stops.</p></Field>}
      <Actions onCancel={onClose} onSave={() => void save()} busy={busy} label={route ? "Save Changes" : "Save Route"} />
      {veh && <VehicleModal c={c} onClose={() => setVeh(false)} onSaved={(id) => { setVeh(false); void c.refresh().then(() => setF((x) => ({ ...x, vehicleId: id }))); }} />}
    </Modal>
  );
}

function StopsModal({ c, route, onClose, onSaved }: { c: Ctx; route: TrRoute; onClose: () => void; onSaved: () => void }) {
  type Row = { id: number | null; name: string; arrival: string; students: number };
  const [rows, setRows] = useState<Row[] | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => { api.schoolTransit.stops(route.id).then((l: TrStop[]) => setRows(l.map((s) => ({ id: s.id, name: s.name, arrival: s.arrival ?? "", students: s.students })))).catch((e) => c.onError(errText(e))); }, [route.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const move = (i: number, d: number) => setRows((r) => { if (!r) return r; const j = i + d; if (j < 0 || j >= r.length) return r; const n = [...r]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  const upd = (i: number, p: Partial<Row>) => setRows((r) => r && r.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const save = async () => { if (!rows) return; setBusy(true); setErrs({}); try { await api.schoolTransit.saveStops(route.id, rows.map((r) => ({ id: r.id, name: r.name, arrival: r.arrival }))); onSaved(); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); } };
  return (
    <Modal title={`Manage Stops – ${route.name}`} wide onClose={onClose}>
      {errs.stops && <Notice tone="error">{errs.stops}</Notice>}
      <div className="space-y-2">
        {!rows && <p className="text-[12px] text-slate-500">Loading…</p>}
        {rows?.map((r, i) => (
          <div key={r.id ?? `n${i}`} className="grid grid-cols-[28px_1fr_130px_auto] items-start gap-2">
            <div className="pt-2 text-center text-[12px] font-bold text-[#13205f]">{i + 1}</div>
            <div><input aria-label={`Stop ${i + 1} name`} value={r.name} maxLength={100} onChange={(e) => upd(i, { name: e.target.value })} className={controlClass} /><FieldErr errs={errs} k={`name${i}`} /></div>
            <div><input aria-label={`Stop ${i + 1} arrival time`} type="time" value={r.arrival} onChange={(e) => upd(i, { arrival: e.target.value })} className={controlClass} /><FieldErr errs={errs} k={`time${i}`} /></div>
            <div className="flex items-center gap-1 pt-1.5">
              <button type="button" aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)} className="rounded p-1 text-slate-500 disabled:opacity-30"><ArrowUp size={15} /></button>
              <button type="button" aria-label="Move down" disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="rounded p-1 text-slate-500 disabled:opacity-30"><ArrowDown size={15} /></button>
              <button type="button" aria-label="Remove stop" title={r.students ? `${r.students} student(s) allocated` : "Remove"} onClick={() => setRows((x) => x && x.filter((_, k) => k !== i))} className="rounded p-1 text-slate-400 hover:text-rose-600"><Trash2 size={15} /></button>
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between"><OutlineButton type="button" onClick={() => setRows((r) => [...(r ?? []), { id: null, name: "", arrival: "", students: 0 }])}><Plus size={14} />Add Stop</OutlineButton></div>
      <p className="text-[11px] text-slate-500">Order is the order the vehicle visits them; the last stop is the end of the route. Times are the planned arrival, and the last one gives the ETA on Live Tracking.</p>
      <Actions onCancel={onClose} onSave={() => void save()} busy={busy} label="Save Stops" />
    </Modal>
  );
}

function RoutesTab({ c }: { c: Ctx }) {
  const [q, setQ] = useState(""), [dq, setDq] = useState("");
  const [rows, setRows] = useState<TrRoute[] | null>(null);
  const [form, setForm] = useState<{ r: TrRoute | null } | null>(null);
  const [stops, setStops] = useState<TrRoute | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  useEffect(() => { const t = setTimeout(() => setDq(q), 300); return () => clearTimeout(t); }, [q]);
  const load = useCallback(() => { api.schoolTransit.routes(dq).then(setRows).catch((e) => c.onError(errText(e))); }, [dq]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); c.flash(ok); await c.refresh(); load(); } catch (e) { c.onError(errText(e)); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Search" className="w-72"><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search routes by name or code..." className={controlClass} /></Field>
        <PrimaryButton type="button" onClick={() => setForm({ r: null })}><Plus size={14} />Add Route</PrimaryButton>
      </div>
      <Table heads={["Route", "Vehicle", "Stops", "Students", "Status", ""]} colSpan={6} empty={rows && rows.length === 0 ? "No routes yet." : !rows ? "Loading…" : undefined}>
        {rows?.map((r) => (
          <tr key={r.id}><td className={`${td} font-semibold`}>{r.name}<div className="text-[11px] font-normal text-slate-500">{r.code} · {trip(r.tripType)}</div></td><td className={td}>{r.vehicle ?? "—"}</td><td className={td}>{r.stops}</td><td className={td}>{r.students}</td><td className={td}>{tint(RS, r.status)}</td>
            <td className={`${td} whitespace-nowrap`}><button type="button" onClick={() => setStops(r)} className="mr-2 rounded-md border border-blue-500 px-3 py-1 text-[12px] font-semibold text-blue-600 hover:bg-blue-50">Manage Stops</button>
              <Menu id={`r${r.id}`} open={menu} setOpen={setMenu}><Item onClick={() => setForm({ r })}>Edit</Item><Item onClick={() => void run(() => api.schoolTransit.setRouteActive(r.id, r.status !== "ACTIVE"), r.status === "ACTIVE" ? "Route deactivated." : "Route activated.")}>{r.status === "ACTIVE" ? "Deactivate" : "Activate"}</Item><Item danger onClick={() => { if (window.confirm(`Delete the route "${r.name}" and its stops?`)) void run(() => api.schoolTransit.deleteRoute(r.id), "Route deleted."); }}>Delete</Item></Menu></td></tr>
        ))}
      </Table>
      {form && <RouteForm c={c} route={form.r} onClose={() => setForm(null)} onSaved={(m) => { setForm(null); c.flash(m); void c.refresh(); load(); }} />}
      {stops && <StopsModal c={c} route={stops} onClose={() => setStops(null)} onSaved={() => { setStops(null); c.flash("Stops saved."); load(); }} />}
    </div>
  );
}

// ------------------------------------------------------------------ allocation
function AllocModal({ c, existing, onClose, onSaved }: { c: Ctx; existing: TrAllocation | null; onClose: () => void; onSaved: (m: string) => void }) {
  const [studentId, setStudentId] = useState<number | null>(existing?.studentId ?? null);
  const [routeId, setRouteId] = useState<number | null>(existing?.routeId ?? null);
  const [stopId, setStopId] = useState<number | null>(existing?.stopId ?? null);
  const [stops, setStops] = useState<TrStop[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    setStops([]);
    if (routeId === null) return;
    let live = true;
    api.schoolTransit.stops(routeId).then((l) => { if (live) { setStops(l); setStopId((cur) => (l.some((s) => s.id === cur) ? cur : null)); } }).catch((e) => { if (live) c.onError(errText(e)); });
    return () => { live = false; };
  }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const routes = c.opts.routes.filter((r) => r.status === "ACTIVE" && r.vehicleId !== null && (existing === null || r.tripType === existing.tripType));
  const save = async () => {
    setBusy(true); setErrs({});
    try { if (existing) await api.schoolTransit.reallocate(existing.id, { studentId, routeId, stopId }); else await api.schoolTransit.allocate({ studentId, routeId, stopId }); onSaved(existing ? "Allocation changed." : "Student allocated."); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); }
  };
  return (
    <Modal title={existing ? `Change allocation – ${existing.student}` : "Allocate Student"} wide onClose={onClose}>
      {!existing && <StudentPicker classes={c.opts.classes} sections={c.opts.sections} fetchStudents={async (sid) => (await api.schoolTransit.students(sid)).map((s) => ({ id: s.id, label: `${s.name} (${s.admissionNo})${s.pickupRoute || s.dropRoute ? ` – ${[s.pickupRoute && `pickup: ${s.pickupRoute}`, s.dropRoute && `drop: ${s.dropRoute}`].filter(Boolean).join(", ")}` : ""}` }))} value={studentId} onChange={setStudentId} error={errs.studentId} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Route" required><select value={routeId ?? ""} onChange={(e) => setRouteId(e.target.value ? Number(e.target.value) : null)} className={controlClass}><option value="">Select route</option>{routes.map((r) => <option key={r.id} value={r.id}>{r.name} ({trip(r.tripType)})</option>)}</select><FieldErr errs={errs} k="routeId" /></Field>
        <Field label="Stop" required><select value={stopId ?? ""} disabled={routeId === null} onChange={(e) => setStopId(e.target.value ? Number(e.target.value) : null)} className={controlClass}><option value="">Select stop</option>{stops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><FieldErr errs={errs} k="stopId" /></Field>
      </div>
      <p className="text-[11px] text-slate-500">A student can have one pickup and one drop-off route. Allocation stops once the vehicle's seats are full.</p>
      <Actions onCancel={onClose} onSave={() => void save()} busy={busy} label={existing ? "Save" : "Allocate Student"} />
    </Modal>
  );
}

function AllocationTab({ c }: { c: Ctx }) {
  const [classId, setClassId] = useState<number | null>(null);
  const [routeId, setRouteId] = useState<number | null>(null);
  const [page, setPage] = useState(0);
  const [data, setData] = useState<{ items: TrAllocation[]; total: number } | null>(null);
  const [form, setForm] = useState<{ a: TrAllocation | null } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const size = 10;
  const load = useCallback(() => { api.schoolTransit.allocations({ classId, routeId, page, size }).then(setData).catch((e) => c.onError(errText(e))); }, [classId, routeId, page]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(load, [load]);
  const remove = async (a: TrAllocation) => { if (!window.confirm(`Remove ${a.student} from ${a.route}?`)) return; try { await api.schoolTransit.deallocate(a.id); c.flash("Allocation removed."); await c.refresh(); load(); } catch (e) { c.onError(errText(e)); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="Grade" className="w-40"><select value={classId ?? ""} onChange={(e) => { setClassId(e.target.value ? Number(e.target.value) : null); setPage(0); }} className={controlClass}><option value="">All Grades</option>{c.opts.classes.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></Field>
        <Field label="Route" className="w-52"><select value={routeId ?? ""} onChange={(e) => { setRouteId(e.target.value ? Number(e.target.value) : null); setPage(0); }} className={controlClass}><option value="">All Routes</option>{c.opts.routes.map((r) => <option key={r.id} value={r.id}>{r.name} ({trip(r.tripType)})</option>)}</select></Field>
        <PrimaryButton type="button" className="ml-auto" onClick={() => setForm({ a: null })}>Allocate Student</PrimaryButton>
      </div>
      <Table heads={["Student", "Grade", "Route", "Trip", "Stop", ""]} colSpan={6} empty={data && data.items.length === 0 ? "No students are allocated for this selection." : !data ? "Loading…" : undefined}>
        {data?.items.map((a) => <tr key={a.id}><td className={td}>{a.student}<div className="text-[11px] text-slate-500">{a.admissionNo}</div></td><td className={td}>{a.grade}</td><td className={td}>{a.route}</td><td className={td}>{trip(a.tripType)}</td><td className={td}>{a.stop}</td>
          <td className={td}><Menu id={`a${a.id}`} open={menu} setOpen={setMenu}><Item onClick={() => setForm({ a })}>Change route / stop</Item><Item danger onClick={() => void remove(a)}>Remove</Item></Menu></td></tr>)}
      </Table>
      <Pager page={page} size={size} total={data?.total ?? 0} set={setPage} />
      {form && <AllocModal c={c} existing={form.a} onClose={() => setForm(null)} onSaved={(m) => { setForm(null); c.flash(m); void c.refresh(); load(); }} />}
    </div>
  );
}

// ------------------------------------------------------------------ live tracking
function LiveTab({ c }: { c: Ctx }) {
  const active = c.opts.routes.filter((r) => r.status === "ACTIVE");
  const [routeId, setRouteId] = useState<number | null>(active[0]?.id ?? null);
  const [live, setLive] = useState<TrLive | null>(null);
  const [f, setF] = useState({ status: "ON_TIME", currentStopId: null as number | null, delay: "" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const apply = (l: TrLive) => { setLive(l); setF({ status: l.status === "SCHEDULED" ? "ON_TIME" : l.status, currentStopId: l.currentStopId, delay: l.delayMinutes ? String(l.delayMinutes) : "" }); };
  useEffect(() => {
    setLive(null); setErrs({});
    if (routeId === null) return;
    let alive = true;
    api.schoolTransit.live(routeId).then((l) => { if (alive) apply(l); }).catch((e) => { if (alive) c.onError(errText(e)); });
    return () => { alive = false; };
  }, [routeId]); // eslint-disable-line react-hooks/exhaustive-deps
  const save = async (over?: Partial<{ status: string; currentStopId: number | null }>) => {
    if (routeId === null) return;
    const b = { ...f, ...over };
    setBusy(true); setErrs({});
    try { apply(await api.schoolTransit.updateTrip(routeId, { status: b.status, currentStopId: b.currentStopId, delayMinutes: b.status === "DELAYED" || b.status === "COMPLETED" ? (b.delay === "" ? null : Number(b.delay)) : null })); c.flash("Trip updated."); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <Field label="Route" className="w-60"><select value={routeId ?? ""} onChange={(e) => setRouteId(e.target.value ? Number(e.target.value) : null)} className={controlClass}>{active.length === 0 && <option value="">No active routes</option>}{active.map((r) => <option key={r.id} value={r.id}>{r.name} ({trip(r.tripType)})</option>)}</select></Field>
        {live && (
          <div className="flex flex-wrap items-center gap-4 rounded-lg bg-sky-50 px-4 py-2.5 text-[14px] font-semibold text-[#101b69]">
            <Bus size={20} className="text-blue-600" /><span>{live.vehicle ?? "No vehicle"}</span>{tint(TS, live.status)}{live.status === "DELAYED" && <span className="text-rose-700">+{live.delayMinutes} min</span>}
            <span className="border-l border-slate-300 pl-4 text-[13px]">Last Updated: {live.updatedAt ?? "not updated today"}</span>
          </div>
        )}
      </div>
      {live && (
        <div className="overflow-x-auto rounded-lg border border-[#cfe0f6] px-6 pb-6 pt-12">
          <div className="relative mx-auto flex items-start" style={{ minWidth: Math.max(480, live.stops.length * 130) }}>
            <div className="absolute left-0 right-0 top-[9px] h-[3px] bg-blue-200" />
            {live.stops.map((s, i) => (
              <div key={s.id} className="relative z-10 flex flex-1 flex-col items-center text-center" style={{ alignItems: i === 0 ? "flex-start" : i === live.stops.length - 1 ? "flex-end" : "center" }}>
                {s.current && <span className="absolute -top-9 whitespace-nowrap rounded-md bg-emerald-100 px-3 py-1 text-[12px] font-bold text-emerald-700">Current Stop</span>}
                <button type="button" title="Mark as the vehicle's current stop" disabled={busy} onClick={() => void save({ currentStopId: s.id })} className={`h-[21px] w-[21px] rounded-full border-[3px] ${s.current ? "border-emerald-600 bg-white ring-4 ring-emerald-100" : s.reached ? "border-blue-600 bg-blue-600" : "border-blue-600 bg-white"}`} aria-label={`Set ${s.name} as current stop`} />
                <div className="mt-2 text-[13px] font-bold text-[#101b69]">{s.name}</div>
                {s.arrival && <div className="text-[11px] text-slate-500">{i === live.stops.length - 1 && live.eta ? `ETA: ${live.eta}` : t12(s.arrival)}</div>}
              </div>
            ))}
            {live.stops.length === 0 && <p className="w-full pt-4 text-center text-[12px] text-slate-500">This route has no stops.</p>}
          </div>
        </div>
      )}
      {live && (
        <div className="rounded-lg border border-[#cfe0f6] p-4">
          <h3 className="mb-3 text-[15px] font-extrabold text-[#101b69]">Update today's trip</h3>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Status" required><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={controlClass}>{c.opts.tripStatuses.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}</select><FieldErr errs={errs} k="status" /></Field>
            <Field label="Delay (minutes)" optional><input type="number" min={0} max={600} disabled={f.status !== "DELAYED" && f.status !== "COMPLETED"} value={f.delay} onChange={(e) => setF({ ...f, delay: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="delayMinutes" /></Field>
            <Field label="Current stop" optional><select value={f.currentStopId ?? ""} onChange={(e) => setF({ ...f, currentStopId: e.target.value ? Number(e.target.value) : null })} className={controlClass}><option value="">Not started</option>{live.stops.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select><FieldErr errs={errs} k="currentStopId" /></Field>
            <div className="flex items-end"><PrimaryButton type="button" disabled={busy} onClick={() => void save()}>{busy ? "Saving…" : "Save Update"}</PrimaryButton></div>
          </div>
          <p className="mt-2 text-[11px] text-slate-500">This board is updated by hand. Nothing here comes from a GPS device, and parents aren't notified. Clicking a stop on the line sets it as the current stop.</p>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------------ staff
function StaffForm({ c, s, onClose, onSaved }: { c: Ctx; s: TrStaff | null; onClose: () => void; onSaved: (m: string) => void }) {
  const [f, setF] = useState({ role: s?.kind ?? "DRIVER", name: s?.name ?? "", phone: s?.phone ?? "", licenseNo: s?.licenseNo ?? "", licenseExpiry: s?.licenseExpiry ?? "", vehicleId: s?.vehicleId ?? null as number | null, status: s?.status === "INACTIVE" ? "INACTIVE" : "ACTIVE" });
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const driver = f.role === "DRIVER";
  const save = async () => { setBusy(true); setErrs({}); try { if (s) await api.schoolTransit.updateStaff(s.kind, s.id, f); else await api.schoolTransit.addStaff(f); onSaved(s ? "Staff updated." : "Staff added."); } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else c.onError(errText(e)); } finally { setBusy(false); } };
  return (
    <Modal title={s ? `Edit ${s.name}` : "Add Staff"} onClose={onClose}>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Role" required><select value={f.role} disabled={!!s} onChange={(e) => setF({ ...f, role: e.target.value })} className={controlClass}><option value="DRIVER">Driver</option><option value="ATTENDANT">Attendant</option></select><FieldErr errs={errs} k="role" /></Field>
        <Field label="Status" required><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })} className={controlClass}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select><FieldErr errs={errs} k="status" /></Field>
        <Field label="Name" required><input value={f.name} maxLength={100} onChange={(e) => setF({ ...f, name: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="name" /></Field>
        <Field label="Phone" required><input value={f.phone} maxLength={20} onChange={(e) => setF({ ...f, phone: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="phone" /></Field>
        {driver && <Field label="Licence No." required><input value={f.licenseNo} maxLength={40} onChange={(e) => setF({ ...f, licenseNo: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="licenseNo" /></Field>}
        {driver && <Field label="Licence expiry" required><input type="date" value={f.licenseExpiry} min={c.opts.today} onChange={(e) => setF({ ...f, licenseExpiry: e.target.value })} className={controlClass} /><FieldErr errs={errs} k="licenseExpiry" /></Field>}
        <Field label="Assigned Bus" optional className="sm:col-span-2"><select value={f.vehicleId ?? ""} onChange={(e) => setF({ ...f, vehicleId: e.target.value ? Number(e.target.value) : null })} className={controlClass}><option value="">Not assigned</option>{c.opts.vehicles.filter((v) => v.status === "ACTIVE").map((v) => <option key={v.id} value={v.id}>{v.number}{driver && v.driver && v.driver !== s?.name ? ` (driver: ${v.driver})` : ""}</option>)}</select><FieldErr errs={errs} k="vehicleId" /></Field>
      </div>
      <Actions onCancel={onClose} onSave={() => void save()} busy={busy} label={s ? "Save Changes" : "Add Staff"} />
    </Modal>
  );
}

function StaffTab({ c }: { c: Ctx }) {
  const [role, setRole] = useState("");
  const [rows, setRows] = useState<TrStaff[] | null>(null);
  const [form, setForm] = useState<{ s: TrStaff | null } | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const load = useCallback(() => { api.schoolTransit.staff(role).then(setRows).catch((e) => c.onError(errText(e))); }, [role]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { setRows(null); load(); }, [load]);
  const del = async (s: TrStaff) => { if (!window.confirm(`Delete ${s.name}?`)) return; try { await api.schoolTransit.deleteStaff(s.kind, s.id); c.flash("Staff deleted."); await c.refresh(); load(); } catch (e) { c.onError(errText(e)); } };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <Field label="Role" className="w-48"><select value={role} onChange={(e) => setRole(e.target.value)} className={controlClass}><option value="">All Roles</option><option value="DRIVER">Driver</option><option value="ATTENDANT">Attendant</option></select></Field>
        <PrimaryButton type="button" onClick={() => setForm({ s: null })}>Add Staff</PrimaryButton>
      </div>
      <Table heads={["Name", "Role", "Phone", "Assigned Bus", "Status", ""]} colSpan={6} empty={rows && rows.length === 0 ? "No transport staff yet." : !rows ? "Loading…" : undefined}>
        {rows?.map((s) => <tr key={s.key}><td className={td}>{s.name}{s.licenseExpiry && <div className="text-[11px] text-slate-500">Licence valid to {shortDay(s.licenseExpiry)}</div>}</td><td className={td}>{s.role}</td><td className={td}>{s.phone}</td><td className={td}>{s.vehicle ?? "—"}</td><td className={td}>{tint(RS, s.status)}</td>
          <td className={td}><Menu id={`s${s.key}`} open={menu} setOpen={setMenu}><Item onClick={() => setForm({ s })}>Edit</Item><Item danger onClick={() => void del(s)}>Delete</Item></Menu></td></tr>)}
      </Table>
      {form && <StaffForm c={c} s={form.s} onClose={() => setForm(null)} onSaved={(m) => { setForm(null); c.flash(m); void c.refresh(); load(); }} />}
    </div>
  );
}

// ------------------------------------------------------------------ reports
const REPORTS = [{ code: "PUNCTUALITY", name: "Trip Punctuality", text: "On-time vs delayed trips for the selected period" }, { code: "OCCUPANCY", name: "Route Occupancy", text: "Allocated students against vehicle seats, by route" }, { code: "RIDERSHIP", name: "Student Ridership", text: "Total students using transport by route" }];
function ReportsTab({ c }: { c: Ctx }) {
  const [from, setFrom] = useState(`${c.opts.today.slice(0, 8)}01`), [to, setTo] = useState(c.opts.today);
  const [routeId, setRouteId] = useState<number | null>(null);
  const [type, setType] = useState(REPORTS[0].code);
  const [t, setT] = useState<ExTable | null>(null);
  const [busy, setBusy] = useState(false);
  const gen = async () => { setBusy(true); try { setT(await api.schoolTransit.report(type, from, to, routeId)); } catch (e) { c.onError(errText(e)); } finally { setBusy(false); } };
  const cur = useMemo(() => REPORTS.find((r) => r.code === type), [type]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <Field label="From" className="w-40"><input type="date" value={from} max={to} disabled={type !== "PUNCTUALITY"} onChange={(e) => { setFrom(e.target.value); setT(null); }} className={controlClass} /></Field>
        <Field label="To" className="w-40"><input type="date" value={to} min={from} disabled={type !== "PUNCTUALITY"} onChange={(e) => { setTo(e.target.value); setT(null); }} className={controlClass} /></Field>
        <Field label="Route" className="w-52"><select value={routeId ?? ""} onChange={(e) => { setRouteId(e.target.value ? Number(e.target.value) : null); setT(null); }} className={controlClass}><option value="">All Routes</option>{c.opts.routes.map((r) => <option key={r.id} value={r.id}>{r.name} ({trip(r.tripType)})</option>)}</select></Field>
        <PrimaryButton type="button" disabled={busy} onClick={() => void gen()}>{busy ? "Generating…" : "Generate"}</PrimaryButton>
      </div>
      <div className="overflow-hidden rounded-lg border border-[#cfe0f6]">
        <div className="grid grid-cols-[40px_200px_1fr] bg-[#e8f1fd] px-4 py-2.5 text-[13px] font-bold text-[#13205f]"><span /><span>Report</span><span>Description</span></div>
        {REPORTS.map((r) => <label key={r.code} className="grid cursor-pointer grid-cols-[40px_200px_1fr] items-center border-t border-[#e3eefc] px-4 py-3 text-[13px] hover:bg-blue-50/40"><input type="radio" name="report" checked={type === r.code} onChange={() => { setType(r.code); setT(null); }} /><span className="font-semibold">{r.name}</span><span className="text-slate-600">{r.text}</span></label>)}
      </div>
      {t ? <ReportView t={t} empty="Nothing to show for this selection." /> : <p className="text-[12px] text-slate-500">Choose {cur?.name} and press Generate.{type !== "PUNCTUALITY" ? " The date range only applies to Trip Punctuality." : ""}</p>}
    </div>
  );
}

// ------------------------------------------------------------------ page
export default function TransportDesk() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = TABS.find((t) => t === params.get("tab")) ?? "Overview";
  const go = useCallback((t: Tab) => setParams(t === "Overview" ? {} : { tab: t }), [setParams]);
  const [opts, setOpts] = useState<TrOptions | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const onError = useCallback((m: string) => { setError(m); setNotice(""); }, []);
  const flash = useCallback((m: string) => { setNotice(m); setError(""); setTimeout(() => setNotice(""), 6000); }, []);
  const refresh = useCallback(async () => { try { setOpts(await api.schoolTransit.options()); } catch (e) { setError(errText(e)); } }, []);
  useEffect(() => { void refresh(); }, [refresh]);
  const ctx: Ctx | null = opts ? { opts, flash, onError, go, refresh } : null;
  return (
    <SchoolLayout>
      <div className="space-y-4">
        <h1 className="flex items-center gap-2 text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]"><MapPin size={26} className="text-blue-600" />Transport</h1>
        <Tabs tabs={TABS} active={tab} onPick={(t) => { setError(""); go(t); }} />
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {!ctx && !error && <p className="text-[13px] text-slate-500">Loading…</p>}
        {ctx && (
          <div className="rounded-xl border border-[#d8e9fb] bg-white p-5">
            {tab === "Overview" && <OverviewTab c={ctx} />}
            {tab === "Routes & Stops" && <RoutesTab c={ctx} />}
            {tab === "Student Allocation" && <AllocationTab c={ctx} />}
            {tab === "Live Tracking" && <LiveTab c={ctx} />}
            {tab === "Transport Staff" && <StaffTab c={ctx} />}
            {tab === "Reports" && <ReportsTab c={ctx} />}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
