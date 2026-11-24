import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Download, MoreVertical, Plus, Search, Trash2, Upload, X } from "lucide-react";
import { api } from "../../services/api";
import type { AdmAdmittedPage, AdmAppDetail, AdmAppPage, AdmApp, AdmEnquiry, AdmEnquiryPage, AdmOffer, AdmOfferPage, AdmOptions, AdmCounts, AdmWaitlist } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout from "./SchoolLayout";

type Tab = "Applications" | "Enquiries" | "Waiting List" | "Offers" | "Admitted";
const TABS: Tab[] = ["Applications", "Enquiries", "Waiting List", "Offers", "Admitted"];

const dayFmt = (iso: string | null) => { if (!iso) return "—"; const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const stampFmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const kb = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);
const plusDays = (n: number) => { const d = new Date(); d.setDate(d.getDate() + n); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };

const stageTone: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600", SUBMITTED: "bg-sky-100 text-sky-700", UNDER_REVIEW: "bg-amber-100 text-amber-700", DOCUMENTS_PENDING: "bg-orange-100 text-orange-700", ASSESSMENT: "bg-violet-100 text-violet-700",
  INTERVIEW: "bg-violet-100 text-violet-700", WAITLISTED: "bg-slate-200 text-slate-700", OFFER_ISSUED: "bg-blue-100 text-blue-700", ADMITTED: "bg-emerald-100 text-emerald-700", REJECTED: "bg-rose-100 text-rose-700", WITHDRAWN: "bg-slate-100 text-slate-500",
  NEW: "bg-sky-100 text-sky-700", FOLLOW_UP: "bg-emerald-100 text-emerald-700", CONVERTED: "bg-violet-100 text-violet-700", CLOSED: "bg-slate-100 text-slate-500",
  PENDING: "bg-amber-100 text-amber-700", SENT: "bg-sky-100 text-sky-700", ACCEPTED: "bg-emerald-100 text-emerald-700", DECLINED: "bg-rose-100 text-rose-700", EXPIRED: "bg-slate-100 text-slate-500",
};
const stageLabel: Record<string, string> = {
  DRAFT: "Draft", SUBMITTED: "Submitted", UNDER_REVIEW: "In Review", DOCUMENTS_PENDING: "Documents Pending", ASSESSMENT: "Assessment", INTERVIEW: "Interview", WAITLISTED: "Waitlisted", OFFER_ISSUED: "Offer Issued", ADMITTED: "Admitted", REJECTED: "Rejected", WITHDRAWN: "Withdrawn",
  NEW: "Open", FOLLOW_UP: "Contacted", CONVERTED: "Converted", CLOSED: "Closed", PENDING: "Pending", SENT: "Sent", ACCEPTED: "Accepted", DECLINED: "Declined", EXPIRED: "Expired",
};
const Pill = ({ s }: { s: string }) => <span className={`inline-block whitespace-nowrap rounded-full px-3 py-1 text-[10px] font-semibold ${stageTone[s] ?? "bg-slate-100 text-slate-600"}`}>{stageLabel[s] ?? s}</span>;
const OFFERABLE = ["SUBMITTED", "UNDER_REVIEW", "DOCUMENTS_PENDING", "ASSESSMENT", "INTERVIEW", "WAITLISTED"];
const MANUAL = ["SUBMITTED", "UNDER_REVIEW", "DOCUMENTS_PENDING", "ASSESSMENT", "INTERVIEW", "WAITLISTED", "REJECTED", "WITHDRAWN"];

