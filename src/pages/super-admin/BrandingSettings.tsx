import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Palette } from "lucide-react";
import { Panel, PanelTitle } from "./AcademicShared";
import { useActiveInstitution } from "./SettingsShared";
import { SaveRow, SelF, Sw, TextF, useCommSection } from "./CommunicationShared";
import type { Section } from "./CommunicationShared";
import { CatalogPanel } from "./CatalogPanel";
import { ColorF, SUB, SettingsFrame } from "./SettingsFrame";
import { Pill } from "./TransportShared";

const tabs = [{ key: "appearance", label: "Appearance" }, { key: "login", label: "Login & Portal" }, { key: "fields", label: "Custom Fields" }] as const;
type TabKey = (typeof tabs)[number]["key"];

const fontStacks: Record<string, string> = {
  INTER: "Inter, system-ui, sans-serif", POPPINS: "Poppins, system-ui, sans-serif", ROBOTO: "Roboto, system-ui, sans-serif", OPEN_SANS: "'Open Sans', system-ui, sans-serif", LATO: "Lato, system-ui, sans-serif",
};
const fontSizes: Record<string, string> = { SMALL: "11px", MEDIUM: "13px", LARGE: "15px" };

function AppearancePreview({ s }: { s: Section }) {
  const radius = s.bool("rounded") ? "10px" : "2px";
  const dark = s.bool("darkMode");
  return (
    <div className="overflow-hidden border border-[#d8e9fb]" style={{ borderRadius: radius, fontFamily: fontStacks[s.str("font")], fontSize: fontSizes[s.str("fontSize")], background: dark ? "#0F172A" : "#FFFFFF", color: dark ? "#F1F5F9" : s.str("text") }}>
      <div className="flex items-center justify-between px-4 text-white" style={{ background: s.str("primary"), height: s.bool("compactHeader") ? 36 : 52 }}><b>Centram Classzy</b><span style={{ opacity: 0.85 }}>Dashboard</span></div>
      <div className="space-y-3 p-4">
        <div>Welcome back! Here is how your portal will look.</div>
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 font-semibold text-white" style={{ background: s.str("primary"), borderRadius: radius }}>Primary</span>
          <span className="px-3 py-1.5 font-semibold text-white" style={{ background: s.str("secondary"), borderRadius: radius }}>Secondary</span>
          <span className="px-3 py-1.5 font-semibold text-white" style={{ background: s.str("accent"), borderRadius: radius }}>Accent</span>
        </div>
      </div>
    </div>
  );
}

function LoginPreview({ s, name }: { s: Section; name: string }) {
  const brand = "#0066FF";
  return (
    <div className="grid place-items-center rounded-lg border border-[#d8e9fb] p-6" style={{ background: s.bool("showBackground") ? "linear-gradient(135deg,#EAF3FF,#F7FBFF)" : "#FFFFFF" }}>
      <div className="w-full max-w-[260px] space-y-2.5 rounded-xl border border-[#d8e9fb] bg-white p-4 shadow-sm">
        {s.bool("showLogo") && <div className="mx-auto grid h-10 w-10 place-items-center rounded-lg text-[14px] font-extrabold text-white" style={{ background: brand }}>C</div>}
        {s.bool("showName") && <div className="text-center text-[12px] font-extrabold text-[#101b69]">{name}</div>}
        <div className="text-center text-[11px] font-bold text-[#17245e]">{s.str("title") || "Sign in"}</div>
        <div className="text-center text-[9px] text-slate-500">{s.str("subtitle")}</div>
        <div className="h-7 rounded border border-[#cfe0f5] bg-[#f8fbff]" /><div className="h-7 rounded border border-[#cfe0f5] bg-[#f8fbff]" />
        <div className="flex justify-between text-[9px] text-slate-500">{s.bool("showRemember") ? <span>☐ Remember me</span> : <span />}{s.bool("showForgot") && <span style={{ color: brand }}>Forgot password?</span>}</div>
        <div className="rounded py-1.5 text-center text-[10px] font-semibold text-white" style={{ background: brand }}>Sign in</div>
        {s.bool("showLanguage") && <div className="text-center text-[9px] text-slate-400">English ▾</div>}
      </div>
    </div>
  );
}

