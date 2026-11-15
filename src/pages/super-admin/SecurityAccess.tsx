import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { Panel, PanelTitle } from "./AcademicShared";
import { useActiveInstitution } from "./SettingsShared";
import { ChkList, NumF, SaveRow, SecretF, SelF, Sw, TextF, TimeF, useCommSection } from "./CommunicationShared";
import { SUB, SettingsFrame } from "./SettingsFrame";

const tabs = [{ key: "auth", label: "Authentication" }, { key: "password", label: "Password Policy" }, { key: "session", label: "Session & Access Control" }] as const;
type TabKey = (typeof tabs)[number]["key"];

const methodOpts = [["PASSWORD", "Email / password"], ["GOOGLE", "Google"], ["MICROSOFT", "Microsoft"], ["MOBILE_OTP", "Mobile OTP"], ["BIOMETRIC", "Biometric (mobile app)"]] as const;

export default function SecurityAccess() {
  const inst = useActiveInstitution();
  const id = inst.institutionId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "auth") as TabKey;
  const auth = useCommSection("SEC_AUTH", id);
  const pwd = useCommSection("SEC_PASSWORD", id);
  const sess = useCommSection("SEC_SESSION", id);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const cur = tab === "auth" ? auth : tab === "password" ? pwd : sess;

  async function save() {
    const e = await cur.save();
    if (e) { setError(e); setNotice(""); } else { setError(""); setNotice("Security settings saved."); }
  }
  const sso = auth.str("ssoProvider");

  return (
    <SettingsFrame step={9} title="Security & Access" subtitle="Manage authentication, password rules and session controls." group="Security & Access" inst={inst}
      tabs={tabs} tab={tab} onTab={(k) => { setParams({ tab: k }); setError(""); setNotice(""); }} error={error} notice={notice} loadError={cur.loadError}
      banner="These policies are saved for your institution but are not enforced at sign-in yet. User Roles, Permissions, active sessions and access logs are not part of this release.">

      {tab === "auth" && auth.loaded && (
        <Panel>
          <PanelTitle icon={<ShieldCheck size={20} strokeWidth={2.4} />} title="Authentication" />
          <div className="space-y-4 px-4 pb-2">
            <Sw s={auth} k="mfa" label="Require multi-factor authentication" />
            <div><div className={SUB}>Allowed Sign-in Methods</div><ChkList s={auth} k="methods" options={methodOpts} cols={3} /></div>
            <div>
              <div className={SUB}>Single Sign-On</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <SelF s={auth} k="ssoProvider" label="SSO Provider" options={[["NONE", "None"], ["GOOGLE", "Google Workspace"], ["MICROSOFT", "Microsoft 365"], ["CUSTOM", "Custom (OIDC)"]]} />
                {sso !== "NONE" && (
                  <>
                    <TextF s={auth} k="ssoClientId" label="Client ID" optional max={200} />
                    <SecretF s={auth} k="ssoClientSecret" label="Client Secret" />
                    <TextF s={auth} k="ssoRedirectUrl" label="Redirect URL" optional placeholder="https://" max={200} />
                  </>
                )}
              </div>
            </div>
          </div>
          <SaveRow saving={auth.saving} onSave={() => void save()} onCancel={auth.reset} disabled={!auth.dirty} />
        </Panel>
      )}

      {tab === "password" && pwd.loaded && (
        <Panel>
          <PanelTitle icon={<ShieldCheck size={20} strokeWidth={2.4} />} title="Password Policy" />
          <div className="space-y-4 px-4 pb-2">
            <div>
              <div className={SUB}>Complexity</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <NumF s={pwd} k="minLength" label="Minimum Length" min={6} max={64} />
                <Sw s={pwd} k="requireUpper" label="Require uppercase letter" /><Sw s={pwd} k="requireLower" label="Require lowercase letter" />
                <Sw s={pwd} k="requireNumber" label="Require a number" /><Sw s={pwd} k="requireSpecial" label="Require a special character" />
                <Sw s={pwd} k="blockCommon" label="Block common passwords" />
              </div>
            </div>
            <div>
              <div className={SUB}>Expiry & History</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Sw s={pwd} k="expiryEnabled" label="Passwords expire" />
                <NumF s={pwd} k="expiryDays" label="Expire After (days)" min={7} max={730} />
                <Sw s={pwd} k="reuseEnabled" label="Prevent password reuse" />
                <NumF s={pwd} k="reuseCount" label="Remember Last Passwords" min={1} max={24} />
              </div>
            </div>
            <div>
              <div className={SUB}>Lockout</div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <NumF s={pwd} k="maxFailed" label="Failed Attempts Before Lock" min={3} max={20} />
                <NumF s={pwd} k="lockoutMinutes" label="Lock Duration (minutes)" min={1} max={1440} />
              </div>
            </div>
            <div>
              <div className={SUB}>Password Reset</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <Sw s={pwd} k="selfReset" label="Allow self-service reset" /><Sw s={pwd} k="resetEmail" label="Reset by email" />
                <Sw s={pwd} k="resetSms" label="Reset by SMS" /><Sw s={pwd} k="resetApproval" label="Admin approval for reset" />
              </div>
            </div>
          </div>
          <SaveRow saving={pwd.saving} onSave={() => void save()} onCancel={pwd.reset} disabled={!pwd.dirty} />
        </Panel>
      )}

      {tab === "session" && sess.loaded && (
        <Panel>
          <PanelTitle icon={<ShieldCheck size={20} strokeWidth={2.4} />} title="Session & Access Control" />
          <div className="space-y-4 px-4 pb-2">
            <div>
              <div className={SUB}>Session</div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <NumF s={sess} k="timeoutMinutes" label="Inactivity Timeout (minutes)" min={5} max={1440} />
                <NumF s={sess} k="rememberDays" label="Remember Device (days)" min={1} max={90} />
              </div>
            </div>
            <div>
              <div className={SUB}>Access Restrictions</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Sw s={sess} k="restrictIp" label="Restrict by IP address" /><Sw s={sess} k="restrictCountry" label="Restrict by country" />
                <Sw s={sess} k="trustedOnly" label="Trusted devices only" /><Sw s={sess} k="restrictTime" label="Restrict sign-in hours" />
              </div>
              {sess.bool("restrictTime") && <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4"><TimeF s={sess} k="timeFrom" label="Allowed From" /><TimeF s={sess} k="timeTo" label="Allowed Until" /></div>}
              <p className="mt-2 text-[10px] text-slate-500">IP and country lists, and trusted devices, are not configurable yet.</p>
            </div>
            <div>
              <div className={SUB}>Protection</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Sw s={sess} k="captcha" label="CAPTCHA after failed attempts" /><Sw s={sess} k="notifyAdmin" label="Notify admin of suspicious sign-ins" />
              </div>
            </div>
          </div>
          <SaveRow saving={sess.saving} onSave={() => void save()} onCancel={sess.reset} disabled={!sess.dirty} />
        </Panel>
      )}
    </SettingsFrame>
  );
}
