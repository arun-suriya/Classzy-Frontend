import type { ReactNode } from "react";
import { MoreVertical, X } from "lucide-react";

export const dayFmt = (iso: string | null | undefined) => { if (!iso) return "—"; const [y, m, d] = iso.slice(0, 10).split("-").map(Number); return new Date(y, m - 1, d).toLocaleDateString("en-IN", { weekday: "short", day: "2-digit", month: "short", year: "numeric" }); };
export const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const parseDay = (iso: string) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
export const td = "border-b border-[#e3eefc] px-4 py-3 text-[#17245e]";

export function Modal({ title, onClose, wide, children }: { title: string; onClose: () => void; wide?: boolean; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/40 p-4" role="dialog" aria-modal="true">
      <div className={`max-h-[92vh] w-full ${wide ? "max-w-3xl" : "max-w-md"} space-y-3 overflow-auto rounded-xl bg-white p-5 shadow-xl`}>
        <div className="flex items-center justify-between"><h2 className="text-[17px] font-extrabold text-[#101b69]">{title}</h2><button type="button" aria-label="Close" onClick={onClose}><X size={17} /></button></div>
        {children}
      </div>
    </div>
  );
}
export function Table({ heads, children, empty, colSpan }: { heads: string[]; children: ReactNode; empty?: string; colSpan: number }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#cfe0f6]">
      <table className="w-full border-collapse text-left text-[13px]" style={{ minWidth: 600 }}>
        <thead><tr className="bg-[#e8f1fd] text-[#13205f]">{heads.map((h) => <th key={h} className="border-b border-[#cfe0f6] px-4 py-3 text-[13px] font-bold">{h}</th>)}</tr></thead>
        <tbody>{empty ? <tr><td colSpan={colSpan} className="px-4 py-10 text-center text-[12px] text-slate-500">{empty}</td></tr> : children}</tbody>
      </table>
    </div>
  );
}
export function Pager({ page, size, total, set }: { page: number; size: number; total: number; set: (p: number) => void }) {
  const last = Math.max(1, Math.ceil(total / size));
  return (
    <div className="flex items-center justify-between pt-3 text-[12px] text-[#17245e]">
      <span>{total === 0 ? "No records" : `Showing ${page * size + 1}-${Math.min(total, (page + 1) * size)} of ${total.toLocaleString("en-IN")}`}</span>
      <div className="flex items-center gap-1.5"><button type="button" disabled={page === 0} onClick={() => set(page - 1)} className="rounded border border-[#cfe0f6] px-3 py-1 text-blue-600 disabled:opacity-40">Prev</button><span className="px-1">{page + 1} / {last}</span><button type="button" disabled={page >= last - 1} onClick={() => set(page + 1)} className="rounded border border-[#cfe0f6] px-3 py-1 text-blue-600 disabled:opacity-40">Next</button></div>
    </div>
  );
}
export function Menu({ id, open, setOpen, children }: { id: string; open: string | null; setOpen: (v: string | null) => void; children: ReactNode }) {
  return (
    <span className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
      <button type="button" aria-label="More" className="text-slate-600" onClick={() => setOpen(open === id ? null : id)}><MoreVertical size={15} /></button>
      {open === id && <div className="absolute right-0 top-5 z-10 w-44 rounded-md border border-[#d8e9fb] bg-white py-1 text-[11px] text-[#17245e] shadow-lg" onClick={() => setOpen(null)}>{children}</div>}
    </span>
  );
}
export const Item = ({ onClick, danger, children }: { onClick: () => void; danger?: boolean; children: ReactNode }) => <button type="button" onClick={onClick} className={`block w-full px-3 py-1.5 text-left ${danger ? "text-rose-600 hover:bg-rose-50" : "hover:bg-blue-50"}`}>{children}</button>;
export const SmallBtn = ({ onClick, children, solid }: { onClick: () => void; children: ReactNode; solid?: boolean }) => <button type="button" onClick={(e) => { e.stopPropagation(); onClick(); }} className={`whitespace-nowrap rounded-md px-3 py-1.5 text-[11px] font-semibold ${solid ? "bg-[#0875fb] text-white hover:bg-blue-700" : "border border-blue-400 text-blue-600 hover:bg-blue-50"}`}>{children}</button>;
export const StatusChip = ({ status }: { status: string }) => <span className={`inline-block rounded-full px-4 py-1 text-[11px] font-semibold ${status === "PUBLISHED" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>{status === "PUBLISHED" ? "Published" : "Draft"}</span>;
