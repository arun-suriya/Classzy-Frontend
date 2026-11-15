import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { MessageSquare, Plus } from "lucide-react";
import { api, ApiError } from "../../services/api";
import type { SenderIdBody, SenderIdRow } from "../../services/api";
import { DataTable, DetailCard, EmptyRow, Field, OutlineButton, Panel, PanelTitle, PrimaryButton, RowActions, TableFooter, controlClass, tdClass } from "./AcademicShared";
import { errText, useActiveInstitution } from "./SettingsShared";
import { AreaF, Chk, ChkList, CommFrame, NumF, SaveRow, SecretF, SelF, Sw, TextF, TimeF, categoryOpts, languageOpts, saveAll, sendTimeOpts, timezoneOpts, useCommSection } from "./CommunicationShared";
import type { Section } from "./CommunicationShared";
import { TemplatesPanel } from "./MessageTemplates";

const tabs = [
  { key: "general", label: "SMS Settings" }, { key: "provider", label: "Provider Configuration" }, { key: "senders", label: "Sender ID" },
  { key: "templates", label: "Templates" }, { key: "delivery", label: "Delivery Preferences" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const providerOpts = [["TWILIO", "Twilio"], ["MSG91", "MSG91"], ["TEXTLOCAL", "Textlocal"], ["AWS_SNS", "AWS SNS"], ["CUSTOM", "Custom"]] as const;
const countryOpts = [["+91", "+91 (India)"], ["+1", "+1 (US / Canada)"], ["+44", "+44 (UK)"], ["+971", "+971 (UAE)"], ["+65", "+65 (Singapore)"], ["+61", "+61 (Australia)"], ["+977", "+977 (Nepal)"], ["+94", "+94 (Sri Lanka)"], ["+880", "+880 (Bangladesh)"], ["+966", "+966 (Saudi Arabia)"]] as const;
const smsCats = ["ADMISSIONS", "ATTENDANCE", "EXAMINATIONS", "FEES", "TRANSPORT", "LIBRARY", "ANNOUNCEMENTS", "EVENTS", "EMERGENCY"];
const notifyOpts = [["FAILED_SMS", "Failed SMS"], ["LOW_BALANCE", "Low balance"], ["HIGH_VOLUME", "High volume usage"], ["PROVIDER_DOWNTIME", "Provider downtime"], ["DAILY_SUMMARY", "Daily summary"]] as const;
const statusStyle: Record<string, string> = { APPROVED: "bg-emerald-50 text-emerald-700", PENDING: "bg-amber-50 text-amber-700", REJECTED: "bg-rose-50 text-rose-700" };
const blankSender = (): SenderIdBody => ({ senderId: "", senderType: "ALPHANUMERIC", status: "PENDING", defaultSender: false });

export default function SmsSettings() {
  const inst = useActiveInstitution();
  const id = inst.institutionId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "general") as TabKey;
  const sms = useCommSection("SMS", id);
  const provider = useCommSection("SMS_PROVIDER", id);
  const delivery = useCommSection("SMS_DELIVERY", id);
  const reports = useCommSection("SMS_REPORTS", id);
  const bySection: Partial<Record<TabKey, Section>> = { general: sms, provider, delivery };
  const current = bySection[tab];

  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  async function save(list: Section[], label: string) {
    const e = await saveAll(list);
    if (e) { setError(e); setNotice(""); } else { setError(""); setNotice(`${label} saved.`); }
  }
  async function testConnection() {
    setTesting(true); setTestResult(null);
    const e = await provider.save();
    if (e) { setError(e); setTesting(false); return; }
    try { setTestResult(await api.communication.testConnection("sms-provider")); setError(""); }
    catch (err) { setError(errText(err)); } finally { setTesting(false); }
  }

  /* ---------------- sender ids ---------------- */
  const [senders, setSenders] = useState<SenderIdRow[]>([]);
  const [sLoading, setSLoading] = useState(false);
  const [sSaving, setSSaving] = useState(false);
  const [sForm, setSForm] = useState<SenderIdBody>(blankSender);
  const [sId, setSId] = useState<number | null>(null);
  const [sErrors, setSErrors] = useState<Record<string, string>>({});

  const loadSenders = useCallback(async () => {
    if (id === null) { setSenders([]); return; }
    setSLoading(true);
    try { setSenders(await api.communication.senderIds.list()); } catch (e) { setError(errText(e)); } finally { setSLoading(false); }
  }, [id]);
  useEffect(() => { if (tab === "senders") void loadSenders(); }, [tab, loadSenders]);

  const setS = <K extends keyof SenderIdBody>(k: K, v: SenderIdBody[K]) => { setSForm((f) => ({ ...f, [k]: v })); setSErrors((e) => { const n = { ...e }; delete n[k]; return n; }); setError(""); setNotice(""); };
  const newSender = () => { setSId(null); setSForm(blankSender()); setSErrors({}); setError(""); };
  const editSender = (r: SenderIdRow) => { setSId(r.id); setSForm({ senderId: r.senderId, senderType: r.senderType, status: r.status, defaultSender: r.defaultSender }); setSErrors({}); setError(""); };
  async function saveSender() {
    setSSaving(true);
    try {
      const saved = sId === null ? await api.communication.senderIds.create(sForm) : await api.communication.senderIds.update(sId, sForm);
      setSenders(await api.communication.senderIds.list()); setNotice(`${saved.senderId} saved.`); setError("");
      if (sId === null) newSender(); else editSender(saved);
    } catch (e) { if (e instanceof ApiError) setSErrors(e.fieldErrors); setError(errText(e)); } finally { setSSaving(false); }
  }
  async function makeDefault(r: SenderIdRow) {
    if (r.status !== "APPROVED") { setError("Only an approved sender ID can be the default."); return; }
    try { await api.communication.senderIds.update(r.id, { senderId: r.senderId, senderType: r.senderType, status: r.status, defaultSender: true }); setSenders(await api.communication.senderIds.list()); setError(""); }
    catch (e) { setError(errText(e)); }
  }
  async function removeSender(r: SenderIdRow) {
    if (!window.confirm(`Delete sender ID ${r.senderId}?`)) return;
    try { await api.communication.senderIds.remove(r.id); setSenders(await api.communication.senderIds.list()); setNotice(`${r.senderId} deleted.`); if (sId === r.id) newSender(); } catch (e) { setError(errText(e)); }
  }
  const SE = ({ k }: { k: string }) => (sErrors[k] ? <div className="mt-0.5 text-[9px] font-semibold text-rose-600">{sErrors[k]}</div> : null);

  return (
    <CommFrame step={2} title="SMS Settings" subtitle="Configure SMS provider, sender ID, templates and delivery preferences." crumb="SMS Settings" nav="sms" inst={inst}
      tabs={tabs} tab={tab} onTab={(k) => { setParams({ tab: k }); setError(""); setNotice(""); setTestResult(null); }} error={error} notice={notice} loadError={current?.loadError}>

      {tab === "general" && sms.loaded && (
        <Panel>
          <PanelTitle icon={<MessageSquare size={20} strokeWidth={2.4} />} title="SMS Settings – General" />
          <div className="grid grid-cols-1 gap-4 px-4 pb-2 lg:grid-cols-2">
            <div className="space-y-3">
              <Sw s={sms} k="enabled" label="Enable SMS notifications" />
              <SelF s={sms} k="language" label="Default SMS Language" required options={languageOpts} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelF s={sms} k="countryCode" label="Default Country Code" required options={countryOpts} />
                <SelF s={sms} k="encoding" label="Message Encoding" required options={[["UTF8", "Unicode (UTF-8)"], ["GSM7", "GSM 7-bit"]]} />
              </div>
              <SelF s={sms} k="messageType" label="Default Message Type" options={[["TRANSACTIONAL", "Transactional"], ["PROMOTIONAL", "Promotional"], ["OTP", "OTP"]]} />
            </div>
            <div className="rounded-lg border border-[#e1ecfa] bg-white p-3">
              <div className="text-[12px] font-extrabold text-[#101b69]">Notification Categories</div>
              <p className="mb-2 text-[10px] text-slate-500">Select the types of SMS to enable.</p>
              <ChkList s={sms} k="categories" options={categoryOpts(smsCats)} />
            </div>
          </div>
          <SaveRow saving={sms.saving} onSave={() => void save([sms], "SMS settings")} onCancel={sms.reset} disabled={!sms.dirty} />
        </Panel>
      )}

      {tab === "provider" && provider.loaded && (
        <Panel>
          <PanelTitle title="Provider Configuration" />
          <div className="space-y-3 px-4 pb-2">
            <p className="text-[10px] text-slate-500">SMS provider and account details.</p>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <SelF s={provider} k="provider" label="SMS Provider" required options={providerOpts} />
              <TextF s={provider} k="accountSid" label="Account SID / Key" required />
              <SecretF s={provider} k="authToken" label="Auth Token" required />
              <TextF s={provider} k="fromNumber" label="Phone Number (From)" required placeholder="+1 234 567 8900" />
              <TextF s={provider} k="apiUrl" label="API URL" optional placeholder="https://api.twilio.com/2010-04-01" className="lg:col-span-2" />
              <NumF s={provider} k="timeoutSeconds" label="Timeout (seconds)" min={5} max={120} />
            </div>
            <Chk s={provider} k="webhookEnabled" label="Enable webhook for delivery reports" />
            <TextF s={provider} k="webhookUrl" label="Webhook URL" optional placeholder="https://yourdomain.com/api/sms/webhook" />
            <div className="flex flex-wrap items-center gap-3">
              <OutlineButton type="button" onClick={() => void testConnection()} disabled={testing || provider.saving || !provider.str("apiUrl")}>{testing ? "Testing..." : "Test Connection"}</OutlineButton>
              {testResult && <span className={`text-[11px] font-semibold ${testResult.ok ? "text-emerald-700" : "text-rose-600"}`}>{testResult.message}</span>}
            </div>
            <p className="text-[9px] text-slate-500">Test Connection saves these details, then checks that the API URL host can be reached. It does not verify the account.</p>
          </div>
          <SaveRow saving={provider.saving} onSave={() => void save([provider], "Provider configuration")} onCancel={provider.reset} disabled={!provider.dirty} />
        </Panel>
      )}

      {tab === "senders" && (
        <>
          <Panel>
            <PanelTitle title="Sender ID" right={<PrimaryButton type="button" onClick={newSender}><Plus size={14} /> Add Sender ID</PrimaryButton>} />
            <div className="px-4 pb-4">
              <DataTable heads={["#", "Sender ID", "Type", "Status", "Default", "Actions"]} min={600}>
                {sLoading && <EmptyRow cols={6} text="Loading sender IDs..." />}
                {!sLoading && senders.length === 0 && <EmptyRow cols={6} text="No sender IDs yet." />}
                {!sLoading && senders.map((r, i) => (
                  <tr key={r.id} className={`hover:bg-blue-50/50 ${sId === r.id ? "bg-blue-50/60" : ""}`}>
                    <td className={tdClass}>{i + 1}</td>
                    <td className={`${tdClass} font-semibold text-[#17245e]`}>{r.senderId}</td>
                    <td className={tdClass}>{r.senderType === "NUMERIC" ? "Numeric" : "Alphanumeric"}</td>
                    <td className={tdClass}><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${statusStyle[r.status]}`}>{r.status.charAt(0) + r.status.slice(1).toLowerCase()}</span></td>
                    <td className={tdClass}><input type="radio" name="defaultSender" aria-label={`Make ${r.senderId} the default`} className="accent-blue-600" checked={r.defaultSender} onChange={() => void makeDefault(r)} /></td>
                    <td className={tdClass}><RowActions name={r.senderId} onEdit={() => editSender(r)} onDelete={() => void removeSender(r)} /></td>
                  </tr>
                ))}
              </DataTable>
              <TableFooter shown={senders.length} total={senders.length} />
              <p className="mt-2 text-[9px] text-slate-500">Sender ID approval is subject to telecom regulations in your country. Record the status your provider gives you.</p>
            </div>
          </Panel>
          <DetailCard title={sId === null ? "New Sender ID" : "Sender ID Details"} saving={sSaving} onCancel={() => { const r = senders.find((x) => x.id === sId); if (r) editSender(r); else newSender(); }} onSave={() => void saveSender()}>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <Field label="Sender ID" required><input className={controlClass} value={sForm.senderId} maxLength={20} onChange={(e) => setS("senderId", e.target.value)} /><SE k="senderId" /></Field>
              <Field label="Type" required>
                <select className={controlClass} value={sForm.senderType} onChange={(e) => setS("senderType", e.target.value as SenderIdBody["senderType"])}><option value="ALPHANUMERIC">Alphanumeric</option><option value="NUMERIC">Numeric</option></select><SE k="senderType" />
              </Field>
              <Field label="Status" required>
                <select className={controlClass} value={sForm.status} onChange={(e) => setS("status", e.target.value as SenderIdBody["status"])}><option value="APPROVED">Approved</option><option value="PENDING">Pending</option><option value="REJECTED">Rejected</option></select><SE k="status" />
              </Field>
            </div>
            <label className="mt-3 flex items-center gap-2 text-[11px] text-[#17265f]">
              <input type="checkbox" className="h-3.5 w-3.5 accent-blue-600" checked={sForm.defaultSender} onChange={(e) => setS("defaultSender", e.target.checked)} /> Use as the default sender ID
            </label>
            <SE k="defaultSender" />
          </DetailCard>
        </>
      )}

      {tab === "templates" && id !== null && <TemplatesPanel channel="SMS" institutionId={id} onError={setError} onNotice={setNotice} />}

      {tab === "delivery" && delivery.loaded && (
        <>
          <Panel>
            <PanelTitle title="Delivery Preferences" />
            <div className="grid grid-cols-1 gap-4 px-4 pb-2 lg:grid-cols-3">
              <div className="space-y-3">
                <div className="text-[12px] font-extrabold text-[#101b69]">Delivery Timing</div>
                <SelF s={delivery} k="sendTime" label="Default Send Time" options={sendTimeOpts} />
                <div className="grid grid-cols-2 gap-3"><TimeF s={delivery} k="allowedFrom" label="Allowed From" /><TimeF s={delivery} k="allowedTo" label="Allowed To" /></div>
                <SelF s={delivery} k="timezone" label="Time Zone" options={timezoneOpts} />
                <Sw s={delivery} k="businessHoursOnly" label="Business hours only" />
                <Sw s={delivery} k="delayNonUrgent" label="Delay non-urgent SMS" />
                <NumF s={delivery} k="delayMinutes" label="Delay by" min={1} max={1440} suffix="minutes" />
              </div>
              <div className="space-y-3">
                <div className="text-[12px] font-extrabold text-[#101b69]">Retry Policy</div>
                <div className="grid grid-cols-2 gap-3">
                  <NumF s={delivery} k="maxRetries" label="Max Retry Attempts" min={0} max={10} />
                  <NumF s={delivery} k="retryInterval" label="Retry Interval (min)" min={1} max={1440} />
                </div>
                <Chk s={delivery} k="retryTemporary" label="Retry on temporary failure" />
                <NumF s={delivery} k="stopAfterHours" label="Stop retrying after" min={1} max={168} suffix="hours" />
              </div>
              <div className="space-y-3">
                <div className="text-[12px] font-extrabold text-[#101b69]">Recipient Limits</div>
                <NumF s={delivery} k="maxPerRecipientDay" label="Max SMS per recipient per day" min={1} max={100} />
                <NumF s={delivery} k="maxPerBatch" label="Max bulk SMS per batch" min={1} max={100000} />
              </div>
            </div>
            <SaveRow saving={delivery.saving} onSave={() => void save([delivery], "Delivery preferences")} onCancel={delivery.reset} disabled={!delivery.dirty} />
          </Panel>
          {reports.loaded && (
            <Panel>
              <PanelTitle title="Delivery Reports & Notifications" />
              <div className="grid grid-cols-1 gap-4 px-4 pb-2 lg:grid-cols-2">
                <div className="space-y-2">
                  <Sw s={reports} k="enabled" label="Enable delivery reports" />
                  <Sw s={reports} k="store" label="Store delivery reports" />
                  <Sw s={reports} k="notifyFailure" label="Notify on delivery failure" />
                  <Sw s={reports} k="summaryToAdmin" label="Send summary report to admin" />
                </div>
                <div className="space-y-3">
                  <AreaF s={reports} k="adminEmails" label="Admin notification emails (comma separated)" optional rows={2} />
                  <div className="text-[11px] font-bold text-[#17245e]">Notify for</div>
                  <ChkList s={reports} k="notifyFor" options={notifyOpts} cols={2} />
                </div>
              </div>
              <SaveRow saving={reports.saving} onSave={() => void save([reports], "Delivery reports")} onCancel={reports.reset} disabled={!reports.dirty} />
            </Panel>
          )}
        </>
      )}
    </CommFrame>
  );
}
