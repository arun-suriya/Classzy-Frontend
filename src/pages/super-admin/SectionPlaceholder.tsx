import { Hammer } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { Panel } from "./AcademicShared";
import { UsersHeader } from "./UserShared";

/** Shown for sidebar sub-items whose page isn't built yet, so every link opens something. */
export default function SectionPlaceholder({ section, title }: { section: string; title: string }) {
  return (
    <AdminLayout activeItem={section}>
      <div className="space-y-4">
        <UsersHeader title={title} subtitle={`${section} › ${title}`} />
        <Panel>
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-blue-600"><Hammer size={22} /></span>
            <h2 className="text-[15px] font-extrabold text-[#101b69]">{title}</h2>
            <p className="max-w-md text-[12px] text-slate-500">This page is being built. It will appear here once it is ready.</p>
          </div>
        </Panel>
      </div>
    </AdminLayout>
  );
}
