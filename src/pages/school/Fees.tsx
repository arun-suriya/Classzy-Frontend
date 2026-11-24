import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AlertCircle, FileText, IndianRupee, Plus, Printer, Search, X } from "lucide-react";
import { api } from "../../services/api";
import type { FinConcessionPage, FinInvoice, FinInvoiceDetail, FinInvoicePage, FinOptions, FinReceipt, FinRefundPage, FinScholarshipPage, FinStructure, FinStudent, FinStudentPay } from "../../services/api";
import { Field, Notice, OutlineButton, PrimaryButton, controlClass } from "../super-admin/AcademicShared";
import { errText } from "../super-admin/SettingsShared";
import SchoolLayout from "./SchoolLayout";
import { Item, Menu, Modal, Pager, SmallBtn, Table, isoDay, td } from "./SchoolUi";

type Tab = "Fee Collection" | "Fee Structure" | "Concessions" | "Scholarships" | "Refunds";
const TABS: Tab[] = ["Fee Collection", "Fee Structure", "Concessions", "Scholarships", "Refunds"];
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const dFmt = (iso: string | null) => { if (!iso) return "—"; const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); };
const stampFmt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const fieldErrs = (e: unknown) => { const fe = (e as { fieldErrors?: Record<string, string> }).fieldErrors; return fe && Object.keys(fe).length ? fe : null; };
const lbl = "block text-[12px] font-semibold text-[#17245e]";
const ERR = (errs: Record<string, string>, k: string) => (errs[k] ? <p className="mt-1 text-[10px] text-rose-600">{errs[k]}</p> : null);

const TONE: Record<string, [string, string]> = {
  PAID: ["Paid", "bg-emerald-100 text-emerald-700"], OVERDUE: ["Overdue", "bg-rose-100 text-rose-700"], PARTIAL: ["Partial", "bg-sky-100 text-sky-700"], PENDING: ["Pending", "bg-amber-100 text-amber-700"],
  APPROVED: ["Approved", "bg-emerald-100 text-emerald-700"], REJECTED: ["Rejected", "bg-rose-100 text-rose-700"], REFUNDED: ["Refunded", "bg-emerald-100 text-emerald-700"],
  ACTIVE: ["Active", "bg-emerald-100 text-emerald-700"], INACTIVE: ["Inactive", "bg-slate-100 text-slate-500"], EXPIRED: ["Expired", "bg-slate-100 text-slate-500"], REVOKED: ["Revoked", "bg-rose-100 text-rose-700"],
  PENDING_APPROVAL: ["Pending Approval", "bg-amber-100 text-amber-700"],
};
const Pill = ({ s, pendingLabel }: { s: string; pendingLabel?: boolean }) => { const [l, c] = TONE[pendingLabel && s === "PENDING" ? "PENDING_APPROVAL" : s] ?? [s, "bg-slate-100 text-slate-600"]; return <span className={`inline-block whitespace-nowrap rounded-md px-3 py-1 text-[11px] font-semibold ${c}`}>{l}</span>; };

