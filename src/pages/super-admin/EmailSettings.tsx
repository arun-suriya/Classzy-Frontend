import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Mail } from "lucide-react";
import { api } from "../../services/api";
import { OutlineButton, Panel, PanelTitle } from "./AcademicShared";
import { errText, useActiveInstitution } from "./SettingsShared";
import { AreaF, Chk, ChkList, CommFrame, NumF, SaveRow, SecretF, SelF, Sw, TextF, TimeF, categoryOpts, dayOpts, languageOpts, saveAll, sendTimeOpts, timezoneOpts, useCommSection } from "./CommunicationShared";
import type { Section } from "./CommunicationShared";

const tabs = [
  { key: "general", label: "Email Settings" }, { key: "smtp", label: "SMTP Configuration" }, { key: "sender", label: "Sender Details" },
  { key: "signature", label: "Email Signature" }, { key: "delivery", label: "Delivery Preferences" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const providerOpts = [["SENDGRID", "SendGrid"], ["AWS_SES", "AWS SES"], ["GMAIL", "Gmail"], ["MICROSOFT_365", "Microsoft 365"], ["CUSTOM", "Custom SMTP"]] as const;
const presets: Record<string, { host: string; port: string; username: string; note: string }> = {
  SENDGRID: { host: "smtp.sendgrid.net", port: "587", username: "apikey", note: "Password: your SendGrid API key" },
  AWS_SES: { host: "email-smtp.ap-south-1.amazonaws.com", port: "587", username: "", note: "Use your SES SMTP credentials. Change the region in the host if needed." },
  GMAIL: { host: "smtp.gmail.com", port: "587", username: "", note: "Use an app password, not your normal password." },
  MICROSOFT_365: { host: "smtp.office365.com", port: "587", username: "", note: "Use the mailbox address and its password or app password." },
};
const emailCats = ["ADMISSIONS", "ATTENDANCE", "EXAMINATIONS", "FEES", "TRANSPORT", "LIBRARY", "ANNOUNCEMENTS", "EVENTS", "MARKETING"];

export default function EmailSettings() {
  const inst = useActiveInstitution();
  const id = inst.institutionId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "general") as TabKey;
  const email = useCommSection("EMAIL", id);
  const smtp = useCommSection("SMTP", id);
  const sender = useCommSection("SENDER", id);
  const sig = useCommSection("SIGNATURE", id);
  const delivery = useCommSection("EMAIL_DELIVERY", id);
  const bySection: Record<TabKey, Section> = { general: email, smtp, sender, signature: sig, delivery };
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
    const e = await smtp.save();                       // the test uses the saved settings
    if (e) { setError(e); setTesting(false); return; }
    try { setTestResult(await api.communication.testConnection("smtp")); setError(""); }
    catch (err) { setError(errText(err)); } finally { setTesting(false); }
  }
  function applyPreset(key: string) {
    smtp.set("provider", key);
    const p = presets[key];
    if (p) { smtp.set("host", p.host); smtp.set("port", p.port); if (p.username) smtp.set("username", p.username); }
    setTestResult(null);
  }
  const preset = presets[smtp.str("provider")];
  const disabledBanner = email.loaded && !email.bool("enabled");

  return (
    <CommFrame step={1} title="Communication Settings" subtitle="Configure email, SMS, push notifications and templates for effective communication." crumb="Email Settings" nav="email" inst={inst}
      tabs={tabs} tab={tab} onTab={(k) => { setParams({ tab: k }); setError(""); setNotice(""); setTestResult(null); }} error={error} notice={notice} loadError={current.loadError}>

      {tab === "general" && email.loaded && (
        <Panel>
          <PanelTitle icon={<Mail size={20} strokeWidth={2.4} />} title="Email Settings – General" />
          <div className="grid grid-cols-1 gap-4 px-4 pb-2 lg:grid-cols-2">
            <div className="space-y-3">
              <Sw s={email} k="enabled" label="Enable email notifications" />
              <TextF s={email} k="defaultFrom" label="Default From Email" required type="email" />
              <TextF s={email} k="replyTo" label="Reply-To Email" optional type="email" />
              <SelF s={email} k="language" label="Default Email Language" options={languageOpts} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Sw s={email} k="includeLogo" label="Include institution logo" />
                <Sw s={email} k="includeUnsubscribe" label="Include unsubscribe link" />
              </div>
              <div className="flex gap-6"><Chk s={email} k="trackOpens" label="Track opens" /><Chk s={email} k="trackClicks" label="Track clicks" /></div>
            </div>
            <div className="rounded-lg border border-[#e1ecfa] bg-white p-3">
              <div className="text-[12px] font-extrabold text-[#101b69]">Email Categories</div>
              <p className="mb-2 text-[10px] text-slate-500">Select the types of emails to enable.</p>
              <ChkList s={email} k="categories" options={categoryOpts(emailCats)} />
            </div>
          </div>
          {disabledBanner && <p className="px-4 pb-1 text-[10px] text-amber-700">Email notifications are switched off for this institution.</p>}
          <SaveRow saving={email.saving} onSave={() => void save([email], "Email settings")} onCancel={email.reset} disabled={!email.dirty} />
        </Panel>
      )}

      {tab === "smtp" && smtp.loaded && (
        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-[1fr_360px]">
          <Panel>
            <PanelTitle title="SMTP Configuration" />
            <div className="space-y-3 px-4 pb-2">
              <p className="text-[10px] text-slate-500">Details of the mail server used to send emails.</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <SelF s={smtp} k="provider" label="SMTP Provider" required options={providerOpts} className="lg:col-span-1" />
                <TextF s={smtp} k="host" label="SMTP Host" required className="lg:col-span-1" />
                <NumF s={smtp} k="port" label="Port" required min={1} max={65535} />
                <Sw s={smtp} k="ssl" label="Use SSL/TLS" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextF s={smtp} k="username" label="Username" required />
                <SecretF s={smtp} k="password" label="Password / API Key" required />
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <OutlineButton type="button" onClick={() => void testConnection()} disabled={testing || smtp.saving}>{testing ? "Testing..." : "Test Connection"}</OutlineButton>
                {testResult && <span className={`text-[11px] font-semibold ${testResult.ok ? "text-emerald-700" : "text-rose-600"}`}>{testResult.message}</span>}
              </div>
              <p className="text-[9px] text-slate-500">Test Connection saves these details first, then checks that the server can be reached. It does not verify the login.</p>
            </div>
            <SaveRow saving={smtp.saving} onSave={() => void save([smtp], "SMTP settings")} onCancel={smtp.reset} disabled={!smtp.dirty} />
          </Panel>
          <Panel>
            <PanelTitle title="Common SMTP Settings" />
            <div className="space-y-3 px-4 pb-4">
              <div className="grid grid-cols-2 gap-1.5">
                {providerOpts.filter(([k]) => k !== "CUSTOM").map(([k, l]) => (
                  <button key={k} type="button" onClick={() => applyPreset(k)}
                    className={`rounded-md border px-2 py-1.5 text-[10px] font-semibold ${smtp.str("provider") === k ? "border-blue-500 bg-[#dcecff] text-blue-800" : "border-[#cfe0f5] bg-white text-[#34467a] hover:bg-blue-50"}`}>{l}</button>
                ))}
              </div>
              {preset ? (
                <dl className="grid grid-cols-[80px_1fr] gap-y-1.5 text-[11px]">
                  <dt className="font-bold text-[#17245e]">Host:</dt><dd>{preset.host}</dd>
                  <dt className="font-bold text-[#17245e]">Port:</dt><dd>{preset.port} (TLS)</dd>
                  <dt className="font-bold text-[#17245e]">Username:</dt><dd>{preset.username || "Your account"}</dd>
                  <dt className="font-bold text-[#17245e]">Note:</dt><dd>{preset.note}</dd>
                </dl>
              ) : <p className="text-[11px] text-slate-500">Enter the host, port and login given by your mail provider.</p>}
              <p className="text-[9px] text-slate-500">Choosing a provider fills in the host and port. Review them, then save.</p>
            </div>
          </Panel>
        </div>
      )}

      {tab === "sender" && sender.loaded && (
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
          <Panel>
            <PanelTitle title="Sender Details" />
            <div className="space-y-3 px-4 pb-2">
              <p className="text-[10px] text-slate-500">The sender information shown to recipients.</p>
              <TextF s={sender} k="senderName" label="Sender Name" required />
              <TextF s={sender} k="senderEmail" label="Sender Email" required type="email" />
              <AreaF s={sender} k="address" label="Sender Address" optional rows={3} max={300} />
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextF s={sender} k="contactEmail" label="Contact Email" optional type="email" />
                <TextF s={sender} k="contactPhone" label="Contact Phone" optional />
              </div>
            </div>
            <SaveRow saving={sender.saving} onSave={() => void save([sender], "Sender details")} onCancel={sender.reset} disabled={!sender.dirty} />
          </Panel>
          <Panel>
            <PanelTitle title="Sender Preview" />
            <div className="px-4 pb-4">
              <div className="rounded-lg border border-[#e1ecfa] bg-white p-3 text-[11px]">
                <div className="font-bold text-[#17245e]">{sender.str("senderName") || "Sender name"}</div>
                <div className="text-slate-500">{sender.str("senderEmail") || "sender@example.com"}</div>
                <div className="mt-1 text-slate-400">To: parent@example.com</div>
                <div className="mt-3 border-t border-[#e1ecfa] pt-2 text-slate-600">
                  <div className="font-semibold">{sender.str("senderName") || "Your institution"}</div>
                  {sender.str("address") && <div className="whitespace-pre-line">{sender.str("address")}</div>}
                  <div>{[sender.str("contactPhone"), sender.str("contactEmail")].filter(Boolean).join(" | ")}</div>
                </div>
              </div>
            </div>
          </Panel>
        </div>
      )}

      {tab === "signature" && sig.loaded && (
        <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
          <Panel>
            <PanelTitle title="Email Signature" />
            <div className="space-y-3 px-4 pb-2">
              <AreaF s={sig} k="content" label="Signature Content" rows={6} max={2000} placeholder={"Regards,\nGreenfield International School\n123 Education Avenue"} />
              <SelF s={sig} k="position" label="Position" options={[["BOTTOM", "Bottom of email"], ["TOP", "Top of email"]]} />
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Chk s={sig} k="includeLogo" label="Include institution logo" />
                <Chk s={sig} k="includeSocial" label="Include social media links" />
                <Chk s={sig} k="includeDisclaimer" label="Include legal disclaimer" />
                <Chk s={sig} k="includeAll" label="Include signature in all emails" />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <TextF s={sig} k="facebook" label="Facebook URL" optional /><TextF s={sig} k="twitter" label="Twitter / X URL" optional />
                <TextF s={sig} k="instagram" label="Instagram URL" optional /><TextF s={sig} k="linkedin" label="LinkedIn URL" optional />
              </div>
            </div>
            <SaveRow saving={sig.saving} onSave={() => void save([sig], "Email signature")} onCancel={sig.reset} disabled={!sig.dirty} />
          </Panel>
          <Panel>
            <PanelTitle title="Signature Preview" />
            <div className="px-4 pb-4">
              <div className="rounded-lg border border-[#e1ecfa] bg-white p-3 text-[11px] text-slate-700">
                <div className="whitespace-pre-line">{sig.str("content") || "Your signature will appear here."}</div>
                {sig.bool("includeSocial") && (
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-blue-700">
                    {(["facebook", "twitter", "instagram", "linkedin"] as const).filter((k) => sig.str(k)).map((k) => <span key={k} className="capitalize underline">{k}</span>)}
                  </div>
                )}
                {sig.bool("includeDisclaimer") && <div className="mt-2 text-[9px] text-slate-400">This email may contain confidential information intended only for the recipient.</div>}
              </div>
              <p className="mt-2 text-[9px] text-slate-500">Plain text signature. Rich formatting can be added later.</p>
            </div>
          </Panel>
        </div>
      )}

      {tab === "delivery" && delivery.loaded && (
        <Panel>
          <PanelTitle title="Delivery Preferences" />
          <div className="grid grid-cols-1 gap-4 px-4 pb-2 lg:grid-cols-3">
            <div className="space-y-3">
              <div className="text-[12px] font-extrabold text-[#101b69]">Delivery Timing</div>
              <SelF s={delivery} k="sendTime" label="Default Send Time" options={sendTimeOpts} />
              <SelF s={delivery} k="timezone" label="Time Zone" options={timezoneOpts} />
              <Sw s={delivery} k="businessHoursOnly" label="Business hours only" />
              <Sw s={delivery} k="delayNonUrgent" label="Delay non-urgent emails" />
              <NumF s={delivery} k="delayMinutes" label="Delay by" min={1} max={1440} suffix="minutes" />
            </div>
            <div className="space-y-3">
              <div className="text-[12px] font-extrabold text-[#101b69]">Delivery Options</div>
              <Chk s={delivery} k="batchSimilar" label="Batch similar notifications" />
              <Chk s={delivery} k="sendDigest" label="Send digest for non-urgent notifications" />
              <Chk s={delivery} k="limitPerDay" label="Limit number of emails per user per day" />
              <NumF s={delivery} k="maxPerDay" label="Emails per day" min={1} max={500} />
              <Chk s={delivery} k="retryFailed" label="Retry failed emails" />
              <div className="grid grid-cols-2 gap-3">
                <NumF s={delivery} k="maxRetries" label="Max Retry Attempts" min={0} max={10} />
                <NumF s={delivery} k="retryInterval" label="Retry Interval (min)" min={1} max={1440} />
              </div>
              <Chk s={delivery} k="copyAdmin" label="Send copy to institution admin for important emails" />
            </div>
            <div className="space-y-3">
              <div className="text-[12px] font-extrabold text-[#101b69]">Quiet Hours</div>
              <Sw s={delivery} k="quietEnabled" label="Enable quiet hours" />
              <div className="grid grid-cols-2 gap-3">
                <TimeF s={delivery} k="quietStart" label="Start Time" disabled={!delivery.bool("quietEnabled")} />
                <TimeF s={delivery} k="quietEnd" label="End Time" disabled={!delivery.bool("quietEnabled")} />
              </div>
              <div className="text-[11px] font-bold text-[#17245e]">Applicable Days</div>
              <ChkList s={delivery} k="quietDays" options={dayOpts} cols={4} />
            </div>
          </div>
          <SaveRow saving={delivery.saving} onSave={() => void save([delivery], "Delivery preferences")} onCancel={delivery.reset} disabled={!delivery.dirty} />
        </Panel>
      )}
    </CommFrame>
  );
}
