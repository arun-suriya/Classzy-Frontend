import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { Download, Pencil, Trash2, Upload } from "lucide-react";
import { api } from "../../services/api";
import type { StuDetail, StuOptions } from "../../services/api";
import { Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout from "./SchoolLayout";
import { StatusPill } from "./Students";

const dayFmt = (iso: string | null) => { if (!iso) return "—"; const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const ageOf = (iso: string | null) => { if (!iso) return null; const b = new Date(iso); const n = new Date(); let a = n.getFullYear() - b.getFullYear(); if (n < new Date(n.getFullYear(), b.getMonth(), b.getDate())) a -= 1; return a; };

export default function StudentView() {
  const nav = useNavigate();
  const { id } = useParams();
  const sid = Number(id);
  const loc = useLocation();
  const st = (loc.state ?? {}) as { ok?: string; warn?: string };
  const [d, setD] = useState<StuDetail | null>(null);
  const [sopts, setSopts] = useState<StuOptions | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(st.ok ?? "");
  const [warn] = useState(st.warn ?? "");
  const [docType, setDocType] = useState("OTHER");
  const [reason, setReason] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { try { setD(await api.schoolStudents.get(sid)); } catch (e) { setError(errText(e)); } }, [sid]);
  useEffect(() => { void load(); api.schoolStudents.options().then(setSopts).catch(() => { /* labels fall back to codes */ }); }, [load]);

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 4000); };
  const toggle = async (active: boolean, why?: string) => { setBusy(true); try { await api.schoolStudents.setStatus(sid, active, why); setReason(null); flash(active ? "Student set active." : "Student set inactive."); await load(); } catch (e) { setError(errText(e)); } finally { setBusy(false); } };
  const upload = async (f: File | undefined) => { if (!f) return; try { await api.schoolStudents.uploadDocument(sid, docType, f); flash("Document uploaded."); await load(); } catch (e) { setError(errText(e)); } };
  const download = async (docId: number, name: string) => { try { const b = await api.schoolStudents.documentBlob(docId); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000); } catch (e) { setError(errText(e)); } };
  const remove = async (docId: number, name: string) => { if (!window.confirm(`Delete ${name}?`)) return; try { await api.schoolStudents.removeDocument(docId); await load(); } catch (e) { setError(errText(e)); } };
  const rel = (c: string | null) => sopts?.relationships.find((r) => r.code === c)?.label ?? c ?? "—";

  const rows: [string, string][] = d ? [
    ["Student ID", d.row.admissionNo], ["Academic Year", d.yearName ?? "—"], ["Grade", d.row.grade ?? "—"], ["Section", d.row.section ?? "—"], ["Joining Date", dayFmt(d.joiningDate)],
    ["Date of Birth", d.dob ? `${dayFmt(d.dob)} (${ageOf(d.dob)} yrs)` : "—"],
  ] : [];
  const guardian: [string, string][] = d ? [["Name", d.guardianName ?? "—"], ["Relationship", rel(d.relationship)], ["Mobile", d.phone ?? "—"], ["Email", d.email ?? "—"], ["Address", d.address ?? "—"]] : [];
  const incomplete = d && (!d.relationship || !d.address || !d.email || !d.dob);

  return (
    <SchoolLayout>
      <div className="space-y-4">
        <p className="text-[13px]"><Link to="/school/students" className="font-semibold text-blue-600 underline">Students</Link> <span className="px-1.5 text-slate-500">/</span> <span className="font-semibold text-[#101b69]">{d?.row.name ?? "Student"}</span></p>
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {warn && <Notice tone="error">{warn}</Notice>}
        {!d && !error && <p className="text-[13px] text-slate-500">Loading…</p>}
        {d && (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3"><h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]">{d.row.name}</h1><StatusPill active={d.row.active} /></div>
              <div className="flex gap-2">
                <OutlineButton onClick={() => nav(`/school/students/${sid}/edit`)}><Pencil size={14} className="mr-1.5 inline" />Edit</OutlineButton>
                {d.row.active ? <OutlineButton onClick={() => setReason("")}>Set Inactive</OutlineButton> : <PrimaryButton onClick={() => void toggle(true)} disabled={busy}>Set Active</PrimaryButton>}
              </div>
            </div>
            {!d.row.active && d.inactiveReason && <p className="text-[12px] text-slate-500">Inactive: {d.inactiveReason}</p>}
            {incomplete && <Notice tone="info">Some details are missing (this student came from an application, which doesn't collect relationship or address). Use Edit to complete the record.</Notice>}

            <div className="grid gap-5 lg:grid-cols-2">
              {([["Student & Enrollment", rows], ["Parent / Guardian", guardian]] as [string, [string, string][]][]).map(([t, list]) => (
                <section key={t} className="rounded-xl border border-[#d8e9fb] bg-white"><h2 className="rounded-t-xl border-b border-[#d8e9fb] bg-[#eef5fe] px-5 py-3 text-[17px] font-extrabold text-[#101b69]">{t}</h2>
                  <dl className="space-y-2.5 p-5 text-[13px]">{list.map(([k, v]) => <div key={k} className="flex gap-3"><dt className="w-32 shrink-0 font-semibold text-[#17245e]">{k}</dt><dd className="min-w-0 break-words text-[#4a5a85]">{v}</dd></div>)}</dl></section>
              ))}
            </div>

            <section className="rounded-xl border border-[#d8e9fb] bg-white"><div className="flex flex-wrap items-center justify-between gap-2 rounded-t-xl border-b border-[#d8e9fb] bg-[#eef5fe] px-5 py-3"><h2 className="text-[17px] font-extrabold text-[#101b69]">Documents</h2>
              <span className="flex items-center gap-2"><select value={docType} onChange={(e) => setDocType(e.target.value)} className={`${controlClass} !h-9 !w-auto`}>{sopts?.docTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select>
                <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-md border border-blue-400 bg-white px-3 text-[12px] font-semibold text-blue-600 hover:bg-blue-50"><Upload size={14} />Upload<input type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => { void upload(e.target.files?.[0]); e.target.value = ""; }} /></label></span></div>
              {d.documents.length === 0 ? <p className="p-5 text-[13px] text-slate-500">No documents uploaded.</p> : (
                <ul className="divide-y divide-[#eef4fd] px-5 text-[13px]">{d.documents.map((x) => <li key={x.id} className="flex items-center gap-3 py-3"><span className="min-w-0 flex-1 truncate font-medium text-[#17245e]">{x.fileName}<span className="ml-2 font-normal text-slate-500">{sopts?.docTypes.find((t) => t.code === x.docType)?.label ?? x.docType} · {kb(x.size)}</span></span>
                  <button type="button" aria-label="Download" title="Download" className="text-blue-600" onClick={() => void download(x.id, x.fileName)}><Download size={15} /></button>
                  <button type="button" aria-label="Delete document" title="Delete" className="text-rose-500" onClick={() => void remove(x.id, x.fileName)}><Trash2 size={15} /></button></li>)}</ul>)}
            </section>
          </>
        )}
      </div>

      {reason !== null && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true"><div className="w-full max-w-md space-y-3 rounded-xl bg-white p-5 shadow-xl">
          <h2 className="text-[17px] font-extrabold text-[#101b69]">Set {d?.row.name} inactive?</h2>
          <p className="text-[12px] text-slate-500">Inactive students stay on record but free up their seat. You can reactivate them later.</p>
          <label className="block text-[12px] font-semibold text-[#17245e]">Reason (optional)<input value={reason} onChange={(e) => setReason(e.target.value)} maxLength={200} placeholder="e.g. Transferred to another school" className={`${controlClass} mt-1`} /></label>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setReason(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void toggle(false, reason)} disabled={busy}>Set Inactive</PrimaryButton></div></div></div>
      )}
    </SchoolLayout>
  );
}
