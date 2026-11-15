import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bus } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { AcademicHeader, Breadcrumb, Notice, Panel, PanelTitle } from "./AcademicShared";
import { ContextBar, useActiveInstitution } from "./SettingsShared";
import { ChkList, NumF, SaveRow, SelF, Sw, dayOpts, useCommSection } from "./CommunicationShared";
import { RoutesAndStops } from "./TransportRoutes";
import { DriversPanel, VehiclesPanel } from "./TransportFleet";

const tabs = [
  { key: "general", label: "General Settings" }, { key: "routes", label: "Routes & Stops" }, { key: "vehicles", label: "Vehicle Management" }, { key: "drivers", label: "Driver Management" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

export default function TransportSettings() {
  const inst = useActiveInstitution();
  const id = inst.institutionId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "general") as TabKey;
  const settings = useCommSection("TRANSPORT", id);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function saveGeneral() {
    const e = await settings.save();
    if (e) { setError(e); setNotice(""); } else { setError(""); setNotice("Transport settings saved."); }
  }
  const off = settings.loaded && !settings.bool("enabled");

  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={7} title="Transport Settings" subtitle="Configure transport management and GPS tracking settings." right={<ContextBar inst={inst} />} />
        <Breadcrumb trail={["Institutions", "Institution Settings", "Transport Settings", tabs.find((t) => t.key === tab)!.label]} />

        <div className="overflow-x-auto">
          <div className="grid min-w-[560px] grid-cols-4 gap-2">
            {tabs.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => { setParams({ tab: key }); setError(""); setNotice(""); }} aria-current={tab === key ? "page" : undefined}
                className={`rounded-md border px-3 py-2 text-center text-[10px] font-semibold transition ${tab === key ? "border-blue-500 bg-[#dcecff] text-blue-800 shadow-[inset_0_-2px_0_#1478f8]" : "border-[#cfe0f5] bg-white text-[#34467a] hover:border-blue-300 hover:bg-blue-50"}`}>{label}</button>
            ))}
          </div>
        </div>

        {error && <Notice tone="error"><span className="font-bold">Please review:</span> {error}</Notice>}
        {settings.loadError && tab === "general" && <Notice tone="error">{settings.loadError}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {id === null && <Notice tone="info">{inst.isSuper ? "Create an institution first, then choose it above." : "Your account isn't linked to an institution."}</Notice>}

        {tab === "general" && settings.loaded && (
          <Panel>
            <PanelTitle icon={<Bus size={20} strokeWidth={2.4} />} title="General Settings" />
            <div className="space-y-4 px-4 pb-2">
              <Sw s={settings} k="enabled" label="Enable transport module" />
              {off && <p className="text-[10px] text-amber-700">The transport module is switched off for this institution.</p>}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelF s={settings} k="provider" label="Transport Provider" options={[["IN_HOUSE", "In-House"], ["THIRD_PARTY", "Third-party contractor"]]} />
                <SelF s={settings} k="gpsProvider" label="GPS Tracking Provider" options={[["CLASSZY_GPS", "Classzy GPS (Default)"], ["THIRD_PARTY", "Third-party GPS"], ["NONE", "No GPS tracking"]]} />
                <NumF s={settings} k="stopRadius" label="Default Radius for Stop (metres)" min={10} max={1000} />
                <NumF s={settings} k="trackingInterval" label="Live Tracking Interval (seconds)" min={5} max={600} />
                <SelF s={settings} k="parentAccess" label="Parent App Access" options={[["LIVE_TRACKING", "Allow live tracking"], ["ETA_ONLY", "Show ETA only"], ["NONE", "No access"]]} />
              </div>

              <div>
                <div className="mb-2 text-[12px] font-extrabold text-[#101b69]">Safety & Alerts</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  <Sw s={settings} k="sosAlert" label="Enable SOS alert for students" />
                  <Sw s={settings} k="notifyPickDrop" label="Notify parents for pick/drop" />
                  <Sw s={settings} k="geofenceAlert" label="Geofence alerts" />
                  <Sw s={settings} k="routeDeviationAlert" label="Route deviation alerts" />
                  <Sw s={settings} k="speedAlert" label="Speed limit alert" />
                  <NumF s={settings} k="speedLimit" label="Speed Limit (km/h)" min={10} max={150} />
                </div>
              </div>

              <div>
                <div className="mb-2 text-[12px] font-extrabold text-[#101b69]">Default Settings</div>
                <div className="mb-1 text-[11px] font-bold text-[#17245e]">Transport Working Days</div>
                <ChkList s={settings} k="workingDays" options={dayOpts} cols={4} />
                <div className="mt-3 grid grid-cols-1 gap-3 sm:max-w-lg sm:grid-cols-2">
                  <NumF s={settings} k="pickupWindow" label="Default Pick-up Window (minutes)" min={1} max={120} />
                  <NumF s={settings} k="dropWindow" label="Default Drop Window (minutes)" min={1} max={120} />
                </div>
              </div>
              <p className="text-[9px] text-slate-500">These are the rules transport will follow. Live GPS tracking and alert sending need a GPS provider connected and are not active yet.</p>
            </div>
            <SaveRow saving={settings.saving} onSave={() => void saveGeneral()} onCancel={settings.reset} disabled={!settings.dirty} saveLabel="Save Changes" />
          </Panel>
        )}
        {tab === "routes" && id !== null && <RoutesAndStops institutionId={id} onError={setError} onNotice={setNotice} />}
        {tab === "vehicles" && id !== null && <VehiclesPanel institutionId={id} onError={setError} onNotice={setNotice} />}
        {tab === "drivers" && id !== null && <DriversPanel institutionId={id} onError={setError} onNotice={setNotice} />}

        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
