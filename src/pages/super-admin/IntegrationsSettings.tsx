import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plug } from "lucide-react";
import { api } from "../../services/api";
import type { CatalogItem } from "../../services/api";
import { OutlineButton, Panel, PanelTitle, PrimaryButton, fmtDate } from "./AcademicShared";
import { errText, useActiveInstitution } from "./SettingsShared";
import { CatalogPanel } from "./CatalogPanel";
import { SettingsFrame } from "./SettingsFrame";
import { Pill, StatCard } from "./TransportShared";

const tabs = [{ key: "available", label: "Available Integrations" }, { key: "configured", label: "Configured Integrations" }] as const;
type TabKey = (typeof tabs)[number]["key"];

const categories = [["PAYMENT", "Payment"], ["SMS", "SMS"], ["EMAIL", "Email"], ["VIDEO", "Video"], ["STORAGE", "Storage"], ["IDENTITY", "Identity"], ["ANALYTICS", "Analytics"], ["OTHER", "Other"]] as const;
const catLabel = (k: string) => categories.find(([c]) => c === k)?.[1] ?? k;

const available: { name: string; category: string; blurb: string; baseUrl: string }[] = [
  { name: "Razorpay", category: "PAYMENT", blurb: "Collect fees online via UPI, cards and net banking.", baseUrl: "https://api.razorpay.com" },
  { name: "Stripe", category: "PAYMENT", blurb: "Card payments for international institutions.", baseUrl: "https://api.stripe.com" },
  { name: "PayU", category: "PAYMENT", blurb: "Online payment gateway.", baseUrl: "https://secure.payu.in" },
  { name: "Twilio", category: "SMS", blurb: "SMS and voice messaging.", baseUrl: "https://api.twilio.com" },
  { name: "MSG91", category: "SMS", blurb: "Transactional and OTP SMS.", baseUrl: "https://control.msg91.com" },
  { name: "SendGrid", category: "EMAIL", blurb: "Transactional email delivery.", baseUrl: "https://api.sendgrid.com" },
  { name: "Amazon SES", category: "EMAIL", blurb: "Bulk and transactional email.", baseUrl: "https://email.us-east-1.amazonaws.com" },
  { name: "Zoom", category: "VIDEO", blurb: "Online classes and meetings.", baseUrl: "https://api.zoom.us" },
  { name: "Google Meet", category: "VIDEO", blurb: "Video classes through Google Workspace.", baseUrl: "https://meet.googleapis.com" },
  { name: "Google Drive", category: "STORAGE", blurb: "Store and share documents.", baseUrl: "https://www.googleapis.com" },
  { name: "Microsoft 365", category: "IDENTITY", blurb: "Single sign-on and Office tools.", baseUrl: "https://graph.microsoft.com" },
  { name: "Google Analytics", category: "ANALYTICS", blurb: "Portal usage analytics.", baseUrl: "https://www.googleapis.com" },
];

const statusTone = (s: string | undefined) => (s === "REACHABLE" ? "green" : s === "UNREACHABLE" ? "red" : "gray");
const statusText = (s: string | undefined) => (s === "REACHABLE" ? "Reachable" : s === "UNREACHABLE" ? "Unreachable" : "Not tested");

