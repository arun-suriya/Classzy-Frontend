
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Plus,
    Search,
    School,
    Users,
    MoreHorizontal,
    X,
    Eye,
    Pencil,
    Power,
} from "lucide-react";

type SchoolStatus = "Active" | "Pending" | "Inactive";

type SchoolRecord = {
    id: number;
    name: string;
    code: string;
    email: string;
    phone: string;
    city: string;
    plan: string;
    status: SchoolStatus;
    students: number;
};

const initialSchools: SchoolRecord[] = [
    {
        id: 1,
        name: "Green Valley Public School",
        code: "GVPS001",
        email: "admin@greenvalley.example",
        phone: "+91 98765 43210",
        city: "Bengaluru",
        plan: "Premium",
        status: "Active",
        students: 1240,
    },
    {
        id: 2,
        name: "Sunrise International School",
        code: "SIS002",
        email: "office@sunrise.example",
        phone: "+91 98765 12345",
        city: "Chennai",
        plan: "Enterprise",
        status: "Active",
        students: 1860,
    },
    {
        id: 3,
        name: "Bright Future Academy",
        code: "BFA003",
        email: "info@brightfuture.example",
        phone: "+91 98765 98765",
        city: "Coimbatore",
        plan: "Standard",
        status: "Pending",
        students: 0,
    },
    {
        id: 4,
        name: "Little Stars School",
        code: "LSS004",
        email: "admin@littlestars.example",
        phone: "+91 98765 55555",
        city: "Mysuru",
        plan: "Standard",
        status: "Inactive",
        students: 420,
    },
    {
        id: 5,
        name: "Oakwood Higher Secondary",
        code: "OHS005",
        email: "contact@oakwood.example",
        phone: "+91 98765 11111",
        city: "Hyderabad",
        plan: "Premium",
        status: "Active",
        students: 980,
    },
];

const statusStyles: Record<SchoolStatus, string> = {
    Active: "bg-emerald-50 text-emerald-700",
    Pending: "bg-amber-50 text-amber-700",
    Inactive: "bg-slate-100 text-slate-600",
};

