import type { ReactNode } from "react";
import AdminLayout from "../../components/AdminLayout";
import { AcademicHeader, Breadcrumb, Notice } from "./AcademicShared";
import { ContextBar } from "./SettingsShared";
import type { useActiveInstitution } from "./SettingsShared";
import type { Section } from "./CommunicationShared";

type ActiveInstitution = ReturnType<typeof useActiveInstitution>;

/** Page chrome shared by the Library, Security, Integrations and Branding pages. */
export function SettingsFrame<T extends string>({ step, title, subtitle, group, inst, tabs, tab, onTab, error, notice, loadError, banner, children }: {
  step: number; title: string; subtitle: string; group: string; inst: ActiveInstitution;
  tabs: readonly { key: T; label: string }[]; tab: T; onTab: (k: T) => void;
  error: string; notice: string; loadError?: string; banner?: string; children: ReactNode;
}) {
  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={step} title={title} subtitle={subtitle} right={<ContextBar inst={inst} />} />
        <Breadcrumb trail={["Institutions", "Institution Settings", group, tabs.find((t) => t.key === tab)!.label]} />
        <div className="overflow-x-auto">
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${tabs.length}, minmax(120px, 1fr))` }}>
            {tabs.map(({ key, label }) => (
              <button key={key} type="button" onClick={() => onTab(key)} aria-current={tab === key ? "page" : undefined}
                className={`rounded-md border px-3 py-2 text-center text-[10px] font-semibold transition ${tab === key ? "border-blue-500 bg-[#dcecff] text-blue-800 shadow-[inset_0_-2px_0_#1478f8]" : "border-[#cfe0f5] bg-white text-[#34467a] hover:border-blue-300 hover:bg-blue-50"}`}>{label}</button>
            ))}
          </div>
        </div>
        {banner && <Notice tone="info">{banner}</Notice>}
        {error && <Notice tone="error"><span className="font-bold">Please review:</span> {error}</Notice>}
        {loadError && <Notice tone="error">{loadError}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {inst.institutionId === null && <Notice tone="info">{inst.isSuper ? "Create an institution first, then choose it above." : "Your account isn't linked to an institution."}</Notice>}
        {children}
        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}

/** Colour picker bound to a settings Section. */
export function ColorF({ s, k, label }: { s: Section; k: string; label: string }) {
  const v = s.str(k);
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[10px] font-bold leading-[12px] text-[#17245e]">{label}</label>
      <div className="flex items-center gap-2">
        <input type="color" aria-label={label} className="h-8 w-10 shrink-0 cursor-pointer rounded border border-[#cfe0f5] bg-white p-0.5" value={/^#[0-9a-fA-F]{6}$/.test(v) ? v : "#000000"} onChange={(e) => s.set(k, e.target.value.toUpperCase())} />
        <input className="h-8 w-full rounded-md border border-[#cfe0f5] bg-white px-2.5 text-[11px] text-[#17245e] outline-none focus:border-blue-400" value={v} maxLength={7} onChange={(e) => s.set(k, e.target.value)} />
      </div>
      {s.errors[k] && <div className="mt-0.5 text-[9px] font-semibold text-rose-600">{s.errors[k]}</div>}
    </div>
  );
}

export const SUB = "mb-2 text-[12px] font-extrabold text-[#101b69]";
