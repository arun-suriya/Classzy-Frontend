import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, Plus } from "lucide-react";
import { api, ApiError } from "../../services/api";
import type { PushCategoryBody, PushCategoryRow } from "../../services/api";
import { DataTable, DetailCard, EmptyRow, Field, Panel, PanelTitle, PrimaryButton, RowActions, TableFooter, Toggle, controlClass, tdClass, textareaClass } from "./AcademicShared";
import { errText, useActiveInstitution } from "./SettingsShared";
import { Chk, CommFrame, NumF, SaveRow, SelF, Sw, TextF, TimeF, saveAll, sendTimeOpts, soundOpts, timezoneOpts, useCommSection } from "./CommunicationShared";
import type { Section } from "./CommunicationShared";
import { TemplatesPanel } from "./MessageTemplates";

const tabs = [
  { key: "general", label: "General Settings" }, { key: "mobile", label: "Mobile App" }, { key: "web", label: "Web Portal" },
  { key: "categories", label: "Notification Categories" }, { key: "templates", label: "Templates" }, { key: "delivery", label: "Delivery Preferences" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const blankCategory = (): PushCategoryBody => ({ name: "", description: "", active: true, mobile: true, web: true });

export default function PushSettings() {
  const inst = useActiveInstitution();
  const id = inst.institutionId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "general") as TabKey;
  const push = useCommSection("PUSH", id);
  const mobile = useCommSection("PUSH_MOBILE", id);
  const web = useCommSection("PUSH_WEB", id);
  const delivery = useCommSection("PUSH_DELIVERY", id);
  const bySection: Partial<Record<TabKey, Section>> = { general: push, mobile, web, delivery };
  const current = bySection[tab];

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  async function save(list: Section[], label: string) {
    const e = await saveAll(list);
    if (e) { setError(e); setNotice(""); } else { setError(""); setNotice(`${label} saved.`); }
  }

  /* ---------------- categories ---------------- */
  const [cats, setCats] = useState<PushCategoryRow[]>([]);
  const [cLoading, setCLoading] = useState(false);
  const [cSaving, setCSaving] = useState(false);
  const [cForm, setCForm] = useState<PushCategoryBody>(blankCategory);
  const [cId, setCId] = useState<number | null>(null);
  const [cErrors, setCErrors] = useState<Record<string, string>>({});

  const loadCats = useCallback(async () => {
    if (id === null) { setCats([]); return; }
    setCLoading(true);
    try { setCats(await api.communication.pushCategories.list()); } catch (e) { setError(errText(e)); } finally { setCLoading(false); }
  }, [id]);
  useEffect(() => { if (tab === "categories") void loadCats(); }, [tab, loadCats]);

  const setC = <K extends keyof PushCategoryBody>(k: K, v: PushCategoryBody[K]) => { setCForm((f) => ({ ...f, [k]: v })); setCErrors((e) => { const n = { ...e }; delete n[k]; return n; }); setError(""); setNotice(""); };
  const newCat = () => { setCId(null); setCForm(blankCategory()); setCErrors({}); setError(""); };
  const editCat = (c: PushCategoryRow) => { setCId(c.id); setCForm({ name: c.name, description: c.description ?? "", active: c.active, mobile: c.mobile, web: c.web }); setCErrors({}); setError(""); };
  async function saveCat() {
    setCSaving(true);
    try {
      const body = { ...cForm, description: cForm.description?.trim() || null };
      const saved = cId === null ? await api.communication.pushCategories.create(body) : await api.communication.pushCategories.update(cId, body);
      setCats(await api.communication.pushCategories.list()); setNotice(`${saved.name} saved.`); setError("");
      if (cId === null) newCat(); else editCat(saved);
    } catch (e) { if (e instanceof ApiError) setCErrors(e.fieldErrors); setError(errText(e)); } finally { setCSaving(false); }
  }
  async function patchCat(c: PushCategoryRow, patch: Partial<PushCategoryBody>) {
    try { await api.communication.pushCategories.update(c.id, { name: c.name, description: c.description, active: c.active, mobile: c.mobile, web: c.web, ...patch }); setCats(await api.communication.pushCategories.list()); }
    catch (e) { setError(errText(e)); }
  }
  async function removeCat(c: PushCategoryRow) {
    if (!window.confirm(`Delete category ${c.name}?`)) return;
    try { await api.communication.pushCategories.remove(c.id); setCats(await api.communication.pushCategories.list()); setNotice(`${c.name} deleted.`); if (cId === c.id) newCat(); } catch (e) { setError(errText(e)); }
  }
  const CE = ({ k }: { k: string }) => (cErrors[k] ? <div className="mt-0.5 text-[9px] font-semibold text-rose-600">{cErrors[k]}</div> : null);

  return (
    <CommFrame step={3} title="Push Notifications" subtitle="Configure push notifications for mobile app and web portal." crumb="Push Notifications" nav="push" inst={inst}
      tabs={tabs} tab={tab} onTab={(k) => { setParams({ tab: k }); setError(""); setNotice(""); }} error={error} notice={notice} loadError={current?.loadError}>

      {tab === "general" && push.loaded && (
        <Panel>
          <PanelTitle icon={<Bell size={20} strokeWidth={2.4} />} title="General Settings" />
          <div className="grid grid-cols-1 gap-4 px-4 pb-2 lg:grid-cols-2">
            <div className="space-y-3">
              <Sw s={push} k="enabled" label="Enable push notifications" />
              <Sw s={push} k="allowCustomize" label="Allow users to customize notification preferences" />
              <Sw s={push} k="importantOnly" label="Notify users for important announcements only" />
              <TextF s={push} k="senderName" label="Default Sender Name" max={60} />
              <SelF s={push} k="deepLink" label="Default Deep Link Behaviour" options={[["OPEN_APP", "Open in App"], ["OPEN_WEB", "Open in Web Portal"], ["NONE", "Do nothing"]]} />
              <SelF s={push} k="sound" label="Default Notification Sound" options={soundOpts} />
            </div>
            <div className="space-y-2 rounded-lg border border-[#e1ecfa] bg-white p-3">
              <div className="text-[12px] font-extrabold text-[#101b69]">Global Options</div>
              <Sw s={push} k="allRolesDefault" label="Send to all user roles by default" />
              <Sw s={push} k="includeLogo" label="Include institution logo in notifications" />
              <Sw s={push} k="badgeCount" label="Show badge count on app icon" />
              <Sw s={push} k="richNotifications" label="Enable rich notifications (image, action buttons)" />
              <Sw s={push} k="trackOpens" label="Track notification opens and clicks" />
              <Sw s={push} k="allowScheduling" label="Allow scheduling of notifications" />
            </div>
          </div>
          <SaveRow saving={push.saving} onSave={() => void save([push], "Push settings")} onCancel={push.reset} disabled={!push.dirty} />
        </Panel>
      )}

      {tab === "mobile" && mobile.loaded && (
        <Panel>
          <PanelTitle title="Mobile App" />
          <div className="grid grid-cols-1 gap-4 px-4 pb-2 lg:grid-cols-2">
            <div className="space-y-2">
              <Sw s={mobile} k="enabled" label="Enable push notifications for mobile app" />
              <Sw s={mobile} k="promptPermission" label="Prompt users to enable notifications" />
              <Sw s={mobile} k="inAppCenter" label="Allow in-app notification centre" />
              <Sw s={mobile} k="lockScreenPreview" label="Show preview on lock screen" />
            </div>
            <div className="space-y-3">
              <SelF s={mobile} k="sound" label="Default Notification Sound (Mobile)" options={soundOpts} />
              <SelF s={mobile} k="vibration" label="Vibration Pattern" options={[["DEFAULT", "Default"], ["SHORT", "Short"], ["LONG", "Long"], ["NONE", "None"]]} />
              <SelF s={mobile} k="badge" label="Badge Count" options={[["UNREAD", "Show unread count"], ["ALL", "Show all count"], ["NONE", "Hide badge"]]} />
              <Sw s={mobile} k="silentEnabled" label="Silent hours" />
              <div className="grid grid-cols-2 gap-3">
                <TimeF s={mobile} k="silentStart" label="Start Time" disabled={!mobile.bool("silentEnabled")} />
                <TimeF s={mobile} k="silentEnd" label="End Time" disabled={!mobile.bool("silentEnabled")} />
              </div>
            </div>
          </div>
          <SaveRow saving={mobile.saving} onSave={() => void save([mobile], "Mobile app settings")} onCancel={mobile.reset} disabled={!mobile.dirty} />
        </Panel>
      )}

      {tab === "web" && web.loaded && (
        <Panel>
          <PanelTitle title="Web Portal" />
          <div className="grid grid-cols-1 gap-4 px-4 pb-2 lg:grid-cols-2">
            <div className="space-y-2">
              <Sw s={web} k="enabled" label="Enable browser push notifications" />
              <Sw s={web} k="inAppCenter" label="Show in-app notification centre" />
              <Sw s={web} k="popups" label="Allow notification pop-ups" />
              <Sw s={web} k="desktop" label="Show desktop notifications" />
              <Sw s={web} k="playSound" label="Play sound for web notifications" />
            </div>
            <div className="space-y-3">
              <SelF s={web} k="sound" label="Default Notification Sound (Web)" options={soundOpts} />
              <NumF s={web} k="durationSeconds" label="Display Duration (seconds)" min={1} max={60} />
              <SelF s={web} k="position" label="Position" options={[["TOP_RIGHT", "Top Right"], ["TOP_LEFT", "Top Left"], ["BOTTOM_RIGHT", "Bottom Right"], ["BOTTOM_LEFT", "Bottom Left"]]} />
            </div>
          </div>
          <SaveRow saving={web.saving} onSave={() => void save([web], "Web portal settings")} onCancel={web.reset} disabled={!web.dirty} />
        </Panel>
      )}

      {tab === "categories" && (
        <>
          <Panel>
            <PanelTitle title="Notification Categories" right={<PrimaryButton type="button" onClick={newCat}><Plus size={14} /> Add Category</PrimaryButton>} />
            <div className="px-4 pb-4">
              <DataTable heads={["#", "Category Name", "Description", "Default Status", "Mobile App", "Web Portal", "Actions"]} min={820}>
                {cLoading && <EmptyRow cols={7} text="Loading categories..." />}
                {!cLoading && cats.length === 0 && <EmptyRow cols={7} text="No categories yet." />}
                {!cLoading && cats.map((c, i) => (
                  <tr key={c.id} className={`hover:bg-blue-50/50 ${cId === c.id ? "bg-blue-50/60" : ""}`}>
                    <td className={tdClass}>{i + 1}</td>
                    <td className={`${tdClass} font-semibold text-[#17245e]`}>{c.name}</td>
                    <td className={tdClass}>{c.description ?? "—"}</td>
                    <td className={tdClass}><Toggle checked={c.active} onChange={(v) => void patchCat(c, { active: v })} label="" /></td>
                    <td className={tdClass}><input type="checkbox" aria-label={`${c.name} on mobile app`} className="h-3.5 w-3.5 accent-blue-600" checked={c.mobile} onChange={(e) => void patchCat(c, { mobile: e.target.checked })} /></td>
                    <td className={tdClass}><input type="checkbox" aria-label={`${c.name} on web portal`} className="h-3.5 w-3.5 accent-blue-600" checked={c.web} onChange={(e) => void patchCat(c, { web: e.target.checked })} /></td>
                    <td className={tdClass}><RowActions name={c.name} onEdit={() => editCat(c)} onDelete={() => void removeCat(c)} /></td>
                  </tr>
                ))}
              </DataTable>
              <TableFooter shown={cats.length} total={cats.length} />
            </div>
          </Panel>
          <DetailCard title={cId === null ? "New Category" : "Category Details"} saving={cSaving} onCancel={() => { const c = cats.find((x) => x.id === cId); if (c) editCat(c); else newCat(); }} onSave={() => void saveCat()}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Category Name" required><input className={controlClass} value={cForm.name} maxLength={60} onChange={(e) => setC("name", e.target.value)} /><CE k="name" /></Field>
              <Field label="Description" optional><textarea className={`${textareaClass} min-h-[38px]`} rows={1} maxLength={200} value={cForm.description ?? ""} onChange={(e) => setC("description", e.target.value)} /><CE k="description" /></Field>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-6">
              <Toggle checked={cForm.active} onChange={(v) => setC("active", v)} />
              <label className="flex items-center gap-2 text-[11px] text-[#17265f]"><input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={cForm.mobile} onChange={(e) => setC("mobile", e.target.checked)} /> Mobile app</label>
              <label className="flex items-center gap-2 text-[11px] text-[#17265f]"><input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={cForm.web} onChange={(e) => setC("web", e.target.checked)} /> Web portal</label>
            </div>
          </DetailCard>
        </>
      )}

      {tab === "templates" && id !== null && <TemplatesPanel channel="PUSH" institutionId={id} onError={setError} onNotice={setNotice} />}

      {tab === "delivery" && delivery.loaded && (
        <Panel>
          <PanelTitle title="Delivery Preferences" />
          <div className="grid grid-cols-1 gap-4 px-4 pb-2 lg:grid-cols-3">
            <div className="space-y-3">
              <div className="text-[12px] font-extrabold text-[#101b69]">Delivery Timing</div>
              <SelF s={delivery} k="sendMode" label="Default Send Mode" options={sendTimeOpts} />
              <TimeF s={delivery} k="sendTime" label="Scheduled Send Time" disabled={delivery.str("sendMode") !== "SCHEDULED"} />
              <SelF s={delivery} k="timezone" label="Time Zone" options={timezoneOpts} />
            </div>
            <div className="space-y-3">
              <div className="text-[12px] font-extrabold text-[#101b69]">Target Audience</div>
              <SelF s={delivery} k="audience" label="Send To" options={[["ALL", "All users"], ["ROLES", "Specific roles"], ["CLASSES", "Specific classes"], ["USERS", "Specific users"]]} />
            </div>
            <div className="space-y-3">
              <div className="text-[12px] font-extrabold text-[#101b69]">Frequency & Limits</div>
              <NumF s={delivery} k="maxPerDay" label="Max notifications per user per day" min={1} max={200} />
              <NumF s={delivery} k="minInterval" label="Minimum interval (minutes)" min={0} max={1440} />
              <Chk s={delivery} k="avoidDuplicates" label="Avoid sending duplicate notifications" />
              <Chk s={delivery} k="limitSilent" label="Limit notifications during silent hours" />
            </div>
          </div>
          <SaveRow saving={delivery.saving} onSave={() => void save([delivery], "Delivery preferences")} onCancel={delivery.reset} disabled={!delivery.dirty} />
        </Panel>
      )}
    </CommFrame>
  );
}
