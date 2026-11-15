import { useCallback, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, CartesianGrid, Cell, ComposedChart, Line, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertCircle, Building2, CheckCircle2, Clock, Download, Eye, FileText, IndianRupee, MapPin, MoreVertical, Pencil, Plus, Settings, X } from "lucide-react";
import AdminLayout from "../../components/AdminLayout";
import { api, ApiError } from "../../services/api";
import type { BillingOverview, Institution, InvoiceDetail, InvoiceRow, PaymentMethodRow } from "../../services/api";
import { DataTable, EmptyRow, Field, Notice, OutlineButton, Panel, PrimaryButton, Toggle, controlClass, fmtDate, tdClass } from "./AcademicShared";
import { errText } from "./SettingsShared";
import { Err } from "./TransportShared";
import { UsersHeader } from "./UserShared";

const tabs = ["Overview", "Subscription Plans", "Institution Subscriptions", "Invoices & Payments", "Usage & Limits", "Renewals & Expiry", "Billing Settings", "Reports"] as const;
type Tab = (typeof tabs)[number];

const rupee = (n: number | null | undefined) => (n === null || n === undefined ? "—" : `₹${Number(n).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`);
const axis = (v: number) => (v >= 100000 ? `${+(v / 100000).toFixed(1)}L` : v >= 1000 ? `${+(v / 1000).toFixed(1)}K` : String(v));
const esc = (v: string) => v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

const planLabel: Record<string, string> = { TRIAL: "Trial", BASIC: "Basic", STANDARD: "Standard", PREMIUM: "Premium", PROFESSIONAL: "Premium", ENTERPRISE: "Enterprise" };
const planColor: Record<string, string> = { TRIAL: "#94A3B8", BASIC: "#2563EB", STANDARD: "#16A34A", PREMIUM: "#8B5CF6", ENTERPRISE: "#F97316" };
const statusLabel: Record<string, string> = { ACTIVE: "Active", TRIAL: "Trial", EXPIRING_SOON: "Expiring Soon", EXPIRED: "Expired" };
const statusColor: Record<string, string> = { ACTIVE: "#16A34A", TRIAL: "#F97316", EXPIRING_SOON: "#EF4444", EXPIRED: "#9CA3AF" };
const cycleLabel: Record<string, string> = { MONTHLY: "Monthly", QUARTERLY: "Quarterly", HALF_YEARLY: "Half-yearly", YEARLY: "Yearly" };
const methodLabel: Record<string, string> = { BANK_TRANSFER: "Bank Transfer", UPI: "UPI", CHEQUE: "Cheque", CASH: "Cash", CARD: "Card", ONLINE: "Online Payment" };
const brandLabel: Record<string, string> = { VISA: "VISA", MASTERCARD: "Mastercard", AMEX: "Amex", RUPAY: "RuPay", OTHER: "Card" };
const templateLabel: Record<string, string> = { DEFAULT: "Default Template", COMPACT: "Compact Template" };
const planKeys = ["BASIC", "STANDARD", "PREMIUM", "ENTERPRISE"];

const pillCls: Record<string, string> = {
  green: "bg-emerald-50 text-emerald-700", orange: "bg-orange-50 text-orange-600", red: "bg-rose-50 text-rose-600", gray: "bg-slate-100 text-slate-600",
};
const dot: Record<string, string> = { green: "bg-emerald-500", orange: "bg-orange-500", red: "bg-rose-500", gray: "bg-slate-400" };
function DotPill({ tone, children }: { tone: "green" | "orange" | "red" | "gray"; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-1 text-[9px] font-medium ${pillCls[tone]}`}><span className={`h-2 w-2 rounded-full ${dot[tone]}`} />{children}</span>;
}
const subTone = (s: string) => (s === "ACTIVE" ? "green" : s === "TRIAL" ? "orange" : s === "EXPIRING_SOON" ? "red" : "gray") as "green" | "orange" | "red" | "gray";
const invTone = (s: string) => (s === "PAID" ? "green" : s === "OVERDUE" ? "red" : "orange") as "green" | "red" | "orange";

function Stat({ label, value, sub, icon, box, subCls = "text-emerald-600" }: { label: string; value: string | number; sub: string; icon: ReactNode; box: string; subCls?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-[#d8e9fb] bg-white px-4 py-3.5">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-lg ${box}`}>{icon}</span>
      <div className="min-w-0">
        <div className="text-[11px] text-[#17245e]">{label}</div>
        <div className="text-[22px] font-extrabold leading-7 text-[#101b69]">{value}</div>
        <div className={`text-[10px] font-semibold ${subCls}`}>{sub}</div>
      </div>
    </div>
  );
}

function Title({ icon, title, right }: { icon: ReactNode; title: string; right?: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
      <div className="flex items-center gap-2.5"><span className="text-blue-600">{icon}</span><h2 className="text-[14px] font-extrabold tracking-[-0.2px] text-[#101b69]">{title}</h2></div>
      {right}
    </div>
  );
}
const ViewAll = ({ label = "View All", onClick }: { label?: string; onClick: () => void }) => <button type="button" onClick={onClick} className="text-[11px] font-semibold text-blue-600 hover:underline">{label}</button>;

