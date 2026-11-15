import {
  ArrowRight,
  IndianRupee,
  Building2,
  Clock3,
  GraduationCap,
  MapPin,
  MoreVertical,
  Plus,
  ShieldCheck,
  TicketCheck,
  Users,
  UserRound,
  Wallet,
  Activity,
  Database,
  CreditCard,
  Mail,
  Folder,
  CircleDollarSign,
  UserPlus,
  AlertTriangle,
  Headset,
  Timer,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useNavigate } from "react-router-dom";
import AdminLayout from "../../components/AdminLayout";

const stats = [
  { title: "Total Institutions", value: "28", change: "+ 3 this month", icon: Building2, tone: "blue" },
  { title: "Total Users", value: "24,850", change: "+ 12% this month", icon: Users, tone: "violet" },
  { title: "Students", value: "18,420", change: "+ 10% this month", icon: GraduationCap, tone: "green" },
  { title: "Teachers", value: "1,250", change: "+ 8% this month", icon: Users, tone: "orange" },
  { title: "Parents", value: "4,950", change: "+ 15% this month", icon: UserRound, tone: "rose" },
  { title: "Annual Revenue", value: "₹ 42,50,000", change: "+ 18% this year", icon: IndianRupee, tone: "purple" },
];

const institutions = [
  { name: "Greenfield International School", type: "School", location: "Bangalore, KA", students: "1,250", status: "Active" },
  { name: "Sunrise Public School", type: "School", location: "Chennai, TN", students: "980", status: "Active" },
  { name: "Nexus Degree College", type: "College", location: "Coimbatore, TN", students: "2,450", status: "Active" },
  { name: "Global University", type: "University", location: "Hyderabad, TS", students: "8,200", status: "Active" },
  { name: "Bright Minds School", type: "School", location: "Mumbai, MH", students: "1,100", status: "Trial" },
];

const institutionTypes = [
  { name: "Schools", value: 18, color: "#1478f8", percent: "64%" },
  { name: "Colleges", value: 6, color: "#10b981", percent: "21%" },
  { name: "Universities", value: 3, color: "#ff9418", percent: "11%" },
  { name: "Other", value: 1, color: "#8b43fa", percent: "4%" },
];

const userGroups = [
  { label: "Students", value: "18,420", change: "+ 10%", icon: GraduationCap, tone: "green" },
  { label: "Teachers", value: "1,250", change: "+ 8%", icon: UserRound, tone: "blue" },
  { label: "Parents", value: "4,950", change: "+ 15%", icon: Users, tone: "rose" },
  { label: "Staff", value: "230", change: "+ 5%", icon: UserRound, tone: "purple" },
];

const revenueData = [
  { month: "Apr", revenue: 8, cumulative: 10 },
  { month: "May", revenue: 9, cumulative: 11.5 },
  { month: "Jun", revenue: 10.5, cumulative: 13.2 },
  { month: "Jul", revenue: 12.8, cumulative: 15.3 },
  { month: "Aug", revenue: 14.5, cumulative: 17.4 },
  { month: "Sep", revenue: 15.8, cumulative: 19.6 },
];

const recentInstitutions = [
  { name: "Excel International School", type: "School", date: "12 Sep 2025", status: "Trial" },
  { name: "Heritage College", type: "College", date: "10 Sep 2025", status: "Active" },
  { name: "Future University", type: "University", date: "08 Sep 2025", status: "Active" },
  { name: "Maple School", type: "School", date: "05 Sep 2025", status: "Active" },
  { name: "Riverside International School", type: "School", date: "01 Sep 2025", status: "Expired" },
];

const activityItems = [
  { icon: Building2, tone: "blue", title: "New institution registered", detail: "Excel International School", time: "12 Sep 2025, 10:30 AM" },
  { icon: UserPlus, tone: "green", title: "New user added", detail: "25 students added in Greenfield International School", time: "12 Sep 2025, 09:15 AM" },
  { icon: CircleDollarSign, tone: "green", title: "Payment received", detail: "₹ 2,50,000 from Nexus Degree College", time: "11 Sep 2025, 06:40 AM" },
  { icon: AlertTriangle, tone: "orange", title: "Subscription expiring soon", detail: "Sunrise Public School (in 7 days)", time: "11 Sep 2025, 03:20 AM" },
  { icon: Headset, tone: "purple", title: "Support ticket raised", detail: "Login issue - Heritage College", time: "10 Sep 2025, 11:05 AM" },
];

