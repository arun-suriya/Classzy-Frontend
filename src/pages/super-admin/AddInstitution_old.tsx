import { useEffect, useState, type ChangeEvent, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CloudUpload,
  CreditCard,
  IndianRupee,
  Info,
  Landmark,
  LayoutGrid,
  MapPin,
  Settings,
  X,
} from "lucide-react";
import AdminLayout from "../../components/AdminLayout";

type FormState = {
  institutionName: string;
  institutionType: string;
  educationLevels: string[];
  affiliation: string;
  establishmentYear: string;
  description: string;
  contactName: string;
  designation: string;
  alternateContactName: string;
  alternateDesignation: string;
  email: string;
  phoneCode: string;
  phone: string;
  alternateEmail: string;
  alternatePhoneCode: string;
  alternatePhone: string;
  address: string;
  country: string;
  state: string;
  city: string;
  pinCode: string;
  academicYearStart: string;
  dateFormat: string;
  timeZone: string;
  language: string;
  gradingSystem: string;
  currency: string;
  workingDays: string[];
  startTime: string;
  endTime: string;
  planType: string;
  startDate: string;
  endDate: string;
  expectedStudents: string;
  expectedTeachers: string;
};

const initialForm: FormState = {
  institutionName: "",
  institutionType: "",
  educationLevels: [],
  affiliation: "",
  establishmentYear: "",
  description: "",
  contactName: "",
  designation: "",
  email: "",
  phoneCode: "+91",
  phone: "",
  alternateEmail: "",
  alternatePhoneCode: "+91",
  alternatePhone: "",
  address: "",
  country: "India",
  state: "",
  city: "",
  pinCode: "",
  academicYearStart: "April",
  dateFormat: "DD/MM/YYYY",
  timeZone: "(GMT+05:30) India Standard Time",
  language: "English",
  gradingSystem: "",
  currency: "INR (₹)",
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  startTime: "08:00",
  endTime: "15:00",
  planType: "",
  startDate: "2026-10-24",
  endDate: "2027-09-30",
  expectedStudents: "",
  expectedTeachers: "",
};

const moduleOptions = [
  "Student Information (Profiles, Enrollment)",
  "Academics (Subjects, Timetable, Lessons)",
  "Attendance",
  "Assignments & Homework",
  "Exams & Results",
  "Fees & Payments",
  "Leave Management",
  "Clubs & Activities",
  "Communications (Messages & Announcements)",
  "Transport Management (GPS Tracking)",
  "Library Management",
  "Hostel Management",
  "Inventory Management",
  "Alumni Management",
];
const defaultModules = moduleOptions.slice(0, 9);
const previewPriority = ["Student Information", "Academics", "Attendance", "Exams & Results", "Fees & Payments"];
const shortName = (module: string) => module.replace(/ \(.+\)/, "");
const previewRank = (module: string) => {
  const index = previewPriority.indexOf(shortName(module));
  return index === -1 ? 99 : index;
};

const steps = [
  { id: "basic-information", title: "Basic Information" },
  { id: "contact-address", title: "Contact & Address" },
  { id: "institution-settings", title: "Institution Settings" },
  { id: "modules-features", title: "Modules & Features" },
  { id: "subscription-plan", title: "Subscription Plan" },
  { id: "review-create", title: "Review & Create" },
];
const weekdays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const states = ["Andhra Pradesh", "Karnataka", "Kerala", "Maharashtra", "Tamil Nadu", "Telangana", "Delhi", "Gujarat", "Rajasthan", "West Bengal"];
const cities = ["Bengaluru", "Chennai", "Coimbatore", "Hyderabad", "Kochi", "Mumbai", "Mysuru", "Salem", "Trichy", "Other"];
const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const monthShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const phoneCodes = ["+91", "+1", "+44", "+65"];
const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1899 }, (_, i) => String(currentYear - i));

function formatDate(value: string) {
  if (!value) return "Not selected";
  const [y, m, d] = value.split("-");
  return `${d} ${monthShort[Number(m) - 1]} ${y}`;
}

const cardClass = "overflow-hidden rounded-xl border border-[#d8e9fb] bg-white shadow-[0_1px_6px_rgba(37,99,235,0.05)]";
const controlBase = "min-w-0 rounded-md border border-[#d3dff0] bg-white px-2.5 text-[11px] text-[#17265f] outline-none transition placeholder:text-[#8b9abd] hover:border-blue-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-100";
const controlClass = `${controlBase} h-7 w-full`;
const textareaClass = `${controlBase} h-[60px] w-full resize-none py-2`;
const labelClass = "mb-1 block text-[10px] font-bold leading-[12px] text-[#17245e]";

function Field({ label, required, optional, children, className = "" }: { label: string; required?: boolean; optional?: boolean; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <label className={labelClass}>
        {label}
        {optional && <span className="ml-1 font-normal text-slate-500">(Optional)</span>}
        {required && <span className="ml-0.5 text-rose-500">*</span>}
      </label>
      {children}
    </div>
  );
}

