import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { BookOpen } from "lucide-react";
import { Panel, PanelTitle } from "./AcademicShared";
import { useActiveInstitution } from "./SettingsShared";
import { NumF, SaveRow, SelF, Sw, TextF, TimeF, useCommSection } from "./CommunicationShared";
import { CatalogPanel } from "./CatalogPanel";
import { SUB, SettingsFrame } from "./SettingsFrame";
import { Pill } from "./TransportShared";

const tabs = [
  { key: "general", label: "General Settings" }, { key: "categories", label: "Book Categories" }, { key: "status", label: "Book Status" },
  { key: "issue", label: "Issue & Return Rules" }, { key: "fines", label: "Fines & Penalties" },
] as const;
type TabKey = (typeof tabs)[number]["key"];

const memberTypes = [["Student", "Student"], ["Teacher", "Teacher"], ["Staff", "Staff"], ["External Member", "External Member"]] as const;
const yesNo = (v: string | undefined) => <Pill tone={v === "true" ? "green" : "gray"}>{v === "true" ? "Yes" : "No"}</Pill>;

export default function LibrarySettings() {
  const inst = useActiveInstitution();
  const id = inst.institutionId;
  const [params, setParams] = useSearchParams();
  const tab = (tabs.find((t) => t.key === params.get("tab"))?.key ?? "general") as TabKey;
  const lib = useCommSection("LIBRARY", id);
  const fine = useCommSection("LIB_FINE", id);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function saveSection(s: typeof lib, label: string) {
    const e = await s.save();
    if (e) { setError(e); setNotice(""); } else { setError(""); setNotice(`${label} saved.`); }
  }
  const sunday = lib.str("sunday") === "OPEN";

  return (
    <SettingsFrame step={8} title="Library Settings" subtitle="Configure library management, book categories, issue rules and fines." group="Library Settings" inst={inst}
      tabs={tabs} tab={tab} onTab={(k) => { setParams({ tab: k }); setError(""); setNotice(""); }} error={error} notice={notice}
      loadError={tab === "general" ? lib.loadError : tab === "fines" ? fine.loadError : ""}
      banner={tab === "general" ? "These settings are saved for your institution. Book issuing and fine calculation will use them once the Library module is released." : undefined}>

      {tab === "general" && lib.loaded && (
        <Panel>
          <PanelTitle icon={<BookOpen size={20} strokeWidth={2.4} />} title="Library Information" />
          <div className="space-y-4 px-4 pb-2">
            <Sw s={lib} k="enabled" label="Enable library module" />
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <TextF s={lib} k="libraryName" label="Library Name" required max={100} />
              <TextF s={lib} k="libraryCode" label="Library Code" required max={30} />
              <SelF s={lib} k="libraryType" label="Library Type" options={[["PHYSICAL", "Physical"], ["DIGITAL", "Digital"], ["PHYSICAL_DIGITAL", "Physical + Digital"]]} />
            </div>
            <div>
              <div className={SUB}>Library Working Hours</div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
                <TimeF s={lib} k="weekFrom" label="Mon–Fri From" /><TimeF s={lib} k="weekTo" label="Mon–Fri To" />
                <TimeF s={lib} k="satFrom" label="Saturday From" /><TimeF s={lib} k="satTo" label="Saturday To" />
                <SelF s={lib} k="sunday" label="Sunday" options={[["CLOSED", "Closed"], ["OPEN", "Open"]]} />
                {sunday && <><TimeF s={lib} k="sunFrom" label="Sunday From" /><TimeF s={lib} k="sunTo" label="Sunday To" /></>}
              </div>
            </div>
            <div>
              <div className={SUB}>Borrowing Defaults</div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <NumF s={lib} k="loanDays" label="Default Loan Period (days)" min={1} max={365} />
                <NumF s={lib} k="maxBooksStudent" label="Max Books per Student" min={1} max={50} />
                <NumF s={lib} k="maxBooksTeacher" label="Max Books per Teacher" min={1} max={50} />
                <NumF s={lib} k="inactivityDays" label="Mark Member Inactive After (days)" min={1} max={365} />
              </div>
            </div>
            <div>
              <div className={SUB}>Features</div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Sw s={lib} k="reservation" label="Allow book reservations" /><Sw s={lib} k="ebooks" label="Enable e-books" />
                <Sw s={lib} k="barcode" label="Barcode scanning for issue/return" /><Sw s={lib} k="interBranch" label="Inter-branch book sharing" />
                <Sw s={lib} k="digitalApproval" label="Approval for digital downloads" /><Sw s={lib} k="showInPortal" label="Show library in student/parent portal" />
              </div>
            </div>
          </div>
          <SaveRow saving={lib.saving} onSave={() => void saveSection(lib, "Library settings")} onCancel={lib.reset} disabled={!lib.dirty} />
        </Panel>
      )}

      {tab === "categories" && (
        <CatalogPanel kind="LIB_CATEGORY" institutionId={id} title="Book Categories" singular="Category" addLabel="Add Category" onError={setError} onNotice={setNotice}
          code={{ label: "Category Code", hint: "Leave blank to generate one (CAT-001...)." }}
          fields={[
            { key: "parent", label: "Parent Category", type: "select", optional: true, options: (items, editId) => items.filter((i) => i.id !== editId && !i.attrs.parent).map((i) => [String(i.id), i.name] as const) },
            { key: "description", label: "Description", type: "area", optional: true, max: 300, wide: true },
          ]}
          columns={[
            { head: "Parent", render: (it, all) => all.find((x) => String(x.id) === it.attrs.parent)?.name ?? "—" },
            { head: "Description", render: (it) => it.attrs.description || "—" },
          ]} />
      )}

      {tab === "status" && (
        <CatalogPanel kind="LIB_STATUS" institutionId={id} title="Book Status" singular="Status" addLabel="Add Status" onError={setError} onNotice={setNotice}
          code={{ label: "Status Code", required: true, placeholder: "AVL" }}
          fields={[
            { key: "color", label: "Colour", type: "color", def: "#16A34A" },
            { key: "description", label: "Description", type: "area", optional: true, max: 300, wide: true },
          ]}
          columns={[
            { head: "Colour", render: (it) => <span className="inline-flex items-center gap-1.5"><span className="h-3 w-3 rounded-full border border-black/10" style={{ background: it.attrs.color }} />{it.attrs.color}</span> },
            { head: "Description", render: (it) => it.attrs.description || "—" },
          ]} />
      )}

      {tab === "issue" && (
        <CatalogPanel kind="LIB_ISSUE_RULE" institutionId={id} title="Issue & Return Rules" singular="Rule" addLabel="Add Rule" nameLabel="Member Type" nameOptions={memberTypes}
          showStatus={false} onError={setError} onNotice={setNotice} searchPlaceholder="Search member types..."
          fields={[
            { key: "maxBooks", label: "Max Books", type: "number", def: "5", min: 1, max: 50, required: true },
            { key: "loanDays", label: "Loan Period (days)", type: "number", def: "14", min: 1, max: 365, required: true },
            { key: "maxRenewals", label: "Max Renewals", type: "number", def: "2", min: 0, max: 10 },
            { key: "canRenew", label: "Renewal Allowed", type: "bool", def: "true" },
            { key: "approvalRequired", label: "Librarian Approval Required", type: "bool", def: "false" },
          ]}
          columns={[
            { head: "Max Books", render: (it) => it.attrs.maxBooks }, { head: "Loan Period", render: (it) => `${it.attrs.loanDays} days` },
            { head: "Renewal", render: (it) => it.attrs.canRenew === "true" ? `Up to ${it.attrs.maxRenewals ?? 0}` : "Not allowed" },
            { head: "Approval", render: (it) => yesNo(it.attrs.approvalRequired) },
          ]} />
      )}

      {tab === "fines" && (
        <>
          <CatalogPanel kind="LIB_FINE_RULE" institutionId={id} title="Overdue Fine Rules" singular="Fine Rule" addLabel="Add Fine Rule" nameLabel="Member Type" nameOptions={memberTypes}
            showStatus={false} onError={setError} onNotice={setNotice} searchPlaceholder="Search member types..."
            fields={[
              { key: "fineType", label: "Fine Type", type: "select", required: true, def: "PER_DAY", options: [["PER_DAY", "Per day overdue"], ["FLAT", "Flat amount"]] },
              { key: "amount", label: "Amount", type: "money", def: "5", min: 0, required: true },
              { key: "graceDays", label: "Grace Period (days)", type: "number", def: "2", min: 0, max: 90 },
              { key: "maxFine", label: "Maximum Fine", type: "money", def: "200", min: 0 },
            ]}
            columns={[
              { head: "Fine Type", render: (it) => (it.attrs.fineType === "FLAT" ? "Flat" : "Per day") }, { head: "Amount", render: (it) => it.attrs.amount },
              { head: "Grace Days", render: (it) => it.attrs.graceDays ?? "0" }, { head: "Max Fine", render: (it) => it.attrs.maxFine ?? "—" },
            ]} />
          {fine.loaded && (
            <Panel>
              <PanelTitle title="Fine Settings" />
              <div className="space-y-3 px-4 pb-2">
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  <Sw s={fine} k="enabled" label="Charge overdue fines" /><Sw s={fine} k="graceEnabled" label="Apply grace period" />
                  <Sw s={fine} k="onlinePayment" label="Allow online fine payment" /><Sw s={fine} k="overdueNotify" label="Send overdue notifications" />
                </div>
                <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                  <NumF s={fine} k="reminder1" label="First Reminder (days overdue)" min={0} max={365} />
                  <NumF s={fine} k="reminder2" label="Second Reminder (days overdue)" min={0} max={365} />
                  <NumF s={fine} k="finalReminder" label="Final Reminder (days overdue)" min={0} max={365} />
                  <NumF s={fine} k="blockAfter" label="Block Issuing After (days overdue)" min={1} max={365} />
                </div>
              </div>
              <SaveRow saving={fine.saving} onSave={() => void saveSection(fine, "Fine settings")} onCancel={fine.reset} disabled={!fine.dirty} />
            </Panel>
          )}
        </>
      )}
    </SettingsFrame>
  );
}