const health = [
  { label: "Application", icon: ShieldCheck },
  { label: "Database", icon: Database },
  { label: "Payment Gateway", icon: CreditCard },
  { label: "Email Service", icon: Mail },
  { label: "File Storage", icon: Folder },
];

const toneStyles: Record<string, { box: string; icon: string; value: string; change: string }> = {
  blue: { box: "bg-blue-50", icon: "text-blue-600", value: "text-blue-700", change: "text-emerald-600" },
  violet: { box: "bg-violet-50", icon: "text-violet-600", value: "text-violet-700", change: "text-emerald-600" },
  green: { box: "bg-emerald-50", icon: "text-emerald-600", value: "text-emerald-700", change: "text-emerald-600" },
  orange: { box: "bg-orange-50", icon: "text-orange-600", value: "text-orange-700", change: "text-emerald-600" },
  rose: { box: "bg-rose-50", icon: "text-rose-600", value: "text-rose-700", change: "text-emerald-600" },
  purple: { box: "bg-purple-50", icon: "text-purple-600", value: "text-purple-700", change: "text-emerald-600" },
};

function PanelHeader({
  icon: Icon,
  title,
  action,
  onAction,
}: {
  icon: LucideIcon;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-2 border-b border-blue-50 px-3 py-2.5">
      <div className="flex min-w-0 items-center gap-2.5">
        <Icon size={21} strokeWidth={2.6} className="shrink-0 text-blue-600" />
        <h2 className="truncate text-[13px] font-bold text-[#111b69]">{title}</h2>
      </div>
      {action && (
        <button onClick={onAction} className="shrink-0 text-[10px] font-medium text-blue-600 hover:text-blue-800">
          {action} <ArrowRight size={12} className="ml-0.5 inline" />
        </button>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const className = status === "Active"
    ? "bg-emerald-50 text-emerald-700"
    : status === "Trial" || status === "Pending"
      ? "bg-orange-50 text-orange-700"
      : "bg-rose-50 text-rose-700";
  const dotClass = status === "Active" ? "bg-emerald-500" : status === "Trial" || status === "Pending" ? "bg-orange-500" : "bg-rose-500";
  return <span className={`inline-flex items-center gap-1 rounded px-2 py-1 text-[9px] font-medium ${className}`}><span className={`h-2 w-2 rounded-full ${dotClass}`} />{status}</span>;
}

function SectionCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <section className={`min-w-0 overflow-hidden rounded-lg border border-blue-100 bg-white/95 shadow-[0_2px_8px_rgba(39,99,170,0.025)] ${className}`}>{children}</section>;
}

function InstitutionIllustration() {
  return (
    <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[48%] items-end justify-center overflow-hidden sm:flex" aria-hidden="true">
      <div className="absolute bottom-0 right-0 h-8 w-full bg-gradient-to-t from-[#7cbf66] to-[#b4df91]" />
      <div className="absolute bottom-5 right-[13%] h-[72px] w-[230px] rounded-t-[10px] border-x-[5px] border-t-[5px] border-[#bd6f42] bg-[#ffca7c] shadow-md">
        <div className="absolute -top-5 left-[-8px] right-[-8px] h-5 bg-[#547c97]" />
        <div className="absolute -top-9 left-[35%] h-9 w-[31%] rounded-t-md border-x-4 border-t-4 border-[#bd6f42] bg-[#ffdd9a]" />
        <div className="absolute -top-[52px] left-[43%] h-5 w-7 rounded-t-sm border-2 border-[#bd6f42] bg-[#ffdd9a]" />
        <div className="grid h-full grid-cols-5 gap-3 px-3 pt-3">
          {Array.from({ length: 10 }).map((_, i) => <span key={i} className="h-4 rounded-sm border border-[#d38d57] bg-[#d9f4ff] shadow-inner" />)}
        </div>
        <div className="absolute bottom-0 left-[43%] h-9 w-8 rounded-t-full border-2 border-[#bd6f42] bg-[#1878b8]" />
      </div>
      {[0, 1, 2, 3].map((n) => (
        <div key={n} className="absolute bottom-4" style={{ right: `${4 + n * 11}%` }}>
          <div className="mx-auto h-7 w-7 rounded-full bg-[#438b43]" />
          <div className="-mt-1 h-12 w-2 rounded-full bg-[#8a633c]" />
        </div>
      ))}
      <div className="absolute right-[48%] top-5 h-5 w-14 rounded-full bg-white/55 blur-[1px]" />
      <div className="absolute right-[22%] top-7 h-4 w-12 rounded-full bg-white/65 blur-[1px]" />
    </div>
  );
}

function GeographyPanel() {
  const regions = [
    { name: "Karnataka", count: 6, color: "bg-blue-600", iconColor: "text-blue-600", x: "39%", y: "34%" },
    { name: "Tamil Nadu", count: 8, color: "bg-emerald-600", iconColor: "text-emerald-600", x: "34%", y: "57%" },
    { name: "Maharashtra", count: 7, color: "bg-orange-500", iconColor: "text-orange-500", x: "47%", y: "77%" },
    { name: "Telangana", count: 4, color: "bg-violet-600", iconColor: "text-violet-600", x: "60%", y: "56%" },
    { name: "Others", count: 3, color: "bg-sky-500", iconColor: "text-sky-500", x: "74%", y: "42%" },
  ];
  return (
    <div className="grid grid-cols-[0.9fr_1fr] gap-2 p-2.5">
      <div className="relative min-h-[166px] overflow-hidden rounded-md bg-gradient-to-br from-sky-50 to-white">
        <svg viewBox="0 0 180 220" className="absolute inset-1 h-[calc(100%-8px)] w-[calc(100%-8px)]" aria-hidden="true">
          <path d="M68 8 91 18 103 34 124 41 119 60 137 74 125 90 133 108 117 123 112 146 99 165 91 190 75 206 65 189 62 168 49 150 44 127 29 109 37 86 26 69 43 53 46 34 58 27Z" fill="#d8ecff" stroke="#a9d4ff" strokeWidth="1.6" />
          <path d="m57 31 24 10-9 18 17 10-13 17 11 14-17 14-7 26-15-10-6-25-8-14 8-21-3-15Z" fill="#b9dcff" stroke="#a9d4ff" strokeWidth="1" />
          <path d="m88 94 19 5-4 20-13 11-6 25-8 20-9-20 4-21-7-19 11-12Z" fill="#b9dcff" stroke="#a9d4ff" strokeWidth="1" />
          <path d="m130 196 5 7-1 9-5-6Z" fill="#b9dcff" stroke="#a9d4ff" strokeWidth="1" />
        </svg>
        {regions.map((region) => (
          <span key={region.name} className={`absolute z-10 grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full ${region.color} text-[10px] font-bold text-white shadow-md ring-2 ring-white/80`} style={{ left: region.x, top: region.y }}>{region.count}</span>
        ))}
      </div>
      <div className="divide-y divide-blue-50 rounded-md border border-blue-100 bg-white">
        {regions.map((region) => (
          <div key={region.name} className="flex items-center justify-between gap-1.5 px-2 py-[9px] text-[10px]">
            <span className="flex min-w-0 items-center gap-1.5 truncate text-[#24366e]"><MapPin size={12} className={region.iconColor} /><span className="truncate">{region.name}</span></span>
            <span className="font-bold text-[#101b59]">{region.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SuperAdminDashboard() {
  const navigate = useNavigate();

  return (
    <AdminLayout activeItem="Dashboard">
      <div className="space-y-2.5">
        {/* Welcome banner + quick action */}
        <div className="grid grid-cols-1 gap-2 xl:grid-cols-12">
          <section className="relative flex min-h-[110px] items-center overflow-hidden rounded-lg border border-blue-200 bg-gradient-to-r from-[#c4e7ff] via-[#b4ddff] to-[#e6f6ff] px-5 py-4 sm:px-7 xl:col-span-8">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_20%_15%,rgba(255,255,255,0.8),transparent_38%)]" />
            <div className="relative z-10 max-w-[67%]">
              <p className="text-[24px] font-extrabold leading-tight tracking-[-0.7px] text-[#101b59] sm:text-[27px]">Welcome, Super Admin!</p>
              <p className="mt-1.5 max-w-xl text-[11px] leading-5 text-[#132b70] sm:text-[12px]">Manage all your educational institutions, users, and platform operations from one place.</p>
            </div>
            <InstitutionIllustration />
          </section>

          <section className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-blue-100 bg-white p-3 xl:col-span-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="grid h-[70px] w-[70px] shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-50 to-sky-100 text-blue-600"><Building2 size={38} strokeWidth={2.2} /></div>
              <div>
                <p className="text-[11px] text-[#27376c]">Total Institutions</p>
                <p className="mt-0.5 text-[26px] font-extrabold leading-none text-[#0c185b]">28</p>
                <p className="mt-1 text-[10px] font-semibold text-emerald-600">+ 3 this month</p>
              </div>
            </div>
            <div className="flex h-full flex-col items-end justify-center gap-4">
              <button onClick={() => navigate("/institutions/new")} className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-md bg-[#0875fb] px-3.5 py-2.5 text-[11px] font-semibold text-white shadow-sm transition hover:bg-blue-700"><Plus size={15} /> Add Institution</button>
              <button onClick={() => navigate("/schools")} className="whitespace-nowrap text-[10px] font-medium text-blue-600 hover:text-blue-800">View All Institutions <ArrowRight size={12} className="ml-1 inline" /></button>
            </div>
          </section>
        </div>

        {/* KPI cards */}
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">
          {stats.map((stat) => {
            const Icon = stat.icon;
            const tone = toneStyles[stat.tone];
            return (
              <div key={stat.title} className="flex min-w-0 items-center gap-2.5 rounded-lg border border-blue-100 bg-white p-2.5 shadow-[0_2px_8px_rgba(37,99,235,0.02)]">
                <div className={`grid h-[52px] w-[52px] shrink-0 place-items-center rounded-xl ${tone.box} ${tone.icon}`}><Icon size={26} strokeWidth={2.1} /></div>
                <div className="min-w-0">
                  <p className="truncate text-[10px] text-[#25356b]">{stat.title}</p>
                  <p className="mt-0.5 truncate text-[20px] font-extrabold leading-tight tracking-[-0.5px] text-[#0d195d]">{stat.value}</p>
                  <p className={`mt-1 whitespace-nowrap text-[9px] font-medium ${tone.change}`}>{stat.change}</p>
                </div>
              </div>
            );
          })}
        </section>

        {/* Main row */}
        <div className="grid grid-cols-1 gap-2 2xl:grid-cols-12">
          <SectionCard className="2xl:col-span-8">
            <PanelHeader icon={Building2} title="Institutions Overview" action="View All" onAction={() => navigate("/schools")} />
            <div className="overflow-x-auto px-2 pb-2 pt-1">
              <table className="w-full min-w-[550px] border-collapse text-left text-[10px]">
                <thead><tr className="bg-[#f5f9ff] text-[#13205f]">
                  {["Institution Name", "Type", "Location", "Students", "Status", "Action"].map((head) => <th key={head} className="border border-blue-100 px-2 py-2 font-bold">{head}</th>)}
                </tr></thead>
                <tbody>
                  {institutions.map((item) => <tr key={item.name} className="hover:bg-blue-50/50">
                    <td className="max-w-[220px] truncate border border-blue-50 px-2 py-[7px] text-[#33477c]">{item.name}</td>
                    <td className="border border-blue-50 px-2 py-[7px] text-[#455a8c]">{item.type}</td>
                    <td className="border border-blue-50 px-2 py-[7px] text-[#455a8c]">{item.location}</td>
                    <td className="border border-blue-50 px-2 py-[7px] text-[#273a77]">{item.students}</td>
                    <td className="border border-blue-50 px-2 py-[7px]"><StatusPill status={item.status} /></td>
                    <td className="border border-blue-50 px-2 py-[7px]"><button onClick={() => navigate("/schools")} className="rounded bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-600 hover:bg-blue-100">View</button> <button aria-label={`More actions for ${item.name}`} className="ml-1 text-[#152b70]"><MoreVertical size={13} className="inline" /></button></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard className="flex flex-col 2xl:col-span-4">
            <PanelHeader icon={TicketCheck} title="Institution Types" />
            <div className="flex flex-1 items-center justify-center gap-5 px-3 py-4">
              {/* Fixed square box so the donut is never clipped */}
              <div className="relative h-[170px] w-[170px] shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                      data={institutionTypes}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={1}
                      stroke="none"
                      startAngle={90}
                      endAngle={-270}
                    >
                      {institutionTypes.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value, name) => [value, name]} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[23px] font-extrabold leading-none text-[#101b59]">28</span>
                  <span className="mt-1 text-[10px] text-[#263a7b]">Institutions</span>
                </div>
              </div>

              <div className="min-w-[150px] space-y-3">
                {institutionTypes.map((item) => (
                  <div key={item.name} className="flex items-center justify-between gap-3 text-[10px]">
                    <span className="flex items-center gap-1.5 text-[#283d7b]"><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: item.color }} />{item.name}</span>
                    <span className="whitespace-nowrap font-bold text-[#101b59]">{item.value} ({item.percent})</span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Second row */}
        <div className="grid grid-cols-1 gap-2 2xl:grid-cols-12">
          <SectionCard className="2xl:col-span-5">
            <PanelHeader icon={Users} title="User Overview" action="View All" onAction={() => navigate("/users")} />
            <div className="grid grid-cols-2 gap-2 p-2.5 sm:grid-cols-4">
              {userGroups.map((group) => {
                const Icon = group.icon;
                const tone = toneStyles[group.tone];
                return <div key={group.label} className={`flex flex-col items-center rounded-lg px-2 py-4 text-center ${tone.box}`}>
                  <Icon size={27} className={tone.icon} fill="currentColor" strokeWidth={1.6} />
                  <span className="mt-2 text-[10px] text-[#26386f]">{group.label}</span>
                  <strong className="mt-1 text-[19px] font-extrabold leading-none text-[#101b59]">{group.value}</strong>
                  <span className="mt-2 text-[10px] font-semibold text-emerald-600">{group.change}</span>
                </div>;
              })}
            </div>
          </SectionCard>

          <SectionCard className="2xl:col-span-4">
            <PanelHeader icon={IndianRupee} title="Revenue Overview" action="View Details" onAction={() => navigate("/subscriptions")} />
            <div className="px-2 pb-2 pt-1">
              <div className="mb-1 flex flex-wrap justify-center gap-4 text-[9px] text-[#33477c]">
                <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-sm bg-blue-500" /> Monthly Revenue (₹L)</span>
                <span className="flex items-center gap-1"><span className="h-[2px] w-3 bg-indigo-700" /> Cumulative Revenue (₹L)</span>
              </div>
              <div className="h-[172px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={revenueData} margin={{ top: 5, right: 7, bottom: 0, left: -20 }}>
                    <CartesianGrid stroke="#e2edfb" strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="month" tick={{ fill: "#536a9f", fontSize: 9 }} axisLine={{ stroke: "#d6e5f8" }} tickLine={false} />
                    <YAxis tick={{ fill: "#6176a6", fontSize: 9 }} axisLine={false} tickLine={false} />
                    <Tooltip />
                    <Bar dataKey="revenue" name="Monthly Revenue" fill="#67a9ff" radius={[3, 3, 0, 0]} barSize={23} />
                    <Line dataKey="cumulative" name="Cumulative Revenue" stroke="#142bc4" strokeWidth={2} dot={{ r: 2.5, fill: "#142bc4" }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </SectionCard>

          <SectionCard className="2xl:col-span-3">
            <PanelHeader icon={Wallet} title="Subscription Status" action="View All" onAction={() => navigate("/subscriptions")} />
            <div className="grid grid-cols-[1fr_1fr] items-center gap-1 px-2 py-2">
              <div className="relative h-[165px] min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={[{ name: "Active", value: 22, color: "#10b981" }, { name: "Trial", value: 3, color: "#ff971e" }, { name: "Expiring Soon", value: 2, color: "#ff4141" }, { name: "Expired", value: 1, color: "#9caec2" }]} dataKey="value" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none" startAngle={90} endAngle={-270}>
                      {["#10b981", "#ff971e", "#ff4141", "#9caec2"].map((color) => <Cell key={color} fill={color} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[22px] font-extrabold leading-none text-[#101b59]">28</span>
                  <span className="mt-1 text-[9px] text-[#273b7a]">Institutions</span>
                </div>
              </div>
              <div className="space-y-3 text-[10px]">
                {[
                  ["Active", "22 (79%)", "#10b981"],
                  ["Trial", "3 (11%)", "#ff971e"],
                  ["Expiring Soon", "2 (7%)", "#ff4141"],
                  ["Expired", "1 (3%)", "#9caec2"],
                ].map(([name, amount, color]) => <div key={name} className="flex items-center justify-between gap-1">
                  <span className="flex items-center gap-1.5 text-[#263a7a]"><span className="h-3 w-3 rounded-full" style={{ backgroundColor: color }} />{name}</span>
                  <span className="whitespace-nowrap font-bold text-[#101b59]">{amount}</span>
                </div>)}
              </div>
            </div>
          </SectionCard>
        </div>

        {/* Bottom row */}
        <div className="grid grid-cols-1 gap-2 2xl:grid-cols-12">
          <SectionCard className="2xl:col-span-5">
            <PanelHeader icon={Building2} title="Recent Institutions" action="View All" onAction={() => navigate("/schools")} />
            <div className="overflow-x-auto p-2">
              <table className="w-full min-w-[440px] border-collapse text-left text-[10px]">
                <thead><tr className="bg-[#f5f9ff] text-[#15245e]">
                  {["Institution Name", "Type", "Sign Up Date", "Status", "Action"].map((header) => <th key={header} className="border border-blue-100 px-2 py-2 font-bold">{header}</th>)}
                </tr></thead>
                <tbody>{recentInstitutions.map((item) => <tr key={item.name} className="hover:bg-blue-50/50">
                  <td className="max-w-[155px] truncate border border-blue-50 px-2 py-[7px] text-[#364a7f]">{item.name}</td>
                  <td className="border border-blue-50 px-2 py-[7px] text-[#52638f]">{item.type}</td>
                  <td className="whitespace-nowrap border border-blue-50 px-2 py-[7px] text-[#52638f]">{item.date}</td>
                  <td className="border border-blue-50 px-2 py-[7px]"><StatusPill status={item.status} /></td>
                  <td className="border border-blue-50 px-2 py-[7px]"><button onClick={() => navigate("/schools")} className="rounded bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-600 hover:bg-blue-100">View</button></td>
                </tr>)}</tbody>
              </table>
            </div>
          </SectionCard>

          <SectionCard className="2xl:col-span-4">
            <PanelHeader icon={Timer} title="Recent Activity" action="View All" onAction={() => navigate("/reports")} />
            <div className="divide-y divide-blue-50 px-2">
              {activityItems.map((item) => {
                const Icon = item.icon;
                const tone = toneStyles[item.tone];
                return <div key={item.title} className="flex items-center gap-2.5 py-[7px]">
                  <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${tone.box} ${tone.icon}`}><Icon size={17} /></div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[10px] font-bold text-[#15215e]">{item.title}</p>
                    <p className="truncate text-[9px] text-[#52638f]">{item.detail}</p>
                  </div>
                  <span className="hidden whitespace-nowrap text-[9px] text-[#6678a6] xl:block">{item.time}</span>
                </div>;
              })}
            </div>
          </SectionCard>

          <SectionCard className="2xl:col-span-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-50 px-3 py-2.5">
              <div className="flex items-center gap-2.5"><Activity size={21} strokeWidth={2.6} className="text-blue-600" /><h2 className="text-[13px] font-bold text-[#111b69]">System Health</h2></div>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[9px] font-semibold text-emerald-700"><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />All Systems Operational</span>
            </div>
            <div className="px-2 pt-1">
              {health.map((item) => {
                const Icon = item.icon;
                return <div key={item.label} className="flex items-center justify-between gap-2 border-b border-blue-50 px-1.5 py-[7px] text-[10px] last:border-0">
                  <span className="flex items-center gap-2 text-[#263a7a]"><Icon size={14} />{item.label}</span>
                  <span className="flex items-center gap-1.5 text-[#263a7a]"><span className="h-2 w-2 rounded-full bg-emerald-500" />Operational</span>
                </div>;
              })}
            </div>
            <div className="m-2 flex items-center justify-between gap-2 rounded-md bg-blue-50/80 px-2.5 py-2">
              <div className="flex min-w-0 items-center gap-2"><Clock3 size={19} className="shrink-0 text-blue-600" /><div><p className="text-[9px] font-semibold text-[#263a7a]">Last Updated</p><p className="text-[9px] text-[#52638f]">16 Sep 2025, 10:30 AM</p></div></div>
              <button onClick={() => navigate("/reports")} className="rounded bg-blue-600 px-3 py-2 text-[9px] font-semibold text-white hover:bg-blue-700">View Logs</button>
            </div>
          </SectionCard>
        </div>

        <footer className="px-1 pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </div>
    </AdminLayout>
  );
}
