import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus } from "lucide-react";
import { api, ApiError } from "../../services/api";
import type { StopType, TransportRouteRow, TransportStatus, TransportStopBody, TransportStopRow } from "../../services/api";
import { DataTable, DetailCard, EmptyRow, Field, Panel, PanelTitle, PrimaryButton, RowActions, SearchBox, TableFooter, controlClass, tdClass, textareaClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { fmtTime } from "./TimetableShared";
import { Err, Pill, num, statusLabel, statusTone, str } from "./TransportShared";

type RouteForm = { name: string; code: string; startLocation: string; endLocation: string; distanceKm: string; durationMinutes: string; status: TransportStatus; description: string };
type StopForm = { name: string; code: string; sequenceNo: string; latitude: string; longitude: string; address: string; arrivalTime: string; departureTime: string; radiusMeters: string; stopType: StopType; status: TransportStatus };

const blankRoute = (): RouteForm => ({ name: "", code: "", startLocation: "", endLocation: "", distanceKm: "", durationMinutes: "", status: "ACTIVE", description: "" });
const blankStop = (): StopForm => ({ name: "", code: "", sequenceNo: "", latitude: "", longitude: "", address: "", arrivalTime: "", departureTime: "", radiusMeters: "100", stopType: "PICKUP_DROP", status: "ACTIVE" });
const stopTypes: [StopType, string][] = [["PICKUP_DROP", "Pickup & Drop"], ["PICKUP", "Pickup only"], ["DROP", "Drop only"]];

type Props = { institutionId: number | null; onError: (m: string) => void; onNotice: (m: string) => void };

export function RoutesAndStops({ institutionId, onError, onNotice }: Props) {
  const [routes, setRoutes] = useState<TransportRouteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const [routeForm, setRouteForm] = useState<RouteForm>(blankRoute);
  const [routeId, setRouteId] = useState<number | null>(null);
  const [routeErrors, setRouteErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const [stops, setStops] = useState<TransportStopRow[]>([]);
  const [stopsLoading, setStopsLoading] = useState(false);
  const [stopForm, setStopForm] = useState<StopForm>(blankStop);
  const [stopId, setStopId] = useState<number | null>(null);
  const [stopErrors, setStopErrors] = useState<Record<string, string>>({});

  const loadRoutes = useCallback(async () => {
    if (institutionId === null) { setRoutes([]); setLoading(false); return; }
    setLoading(true);
    try {
      const list = await api.transport.routes.list();
      setRoutes(list);
      setSelected((cur) => (cur !== null && list.some((r) => r.id === cur) ? cur : list[0]?.id ?? null));
      onError("");
    } catch (e) { onError(errText(e)); } finally { setLoading(false); }
  }, [institutionId, onError]);
  useEffect(() => { void loadRoutes(); }, [loadRoutes]);

  const loadStops = useCallback(async () => {
    if (selected === null) { setStops([]); return; }
    setStopsLoading(true);
    try { setStops(await api.transport.stops.list(selected)); } catch (e) { onError(errText(e)); } finally { setStopsLoading(false); }
  }, [selected, onError]);
  useEffect(() => { void loadStops(); }, [loadStops]);
  useEffect(() => { setStopId(null); setStopForm(blankStop()); setStopErrors({}); }, [selected]);

  /* ---------------- routes ---------------- */
  const setR = <K extends keyof RouteForm>(k: K, v: RouteForm[K]) => { setRouteForm((f) => ({ ...f, [k]: v })); setRouteErrors((e) => { const n = { ...e }; delete n[k]; return n; }); onError(""); onNotice(""); };
  const newRoute = () => { setRouteId(null); setRouteForm(blankRoute()); setRouteErrors({}); onError(""); };
  const editRoute = (r: TransportRouteRow) => {
    setRouteId(r.id); setSelected(r.id); setRouteErrors({}); onError("");
    setRouteForm({ name: r.name, code: r.code, startLocation: r.startLocation, endLocation: r.endLocation, distanceKm: str(r.distanceKm), durationMinutes: str(r.durationMinutes), status: r.status, description: r.description ?? "" });
  };
  async function saveRoute() {
    setSaving(true);
    try {
      const body = { name: routeForm.name, code: routeForm.code, startLocation: routeForm.startLocation, endLocation: routeForm.endLocation, distanceKm: num(routeForm.distanceKm),
        durationMinutes: num(routeForm.durationMinutes), status: routeForm.status, description: routeForm.description.trim() || null };
      const saved = routeId === null ? await api.transport.routes.create(body) : await api.transport.routes.update(routeId, body);
      setSelected(saved.id); await loadRoutes(); onNotice(`Route ${saved.name} saved.`); onError("");
      editRoute(saved);
    } catch (e) { if (e instanceof ApiError) setRouteErrors(e.fieldErrors); onError(errText(e)); } finally { setSaving(false); }
  }
  async function removeRoute(r: TransportRouteRow) {
    if (!window.confirm(`Delete route ${r.name}? Its ${r.stopCount} stop(s) will be deleted too.`)) return;
    try { await api.transport.routes.remove(r.id); await loadRoutes(); onNotice(`Route ${r.name} deleted.`); if (routeId === r.id) newRoute(); } catch (e) { onError(errText(e)); }
  }
  const visible = useMemo(() => routes.filter((r) =>
    (r.name.toLowerCase().includes(query.toLowerCase()) || r.code.toLowerCase().includes(query.toLowerCase())) && (status === "All" || r.status === status.toUpperCase())), [routes, query, status]);
  const selectedRoute = routes.find((r) => r.id === selected) ?? null;

  /* ---------------- stops ---------------- */
  const setS = <K extends keyof StopForm>(k: K, v: StopForm[K]) => { setStopForm((f) => ({ ...f, [k]: v })); setStopErrors((e) => { const n = { ...e }; delete n[k]; return n; }); onError(""); onNotice(""); };
  const newStop = () => { setStopId(null); setStopForm({ ...blankStop(), sequenceNo: String(stops.length + 1) }); setStopErrors({}); onError(""); };
  const editStop = (s: TransportStopRow) => {
    setStopId(s.id); setStopErrors({}); onError("");
    setStopForm({ name: s.name, code: s.code ?? "", sequenceNo: String(s.sequenceNo), latitude: str(s.latitude), longitude: str(s.longitude), address: s.address ?? "", arrivalTime: s.arrivalTime ?? "",
      departureTime: s.departureTime ?? "", radiusMeters: String(s.radiusMeters), stopType: s.stopType, status: s.status });
  };
  const stopBody = (s: TransportStopRow, patch: Partial<TransportStopBody> = {}): TransportStopBody => ({
    routeId: s.routeId, name: s.name, code: s.code, sequenceNo: s.sequenceNo, latitude: s.latitude, longitude: s.longitude, address: s.address, arrivalTime: s.arrivalTime,
    departureTime: s.departureTime, radiusMeters: s.radiusMeters, stopType: s.stopType, status: s.status, ...patch,
  });
  async function saveStop() {
    if (selected === null) return;
    setSaving(true);
    try {
      const body: TransportStopBody = { routeId: selected, name: stopForm.name, code: stopForm.code.trim() || null, sequenceNo: num(stopForm.sequenceNo), latitude: num(stopForm.latitude),
        longitude: num(stopForm.longitude), address: stopForm.address.trim() || null, arrivalTime: stopForm.arrivalTime || null, departureTime: stopForm.departureTime || null,
        radiusMeters: num(stopForm.radiusMeters) ?? 100, stopType: stopForm.stopType, status: stopForm.status };
      const saved = stopId === null ? await api.transport.stops.create(body) : await api.transport.stops.update(stopId, body);
      await Promise.all([loadStops(), loadRoutes()]); onNotice(`Stop ${saved.name} saved.`); onError("");
      newStop();
    } catch (e) { if (e instanceof ApiError) setStopErrors(e.fieldErrors); onError(errText(e)); } finally { setSaving(false); }
  }
  async function moveStop(s: TransportStopRow, dir: -1 | 1) {
    try { await api.transport.stops.update(s.id, stopBody(s, { sequenceNo: s.sequenceNo + dir })); await loadStops(); } catch (e) { onError(errText(e)); }
  }
  async function removeStop(s: TransportStopRow) {
    if (!window.confirm(`Delete stop ${s.name}?`)) return;
    try { await api.transport.stops.remove(s.id); await Promise.all([loadStops(), loadRoutes()]); onNotice(`Stop ${s.name} deleted.`); if (stopId === s.id) newStop(); } catch (e) { onError(errText(e)); }
  }

  return (
    <>
      <Panel>
        <PanelTitle title="Routes" right={<PrimaryButton type="button" onClick={newRoute}><Plus size={14} /> Add Route</PrimaryButton>} />
        <div className="px-4 pb-4">
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <SearchBox value={query} onChange={setQuery} placeholder="Search routes..." />
            <Field label="Status" className="w-[120px]"><select className={controlClass} value={status} onChange={(e) => setStatus(e.target.value)}><option>All</option><option>Active</option><option>Inactive</option></select></Field>
          </div>
          <DataTable heads={["#", "Route Name", "Code", "Start", "End", "Stops", "Distance (km)", "Duration (min)", "Vehicles", "Status", "Actions"]} min={980}>
            {loading && <EmptyRow cols={11} text="Loading routes..." />}
            {!loading && visible.length === 0 && <EmptyRow cols={11} text={routes.length === 0 ? "No routes yet. Add the first one below." : "No routes match your filters."} />}
            {!loading && visible.map((r, i) => (
              <tr key={r.id} className={`cursor-pointer hover:bg-blue-50/50 ${selected === r.id ? "bg-blue-50/60" : ""}`} onClick={() => setSelected(r.id)}>
                <td className={tdClass}>{i + 1}</td>
                <td className={`${tdClass} font-semibold text-[#17245e]`}>{r.name}</td>
                <td className={tdClass}>{r.code}</td><td className={tdClass}>{r.startLocation}</td><td className={tdClass}>{r.endLocation}</td>
                <td className={tdClass}>{r.stopCount}</td><td className={tdClass}>{r.distanceKm ?? "—"}</td><td className={tdClass}>{r.durationMinutes ?? "—"}</td><td className={tdClass}>{r.vehicleCount}</td>
                <td className={tdClass}><Pill tone={statusTone(r.status)}>{statusLabel(r.status)}</Pill></td>
                <td className={tdClass} onClick={(e) => e.stopPropagation()}><RowActions name={r.name} onEdit={() => editRoute(r)} onDelete={() => void removeRoute(r)} /></td>
              </tr>
            ))}
          </DataTable>
          <TableFooter shown={visible.length} total={routes.length} />
        </div>
      </Panel>

      <DetailCard title={routeId === null ? "New Route" : "Route Details"} saving={saving} onCancel={() => { const r = routes.find((x) => x.id === routeId); if (r) editRoute(r); else newRoute(); }} onSave={() => void saveRoute()} saveLabel="Save Route">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Route Name" required><input className={controlClass} value={routeForm.name} onChange={(e) => setR("name", e.target.value)} /><Err errors={routeErrors} k="name" /></Field>
          <Field label="Route Code" required><input className={controlClass} value={routeForm.code} maxLength={20} onChange={(e) => setR("code", e.target.value.toUpperCase())} /><Err errors={routeErrors} k="code" /></Field>
          <Field label="Start Location" required><input className={controlClass} value={routeForm.startLocation} onChange={(e) => setR("startLocation", e.target.value)} /><Err errors={routeErrors} k="startLocation" /></Field>
          <Field label="End Location" required><input className={controlClass} value={routeForm.endLocation} onChange={(e) => setR("endLocation", e.target.value)} /><Err errors={routeErrors} k="endLocation" /></Field>
          <Field label="Distance (km)" optional><input type="number" min={0} step="0.1" className={controlClass} value={routeForm.distanceKm} onChange={(e) => setR("distanceKm", e.target.value)} /><Err errors={routeErrors} k="distanceKm" /></Field>
          <Field label="Estimated Duration (minutes)" optional><input type="number" min={1} className={controlClass} value={routeForm.durationMinutes} onChange={(e) => setR("durationMinutes", e.target.value)} /><Err errors={routeErrors} k="durationMinutes" /></Field>
          <Field label="Status"><select className={controlClass} value={routeForm.status} onChange={(e) => setR("status", e.target.value as TransportStatus)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field>
          <Field label="Route Description" optional className="sm:col-span-2 lg:col-span-4"><textarea className={`${textareaClass} min-h-[44px]`} rows={2} maxLength={500} value={routeForm.description} onChange={(e) => setR("description", e.target.value)} /><Err errors={routeErrors} k="description" /></Field>
        </div>
      </DetailCard>

      <Panel>
        <PanelTitle title={selectedRoute ? `Stops – ${selectedRoute.name}` : "Stops"} right={<PrimaryButton type="button" onClick={newStop} disabled={selected === null}><Plus size={14} /> Add Stop</PrimaryButton>} />
        <div className="px-4 pb-4">
          {selected === null ? <p className="py-6 text-center text-[11px] text-slate-500">Add or select a route to manage its stops.</p> : (
            <>
              <DataTable heads={["#", "Order", "Stop Name", "Code", "Location", "Arrival", "Departure", "Type", "Status", "Actions"]} min={900}>
                {stopsLoading && <EmptyRow cols={10} text="Loading stops..." />}
                {!stopsLoading && stops.length === 0 && <EmptyRow cols={10} text="No stops on this route yet." />}
                {!stopsLoading && stops.map((s, i) => (
                  <tr key={s.id} className={`hover:bg-blue-50/50 ${stopId === s.id ? "bg-blue-50/60" : ""}`}>
                    <td className={tdClass}>{s.sequenceNo}</td>
                    <td className={tdClass}>
                      <button type="button" aria-label={`Move ${s.name} up`} disabled={i === 0} onClick={() => void moveStop(s, -1)} className="rounded p-0.5 text-slate-500 hover:bg-blue-50 disabled:opacity-30"><ArrowUp size={13} /></button>
                      <button type="button" aria-label={`Move ${s.name} down`} disabled={i === stops.length - 1} onClick={() => void moveStop(s, 1)} className="rounded p-0.5 text-slate-500 hover:bg-blue-50 disabled:opacity-30"><ArrowDown size={13} /></button>
                    </td>
                    <td className={`${tdClass} font-semibold text-[#17245e]`}>{s.name}</td>
                    <td className={tdClass}>{s.code ?? "—"}</td>
                    <td className={tdClass}>{s.latitude !== null && s.longitude !== null ? `${s.latitude}, ${s.longitude}` : s.address ?? "—"}</td>
                    <td className={tdClass}>{s.arrivalTime ? fmtTime(s.arrivalTime) : "—"}</td>
                    <td className={tdClass}>{s.departureTime ? fmtTime(s.departureTime) : "—"}</td>
                    <td className={tdClass}>{stopTypes.find(([k]) => k === s.stopType)?.[1]}</td>
                    <td className={tdClass}><Pill tone={statusTone(s.status)}>{statusLabel(s.status)}</Pill></td>
                    <td className={tdClass}><RowActions name={s.name} onEdit={() => editStop(s)} onDelete={() => void removeStop(s)} /></td>
                  </tr>
                ))}
              </DataTable>
              <TableFooter shown={stops.length} total={stops.length} />
            </>
          )}
        </div>
      </Panel>

      {selected !== null && (
        <DetailCard title={stopId === null ? "New Stop" : "Stop Details"} saving={saving} onCancel={() => { const s = stops.find((x) => x.id === stopId); if (s) editStop(s); else newStop(); }} onSave={() => void saveStop()} saveLabel="Save Stop">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Stop Name" required><input className={controlClass} value={stopForm.name} onChange={(e) => setS("name", e.target.value)} /><Err errors={stopErrors} k="name" /></Field>
            <Field label="Stop Code" optional><input className={controlClass} value={stopForm.code} maxLength={20} onChange={(e) => setS("code", e.target.value.toUpperCase())} /><Err errors={stopErrors} k="code" /></Field>
            <Field label="Sequence Order"><input type="number" min={1} className={controlClass} value={stopForm.sequenceNo} placeholder="Last" onChange={(e) => setS("sequenceNo", e.target.value)} /><Err errors={stopErrors} k="sequenceNo" /></Field>
            <Field label="Stop Type">
              <select className={controlClass} value={stopForm.stopType} onChange={(e) => setS("stopType", e.target.value as StopType)}>{stopTypes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><Err errors={stopErrors} k="stopType" />
            </Field>
            <Field label="Latitude" optional><input type="number" step="any" className={controlClass} value={stopForm.latitude} onChange={(e) => setS("latitude", e.target.value)} placeholder="12.9716" /><Err errors={stopErrors} k="latitude" /></Field>
            <Field label="Longitude" optional><input type="number" step="any" className={controlClass} value={stopForm.longitude} onChange={(e) => setS("longitude", e.target.value)} placeholder="77.5946" /><Err errors={stopErrors} k="longitude" /></Field>
            <Field label="Arrival Time" optional><input type="time" className={controlClass} value={stopForm.arrivalTime} onChange={(e) => setS("arrivalTime", e.target.value)} /><Err errors={stopErrors} k="arrivalTime" /></Field>
            <Field label="Departure Time" optional><input type="time" className={controlClass} value={stopForm.departureTime} onChange={(e) => setS("departureTime", e.target.value)} /><Err errors={stopErrors} k="departureTime" /></Field>
            <Field label="Radius (metres)"><input type="number" min={10} max={1000} className={controlClass} value={stopForm.radiusMeters} onChange={(e) => setS("radiusMeters", e.target.value)} /><Err errors={stopErrors} k="radiusMeters" /></Field>
            <Field label="Status"><select className={controlClass} value={stopForm.status} onChange={(e) => setS("status", e.target.value as TransportStatus)}><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></Field>
            <Field label="Address" optional className="sm:col-span-2"><input className={controlClass} value={stopForm.address} maxLength={300} onChange={(e) => setS("address", e.target.value)} /><Err errors={stopErrors} k="address" /></Field>
          </div>
        </DetailCard>
      )}
    </>
  );
}