function Chart({ data, center, label }: { data: { key: string; name: string; value: number; color: string }[]; center?: number; label?: string }) {
  const total = data.reduce((a, d) => a + d.value, 0);
  const shown = total === 0 ? [{ key: "none", name: "None", value: 1, color: "#E2E8F0" }] : data.filter((d) => d.value > 0);
  return (
    <div className="flex flex-wrap items-center gap-5 px-4 pb-5">
      <div className="relative h-[160px] w-[160px] shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={shown} dataKey="value" nameKey="name" innerRadius={center === undefined ? 0 : 52} outerRadius={78} stroke="#fff" strokeWidth={center === undefined ? 1 : 2} isAnimationActive={false}>
              {shown.map((d) => <Cell key={d.key} fill={d.color} />)}
            </Pie>
            {total > 0 && <Tooltip />}
          </PieChart>
        </ResponsiveContainer>
        {center !== undefined && <div className="pointer-events-none absolute inset-0 grid place-items-center text-center"><div><div className="text-[22px] font-extrabold text-[#101b69]">{center}</div><div className="text-[10px] text-slate-600">{label}</div></div></div>}
      </div>
      <ul className="min-w-[160px] flex-1 space-y-2.5 text-[12px]">
        {data.map((d) => (
          <li key={d.key} className="flex items-center gap-2.5"><span className="h-3 w-3 rounded-full" style={{ background: d.color }} /><span className="flex-1 text-[#33477c]">{d.name}</span>
            <span className="w-6 text-right font-semibold text-[#17245e]">{d.value}</span><span className="w-12 text-right text-[#17245e]">({total ? Math.round((d.value / total) * 100) : 0}%)</span></li>
        ))}
      </ul>
    </div>
  );
}