export default function SchoolsPage() {
    const navigate = useNavigate();

    const [schools, setSchools] = useState<SchoolRecord[]>(initialSchools);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [showForm, setShowForm] = useState(false);
    const [editingSchool, setEditingSchool] = useState<SchoolRecord | null>(null);
    const [selectedSchool, setSelectedSchool] = useState<SchoolRecord | null>(null);

    const filteredSchools = useMemo(() => {
        const query = search.trim().toLowerCase();

        return schools.filter((school) => {
            const matchesSearch =
                school.name.toLowerCase().includes(query) ||
                school.code.toLowerCase().includes(query) ||
                school.city.toLowerCase().includes(query) ||
                school.email.toLowerCase().includes(query);

            const matchesStatus =
                statusFilter === "All" || school.status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [schools, search, statusFilter]);

    function openAddForm() {
        setEditingSchool(null);
        setShowForm(true);
    }

    function openEditForm(school: SchoolRecord) {
        setEditingSchool(school);
        setShowForm(true);
    }

    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        const formData = new FormData(event.currentTarget);
        const name = String(formData.get("name") ?? "").trim();
        const code = String(formData.get("code") ?? "").trim().toUpperCase();
        const email = String(formData.get("email") ?? "").trim();
        const phone = String(formData.get("phone") ?? "").trim();
        const city = String(formData.get("city") ?? "").trim();
        const plan = String(formData.get("plan") ?? "Standard");

        if (!name || !code || !email || !phone || !city) return;

        const duplicateCode = schools.some(
            (school) =>
                school.code.toLowerCase() === code.toLowerCase() &&
                school.id !== editingSchool?.id,
        );

        if (duplicateCode) {
            window.alert("This school code already exists. Please use a unique code.");
            return;
        }

        if (editingSchool) {
            setSchools((current) =>
                current.map((school) =>
                    school.id === editingSchool.id
                        ? { ...school, name, code, email, phone, city, plan }
                        : school,
                ),
            );
        } else {
            const newSchool: SchoolRecord = {
                id: Math.max(0, ...schools.map((school) => school.id)) + 1,
                name,
                code,
                email,
                phone,
                city,
                plan,
                status: "Pending",
                students: 0,
            };

            setSchools((current) => [newSchool, ...current]);
            setStatusFilter("All");
            setSearch("");
        }

        setShowForm(false);
        setEditingSchool(null);
    }

    function toggleStatus(school: SchoolRecord) {
        const nextStatus: SchoolStatus =
            school.status === "Active" ? "Inactive" : "Active";

        const confirmed = window.confirm(
            `${nextStatus === "Active" ? "Activate" : "Deactivate"} ${school.name}?`,
        );

        if (!confirmed) return;

        setSchools((current) =>
            current.map((item) =>
                item.id === school.id ? { ...item, status: nextStatus } : item,
            ),
        );
    }

    const counts = {
        All: schools.length,
        Active: schools.filter((school) => school.status === "Active").length,
        Pending: schools.filter((school) => school.status === "Pending").length,
        Inactive: schools.filter((school) => school.status === "Inactive").length,
    };

    return (
        <div className="flex min-h-screen flex-col bg-slate-50 text-slate-800">
            <div className="mx-auto w-full max-w-7xl flex-1 space-y-6 px-4 py-6 sm:px-8 sm:py-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <button
                            onClick={() => navigate("/dashboard")}
                            className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-blue-600"
                        >
                            <ArrowLeft size={17} />
                            Back to Dashboard
                        </button>

                        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">
                            Schools Management
                        </h1>
                        <p className="mt-2 text-sm text-slate-500">
                            Register and manage schools across Centram Classzy.
                        </p>
                    </div>

                    <button
                        onClick={openAddForm}
                        className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700"
                    >
                        <Plus size={18} />
                        Add School
                    </button>
                </div>

                <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
                    {(
                        [
                            ["All Schools", counts.All, "text-blue-600", School],
                            ["Active", counts.Active, "text-emerald-600", School],
                            ["Pending", counts.Pending, "text-amber-600", Users],
                            ["Inactive", counts.Inactive, "text-slate-500", School],
                        ] as const
                    ).map(([label, count, color, Icon]) => (
                        <div
                            key={label}
                            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm text-slate-500">{label}</p>
                                <Icon size={20} className={color} />
                            </div>
                            <p className="mt-3 text-3xl font-bold text-slate-900">{count}</p>
                        </div>
                    ))}
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                    <div className="flex flex-col gap-4 border-b border-slate-100 p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div>
                            <h2 className="font-bold text-slate-900">Registered Schools</h2>
                            <p className="mt-1 text-sm text-slate-500">
                                {filteredSchools.length} school
                                {filteredSchools.length === 1 ? "" : "s"} found
                            </p>
                        </div>

                        <div className="flex flex-col gap-3 sm:flex-row">
                            <div className="flex items-center gap-2 rounded-xl border border-slate-200 px-3">
                                <Search size={18} className="text-slate-400" />
                                <input
                                    value={search}
                                    onChange={(event) => setSearch(event.target.value)}
                                    placeholder="Search schools..."
                                    aria-label="Search schools"
                                    className="min-w-0 py-3 text-sm outline-none sm:w-56"
                                />
                            </div>

                            <select
                                value={statusFilter}
                                onChange={(event) => setStatusFilter(event.target.value)}
                                aria-label="Filter by status"
                                className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm outline-none focus:border-blue-500"
                            >
                                <option value="All">All statuses</option>
                                <option value="Active">Active</option>
                                <option value="Pending">Pending</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[850px] text-left text-sm">
                            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                                <tr>
                                    <th className="px-5 py-4 font-semibold">School</th>
                                    <th className="px-5 py-4 font-semibold">School Code</th>
                                    <th className="px-5 py-4 font-semibold">Location</th>
                                    <th className="px-5 py-4 font-semibold">Students</th>
                                    <th className="px-5 py-4 font-semibold">Plan</th>
                                    <th className="px-5 py-4 font-semibold">Status</th>
                                    <th className="px-5 py-4 font-semibold">Actions</th>
                                </tr>
                            </thead>

                            <tbody className="divide-y divide-slate-100">
                                {filteredSchools.map((school) => (
                                    <tr key={school.id} className="hover:bg-slate-50">
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                                                    <School size={20} />
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-800">
                                                        {school.name}
                                                    </p>
                                                    <p className="mt-1 text-xs text-slate-500">
                                                        {school.email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 font-medium text-slate-600">
                                            {school.code}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">{school.city}</td>
                                        <td className="px-5 py-4 text-slate-600">
                                            {school.students.toLocaleString("en-IN")}
                                        </td>
                                        <td className="px-5 py-4 text-slate-600">{school.plan}</td>
                                        <td className="px-5 py-4">
                                            <span
                                                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[school.status]}`}
                                            >
                                                {school.status}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4">
                                            <div className="flex items-center gap-1">
                                                <button
                                                    title="View details"
                                                    aria-label={`View ${school.name}`}
                                                    onClick={() => setSelectedSchool(school)}
                                                    className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                                                >
                                                    <Eye size={17} />
                                                </button>
                                                <button
                                                    title="Edit school"
                                                    aria-label={`Edit ${school.name}`}
                                                    onClick={() => openEditForm(school)}
                                                    className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"
                                                >
                                                    <Pencil size={17} />
                                                </button>
                                                <button
                                                    title={school.status === "Active" ? "Deactivate school" : "Activate school"}
                                                    aria-label={`${school.status === "Active" ? "Deactivate" : "Activate"} ${school.name}`}
                                                    onClick={() => toggleStatus(school)}
                                                    disabled={school.status === "Pending"}
                                                    className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700 disabled:cursor-not-allowed disabled:opacity-30"
                                                >
                                                    <Power size={17} />
                                                </button>
                                                <button
                                                    title="More actions"
                                                    aria-label={`More actions for ${school.name}`}
                                                    onClick={() =>
                                                        window.alert(`More actions for ${school.name} can be added later.`)
                                                    }
                                                    className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                                                >
                                                    <MoreHorizontal size={17} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}

                                {filteredSchools.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-5 py-14 text-center">
                                            <School size={32} className="mx-auto text-slate-300" />
                                            <p className="mt-3 font-semibold text-slate-700">
                                                No schools found
                                            </p>
                                            <p className="mt-1 text-sm text-slate-500">
                                                Try another search or change the status filter.
                                            </p>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-900/50 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="school-form-title"
                        className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-xl"
                    >
                        <div className="flex items-center justify-between border-b border-slate-100 p-5 sm:p-6">
                            <div>
                                <h2 id="school-form-title" className="text-xl font-bold text-slate-900">
                                    {editingSchool ? "Edit School" : "Add New School"}
                                </h2>
                                <p className="mt-1 text-sm text-slate-500">
                                    Enter the school&apos;s basic information.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowForm(false)}
                                aria-label="Close form"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-5 p-5 sm:p-6">
                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                                <label className="text-sm font-medium text-slate-700">
                                    School Name *
                                    <input
                                        name="name"
                                        required
                                        defaultValue={editingSchool?.name ?? ""}
                                        placeholder="e.g. Green Valley School"
                                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-blue-500"
                                    />
                                </label>
                                <label className="text-sm font-medium text-slate-700">
                                    School Code *
                                    <input
                                        name="code"
                                        required
                                        defaultValue={editingSchool?.code ?? ""}
                                        placeholder="e.g. GVS001"
                                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal uppercase outline-none focus:border-blue-500"
                                    />
                                </label>
                                <label className="text-sm font-medium text-slate-700">
                                    Admin Email *
                                    <input
                                        name="email"
                                        type="email"
                                        required
                                        defaultValue={editingSchool?.email ?? ""}
                                        placeholder="admin@school.com"
                                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-blue-500"
                                    />
                                </label>
                                <label className="text-sm font-medium text-slate-700">
                                    Phone Number *
                                    <input
                                        name="phone"
                                        type="tel"
                                        required
                                        defaultValue={editingSchool?.phone ?? ""}
                                        placeholder="+91..."
                                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-blue-500"
                                    />
                                </label>
                                <label className="text-sm font-medium text-slate-700">
                                    City *
                                    <input
                                        name="city"
                                        required
                                        defaultValue={editingSchool?.city ?? ""}
                                        placeholder="City"
                                        className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-3 font-normal outline-none focus:border-blue-500"
                                    />
                                </label>
                                <label className="text-sm font-medium text-slate-700">
                                    Subscription Plan
                                    <select
                                        name="plan"
                                        defaultValue={editingSchool?.plan ?? "Standard"}
                                        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-3 font-normal outline-none focus:border-blue-500"
                                    >
                                        <option>Standard</option>
                                        <option>Premium</option>
                                        <option>Enterprise</option>
                                    </select>
                                </label>
                            </div>

                            {!editingSchool && (
                                <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
                                    New schools start as Pending until the platform administrator approves them.
                                </p>
                            )}

                            <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    className="rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                                >
                                    {editingSchool ? "Save Changes" : "Create School"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {selectedSchool && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="school-detail-title"
                        className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl"
                    >
                        <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                                <div className="rounded-xl bg-blue-50 p-3 text-blue-600">
                                    <School size={24} />
                                </div>
                                <div>
                                    <h2 id="school-detail-title" className="font-bold text-slate-900">
                                        {selectedSchool.name}
                                    </h2>
                                    <p className="mt-1 text-sm text-slate-500">{selectedSchool.code}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setSelectedSchool(null)}
                                aria-label="Close school details"
                                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="mt-6 space-y-4 text-sm">
                            {[
                                ["Admin email", selectedSchool.email],
                                ["Phone", selectedSchool.phone],
                                ["City", selectedSchool.city],
                                ["Subscription", selectedSchool.plan],
                                ["Students", selectedSchool.students.toLocaleString("en-IN")],
                            ].map(([label, value]) => (
                                <div key={label} className="flex justify-between gap-4 border-b border-slate-100 pb-3">
                                    <span className="text-slate-500">{label}</span>
                                    <span className="break-all text-right font-medium text-slate-800">{value}</span>
                                </div>
                            ))}
                            <div className="flex items-center justify-between">
                                <span className="text-slate-500">Status</span>
                                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusStyles[selectedSchool.status]}`}>
                                    {selectedSchool.status}
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => setSelectedSchool(null)}
                            className="mt-6 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            )}
            <footer className="mt-auto border-t border-gray-200 bg-white px-6 py-4 text-center text-sm text-gray-500">
                © 2026 Centram Classzy · School Management Platform
            </footer>
        </div>
    );
}