function PanelHeader({ icon, title, subtitle, smallSubtitle }: { icon: ReactNode; title: string; subtitle: string; smallSubtitle?: boolean }) {
  return (
    <div className="flex items-start gap-3 px-4 pb-3 pt-3.5">
      <div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center">{icon}</div>
      <div className="min-w-0">
        <h2 className="text-[15px] font-extrabold leading-tight tracking-[-0.2px] text-[#101b69]">{title}</h2>
        <p className={`mt-1 leading-4 text-[#53658f] ${smallSubtitle ? "text-[9px]" : "text-[10px]"}`}>{subtitle}</p>
      </div>
    </div>
  );
}

function CounterBox({ count, max, children }: { count: number; max: number; children: ReactNode }) {
  return (
    <div className="relative">
      {children}
      <span className="pointer-events-none absolute bottom-1.5 right-2.5 text-[9px] text-slate-400">{count}/{max}</span>
    </div>
  );
}

function PreviewSchoolArt({ image }: { image?: string }) {
  if (image) return <img src={image} alt="Institution banner preview" className="h-full w-full object-cover" />;
  return (
    <div className="relative h-full w-full overflow-hidden bg-gradient-to-b from-[#b8e6ff] via-[#e0f7ff] to-[#9bd8a1]">
      <div className="absolute left-[8%] top-[12%] h-4 w-11 rounded-full bg-white/70" />
      <div className="absolute right-[13%] top-[17%] h-3 w-8 rounded-full bg-white/70" />
      <div className="absolute bottom-0 h-3 w-full bg-[#73bc68]" />
      <div className="absolute bottom-2 left-[18%] h-[42px] w-[65%] rounded-t-md border-2 border-[#bb784d] bg-[#ffd083] shadow-sm">
        <div className="absolute -top-3 left-[-5px] right-[-5px] h-3 bg-[#527e9d]" />
        <div className="absolute -top-6 left-[35%] h-6 w-[30%] border-x-2 border-t-2 border-[#bb784d] bg-[#ffe1a6]" />
        <div className="grid grid-cols-4 gap-2 px-2 pt-2">
          {Array.from({ length: 8 }).map((_, i) => <span key={i} className="h-2.5 border border-[#d59b62] bg-[#dff5ff]" />)}
        </div>
        <div className="absolute bottom-0 left-[44%] h-4 w-4 rounded-t-full bg-[#1477b9]" />
      </div>
      <div className="absolute bottom-2 left-2 h-8 w-2 rounded-full bg-[#91643d] before:absolute before:-left-2 before:-top-4 before:h-6 before:w-6 before:rounded-full before:bg-[#53a65c]" />
      <div className="absolute bottom-2 right-3 h-8 w-2 rounded-full bg-[#91643d] before:absolute before:-left-2 before:-top-4 before:h-6 before:w-6 before:rounded-full before:bg-[#53a65c]" />
    </div>
  );
}

/** Country code + number in ONE bordered box, so the number input can never be pushed out of the card. */
function PhoneField({ code, onCode, value, onChange, placeholder }: { code: string; onCode: (v: string) => void; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="flex h-7 w-full min-w-0 items-center overflow-hidden rounded-md border border-[#d3dff0] bg-white transition hover:border-blue-300 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-100">
      <select
        aria-label="Country code"
        value={code}
        onChange={(e) => onCode(e.target.value)}
        style={{ width: 56, flex: "none" }}
        className="h-full cursor-pointer border-0 bg-transparent pl-2 pr-0.5 text-[11px] text-[#17265f] outline-none"
      >
        {phoneCodes.map((c) => <option key={c}>{c}</option>)}
      </select>
      <span className="h-4 w-px shrink-0 bg-[#d3dff0]" />
      <input
        type="tel"
        inputMode="tel"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ flex: "1 1 0%", minWidth: 0, width: "100%" }}
        className="h-full border-0 bg-transparent px-2.5 text-[11px] text-[#17265f] outline-none placeholder:text-[#8b9abd]"
      />
    </div>
  );
}

