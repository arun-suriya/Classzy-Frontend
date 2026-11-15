import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CircleDollarSign, IndianRupee, Info, Loader2, Plus, Trash2, Wallet, X } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import {
  api,
  type Institution,
  type InstitutionStatus,
  type Payment,
  type PlanType,
  type RevenueSummary,
} from "../../services/api";

const statusLabel: Record<InstitutionStatus, string> = {
  DRAFT: "Draft", ACTIVE: "Active", TRIAL: "Trial", EXPIRING_SOON: "Expiring Soon", EXPIRED: "Expired", ARCHIVED: "Archived",
};
const statusTone: Record<InstitutionStatus, [string, string]> = {
  ACTIVE: ["bg-emerald-50 text-emerald-700", "bg-emerald-500"],
  TRIAL: ["bg-orange-50 text-orange-700", "bg-orange-500"],
  EXPIRING_SOON: ["bg-amber-50 text-amber-700", "bg-amber-500"],
  EXPIRED: ["bg-rose-50 text-rose-700", "bg-rose-500"],
  DRAFT: ["bg-slate-100 text-slate-600", "bg-slate-400"],
  ARCHIVED: ["bg-slate-100 text-slate-500", "bg-slate-400"],
};
const methods = ["Bank Transfer", "UPI", "Card", "Cheque", "Cash"];
const rupees = (n: number) => `₹ ${Math.round(n).toLocaleString("en-IN")}`;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const plan = (p: PlanType | null) => (p ? p[0] + p.slice(1).toLowerCase() : "—");
const daysLeft = (iso: string | null) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : null);
const today = () => new Date().toISOString().slice(0, 10);

const card = "min-w-0 overflow-hidden rounded-xl border border-[#d8e9fb] bg-white shadow-[0_1px_6px_rgba(37,99,235,0.05)]";
const control = "h-8 w-full rounded-md border border-[#d3dff0] bg-white px-2.5 text-[11px] text-[#17265f] outline-none transition placeholder:text-[#8b9abd] hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const th = "border border-blue-100 px-2 py-2 font-bold";
const td = "border border-blue-50 px-2 py-2";

