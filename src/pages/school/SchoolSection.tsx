import { useLocation, useNavigate } from "react-router-dom";
import SchoolLayout from "./SchoolLayout";

/** Stand-in for school modules that aren't built yet. */
export default function SchoolSection() {
  const { pathname } = useLocation();
  const nav = useNavigate();
  const slug = pathname.replace(/^\/school\/?/, "").split("/")[0] || "this section";
  const title = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return (
    <SchoolLayout>
      <div className="mx-auto max-w-xl rounded-xl border border-[#d8e9fb] bg-white p-8 text-center">
        <h1 className="text-[22px] font-extrabold text-[#101b69]">{title}</h1>
        <p className="mt-2 text-[13px] text-[#46567f]">This module isn't built yet. It will open here once it's added.</p>
        <button type="button" onClick={() => nav("/school")} className="mt-5 rounded-lg bg-[#0875fb] px-5 py-2 text-[13px] font-semibold text-white hover:bg-blue-700">Back to Dashboard</button>
      </div>
    </SchoolLayout>
  );
}