/** A self-contained invoice page the user can save or print to PDF. */
function invoiceHtml(d: InvoiceDetail): string {
  const r = d.invoice;
  const compact = d.template === "COMPACT";
  const row = (k: string, v: string) => `<tr><td>${esc(k)}</td><td style="text-align:right">${esc(v)}</td></tr>`;
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(r.invoiceNo)}</title><style>body{font-family:Arial,sans-serif;color:#17245e;margin:${compact ? 24 : 40}px;font-size:${compact ? 12 : 14}px}
h1{margin:0;font-size:${compact ? 18 : 26}px}table{width:100%;border-collapse:collapse;margin-top:16px}td,th{padding:8px;border-bottom:1px solid #dbe6f7;text-align:left}.muted{color:#5a6b94}.total td{font-weight:700;border-top:2px solid #17245e}</style></head><body>
<h1>Centram Classzy</h1><div class="muted">Invoice ${esc(r.invoiceNo)} · ${esc(r.status)}</div>
<p><b>Bill to</b><br>${esc(r.institutionName)}<br>${esc(d.billTo)}<br>${esc(d.institutionEmail)}</p>
<p>Invoice date: ${esc(r.issueDate)}<br>Due date: ${esc(r.dueDate)}<br>Payment terms: Net ${esc(d.paymentTerms)} days${r.paidOn ? `<br>Paid on: ${esc(r.paidOn)}` : ""}</p>
<table><tr><th>Description</th><th style="text-align:right">Amount</th></tr>${row(r.description || "Subscription", rupee(r.subtotal))}${row(`${d.taxName} (${d.taxRate}%)`, rupee(r.taxAmount))}<tr class="total"><td>Total</td><td style="text-align:right">${esc(rupee(r.amount))}</td></tr></table>
</body></html>`;
}
function download(d: InvoiceDetail) {
  const url = URL.createObjectURL(new Blob([invoiceHtml(d)], { type: "text/html" }));
  const a = document.createElement("a");
  a.href = url; a.download = `${d.invoice.invoiceNo}.html`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const today = () => new Date().toISOString().slice(0, 10);
const addDays = (iso: string, n: number) => { const d = new Date(`${iso}T00:00:00`); d.setDate(d.getDate() + n); return d.toLocaleDateString("sv-SE"); };
type InvForm = { institutionId: string; subtotal: string; issueDate: string; dueDate: string; description: string };

export default function SubscriptionBilling() {
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("Overview");
  const [months, setMonths] = useState<6 | 12>(6);
  const [data, setData] = useState<BillingOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [menu, setMenu] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [invOpen, setInvOpen] = useState(false);
  const [inv, setInv] = useState<InvForm>({ institutionId: "", subtotal: "", issueDate: today(), dueDate: "", description: "" });
  const [invErrors, setInvErrors] = useState<Record<string, string>>({});
  const [viewing, setViewing] = useState<InvoiceDetail | null>(null);
  const [payDate, setPayDate] = useState(today());
  const [payMethod, setPayMethod] = useState("BANK_TRANSFER");

  const [editing, setEditing] = useState(false);
  const [cfg, setCfg] = useState<Record<string, string>>({});
  const [cfgErrors, setCfgErrors] = useState<Record<string, string>>({});

  const [cardOpen, setCardOpen] = useState(false);
  const [card, setCard] = useState({ brand: "VISA", last4: "", month: "", year: "" });
  const [cardErrors, setCardErrors] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    try { setData(await api.billing.overview(months)); setError(""); } catch (e) { setError(errText(e)); } finally { setLoading(false); }
  }, [months]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { api.institutions.list({ status: "ALL" }).then((l) => setInstitutions(l.filter((i) => i.status !== "ARCHIVED"))).catch(() => { /* form just stays empty */ }); }, []);

  const terms = Number(data?.settings.paymentTermsDays ?? 15);
  const taxRate = Number(data?.settings.taxRate ?? 18);
  const subtotal = Number(inv.subtotal);
  const taxPreview = Number.isFinite(subtotal) && subtotal > 0 ? Math.round(subtotal * taxRate) / 100 : 0;

  function openInvoice(institutionId?: number) {
    setInv({ institutionId: institutionId ? String(institutionId) : "", subtotal: "", issueDate: today(), dueDate: addDays(today(), terms), description: "" });
    setInvErrors({}); setInvOpen(true); setMenu(null); setTab("Overview");
  }
  async function createInvoice() {
    setSaving(true);
    try {
      const r = await api.billing.createInvoice({ institutionId: inv.institutionId ? Number(inv.institutionId) : null, subtotal: inv.subtotal ? Number(inv.subtotal) : null, issueDate: inv.issueDate || null, dueDate: inv.dueDate || null, description: inv.description.trim() || null });
      setNotice(`Invoice ${r.invoiceNo} created.`); setError(""); setInvOpen(false); await load();
    } catch (e) { if (e instanceof ApiError) setInvErrors(e.fieldErrors); setError(errText(e)); } finally { setSaving(false); }
  }
  async function openView(r: InvoiceRow) {
    try { setViewing(await api.billing.invoice(r.id)); setPayDate(today()); setPayMethod("BANK_TRANSFER"); setError(""); } catch (e) { setError(errText(e)); }
  }
  async function quickDownload(r: InvoiceRow) {
    try { download(await api.billing.invoice(r.id)); } catch (e) { setError(errText(e)); }
  }
  async function markPaid() {
    if (!viewing) return;
    setSaving(true);
    try { await api.billing.markInvoicePaid(viewing.invoice.id, { paidOn: payDate, method: payMethod }); setNotice(`${viewing.invoice.invoiceNo} marked as paid.`); setViewing(null); setError(""); await load(); }
    catch (e) { setError(errText(e)); } finally { setSaving(false); }
  }
  async function removeInvoice() {
    if (!viewing || !window.confirm(`Delete invoice ${viewing.invoice.invoiceNo}?`)) return;
    try { await api.billing.deleteInvoice(viewing.invoice.id); setNotice(`${viewing.invoice.invoiceNo} deleted.`); setViewing(null); await load(); } catch (e) { setError(errText(e)); }
  }

  function startEdit() { setCfg({ ...(data?.settings ?? {}) }); setCfgErrors({}); setEditing(true); }
  async function saveCfg() {
    setSaving(true);
    try { await api.billing.saveSettings(cfg); setNotice("Billing settings saved."); setError(""); setEditing(false); await load(); }
    catch (e) { if (e instanceof ApiError) setCfgErrors(e.fieldErrors); setError(errText(e)); } finally { setSaving(false); }
  }
  async function addCard() {
    setSaving(true);
    try {
      await api.billing.addMethod({ brand: card.brand, last4: card.last4.trim(), expiryMonth: card.month ? Number(card.month) : null, expiryYear: card.year ? Number(card.year) : null, makeDefault: false });
      setNotice("Payment method added."); setError(""); setCardOpen(false); setCard({ brand: "VISA", last4: "", month: "", year: "" }); await load();
    } catch (e) { if (e instanceof ApiError) setCardErrors(e.fieldErrors); setError(errText(e)); } finally { setSaving(false); }
  }
  async function makeDefault(m: PaymentMethodRow) {
    if (m.isDefault) return;
    try { await api.billing.setDefaultMethod(m.id); setNotice(`${brandLabel[m.brand] ?? m.brand} ending ${m.last4} is now the default.`); await load(); } catch (e) { setError(errText(e)); }
  }
  async function removeCard(m: PaymentMethodRow) {
    if (!window.confirm(`Remove ${brandLabel[m.brand] ?? m.brand} ending ${m.last4}?`)) return;
    try { await api.billing.deleteMethod(m.id); setNotice("Payment method removed."); await load(); } catch (e) { setError(errText(e)); }
  }

  const s = data?.stats;
  const pct = (n: number) => (s && s.subscribed ? Math.round((n / s.subscribed) * 100) : 0);
  const statusData = useMemo(() => (data?.statuses ?? []).map((c) => ({ key: c.key, name: statusLabel[c.key] ?? c.key, value: c.count, color: statusColor[c.key] ?? "#94A3B8" })), [data]);
  const planData = useMemo(() => (data?.plans ?? []).map((c) => ({ key: c.key, name: planLabel[c.key] ?? c.key, value: c.count, color: planColor[c.key] ?? "#94A3B8" })), [data]);

  const rowMenu = (id: string, institutionId: number) => (
    <span className="relative inline-flex">
      <button type="button" aria-label="More actions" onClick={(e) => { e.stopPropagation(); setMenu(menu === id ? null : id); }} className="text-[#152b70] hover:text-blue-600"><MoreVertical size={13} /></button>
      {menu === id && (
        <span className="absolute right-0 top-5 z-10 flex w-40 flex-col rounded-md border border-[#d8e9fb] bg-white py-1 text-left shadow-lg">
          <button type="button" className="px-3 py-1.5 text-left text-[11px] text-[#17245e] hover:bg-blue-50" onClick={() => navigate(`/institutions/${institutionId}/edit`)}>View institution</button>
          <button type="button" className="px-3 py-1.5 text-left text-[11px] text-[#17245e] hover:bg-blue-50" onClick={() => openInvoice(institutionId)}>Create invoice</button>
        </span>
      )}
    </span>
  );
  const goInstitution = (id: number) => navigate(`/institutions/${id}/edit`);

  return (
    <AdminLayout activeItem="Subscription & Billing">
      <div className="space-y-3" onClick={() => menu && setMenu(null)}>
        <UsersHeader title="Subscription & Billing" subtitle="Manage subscription plans, billing, payments and invoices for all institutions." />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Total Institutions" value={s?.institutions ?? 0} sub={`+ ${s?.newThisMonth ?? 0} this month`} icon={<Building2 size={24} className="text-blue-600" />} box="bg-blue-100" />
          <Stat label="Total Annual Revenue" value={`₹ ${Number(s?.annualRevenue ?? 0).toLocaleString("en-IN")}`} icon={<IndianRupee size={24} className="text-violet-600" />} box="bg-violet-100"
            sub={s?.growthPct !== null && s?.growthPct !== undefined ? `${s.growthPct >= 0 ? "+" : ""} ${s.growthPct}% this year` : `${s?.paymentsThisYear ?? 0} payments this year`} />
          <Stat label="Active Subscriptions" value={s?.active ?? 0} sub={`${pct(s?.active ?? 0)}% of total`} icon={<CheckCircle2 size={24} className="text-emerald-600" />} box="bg-emerald-100" />
          <Stat label="Trial Subscriptions" value={s?.trial ?? 0} sub={`${pct(s?.trial ?? 0)}% of total`} icon={<Clock size={24} className="text-orange-500" />} box="bg-orange-100" subCls="text-orange-600" />
          <Stat label="Expiring Soon" value={s?.expiring ?? 0} sub="in next 30 days" icon={<AlertCircle size={24} className="text-rose-600" />} box="bg-rose-100" subCls="text-rose-600" />
        </div>

        <div className="overflow-x-auto rounded-xl border border-[#d8e9fb] bg-[#f4f9ff]">
          <div className="flex min-w-[860px]">
            {tabs.map((t) => (
              <button key={t} type="button" onClick={() => setTab(t)} aria-current={tab === t ? "page" : undefined}
                className={`flex-1 px-3 py-3 text-[11px] font-semibold ${tab === t ? "border-b-2 border-blue-600 bg-[#e3f0ff] text-blue-700" : "text-[#17245e] hover:bg-blue-50"}`}>{t}</button>
            ))}
          </div>
        </div>

        {error && <Notice tone="error">{error}</Notice>}
        {notice && <Notice tone="info">{notice}</Notice>}
        {loading && <Notice tone="info">Loading...</Notice>}

        {tab !== "Overview" && (
          <Panel>
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <h2 className="text-[15px] font-extrabold text-[#101b69]">{tab}</h2>
              <p className="max-w-md text-[12px] text-slate-500">This section isn't built yet. The Overview tab already shows the key figures.</p>
              <OutlineButton type="button" onClick={() => setTab("Overview")}>Back to Overview</OutlineButton>
            </div>
          </Panel>
        )}

        {tab === "Overview" && data && (
          <>
            <div className="grid gap-3 xl:grid-cols-[1.55fr_1fr_1fr]">
              <Panel>
                <Title icon={<IndianRupee size={22} />} title="Revenue Overview" right={
                  <select aria-label="Period" className={`${controlClass} !w-[150px]`} value={months} onChange={(e) => setMonths(e.target.value === "12" ? 12 : 6)}><option value={6}>Last 6 Months</option><option value={12}>Last 12 Months</option></select>} />
                <div className="flex justify-center gap-6 px-4 pb-1 text-[10px] text-slate-600"><span><span className="mr-1 inline-block h-2.5 w-2.5 rounded-sm bg-[#7CB3FA]" />Monthly Revenue (₹)</span><span><span className="mr-1 inline-block h-0.5 w-4 bg-[#1D4ED8] align-middle" />Cumulative Revenue (₹)</span></div>
                <div className="h-[220px] px-2 pb-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.revenue.months} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                      <CartesianGrid stroke="#e6eefb" vertical={false} />
                      <XAxis dataKey="label" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={axis} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={42} />
                      <Tooltip formatter={(v: number) => rupee(v)} />
                      <Bar dataKey="revenue" name="Monthly Revenue (₹)" fill="#7CB3FA" radius={[3, 3, 0, 0]} isAnimationActive={false} />
                      <Line dataKey="cumulative" name="Cumulative Revenue (₹)" stroke="#1D4ED8" strokeWidth={2} dot={{ r: 3 }} isAnimationActive={false} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              </Panel>
              <Panel><Title icon={<FileText size={22} />} title="Subscription Status" /><Chart data={statusData} center={statusData.reduce((a, d) => a + d.value, 0)} label="Institutions" /></Panel>
              <Panel><Title icon={<MapPin size={22} />} title="Plan Distribution" right={<ViewAll label="View Details" onClick={() => setTab("Subscription Plans")} />} /><Chart data={planData} /></Panel>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              <Panel>
                <Title icon={<Building2 size={22} />} title="Institution Subscriptions (Recent)" right={<ViewAll onClick={() => setTab("Institution Subscriptions")} />} />
                <div className="px-4 pb-4">
                  <DataTable heads={["#", "Institution Name", "Plan", "Start Date", "End Date", "Status", "Billing Cycle", "Amount (₹)", "Actions"]} min={820}>
                    {data.subscriptions.length === 0 ? <EmptyRow cols={9} text="No subscriptions yet." /> : data.subscriptions.map((r, i) => (
                      <tr key={r.institutionId}>
                        <td className={tdClass}>{i + 1}</td><td className={tdClass}>{r.institutionName}</td><td className={tdClass}>{planLabel[r.plan] ?? r.plan}</td>
                        <td className={tdClass}>{r.startDate ? fmtDate(r.startDate) : "—"}</td><td className={tdClass}>{r.endDate ? fmtDate(r.endDate) : "—"}</td>
                        <td className={tdClass}><DotPill tone={subTone(r.status)}>{statusLabel[r.status] ?? r.status}</DotPill></td><td className={tdClass}>{r.cycle}</td><td className={tdClass}>{rupee(r.amount)}</td>
                        <td className={tdClass}><span className="inline-flex items-center gap-2.5">
                          <button type="button" aria-label={`View ${r.institutionName}`} onClick={() => goInstitution(r.institutionId)} className="text-[#152b70] hover:text-blue-600"><Eye size={13} /></button>
                          <button type="button" aria-label={`Edit ${r.institutionName}`} onClick={() => goInstitution(r.institutionId)} className="text-[#152b70] hover:text-blue-600"><Pencil size={13} /></button>
                          {rowMenu(`s${r.institutionId}`, r.institutionId)}</span></td>
                      </tr>))}
                  </DataTable>
                </div>
              </Panel>
              <Panel>
                <Title icon={<Building2 size={22} />} title="Upcoming Renewals & Expiry" right={<ViewAll onClick={() => setTab("Renewals & Expiry")} />} />
                <div className="px-4 pb-4">
                  <DataTable heads={["#", "Institution Name", "Plan", "Renewal Date", "Days Left", "Amount (₹)", "Actions"]} min={640}>
                    {data.renewals.length === 0 ? <EmptyRow cols={7} text="No upcoming renewals." /> : data.renewals.map((r, i) => (
                      <tr key={r.institutionId}>
                        <td className={tdClass}>{i + 1}</td><td className={tdClass}>{r.institutionName}</td><td className={tdClass}>{r.plan ? planLabel[r.plan] ?? r.plan : "—"}</td><td className={tdClass}>{fmtDate(r.renewalDate)}</td>
                        <td className={tdClass}><span className={`inline-block min-w-9 rounded px-2 py-1 text-center font-semibold ${r.daysLeft <= 30 ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700"}`}>{r.daysLeft}</span></td>
                        <td className={tdClass}>{rupee(r.amount)}</td>
                        <td className={tdClass}><span className="inline-flex items-center gap-2.5">
                          <button type="button" aria-label={`View ${r.institutionName}`} onClick={() => goInstitution(r.institutionId)} className="text-[#152b70] hover:text-blue-600"><Eye size={13} /></button>
                          {rowMenu(`r${r.institutionId}`, r.institutionId)}</span></td>
                      </tr>))}
                  </DataTable>
                </div>
              </Panel>
            </div>

            <div className="grid gap-3 xl:grid-cols-2">
              <Panel>
                <Title icon={<FileText size={22} />} title="Recent Invoices" right={<span className="flex items-center gap-3"><button type="button" onClick={() => openInvoice()} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"><Plus size={12} /> Create Invoice</button><ViewAll onClick={() => setTab("Invoices & Payments")} /></span>} />
                <div className="px-4 pb-4">
                  <DataTable heads={["#", "Invoice No", "Institution Name", "Invoice Date", "Due Date", "Amount (₹)", "Status", "Actions"]} min={780}>
                    {data.invoices.length === 0 ? <EmptyRow cols={8} text="No invoices yet." /> : data.invoices.map((r, i) => (
                      <tr key={r.id}>
                        <td className={tdClass}>{i + 1}</td><td className={`${tdClass} font-medium text-blue-700`}>{r.invoiceNo}</td><td className={tdClass}>{r.institutionName}</td>
                        <td className={tdClass}>{fmtDate(r.issueDate)}</td><td className={tdClass}>{fmtDate(r.dueDate)}</td><td className={tdClass} title={`Incl. tax ${rupee(r.taxAmount)}`}>{rupee(r.amount)}</td>
                        <td className={tdClass}><DotPill tone={invTone(r.status)}>{r.status === "PAID" ? "Paid" : r.status === "OVERDUE" ? "Overdue" : "Pending"}</DotPill></td>
                        <td className={tdClass}><span className="inline-flex items-center gap-3">
                          <button type="button" aria-label={`Download ${r.invoiceNo}`} onClick={() => void quickDownload(r)} className="text-blue-600 hover:text-blue-800"><Download size={14} /></button>
                          <button type="button" aria-label={`View ${r.invoiceNo}`} onClick={() => void openView(r)} className="text-blue-600 hover:text-blue-800"><Eye size={14} /></button></span></td>
                      </tr>))}
                  </DataTable>
                  {invOpen && (
                    <div className="mt-3 rounded-xl border border-[#d8e9fb] bg-[#f6faff] p-4">
                      <h3 className="mb-3 text-[13px] font-extrabold text-[#101b69]">New Invoice</h3>
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Field label="Institution" required className="sm:col-span-2"><select className={controlClass} value={inv.institutionId} onChange={(e) => setInv({ ...inv, institutionId: e.target.value })}><option value="">Select</option>{institutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select><Err errors={invErrors} k="institutionId" /></Field>
                        <Field label="Amount before tax (₹)" required><input className={controlClass} type="number" min={0} step="0.01" value={inv.subtotal} onChange={(e) => setInv({ ...inv, subtotal: e.target.value })} /><Err errors={invErrors} k="subtotal" />
                          <div className="mt-0.5 text-[10px] text-slate-500">{data.settings.taxName} {taxRate}%: {rupee(taxPreview)} · Total: {rupee((subtotal > 0 ? subtotal : 0) + taxPreview)}</div></Field>
                        <Field label="Description" optional><input className={controlClass} maxLength={300} value={inv.description} onChange={(e) => setInv({ ...inv, description: e.target.value })} /><Err errors={invErrors} k="description" /></Field>
                        <Field label="Invoice Date"><input className={controlClass} type="date" value={inv.issueDate} onChange={(e) => setInv({ ...inv, issueDate: e.target.value, dueDate: e.target.value ? addDays(e.target.value, terms) : inv.dueDate })} /><Err errors={invErrors} k="issueDate" /></Field>
                        <Field label="Due Date"><input className={controlClass} type="date" min={inv.issueDate || undefined} value={inv.dueDate} onChange={(e) => setInv({ ...inv, dueDate: e.target.value })} /><Err errors={invErrors} k="dueDate" /></Field>
                      </div>
                      <div className="mt-3 flex justify-end gap-2.5"><OutlineButton type="button" onClick={() => setInvOpen(false)} disabled={saving}>Cancel</OutlineButton><PrimaryButton type="button" onClick={() => void createInvoice()} disabled={saving}>{saving ? "Saving..." : "Create Invoice"}</PrimaryButton></div>
                    </div>
                  )}
                </div>
              </Panel>

              <Panel>
                <Title icon={<Settings size={22} />} title="Payment Methods & Billing Settings" right={!editing && <button type="button" onClick={startEdit} className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"><Pencil size={12} /> Edit</button>} />
                <div className="grid gap-4 px-4 pb-4 md:grid-cols-2">
                  <div>
                    <div className="mb-2 text-[12px] font-extrabold text-[#101b69]">Payment Methods</div>
                    <ul className="space-y-2">
                      {data.methods.map((m) => (
                        <li key={m.id} className="flex items-center gap-3 rounded-lg border border-[#d8e9fb] bg-white px-3 py-2.5">
                          <span className="grid h-8 w-14 shrink-0 place-items-center rounded border border-[#e1ecfa] text-[11px] font-extrabold italic text-[#1a1f71]">{brandLabel[m.brand] ?? m.brand}</span>
                          <span className="min-w-0 flex-1"><span className="block text-[12px] font-semibold text-[#17245e]">**** {m.last4}</span>
                            <span className={`block text-[10px] ${m.expired ? "text-rose-600" : "text-slate-500"}`}>{m.expired ? "Expired" : "Expires"} {String(m.expiryMonth).padStart(2, "0")}/{String(m.expiryYear).slice(-2)}</span></span>
                          {m.isDefault && <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Default</span>}
                          <input type="radio" name="defaultCard" aria-label={`Make ${m.last4} the default`} checked={m.isDefault} onChange={() => void makeDefault(m)} className="h-4 w-4 accent-blue-600" />
                          <button type="button" aria-label={`Remove card ending ${m.last4}`} onClick={() => void removeCard(m)} className="text-slate-400 hover:text-rose-600"><X size={13} /></button>
                        </li>))}
                      {data.methods.length === 0 && <li className="rounded-lg border border-dashed border-[#d8e9fb] px-3 py-4 text-center text-[11px] text-slate-400">No payment methods saved.</li>}
                    </ul>
                    {cardOpen ? (
                      <div className="mt-2 space-y-2 rounded-lg border border-[#d8e9fb] bg-[#f6faff] p-3">
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Card Brand"><select className={controlClass} value={card.brand} onChange={(e) => setCard({ ...card, brand: e.target.value })}>{Object.entries(brandLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><Err errors={cardErrors} k="brand" /></Field>
                          <Field label="Last 4 digits"><input className={controlClass} inputMode="numeric" maxLength={4} value={card.last4} onChange={(e) => setCard({ ...card, last4: e.target.value.replace(/\D/g, "") })} /><Err errors={cardErrors} k="last4" /></Field>
                          <Field label="Expiry month"><input className={controlClass} type="number" min={1} max={12} placeholder="MM" value={card.month} onChange={(e) => setCard({ ...card, month: e.target.value })} /><Err errors={cardErrors} k="expiryMonth" /></Field>
                          <Field label="Expiry year"><input className={controlClass} type="number" placeholder="YY" value={card.year} onChange={(e) => setCard({ ...card, year: e.target.value })} /><Err errors={cardErrors} k="expiryYear" /></Field>
                        </div>
                        <p className="text-[10px] text-slate-500">Only the last 4 digits are kept. Cards aren't charged yet; no payment gateway is connected.</p>
                        <div className="flex justify-end gap-2"><OutlineButton type="button" onClick={() => setCardOpen(false)} disabled={saving}>Cancel</OutlineButton><PrimaryButton type="button" onClick={() => void addCard()} disabled={saving}>Save</PrimaryButton></div>
                      </div>
                    ) : (
                      <button type="button" onClick={() => { setCardOpen(true); setCardErrors({}); }} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-blue-400 bg-white py-2.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"><Plus size={13} /> Add Payment Method</button>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 text-[12px] font-extrabold text-[#101b69]">Billing Settings</div>
                    {!editing ? (
                      <dl className="divide-y divide-[#eef4fc] rounded-lg border border-[#e1ecfa] text-[11px]">
                        {([["Currency", "INR (₹)"], ["Billing Cycle", `${cycleLabel[data.settings.billingCycle] ?? data.settings.billingCycle} (Default)`], ["Tax Configuration", `${data.settings.taxName} (${data.settings.taxRate}%)`],
                          ["Invoice Template", templateLabel[data.settings.invoiceTemplate] ?? data.settings.invoiceTemplate], ["Payment Terms", `Net ${data.settings.paymentTermsDays} Days`]] as const).map(([k, v]) => (
                          <div key={k} className="grid grid-cols-2 gap-2 px-3 py-2"><dt className="text-[#33477c]">{k}</dt><dd className="text-[#17245e]">{v}</dd></div>))}
                        <div className="grid grid-cols-2 gap-2 px-3 py-2"><dt className="text-[#33477c]">Auto Renewal</dt><dd className="text-[#17245e]"><span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${data.settings.autoRenewal === "true" ? "bg-emerald-500" : "bg-slate-400"}`} />{data.settings.autoRenewal === "true" ? "Enabled" : "Disabled"}</dd></div>
                      </dl>
                    ) : (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <Field label="Billing Cycle"><select className={controlClass} value={cfg.billingCycle} onChange={(e) => setCfg({ ...cfg, billingCycle: e.target.value })}>{Object.entries(cycleLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                          <Field label="Invoice Template"><select className={controlClass} value={cfg.invoiceTemplate} onChange={(e) => setCfg({ ...cfg, invoiceTemplate: e.target.value })}>{Object.entries(templateLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                          <Field label="Tax Name"><input className={controlClass} maxLength={20} value={cfg.taxName} onChange={(e) => setCfg({ ...cfg, taxName: e.target.value })} /><Err errors={cfgErrors} k="taxName" /></Field>
                          <Field label="Tax Rate (%)"><input className={controlClass} type="number" min={0} max={100} step="0.01" value={cfg.taxRate} onChange={(e) => setCfg({ ...cfg, taxRate: e.target.value })} /><Err errors={cfgErrors} k="taxRate" /></Field>
                          <Field label="Invoice Prefix"><input className={controlClass} maxLength={10} value={cfg.invoicePrefix} onChange={(e) => setCfg({ ...cfg, invoicePrefix: e.target.value })} /><Err errors={cfgErrors} k="invoicePrefix" /></Field>
                          <Field label="Payment Terms (days)"><input className={controlClass} type="number" min={0} max={180} value={cfg.paymentTermsDays} onChange={(e) => setCfg({ ...cfg, paymentTermsDays: e.target.value })} /><Err errors={cfgErrors} k="paymentTermsDays" /></Field>
                        </div>
                        <div className="text-[11px] font-bold text-[#17245e]">Yearly plan price (₹)</div>
                        <div className="grid grid-cols-2 gap-2">{planKeys.map((p) => <Field key={p} label={planLabel[p]}><input className={controlClass} type="number" min={0} step="0.01" value={cfg[`price${p}`] ?? ""} onChange={(e) => setCfg({ ...cfg, [`price${p}`]: e.target.value })} /><Err errors={cfgErrors} k={`price${p}`} /></Field>)}</div>
                        <Toggle checked={cfg.autoRenewal === "true"} onChange={(v) => setCfg({ ...cfg, autoRenewal: String(v) })} label="Auto renewal" />
                        <div className="flex justify-end gap-2"><OutlineButton type="button" onClick={() => setEditing(false)} disabled={saving}>Cancel</OutlineButton><PrimaryButton type="button" onClick={() => void saveCfg()} disabled={saving}>{saving ? "Saving..." : "Save"}</PrimaryButton></div>
                      </div>
                    )}
                    <p className="mt-1.5 text-[10px] text-slate-500">Amounts in the tables use the yearly plan price. Auto renewal is saved but doesn't renew anything yet.</p>
                  </div>
                </div>
              </Panel>
            </div>
          </>
        )}

        {viewing && (
          <div role="dialog" aria-modal="true" aria-label="Invoice" className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" onClick={() => setViewing(null)}>
            <div className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-3 flex items-start justify-between"><div><div className="text-[15px] font-extrabold text-[#101b69]">{viewing.invoice.invoiceNo}</div><DotPill tone={invTone(viewing.invoice.status)}>{viewing.invoice.status === "PAID" ? "Paid" : viewing.invoice.status === "OVERDUE" ? "Overdue" : "Pending"}</DotPill></div>
                <button type="button" aria-label="Close" onClick={() => setViewing(null)} className="text-slate-500 hover:text-slate-900"><X size={16} /></button></div>
              <dl className="space-y-1.5 text-[12px]">
                {([["Institution", viewing.invoice.institutionName], ["Bill to", viewing.billTo || "—"], ["Invoice date", fmtDate(viewing.invoice.issueDate)], ["Due date", fmtDate(viewing.invoice.dueDate)],
                  ["Amount before tax", rupee(viewing.invoice.subtotal)], [`${viewing.taxName} (${viewing.taxRate}%)`, rupee(viewing.invoice.taxAmount)], ["Total", rupee(viewing.invoice.amount)],
                  ...(viewing.invoice.paidOn ? [["Paid on", fmtDate(viewing.invoice.paidOn)] as const] : []), ...(viewing.invoice.description ? [["Description", viewing.invoice.description] as const] : [])] as readonly (readonly [string, string])[]).map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[130px_1fr] gap-2"><dt className="text-slate-500">{k}</dt><dd className="font-medium text-[#17245e]">{v}</dd></div>))}
              </dl>
              {viewing.invoice.status !== "PAID" && (
                <div className="mt-4 rounded-lg border border-[#d8e9fb] bg-[#f6faff] p-3">
                  <div className="mb-2 text-[11px] font-bold text-[#17245e]">Record payment</div>
                  <div className="grid grid-cols-2 gap-2">
                    <Field label="Paid on"><input className={controlClass} type="date" max={today()} value={payDate} onChange={(e) => setPayDate(e.target.value)} /></Field>
                    <Field label="Method"><select className={controlClass} value={payMethod} onChange={(e) => setPayMethod(e.target.value)}>{Object.entries(methodLabel).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
                  </div>
                  <div className="mt-2 flex justify-end gap-2"><button type="button" onClick={() => void removeInvoice()} className="rounded-md border border-rose-300 px-3 py-2 text-[11px] font-semibold text-rose-600 hover:bg-rose-50">Delete</button><PrimaryButton type="button" onClick={() => void markPaid()} disabled={saving}>Mark as Paid</PrimaryButton></div>
                </div>
              )}
              <div className="mt-4 flex justify-end gap-2"><OutlineButton type="button" onClick={() => download(viewing)}><Download size={13} /> Download</OutlineButton><PrimaryButton type="button" onClick={() => setViewing(null)}>Close</PrimaryButton></div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