function Modal({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className={`max-h-[92vh] w-full ${wide ? "max-w-3xl" : "max-w-md"} space-y-3 overflow-auto rounded-xl bg-white p-5 shadow-xl`}>
        <div className="flex items-center justify-between"><h2 className="text-[17px] font-extrabold text-[#101b69]">{title}</h2><button type="button" aria-label="Close" onClick={onClose}><X size={17} /></button></div>
        {children}
      </div>
    </div>
  );
}
function Table({ heads, children, empty, colSpan }: { heads: string[]; children: ReactNode; empty?: string; colSpan: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#cfe0f6]">
      <table className="w-full border-collapse text-left text-[12px]" style={{ minWidth: 640 }}>
        <thead><tr className="bg-[#e8f1fd] text-[#13205f]">{heads.map((h) => <th key={h} className="border-b border-[#cfe0f6] px-4 py-3 text-[12px] font-bold">{h}</th>)}</tr></thead>
        <tbody>{empty ? <tr><td colSpan={colSpan} className="px-4 py-10 text-center text-[12px] text-slate-500">{empty}</td></tr> : children}</tbody>
      </table>
    </div>
  );
}
const td = "border-b border-[#e3eefc] px-4 py-3 text-[#17245e]";
function Pager({ page, size, total, set }: { page: number; size: number; total: number; set: (p: number) => void }) {
  const last = Math.max(1, Math.ceil(total / size));
  return (
    <div className="flex items-center justify-between pt-3 text-[12px] text-[#17245e]">
      <span>{total === 0 ? "No records" : `Showing ${page * size + 1}-${Math.min(total, (page + 1) * size)} of ${total.toLocaleString("en-IN")}`}</span>
      <div className="flex items-center gap-1.5"><button type="button" disabled={page === 0} onClick={() => set(page - 1)} className="rounded border border-[#cfe0f6] px-3 py-1 text-blue-600 disabled:opacity-40">Prev</button><span className="px-1">{page + 1} / {last}</span><button type="button" disabled={page >= last - 1} onClick={() => set(page + 1)} className="rounded border border-[#cfe0f6] px-3 py-1 text-blue-600 disabled:opacity-40">Next</button></div>
    </div>
  );
}
function Menu({ id, open, setOpen, children }: { id: string; open: string | null; setOpen: (v: string | null) => void; children: ReactNode }) {
  return (
    <span className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="More" className="text-slate-600" onClick={() => setOpen(open === id ? null : id)}><MoreVertical size={15} /></button>
      {open === id && <div className="absolute right-0 top-5 z-10 w-44 rounded-md border border-[#d8e9fb] bg-white py-1 text-[11px] text-[#17245e] shadow-lg" onClick={() => setOpen(null)}>{children}</div>}
    </span>
  );
}
const Item = ({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: ReactNode }) => <button type="button" onClick={onClick} className={`block w-full px-3 py-1.5 text-left ${danger ? "text-rose-600 hover:bg-rose-50" : "hover:bg-blue-50"}`}>{children}</button>;
const SmallBtn = ({ onClick, children, solid }: { onClick: () => void; children: ReactNode; solid?: boolean }) => <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[11px] font-semibold ${solid ? "bg-[#0875fb] text-white hover:bg-blue-700" : "border border-blue-400 text-blue-600 hover:bg-blue-50"}`}>{children}</button>;

type AppForm = { id: number | null; studentName: string; dob: string; yearId: string; classId: string; guardianName: string; phone: string; email: string; enquiryId: number | null };
type EnqForm = { id: number | null; name: string; phone: string; email: string; childName: string; grade: string; source: string; followUpOn: string; note: string };

export default function Admissions() {
  const nav = useNavigate();
  const [tab, setTab] = useState<Tab>("Applications");
  const [opts, setOpts] = useState<AdmOptions | null>(null);
  const [counts, setCounts] = useState<AdmCounts | null>(null);
  const [yearId, setYearId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});

  // lists
  const [apps, setApps] = useState<AdmAppPage | null>(null);
  const [appPage, setAppPage] = useState(0);
  const [appClass, setAppClass] = useState("");
  const [appStage, setAppStage] = useState("");
  const [appQ, setAppQ] = useState("");
  const [enqs, setEnqs] = useState<AdmEnquiryPage | null>(null);
  const [enqPage, setEnqPage] = useState(0);
  const [enqStatus, setEnqStatus] = useState("");
  const [wait, setWait] = useState<AdmWaitlist | null>(null);
  const [waitClass, setWaitClass] = useState("");
  const [offers, setOffers] = useState<AdmOfferPage | null>(null);
  const [offerPage, setOfferPage] = useState(0);
  const [offerStatus, setOfferStatus] = useState("");
  const [admitted, setAdmitted] = useState<AdmAdmittedPage | null>(null);
  const [admPage, setAdmPage] = useState(0);
  const [admClass, setAdmClass] = useState("");

  // dialogs
  const [form, setForm] = useState<AppForm | null>(null);
  const [files, setFiles] = useState<{ file: File; type: string }[]>([]);
  const [enqForm, setEnqForm] = useState<EnqForm | null>(null);
  const [detail, setDetail] = useState<AdmAppDetail | null>(null);
  const [offerForm, setOfferForm] = useState<{ applicationId: string; expiresOn: string; note: string } | null>(null);
  const [offerChoices, setOfferChoices] = useState<AdmApp[]>([]);
  const [admitOffer, setAdmitOffer] = useState<AdmOffer | null>(null);
  const [sectionId, setSectionId] = useState("");
  const [docType, setDocType] = useState("OTHER");

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(""), 4500); };
  const fieldErrs = (e: unknown) => { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; return fe && Object.keys(fe).length ? fe : null; };
  const E = (k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);
  const refreshCounts = useCallback(() => { api.admissions.counts().then(setCounts).catch(() => { /* tab badges are optional */ }); }, []);

  useEffect(() => {
    api.admissions.options().then((o) => { setOpts(o); setYearId((y) => y ?? o.years.find((x) => x.current)?.id ?? o.years[0]?.id ?? null); }).catch((e) => setError(errText(e)));
    refreshCounts();
  }, [refreshCounts]);

  const yearClasses = (opts?.classes ?? []).filter((c) => yearId === null || c.yearId === yearId);

  const loadApps = useCallback(async () => { try { setApps(await api.admissions.applications({ yearId, classId: appClass ? Number(appClass) : null, stage: appStage || undefined, q: appQ || undefined }, appPage)); } catch (e) { setError(errText(e)); } }, [yearId, appClass, appStage, appQ, appPage]);
  const loadEnqs = useCallback(async () => { try { setEnqs(await api.admissions.enquiries({ status: enqStatus || undefined }, enqPage)); } catch (e) { setError(errText(e)); } }, [enqStatus, enqPage]);
  const loadWait = useCallback(async () => { if (!waitClass) { setWait(null); return; } try { setWait(await api.admissions.waitlist(Number(waitClass))); } catch (e) { setError(errText(e)); } }, [waitClass]);
  const loadOffers = useCallback(async () => { try { setOffers(await api.admissions.offers({ status: offerStatus || undefined }, offerPage)); } catch (e) { setError(errText(e)); } }, [offerStatus, offerPage]);
  const loadAdmitted = useCallback(async () => { try { setAdmitted(await api.admissions.admitted({ classId: admClass ? Number(admClass) : null }, admPage)); } catch (e) { setError(errText(e)); } }, [admClass, admPage]);

  useEffect(() => { if (tab === "Applications" && yearId !== null) void loadApps(); }, [tab, loadApps, yearId]);
  useEffect(() => { if (tab === "Enquiries") void loadEnqs(); }, [tab, loadEnqs]);
  useEffect(() => { if (tab === "Waiting List") void loadWait(); }, [tab, loadWait]);
  useEffect(() => { if (tab === "Offers") void loadOffers(); }, [tab, loadOffers]);
  useEffect(() => { if (tab === "Admitted") void loadAdmitted(); }, [tab, loadAdmitted]);
  useEffect(() => { if (tab === "Waiting List" && !waitClass && yearClasses.length > 0) setWaitClass(String(yearClasses[0].id)); }, [tab, waitClass, yearClasses]);

  const reloadAll = async () => {
    refreshCounts();
    if (tab === "Applications") await loadApps(); else if (tab === "Enquiries") await loadEnqs(); else if (tab === "Waiting List") await loadWait(); else if (tab === "Offers") await loadOffers(); else await loadAdmitted();
  };
  const run = async (fn: () => Promise<unknown>, ok: string) => { try { await fn(); flash(ok); await reloadAll(); if (detail) setDetail(await api.admissions.application(detail.row.id)); } catch (e) { setError(errText(e)); } };
  const saveBlob = (b: Blob, name: string) => { const url = URL.createObjectURL(b); const a = document.createElement("a"); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000); };

  // ---- application form
  const blankForm = (): AppForm => ({ id: null, studentName: "", dob: "", yearId: yearId ? String(yearId) : "", classId: "", guardianName: "", phone: "", email: "", enquiryId: null });
  const openNew = () => { setErrs({}); setFiles([]); setForm(blankForm()); };
  const fromEnquiry = (q: AdmEnquiry) => { setErrs({}); setFiles([]); const cls = yearClasses.find((c) => c.name.toLowerCase() === (q.grade ?? "").toLowerCase()); setForm({ ...blankForm(), studentName: q.childName ?? "", guardianName: q.name, phone: q.phone ?? "", email: q.email ?? "", classId: cls ? String(cls.id) : "", enquiryId: q.id }); };
  const editApp = (d: AdmAppDetail) => { setErrs({}); setFiles([]); setDetail(null); setForm({ id: d.row.id, studentName: d.row.studentName, dob: d.dob ?? "", yearId: d.row.yearId ? String(d.row.yearId) : "", classId: d.row.classId ? String(d.row.classId) : "", guardianName: d.row.guardianName ?? "", phone: d.row.phone ?? "", email: d.guardianEmail ?? "", enquiryId: null }); };
  const saveForm = async (submit: boolean) => {
    if (!form) return; setBusy(true); setErrs({}); setError("");
    const body = { studentName: form.studentName, dob: form.dob, academicYearId: form.yearId ? Number(form.yearId) : null, classId: form.classId ? Number(form.classId) : null, guardianName: form.guardianName, phone: form.phone, email: form.email, submit, enquiryId: form.enquiryId };
    try {
      let id = form.id; let no = "";
      if (id) await api.admissions.updateApplication(id, body); else { const r = await api.admissions.createApplication(body); id = r.id; no = r.applicationNo; }
      let failed = 0;
      for (const f of files) { try { await api.admissions.uploadDocument(id, f.type, f.file); } catch { failed += 1; } }
      setForm(null); setFiles([]);
      flash(`${no || "Application"} ${submit ? "submitted" : "saved as a draft"}${failed ? `. ${failed} document(s) couldn't be uploaded: open the application to add them.` : "."}`);
      await reloadAll();
    } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else setError(errText(e)); } finally { setBusy(false); }
  };
  const addFiles = (list: ArrayLike<File> | null) => { if (!list) return; setFiles((cur) => [...cur, ...Array.from(list).map((file) => ({ file, type: "OTHER" }))].slice(0, 10)); };

  // ---- detail
  const openDetail = async (id: number) => { try { setDetail(await api.admissions.application(id)); } catch (e) { setError(errText(e)); } };
  const downloadDoc = async (id: number, name: string) => { try { saveBlob(await api.admissions.documentBlob(id), name); } catch (e) { setError(errText(e)); } };
  const uploadMore = async (id: number, f: File | undefined) => { if (!f) return; try { await api.admissions.uploadDocument(id, docType, f); flash("Document uploaded."); setDetail(await api.admissions.application(id)); await reloadAll(); } catch (e) { setError(errText(e)); } };

  // ---- enquiry form
  const newEnq = () => { setErrs({}); setEnqForm({ id: null, name: "", phone: "", email: "", childName: "", grade: "", source: "", followUpOn: "", note: "" }); };
  const editEnq = (q: AdmEnquiry) => { setErrs({}); setEnqForm({ id: q.id, name: q.name, phone: q.phone ?? "", email: q.email ?? "", childName: q.childName ?? "", grade: q.grade ?? "", source: q.source ?? "", followUpOn: q.followUpOn ?? "", note: q.note ?? "" }); };
  const saveEnq = async () => {
    if (!enqForm) return; setBusy(true); setErrs({});
    const { id, ...body } = enqForm;
    try { if (id) await api.admissions.updateEnquiry(id, body); else await api.admissions.createEnquiry(body); setEnqForm(null); flash("Enquiry saved."); await reloadAll(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else setError(errText(e)); } finally { setBusy(false); }
  };
  const gradeNames = Array.from(new Set((opts?.classes ?? []).map((c) => c.name)));

  // ---- offers
  const openOffer = async (applicationId?: number) => {
    setErrs({});
    try {
      const r = await api.admissions.applications({}, 0, 50);
      setOfferChoices(r.items.filter((a) => OFFERABLE.includes(a.stage) && a.classId !== null));
      setOfferForm({ applicationId: applicationId ? String(applicationId) : "", expiresOn: plusDays(14), note: "" });
    } catch (e) { setError(errText(e)); }
  };
  const saveOffer = async () => {
    if (!offerForm) return; setBusy(true); setErrs({});
    try { await api.admissions.createOffer({ applicationId: Number(offerForm.applicationId), expiresOn: offerForm.expiresOn, note: offerForm.note }); setOfferForm(null); setDetail(null); flash("Offer created. Use Send Offer once the family has been told."); setTab("Offers"); setOfferPage(0); await reloadAll(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else setError(errText(e)); } finally { setBusy(false); }
  };
  const doAdmit = async () => {
    if (!admitOffer) return; setBusy(true); setErrs({});
    try { const r = await api.admissions.admit(admitOffer.id, Number(sectionId)); setAdmitOffer(null); setSectionId(""); flash(`${admitOffer.applicant} admitted as ${r.admissionNo}.`); await reloadAll(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else setError(errText(e)); } finally { setBusy(false); }
  };

  const yearSelect = (
    <label className="block text-[12px] font-semibold text-[#17245e]">Year
      <select value={yearId ?? ""} onChange={(e) => { setYearId(e.target.value ? Number(e.target.value) : null); setAppClass(""); setWaitClass(""); setAppPage(0); }} className={`${controlClass} mt-1 min-w-[150px]`}>{opts?.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label>
  );
  const head = (title: string, action?: ReactNode) => <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]">{title}</h2>{action}</div>;
  const addBtn = (label: string, fn: () => void) => <button type="button" onClick={fn} className="inline-flex items-center gap-2 rounded-lg bg-[#0875fb] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700"><Plus size={15} />{label}</button>;
  const badge = (t: Tab): number | null => (!counts ? null : t === "Applications" ? counts.applications : t === "Enquiries" ? counts.enquiries : t === "Waiting List" ? counts.waitlist : t === "Offers" ? counts.offers : counts.admitted);
  const noYear = opts && opts.years.length === 0;

  return (
    <SchoolLayout>
      <div className="space-y-4" onClick={() => setMenu(null)}>
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {noYear && <Notice tone="info">This school has no academic year yet. Set one up (with grades and sections) before taking applications.</Notice>}

        <div className="flex flex-wrap items-center gap-1 border-b border-[#cfe0f6] pb-2">
          {TABS.map((t) => <button key={t} type="button" onClick={() => { setTab(t); setError(""); }} className={`rounded-md px-5 py-2 text-[14px] font-semibold ${tab === t ? "bg-[#0875fb] text-white" : "text-[#101b69] hover:bg-blue-50"}`}>{t}{badge(t) ? <span className={`ml-2 rounded-full px-1.5 text-[10px] ${tab === t ? "bg-white/25" : "bg-blue-100 text-blue-700"}`}>{badge(t)}</span> : null}</button>)}
        </div>

        <div className="rounded-xl border border-[#d8e9fb] bg-white p-5">
          {tab === "Applications" && (
            <div className="space-y-4">
              {head("Applications", addBtn("Add Application", openNew))}
              <div className="flex flex-wrap items-end gap-3">
                {yearSelect}
                <label className="block text-[12px] font-semibold text-[#17245e]">Grade<select value={appClass} onChange={(e) => { setAppClass(e.target.value); setAppPage(0); }} className={`${controlClass} mt-1 min-w-[150px]`}><option value="">All grades</option>{yearClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <label className="block text-[12px] font-semibold text-[#17245e]">Status<select value={appStage} onChange={(e) => { setAppStage(e.target.value); setAppPage(0); }} className={`${controlClass} mt-1 min-w-[170px]`}><option value="">All statuses</option>{opts?.stages.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}</select></label>
                <label className="relative block min-w-[220px] flex-1 text-[12px] font-semibold text-[#17245e]">Search<Search size={14} className="absolute left-3 top-[34px] text-blue-500" /><input value={appQ} onChange={(e) => { setAppQ(e.target.value); setAppPage(0); }} placeholder="Applicant, guardian or application ID" className={`${controlClass} mt-1 pl-8`} /></label>
              </div>
              <Table heads={["Application ID", "Applicant", "Grade", "Status", "Submitted On", "Documents"]} colSpan={6} empty={apps && apps.items.length === 0 ? "No applications match these filters." : undefined}>
                {apps?.items.map((a) => (
                  <tr key={a.id} onClick={() => void openDetail(a.id)} className="cursor-pointer hover:bg-[#f5f9ff]"><td className={`${td} font-medium`}>{a.applicationNo}</td><td className={td}>{a.studentName}</td><td className={td}>{a.grade ?? "—"}</td><td className={td}><Pill s={a.stage} /></td><td className={td}>{a.stage === "DRAFT" ? "—" : stampFmt(a.submittedAt)}</td><td className={td}>{a.docs === 0 ? "—" : `${a.docsVerified}/${a.docs} verified`}</td></tr>
                ))}
              </Table>
              {apps && <Pager page={apps.page} size={apps.size} total={apps.total} set={setAppPage} />}
            </div>
          )}

          {tab === "Enquiries" && (
            <div className="space-y-4">
              {head("Enquiries", addBtn("Add Enquiry", newEnq))}
              <div className="flex items-end gap-3"><label className="block text-[12px] font-semibold text-[#17245e]">Status<select value={enqStatus} onChange={(e) => { setEnqStatus(e.target.value); setEnqPage(0); }} className={`${controlClass} mt-1 min-w-[170px]`}><option value="">All statuses</option><option value="NEW">Open</option><option value="FOLLOW_UP">Contacted</option><option value="CONVERTED">Converted</option><option value="CLOSED">Closed</option></select></label></div>
              <Table heads={["Enquiry ID", "Parent", "Grade", "Follow-up", "Status", "Action"]} colSpan={6} empty={enqs && enqs.items.length === 0 ? "No enquiries yet." : undefined}>
                {enqs?.items.map((q) => (
                  <tr key={q.id}><td className={`${td} font-medium`}>{q.enquiryNo}</td><td className={td}>{q.name}{q.childName ? <span className="block text-[10px] text-slate-500">for {q.childName}</span> : null}</td><td className={td}>{q.grade ?? "—"}</td><td className={td}>{dayFmt(q.followUpOn)}</td><td className={td}><Pill s={q.status} /></td>
                    <td className={td}><span className="flex items-center gap-2">{(q.status === "NEW" || q.status === "FOLLOW_UP") && <SmallBtn onClick={() => fromEnquiry(q)}>Convert to Application</SmallBtn>}
                      {q.status !== "CONVERTED" && <Menu id={`q${q.id}`} open={menu} setOpen={setMenu}><Item onClick={() => editEnq(q)}>Edit</Item>{q.status !== "FOLLOW_UP" && <Item onClick={() => void run(() => api.admissions.setEnquiryStatus(q.id, "FOLLOW_UP"), "Marked as contacted.")}>Mark contacted</Item>}{q.status !== "NEW" && <Item onClick={() => void run(() => api.admissions.setEnquiryStatus(q.id, "NEW"), "Reopened.")}>Mark open</Item>}{q.status !== "CLOSED" && <Item onClick={() => void run(() => api.admissions.setEnquiryStatus(q.id, "CLOSED"), "Enquiry closed.")}>Close</Item>}<Item danger onClick={() => { if (window.confirm("Delete this enquiry?")) void run(() => api.admissions.removeEnquiry(q.id), "Enquiry deleted."); }}>Delete</Item></Menu>}</span></td></tr>
                ))}
              </Table>
              {enqs && <Pager page={enqs.page} size={enqs.size} total={enqs.total} set={setEnqPage} />}
            </div>
          )}

          {tab === "Waiting List" && (
            <div className="space-y-4">
              {head("Waiting List")}
              <div className="flex flex-wrap items-end gap-5">
                {yearSelect}
                <label className="block text-[12px] font-semibold text-[#17245e]">Grade<select value={waitClass} onChange={(e) => setWaitClass(e.target.value)} className={`${controlClass} mt-1 min-w-[150px]`}>{yearClasses.length === 0 && <option value="">No grades</option>}{yearClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
                <div className="pb-2 text-[15px] font-bold text-[#101b69]">Seats Available: <span className="text-blue-600">{wait ? (wait.seats === null ? "Not set" : wait.seats) : "—"}</span></div>
              </div>
              {wait && wait.seats === null && <p className="text-[11px] text-slate-500">No section of this grade has a student limit, so seats can't be counted. Set a maximum on the sections in Academic settings.</p>}
              <Table heads={["Rank", "Applicant", "Grade", "Waitlisted On", "Action"]} colSpan={5} empty={wait && wait.items.length === 0 ? "Nobody is on the waiting list for this grade." : !wait ? "Choose a grade." : undefined}>
                {wait?.items.map((w) => <tr key={w.id}><td className={td}>{w.rank}</td><td className={td}><button type="button" className="font-medium text-blue-700 hover:underline" onClick={() => void openDetail(w.id)}>{w.studentName}</button><span className="block text-[10px] text-slate-500">{w.applicationNo}</span></td><td className={td}>{w.grade}</td><td className={td}>{stampFmt(w.waitlistedOn)}</td><td className={td}><SmallBtn solid onClick={() => void openOffer(w.id)}>Create Offer</SmallBtn></td></tr>)}
              </Table>
            </div>
          )}

          {tab === "Offers" && (
            <div className="space-y-4">
              {head("Offers", addBtn("Create Offer", () => void openOffer()))}
              <div className="flex items-end gap-3"><label className="block text-[12px] font-semibold text-[#17245e]">Status<select value={offerStatus} onChange={(e) => { setOfferStatus(e.target.value); setOfferPage(0); }} className={`${controlClass} mt-1 min-w-[170px]`}><option value="">All statuses</option>{["PENDING", "SENT", "ACCEPTED", "DECLINED", "WITHDRAWN", "EXPIRED", "ADMITTED"].map((s) => <option key={s} value={s}>{stageLabel[s] ?? "Admitted"}</option>)}</select></label></div>
              <Table heads={["Offer ID", "Applicant", "Grade", "Expires On", "Status", "Action"]} colSpan={6} empty={offers && offers.items.length === 0 ? "No offers yet." : undefined}>
                {offers?.items.map((o) => (
                  <tr key={o.id}><td className={`${td} font-medium`}>{o.offerNo}</td><td className={td}>{o.applicant}<span className="block text-[10px] text-slate-500">{o.applicationNo}</span></td><td className={td}>{o.grade ?? "—"}</td><td className={td}>{dayFmt(o.expiresOn)}</td><td className={td}><Pill s={o.status === "ADMITTED" ? "ADMITTED" : o.status} /></td>
                    <td className={td}><span className="flex items-center gap-2">
                      {o.status === "PENDING" && <SmallBtn solid onClick={() => void run(() => api.admissions.sendOffer(o.id), "Offer marked as sent.")}>Send Offer</SmallBtn>}
                      {o.status === "SENT" && <><SmallBtn solid onClick={() => void run(() => api.admissions.acceptOffer(o.id), "Acceptance recorded.")}>Mark Accepted</SmallBtn><SmallBtn onClick={() => void run(() => api.admissions.declineOffer(o.id), "Decline recorded.")}>Declined</SmallBtn></>}
                      {o.status === "ACCEPTED" && <SmallBtn solid onClick={() => { setErrs({}); setSectionId(""); setAdmitOffer(o); }}>Admit</SmallBtn>}
                      {["PENDING", "SENT", "ACCEPTED"].includes(o.status) && <Menu id={`o${o.id}`} open={menu} setOpen={setMenu}><Item danger onClick={() => { if (window.confirm("Withdraw this offer?")) void run(() => api.admissions.withdrawOffer(o.id), "Offer withdrawn."); }}>Withdraw offer</Item></Menu>}</span></td></tr>
                ))}
              </Table>
              {offers && <Pager page={offers.page} size={offers.size} total={offers.total} set={setOfferPage} />}
              <p className="text-[10px] text-slate-500">Offers are records only: nothing is emailed to the family. "Send Offer" marks it as sent after you've shared it.</p>
            </div>
          )}

          {tab === "Admitted" && (
            <div className="space-y-4">
              {head("Admitted")}
              <div className="flex items-end gap-3">{yearSelect}<label className="block text-[12px] font-semibold text-[#17245e]">Grade<select value={admClass} onChange={(e) => { setAdmClass(e.target.value); setAdmPage(0); }} className={`${controlClass} mt-1 min-w-[150px]`}><option value="">All grades</option>{yearClasses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label></div>
              <Table heads={["Admission No.", "Student", "Grade", "Section", "Enrolled On", ""]} colSpan={6} empty={admitted && admitted.items.length === 0 ? "No admitted students yet." : undefined}>
                {admitted?.items.map((r) => <tr key={r.applicationId}><td className={`${td} font-medium`}>{r.admissionNo ?? "—"}</td><td className={td}>{r.student}</td><td className={td}>{r.grade ?? "—"}</td><td className={td}>{r.section ?? "—"}</td><td className={td}>{stampFmt(r.enrolledOn)}</td><td className={td}><SmallBtn onClick={() => nav(r.studentId ? `/school/students/${r.studentId}` : "/school/students")}>View Student</SmallBtn></td></tr>)}
              </Table>
              {admitted && <Pager page={admitted.page} size={admitted.size} total={admitted.total} set={setAdmPage} />}
            </div>
          )}
        </div>
      </div>

      {form && (
        <Modal title={form.id ? "Edit Application" : "Add Application"} wide onClose={() => setForm(null)}>
          <div className="grid gap-4 md:grid-cols-2">
            <fieldset className="space-y-3 rounded-lg border border-[#cfe0f6] p-4"><legend className="px-1 text-[14px] font-extrabold text-[#101b69]">Applicant Details</legend>
              <Field label="Full Name" required><input value={form.studentName} onChange={(e) => setForm({ ...form, studentName: e.target.value })} className={controlClass} />{E("studentName")}</Field>
              <Field label="Date of Birth" optional><input type="date" value={form.dob} max={plusDays(0)} onChange={(e) => setForm({ ...form, dob: e.target.value })} className={controlClass} />{E("dob")}</Field></fieldset>
            <fieldset className="space-y-3 rounded-lg border border-[#cfe0f6] p-4"><legend className="px-1 text-[14px] font-extrabold text-[#101b69]">Admission Details</legend>
              <Field label="Academic Year"><select value={form.yearId} onChange={(e) => setForm({ ...form, yearId: e.target.value, classId: "" })} className={controlClass}><option value="">Select</option>{opts?.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select>{E("academicYearId")}</Field>
              <Field label="Grade"><select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className={controlClass}><option value="">Select</option>{(opts?.classes ?? []).filter((c) => String(c.yearId) === form.yearId).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{E("classId")}</Field></fieldset>
            <fieldset className="space-y-3 rounded-lg border border-[#cfe0f6] p-4"><legend className="px-1 text-[14px] font-extrabold text-[#101b69]">Parent / Guardian</legend>
              <Field label="Name"><input value={form.guardianName} onChange={(e) => setForm({ ...form, guardianName: e.target.value })} className={controlClass} />{E("guardianName")}</Field>
              <Field label="Mobile"><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className={controlClass} />{E("phone")}</Field>
              <Field label="Email" optional><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className={controlClass} />{E("email")}</Field></fieldset>
            <fieldset className="space-y-3 rounded-lg border border-[#cfe0f6] p-4"><legend className="px-1 text-[14px] font-extrabold text-[#101b69]">Documents</legend>
              {form.id ? <p className="text-[11px] text-slate-500">Add or verify documents from the application's detail page.</p> : (
                <>
                  <label className="grid cursor-pointer place-items-center rounded-lg border border-dashed border-blue-400 bg-[#f8fbff] py-5 text-[12px] font-semibold text-blue-600 hover:bg-blue-50"><Upload size={20} className="mb-1" />Upload Files<input type="file" multiple accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /></label>
                  <p className="text-[10px] text-slate-500">PDF, PNG or JPG, up to 5 MB each, 10 files.</p>
                  {files.map((f, i) => <div key={`${f.file.name}${i}`} className="flex items-center gap-2 text-[11px]"><select value={f.type} onChange={(e) => setFiles(files.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)))} className="rounded border border-[#cfe0f6] px-1 py-1 text-[10px]">{opts?.docTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select><span className="min-w-0 flex-1 truncate">{f.file.name}</span><span className="text-slate-500">{kb(f.file.size)}</span><button type="button" aria-label="Remove file" onClick={() => setFiles(files.filter((_, j) => j !== i))}><X size={13} /></button></div>)}
                </>)}
            </fieldset>
          </div>
          {form.enquiryId && <p className="text-[11px] text-slate-500">Created from an enquiry. Saving links the two and marks the enquiry as converted.</p>}
          <div className="flex justify-end gap-2 pt-1"><OutlineButton onClick={() => setForm(null)}>Cancel</OutlineButton>{(!form.id || apps?.items.find((a) => a.id === form.id)?.stage === "DRAFT") && <OutlineButton onClick={() => void saveForm(false)} disabled={busy}>{form.id ? "Save Draft" : "Save Draft"}</OutlineButton>}<PrimaryButton onClick={() => void saveForm(true)} disabled={busy}>{busy ? "Saving…" : form.id && apps?.items.find((a) => a.id === form.id)?.stage !== "DRAFT" ? "Save Changes" : "Submit Application"}</PrimaryButton></div>
        </Modal>
      )}

      {detail && (
        <Modal title={`${detail.row.applicationNo} · ${detail.row.studentName}`} wide onClose={() => setDetail(null)}>
          <div className="flex flex-wrap items-center gap-3"><Pill s={detail.row.stage} />{detail.offer && <span className="text-[11px] text-slate-500">Offer {detail.offer.offerNo}: {stageLabel[detail.offer.status] ?? detail.offer.status}, expires {dayFmt(detail.offer.expiresOn)}</span>}</div>
          <dl className="grid gap-x-6 gap-y-2 text-[12px] sm:grid-cols-2">
            {([["Grade", detail.row.grade ?? "—"], ["Date of birth", dayFmt(detail.dob)], ["Parent / Guardian", detail.row.guardianName ?? "—"], ["Mobile", detail.row.phone ?? "—"], ["Email", detail.guardianEmail ?? "—"], ["Submitted", detail.row.stage === "DRAFT" ? "Not yet" : stampFmt(detail.row.submittedAt)]] as [string, string][]).map(([k, v]) => <div key={k} className="flex gap-2"><dt className="w-32 shrink-0 font-semibold text-[#17245e]">{k}</dt><dd className="text-[#4a5a85]">{v}</dd></div>)}
          </dl>
          <div className="flex flex-wrap items-center gap-2 border-t border-[#e3eefc] pt-3">
            {detail.row.stage !== "ADMITTED" && <SmallBtn onClick={() => editApp(detail)}>Edit</SmallBtn>}
            {detail.row.stage === "DRAFT" && <SmallBtn solid onClick={() => void run(() => api.admissions.submitApplication(detail.row.id), "Application submitted.")}>Submit</SmallBtn>}
            {OFFERABLE.includes(detail.row.stage) && detail.row.classId !== null && <SmallBtn solid onClick={() => void openOffer(detail.row.id)}>Create Offer</SmallBtn>}
            {MANUAL.includes(detail.row.stage) || ["SUBMITTED", "UNDER_REVIEW", "DOCUMENTS_PENDING", "ASSESSMENT", "INTERVIEW", "WAITLISTED"].includes(detail.row.stage) ? (
              <label className="flex items-center gap-2 text-[11px] font-semibold text-[#17245e]">Status<select value="" onChange={(e) => { if (e.target.value) void run(() => api.admissions.setStage(detail.row.id, e.target.value), "Status updated."); }} className="rounded border border-[#cfe0f6] px-2 py-1.5 text-[11px]"><option value="">Change…</option>{MANUAL.filter((s) => s !== detail.row.stage).map((s) => <option key={s} value={s}>{stageLabel[s]}</option>)}</select></label>
            ) : null}
            {detail.row.stage === "DRAFT" && <button type="button" onClick={() => { if (window.confirm("Delete this draft?")) void run(() => api.admissions.removeApplication(detail.row.id), "Draft deleted.").then(() => setDetail(null)); }} className="ml-auto inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600"><Trash2 size={13} />Delete draft</button>}
          </div>
          <div className="space-y-2 border-t border-[#e3eefc] pt-3">
            <div className="flex items-center justify-between"><h3 className="text-[13px] font-extrabold text-[#101b69]">Documents</h3>
              <span className="flex items-center gap-2"><select value={docType} onChange={(e) => setDocType(e.target.value)} className="rounded border border-[#cfe0f6] px-2 py-1 text-[11px]">{opts?.docTypes.map((t) => <option key={t.code} value={t.code}>{t.label}</option>)}</select>
                <label className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-blue-400 px-3 py-1.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"><Upload size={12} />Upload<input type="file" accept="application/pdf,image/png,image/jpeg" className="hidden" onChange={(e) => { void uploadMore(detail.row.id, e.target.files?.[0]); e.target.value = ""; }} /></label></span></div>
            {detail.documents.length === 0 ? <p className="text-[12px] text-slate-500">No documents uploaded.</p> : (
              <ul className="divide-y divide-[#eef4fd] text-[12px]">{detail.documents.map((d) => (
                <li key={d.id} className="flex items-center gap-3 py-2"><span className="min-w-0 flex-1 truncate font-medium text-[#17245e]">{d.fileName}<span className="ml-2 font-normal text-slate-500">{opts?.docTypes.find((t) => t.code === d.docType)?.label ?? d.docType} · {kb(d.size)}</span></span>
                  <label className="flex items-center gap-1 text-[11px]"><input type="checkbox" checked={d.verified} onChange={(e) => void run(() => api.admissions.verifyDocument(d.id, e.target.checked), e.target.checked ? "Document verified." : "Verification removed.")} className="h-3.5 w-3.5 accent-blue-600" />Verified</label>
                  <button type="button" aria-label="Download" title="Download" className="text-blue-600" onClick={() => void downloadDoc(d.id, d.fileName)}><Download size={14} /></button>
                  <button type="button" aria-label="Delete document" title="Delete" className="text-rose-500" onClick={() => { if (window.confirm(`Delete ${d.fileName}?`)) void run(() => api.admissions.removeDocument(d.id), "Document removed."); }}><Trash2 size={14} /></button></li>))}</ul>)}
          </div>
        </Modal>
      )}

      {enqForm && (
        <Modal title={enqForm.id ? "Edit Enquiry" : "Add Enquiry"} onClose={() => setEnqForm(null)}>
          <Field label="Parent / Guardian name" required><input value={enqForm.name} onChange={(e) => setEnqForm({ ...enqForm, name: e.target.value })} className={controlClass} />{E("name")}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Mobile" optional><input value={enqForm.phone} onChange={(e) => setEnqForm({ ...enqForm, phone: e.target.value })} className={controlClass} />{E("phone")}</Field>
            <Field label="Email" optional><input type="email" value={enqForm.email} onChange={(e) => setEnqForm({ ...enqForm, email: e.target.value })} className={controlClass} />{E("email")}</Field>
            <Field label="Child's name" optional><input value={enqForm.childName} onChange={(e) => setEnqForm({ ...enqForm, childName: e.target.value })} className={controlClass} /></Field>
            <Field label="Grade" optional><select value={enqForm.grade} onChange={(e) => setEnqForm({ ...enqForm, grade: e.target.value })} className={controlClass}><option value="">Select</option>{gradeNames.map((g) => <option key={g} value={g}>{g}</option>)}</select></Field>
            <Field label="Source" optional><select value={enqForm.source} onChange={(e) => setEnqForm({ ...enqForm, source: e.target.value })} className={controlClass}><option value="">Select</option>{opts?.sources.map((s) => <option key={s.code} value={s.code}>{s.label}</option>)}</select>{E("source")}</Field>
            <Field label="Follow-up date" optional><input type="date" value={enqForm.followUpOn} onChange={(e) => setEnqForm({ ...enqForm, followUpOn: e.target.value })} className={controlClass} />{E("followUpOn")}</Field>
          </div>
          <Field label="Notes" optional><textarea rows={2} value={enqForm.note} onChange={(e) => setEnqForm({ ...enqForm, note: e.target.value })} className={controlClass} /></Field>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setEnqForm(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void saveEnq()} disabled={busy}>Save</PrimaryButton></div>
        </Modal>
      )}

      {offerForm && (
        <Modal title="Create Offer" onClose={() => setOfferForm(null)}>
          <Field label="Application" required><select value={offerForm.applicationId} onChange={(e) => setOfferForm({ ...offerForm, applicationId: e.target.value })} className={controlClass}><option value="">Select an applicant</option>{offerChoices.map((a) => <option key={a.id} value={a.id}>{a.studentName} · {a.grade} · {a.applicationNo}</option>)}{offerForm.applicationId && !offerChoices.some((a) => String(a.id) === offerForm.applicationId) && <option value={offerForm.applicationId}>Selected application</option>}</select>{E("applicationId")}</Field>
          <Field label="Offer expires on" required><input type="date" value={offerForm.expiresOn} min={plusDays(0)} max={plusDays(120)} onChange={(e) => setOfferForm({ ...offerForm, expiresOn: e.target.value })} className={controlClass} />{E("expiresOn")}</Field>
          <Field label="Note" optional><textarea rows={2} value={offerForm.note} onChange={(e) => setOfferForm({ ...offerForm, note: e.target.value })} className={controlClass} /></Field>
          <p className="text-[10px] text-slate-500">Lists the 50 most recent applications that are ready for an offer and have a grade.</p>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setOfferForm(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void saveOffer()} disabled={busy || !offerForm.applicationId}>Create Offer</PrimaryButton></div>
        </Modal>
      )}

      {admitOffer && (
        <Modal title={`Admit ${admitOffer.applicant}`} onClose={() => setAdmitOffer(null)}>
          <Field label="Section" required><select value={sectionId} onChange={(e) => setSectionId(e.target.value)} className={controlClass}><option value="">Select a section</option>{(opts?.sections ?? []).filter((s) => s.classId === admitOffer.classId).map((s) => { const full = s.max !== null && s.enrolled >= s.max; return <option key={s.id} value={s.id} disabled={full}>{s.name} ({s.enrolled}{s.max !== null ? `/${s.max}` : ""} students){full ? " - full" : ""}</option>; })}</select>{E("sectionId")}</Field>
          <p className="text-[10px] text-slate-500">This creates the student record (admission number, name, grade and section) and marks the application as admitted. Date of birth and guardian details stay on the application until the Students module exists.</p>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setAdmitOffer(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void doAdmit()} disabled={busy || !sectionId}>Admit Student</PrimaryButton></div>
        </Modal>
      )}
    </SchoolLayout>
  );
}
