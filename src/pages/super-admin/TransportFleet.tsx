import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { api, ApiError } from "../../services/api";
import type { DriverStatus, FuelType, LicenseType, TransportDriverRow, TransportRouteRow, TransportVehicleRow, VehicleStatus, VehicleType } from "../../services/api";
import { DataTable, DetailCard, EmptyRow, Field, Panel, PanelTitle, PrimaryButton, RowActions, SearchBox, TableFooter, controlClass, fmtDate, tdClass, textareaClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { Err, ExpiryPill, Pill, StatCard, num, statusLabel, statusTone, str } from "./TransportShared";

type Props = { institutionId: number | null; onError: (m: string) => void; onNotice: (m: string) => void };

const vehicleTypes: [VehicleType, string][] = [["BUS", "Bus"], ["VAN", "Van"], ["CAR", "Car"], ["OTHER", "Other"]];
const fuelTypes: [FuelType, string][] = [["DIESEL", "Diesel"], ["PETROL", "Petrol"], ["CNG", "CNG"], ["ELECTRIC", "Electric"], ["OTHER", "Other"]];
const vehicleStates: [VehicleStatus, string][] = [["ACTIVE", "Active"], ["INACTIVE", "Inactive"], ["MAINTENANCE", "Under Maintenance"]];
const driverStates: [DriverStatus, string][] = [["ACTIVE", "Active"], ["ON_LEAVE", "On Leave"], ["INACTIVE", "Inactive"]];
const licenseTypes: [LicenseType, string][] = [["LMV", "Light Motor Vehicle (LMV)"], ["HMV", "Heavy Vehicle (HMV)"], ["HGMV", "Heavy Goods (HGMV)"], ["HPMV", "Heavy Passenger (HPMV)"]];

/* ============================================================ vehicles */

type VehicleForm = {
  vehicleNo: string; registrationNo: string; vehicleType: VehicleType; make: string; model: string; manufactureYear: string; seatingCapacity: string; standingCapacity: string;
  fuelType: FuelType; insuranceExpiry: string; pucExpiry: string; status: VehicleStatus; routeId: string; driverId: string; remarks: string;
};
const blankVehicle = (): VehicleForm => ({ vehicleNo: "", registrationNo: "", vehicleType: "BUS", make: "", model: "", manufactureYear: "", seatingCapacity: "", standingCapacity: "", fuelType: "DIESEL",
  insuranceExpiry: "", pucExpiry: "", status: "ACTIVE", routeId: "", driverId: "", remarks: "" });

export function VehiclesPanel({ institutionId, onError, onNotice }: Props) {
  const [rows, setRows] = useState<TransportVehicleRow[]>([]);
  const [routes, setRoutes] = useState<TransportRouteRow[]>([]);
  const [drivers, setDrivers] = useState<TransportDriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<VehicleForm>(blankVehicle);
  const [editId, setEditId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [type, setType] = useState("All");

  const load = useCallback(async () => {
    if (institutionId === null) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [v, r, d] = await Promise.all([api.transport.vehicles.list(), api.transport.routes.list(), api.transport.drivers.list()]);
      setRows(v); setRoutes(r); setDrivers(d); onError("");
    } catch (e) { onError(errText(e)); } finally { setLoading(false); }
  }, [institutionId, onError]);
  useEffect(() => { void load(); }, [load]);

  const set = <K extends keyof VehicleForm>(k: K, v: VehicleForm[K]) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => { const n = { ...e }; delete n[k]; return n; }); onError(""); onNotice(""); };
  const startNew = () => { setEditId(null); setForm(blankVehicle()); setErrors({}); onError(""); };
  const startEdit = (v: TransportVehicleRow) => {
    setEditId(v.id); setErrors({}); onError("");
    setForm({ vehicleNo: v.vehicleNo, registrationNo: v.registrationNo, vehicleType: v.vehicleType, make: v.make, model: v.model, manufactureYear: str(v.manufactureYear), seatingCapacity: str(v.seatingCapacity),
      standingCapacity: str(v.standingCapacity), fuelType: v.fuelType, insuranceExpiry: v.insuranceExpiry ?? "", pucExpiry: v.pucExpiry ?? "", status: v.status, routeId: str(v.routeId), driverId: str(v.driverId), remarks: v.remarks ?? "" });
  };
  async function save() {
    setSaving(true);
    try {
      const body = { vehicleNo: form.vehicleNo, registrationNo: form.registrationNo, vehicleType: form.vehicleType, make: form.make, model: form.model, manufactureYear: num(form.manufactureYear),
        seatingCapacity: num(form.seatingCapacity), standingCapacity: num(form.standingCapacity), fuelType: form.fuelType, insuranceExpiry: form.insuranceExpiry || null, pucExpiry: form.pucExpiry || null,
        status: form.status, routeId: num(form.routeId), driverId: num(form.driverId), remarks: form.remarks.trim() || null };
      const saved = editId === null ? await api.transport.vehicles.create(body) : await api.transport.vehicles.update(editId, body);
      await load(); onNotice(`Vehicle ${saved.vehicleNo} saved.`); onError("");
      if (editId === null) startNew(); else startEdit(saved);
    } catch (e) { if (e instanceof ApiError) setErrors(e.fieldErrors); onError(errText(e)); } finally { setSaving(false); }
  }
  async function remove(v: TransportVehicleRow) {
    if (!window.confirm(`Delete vehicle ${v.vehicleNo}?`)) return;
    try { await api.transport.vehicles.remove(v.id); await load(); onNotice(`Vehicle ${v.vehicleNo} deleted.`); if (editId === v.id) startNew(); } catch (e) { onError(errText(e)); }
  }

  const visible = useMemo(() => rows.filter((v) =>
    [v.vehicleNo, v.registrationNo, v.make, v.model].some((t) => t.toLowerCase().includes(query.toLowerCase())) && (status === "All" || v.status === status) && (type === "All" || v.vehicleType === type)), [rows, query, status, type]);

  const stats = useMemo(() => {
    const byType = new Map<string, number>();
    rows.forEach((v) => byType.set(v.vehicleType, (byType.get(v.vehicleType) ?? 0) + 1));
    return {
      total: rows.length, active: rows.filter((v) => v.status === "ACTIVE").length, inactive: rows.filter((v) => v.status === "INACTIVE").length, maintenance: rows.filter((v) => v.status === "MAINTENANCE").length,
      seats: rows.reduce((a, v) => a + v.seatingCapacity, 0), standing: rows.reduce((a, v) => a + (v.standingCapacity ?? 0), 0), byType,
    };
  }, [rows]);

  return (
    <>
      <Panel>
        <PanelTitle title="Vehicle Summary" />
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-3 lg:grid-cols-6">
          <StatCard label="Total Vehicles" value={stats.total} /><StatCard label="Active" value={stats.active} tone="green" /><StatCard label="Inactive" value={stats.inactive} tone="amber" />
          <StatCard label="Under Maintenance" value={stats.maintenance} tone="red" /><StatCard label="Seating Capacity" value={stats.seats} /><StatCard label="Standing Capacity" value={stats.standing} />
        </div>
        {stats.total > 0 && (
          <div className="px-4 pb-4">
            <div className="mb-1 text-[11px] font-bold text-[#17245e]">Vehicle Type Distribution</div>
            <div className="space-y-1">
              {vehicleTypes.filter(([k]) => stats.byType.has(k)).map(([k, l]) => {
                const n = stats.byType.get(k) ?? 0;
                return (
                  <div key={k} className="flex items-center gap-2 text-[10px]">
                    <span className="w-12 text-slate-600">{l}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded bg-slate-100"><div className="h-full rounded bg-blue-500" style={{ width: `${(n / stats.total) * 100}%` }} /></div>
                    <span className="w-16 text-right font-semibold text-[#17245e]">{n} ({Math.round((n / stats.total) * 100)}%)</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </Panel>

      <Panel>
        <PanelTitle title="Vehicle List" right={<PrimaryButton type="button" onClick={startNew}><Plus size={14} /> Add Vehicle</PrimaryButton>} />
        <div className="px-4 pb-4">
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <SearchBox value={query} onChange={setQuery} placeholder="Search vehicles..." />
            <Field label="Status" className="w-[150px]"><select className={controlClass} value={status} onChange={(e) => setStatus(e.target.value)}><option value="All">All</option>{vehicleStates.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <Field label="Vehicle Type" className="w-[130px]"><select className={controlClass} value={type} onChange={(e) => setType(e.target.value)}><option value="All">All</option>{vehicleTypes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          </div>
          <DataTable heads={["#", "Vehicle No", "Registration No", "Type", "Make & Model", "Seats", "Route", "Driver", "Documents", "Status", "Actions"]} min={1040}>
            {loading && <EmptyRow cols={11} text="Loading vehicles..." />}
            {!loading && visible.length === 0 && <EmptyRow cols={11} text={rows.length === 0 ? "No vehicles yet. Add the first one below." : "No vehicles match your filters."} />}
            {!loading && visible.map((v, i) => (
              <tr key={v.id} className={`hover:bg-blue-50/50 ${editId === v.id ? "bg-blue-50/60" : ""}`}>
                <td className={tdClass}>{i + 1}</td>
                <td className={`${tdClass} font-semibold text-[#17245e]`}>{v.vehicleNo}</td><td className={tdClass}>{v.registrationNo}</td>
                <td className={tdClass}>{vehicleTypes.find(([k]) => k === v.vehicleType)?.[1]}</td><td className={tdClass}>{v.make} {v.model}</td>
                <td className={tdClass}>{v.seatingCapacity}</td><td className={tdClass}>{v.routeName ?? "—"}</td><td className={tdClass}>{v.driverName ?? "—"}</td>
                <td className={tdClass}>
                  <div className="flex flex-wrap gap-1">
                    {(v.insuranceExpiry && <span className="flex items-center gap-1 text-[10px]">Insurance <ExpiryPill date={v.insuranceExpiry} /></span>) || null}
                    {(v.pucExpiry && <span className="flex items-center gap-1 text-[10px]">PUC <ExpiryPill date={v.pucExpiry} /></span>) || null}
                    {!v.insuranceExpiry && !v.pucExpiry && "—"}
                  </div>
                </td>
                <td className={tdClass}><Pill tone={statusTone(v.status)}>{statusLabel(v.status)}</Pill></td>
                <td className={tdClass}><RowActions name={v.vehicleNo} onEdit={() => startEdit(v)} onDelete={() => void remove(v)} /></td>
              </tr>
            ))}
          </DataTable>
          <TableFooter shown={visible.length} total={rows.length} />
        </div>
      </Panel>

      <DetailCard title={editId === null ? "New Vehicle" : "Vehicle Details"} saving={saving} onCancel={() => { const v = rows.find((x) => x.id === editId); if (v) startEdit(v); else startNew(); }} onSave={() => void save()} saveLabel="Save Vehicle">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Vehicle Number" required><input className={controlClass} value={form.vehicleNo} onChange={(e) => set("vehicleNo", e.target.value.toUpperCase())} placeholder="KA-01-AB-1234" /><Err errors={errors} k="vehicleNo" /></Field>
          <Field label="Registration Number" required><input className={controlClass} value={form.registrationNo} onChange={(e) => set("registrationNo", e.target.value.toUpperCase())} /><Err errors={errors} k="registrationNo" /></Field>
          <Field label="Vehicle Type" required><select className={controlClass} value={form.vehicleType} onChange={(e) => set("vehicleType", e.target.value as VehicleType)}>{vehicleTypes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><Err errors={errors} k="vehicleType" /></Field>
          <Field label="Status"><select className={controlClass} value={form.status} onChange={(e) => set("status", e.target.value as VehicleStatus)}>{vehicleStates.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Make" required><input className={controlClass} value={form.make} onChange={(e) => set("make", e.target.value)} /><Err errors={errors} k="make" /></Field>
          <Field label="Model" required><input className={controlClass} value={form.model} onChange={(e) => set("model", e.target.value)} /><Err errors={errors} k="model" /></Field>
          <Field label="Year" optional><input type="number" className={controlClass} value={form.manufactureYear} onChange={(e) => set("manufactureYear", e.target.value)} /><Err errors={errors} k="manufactureYear" /></Field>
          <Field label="Fuel Type"><select className={controlClass} value={form.fuelType} onChange={(e) => set("fuelType", e.target.value as FuelType)}>{fuelTypes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Seating Capacity" required><input type="number" min={1} className={controlClass} value={form.seatingCapacity} onChange={(e) => set("seatingCapacity", e.target.value)} /><Err errors={errors} k="seatingCapacity" /></Field>
          <Field label="Standing Capacity" optional><input type="number" min={0} className={controlClass} value={form.standingCapacity} onChange={(e) => set("standingCapacity", e.target.value)} /><Err errors={errors} k="standingCapacity" /></Field>
          <Field label="Insurance Expiry" optional><input type="date" className={controlClass} value={form.insuranceExpiry} onChange={(e) => set("insuranceExpiry", e.target.value)} /><Err errors={errors} k="insuranceExpiry" /></Field>
          <Field label="PUC Expiry" optional><input type="date" className={controlClass} value={form.pucExpiry} onChange={(e) => set("pucExpiry", e.target.value)} /><Err errors={errors} k="pucExpiry" /></Field>
          <Field label="Assigned Route" optional>
            <select className={controlClass} value={form.routeId} onChange={(e) => set("routeId", e.target.value)}><option value="">Not assigned</option>{routes.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select><Err errors={errors} k="routeId" />
          </Field>
          <Field label="Assigned Driver" optional>
            <select className={controlClass} value={form.driverId} onChange={(e) => set("driverId", e.target.value)}>
              <option value="">Not assigned</option>
              {drivers.filter((d) => d.status !== "INACTIVE" || String(d.id) === form.driverId).map((d) => {
                const taken = d.assignedVehicleNo !== null && d.assignedVehicleNo !== rows.find((x) => x.id === editId)?.vehicleNo;
                return <option key={d.id} value={d.id} disabled={taken}>{d.name} ({d.code}){taken ? ` – on ${d.assignedVehicleNo}` : ""}</option>;
              })}
            </select><Err errors={errors} k="driverId" />
          </Field>
          <Field label="Remarks" optional className="sm:col-span-2"><textarea className={`${textareaClass} min-h-[38px]`} rows={1} maxLength={300} value={form.remarks} onChange={(e) => set("remarks", e.target.value)} /><Err errors={errors} k="remarks" /></Field>
        </div>
      </DetailCard>
    </>
  );
}

/* ============================================================ drivers */

type DriverForm = {
  code: string; name: string; mobile: string; dateOfBirth: string; gender: string; address: string; licenseNo: string; licenseExpiry: string; licenseType: LicenseType;
  experienceYears: string; emergencyName: string; emergencyPhone: string; status: DriverStatus; remarks: string;
};
const blankDriver = (): DriverForm => ({ code: "", name: "", mobile: "", dateOfBirth: "", gender: "", address: "", licenseNo: "", licenseExpiry: "", licenseType: "HMV", experienceYears: "", emergencyName: "", emergencyPhone: "", status: "ACTIVE", remarks: "" });

export function DriversPanel({ institutionId, onError, onNotice }: Props) {
  const [rows, setRows] = useState<TransportDriverRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<DriverForm>(blankDriver);
  const [editId, setEditId] = useState<number | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");

  const load = useCallback(async () => {
    if (institutionId === null) { setRows([]); setLoading(false); return; }
    setLoading(true);
    try { setRows(await api.transport.drivers.list()); onError(""); } catch (e) { onError(errText(e)); } finally { setLoading(false); }
  }, [institutionId, onError]);
  useEffect(() => { void load(); }, [load]);

  const set = <K extends keyof DriverForm>(k: K, v: DriverForm[K]) => { setForm((f) => ({ ...f, [k]: v })); setErrors((e) => { const n = { ...e }; delete n[k]; return n; }); onError(""); onNotice(""); };
  const startNew = () => { setEditId(null); setForm(blankDriver()); setErrors({}); onError(""); };
  const startEdit = (d: TransportDriverRow) => {
    setEditId(d.id); setErrors({}); onError("");
    setForm({ code: d.code, name: d.name, mobile: d.mobile, dateOfBirth: d.dateOfBirth ?? "", gender: d.gender ?? "", address: d.address ?? "", licenseNo: d.licenseNo, licenseExpiry: d.licenseExpiry, licenseType: d.licenseType,
      experienceYears: str(d.experienceYears), emergencyName: d.emergencyName ?? "", emergencyPhone: d.emergencyPhone ?? "", status: d.status, remarks: d.remarks ?? "" });
  };
  async function save() {
    setSaving(true);
    try {
      const body = { code: form.code.trim() || null, name: form.name, mobile: form.mobile, dateOfBirth: form.dateOfBirth || null, gender: (form.gender || null) as "MALE" | "FEMALE" | "OTHER" | null,
        address: form.address.trim() || null, licenseNo: form.licenseNo, licenseExpiry: form.licenseExpiry, licenseType: form.licenseType, experienceYears: num(form.experienceYears),
        emergencyName: form.emergencyName.trim() || null, emergencyPhone: form.emergencyPhone.trim() || null, status: form.status, remarks: form.remarks.trim() || null };
      const saved = editId === null ? await api.transport.drivers.create(body) : await api.transport.drivers.update(editId, body);
      await load(); onNotice(`Driver ${saved.name} saved.`); onError("");
      if (editId === null) startNew(); else startEdit(saved);
    } catch (e) { if (e instanceof ApiError) setErrors(e.fieldErrors); onError(errText(e)); } finally { setSaving(false); }
  }
  async function remove(d: TransportDriverRow) {
    if (!window.confirm(`Delete driver ${d.name}?${d.assignedVehicleNo ? ` ${d.assignedVehicleNo} will have no driver.` : ""}`)) return;
    try { await api.transport.drivers.remove(d.id); await load(); onNotice(`Driver ${d.name} deleted.`); if (editId === d.id) startNew(); } catch (e) { onError(errText(e)); }
  }

  const visible = useMemo(() => rows.filter((d) =>
    [d.name, d.code, d.mobile, d.licenseNo].some((t) => t.toLowerCase().includes(query.toLowerCase())) && (status === "All" || d.status === status)), [rows, query, status]);
  const count = (s: DriverStatus) => rows.filter((d) => d.status === s).length;

  return (
    <>
      <Panel>
        <PanelTitle title="Driver Summary" />
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 lg:grid-cols-4">
          <StatCard label="Total Drivers" value={rows.length} /><StatCard label="Active" value={count("ACTIVE")} tone="green" /><StatCard label="On Leave" value={count("ON_LEAVE")} tone="amber" /><StatCard label="Inactive" value={count("INACTIVE")} tone="red" />
        </div>
      </Panel>

      <Panel>
        <PanelTitle title="Driver List" right={<PrimaryButton type="button" onClick={startNew}><Plus size={14} /> Add Driver</PrimaryButton>} />
        <div className="px-4 pb-4">
          <div className="mb-3 flex flex-wrap items-end gap-3">
            <SearchBox value={query} onChange={setQuery} placeholder="Search drivers..." />
            <Field label="Status" className="w-[140px]"><select className={controlClass} value={status} onChange={(e) => setStatus(e.target.value)}><option value="All">All</option>{driverStates.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          </div>
          <DataTable heads={["#", "Driver Code", "Driver Name", "Mobile", "License No", "License Expiry", "Vehicle", "Route", "Status", "Actions"]} min={1000}>
            {loading && <EmptyRow cols={10} text="Loading drivers..." />}
            {!loading && visible.length === 0 && <EmptyRow cols={10} text={rows.length === 0 ? "No drivers yet. Add the first one below." : "No drivers match your filters."} />}
            {!loading && visible.map((d, i) => (
              <tr key={d.id} className={`hover:bg-blue-50/50 ${editId === d.id ? "bg-blue-50/60" : ""}`}>
                <td className={tdClass}>{i + 1}</td><td className={tdClass}>{d.code}</td><td className={`${tdClass} font-semibold text-[#17245e]`}>{d.name}</td><td className={tdClass}>{d.mobile}</td><td className={tdClass}>{d.licenseNo}</td>
                <td className={tdClass}><span className="mr-1">{fmtDate(d.licenseExpiry)}</span><ExpiryPill date={d.licenseExpiry} /></td>
                <td className={tdClass}>{d.assignedVehicleNo ?? "—"}</td><td className={tdClass}>{d.assignedRouteName ?? "—"}</td>
                <td className={tdClass}><Pill tone={statusTone(d.status)}>{statusLabel(d.status)}</Pill></td>
                <td className={tdClass}><RowActions name={d.name} onEdit={() => startEdit(d)} onDelete={() => void remove(d)} /></td>
              </tr>
            ))}
          </DataTable>
          <TableFooter shown={visible.length} total={rows.length} />
        </div>
      </Panel>

      <DetailCard title={editId === null ? "New Driver" : "Driver Details"} saving={saving} onCancel={() => { const d = rows.find((x) => x.id === editId); if (d) startEdit(d); else startNew(); }} onSave={() => void save()} saveLabel="Save Driver">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Driver Code" optional><input className={controlClass} value={form.code} maxLength={20} placeholder="Auto (DRV001)" onChange={(e) => set("code", e.target.value.toUpperCase())} /><Err errors={errors} k="code" /></Field>
          <Field label="Driver Name" required><input className={controlClass} value={form.name} onChange={(e) => set("name", e.target.value)} /><Err errors={errors} k="name" /></Field>
          <Field label="Mobile Number" required><input className={controlClass} value={form.mobile} onChange={(e) => set("mobile", e.target.value)} /><Err errors={errors} k="mobile" /></Field>
          <Field label="Status"><select className={controlClass} value={form.status} onChange={(e) => set("status", e.target.value as DriverStatus)}>{driverStates.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Date of Birth" optional><input type="date" className={controlClass} value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} /><Err errors={errors} k="dateOfBirth" /></Field>
          <Field label="Gender" optional><select className={controlClass} value={form.gender} onChange={(e) => set("gender", e.target.value)}><option value="">Not specified</option><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></Field>
          <Field label="Experience (years)" optional><input type="number" min={0} className={controlClass} value={form.experienceYears} onChange={(e) => set("experienceYears", e.target.value)} /><Err errors={errors} k="experienceYears" /></Field>
          <Field label="Address" optional><input className={controlClass} value={form.address} maxLength={300} onChange={(e) => set("address", e.target.value)} /><Err errors={errors} k="address" /></Field>
          <Field label="License Number" required><input className={controlClass} value={form.licenseNo} onChange={(e) => set("licenseNo", e.target.value.toUpperCase())} /><Err errors={errors} k="licenseNo" /></Field>
          <Field label="License Expiry" required><input type="date" className={controlClass} value={form.licenseExpiry} onChange={(e) => set("licenseExpiry", e.target.value)} /><Err errors={errors} k="licenseExpiry" /></Field>
          <Field label="License Type" required><select className={controlClass} value={form.licenseType} onChange={(e) => set("licenseType", e.target.value as LicenseType)}>{licenseTypes.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Remarks" optional><input className={controlClass} value={form.remarks} maxLength={300} onChange={(e) => set("remarks", e.target.value)} /><Err errors={errors} k="remarks" /></Field>
          <Field label="Emergency Contact Name" optional><input className={controlClass} value={form.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} /><Err errors={errors} k="emergencyName" /></Field>
          <Field label="Emergency Contact Number" optional><input className={controlClass} value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} /><Err errors={errors} k="emergencyPhone" /></Field>
        </div>
      </DetailCard>
    </>
  );
}