export default function IntegrationsSettings() {
  const inst = useActiveInstitution();
  const id = inst.institutionId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "available") as TabKey;
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [prefill, setPrefill] = useState<{ key: number; name: string; attrs: Record<string, string> } | null>(null);
  const [testing, setTesting] = useState<number | null>(null);

  const loadCount = useCallback(async () => {
    if (id === null) { setItems([]); return; }
    try { setItems(await api.catalog.list("INTEGRATION")); } catch (e) { setError(errText(e)); }
  }, [id]);
  useEffect(() => { void loadCount(); }, [loadCount, tab]);

  function configure(a: (typeof available)[number]) {
    setPrefill({ key: Date.now(), name: a.name, attrs: { category: a.category, provider: a.name, baseUrl: a.baseUrl } });
    setParams({ tab: "configured" }); setError(""); setNotice("");
  }
  async function test(it: CatalogItem, reload: () => Promise<void>) {
    setTesting(it.id);
    try { const r = await api.catalog.testIntegration(it.id); await reload(); setError(""); setNotice(`${it.name}: ${r.attrs._message ?? statusText(r.attrs._status)}`); } catch (e) { setError(errText(e)); } finally { setTesting(null); }
  }

  const reachable = items.filter((i) => i.attrs._status === "REACHABLE").length;
  const unreachable = items.filter((i) => i.attrs._status === "UNREACHABLE").length;

  return (
    <SettingsFrame step={10} title="Integrations" subtitle="Connect third-party services and keep their connection details." group="Integrations" inst={inst}
      tabs={tabs} tab={tab} onTab={(k) => { setParams({ tab: k }); setError(""); setNotice(""); }} error={error} notice={notice}
      banner="Connection details are saved and the address can be checked for reachability. Data exchange with these providers is not active yet, and API access, webhooks, data sync and error logs are not part of this release.">

      <Panel>
        <PanelTitle title="Overview" />
        <div className="grid grid-cols-2 gap-2 px-4 pb-4 sm:grid-cols-4">
          <StatCard label="Available" value={available.length} /><StatCard label="Configured" value={items.length} />
          <StatCard label="Reachable" value={reachable} tone="green" /><StatCard label="Unreachable" value={unreachable} tone="red" />
        </div>
      </Panel>

      {tab === "available" && (
        <Panel>
          <PanelTitle icon={<Plug size={20} strokeWidth={2.4} />} title="Available Integrations" />
          <div className="grid grid-cols-1 gap-3 px-4 pb-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((a) => {
              const done = items.some((i) => i.attrs.provider === a.name || i.name === a.name);
              return (
                <div key={a.name} className="flex flex-col gap-2 rounded-lg border border-[#e1ecfa] bg-white p-3">
                  <div className="flex items-center justify-between gap-2"><span className="text-[12px] font-extrabold text-[#101b69]">{a.name}</span><Pill tone="blue">{catLabel(a.category)}</Pill></div>
                  <p className="flex-1 text-[10px] leading-4 text-slate-600">{a.blurb}</p>
                  {done ? <Pill tone="green">Configured</Pill> : <PrimaryButton type="button" className="self-start" onClick={() => configure(a)}>Configure</PrimaryButton>}
                </div>
              );
            })}
          </div>
        </Panel>
      )}

      {tab === "configured" && (
        <CatalogPanel kind="INTEGRATION" institutionId={id} title="Configured Integrations" singular="Integration" addLabel="Add Integration" onError={setError} onNotice={(m) => { setNotice(m); void loadCount(); }}
          prefill={prefill} minWidth={900}
          fields={[
            { key: "category", label: "Category", type: "select", required: true, def: "OTHER", options: categories },
            { key: "provider", label: "Provider", type: "text", optional: true, max: 60 },
            { key: "baseUrl", label: "Base URL", type: "url", optional: true, placeholder: "https://", max: 200 },
            { key: "accountId", label: "Account / Key ID", type: "text", optional: true, max: 120 },
            { key: "secret", label: "Secret / API Key", type: "secret", optional: true, placeholder: "Leave as is to keep the saved secret" },
            { key: "notes", label: "Notes", type: "area", optional: true, max: 300, wide: true },
          ]}
          columns={[
            { head: "Category", render: (it) => catLabel(it.attrs.category ?? "OTHER") },
            { head: "Base URL", render: (it) => it.attrs.baseUrl || "—" },
            { head: "Connection", render: (it) => (
              <span title={it.attrs._message ?? ""}><Pill tone={statusTone(it.attrs._status)}>{statusText(it.attrs._status)}</Pill>
                {it.attrs._checked && <span className="ml-1 text-[9px] text-slate-400">{fmtDate(it.attrs._checked.slice(0, 10))}</span>}</span>) },
          ]}
          extraHead="Test"
          rowExtra={(it, reload) => <OutlineButton type="button" className="!px-2 !py-1 !text-[10px]" disabled={testing === it.id || !it.attrs.baseUrl} onClick={() => void test(it, reload)}>{testing === it.id ? "Testing..." : "Test"}</OutlineButton>} />
      )}
    </SettingsFrame>
  );
}