export default function BrandingSettings() {
  const inst = useActiveInstitution();
  const id = inst.institutionId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "appearance") as TabKey;
  const look = useCommSection("BRAND_APPEARANCE", id);
  const login = useCommSection("BRAND_LOGIN", id);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const cur = tab === "login" ? login : look;

  async function save() {
    const e = await cur.save();
    if (e) { setError(e); setNotice(""); } else { setError(""); setNotice("Branding settings saved."); }
  }
  const name = inst.institutionId !== null ? (inst.institutions.find((i) => i.id === inst.institutionId)?.name ?? "Your Institution") : "Your Institution";

  return (
    <SettingsFrame step={11} title="Branding & Customization" subtitle="Control how your portal looks and which extra fields you collect." group="Branding & Customization" inst={inst}
      tabs={tabs} tab={tab} onTab={(k) => { setParams({ tab: k }); setError(""); setNotice(""); }} error={error} notice={notice} loadError={tab === "fields" ? "" : cur.loadError}
      banner={tab === "fields" ? "Custom field definitions are saved here. They do not yet appear on student, staff or parent forms." : "Your choices are saved and previewed here, but are not yet applied to the live portal. Logo, favicon and background uploads, email templates and report branding are not part of this release."}>

      {tab === "appearance" && look.loaded && (
        <Panel>
          <PanelTitle icon={<Palette size={20} strokeWidth={2.4} />} title="Appearance" />
          <div className="grid grid-cols-1 gap-5 px-4 pb-2 lg:grid-cols-2">
            <div className="space-y-4">
              <div>
                <div className={SUB}>Brand Colours</div>
                <div className="grid grid-cols-2 gap-3"><ColorF s={look} k="primary" label="Primary" /><ColorF s={look} k="secondary" label="Secondary" /><ColorF s={look} k="accent" label="Accent" /><ColorF s={look} k="text" label="Text" /></div>
              </div>
              <div>
                <div className={SUB}>Typography</div>
                <div className="grid grid-cols-2 gap-3">
                  <SelF s={look} k="font" label="Font Family" options={[["INTER", "Inter"], ["POPPINS", "Poppins"], ["ROBOTO", "Roboto"], ["OPEN_SANS", "Open Sans"], ["LATO", "Lato"]]} />
                  <SelF s={look} k="fontSize" label="Base Font Size" options={[["SMALL", "Small"], ["MEDIUM", "Medium"], ["LARGE", "Large"]]} />
                </div>
              </div>
              <div>
                <div className={SUB}>Layout</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><Sw s={look} k="rounded" label="Rounded corners" /><Sw s={look} k="compactHeader" label="Compact header" /><Sw s={look} k="darkMode" label="Dark mode" /></div>
              </div>
            </div>
            <div><div className={SUB}>Live Preview</div><AppearancePreview s={look} /></div>
          </div>
          <SaveRow saving={look.saving} onSave={() => void save()} onCancel={look.reset} disabled={!look.dirty} />
        </Panel>
      )}

      {tab === "login" && login.loaded && (
        <Panel>
          <PanelTitle icon={<Palette size={20} strokeWidth={2.4} />} title="Login & Portal" />
          <div className="grid grid-cols-1 gap-5 px-4 pb-2 lg:grid-cols-2">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3"><TextF s={login} k="title" label="Login Title" optional max={100} placeholder="Sign in" /><TextF s={login} k="subtitle" label="Login Subtitle" optional max={150} /></div>
              <div>
                <div className={SUB}>Show on login page</div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <Sw s={login} k="showLogo" label="Institution logo" /><Sw s={login} k="showName" label="Institution name" /><Sw s={login} k="showBackground" label="Background" />
                  <Sw s={login} k="showRemember" label="Remember me" /><Sw s={login} k="showForgot" label="Forgot password link" /><Sw s={login} k="showLanguage" label="Language selector" />
                </div>
              </div>
            </div>
            <div><div className={SUB}>Live Preview</div><LoginPreview s={login} name={name} /></div>
          </div>
          <SaveRow saving={login.saving} onSave={() => void save()} onCancel={login.reset} disabled={!login.dirty} />
        </Panel>
      )}

      {tab === "fields" && (
        <CatalogPanel kind="CUSTOM_FIELD" institutionId={id} title="Custom Fields" singular="Field" addLabel="Add Field" nameLabel="Field Label" onError={setError} onNotice={setNotice}
          code={{ label: "Field Key", required: true, placeholder: "blood_group", hint: "Lowercase letters, numbers and underscores." }}
          fields={[
            { key: "dataType", label: "Data Type", type: "select", required: true, def: "TEXT", options: [["TEXT", "Text"], ["NUMBER", "Number"], ["DATE", "Date"], ["DROPDOWN", "Dropdown"], ["YES_NO", "Yes / No"]] },
            { key: "appliesTo", label: "Applies To", type: "select", required: true, def: "STUDENT", options: [["STUDENT", "Student"], ["STAFF", "Staff"], ["PARENT", "Parent"], ["GENERAL", "General"]] },
            { key: "mandatory", label: "Mandatory", type: "bool", def: "false" }, { key: "showInPortal", label: "Show in Portal", type: "bool", def: "false" },
            { key: "options", label: "Dropdown Options (comma separated)", type: "area", optional: true, max: 500, wide: true },
          ]}
          columns={[
            { head: "Data Type", render: (it) => (it.attrs.dataType ?? "TEXT").replace("_", " ").toLowerCase() }, { head: "Applies To", render: (it) => (it.attrs.appliesTo ?? "").toLowerCase() },
            { head: "Mandatory", render: (it) => <Pill tone={it.attrs.mandatory === "true" ? "amber" : "gray"}>{it.attrs.mandatory === "true" ? "Yes" : "No"}</Pill> },
          ]} />
      )}
    </SettingsFrame>
  );
}