export default function Subscriptions() {
  const navigate = useNavigate();
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<RevenueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [filter, setFilter] = useState<InstitutionStatus | "">("");
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmId, setConfirmId] = useState<number | null>(null);
  const [form, setForm] = useState({ institutionId: "", amount: "", paidOn: today(), method: "Bank Transfer", reference: "", note: "" });

  const load = useCallback(async () => {
    try {
      const [list, pay, sum] = await Promise.all([api.institutions.list({ status: "ALL" }), api.payments.list(), api.payments.summary()]);
      setInstitutions(list.filter((i) => i.status !== "ARCHIVED"));
      setPayments(pay);
      setSummary(sum);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load subscriptions.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const counts = useMemo(() => {
    const c: Partial<Record<InstitutionStatus, number>> = {};
    institutions.forEach((i) => { c[i.status] = (c[i.status] ?? 0) + 1; });
    return c;
  }, [institutions]);
  const rows = institutions.filter((i) => !filter || i.status === filter);
  const hasRevenue = (summary?.months ?? []).some((m) => m.revenue > 0);
  const chart = (summary?.months ?? []).map((m) => ({ month: m.label, revenue: +(m.revenue / 100000).toFixed(2), cumulative: +(m.cumulative / 100000).toFixed(2) }));

  function openForm(institutionId?: number) {
    setForm((f) => ({ ...f, institutionId: institutionId ? String(institutionId) : f.institutionId }));
    setShowForm(true);
    setNotice("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    const amount = Number(form.amount);
    if (!form.institutionId) return setError("Please choose an institution.");
    if (!amount || amount <= 0) return setError("Please enter an amount greater than zero.");
    if (!form.paidOn) return setError("Please choose the payment date.");
    setSaving(true);
    setError("");
    try {
      const inst = institutions.find((i) => i.id === Number(form.institutionId));
      await api.payments.record({
        institutionId: Number(form.institutionId), amount, paidOn: form.paidOn, planType: inst?.planType ?? null,
        method: form.method.toUpperCase().replace(/ /g, "_"), reference: form.reference || null, note: form.note || null,
      });
      setNotice(`Payment of ${rupees(amount)} recorded${inst ? ` for ${inst.name}` : ""}.`);
      setForm({ institutionId: "", amount: "", paidOn: today(), method: "Bank Transfer", reference: "", note: "" });
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not record the payment.");
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: number) {
    try {
      await api.payments.remove(id);
      setNotice("Payment deleted.");
      setConfirmId(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete the payment.");
    }
  }

  const kpis = [
    { label: `Annual Revenue (FY ${summary?.financialYear ?? ""})`, value: summary ? rupees(summary.annualRevenue) : "…", icon: IndianRupee, box: "bg-purple-50 text-purple-600" },
    { label: "This Month", value: summary ? rupees(summary.thisMonth) : "…", icon: CircleDollarSign, box: "bg-emerald-50 text-emerald-600" },
    { label: "Payments This FY", value: summary ? String(summary.paymentCount) : "…", icon: Wallet, box: "bg-blue-50 text-blue-600" },
    { label: "Need Attention", value: String((counts.EXPIRING_SOON ?? 0) + (counts.EXPIRED ?? 0)), icon: Info, box: "bg-orange-50 text-orange-600" },
  ];

  return (
    <AdminLayout activeItem="Subscription & Billing">
      <div className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d8e9fb] bg-white/95 px-4 py-3 shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
          <div className="flex min-w-0 items-center gap-3">
            <Wallet size={36} strokeWidth={2.2} className="shrink-0 text-blue-600" />
            <div className="min-w-0">
              <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.5px] text-[#111b70]">Subscriptions & Revenue</h1>
              <p className="mt-0.5 text-[11px] leading-4 text-[#425585]">Track every institution's plan and validity, and record the payments you receive.</p>
            </div>
          </div>
          <button type="button" onClick={() => openForm()} className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-[#0875fb] px-3.5 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-700"><Plus size={15} /> Record Payment</button>
        </div>

        {error && <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] leading-5 text-rose-700"><span><span className="font-bold">Please review:</span> {error}</span><button type="button" className="ml-auto" onClick={() => setError("")} aria-label="Dismiss"><X size={14} /></button></div>}
        {notice && <div role="status" className="flex items-start gap-2 rounded-lg border border-[#d8e9fb] bg-gradient-to-r from-[#eff6ff] to-[#f8fcff] px-4 py-2.5 text-[11px] leading-5 text-blue-800"><Info size={15} className="mt-0.5 shrink-0" />{notice}<button type="button" className="ml-auto text-blue-600" onClick={() => setNotice("")} aria-label="Dismiss"><X size={15} /></button></div>}

        {showForm && (
          <form onSubmit={submit} className={`${card} p-4`}>
            <h2 className="mb-3 text-[13px] font-bold text-[#111b69]">Record a payment</h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <label className="text-[10px] font-bold text-[#17245e] xl:col-span-2">Institution <span className="text-rose-500">*</span>
                <select className={`${control} mt-1 font-normal`} value={form.institutionId} onChange={(e) => setForm({ ...form, institutionId: e.target.value })}>
                  <option value="">Select institution</option>
                  {institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
              </label>
              <label className="text-[10px] font-bold text-[#17245e]">Amount (₹) <span className="text-rose-500">*</span>
                <input type="number" min="1" step="0.01" className={`${control} mt-1 font-normal`} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} placeholder="e.g. 250000" />
              </label>
              <label className="text-[10px] font-bold text-[#17245e]">Paid on <span className="text-rose-500">*</span>
                <input type="date" max={today()} className={`${control} mt-1 font-normal`} value={form.paidOn} onChange={(e) => setForm({ ...form, paidOn: e.target.value })} />
              </label>
              <label className="text-[10px] font-bold text-[#17245e]">Method
                <select className={`${control} mt-1 font-normal`} value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>{methods.map((m) => <option key={m}>{m}</option>)}</select>
              </label>
              <label className="text-[10px] font-bold text-[#17245e]">Reference <span className="font-normal text-slate-500">(Optional)</span>
                <input className={`${control} mt-1 font-normal`} value={form.reference} maxLength={100} onChange={(e) => setForm({ ...form, reference: e.target.value })} placeholder="Txn / cheque no." />
              </label>
              <label className="text-[10px] font-bold text-[#17245e] sm:col-span-2 xl:col-span-6">Note <span className="font-normal text-slate-500">(Optional)</span>
                <input className={`${control} mt-1 font-normal`} value={form.note} maxLength={300} onChange={(e) => setForm({ ...form, note: e.target.value })} />
              </label>
            </div>
            <div className="mt-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)} className="rounded-md border border-blue-300 bg-white px-4 py-2 text-[11px] font-semibold text-blue-600 hover:bg-blue-50">Cancel</button>
              <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-[11px] font-bold text-white hover:bg-blue-700 disabled:opacity-60">{saving && <Loader2 size={13} className="animate-spin" />}Save payment</button>
            </div>
          </form>
        )}

        <section className="grid grid-cols-2 gap-2 xl:grid-cols-4">
          {kpis.map(({ label, value, icon: Icon, box }) => (
            <div key={label} className="flex min-w-0 items-center gap-2.5 rounded-lg border border-blue-100 bg-white p-2.5">
              <div className={`grid h-[46px] w-[46px] shrink-0 place-items-center rounded-xl ${box}`}><Icon size={22} /></div>
              <div className="min-w-0"><p className="truncate text-[10px] text-[#25356b]">{label}</p><p className="mt-0.5 truncate text-[18px] font-extrabold leading-tight text-[#0d195d]">{value}</p></div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 gap-2.5 xl:grid-cols-12">
          <section className={`${card} xl:col-span-5`}>
            <div className="border-b border-blue-50 px-3 py-2.5 text-[13px] font-bold text-[#111b69]">Revenue (last 6 months, ₹ lakh)</div>
            <div className="px-2 pb-2 pt-3">
              {!hasRevenue && !loading && <p className="mb-1 text-center text-[10px] text-[#52638f]">No payments recorded yet.</p>}
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chart} margin={{ top: 5, right: 7, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="#e2edfb" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#536a9f", fontSize: 9 }} axisLine={{ stroke: "#d6e5f8" }} tickLine={false} />
                    <YAxis tick={{ fill: "#6176a6", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="revenue" name="Monthly" fill="#67a9ff" radius={[3, 3, 0, 0]} barSize={26} />
                    <Line dataKey="cumulative" name="Cumulative" stroke="#142bc4" strokeWidth={2} dot={{ r: 2.5, fill: "#142bc4" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </section>

          <section className={`${card} xl:col-span-7`}>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-50 px-3 py-2.5">
              <h2 className="text-[13px] font-bold text-[#111b69]">Institution subscriptions</h2>
              <select className={`${control} !w-auto`} value={filter} onChange={(e) => setFilter(e.target.value as InstitutionStatus | "")} aria-label="Filter by status">
                <option value="">All ({institutions.length})</option>
                {(["ACTIVE", "TRIAL", "EXPIRING_SOON", "EXPIRED", "DRAFT"] as InstitutionStatus[]).map((s) => <option key={s} value={s}>{statusLabel[s]} ({counts[s] ?? 0})</option>)}
              </select>
            </div>
            <div className="max-h-[260px] overflow-auto px-2 pb-2 pt-2">
              <table className="w-full min-w-[560px] border-collapse text-left text-[10px]">
                <thead><tr className="bg-[#f5f9ff] text-[#13205f]">{["Institution", "Plan", "Valid Till", "Days Left", "Status", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {loading ? <tr><td colSpan={6} className={`${td} py-8 text-center text-[#52638f]`}>Loading…</td></tr>
                    : rows.length === 0 ? <tr><td colSpan={6} className={`${td} py-8 text-center text-[#52638f]`}>No institutions in this status.</td></tr>
                    : rows.map((i) => {
                      const d = daysLeft(i.subscriptionEnd);
                      const [box, dot] = statusTone[i.status];
                      return <tr key={i.id} className="hover:bg-blue-50/50">
                        <td className={`${td} max-w-[200px] truncate text-[#33477c]`}>{i.name}</td>
                        <td className={`${td} text-[#455a8c]`}>{plan(i.planType)}</td>
                        <td className={`${td} whitespace-nowrap text-[#455a8c]`}>{date(i.subscriptionEnd)}</td>
                        <td className={`${td} ${d !== null && d < 0 ? "text-rose-600" : "text-[#455a8c]"}`}>{d === null ? "—" : d < 0 ? `${-d} overdue` : d}</td>
                        <td className={td}><span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-1 text-[9px] font-medium ${box}`}><span className={`h-2 w-2 rounded-full ${dot}`} />{statusLabel[i.status]}</span></td>
                        <td className={`${td} whitespace-nowrap`}>
                          <button type="button" onClick={() => openForm(i.id)} className="rounded bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-600 hover:bg-blue-100">Record payment</button>{" "}
                          <button type="button" onClick={() => navigate(`/institutions/${i.id}/edit`)} className="rounded bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600 hover:bg-slate-200">Edit plan</button>
                        </td>
                      </tr>;
                    })}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <section className={card}>
          <div className="border-b border-blue-50 px-3 py-2.5 text-[13px] font-bold text-[#111b69]">Payment history</div>
          <div className="overflow-x-auto px-2 pb-2 pt-2">
            <table className="w-full min-w-[760px] border-collapse text-left text-[10px]">
              <thead><tr className="bg-[#f5f9ff] text-[#13205f]">{["Date", "Institution", "Plan", "Method", "Reference", "Amount", ""].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} className={`${td} py-8 text-center text-[#52638f]`}>Loading…</td></tr>
                  : payments.length === 0 ? <tr><td colSpan={7} className={`${td} py-8 text-center text-[#52638f]`}>No payments recorded yet. Click “Record Payment” to add one.</td></tr>
                  : payments.map((p) => <tr key={p.id} className="hover:bg-blue-50/50">
                    <td className={`${td} whitespace-nowrap text-[#455a8c]`}>{date(p.paidOn)}</td>
                    <td className={`${td} text-[#33477c]`}>{p.institutionName}</td>
                    <td className={`${td} text-[#455a8c]`}>{plan(p.planType)}</td>
                    <td className={`${td} text-[#455a8c]`}>{p.method.toLowerCase().split("_").map((w) => w[0].toUpperCase() + w.slice(1)).join(" ")}</td>
                    <td className={`${td} text-[#455a8c]`}>{p.reference ?? "—"}</td>
                    <td className={`${td} font-bold text-[#101b59]`}>{rupees(p.amount)}</td>
                    <td className={`${td} whitespace-nowrap`}>
                      {confirmId === p.id
                        ? <span className="text-[9px] text-rose-700">Delete? <button type="button" className="font-bold underline" onClick={() => remove(p.id)}>Yes</button> <button type="button" className="font-semibold text-[#455a8c]" onClick={() => setConfirmId(null)}>No</button></span>
                        : <button type="button" onClick={() => setConfirmId(p.id)} className="inline-flex items-center gap-1 rounded bg-rose-50 px-2 py-1 text-[9px] font-semibold text-rose-600 hover:bg-rose-100"><Trash2 size={11} /> Delete</button>}
                    </td>
                  </tr>)}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AdminLayout>
  );
}