function StudentPicker({ value, onPick, error }: { value: FinStudent | null; onPick: (s: FinStudent | null) => void; error?: string }) {
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<FinStudent[]>([]);
  const [open, setOpen] = useState(false);
  useEffect(() => { if (!open) return; const t = setTimeout(() => { api.finance.students(q).then(setHits).catch(() => setHits([])); }, 250); return () => clearTimeout(t); }, [q, open]);
  if (value) return <div className="flex items-center justify-between rounded-lg border border-[#cfe0f6] bg-[#f8fbff] px-3 py-2 text-[13px]"><span>{value.name} <span className="text-slate-500">· {value.admissionNo}{value.grade ? ` · ${value.grade}${value.section ? ` ${value.section}` : ""}` : ""}</span></span><button type="button" aria-label="Change student" onClick={() => onPick(null)}><X size={14} /></button></div>;
  return (
    <div className="relative">
      <input value={q} onFocus={() => setOpen(true)} onChange={(e) => { setQ(e.target.value); setOpen(true); }} placeholder="Search by name or student ID" className={controlClass} />
      {open && <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-lg border border-[#cfe0f6] bg-white text-[13px] shadow-lg">{hits.length === 0 ? <li className="px-3 py-2 text-slate-500">No active students found.</li> : hits.map((h) => <li key={h.id}><button type="button" className="block w-full px-3 py-2 text-left hover:bg-blue-50" onClick={() => { onPick(h); setOpen(false); setQ(""); }}>{h.name} <span className="text-slate-500">· {h.admissionNo}{h.grade ? ` · ${h.grade}${h.section ? ` ${h.section}` : ""}` : ""}</span></button></li>)}</ul>}
      {error && <p className="mt-1 text-[10px] text-rose-600">{error}</p>}
    </div>
  );
}

function ReceiptModal({ r, onClose }: { r: FinReceipt; onClose: () => void }) {
  const rows: [string, string][] = [["Receipt No.", r.receiptNo], ["Date", dFmt(r.paidOn)], ["Student", `${r.student} (${r.admissionNo})`], ["Class", r.grade ? `${r.grade}${r.section ? ` ${r.section}` : ""}` : "—"], ["Invoice", `${r.invoiceNo} · ${r.feeType}`], ["Mode", `${r.mode}${r.reference ? ` · Ref ${r.reference}` : ""}`], ["Received by", r.receivedBy ?? "—"]];
  return (
    <Modal title="Receipt" onClose={onClose}>
      <style>{"@media print { body * { visibility: hidden !important; } #receipt-print, #receipt-print * { visibility: visible !important; } #receipt-print { position: fixed; left: 0; top: 0; width: 100%; padding: 24px; } }"}</style>
      <div id="receipt-print" className="space-y-3 text-[13px] text-[#17245e]">
        <div className="text-center"><p className="text-[16px] font-extrabold">{r.school}</p><p className="text-[12px] font-semibold tracking-wide text-slate-500">FEE RECEIPT</p></div>
        <dl className="space-y-1.5">{rows.map(([k, v]) => <div key={k} className="flex gap-3"><dt className="w-28 shrink-0 font-semibold">{k}</dt><dd className="min-w-0 break-words text-[#4a5a85]">{v}</dd></div>)}</dl>
        <div className="flex items-center justify-between rounded-lg bg-[#eef5fe] px-4 py-3"><span className="font-semibold">Amount received</span><span className="text-[18px] font-extrabold text-[#101b69]">{inr(r.amount)}</span></div>
        <p className="text-[12px] text-slate-500">Balance remaining on this invoice: {inr(r.balance)}</p>
        {r.notes && <p className="text-[12px] text-slate-500">Notes: {r.notes}</p>}
        <p className="pt-2 text-center text-[10px] text-slate-400">This is a computer-generated receipt.</p>
      </div>
      <div className="flex justify-end gap-2"><OutlineButton onClick={onClose}>Close</OutlineButton><PrimaryButton onClick={() => window.print()}><Printer size={14} className="mr-1.5 inline" />Print</PrimaryButton></div>
    </Modal>
  );
}

interface P { opts: FinOptions; yearId: number | null; onError: (m: string) => void; flash: (m: string) => void; showReceipt: (r: FinReceipt) => void }

// ---------------------------------------------------------------- Fee Collection
function CollectionTab({ opts, yearId, onError, flash, showReceipt }: P) {
  const terms = opts.terms.filter((t) => t.yearId === yearId);
  const classes = opts.classes.filter((c) => c.yearId === yearId);
  const [termId, setTermId] = useState("");
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [qLive, setQLive] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<FinInvoicePage | null>(null);
  const [detail, setDetail] = useState<FinInvoiceDetail | null>(null);
  const [pay, setPay] = useState<{ student: FinStudent | null; invoices: FinInvoice[]; invoiceId: string; amount: string; paidOn: string; mode: string; reference: string; notes: string } | null>(null);
  const [gen, setGen] = useState<{ classId: string; termId: string; dueDate: string } | null>(null);
  const [refund, setRefund] = useState<{ paymentId: number; receipt: string; max: number; amount: string; reason: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  useEffect(() => { const t = setTimeout(() => { setQ(qLive); setPage(0); }, 300); return () => clearTimeout(t); }, [qLive]);
  const load = useCallback(async () => {
    if (yearId === null) return;
    try { setData(await api.finance.invoices({ yearId, termId: termId ? Number(termId) : null, classId: classId ? Number(classId) : null, status: status || undefined, q: q || undefined }, page)); } catch (e) { onError(errText(e)); }
  }, [yearId, termId, classId, status, q, page, onError]);
  useEffect(() => { void load(); }, [load]);

  const openPay = async (student?: FinStudent | null, invoiceId?: number) => {
    setErrs({});
    const base = { student: student ?? null, invoices: [] as FinInvoice[], invoiceId: invoiceId ? String(invoiceId) : "", amount: "", paidOn: isoDay(new Date()), mode: "CASH", reference: "", notes: "" };
    if (student) { try { const inv = await api.finance.openInvoices(student.id); const pick = inv.find((x) => x.id === invoiceId); setPay({ ...base, invoices: inv, amount: pick ? String(pick.balance) : "" }); } catch (e) { onError(errText(e)); } } else setPay(base);
  };
  const pickStudent = async (s: FinStudent | null) => {
    if (!pay) return;
    if (!s) { setPay({ ...pay, student: null, invoices: [], invoiceId: "", amount: "" }); return; }
    try { const inv = await api.finance.openInvoices(s.id); setPay({ ...pay, student: s, invoices: inv, invoiceId: inv.length === 1 ? String(inv[0].id) : "", amount: inv.length === 1 ? String(inv[0].balance) : "" }); } catch (e) { onError(errText(e)); }
  };
  const savePay = async () => {
    if (!pay) return; setBusy(true); setErrs({});
    try {
      const r = await api.finance.pay({ invoiceId: pay.invoiceId ? Number(pay.invoiceId) : null, amount: pay.amount ? Number(pay.amount) : null, paidOn: pay.paidOn, mode: pay.mode, reference: pay.reference, notes: pay.notes });
      setPay(null); setDetail(null); showReceipt(r); await load();
    } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const openDetail = async (id: number) => { try { setDetail(await api.finance.invoice(id)); } catch (e) { onError(errText(e)); } };
  const saveGen = async () => {
    if (!gen) return; setBusy(true); setErrs({});
    try {
      const r = await api.finance.generate({ yearId, classId: gen.classId ? Number(gen.classId) : null, termId: gen.termId ? Number(gen.termId) : null, dueDate: gen.dueDate });
      setGen(null);
      flash(`${r.created} invoice(s) created for ${r.students} student(s). ${r.existing} already existed.${r.termFeesSkipped ? ` ${r.termFeesSkipped} term fee head(s) skipped: choose a term to bill them.` : ""}`);
      await load();
    } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const saveRefund = async () => {
    if (!refund) return; setBusy(true); setErrs({});
    try { await api.finance.requestRefund({ paymentId: refund.paymentId, amount: refund.amount ? Number(refund.amount) : null, reason: refund.reason }); setRefund(null); flash("Refund requested. Approve it on the Refunds tab."); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const chosen = pay?.invoices.find((x) => String(x.id) === pay.invoiceId);
  const kpi = (icon: ReactNode, tone: string, label: string, v: number | undefined) => <div className="flex items-center gap-4 rounded-xl border border-[#d8e9fb] bg-white px-5 py-4"><span className={`grid h-12 w-12 place-items-center rounded-lg ${tone}`}>{icon}</span><div><p className="text-[13px] font-bold text-[#101b69]">{label}</p><p className="text-[22px] font-extrabold text-[#101b69]">{v === undefined ? "—" : inr(v)}</p></div></div>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className={lbl}>Term<select value={termId} onChange={(e) => { setTermId(e.target.value); setPage(0); }} className={`${controlClass} mt-1 min-w-[170px]`}><option value="">All terms</option>{terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>
          <label className={lbl}>Grade<select value={classId} onChange={(e) => { setClassId(e.target.value); setPage(0); }} className={`${controlClass} mt-1 min-w-[130px]`}><option value="">All</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className={lbl}>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className={`${controlClass} mt-1 min-w-[120px]`}><option value="">All</option><option value="PAID">Paid</option><option value="PARTIAL">Partial</option><option value="PENDING">Pending</option><option value="OVERDUE">Overdue</option></select></label>
          <label className="relative block min-w-[200px] text-[12px] font-semibold text-[#17245e]">Search<Search size={14} className="absolute left-3 top-[34px] text-blue-500" /><input value={qLive} onChange={(e) => setQLive(e.target.value)} placeholder="Student or invoice no." className={`${controlClass} mt-1 pl-8`} /></label>
        </div>
        <div className="flex gap-2"><OutlineButton onClick={() => { setErrs({}); setGen({ classId, termId, dueDate: isoDay(new Date(Date.now() + 15 * 864e5)) }); }}>Generate Invoices</OutlineButton><PrimaryButton onClick={() => void openPay()}>Record Payment</PrimaryButton></div>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        {kpi(<FileText size={22} className="text-blue-600" />, "bg-blue-50", "Billed", data?.billed)}
        {kpi(<IndianRupee size={22} className="text-emerald-600" />, "bg-emerald-50", "Collected", data?.collected)}
        {kpi(<AlertCircle size={22} className="text-rose-600" />, "bg-rose-50", "Outstanding", data?.outstanding)}
      </div>
      <Table heads={["Student", "Fee Type", "Balance", "Due Date", "Status"]} colSpan={5} empty={data && data.items.length === 0 ? "No invoices match. Add fee heads on the Fee Structure tab, then use Generate Invoices." : undefined}>
        {data?.items.map((r) => (
          <tr key={r.id} onClick={() => void openDetail(r.id)} className="cursor-pointer hover:bg-[#f5f9ff]"><td className={`${td} font-medium`}>{r.student}<span className="block text-[10px] font-normal text-slate-500">{r.admissionNo}{r.grade ? ` · ${r.grade}` : ""}</span></td><td className={td}>{r.feeType}{r.term ? <span className="block text-[10px] text-slate-500">{r.term}</span> : null}</td><td className={td}>{inr(Math.max(0, r.balance))}</td><td className={td}>{dFmt(r.dueDate)}</td><td className={td}><Pill s={r.status} /></td></tr>
        ))}
        {!data && <tr><td colSpan={5} className="px-4 py-10 text-center text-[12px] text-slate-500">Loading…</td></tr>}
      </Table>
      {data && <Pager page={data.page} size={data.size} total={data.total} set={setPage} />}

      {pay && (
        <Modal title="Record Payment" wide onClose={() => setPay(null)}>
          <div className="grid gap-4 md:grid-cols-2">
            <fieldset className="space-y-3 rounded-lg border border-[#cfe0f6] p-4"><legend className="px-1 text-[14px] font-extrabold text-[#101b69]">Student &amp; Invoice</legend>
              <Field label="Student" required><StudentPicker value={pay.student} onPick={(s) => void pickStudent(s)} /></Field>
              <Field label="Invoice No." required><select value={pay.invoiceId} onChange={(e) => { const inv = pay.invoices.find((x) => String(x.id) === e.target.value); setPay({ ...pay, invoiceId: e.target.value, amount: inv ? String(inv.balance) : "" }); }} className={controlClass} disabled={!pay.student}><option value="">{pay.student ? (pay.invoices.length ? "Select" : "No unpaid invoices") : "Choose a student first"}</option>{pay.invoices.map((x) => <option key={x.id} value={x.id}>{x.invoiceNo} · {x.feeType} · due {inr(x.balance)}</option>)}</select>{ERR(errs, "invoiceId")}</Field>
            </fieldset>
            <fieldset className="space-y-3 rounded-lg border border-[#cfe0f6] p-4"><legend className="px-1 text-[14px] font-extrabold text-[#101b69]">Payment</legend>
              <Field label="Amount" required><input type="number" min={0} step="0.01" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} className={controlClass} />{chosen && <p className="mt-1 text-[10px] text-slate-500">Balance on this invoice: {inr(chosen.balance)}</p>}{ERR(errs, "amount")}</Field>
              <Field label="Payment Date" required><input type="date" max={isoDay(new Date())} value={pay.paidOn} onChange={(e) => setPay({ ...pay, paidOn: e.target.value })} className={controlClass} />{ERR(errs, "paidOn")}</Field>
              <Field label="Mode" required><select value={pay.mode} onChange={(e) => setPay({ ...pay, mode: e.target.value })} className={controlClass}>{opts.modes.map((m) => <option key={m.code} value={m.code}>{m.label}</option>)}</select>{ERR(errs, "mode")}</Field>
              <Field label="Reference No." optional><input value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} className={controlClass} /></Field>
            </fieldset>
          </div>
          <Field label="Notes" optional><textarea rows={2} value={pay.notes} onChange={(e) => setPay({ ...pay, notes: e.target.value })} className={controlClass} /></Field>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setPay(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void savePay()} disabled={busy || !pay.invoiceId}>{busy ? "Saving…" : "Save & Generate Receipt"}</PrimaryButton></div>
          <p className="text-[10px] text-slate-500">This records a payment taken at the school. There's no online payment gateway, and nothing is sent to the parent.</p>
        </Modal>
      )}

      {detail && (
        <Modal title={`${detail.row.invoiceNo} · ${detail.row.feeType}`} wide onClose={() => setDetail(null)}>
          <div className="flex flex-wrap items-center gap-3"><Pill s={detail.row.status} /><span className="text-[12px] text-slate-500">{detail.row.student} ({detail.row.admissionNo}){detail.row.grade ? ` · ${detail.row.grade}` : ""} · due {dFmt(detail.row.dueDate)}</span></div>
          <dl className="grid gap-2 text-[13px] sm:grid-cols-5">{([["Fee", detail.row.amount], ["Concession", -detail.concession], ["Scholarship", -detail.scholarship], ["Paid", detail.row.paid], ["Balance", detail.row.balance]] as [string, number][]).map(([k, v]) => <div key={k} className="rounded-lg bg-[#f5f9ff] px-3 py-2"><dt className="text-[10px] font-semibold uppercase text-slate-500">{k}</dt><dd className="font-bold text-[#101b69]">{v < 0 ? `−${inr(-v)}` : inr(v)}</dd></div>)}</dl>
          <h3 className="text-[13px] font-extrabold text-[#101b69]">Payments</h3>
          {detail.payments.length === 0 ? <p className="text-[12px] text-slate-500">No payments yet.</p> : (
            <ul className="divide-y divide-[#eef4fd] text-[12px]">{detail.payments.map((p) => <li key={p.id} className="flex flex-wrap items-center gap-3 py-2"><span className="w-24 font-medium">{p.receiptNo}</span><span className="w-24">{dFmt(p.paidOn)}</span><span className="w-24 font-semibold">{inr(p.amount)}</span><span className="flex-1 text-slate-500">{p.mode}{p.reference ? ` · ${p.reference}` : ""}</span>
              <SmallBtn onClick={() => { void api.finance.receipt(p.id).then(showReceipt).catch((e) => onError(errText(e))); }}>Receipt</SmallBtn>
              {p.refundable > 0 && <SmallBtn onClick={() => { setErrs({}); setRefund({ paymentId: p.id, receipt: p.receiptNo, max: p.refundable, amount: "", reason: "" }); }}>Refund</SmallBtn>}</li>)}</ul>)}
          <div className="flex justify-end">{detail.row.balance > 0 && <PrimaryButton onClick={() => { const r = detail.row; setDetail(null); void openPay({ id: r.studentId, admissionNo: r.admissionNo, name: r.student, grade: r.grade, section: null }, r.id); }}>Record Payment</PrimaryButton>}</div>
        </Modal>
      )}

      {refund && (
        <Modal title={`Request refund · ${refund.receipt}`} onClose={() => setRefund(null)}>
          <Field label="Amount" required><input type="number" min={0} step="0.01" value={refund.amount} onChange={(e) => setRefund({ ...refund, amount: e.target.value })} className={controlClass} /><p className="mt-1 text-[10px] text-slate-500">Up to {inr(refund.max)}</p>{ERR(errs, "amount")}</Field>
          <Field label="Reason" required><textarea rows={2} value={refund.reason} onChange={(e) => setRefund({ ...refund, reason: e.target.value })} className={controlClass} />{ERR(errs, "reason")}</Field>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setRefund(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void saveRefund()} disabled={busy}>Request Refund</PrimaryButton></div>
        </Modal>
      )}

      {gen && (
        <Modal title="Generate Invoices" onClose={() => setGen(null)}>
          <p className="text-[12px] text-slate-600">Bills every active student for each active fee head in the Fee Structure. Anyone already billed for a fee head (and term) is skipped, so it's safe to run again.</p>
          <Field label="Grade" optional><select value={gen.classId} onChange={(e) => setGen({ ...gen, classId: e.target.value })} className={controlClass}><option value="">All grades</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{ERR(errs, "classId")}</Field>
          <Field label="Term" optional><select value={gen.termId} onChange={(e) => setGen({ ...gen, termId: e.target.value })} className={controlClass}><option value="">No term (skip term fees)</option>{terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select><p className="mt-1 text-[10px] text-slate-500">Term fee heads are only billed when a term is chosen. Yearly and one-time heads are billed regardless.</p>{ERR(errs, "termId")}</Field>
          <Field label="Due date" required><input type="date" value={gen.dueDate} onChange={(e) => setGen({ ...gen, dueDate: e.target.value })} className={controlClass} />{ERR(errs, "dueDate")}{ERR(errs, "yearId")}</Field>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setGen(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void saveGen()} disabled={busy}>{busy ? "Generating…" : "Generate"}</PrimaryButton></div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Fee Structure
function StructureTab({ opts, yearId, onError, flash }: P) {
  const classes = opts.classes.filter((c) => c.yearId === yearId);
  const [classId, setClassId] = useState("");
  const [rows, setRows] = useState<FinStructure[] | null>(null);
  const [form, setForm] = useState<{ id: number | null; classId: string; feeHead: string; frequency: string; amount: string; active: boolean } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);

  const load = useCallback(async () => { if (yearId === null) return; try { setRows(await api.finance.structures({ yearId, classId: classId ? Number(classId) : null })); } catch (e) { onError(errText(e)); } }, [yearId, classId, onError]);
  useEffect(() => { void load(); }, [load]);

  const open = (r?: FinStructure) => { setErrs({}); setForm(r ? { id: r.id, classId: String(r.classId), feeHead: r.feeHead, frequency: r.frequency, amount: String(r.amount), active: r.active } : { id: null, classId: classId || (classes[0] ? String(classes[0].id) : ""), feeHead: "", frequency: "TERM", amount: "", active: true }); };
  const save = async () => {
    if (!form) return; setBusy(true); setErrs({});
    const body = { yearId, classId: form.classId ? Number(form.classId) : null, feeHead: form.feeHead, frequency: form.frequency, amount: form.amount ? Number(form.amount) : null, active: form.active };
    try { if (form.id) await api.finance.updateStructure(form.id, body); else await api.finance.addStructure(body); setForm(null); flash("Fee structure saved."); await load(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const toggle = async (r: FinStructure) => { try { await api.finance.updateStructure(r.id, { yearId: r.yearId, classId: r.classId, feeHead: r.feeHead, frequency: r.frequency, amount: r.amount, active: !r.active }); await load(); } catch (e) { onError(errText(e)); } };
  const remove = async (r: FinStructure) => { if (!window.confirm(`Delete ${r.feeHead} for ${r.grade}?`)) return; try { await api.finance.removeStructure(r.id); flash("Fee head deleted."); await load(); } catch (e) { onError(errText(e)); } };
  const freq = (c: string) => opts.frequencies.find((f) => f.code === c)?.label ?? c;

  return (
    <div className="space-y-4" onClick={() => setMenu(null)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className={lbl}>Grade<select value={classId} onChange={(e) => setClassId(e.target.value)} className={`${controlClass} mt-1 min-w-[170px]`}><option value="">All grades</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <button type="button" onClick={() => open()} className="inline-flex items-center gap-2 rounded-lg bg-[#0875fb] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700"><Plus size={15} />Add Fee Structure</button>
      </div>
      <Table heads={["Fee Head", "Grade", "Frequency", "Amount", "Status", ""]} colSpan={6} empty={rows && rows.length === 0 ? "No fee heads yet for this year." : undefined}>
        {rows?.map((r) => <tr key={r.id}><td className={`${td} font-medium`}>{r.feeHead}</td><td className={td}>{r.grade}</td><td className={td}>{freq(r.frequency)}</td><td className={td}>{inr(r.amount)}</td><td className={td}><Pill s={r.active ? "ACTIVE" : "INACTIVE"} /></td>
          <td className={`${td} text-right`}><Menu id={`s${r.id}`} open={menu} setOpen={setMenu}><Item onClick={() => open(r)}>Edit</Item><Item onClick={() => void toggle(r)}>{r.active ? "Set inactive" : "Set active"}</Item><Item danger onClick={() => void remove(r)}>Delete</Item></Menu></td></tr>)}
      </Table>
      <p className="text-[10px] text-slate-500">Changing an amount here doesn't change invoices that were already generated.</p>
      {form && (
        <Modal title={form.id ? "Edit Fee Structure" : "Add Fee Structure"} onClose={() => setForm(null)}>
          <Field label="Grade" required><select value={form.classId} onChange={(e) => setForm({ ...form, classId: e.target.value })} className={controlClass}><option value="">Select</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select>{ERR(errs, "classId")}</Field>
          <Field label="Fee Head" required><input value={form.feeHead} onChange={(e) => setForm({ ...form, feeHead: e.target.value })} placeholder="e.g. Tuition Fee" className={controlClass} />{ERR(errs, "feeHead")}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Frequency" required><select value={form.frequency} onChange={(e) => setForm({ ...form, frequency: e.target.value })} className={controlClass}>{opts.frequencies.map((f) => <option key={f.code} value={f.code}>{f.label}</option>)}</select>{ERR(errs, "frequency")}</Field>
            <Field label="Amount (₹)" required><input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={controlClass} />{ERR(errs, "amount")}</Field>
          </div>
          <label className="flex items-center gap-2 text-[13px]"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} className="h-4 w-4 accent-blue-600" />Active (included when generating invoices)</label>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setForm(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void save()} disabled={busy}>Save</PrimaryButton></div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Concessions
function ConcessionsTab({ opts, yearId, onError, flash }: P) {
  const classes = opts.classes.filter((c) => c.yearId === yearId);
  const [classId, setClassId] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<FinConcessionPage | null>(null);
  const [form, setForm] = useState<{ student: FinStudent | null; invoices: FinInvoice[]; invoiceId: string; percent: string; reason: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);

  const load = useCallback(async () => { try { setData(await api.finance.concessions({ classId: classId ? Number(classId) : null, status: status || undefined }, page)); } catch (e) { onError(errText(e)); } }, [classId, status, page, onError]);
  useEffect(() => { void load(); }, [load]);

  const pick = async (s: FinStudent | null) => { if (!form) return; if (!s) { setForm({ ...form, student: null, invoices: [], invoiceId: "" }); return; } try { const inv = await api.finance.openInvoices(s.id); setForm({ ...form, student: s, invoices: inv, invoiceId: inv.length === 1 ? String(inv[0].id) : "" }); } catch (e) { onError(errText(e)); } };
  const save = async () => {
    if (!form) return; setBusy(true); setErrs({});
    try { await api.finance.requestConcession({ invoiceId: form.invoiceId ? Number(form.invoiceId) : null, percent: form.percent ? Number(form.percent) : null, reason: form.reason }); setForm(null); flash("Concession requested."); await load(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const decide = async (id: number, approve: boolean) => { try { await api.finance.decideConcession(id, approve); flash(approve ? "Concession approved." : "Concession rejected."); await load(); } catch (e) { onError(errText(e)); } };
  const withdraw = async (id: number) => { if (!window.confirm("Withdraw this request?")) return; try { await api.finance.withdrawConcession(id); await load(); } catch (e) { onError(errText(e)); } };

  return (
    <div className="space-y-4" onClick={() => setMenu(null)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex gap-3">
          <label className={lbl}>Grade<select value={classId} onChange={(e) => { setClassId(e.target.value); setPage(0); }} className={`${controlClass} mt-1 min-w-[150px]`}><option value="">All</option>{classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
          <label className={lbl}>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className={`${controlClass} mt-1 min-w-[150px]`}><option value="">All</option><option value="PENDING">Pending Approval</option><option value="APPROVED">Approved</option><option value="REJECTED">Rejected</option></select></label>
        </div>
        <button type="button" onClick={() => { setErrs({}); setForm({ student: null, invoices: [], invoiceId: "", percent: "", reason: "" }); }} className="inline-flex items-center gap-2 rounded-lg bg-[#0875fb] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700"><Plus size={15} />Request Concession</button>
      </div>
      <Table heads={["Student", "Fee Head", "Discount", "Reason", "Status", ""]} colSpan={6} empty={data && data.items.length === 0 ? "No concession requests." : undefined}>
        {data?.items.map((c) => <tr key={c.id}><td className={`${td} font-medium`}>{c.student}<span className="block text-[10px] font-normal text-slate-500">{c.admissionNo}{c.grade ? ` · ${c.grade}` : ""}</span></td><td className={td}>{c.feeHead ?? "—"}</td><td className={td}>{c.percent !== null ? `${c.percent}%` : inr(c.amount)}<span className="block text-[10px] text-slate-500">{inr(c.amount)}</span></td><td className={td}>{c.reason ?? "—"}</td><td className={td}><Pill s={c.status} pendingLabel /></td>
          <td className={td}>{c.status === "PENDING" && <span className="flex items-center gap-2"><SmallBtn solid onClick={() => void decide(c.id, true)}>Approve</SmallBtn><SmallBtn onClick={() => void decide(c.id, false)}>Reject</SmallBtn><Menu id={`c${c.id}`} open={menu} setOpen={setMenu}><Item danger onClick={() => void withdraw(c.id)}>Withdraw request</Item></Menu></span>}</td></tr>)}
      </Table>
      {data && <Pager page={data.page} size={data.size} total={data.total} set={setPage} />}
      <p className="text-[10px] text-slate-500">An approved concession lowers that invoice's balance right away. Any admin of the school can approve; there's no separate approver role yet.</p>
      {form && (
        <Modal title="Request Concession" onClose={() => setForm(null)}>
          <Field label="Student" required><StudentPicker value={form.student} onPick={(s) => void pick(s)} /></Field>
          <Field label="Fee Head" required><select value={form.invoiceId} onChange={(e) => setForm({ ...form, invoiceId: e.target.value })} disabled={!form.student} className={controlClass}><option value="">{form.student ? (form.invoices.length ? "Select" : "No unpaid invoices") : "Choose a student first"}</option>{form.invoices.map((x) => <option key={x.id} value={x.id}>{x.feeType}{x.term ? ` (${x.term})` : ""} · {x.invoiceNo} · {inr(x.amount)}</option>)}</select>{ERR(errs, "invoiceId")}</Field>
          <Field label="Discount (%)" required><input type="number" min={1} max={100} value={form.percent} onChange={(e) => setForm({ ...form, percent: e.target.value })} className={controlClass} />{ERR(errs, "percent")}</Field>
          <Field label="Reason" required><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} placeholder="e.g. Sibling concession" className={controlClass} />{ERR(errs, "reason")}</Field>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setForm(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void save()} disabled={busy}>Request</PrimaryButton></div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Scholarships
function ScholarshipsTab({ opts, yearId, onError, flash }: P) {
  const terms = opts.terms.filter((t) => t.yearId === yearId);
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<FinScholarshipPage | null>(null);
  const [form, setForm] = useState<{ student: FinStudent | null; name: string; amount: string; validity: string; termId: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<string | null>(null);

  const load = useCallback(async () => { if (yearId === null) return; try { setData(await api.finance.scholarships({ yearId, status: status || undefined }, page)); } catch (e) { onError(errText(e)); } }, [yearId, status, page, onError]);
  useEffect(() => { void load(); }, [load]);

  const save = async () => {
    if (!form) return; setBusy(true); setErrs({});
    try {
      const r = await api.finance.award({ studentId: form.student?.id ?? null, yearId, termId: form.validity === "TERM" && form.termId ? Number(form.termId) : null, name: form.name, amount: form.amount ? Number(form.amount) : null, validity: form.validity });
      setForm(null); flash(r.unapplied > 0 ? `Scholarship awarded. ${inr(r.applied)} was taken off current invoices; ${inr(r.unapplied)} is not applied yet (no unpaid invoices to cover it).` : "Scholarship awarded and applied to the student's invoices."); await load();
    } catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const revoke = async (id: number) => { if (!window.confirm("Revoke this scholarship? The discounted amounts become due again.")) return; try { await api.finance.revokeScholarship(id); flash("Scholarship revoked."); await load(); } catch (e) { onError(errText(e)); } };

  return (
    <div className="space-y-4" onClick={() => setMenu(null)}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <label className={lbl}>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className={`${controlClass} mt-1 min-w-[150px]`}><option value="">All</option><option value="ACTIVE">Active</option><option value="EXPIRED">Expired</option><option value="REVOKED">Revoked</option></select></label>
        <button type="button" onClick={() => { setErrs({}); setForm({ student: null, name: "", amount: "", validity: "YEARLY", termId: "" }); }} className="inline-flex items-center gap-2 rounded-lg bg-[#0875fb] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700"><Plus size={15} />Award Scholarship</button>
      </div>
      <Table heads={["Student", "Scholarship", "Award", "Validity", "Status", ""]} colSpan={6} empty={data && data.items.length === 0 ? "No scholarships for this year." : undefined}>
        {data?.items.map((s) => <tr key={s.id}><td className={`${td} font-medium`}>{s.student}<span className="block text-[10px] font-normal text-slate-500">{s.admissionNo}</span></td><td className={td}>{s.name}</td><td className={td}>{inr(s.award)}{s.status === "ACTIVE" && s.applied < s.award && <span className="block text-[10px] text-amber-600">{inr(s.award - s.applied)} not applied yet</span>}</td><td className={td}>{s.validity}</td><td className={td}><Pill s={s.status} /></td>
          <td className={`${td} text-right`}>{s.status !== "REVOKED" && <Menu id={`k${s.id}`} open={menu} setOpen={setMenu}><Item danger onClick={() => void revoke(s.id)}>Revoke</Item></Menu>}</td></tr>)}
      </Table>
      {data && <Pager page={data.page} size={data.size} total={data.total} set={setPage} />}
      <p className="text-[10px] text-slate-500">An award is taken off the student's unpaid invoices for the period, earliest due date first. Invoices generated later pick up any unapplied amount.</p>
      {form && (
        <Modal title="Award Scholarship" onClose={() => setForm(null)}>
          <Field label="Student" required><StudentPicker value={form.student} onPick={(s) => setForm({ ...form, student: s })} error={errs.studentId} /></Field>
          <Field label="Scholarship" required><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Merit Award" className={controlClass} />{ERR(errs, "name")}</Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Award (₹)" required><input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={controlClass} />{ERR(errs, "amount")}</Field>
            <Field label="Validity" required><select value={form.validity} onChange={(e) => setForm({ ...form, validity: e.target.value })} className={controlClass}><option value="YEARLY">Yearly</option><option value="TERM">One term</option></select>{ERR(errs, "validity")}</Field>
          </div>
          {form.validity === "TERM" && <Field label="Term" required><select value={form.termId} onChange={(e) => setForm({ ...form, termId: e.target.value })} className={controlClass}><option value="">Select</option>{terms.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select>{ERR(errs, "termId")}</Field>}
          {ERR(errs, "yearId")}
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setForm(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void save()} disabled={busy}>Award</PrimaryButton></div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Refunds
function RefundsTab({ onError, flash }: P) {
  const today = new Date();
  const [from, setFrom] = useState(isoDay(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(isoDay(today));
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [data, setData] = useState<FinRefundPage | null>(null);
  const [form, setForm] = useState<{ student: FinStudent | null; pays: FinStudentPay[]; paymentId: string; amount: string; reason: string } | null>(null);
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => { try { setData(await api.finance.refunds({ from: from || undefined, to: to || undefined, status: status || undefined }, page)); } catch (e) { onError(errText(e)); } }, [from, to, status, page, onError]);
  useEffect(() => { void load(); }, [load]);

  const pick = async (s: FinStudent | null) => { if (!form) return; if (!s) { setForm({ ...form, student: null, pays: [], paymentId: "" }); return; } try { const p = await api.finance.studentPayments(s.id); setForm({ ...form, student: s, pays: p.filter((x) => x.refundable > 0), paymentId: "" }); } catch (e) { onError(errText(e)); } };
  const save = async () => {
    if (!form) return; setBusy(true); setErrs({});
    try { await api.finance.requestRefund({ paymentId: form.paymentId ? Number(form.paymentId) : null, amount: form.amount ? Number(form.amount) : null, reason: form.reason }); setForm(null); flash("Refund requested."); await load(); }
    catch (e) { const fe = fieldErrs(e); if (fe) setErrs(fe); else onError(errText(e)); } finally { setBusy(false); }
  };
  const decide = async (id: number, approve: boolean) => { try { await api.finance.decideRefund(id, approve); flash(approve ? "Marked as refunded." : "Refund rejected."); await load(); } catch (e) { onError(errText(e)); } };
  const chosen = form?.pays.find((p) => String(p.paymentId) === form.paymentId);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-wrap items-end gap-3">
          <label className={lbl}>From<input type="date" value={from} onChange={(e) => { setFrom(e.target.value); setPage(0); }} className={`${controlClass} mt-1`} /></label>
          <label className={lbl}>To<input type="date" value={to} onChange={(e) => { setTo(e.target.value); setPage(0); }} className={`${controlClass} mt-1`} /></label>
          <label className={lbl}>Status<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(0); }} className={`${controlClass} mt-1 min-w-[150px]`}><option value="">All</option><option value="PENDING">Pending Approval</option><option value="REFUNDED">Refunded</option><option value="REJECTED">Rejected</option></select></label>
        </div>
        <button type="button" onClick={() => { setErrs({}); setForm({ student: null, pays: [], paymentId: "", amount: "", reason: "" }); }} className="inline-flex items-center gap-2 rounded-lg bg-[#0875fb] px-5 py-2.5 text-[13px] font-semibold text-white hover:bg-blue-700"><Plus size={15} />Request Refund</button>
      </div>
      <Table heads={["Refund ID", "Student", "Receipt No.", "Amount", "Status", ""]} colSpan={6} empty={data && data.items.length === 0 ? "No refunds in this date range." : undefined}>
        {data?.items.map((r) => <tr key={r.id}><td className={`${td} font-medium`}>{r.refundNo}<span className="block text-[10px] font-normal text-slate-500">{stampFmt(r.requestedAt)}</span></td><td className={td}>{r.student}<span className="block text-[10px] text-slate-500">{r.admissionNo}</span></td><td className={td}>{r.receiptNo}</td><td className={td}>{inr(r.amount)}{r.reason && <span className="block text-[10px] text-slate-500">{r.reason}</span>}</td><td className={td}><Pill s={r.status} pendingLabel /></td>
          <td className={td}>{r.status === "PENDING" && <span className="flex gap-2"><SmallBtn solid onClick={() => void decide(r.id, true)}>Mark Refunded</SmallBtn><SmallBtn onClick={() => void decide(r.id, false)}>Reject</SmallBtn></span>}</td></tr>)}
      </Table>
      {data && <Pager page={data.page} size={data.size} total={data.total} set={setPage} />}
      <p className="text-[10px] text-slate-500">"Refunded" records that you returned the money; nothing is paid out from here. A refund lowers what the student has paid, so that invoice's balance goes back up by the same amount.</p>
      {form && (
        <Modal title="Request Refund" onClose={() => setForm(null)}>
          <Field label="Student" required><StudentPicker value={form.student} onPick={(s) => void pick(s)} /></Field>
          <Field label="Receipt" required><select value={form.paymentId} onChange={(e) => { const p = form.pays.find((x) => String(x.paymentId) === e.target.value); setForm({ ...form, paymentId: e.target.value, amount: p ? String(p.refundable) : "" }); }} disabled={!form.student} className={controlClass}><option value="">{form.student ? (form.pays.length ? "Select" : "No refundable receipts") : "Choose a student first"}</option>{form.pays.map((p) => <option key={p.paymentId} value={p.paymentId}>{p.receiptNo} · {p.feeType} · {inr(p.amount)}</option>)}</select>{ERR(errs, "paymentId")}</Field>
          <Field label="Amount (₹)" required><input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className={controlClass} />{chosen && <p className="mt-1 text-[10px] text-slate-500">Up to {inr(chosen.refundable)}</p>}{ERR(errs, "amount")}</Field>
          <Field label="Reason" required><textarea rows={2} value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className={controlClass} />{ERR(errs, "reason")}</Field>
          <div className="flex justify-end gap-2"><OutlineButton onClick={() => setForm(null)}>Cancel</OutlineButton><PrimaryButton onClick={() => void save()} disabled={busy}>Request</PrimaryButton></div>
        </Modal>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- page
export default function Fees() {
  const [tab, setTab] = useState<Tab>("Fee Collection");
  const [opts, setOpts] = useState<FinOptions | null>(null);
  const [yearId, setYearId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [receipt, setReceipt] = useState<FinReceipt | null>(null);

  useEffect(() => { api.finance.options().then((o) => { setOpts(o); setYearId(o.years.find((y) => y.current)?.id ?? o.years[0]?.id ?? null); }).catch((e) => setError(errText(e))); }, []);
  const flash = useCallback((m: string) => { setNotice(m); setError(""); setTimeout(() => setNotice(""), 6000); }, []);
  const onError = useCallback((m: string) => setError(m), []);
  const props = opts ? { opts, yearId, onError, flash, showReceipt: setReceipt } : null;

  return (
    <SchoolLayout>
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-[28px] font-extrabold tracking-[-0.5px] text-[#101b69]">Fees &amp; Finance</h1>
          {opts && opts.years.length > 0 && <label className="flex items-center gap-2 text-[12px] font-semibold text-[#17245e]">Academic Year<select value={yearId ?? ""} onChange={(e) => setYearId(Number(e.target.value))} className={`${controlClass} min-w-[130px]`}>{opts.years.map((y) => <option key={y.id} value={y.id}>{y.name}</option>)}</select></label>}
        </div>
        <div className="flex flex-wrap gap-2">{TABS.map((t) => <button key={t} type="button" onClick={() => { setTab(t); setError(""); }} className={`rounded-lg px-5 py-2.5 text-[14px] font-semibold ${tab === t ? "bg-[#0875fb] text-white" : "text-[#101b69] hover:bg-blue-50"}`}>{t}</button>)}</div>
        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {opts && opts.years.length === 0 && <Notice tone="info">This school has no academic year yet. Set one up with grades before configuring fees.</Notice>}
        {!props && !error && <p className="text-[13px] text-slate-500">Loading…</p>}
        {props && (
          <div className="rounded-xl border border-[#d8e9fb] bg-white p-5">
            {tab === "Fee Collection" && <CollectionTab {...props} />}
            {tab === "Fee Structure" && <StructureTab {...props} />}
            {tab === "Concessions" && <ConcessionsTab {...props} />}
            {tab === "Scholarships" && <ScholarshipsTab {...props} />}
            {tab === "Refunds" && <RefundsTab {...props} />}
          </div>
        )}
      </div>
      {receipt && <ReceiptModal r={receipt} onClose={() => setReceipt(null)} />}
    </SchoolLayout>
  );
}
