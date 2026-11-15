import { Hammer } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { AcademicHeader, Breadcrumb, Panel } from "./AcademicShared";

/** Placeholder for Institution Settings pages that are not built yet, so every sidebar link opens something. */
export default function ComingSoon({ title, subtitle = "This settings page is being built." }: { title: string; subtitle?: string }) {
  return (
    <AdminLayout activeItem="Institutions">
      <div className="space-y-3">
        <AcademicHeader step={1} title={title} subtitle={subtitle} />
        <Breadcrumb trail={["Institutions", "Institution Settings", title]} />
        <Panel>
          <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600"><Hammer size={22} /></span>
            <h2 className="text-[15px] font-extrabold text-[#101b69]">{title}</h2>
            <p className="max-w-md text-[12px] text-slate-500">{subtitle} It will appear here once it is ready.</p>
          </div>
        </Panel>
      </div>
    </AdminLayout>
  );
}
