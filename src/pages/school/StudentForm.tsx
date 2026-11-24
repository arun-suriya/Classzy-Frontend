import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Download, Trash2, Upload, X } from "lucide-react";
import { api } from "../../services/api";
import type { AdmOptions, StuDetail, StuOptions } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout from "./SchoolLayout";

type F = { fullName: string; dob: string; yearId: string; classId: string; sectionId: string; joiningDate: string; guardianName: string; relationship: string; phone: string; email: string; address: string };
const today = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const card = "rounded-xl border border-[#d8e9fb] bg-white";
const cardHead = "rounded-t-xl border-b border-[#d8e9fb] bg-[#eef5fe] px-5 py-3 text-[17px] font-extrabold text-[#101b69]";

export default function StudentForm() {
  const nav = useNavigate();
  const { id } = useParams();
  const editId = id ? Number(id) : null;
  const [opts, setOpts] = useState<AdmOptions | null>(null);
  const [sopts, setSopts] = useState<StuOptions | null>(null);
  const [detail, setDetail] = useState<StuDetail | null>(null);
  const [f, setF] = useState<F>({ fullName: "", dob: "", yearId: "", classId: "", sectionId: "", joiningDate: today(), guardianName: "", relationship: "", phone: "", email: "", address: "" });
  const [files, setFiles] = useState<{ file: File; type: string }[]>([]);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [docType, setDocType] = useState("OTHER");

  useEffect(() => {
    Promise.all([api.admissions.options(), api.schoolStudents.options()]).then(([o, s]) => {
      setOpts(o); setSopts(s);
      if (!editId) setF((cur) => ({ ...cur, yearId: String(o.years.find((y) => y.current)?.id ?? o.years[0]?.id ?? "") }));
    }).catch((e) => setError(errText(e)));
  }, [editId]);
  useEffect(() => {
    if (!editId) return;
    api.schoolStudents.get(editId).then((d) => {
      setDetail(d);
      setF({ fullName: d.row.name, dob: d.dob ?? "", yearId: d.row.yearId ? String(d.row.yearId) : "", classId: d.row.classId ? String(d.row.classId) : "", sectionId: d.row.sectionId ? String(d.row.sectionId) : "", joiningDate: d.joiningDate ?? "", guardianName: d.guardianName ?? "", relationship: d.relationship ?? "", phone: d.phone ?? "", email: d.email ?? "", address: d.address ?? "" });
    }).catch((e) => setError(errText(e)));
  }, [editId]);

  const E = (k: string) => (errs[k] ? <p className="mt-1 text-[11px] text-rose-600">{errs[k]}</p> : null);
  const set = (p: Partial<F>) => setF((c) => ({ ...c, ...p }));
  const classes = (opts?.classes ?? []).filter((c) => String(c.yearId) === f.yearId);
  const sections = (opts?.sections ?? []).filter((s) => String(s.classId) === f.classId);

  const save = async () => {
    setErrs({}); setError("");
    if (!editId && files.length === 0) { setErrs({ files: "Upload at least one document (ID proof, previous report…)." }); return; }
    setBusy(true);
    const body = { fullName: f.fullName, dob: f.dob, academicYearId: f.yearId ? Number(f.yearId) : null, classId: f.classId ? Number(f.classId) : null, sectionId: f.sectionId ? Number(f.sectionId) : null, joiningDate: f.joiningDate, guardianName: f.guardianName, relationship: f.relationship, phone: f.phone, email: f.email, address: f.address };
    try {
      let sid = editId; let failed = 0;
      if (editId) await api.schoolStudents.update(editId, body); else sid = (await api.schoolStudents.create(body)).id;
      for (const x of files) { try { await api.schoolStudents.uploadDocument(sid as number, x.type, x.file); } catch { failed += 1; } }
      nav(`/school/students/${sid}`, { state: failed ? { warn: `${failed} document(s) couldn't be uploaded. Add them from here.` } : { ok: editId ? "Student updated." : "Student added." } });
    } catch (e) {
      const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors;
      if (fe && Object.keys(fe).length) { setErrs(fe); setError("Please fix the highlighted fields."); } else setError(errText(e));
    } finally { setBusy(false); }
  };
  const download = async (docId: number, name: string) => { try { const b = await api.schoolStudents.documentBlob(docId); const u = URL.createObjectURL(b); const a = document.createElement("a"); a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 1000); } catch (e) { setError(errText(e)); } };
  const removeDoc = async (docId: number, name: string) => { if (!window.confirm(`Delete ${name}?`)) return; try { await api.schoolStudents.removeDocument(docId); if (editId) setDetail(await api.schoolStudents.get(editId)); } catch (e) { setError(errText(e)); } };

  return (
    <SchoolLayout>
      <div className="space-y-4">
        <div><p className="text-[13px]"><Link to="/school/students" className="font-semibold text-blue-600 underline">Students</Link> <span className="px-1.5 text-slate-500">/</span> <span className="font-semibold text-[#101b69]">{editId ? "Edit Student" : "Add Student"}</span></p>
          <h1 className="mt-1 text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]">{editId ? `Edit ${detail?.row.admissionNo ?? "Student"}` : "Add Student"}</h1></div>
        {error && <Notice tone="error">{error}</Notice>}

        <div className="grid gap-5 lg:grid-cols-2">
          <section className={card}><h2 className={cardHead}>Student Details</h2><div className="space-y-4 p-5">
            <Field label="Full Name" required><input value={f.fullName} onChange={(e) => set({ fullName: e.target.value })} className={controlClass} />{E("fullName")}</Field>
            <Field label="Date of Birth" required><input type="date" value={f.dob} max={today()} onChange={(e) => set({ dob: e.target.value })} className={controlClass} />{E("dob")}</Field>
          </div></section>
          <section className={card}><h2 className={cardHead}>Enrollment</h2><div className="space-y-4 p-5">
            <Field label="Academic Year" required><select value={f.yearId} onChange={(e) => set({ yearId: e.target.value, classId: "", sectionId: "" })} className={controlClass}><option value="">Select</option>{opts?.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select>{E("academicYearId")}</Field>
            <Field label="Grade" required><select value={f.classId} onChange={(e) => set({ classId: e.target.value, sectionId: "" })} className={controlClass}><option value="">Select</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{E("classId")}</Field>
            <Field label="Section" required><select value={f.sectionId} onChange={(e) => set({ sectionId: e.target.value })} className={controlClass}><option value="">Select</option>{sections.map((s) => { const full = s.max !== null && s.enrolled >= s.max && String(detail?.row.sectionId) !== String(s.id); return <option key={s.id} value={s.id} disabled={full}>{s.name} ({s.enrolled}{s.max !== null ? `/${s.max}` : ""}){full ? " - full" : ""}</option>; })}</select>{E("sectionId")}</Field>
            <Field label="Joining Date" required><input type="date" value={f.joiningDate} onChange={(e) => set({ joiningDate: e.target.value })} className={controlClass} />{E("joiningDate")}</Field>
          </div></section>
          <section className={card}><h2 className={cardHead}>Parent / Guardian</h2><div className="space-y-4 p-5">
            <Field label="Name" required><input value={f.guardianName} onChange={(e) => set({ guardianName: e.target.value })} className={controlClass} />{E("guardianName")}</Field>
            <Field label="Relationship" required><select value={f.relationship} onChange={(e) => set({ relationship: e.target.value })} className={controlClass}><option value="">Select</option>{sopts?.relationships.map((r) => <option key={r.code} value={r.code}>{r.label}</option>)}</select>{E("relationship")}</Field>
            <Field label="Mobile" required><input value={f.phone} onChange={(e) => set({ phone: e.target.value })} className={controlClass} />{E("phone")}</Field>
            <Field label="Email" required><input type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} className={controlClass} />{E("email")}</Field>
          </div></section>
          <section className={card}><h2 className={cardHead}>Address &amp; Documents</h2><div className="space-y-4 p-5">
            <Field label="Address" required><textarea rows={4} value={f.address} onChange={(e) => set({ address: e.target.value })} className={controlClass} />{E("address")}</Field>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-[#17245e]">Upload Documents {!editId && <span className="text-rose-500">*</span>}</p>
              <div className="flex gap-2"><select value={docType} onChange={(e) => { setDocType(e.target.value); setFiles((c) => c); }} className="rounded-lg border border-[#cfe0f6] px-2 text-[12px]" aria-label="Type for new files">{sopts?.docTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select>
                <label className="flex h-11 flex-1 cursor-pointer items-center gap-2 rounded-lg border border-[#cfe0f6] bg-white px-3 text-[13px] text-slate-600 hover:bg-blue-50"><Upload size={16} />Choose files (e.g. ID proof, previous report)<input type="file" multiple accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => { setFiles((c) => [...c, ...Array.from<File>(e.target.files ?? []).map((file) => ({ file, type: docType }))].slice(0, 10)); e.target.value = ""; }} /></label></div>
              {E("files")}
              <p className="mt-1 text-[10px] text-slate-500">PDF, PNG or JPG, up to 5 MB each, 10 per student.</p>
              {files.map((x, i) => <div key={`${x.file.name}${i}`} className="mt-1.5 flex items-center gap-2 text-[12px]"><span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700">{sopts?.docTypes.find((t) => t.code === x.type)?.label}</span><span className="min-w-0 flex-1 truncate">{x.file.name}</span><span className="text-slate-500">{kb(x.file.size)}</span><button type="button" aria-label="Remove file" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={14} /></button></div>)}
              {detail && detail.documents.length > 0 && <ul className="mt-3 divide-y divide-[#eef4fd] border-t border-[#e3eefc] text-[12px]">{detail.documents.map((d) => <li key={d.id} className="flex items-center gap-3 py-2"><span className="min-w-0 flex-1 truncate">{d.fileName}<span className="ml-2 text-slate-500">{sopts?.docTypes.find((t) => t.code === d.docType)?.label} · {kb(d.size)}</span></span><button type="button" aria-label="Download" className="text-blue-600" onClick={() => void download(d.id, d.fileName)}><Download size={14} /></button><button type="button" aria-label="Delete document" className="text-rose-500" onClick={() => void removeDoc(d.id, d.fileName)}><Trash2 size={14} /></button></li>)}</ul>}
            </div>
          </div></section>
        </div>

        <div className="flex justify-end gap-3 pb-4"><OutlineButton onClick={() => nav(editId ? `/school/students/${editId}` : "/school/students")}>Cancel</OutlineButton><PrimaryButton onClick={() => void save()} disabled={busy || !opts}>{busy ? "Saving…" : editId ? "Save Changes" : "Save Student"}</PrimaryButton></div>
      </div>
    </SchoolLayout>
  );
}