export default function AddInstitution() {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectedModules, setSelectedModules] = useState<string[]>(defaultModules);
  const [activeStep, setActiveStep] = useState(0);
  const [logoPreview, setLogoPreview] = useState("");
  const [bannerPreview, setBannerPreview] = useState("");
  const [notice, setNotice] = useState("");
  const [formError, setFormError] = useState("");

  useEffect(() => () => {
    if (logoPreview.startsWith("blob:")) URL.revokeObjectURL(logoPreview);
  }, [logoPreview]);
  useEffect(() => () => {
    if (bannerPreview.startsWith("blob:")) URL.revokeObjectURL(bannerPreview);
  }, [bannerPreview]);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setNotice("");
    setFormError("");
  }

  function toggleList(key: "workingDays", value: string) {
    const current = form[key];
    update(key, current.includes(value) ? current.filter((item) => item !== value) : [...current, value]);
  }

  function toggleModule(module: string) {
    setSelectedModules((current) => current.includes(module) ? current.filter((item) => item !== module) : [...current, module]);
    setNotice("");
  }

  function handleImage(event: ChangeEvent<HTMLInputElement>, setPreview: (value: string) => void, maxMb: number) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setFormError("Please select an image file.");
      return;
    }
    const maxBytes = maxMb * 1024 * 1024;
    if (file.size > maxBytes) {
      setFormError(`This image is too large. Please choose a smaller file (max ${maxBytes / (1024 * 1024)} MB).`);
      return;
    }
    setPreview(URL.createObjectURL(file));
    setFormError("");
  }

  function goToStep(index: number) {
    setActiveStep(index);
    document.getElementById(steps[index].id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function validateRequired() {
    const missing: string[] = [];
    if (!form.institutionName.trim()) missing.push("Institution Name");
    if (!form.institutionType) missing.push("Institution Type");
    if (!form.educationLevels.length) missing.push("Education Level");
    if (!form.contactName.trim()) missing.push("Primary Contact Person");
    if (!form.designation.trim()) missing.push("Designation");
    if (!form.email.trim()) missing.push("Email Address");
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) missing.push("a valid Email Address");
    if (!form.phone.trim()) missing.push("Phone Number");
    if (!form.address.trim()) missing.push("Address");
    if (!form.state) missing.push("State");
    if (!form.city) missing.push("City");
    if (!form.pinCode.trim()) missing.push("PIN Code");
    if (!form.gradingSystem) missing.push("Grading System");
    if (!form.planType) missing.push("Subscription Plan");
    if (!form.startDate) missing.push("Start Date");
    if (!form.endDate) missing.push("End Date");
    if (form.startDate && form.endDate && form.endDate < form.startDate) missing.push("an End Date after the Start Date");
    if (!form.expectedStudents || Number(form.expectedStudents) < 1) missing.push("Expected Number of Students");
    if (!form.expectedTeachers || Number(form.expectedTeachers) < 1) missing.push("Expected Number of Teachers");
    if (missing.length) {
      setFormError(`Please complete the required fields: ${missing.join(", ")}.`);
      setNotice("");
      return false;
    }
    return true;
  }

  function handleCreate() {
    if (!validateRequired()) {
      document.getElementById("basic-information")?.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    setFormError("");
    setNotice("All required fields are complete. Connect your institution API to create and persist this institution.");
    setActiveStep(5);
  }

  function handleDraft() {
    setFormError("");
    setNotice("Draft is ready in this form. Connect your backend to save drafts across sessions.");
  }

  const previewModules = [...selectedModules].sort((a, b) => previewRank(a) - previewRank(b)).slice(0, 5);
  const hasPlace = Boolean(form.city || form.state);
  const location = hasPlace ? [form.city, form.state, form.country].filter(Boolean).join(", ") : "Bangalore, Karnataka, India";
  const shortLocation = hasPlace ? [form.city, form.state].filter(Boolean).join(", ") : "Bangalore, Karnataka, India";

  const allSelected = selectedModules.length === moduleOptions.length;
  const someSelected = selectedModules.length > 0 && !allSelected;
  const extraModules = Math.max(selectedModules.length - previewModules.length, 0);

  function toggleAllModules() {
    setSelectedModules(allSelected ? [] : [...moduleOptions]);
    setNotice("");
  }

  return (
    <AdminLayout activeItem="Institutions">
      <form onSubmit={(event) => { event.preventDefault(); handleCreate(); }} className="space-y-3">
        {/* Page title */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d8e9fb] bg-white/95 px-4 py-3 shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
          <div className="flex min-w-0 items-center gap-3">
            <Landmark size={36} strokeWidth={2.2} className="shrink-0 text-blue-600" />
            <div className="min-w-0">
              <h1 className="text-[22px] font-extrabold leading-tight tracking-[-0.5px] text-[#111b70]">Add Institution</h1>
              <p className="mt-0.5 text-[11px] leading-4 text-[#425585]">Create a new educational institution and configure its details. All information will be used to set up the institution in Classzy.</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate("/schools")} className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-blue-200 bg-white px-3.5 py-2 text-[11px] font-medium text-blue-600 transition hover:bg-blue-50"><ArrowLeft size={14} /> Back to Institutions</button>
        </div>

        {/* Stepper */}
        <div className="overflow-x-auto rounded-xl border border-[#d8e9fb] bg-white/95 p-2 shadow-[0_1px_6px_rgba(37,99,235,0.05)]">
          <div className="flex min-w-[850px] items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex min-w-0 flex-1 items-center last:flex-none">
                <button
                  type="button"
                  onClick={() => goToStep(index)}
                  className={`flex min-w-0 items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition ${activeStep === index ? "border border-blue-300 bg-blue-50 text-blue-700" : "border border-transparent text-[#34467a] hover:bg-blue-50"}`}
                >
                  <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-bold ${activeStep === index ? "bg-blue-600 text-white" : index < activeStep ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                    {index < activeStep ? <Check size={14} /> : index + 1}
                  </span>
                  <span className="whitespace-nowrap text-[10px] font-medium">{step.title}</span>
                </button>
                {index < steps.length - 1 && <span className="mx-2 h-px min-w-4 flex-1 bg-blue-100" />}
              </div>
            ))}
          </div>
        </div>

        {formError && <div role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2.5 text-[11px] leading-5 text-rose-700"><span className="font-bold">Please review:</span> {formError}</div>}
        {notice && <div role="status" className="flex items-start gap-2 rounded-lg border border-[#d8e9fb] bg-gradient-to-r from-[#eff6ff] to-[#f8fcff] px-4 py-2.5 text-[11px] leading-5 text-blue-800"><Info size={15} className="mt-0.5 shrink-0" />{notice}<button type="button" className="ml-auto text-blue-600" onClick={() => setNotice("")} aria-label="Dismiss notice"><X size={15} /></button></div>}

        {/* Main grid: left 9 cols (two rows of cards) + right 3 cols (live preview) */}
        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-12">
          <div className="min-w-0 space-y-3 xl:col-span-9">
            {/* Row 1 */}
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-9">
              {/* Basic information */}
              <section id="basic-information" className={`${cardClass} scroll-mt-20 xl:col-span-5`}>
                <PanelHeader icon={<Landmark size={28} strokeWidth={2.2} className="text-blue-600" />} title="Basic Information" subtitle="Enter the core details of the institution." />
                <div className="grid grid-cols-1 gap-4 px-4 pb-4 pt-0 sm:grid-cols-[1.1fr_0.9fr]">
                  <div className="space-y-2.5">
                    <Field label="Institution Name" required>
                      <input className={controlClass} value={form.institutionName} onChange={(e) => update("institutionName", e.target.value)} placeholder="E.g. Greenfield International School" />
                    </Field>
                    <Field label="Institution Type" required>
                      <select className={controlClass} value={form.institutionType} onChange={(e) => update("institutionType", e.target.value)}>
                        <option value="">Select Type</option><option>School</option><option>College</option><option>University</option><option>Coaching Centre</option><option>Other</option>
                      </select>
                    </Field>
                    {/* <Field label="Education Level" required>
                      <div className="flex flex-wrap gap-x-3 gap-y-1.5 pt-0.5">
                        {["School", "College", "University", "Other"].map((level) => (
                          <label key={level} className="flex items-center gap-1.5 text-[10px] text-[#344477]">
                            <input type="checkbox" checked={form.educationLevels.includes(level)} onChange={() => toggleList("educationLevels", level)} className="h-3.5 w-3.5 accent-blue-600" />{level}
                          </label>
                        ))}
                      </div>
                    </Field> */}
                    <Field label="Affiliation / Board">
                      <select className={controlClass} value={form.affiliation} onChange={(e) => update("affiliation", e.target.value)}>
                        <option value="">Select Board (e.g. CBSE, ICSE, State Board)</option><option>CBSE</option><option>ICSE</option><option>State Board</option><option>IB</option><option>Cambridge</option><option>University Grants Commission</option><option>Other</option>
                      </select>
                    </Field>
                    <Field label="Establishment Year">
                      <div className="relative">
                        <select className={`${controlClass} appearance-none pr-8`} value={form.establishmentYear} onChange={(e) => update("establishmentYear", e.target.value)}>
                          <option value="">Select Year</option>
                          {years.map((year) => <option key={year}>{year}</option>)}
                        </select>
                        <CalendarDays size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[#6378ab]" />
                      </div>
                    </Field>
                    <Field label="Short Description">
                      <CounterBox count={form.description.length} max={500}>
                        <textarea maxLength={500} className={textareaClass} value={form.description} onChange={(e) => update("description", e.target.value)} placeholder="Brief description about the institution (optional)" />
                      </CounterBox>
                    </Field>
                  </div>

                  <div className="space-y-4">
                    {/* Logo + preview side by side */}
                    <div>
                      <div className="mb-1 grid grid-cols-[1fr_84px] gap-3">
                        <span className="text-[10px] font-bold leading-[12px] text-[#17245e]">Institution Logo</span>
                        <span className="text-[10px] font-medium leading-[12px] text-[#17245e]">Preview</span>
                      </div>
                      <div className="grid grid-cols-[1fr_84px] gap-3">
                        <label className="relative flex h-[100px] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#c7d6ec] bg-[#fbfdff] p-2 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
                          <CloudUpload size={22} className="text-blue-500" />
                          <span className="text-[10px] font-medium leading-tight text-[#34477c]">Click to upload logo</span>
                          <span className="text-[9px] leading-tight text-slate-400">PNG, JPG (Max 2 MB)</span>
                          <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => handleImage(e, setLogoPreview, 2)} aria-label="Upload institution logo" />
                        </label>
                        <div className="flex h-[100px] items-center justify-center overflow-hidden rounded-md bg-gradient-to-br from-slate-100 to-slate-200 text-slate-500">
                          {logoPreview ? <img src={logoPreview} alt="Institution logo preview" className="h-full w-full object-contain" /> : <Landmark size={40} strokeWidth={1.8} />}
                        </div>
                      </div>
                    </div>

                    {/* Banner + preview side by side */}
                    <div>
                      <div className="mb-1 grid grid-cols-[1fr_84px] gap-3">
                        <span className="text-[10px] font-bold leading-[12px] text-[#17245e]">Institution Banner <span className="font-normal text-slate-500">(Optional)</span></span>
                        <span className="text-[10px] font-medium leading-[12px] text-[#17245e]">Preview</span>
                      </div>
                      <div className="grid grid-cols-[1fr_84px] gap-3">
                        <label className="relative flex h-[84px] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-[#c7d6ec] bg-[#fbfdff] p-2 text-center transition hover:border-blue-400 hover:bg-blue-50/50">
                          <CloudUpload size={20} className="text-blue-500" />
                          <span className="text-[10px] font-medium leading-tight text-[#34477c]">Click to upload banner</span>
                          <span className="text-[9px] leading-tight text-slate-400">PNG, JPG (Max 5 MB)</span>
                          <input type="file" accept="image/*" className="absolute inset-0 cursor-pointer opacity-0" onChange={(e) => handleImage(e, setBannerPreview, 5)} aria-label="Upload institution banner" />
                        </label>
                        <div className="h-[84px] overflow-hidden rounded-md"><PreviewSchoolArt image={bannerPreview} /></div>
                      </div>
                      <p className="mt-1 text-[9px] leading-4 text-slate-400">Recommended size: 1440 × 360 px</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* Contact & address */}
              <section id="contact-address" className={`${cardClass} scroll-mt-20 xl:col-span-4`}>
                <PanelHeader icon={<MapPin size={26} strokeWidth={2.2} className="fill-blue-100 text-blue-600" />} title="Contact & Address" subtitle="Provide the official contact details and address." />
                <div className="space-y-2.5 px-4 pb-4">
                  <div className="grid grid-cols-2 gap-x-2.5 gap-y-2.5">
                    <Field label="Primary Contact Person" required><input className={controlClass} value={form.contactName} onChange={(e) => update("contactName", e.target.value)} placeholder="Name" /></Field>
                    <Field label="Designation" required><input className={controlClass} value={form.designation} onChange={(e) => update("designation", e.target.value)} placeholder="E.g. Principal" /></Field>
                    <Field label="Email Address" required><input type="email" className={controlClass} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="e.g. principal@school.edu" /></Field>
                    <Field label="Phone Number" required><PhoneField code={form.phoneCode} onCode={(v) => update("phoneCode", v)} value={form.phone} onChange={(v) => update("phone", v)} placeholder="Enter phone number" /></Field>
                    <Field label="Alternate Contact Person" optional><input className={controlClass} value={form.alternateContactName} onChange={(e) => update("alternateContactName", e.target.value)} placeholder="Name" /></Field>
                    <Field label="Alternate Designation" optional><input className={controlClass} value={form.alternateDesignation} onChange={(e) => update("alternateDesignation", e.target.value)} placeholder="E.g. Vice Principal" /></Field>
                    <Field label="Alternate Email" optional><input type="email" className={controlClass} value={form.alternateEmail} onChange={(e) => update("alternateEmail", e.target.value)} placeholder="e.g. info@school.edu" /></Field>
                    <Field label="Alternate Phone" optional><PhoneField code={form.alternatePhoneCode} onCode={(v) => update("alternatePhoneCode", v)} value={form.alternatePhone} onChange={(v) => update("alternatePhone", v)} placeholder="Phone number" /></Field>
                  </div>
                  <Field label="Address" required>
                    <CounterBox count={form.address.length} max={300}>
                      <textarea maxLength={300} className={textareaClass} value={form.address} onChange={(e) => update("address", e.target.value)} placeholder="Enter complete address" />
                    </CounterBox>
                  </Field>
                  <div className="grid grid-cols-[1.2fr_1fr_1fr] gap-2.5">
                    <Field label="Country" required><select className={controlClass} value={form.country} onChange={(e) => update("country", e.target.value)}><option>India</option><option>United States</option><option>United Kingdom</option><option>Singapore</option><option>Other</option></select></Field>
                    <Field label="State" required><select className={controlClass} value={form.state} onChange={(e) => update("state", e.target.value)}><option value="">Select State</option>{states.map((state) => <option key={state}>{state}</option>)}</select></Field>
                    <Field label="City" required><select className={controlClass} value={form.city} onChange={(e) => update("city", e.target.value)}><option value="">Select City</option>{cities.map((city) => <option key={city}>{city}</option>)}</select></Field>
                  </div>
                  <div className="grid grid-cols-[1.2fr_2fr] gap-2.5">
                    <div />
                    <div className="flex items-center gap-2">
                      <label className="shrink-0 text-[10px] font-bold text-[#17245e]">PIN Code<span className="ml-0.5 text-rose-500">*</span></label>
                      <input inputMode="numeric" maxLength={10} className={controlClass} value={form.pinCode} onChange={(e) => update("pinCode", e.target.value.replace(/\D/g, ""))} />
                    </div>
                  </div>
                </div>
              </section>
            </div>

            {/* Row 2 */}
            <div className="grid grid-cols-1 gap-3 xl:grid-cols-3">
              {/* Institution settings */}
              <section id="institution-settings" className={`${cardClass} scroll-mt-20`}>
                <PanelHeader icon={<Settings size={26} strokeWidth={2.2} className="text-blue-600" />} title="Institution Settings" subtitle="Configure academic and operational settings." />
                <div className="space-y-2.5 px-4 pb-4">
                  <div className="grid grid-cols-2 gap-x-2.5 gap-y-2.5">
                    <Field label="Academic Start Month" required><select className={controlClass} value={form.academicYearStart} onChange={(e) => update("academicYearStart", e.target.value)}>{months.map((month) => <option key={month}>{month}</option>)}</select></Field>
                    <Field label="Date Format" required><select className={controlClass} value={form.dateFormat} onChange={(e) => update("dateFormat", e.target.value)}><option>DD/MM/YYYY</option><option>MM/DD/YYYY</option><option>YYYY-MM-DD</option></select></Field>
                    <Field label="Time Zone" required><select className={controlClass} value={form.timeZone} onChange={(e) => update("timeZone", e.target.value)}><option>(GMT+05:30) India Standard Time</option><option>(GMT+00:00) UTC</option><option>(GMT-05:00) Eastern Time</option></select></Field>
                    <Field label="Language" required><select className={controlClass} value={form.language} onChange={(e) => update("language", e.target.value)}><option>English</option><option>Tamil</option><option>Hindi</option><option>Telugu</option><option>Kannada</option><option>Malayalam</option></select></Field>
                    <Field label="Grading System" required><select className={controlClass} value={form.gradingSystem} onChange={(e) => update("gradingSystem", e.target.value)}><option value="">Select Grading System</option><option>Percentage</option><option>Grade (A–F)</option><option>CGPA / GPA</option><option>Custom</option></select></Field>
                    <Field label="Currency" required><select className={controlClass} value={form.currency} onChange={(e) => update("currency", e.target.value)}><option>INR (₹)</option><option>USD ($)</option><option>GBP (£)</option><option>EUR (€)</option></select></Field>
                  </div>
                  <Field label="Working Days">
                    <div className="grid grid-cols-4 gap-x-1 gap-y-1.5 pt-0.5">
                      {weekdays.map((day) => (
                        <label key={day} className="flex items-center gap-1 text-[9px] text-[#344477]">
                          <input type="checkbox" checked={form.workingDays.includes(day)} onChange={() => toggleList("workingDays", day)} className="h-3.5 w-3.5 shrink-0 accent-blue-600" />{day}
                        </label>
                      ))}
                    </div>
                  </Field>
                  <div>
                    <div className="mb-1 grid grid-cols-2 gap-2.5">
                      <span className="text-[10px] font-bold leading-[12px] text-[#17245e]">Default School Hours</span>
                      <span className="text-[10px] font-bold leading-[12px] text-[#17245e]">End Time</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="flex items-center gap-2">
                        <span className="shrink-0 text-[10px] text-[#34477c]">Start Time</span>
                        <input type="time" className={controlClass} value={form.startTime} onChange={(e) => update("startTime", e.target.value)} aria-label="Start time" />
                      </div>
                      <input type="time" className={controlClass} value={form.endTime} onChange={(e) => update("endTime", e.target.value)} aria-label="End time" />
                    </div>
                  </div>
                </div>
              </section>

              {/* Modules */}
              <section id="modules-features" className={`${cardClass} scroll-mt-20`}>
                <PanelHeader icon={<LayoutGrid size={26} strokeWidth={2.2} className="text-blue-600" />} title="Modules & Features" subtitle="Select the modules and features to be enabled for this institution." smallSubtitle />
                <div className="px-4 pb-4">
                  {/* Select all + counter */}
                  <div className="mb-2 flex items-center justify-between border-b border-[#e6f0fb] pb-2">
                    <label className="flex cursor-pointer items-center gap-2.5 text-[10px] font-bold leading-[14px] text-[#17245e]">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        ref={(el) => { if (el) el.indeterminate = someSelected; }}
                        onChange={toggleAllModules}
                        className="h-3.5 w-3.5 shrink-0 accent-blue-600"
                      />
                      Select All
                    </label>
                    <span className="text-[9px] font-medium text-slate-500">{selectedModules.length} of {moduleOptions.length} selected</span>
                  </div>

                  <div className="space-y-1">
                    {moduleOptions.map((module) => (
                      <label key={module} className="flex cursor-pointer items-center gap-2.5 text-[10px] leading-[14px] text-[#344477]">
                        <input type="checkbox" checked={selectedModules.includes(module)} onChange={() => toggleModule(module)} className="h-3.5 w-3.5 shrink-0 accent-blue-600" />
                        <span>{module}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </section>

              {/* Subscription */}
              <section id="subscription-plan" className={`${cardClass} scroll-mt-20`}>
                <PanelHeader
                  icon={<span className="grid h-7 w-7 place-items-center rounded-full bg-blue-600 text-white"><IndianRupee size={15} strokeWidth={2.5} /></span>}
                  title="Subscription Plan"
                  subtitle="Assign a subscription plan and validity."
                />
                <div className="space-y-2.5 px-4 pb-4">
                  <div>
                    <Field label="Plan Type" required><select className={controlClass} value={form.planType} onChange={(e) => update("planType", e.target.value)}><option value="">Select Plan</option><option>Trail</option><option>Standard</option><option>Professional</option><option>Enterprise</option></select></Field>
                    <div className="mt-1.5 flex justify-end"><button type="button" onClick={() => setNotice("Plan details can be connected to your subscription catalogue when the backend API is available.")} className="text-[10px] font-semibold text-blue-600 hover:text-blue-800">View Plan Details</button></div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2.5 gap-y-2.5">
                    <Field label="Start Date" required><input type="date" className={controlClass} value={form.startDate} onChange={(e) => update("startDate", e.target.value)} /></Field>
                    <Field label="End Date" required><input type="date" className={controlClass} value={form.endDate} min={form.startDate} onChange={(e) => update("endDate", e.target.value)} /></Field>
                    <Field label="Expected Number of Students" required><input type="number" min="1" className={controlClass} value={form.expectedStudents} onChange={(e) => update("expectedStudents", e.target.value)} placeholder="Enter number" /></Field>
                    <Field label="Expected Number of Teachers" required><input type="number" min="1" className={controlClass} value={form.expectedTeachers} onChange={(e) => update("expectedTeachers", e.target.value)} placeholder="Enter number" /></Field>
                  </div>
                  <div className="flex items-center gap-2 rounded-lg border border-[#d7eaff] bg-gradient-to-r from-[#eff6ff] to-[#f5fbff] p-3 text-[10px] leading-4 text-[#39558d]">
                    <Info size={18} className="shrink-0 fill-blue-600 text-white" />
                    <p>You can modify the plan, validity and user limits later from the subscription management section.</p>
                  </div>
                </div>
              </section>
            </div>
          </div>

          {/* Live preview column */}
          <aside className="space-y-3 xl:col-span-3">
            <section className={cardClass}>
              <div className="flex items-start gap-2.5 px-3.5 pb-2 pt-3.5">
                <Info size={22} className="mt-0.5 shrink-0 fill-blue-600 text-white" />
                <div>
                  <h2 className="text-[12px] font-extrabold text-[#101b69]">Institution Preview</h2>
                  <p className="mt-0.5 text-[9px] leading-4 text-[#53658f]">Preview how the institution will appear in the system.</p>
                </div>
              </div>
              <div className="px-3 pb-3">
                <div className="relative h-[84px] overflow-hidden rounded-md">
                  <PreviewSchoolArt image={bannerPreview} />
                  <div className="absolute left-2 top-1/2 grid h-14 w-14 -translate-y-1/2 place-items-center overflow-hidden rounded-full border-2 border-white bg-white text-blue-600 shadow-md">
                    {logoPreview ? <img src={logoPreview} alt="Logo" className="h-full w-full object-contain" /> : <Landmark size={30} strokeWidth={2.2} />}
                  </div>
                </div>
                <div className="px-0.5 pt-2.5">
                  <p className="break-words text-[13px] font-extrabold leading-4 text-[#10205e]">{form.institutionName || "Greenfield International School"}</p>
                  <p className="mt-1.5 text-[10px] text-[#586b98]">{form.affiliation || "CBSE"} <span className="mx-1 text-slate-300">|</span> {form.institutionType || "School"} <span className="mx-1 text-slate-300">|</span> Estd. {form.establishmentYear || "2010"}</p>
                  <p className="mt-1.5 flex items-center gap-1 text-[10px] text-[#586b98]"><MapPin size={11} />{location}</p>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-[#ffe4bd] bg-gradient-to-br from-[#fff7e8] to-[#fffdf8] p-3.5 shadow-[0_1px_6px_rgba(180,83,9,0.04)]">
              <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold text-[#9a4b0d]"><Landmark size={17} className="text-amber-600" /> Key Information</h3>
              <dl className="space-y-1.5 text-[9px]">
                {[
                  ["Institution Name", form.institutionName || "Greenfield International School"],
                  ["Type", form.institutionType || "School"],
                  ["Education Level", form.educationLevels.join(", ") || "School"],
                  ["Affiliation", form.affiliation || "CBSE"],
                  ["Established", form.establishmentYear || "2010"],
                  ["Contact Person", form.contactName || "-"],
                  ["Email", form.email || "-"],
                  ["Phone", form.phone || "-"],
                  ["Location", shortLocation],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[84px_1fr] gap-1"><dt className="text-[#6b7280]">{label}</dt><dd className="break-words font-medium text-[#293761]">: &nbsp;{value}</dd></div>
                ))}
              </dl>
            </section>

            <section className="rounded-xl border border-[#e9dcff] bg-gradient-to-br from-[#f6efff] to-[#fcfaff] p-3.5 shadow-[0_1px_6px_rgba(109,40,217,0.04)]">
              <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold text-violet-800">
                <span className="grid h-[18px] w-[18px] place-items-center rounded-full bg-violet-600 text-white"><CreditCard size={10} strokeWidth={2.5} /></span> Selected Modules
              </h3>
              <div className="space-y-2">
                {previewModules.length ? previewModules.map((module) => (
                  <p key={module} className="flex items-center gap-2 text-[10px] leading-4 text-[#51427b]">
                    <span className="grid h-3.5 w-3.5 shrink-0 place-items-center rounded-full bg-violet-600 text-white"><Check size={9} strokeWidth={3.5} /></span>
                    {shortName(module)}
                  </p>
                )) : <p className="text-[10px] text-[#51427b]">No modules selected</p>}
                {extraModules > 0 && (
                  <p className="pl-[22px] text-[10px] font-semibold text-violet-700">+ {extraModules} more {extraModules === 1 ? "module" : "modules"}</p>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-[#c8f1da] bg-gradient-to-br from-[#edfff4] to-[#f8fffb] p-3.5 shadow-[0_1px_6px_rgba(5,150,105,0.04)]">
              <h3 className="mb-2.5 flex items-center gap-2 text-[11px] font-extrabold text-emerald-800">
                <span className="grid h-[18px] w-[18px] place-items-center rounded bg-emerald-600 text-white"><IndianRupee size={10} strokeWidth={2.5} /></span> Subscription Plan
              </h3>
              <dl className="space-y-1.5 text-[9px]">
                {[
                  ["Plan", form.planType || "Standard"],
                  ["Start Date", formatDate(form.startDate)],
                  ["End Date", formatDate(form.endDate)],
                  ["No. of Students", form.expectedStudents ? Number(form.expectedStudents).toLocaleString("en-IN") : "1,000"],
                  ["No. of Teachers", form.expectedTeachers ? Number(form.expectedTeachers).toLocaleString("en-IN") : "100"],
                ].map(([label, value]) => (
                  <div key={label} className="grid grid-cols-[84px_1fr] gap-1"><dt className="text-[#5e7f70]">{label}</dt><dd className="break-words font-medium text-[#247145]">: &nbsp;{value}</dd></div>
                ))}
                <div className="grid grid-cols-[84px_1fr] gap-1"><dt className="text-[#5e7f70]">Status</dt><dd className="font-bold text-emerald-600">: &nbsp;Active</dd></div>
              </dl>
            </section>
          </aside>
        </div>

        {/* Review and actions */}
        <section id="review-create" className={`${cardClass} scroll-mt-20`}>
          <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <button type="button" onClick={() => goToStep(5)} className="flex items-center gap-3 text-left">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-blue-600 text-[12px] font-bold text-white">6</span>
              <span>
                <span className="block text-[13px] font-extrabold text-[#101b69]">Review & Create</span>
                <span className="mt-0.5 block text-[10px] text-[#53658f]">Review all the details before creating the institution.</span>
              </span>
            </button>
            <div className="flex flex-wrap items-center gap-2.5">
              <button type="button" onClick={() => navigate("/schools")} className="rounded-md border border-blue-300 bg-white px-5 py-2 text-[12px] font-semibold text-blue-600 transition hover:bg-blue-50">Cancel</button>
              <button type="button" onClick={handleDraft} className="rounded-md border border-blue-300 bg-white px-5 py-2 text-[12px] font-semibold text-blue-600 transition hover:bg-blue-50">Save as Draft</button>
              <button type="submit" className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-5 py-2 text-[12px] font-bold text-white shadow-sm shadow-blue-200 transition hover:bg-blue-700">Create Institution <ArrowRight size={14} /></button>
            </div>
          </div>
        </section>

        <footer className="pb-1 pt-0.5 text-center text-[10px] text-slate-400">© {new Date().getFullYear()} Centram Classzy · School Management Platform</footer>
      </form>
    </AdminLayout>
  );
}